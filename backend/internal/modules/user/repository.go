package user

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
)

const requiredAdminApprovals = 3

type Repository interface {
	GetProfile(ctx context.Context, username string) (Profile, error)
	GetMe(ctx context.Context, principal security.Principal) (Profile, error)
	UpdateMe(ctx context.Context, principal security.Principal, input UpdateProfileRequest) (Profile, error)
	QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error)
	GetAdminDashboard(ctx context.Context, principal security.Principal) (AdminDashboard, error)
	GetSuperAdminDashboard(ctx context.Context, principal security.Principal) (SuperAdminDashboard, error)
	ListAdminUsers(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[AdminUser], error)
	UpdateUserStatus(ctx context.Context, principal security.Principal, userID string, input UpdateUserStatusRequest) (AdminUser, error)
	ReviewVerification(ctx context.Context, principal security.Principal, userID string, input VerificationDecisionRequest) (VerificationDecisionResult, error)
}

type repository struct {
	platform *platform.Platform
}

type userRecord struct {
	ID        int64
	Username  string
	Nickname  string
	Signature string
	Bio       string
	AvatarURL string
	Status    string
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) GetProfile(ctx context.Context, username string) (Profile, error) {
	if !r.hasPostgres() {
		return Profile{}, fmt.Errorf("postgres unavailable for user profile")
	}

	record, err := r.loadUserByUsername(ctx, username)
	if err != nil {
		return Profile{}, err
	}

	return r.profileFromRecord(ctx, record)
}

func (r *repository) GetMe(ctx context.Context, principal security.Principal) (Profile, error) {
	if !r.hasPostgres() {
		return Profile{}, fmt.Errorf("postgres unavailable for current user profile")
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		return Profile{}, err
	}

	record, err := r.loadUserByID(ctx, userID)
	if err != nil {
		return Profile{}, err
	}

	return r.profileFromRecord(ctx, record)
}

func (r *repository) UpdateMe(ctx context.Context, principal security.Principal, input UpdateProfileRequest) (Profile, error) {
	if !r.hasPostgres() {
		return Profile{}, scaffold.ErrNotImplemented
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		return Profile{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update users
		 set nickname = coalesce(nullif($2, ''), nickname),
		     signature = coalesce(nullif($3, ''), signature),
		     bio = coalesce(nullif($4, ''), bio),
		     avatar_url = coalesce(nullif($5, ''), avatar_url),
		     updated_at = now()
		 where id = $1 and deleted_at is null`,
		userID,
		strings.TrimSpace(input.Nickname),
		strings.TrimSpace(input.Signature),
		strings.TrimSpace(input.Bio),
		strings.TrimSpace(input.AvatarURL),
	); err != nil {
		return Profile{}, err
	}

	record, err := r.loadUserByID(ctx, userID)
	if err != nil {
		return Profile{}, err
	}

	return r.profileFromRecord(ctx, record)
}

func (r *repository) QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error) {
	return BangumiImportJob{}, scaffold.ErrNotImplemented
}

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
			AdminDashboard:       base,
			RelayEvents:          1,
			RelayEntries:         2,
			WritingContests:      1,
			WritingSubmissions:   1,
			ContentReportsOpen:   0,
			SiteContentBlocks:    21,
			GalleryEntries:       16,
			LuckybotSessions:     0,
			LuckybotAdminActions: 0,
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
		{`select count(*)::int from luckybot_sessions where status = 'active'`, &dashboard.LuckybotSessions},
		{`select count(*)::int from luckybot_admin_actions`, &dashboard.LuckybotAdminActions},
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
			), '')
		from users u
		where u.deleted_at is null
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
		if err := rows.Scan(&rawID, &user.Username, &user.Nickname, &user.Status, &user.PendingVerificationID); err != nil {
			return pagination.Result[AdminUser]{}, err
		}

		user.UserID = strconv.FormatInt(rawID, 10)
		roles, err := r.loadRoleStrings(ctx, rawID)
		if err != nil {
			return pagination.Result[AdminUser]{}, err
		}

		user.Roles = normalizeRoleStrings(user.Status, roles)
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

func (r *repository) hasPostgres() bool {
	return r.platform != nil && r.platform.Postgres != nil && r.platform.Postgres.Available()
}

func (r *repository) loadUserByUsername(ctx context.Context, username string) (userRecord, error) {
	var record userRecord
	err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, username, nickname, coalesce(signature, ''), coalesce(bio, ''), coalesce(avatar_url, ''), status
		 from users
		 where lower(username) = lower($1) and deleted_at is null
		 limit 1`,
		username,
	).Scan(&record.ID, &record.Username, &record.Nickname, &record.Signature, &record.Bio, &record.AvatarURL, &record.Status)
	return record, err
}

func (r *repository) loadUserByID(ctx context.Context, userID int64) (userRecord, error) {
	var record userRecord
	err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, username, nickname, coalesce(signature, ''), coalesce(bio, ''), coalesce(avatar_url, ''), status
		 from users
		 where id = $1 and deleted_at is null
		 limit 1`,
		userID,
	).Scan(&record.ID, &record.Username, &record.Nickname, &record.Signature, &record.Bio, &record.AvatarURL, &record.Status)
	return record, err
}

func (r *repository) loadRoleStrings(ctx context.Context, userID int64) ([]string, error) {
	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select r.code
		 from user_roles ur
		 join roles r on r.id = ur.role_id
		 where ur.user_id = $1
		 order by r.code asc`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		if strings.TrimSpace(code) == "" {
			continue
		}
		roles = append(roles, code)
	}

	return roles, rows.Err()
}

func (r *repository) profileFromRecord(ctx context.Context, record userRecord) (Profile, error) {
	roles, err := r.loadRoleStrings(ctx, record.ID)
	if err != nil {
		return Profile{}, err
	}

	profile := baseProfile(record.Username)
	profile.UserID = strconv.FormatInt(record.ID, 10)
	profile.Username = record.Username
	profile.Nickname = record.Nickname
	profile.Signature = record.Signature
	profile.Bio = record.Bio
	profile.AvatarURL = record.AvatarURL
	profile.Status = record.Status
	profile.Roles = normalizeRoleStrings(record.Status, roles)
	profile.Verified = verifiedFromRoleStrings(profile.Roles)

	return profile, nil
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

func ensureRoleAssigned(ctx context.Context, tx *sql.Tx, userID int64, role security.Role) error {
	var roleID int64
	if err := tx.QueryRowContext(
		ctx,
		`select id from roles where code = $1 limit 1`,
		string(role),
	).Scan(&roleID); err != nil {
		if err != sql.ErrNoRows {
			return err
		}

		if err := tx.QueryRowContext(
			ctx,
			`insert into roles (code, name, description)
			 values ($1, $2, $3)
			 returning id`,
			string(role),
			roleDisplayName(role),
			roleDescription(role),
		).Scan(&roleID); err != nil {
			return err
		}
	}

	_, err := tx.ExecContext(
		ctx,
		`insert into user_roles (user_id, role_id, granted_at)
		 values ($1, $2, now())
		 on conflict (user_id, role_id) do nothing`,
		userID,
		roleID,
	)
	return err
}

func removeRoleAssignment(ctx context.Context, tx *sql.Tx, userID int64, role security.Role) error {
	_, err := tx.ExecContext(
		ctx,
		`delete from user_roles
		 where user_id = $1
		   and role_id in (select id from roles where code = $2)`,
		userID,
		string(role),
	)
	return err
}

func normalizeRoleStrings(status string, roles []string) []string {
	if len(roles) == 0 {
		if status == "active" {
			return []string{string(security.RoleMember)}
		}

		return []string{string(security.RoleUnverified)}
	}

	normalized := make([]string, 0, len(roles))
	for _, role := range roles {
		switch strings.TrimSpace(role) {
		case "user":
			normalized = append(normalized, string(security.RoleMember))
		default:
			normalized = append(normalized, role)
		}
	}

	return normalized
}

func verifiedFromRoleStrings(roles []string) bool {
	for _, role := range roles {
		switch role {
		case string(security.RoleMember), string(security.RoleAdmin), string(security.RoleSuperAdmin):
			return true
		}
	}

	return false
}

func roleStrings(roles []security.Role) []string {
	result := make([]string, 0, len(roles))
	for _, role := range roles {
		if role == "" {
			continue
		}
		result = append(result, string(role))
	}
	return result
}

func roleDisplayName(role security.Role) string {
	switch role {
	case security.RoleUnverified:
		return "未认证用户"
	case security.RoleMember:
		return "认证普通用户"
	case security.RoleAdmin:
		return "管理员"
	case security.RoleSuperAdmin:
		return "超级管理员"
	default:
		return string(role)
	}
}

func roleDescription(role security.Role) string {
	switch role {
	case security.RoleUnverified:
		return "已登录但未通过认证的用户"
	case security.RoleMember:
		return "通过认证的普通用户"
	case security.RoleAdmin:
		return "拥有大部分管理权限的管理员"
	case security.RoleSuperAdmin:
		return "掌握全站最高权限的超级管理员"
	default:
		return "site role"
	}
}

func isAllowedUserStatus(status string) bool {
	switch status {
	case "pending_verification", "active", "suspended", "banned":
		return true
	default:
		return false
	}
}

func baseProfile(username string) Profile {
	return Profile{
		UserID:    "user-scaffold-001",
		Username:  username,
		Nickname:  "Rubedo Member",
		Signature: "Scaffolded profile signature",
		Bio:       "This profile endpoint is scaffolded for the school-only forum flow.",
		AvatarURL: "https://example.com/avatar.png",
		Collections: map[string]int{
			"文章": 12,
			"主题": 24,
			"回复": 2,
			"收藏": 1,
		},
	}
}
