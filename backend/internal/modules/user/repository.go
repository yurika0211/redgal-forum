package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
)

const requiredAdminApprovals = 3

const (
	defaultBangumiAPIBaseURL = "https://api.bgm.tv/v0"
	defaultBangumiUserAgent  = "RubedoForum/2026 (+https://localhost; contact: admin@rubedo.local)"
	bangumiSubjectWebBaseURL = "https://bgm.tv/subject"
	maxBangumiImportSubjects = 64
	maxBangumiSyncItems      = 240
	defaultBangumiSyncItems  = 120
	bangumiCollectionPage    = 30
	bangumiHTTPMaxAttempts   = 4
	friendRequestMsgMaxChars = 280
	friendStatusPending      = "pending"
	friendStatusApproved     = "approved"
	friendStatusRejected     = "rejected"
)

type Repository interface {
	GetProfile(ctx context.Context, username string) (Profile, error)
	GetMe(ctx context.Context, principal security.Principal) (Profile, error)
	UpdateMe(ctx context.Context, principal security.Principal, input UpdateProfileRequest) (Profile, error)
	ListFriends(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[FriendSummary], error)
	ListUserFriends(ctx context.Context, username string, params pagination.Params) (pagination.Result[FriendSummary], error)
	ListIncomingFriendRequests(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[FriendRequest], error)
	ListOutgoingFriendRequests(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[FriendRequest], error)
	CreateFriendRequest(ctx context.Context, principal security.Principal, input CreateFriendRequest) (FriendRequest, error)
	ReviewFriendRequest(ctx context.Context, principal security.Principal, requestID string, input ReviewFriendRequest) (ReviewFriendRequestResult, error)
	QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error)
	ListMyBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error)
	ListMyBangumiCollections(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiCollection], error)
	ListUserBangumiCollections(ctx context.Context, username string, params pagination.Params) (pagination.Result[BangumiCollection], error)
	UpdateMyBangumiCollection(ctx context.Context, principal security.Principal, collectionID string, input UpdateBangumiCollectionRequest) (BangumiCollection, error)
	ListBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error)
	UpdateBangumiImportJobStatus(ctx context.Context, principal security.Principal, jobID string, input UpdateBangumiJobStatusRequest) (BangumiImportJob, error)
	GetAdminDashboard(ctx context.Context, principal security.Principal) (AdminDashboard, error)
	GetSuperAdminDashboard(ctx context.Context, principal security.Principal) (SuperAdminDashboard, error)
	ListAdminUsers(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[AdminUser], error)
	UpdateUserStatus(ctx context.Context, principal security.Principal, userID string, input UpdateUserStatusRequest) (AdminUser, error)
	ModerateUser(ctx context.Context, principal security.Principal, userID string, input ModerateUserRequest) (AdminUser, error)
	ReviewVerification(ctx context.Context, principal security.Principal, userID string, input VerificationDecisionRequest) (VerificationDecisionResult, error)
}

type repository struct {
	platform            *platform.Platform
	bangumiHTTPClient   *http.Client
	bangumiAPIBaseURL   string
	bangumiAPIUserAgent string
}

type userRecord struct {
	ID                  int64
	Username            string
	UsernameChangeCount int
	Nickname            string
	Signature           string
	Bio                 string
	AvatarURL           string
	Status              string
}

func NewRepository(platform *platform.Platform) Repository {
	baseURL := strings.TrimSpace(os.Getenv("BANGUMI_API_BASE_URL"))
	if baseURL == "" {
		baseURL = defaultBangumiAPIBaseURL
	}

	userAgent := strings.TrimSpace(os.Getenv("BANGUMI_API_USER_AGENT"))
	if userAgent == "" {
		userAgent = defaultBangumiUserAgent
	}

	return &repository{
		platform: platform,
		bangumiHTTPClient: &http.Client{
			Timeout: 12 * time.Second,
		},
		bangumiAPIBaseURL:   strings.TrimRight(baseURL, "/"),
		bangumiAPIUserAgent: userAgent,
	}
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

	record, err := r.loadUserByID(ctx, userID)
	if err != nil {
		return Profile{}, err
	}

	normalizedUsername, err := normalizeProfileUsername(input.Username)
	if err != nil {
		return Profile{}, fmt.Errorf("%w: %v", ErrInvalidProfileInput, err)
	}

	nextUsername := record.Username
	if normalizedUsername != "" && normalizedUsername != record.Username {
		if record.UsernameChangeCount >= 1 {
			return Profile{}, ErrSpaceIDChangeLimitReached
		}
		nextUsername = normalizedUsername
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update users
		 set username = $2,
		     username_change_count = case
		         when $2 <> username then username_change_count + 1
		         else username_change_count
		     end,
		     nickname = coalesce(nullif($3, ''), nickname),
		     signature = coalesce(nullif($4, ''), signature),
		     bio = coalesce(nullif($5, ''), bio),
		     avatar_url = coalesce(nullif($6, ''), avatar_url),
		     updated_at = now()
		 where id = $1 and deleted_at is null`,
		userID,
		nextUsername,
		strings.TrimSpace(input.Nickname),
		strings.TrimSpace(input.Signature),
		strings.TrimSpace(input.Bio),
		strings.TrimSpace(input.AvatarURL),
	); err != nil {
		lowerErr := strings.ToLower(err.Error())
		if strings.Contains(lowerErr, "users_username_key") || strings.Contains(lowerErr, "ux_users_username_active") {
			return Profile{}, ErrUsernameAlreadyExists
		}
		return Profile{}, err
	}

	record, err = r.loadUserByID(ctx, userID)
	if err != nil {
		return Profile{}, err
	}

	return r.profileFromRecord(ctx, record)
}

func (r *repository) resolvePrincipalUserID(ctx context.Context, principal security.Principal) (int64, error) {
	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err == nil && userID > 0 {
		return userID, nil
	}

	record, loadErr := r.loadUserByUsername(ctx, principal.Username)
	if loadErr != nil {
		return 0, loadErr
	}

	return record.ID, nil
}

func (r *repository) hasPostgres() bool {
	return r.platform != nil && r.platform.Postgres != nil && r.platform.Postgres.Available()
}

func (r *repository) loadUserByUsername(ctx context.Context, username string) (userRecord, error) {
	var record userRecord
	err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, username, coalesce(username_change_count, 0), nickname, coalesce(signature, ''), coalesce(bio, ''), coalesce(avatar_url, ''), status
		 from users
		 where lower(username) = lower($1) and deleted_at is null
		 limit 1`,
		username,
	).Scan(
		&record.ID,
		&record.Username,
		&record.UsernameChangeCount,
		&record.Nickname,
		&record.Signature,
		&record.Bio,
		&record.AvatarURL,
		&record.Status,
	)
	return record, err
}

func (r *repository) loadUserByID(ctx context.Context, userID int64) (userRecord, error) {
	var record userRecord
	err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, username, coalesce(username_change_count, 0), nickname, coalesce(signature, ''), coalesce(bio, ''), coalesce(avatar_url, ''), status
		 from users
		 where id = $1 and deleted_at is null
		 limit 1`,
		userID,
	).Scan(
		&record.ID,
		&record.Username,
		&record.UsernameChangeCount,
		&record.Nickname,
		&record.Signature,
		&record.Bio,
		&record.AvatarURL,
		&record.Status,
	)
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
	profile.SpaceIDEditable = record.UsernameChangeCount < 1

	return profile, nil
}

type bangumiJobScanner interface {
	Scan(dest ...any) error
}

type friendSummaryScanner interface {
	Scan(dest ...any) error
}

type friendRequestScanner interface {
	Scan(dest ...any) error
}

type bangumiCollectionScanner interface {
	Scan(dest ...any) error
}

func scanFriendSummary(scanner friendSummaryScanner) (FriendSummary, error) {
	var (
		userID    int64
		username  string
		nickname  string
		avatarURL string
		signature string
	)
	if err := scanner.Scan(&userID, &username, &nickname, &avatarURL, &signature); err != nil {
		return FriendSummary{}, err
	}

	return FriendSummary{
		UserID:    strconv.FormatInt(userID, 10),
		Username:  strings.TrimSpace(username),
		Nickname:  strings.TrimSpace(nickname),
		AvatarURL: strings.TrimSpace(avatarURL),
		Signature: strings.TrimSpace(signature),
	}, nil
}

func scanFriendRequest(scanner friendRequestScanner) (FriendRequest, error) {
	var (
		requestID         int64
		requesterID       int64
		requesterUsername string
		requesterNickname string
		requesterAvatar   string
		receiverID        int64
		receiverUsername  string
		receiverNickname  string
		receiverAvatar    string
		status            string
		message           string
		createdAt         time.Time
		reviewedAt        sql.NullTime
	)

	if err := scanner.Scan(
		&requestID,
		&requesterID,
		&requesterUsername,
		&requesterNickname,
		&requesterAvatar,
		&receiverID,
		&receiverUsername,
		&receiverNickname,
		&receiverAvatar,
		&status,
		&message,
		&createdAt,
		&reviewedAt,
	); err != nil {
		return FriendRequest{}, err
	}

	result := FriendRequest{
		RequestID:         strconv.FormatInt(requestID, 10),
		RequesterID:       strconv.FormatInt(requesterID, 10),
		RequesterUsername: strings.TrimSpace(requesterUsername),
		RequesterNickname: strings.TrimSpace(requesterNickname),
		RequesterAvatar:   strings.TrimSpace(requesterAvatar),
		ReceiverID:        strconv.FormatInt(receiverID, 10),
		ReceiverUsername:  strings.TrimSpace(receiverUsername),
		ReceiverNickname:  strings.TrimSpace(receiverNickname),
		ReceiverAvatar:    strings.TrimSpace(receiverAvatar),
		Status:            strings.TrimSpace(status),
		Message:           strings.TrimSpace(message),
		CreatedAt:         createdAt,
	}
	if reviewedAt.Valid {
		result.ReviewedAt = &reviewedAt.Time
	}

	return result, nil
}

func scanBangumiCollection(scanner bangumiCollectionScanner) (BangumiCollection, error) {
	var (
		collectionID      int64
		subjectID         int64
		collectionStatus  string
		displayVisibility string
		syncedAt          sql.NullTime
		updatedAt         sql.NullTime
		bangumiSubjectID  int64
		subjectType       int16
		name              string
		nameCN            string
		summary           string
		coverImageURL     string
		airDate           string
		ratingScore       sql.NullFloat64
		rankNo            sql.NullInt64
		platformsRaw      string
		rawPayload        string
	)

	if err := scanner.Scan(
		&collectionID,
		&subjectID,
		&collectionStatus,
		&displayVisibility,
		&syncedAt,
		&updatedAt,
		&bangumiSubjectID,
		&subjectType,
		&name,
		&nameCN,
		&summary,
		&coverImageURL,
		&airDate,
		&ratingScore,
		&rankNo,
		&platformsRaw,
		&rawPayload,
	); err != nil {
		return BangumiCollection{}, err
	}

	platforms := []string{}
	if strings.TrimSpace(platformsRaw) != "" {
		_ = json.Unmarshal([]byte(platformsRaw), &platforms)
	}

	item := BangumiCollection{
		CollectionID:      strconv.FormatInt(collectionID, 10),
		SubjectID:         strconv.FormatInt(subjectID, 10),
		BangumiSubjectID:  bangumiSubjectID,
		SubjectURL:        "",
		SubjectType:       subjectType,
		Name:              strings.TrimSpace(name),
		NameCN:            strings.TrimSpace(nameCN),
		Summary:           strings.TrimSpace(summary),
		CoverImageURL:     strings.TrimSpace(coverImageURL),
		AirDate:           strings.TrimSpace(airDate),
		Platforms:         uniqueNonEmptyStrings(platforms),
		CollectionStatus:  strings.TrimSpace(collectionStatus),
		DisplayVisibility: strings.TrimSpace(displayVisibility),
	}
	if ratingScore.Valid {
		score := ratingScore.Float64
		item.RatingScore = &score
	}
	if rankNo.Valid && rankNo.Int64 > 0 {
		rank := int(rankNo.Int64)
		item.RankNo = &rank
	}
	if syncedAt.Valid {
		item.SyncedAt = &syncedAt.Time
	}
	if updatedAt.Valid {
		item.UpdatedAt = &updatedAt.Time
	}

	if strings.TrimSpace(rawPayload) != "" {
		var payload map[string]any
		if err := json.Unmarshal([]byte(rawPayload), &payload); err == nil {
			if subjectURLValue, exists := payload["subject_url"]; exists {
				if subjectURL, ok := subjectURLValue.(string); ok {
					item.SubjectURL = strings.TrimSpace(subjectURL)
				}
			}
			if scoreValue, exists := payload["my_score"]; exists {
				switch typed := scoreValue.(type) {
				case float64:
					score := int(typed)
					if score >= 1 && score <= 10 {
						item.MyScore = &score
					}
				case int:
					score := typed
					if score >= 1 && score <= 10 {
						item.MyScore = &score
					}
				}
			}
			if commentValue, exists := payload["my_comment"]; exists {
				if comment, ok := commentValue.(string); ok {
					item.MyComment = strings.TrimSpace(comment)
				}
			}
		}
	}

	if strings.TrimSpace(item.SubjectURL) == "" {
		item.SubjectURL = fmt.Sprintf("%s/%d", bangumiSubjectWebBaseURL, bangumiSubjectID)
	}

	return item, nil
}

func scanBangumiJob(scanner bangumiJobScanner) (BangumiImportJob, error) {
	var (
		jobID             int64
		userID            int64
		username          string
		externalAccountID int64
		jobType           string
		status            string
		requestPayloadRaw string
		resultPayloadRaw  string
		errorMessage      string
		startedAt         sql.NullTime
		finishedAt        sql.NullTime
		createdAt         sql.NullTime
		updatedAt         sql.NullTime
	)

	if err := scanner.Scan(
		&jobID,
		&userID,
		&username,
		&externalAccountID,
		&jobType,
		&status,
		&requestPayloadRaw,
		&resultPayloadRaw,
		&errorMessage,
		&startedAt,
		&finishedAt,
		&createdAt,
		&updatedAt,
	); err != nil {
		return BangumiImportJob{}, err
	}

	job := BangumiImportJob{
		JobID:        strconv.FormatInt(jobID, 10),
		UserID:       strconv.FormatInt(userID, 10),
		Username:     username,
		JobType:      jobType,
		Status:       status,
		Channel:      "bangumi_sync_jobs",
		ErrorMessage: errorMessage,
	}
	if externalAccountID > 0 {
		job.ExternalAccountID = strconv.FormatInt(externalAccountID, 10)
	}
	if startedAt.Valid {
		job.StartedAt = &startedAt.Time
	}
	if finishedAt.Valid {
		job.FinishedAt = &finishedAt.Time
	}
	if createdAt.Valid {
		job.CreatedAt = &createdAt.Time
	}
	if updatedAt.Valid {
		job.UpdatedAt = &updatedAt.Time
	}
	if strings.TrimSpace(requestPayloadRaw) != "" && requestPayloadRaw != "{}" {
		var payload map[string]any
		if err := json.Unmarshal([]byte(requestPayloadRaw), &payload); err == nil {
			job.RequestPayload = payload
		}
	}
	if strings.TrimSpace(resultPayloadRaw) != "" && resultPayloadRaw != "{}" {
		var payload map[string]any
		if err := json.Unmarshal([]byte(resultPayloadRaw), &payload); err == nil {
			job.ResultPayload = payload
		}
	}

	return job, nil
}

func scaffoldBangumiJobs(username string) []BangumiImportJob {
	return []BangumiImportJob{
		{
			JobID:    "bgm-job-001",
			UserID:   "1",
			Username: username,
			JobType:  "collection_sync",
			Status:   "queued",
			Channel:  "bangumi_sync_jobs",
			RequestPayload: map[string]any{
				"sync_mode":   "subject_ids",
				"subject_ids": []int64{12, 14},
				"status":      "wish",
				"visibility":  "public",
			},
		},
		{
			JobID:        "bgm-job-002",
			UserID:       "1",
			Username:     username,
			JobType:      "collection_sync",
			Status:       "failed",
			Channel:      "bangumi_sync_jobs",
			ErrorMessage: "bangumi token missing",
			RequestPayload: map[string]any{
				"sync_mode":        "account",
				"bangumi_username": "scaffold_user",
				"max_items":        64,
				"visibility":       "private",
			},
		},
	}
}

func scaffoldBangumiCollections(username string) []BangumiCollection {
	now := time.Now()
	return []BangumiCollection{
		{
			CollectionID:      "bgm-col-1",
			SubjectID:         "11",
			BangumiSubjectID:  12,
			SubjectURL:        "https://bgm.tv/subject/12",
			SubjectType:       2,
			Name:              "CLANNAD",
			NameCN:            "团子大家族",
			Summary:           "Scaffold collection entry for local development.",
			CoverImageURL:     "/bg1.png",
			AirDate:           "2007-10-04",
			RatingScore:       pointerToFloat64(9.2),
			RankNo:            pointerToInt(26),
			Platforms:         []string{"TV"},
			CollectionStatus:  "collect",
			DisplayVisibility: "public",
			SyncedAt:          &now,
			UpdatedAt:         &now,
		},
		{
			CollectionID:      "bgm-col-2",
			SubjectID:         "12",
			BangumiSubjectID:  3800,
			SubjectURL:        "https://bgm.tv/subject/3800",
			SubjectType:       4,
			Name:              "Summer Pockets",
			Summary:           "Scaffold collection entry for local development.",
			CoverImageURL:     "/bg2.png",
			AirDate:           "2018-06-29",
			RatingScore:       pointerToFloat64(8.6),
			RankNo:            pointerToInt(205),
			Platforms:         []string{"PC"},
			CollectionStatus:  "wish",
			DisplayVisibility: "public",
			SyncedAt:          &now,
			UpdatedAt:         &now,
		},
		{
			CollectionID:      "bgm-col-3",
			SubjectID:         "13",
			BangumiSubjectID:  215,
			SubjectURL:        "https://bgm.tv/subject/215",
			SubjectType:       1,
			Name:              "All You Need Is Kill",
			Summary:           "Scaffold collection entry for local development.",
			CoverImageURL:     "/bg1.png",
			AirDate:           "2004-12-18",
			RatingScore:       pointerToFloat64(8.7),
			RankNo:            pointerToInt(110),
			Platforms:         []string{"小说"},
			CollectionStatus:  "collect",
			DisplayVisibility: "public",
			SyncedAt:          &now,
			UpdatedAt:         &now,
		},
	}
}

func pointerToFloat64(value float64) *float64 {
	return &value
}

func pointerToInt(value int) *int {
	return &value
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

func setUserStatusInTx(ctx context.Context, tx *sql.Tx, userID int64, status string) error {
	if !isAllowedUserStatus(status) {
		return fmt.Errorf("unsupported status: %s", status)
	}

	result, err := tx.ExecContext(
		ctx,
		`update users
		 set status = $2,
		     updated_at = now()
		 where id = $1 and deleted_at is null`,
		userID,
		status,
	)
	if err != nil {
		return err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func hasRoleString(roles []string, role string) bool {
	for _, item := range roles {
		if strings.TrimSpace(item) == role {
			return true
		}
	}
	return false
}

func splitRoleCodes(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}

	parts := strings.Split(trimmed, "\n")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		code := strings.TrimSpace(part)
		if code == "" {
			continue
		}
		result = append(result, code)
	}

	return result
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

func isAllowedModerationAction(action string) bool {
	switch action {
	case "mute", "unmute", "ban", "unban", "demote":
		return true
	default:
		return false
	}
}

func baseProfile(username string) Profile {
	return Profile{
		UserID:          "user-scaffold-001",
		Username:        username,
		SpaceIDEditable: true,
		Nickname:        "Rubedo Member",
		Signature:       "Scaffolded profile signature",
		Bio:             "This profile endpoint is scaffolded for the school-only forum flow.",
		AvatarURL:       "https://example.com/avatar.png",
		Collections: map[string]int{
			"文章": 12,
			"主题": 24,
			"回复": 2,
			"收藏": 1,
		},
	}
}
