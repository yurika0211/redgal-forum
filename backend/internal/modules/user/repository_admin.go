package user

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
)

func (r *repository) GetAdminDashboard(ctx context.Context, principal security.Principal) (AdminDashboard, error) {
	if !r.hasPostgres() {
		return AdminDashboard{
			TotalUsers:               4,
			PendingVerificationUsers: 1,
			VerifiedUsers:            3,
			AdminUsers:               1,
			SuperAdminUsers:          1,
			RoleDistribution: map[string]int{
				string(security.RoleUnverified): 1,
				string(security.RoleMember):     2,
				string(security.RoleAdmin):      1,
				string(security.RoleSuperAdmin): 1,
			},
			VerificationApprovalRule: "至少三位管理员通过，或超级管理员直接认证。",
		}, nil
	}

	var dashboard AdminDashboard
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			count(*) as total_users,
			count(*) filter (where status = 'pending_verification') as pending_verification_users,
			count(*) filter (where status = 'active') as verified_users
		from users
		where deleted_at is null`,
	).Scan(&dashboard.TotalUsers, &dashboard.PendingVerificationUsers, &dashboard.VerifiedUsers); err != nil {
		return AdminDashboard{}, err
	}

	distribution, err := r.roleDistribution(ctx)
	if err != nil {
		return AdminDashboard{}, err
	}
	dashboard.RoleDistribution = distribution
	dashboard.AdminUsers = distribution[string(security.RoleAdmin)]
	dashboard.SuperAdminUsers = distribution[string(security.RoleSuperAdmin)]
	dashboard.VerificationApprovalRule = "至少三位管理员通过，或超级管理员直接认证。"

	return dashboard, nil
}

func (r *repository) GetSuperAdminDashboard(ctx context.Context, principal security.Principal) (SuperAdminDashboard, error) {
	base, err := r.GetAdminDashboard(ctx, principal)
	if err != nil {
		return SuperAdminDashboard{}, err
	}

	if !r.hasPostgres() {
		return SuperAdminDashboard{
			AdminDashboard:     base,
			RelayEvents:        1,
			RelayEntries:       2,
			WritingContests:    1,
			WritingSubmissions: 1,
			ContentReportsOpen: 0,
			SiteContentBlocks:  21,
			GalleryEntries:     16,
		}, nil
	}

	dashboard := SuperAdminDashboard{
		AdminDashboard: base,
	}

	countQueries := []struct {
		query string
		dest  *int
	}{
		{`select count(*)::int from relay_events where deleted_at is null and status <> 'deleted'`, &dashboard.RelayEvents},
		{`select count(*)::int from relay_entries where deleted_at is null and status <> 'deleted'`, &dashboard.RelayEntries},
		{`select count(*)::int from writing_contests where deleted_at is null and status <> 'deleted'`, &dashboard.WritingContests},
		{`select count(*)::int from writing_submissions where deleted_at is null and status <> 'deleted'`, &dashboard.WritingSubmissions},
		{`select count(*)::int from content_reports where status = 'open'`, &dashboard.ContentReportsOpen},
		{`select count(*)::int from site_content_blocks where is_active = true`, &dashboard.SiteContentBlocks},
		{`select count(*)::int from gallery_entries where is_active = true`, &dashboard.GalleryEntries},
	}

	for _, item := range countQueries {
		if err := r.platform.Postgres.QueryRowContext(ctx, item.query).Scan(item.dest); err != nil {
			return SuperAdminDashboard{}, err
		}
	}

	return dashboard, nil
}

func (r *repository) ListAdminUsers(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[AdminUser], error) {
	if !r.hasPostgres() {
		return pagination.Slice([]AdminUser{
			{
				UserID:                "1",
				Username:              "scaffold_member",
				Nickname:              "Scaffold Member",
				Status:                "active",
				Verified:              true,
				Roles:                 []string{string(security.RoleMember)},
				PendingVerificationID: "",
			},
			{
				UserID:                "2",
				Username:              "pending_user",
				Nickname:              "Pending User",
				Status:                "pending_verification",
				Verified:              false,
				Roles:                 []string{string(security.RoleUnverified)},
				PendingVerificationID: "vr-2",
			},
		}, params), nil
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from users u
		 where u.deleted_at is null`,
	).Scan(&total); err != nil {
		return pagination.Result[AdminUser]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			u.id,
			u.username,
			u.nickname,
			u.status,
			coalesce((
				select vr.id::text
				from user_verification_requests vr
				where vr.user_id = u.id and vr.status = 'pending'
				order by vr.created_at desc
				limit 1
			), '') as pending_verification_id,
			coalesce(string_agg(distinct r.code, E'\n') filter (where r.code is not null), '') as role_codes
		from users u
		left join user_roles ur on ur.user_id = u.id
		left join roles r on r.id = ur.role_id
		where u.deleted_at is null
		group by u.id, u.username, u.nickname, u.status, u.created_at
		order by u.created_at desc
		limit $1 offset $2`,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[AdminUser]{}, err
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var user AdminUser
		var rawID int64
		var roleCodesRaw string
		if err := rows.Scan(
			&rawID,
			&user.Username,
			&user.Nickname,
			&user.Status,
			&user.PendingVerificationID,
			&roleCodesRaw,
		); err != nil {
			return pagination.Result[AdminUser]{}, err
		}

		user.UserID = strconv.FormatInt(rawID, 10)
		user.Roles = normalizeRoleStrings(user.Status, splitRoleCodes(roleCodesRaw))
		user.Verified = verifiedFromRoleStrings(user.Roles)
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[AdminUser]{}, err
	}

	return pagination.NewResult(users, total, params), nil
}

func (r *repository) UpdateUserStatus(ctx context.Context, principal security.Principal, userID string, input UpdateUserStatusRequest) (AdminUser, error) {
	status := strings.TrimSpace(input.Status)
	if !isAllowedUserStatus(status) {
		return AdminUser{}, fmt.Errorf("unsupported status: %s", status)
	}

	if !r.hasPostgres() {
		return AdminUser{
			UserID:   userID,
			Username: "scaffold_user",
			Nickname: "Scaffold User",
			Status:   status,
			Verified: status == "active",
			Roles:    normalizeRoleStrings(status, nil),
		}, nil
	}

	targetID, err := strconv.ParseInt(strings.TrimSpace(userID), 10, 64)
	if err != nil {
		return AdminUser{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update users
		 set status = $2,
		     updated_at = now()
		 where id = $1 and deleted_at is null`,
		targetID,
		status,
	); err != nil {
		return AdminUser{}, err
	}

	return r.loadAdminUserByID(ctx, targetID)
}

func (r *repository) ModerateUser(ctx context.Context, principal security.Principal, userID string, input ModerateUserRequest) (AdminUser, error) {
	action := strings.ToLower(strings.TrimSpace(input.Action))
	if !isAllowedModerationAction(action) {
		return AdminUser{}, fmt.Errorf("%w: %s", ErrUnsupportedModeration, input.Action)
	}

	if !r.hasPostgres() {
		status := "active"
		switch action {
		case "mute":
			status = "suspended"
		case "ban":
			status = "banned"
		}
		return AdminUser{
			UserID:   userID,
			Username: "scaffold_user",
			Nickname: "Scaffold User",
			Status:   status,
			Verified: status == "active",
			Roles:    normalizeRoleStrings(status, []string{string(security.RoleMember)}),
		}, nil
	}

	actorID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		return AdminUser{}, fmt.Errorf("%w: invalid actor", ErrModerationForbidden)
	}

	targetID, err := strconv.ParseInt(strings.TrimSpace(userID), 10, 64)
	if err != nil {
		return AdminUser{}, err
	}
	if actorID == targetID {
		return AdminUser{}, ErrModerationSelf
	}

	targetUser, err := r.loadAdminUserByID(ctx, targetID)
	if err != nil {
		return AdminUser{}, err
	}

	targetIsAdminLike :=
		hasRoleString(targetUser.Roles, string(security.RoleAdmin)) ||
			hasRoleString(targetUser.Roles, string(security.RoleSuperAdmin))
	actorIsSuperAdmin := principal.HasRole(security.RoleSuperAdmin)
	if !actorIsSuperAdmin && targetIsAdminLike {
		return AdminUser{}, ErrModerationForbidden
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return AdminUser{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	switch action {
	case "mute":
		if err := setUserStatusInTx(ctx, tx, targetID, "suspended"); err != nil {
			return AdminUser{}, err
		}
	case "unmute":
		if err := setUserStatusInTx(ctx, tx, targetID, "active"); err != nil {
			return AdminUser{}, err
		}
	case "ban":
		if err := setUserStatusInTx(ctx, tx, targetID, "banned"); err != nil {
			return AdminUser{}, err
		}
	case "unban":
		if err := setUserStatusInTx(ctx, tx, targetID, "active"); err != nil {
			return AdminUser{}, err
		}
	case "demote":
		if err := removeRoleAssignment(ctx, tx, targetID, security.RoleSuperAdmin); err != nil {
			return AdminUser{}, err
		}
		if err := removeRoleAssignment(ctx, tx, targetID, security.RoleAdmin); err != nil {
			return AdminUser{}, err
		}
		if err := removeRoleAssignment(ctx, tx, targetID, security.RoleModerator); err != nil {
			return AdminUser{}, err
		}
		if err := ensureRoleAssigned(ctx, tx, targetID, security.RoleMember); err != nil {
			return AdminUser{}, err
		}
		if err := removeRoleAssignment(ctx, tx, targetID, security.RoleUnverified); err != nil {
			return AdminUser{}, err
		}
		if err := setUserStatusInTx(ctx, tx, targetID, "active"); err != nil {
			return AdminUser{}, err
		}
	default:
		return AdminUser{}, fmt.Errorf("%w: %s", ErrUnsupportedModeration, action)
	}

	if err := tx.Commit(); err != nil {
		return AdminUser{}, err
	}

	return r.loadAdminUserByID(ctx, targetID)
}

func (r *repository) ReviewVerification(ctx context.Context, principal security.Principal, userID string, input VerificationDecisionRequest) (VerificationDecisionResult, error) {
	action := strings.ToLower(strings.TrimSpace(input.Action))
	if action != "approved" && action != "rejected" {
		return VerificationDecisionResult{}, fmt.Errorf("unsupported verification action: %s", input.Action)
	}

	if !r.hasPostgres() {
		finalStatus := "pending"
		if principal.HasRole(security.RoleSuperAdmin) || action == "approved" {
			finalStatus = action
		}

		return VerificationDecisionResult{
			RequestID:         "vr-scaffold-001",
			UserID:            userID,
			ReviewAction:      action,
			ApprovedCount:     1,
			RejectedCount:     0,
			RequiredApprovals: requiredAdminApprovals,
			FinalStatus:       finalStatus,
		}, nil
	}

	targetID, err := strconv.ParseInt(strings.TrimSpace(userID), 10, 64)
	if err != nil {
		return VerificationDecisionResult{}, err
	}

	reviewerID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		return VerificationDecisionResult{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return VerificationDecisionResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var requestID int64
	if err := tx.QueryRowContext(
		ctx,
		`select id
		 from user_verification_requests
		 where user_id = $1 and status = 'pending'
		 order by created_at desc
		 limit 1`,
		targetID,
	).Scan(&requestID); err != nil {
		return VerificationDecisionResult{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`insert into user_verification_reviews (request_id, reviewer_id, action, note)
		 values ($1, $2, $3, nullif($4, ''))
		 on conflict (request_id, reviewer_id)
		 do update set action = excluded.action, note = excluded.note, created_at = now()`,
		requestID,
		reviewerID,
		action,
		strings.TrimSpace(input.Note),
	); err != nil {
		return VerificationDecisionResult{}, err
	}

	var approvedCount, rejectedCount int
	if err := tx.QueryRowContext(
		ctx,
		`select
			count(*) filter (where action = 'approved'),
			count(*) filter (where action = 'rejected')
		 from user_verification_reviews
		 where request_id = $1`,
		requestID,
	).Scan(&approvedCount, &rejectedCount); err != nil {
		return VerificationDecisionResult{}, err
	}

	finalStatus := "pending"
	switch {
	case principal.HasRole(security.RoleSuperAdmin):
		finalStatus = action
	case action == "approved" && approvedCount >= requiredAdminApprovals:
		finalStatus = "approved"
	case action == "rejected" && rejectedCount >= requiredAdminApprovals:
		finalStatus = "rejected"
	}

	if finalStatus == "approved" {
		if _, err := tx.ExecContext(
			ctx,
			`update user_verification_requests
			 set status = 'approved',
			     review_note = nullif($2, ''),
			     reviewer_id = $3,
			     reviewed_at = now(),
			     updated_at = now()
			 where id = $1`,
			requestID,
			strings.TrimSpace(input.Note),
			reviewerID,
		); err != nil {
			return VerificationDecisionResult{}, err
		}

		if _, err := tx.ExecContext(
			ctx,
			`update users
			 set status = 'active',
			     updated_at = now()
			 where id = $1`,
			targetID,
		); err != nil {
			return VerificationDecisionResult{}, err
		}

		if err := ensureRoleAssigned(ctx, tx, targetID, security.RoleMember); err != nil {
			return VerificationDecisionResult{}, err
		}

		if err := removeRoleAssignment(ctx, tx, targetID, security.RoleUnverified); err != nil {
			return VerificationDecisionResult{}, err
		}
	}

	if finalStatus == "rejected" {
		if _, err := tx.ExecContext(
			ctx,
			`update user_verification_requests
			 set status = 'rejected',
			     review_note = nullif($2, ''),
			     reviewer_id = $3,
			     reviewed_at = now(),
			     updated_at = now()
			 where id = $1`,
			requestID,
			strings.TrimSpace(input.Note),
			reviewerID,
		); err != nil {
			return VerificationDecisionResult{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return VerificationDecisionResult{}, err
	}

	return VerificationDecisionResult{
		RequestID:         strconv.FormatInt(requestID, 10),
		UserID:            strconv.FormatInt(targetID, 10),
		ReviewAction:      action,
		ApprovedCount:     approvedCount,
		RejectedCount:     rejectedCount,
		RequiredApprovals: requiredAdminApprovals,
		FinalStatus:       finalStatus,
	}, nil
}

func (r *repository) roleDistribution(ctx context.Context) (map[string]int, error) {
	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select r.code, count(*)::int
		 from user_roles ur
		 join roles r on r.id = ur.role_id
		 group by r.code`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	distribution := map[string]int{}
	for rows.Next() {
		var code string
		var count int
		if err := rows.Scan(&code, &count); err != nil {
			return nil, err
		}
		distribution[code] = count
	}

	return distribution, rows.Err()
}

func (r *repository) loadAdminUserByID(ctx context.Context, userID int64) (AdminUser, error) {
	record, err := r.loadUserByID(ctx, userID)
	if err != nil {
		return AdminUser{}, err
	}

	roles, err := r.loadRoleStrings(ctx, userID)
	if err != nil {
		return AdminUser{}, err
	}

	var pendingVerificationID string
	_ = r.platform.Postgres.QueryRowContext(
		ctx,
		`select coalesce((
			select vr.id::text
			from user_verification_requests vr
			where vr.user_id = $1 and vr.status = 'pending'
			order by vr.created_at desc
			limit 1
		), '')`,
		userID,
	).Scan(&pendingVerificationID)

	normalizedRoles := normalizeRoleStrings(record.Status, roles)
	return AdminUser{
		UserID:                strconv.FormatInt(record.ID, 10),
		Username:              record.Username,
		Nickname:              record.Nickname,
		Status:                record.Status,
		Verified:              verifiedFromRoleStrings(normalizedRoles),
		Roles:                 normalizedRoles,
		PendingVerificationID: pendingVerificationID,
	}, nil
}
