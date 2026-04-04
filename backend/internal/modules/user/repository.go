package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"slices"
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

func (r *repository) ListFriends(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[FriendSummary], error) {
	if !r.hasPostgres() {
		return pagination.Result[FriendSummary]{}, fmt.Errorf("postgres unavailable for friend list")
	}

	userID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return pagination.Result[FriendSummary]{}, err
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from user_friend_requests fr
		 where fr.deleted_at is null
		   and fr.status = $2
		   and (fr.requester_id = $1 or fr.receiver_id = $1)`,
		userID,
		friendStatusApproved,
	).Scan(&total); err != nil {
		return pagination.Result[FriendSummary]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			u.id,
			u.username,
			coalesce(nullif(u.nickname, ''), u.username) as nickname,
			coalesce(u.avatar_url, '') as avatar_url,
			coalesce(u.signature, '') as signature
		 from user_friend_requests fr
		 join users u on u.id = case
		 	when fr.requester_id = $1 then fr.receiver_id
		 	else fr.requester_id
		 end
		 where fr.deleted_at is null
		   and fr.status = $2
		   and (fr.requester_id = $1 or fr.receiver_id = $1)
		   and u.deleted_at is null
		 order by coalesce(fr.reviewed_at, fr.updated_at, fr.created_at) desc, fr.id desc
		 limit $3 offset $4`,
		userID,
		friendStatusApproved,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[FriendSummary]{}, err
	}
	defer rows.Close()

	friends := make([]FriendSummary, 0)
	for rows.Next() {
		friend, scanErr := scanFriendSummary(rows)
		if scanErr != nil {
			return pagination.Result[FriendSummary]{}, scanErr
		}
		friends = append(friends, friend)
	}
	if err := rows.Err(); err != nil {
		return pagination.Result[FriendSummary]{}, err
	}

	return pagination.NewResult(friends, total, params), nil
}

func (r *repository) ListIncomingFriendRequests(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[FriendRequest], error) {
	if !r.hasPostgres() {
		return pagination.Result[FriendRequest]{}, fmt.Errorf("postgres unavailable for incoming friend request listing")
	}

	userID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	return r.listFriendRequestsByDirection(ctx, params, userID, true)
}

func (r *repository) ListOutgoingFriendRequests(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[FriendRequest], error) {
	if !r.hasPostgres() {
		return pagination.Result[FriendRequest]{}, fmt.Errorf("postgres unavailable for outgoing friend request listing")
	}

	userID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	return r.listFriendRequestsByDirection(ctx, params, userID, false)
}

func (r *repository) CreateFriendRequest(
	ctx context.Context,
	principal security.Principal,
	input CreateFriendRequest,
) (FriendRequest, error) {
	if !r.hasPostgres() {
		return FriendRequest{}, scaffold.ErrNotImplemented
	}

	requesterID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return FriendRequest{}, err
	}

	targetUsername := strings.TrimSpace(input.Username)
	if targetUsername == "" {
		return FriendRequest{}, fmt.Errorf("friend username is required")
	}

	receiverRecord, err := r.loadUserByUsername(ctx, targetUsername)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return FriendRequest{}, fmt.Errorf("user %s not found", targetUsername)
		}
		return FriendRequest{}, err
	}

	if receiverRecord.ID == requesterID {
		return FriendRequest{}, fmt.Errorf("cannot send friend request to yourself")
	}

	var (
		existingRequestID int64
		existingStatus    string
		existingRequester int64
	)
	err = r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, status, requester_id
		 from user_friend_requests
		 where deleted_at is null
		   and (
		     (requester_id = $1 and receiver_id = $2)
		     or (requester_id = $2 and receiver_id = $1)
		   )
		   and status in ($3, $4)
		 order by
		   case when status = $3 then 0 else 1 end,
		   created_at desc,
		   id desc
		 limit 1`,
		requesterID,
		receiverRecord.ID,
		friendStatusPending,
		friendStatusApproved,
	).Scan(&existingRequestID, &existingStatus, &existingRequester)
	if err == nil {
		switch existingStatus {
		case friendStatusApproved:
			return FriendRequest{}, fmt.Errorf("you are already friends")
		case friendStatusPending:
			if existingRequester == requesterID {
				return FriendRequest{}, fmt.Errorf("friend request already sent")
			}
			return FriendRequest{}, fmt.Errorf("the other user has already sent you a request, please review it first")
		default:
			return FriendRequest{}, fmt.Errorf("friend request already exists")
		}
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return FriendRequest{}, err
	}

	normalizedMessage := strings.TrimSpace(input.Message)
	if len([]rune(normalizedMessage)) > friendRequestMsgMaxChars {
		normalizedMessage = string([]rune(normalizedMessage)[:friendRequestMsgMaxChars])
	}

	var requestID int64
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into user_friend_requests (
			requester_id,
			receiver_id,
			status,
			message
		) values ($1, $2, $3, $4)
		returning id`,
		requesterID,
		receiverRecord.ID,
		friendStatusPending,
		normalizedMessage,
	).Scan(&requestID); err != nil {
		return FriendRequest{}, err
	}

	return r.getFriendRequestByID(ctx, requestID)
}

func (r *repository) ReviewFriendRequest(
	ctx context.Context,
	principal security.Principal,
	requestID string,
	input ReviewFriendRequest,
) (ReviewFriendRequestResult, error) {
	if !r.hasPostgres() {
		return ReviewFriendRequestResult{}, scaffold.ErrNotImplemented
	}

	reviewerID, err := r.resolvePrincipalUserID(ctx, principal)
	if err != nil {
		return ReviewFriendRequestResult{}, err
	}

	dbRequestID, err := strconv.ParseInt(strings.TrimSpace(requestID), 10, 64)
	if err != nil || dbRequestID <= 0 {
		return ReviewFriendRequestResult{}, fmt.Errorf("invalid friend request id")
	}

	action := strings.ToLower(strings.TrimSpace(input.Action))
	nextStatus := ""
	switch action {
	case "approve", "approved":
		nextStatus = friendStatusApproved
	case "reject", "rejected", "deny", "decline":
		nextStatus = friendStatusRejected
	default:
		return ReviewFriendRequestResult{}, fmt.Errorf("unsupported review action: %s", input.Action)
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return ReviewFriendRequestResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var (
		existingRequesterID int64
		existingReceiverID  int64
		existingStatus      string
	)
	if err := tx.QueryRowContext(
		ctx,
		`select requester_id, receiver_id, status
		 from user_friend_requests
		 where id = $1
		   and deleted_at is null
		 for update`,
		dbRequestID,
	).Scan(&existingRequesterID, &existingReceiverID, &existingStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ReviewFriendRequestResult{}, fmt.Errorf("friend request %s not found", requestID)
		}
		return ReviewFriendRequestResult{}, err
	}

	if existingReceiverID != reviewerID {
		return ReviewFriendRequestResult{}, fmt.Errorf("only receiver can review this friend request")
	}
	if existingStatus != friendStatusPending {
		return ReviewFriendRequestResult{}, fmt.Errorf("friend request already processed")
	}

	if nextStatus == friendStatusApproved {
		var approvedExists bool
		if err := tx.QueryRowContext(
			ctx,
			`select exists(
				select 1
				from user_friend_requests
				where deleted_at is null
				  and status = $3
				  and id <> $1
				  and (
				    (requester_id = $2 and receiver_id = $4)
				    or (requester_id = $4 and receiver_id = $2)
				  )
			)`,
			dbRequestID,
			existingRequesterID,
			friendStatusApproved,
			existingReceiverID,
		).Scan(&approvedExists); err != nil {
			return ReviewFriendRequestResult{}, err
		}
		if approvedExists {
			return ReviewFriendRequestResult{}, fmt.Errorf("users are already friends")
		}
	}

	if _, err := tx.ExecContext(
		ctx,
		`update user_friend_requests
		 set status = $2,
		     reviewed_by = $3,
		     reviewed_at = now(),
		     updated_at = now()
		 where id = $1`,
		dbRequestID,
		nextStatus,
		reviewerID,
	); err != nil {
		return ReviewFriendRequestResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReviewFriendRequestResult{}, err
	}

	return ReviewFriendRequestResult{
		RequestID: strconv.FormatInt(dbRequestID, 10),
		Status:    nextStatus,
	}, nil
}

func (r *repository) QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error) {
	syncMode, err := normalizeBangumiSyncMode(input.SyncMode, len(input.SubjectIDs), input.BangumiUsername)
	if err != nil {
		return BangumiImportJob{}, err
	}

	normalizedVisibility, err := normalizeBangumiVisibility(input.Visibility)
	if err != nil {
		return BangumiImportJob{}, err
	}

	var (
		requestPayload       map[string]any
		resultPayload        map[string]any
		importErr            error
		jobType              string
		normalizedSubjectIDs []int64
		normalizedStatus     string
		bangumiUsername      string
		maxItems             int
	)

	switch syncMode {
	case "account":
		bangumiUsername, err = normalizeBangumiUsername(input.BangumiUsername)
		if err != nil {
			return BangumiImportJob{}, err
		}
		maxItems = normalizeBangumiSyncMaxItems(input.MaxItems)
		jobType = "collection_sync"
		requestPayload = map[string]any{
			"sync_mode":        syncMode,
			"bangumi_username": bangumiUsername,
			"max_items":        maxItems,
			"visibility":       normalizedVisibility,
		}
	default:
		normalizedSubjectIDs = normalizeBangumiSubjectIDs(input.SubjectIDs)
		if len(normalizedSubjectIDs) == 0 {
			return BangumiImportJob{}, fmt.Errorf("at least one valid subject id is required")
		}

		normalizedStatus, err = normalizeBangumiCollectionStatus(input.Status)
		if err != nil {
			return BangumiImportJob{}, err
		}

		jobType = "collection_sync"
		requestPayload = map[string]any{
			"sync_mode":   syncMode,
			"subject_ids": normalizedSubjectIDs,
			"status":      normalizedStatus,
			"visibility":  normalizedVisibility,
		}
	}

	if !r.hasPostgres() {
		resultPayload = map[string]any{
			"sync_mode":  syncMode,
			"visibility": normalizedVisibility,
		}
		if syncMode == "account" {
			resultPayload["bangumi_username"] = bangumiUsername
			resultPayload["requested"] = maxItems
			resultPayload["imported"] = 0
			resultPayload["failed"] = 0
		} else {
			resultPayload["imported_subject_ids"] = normalizedSubjectIDs
			resultPayload["requested"] = len(normalizedSubjectIDs)
			resultPayload["imported"] = len(normalizedSubjectIDs)
			resultPayload["failed"] = 0
		}

		return BangumiImportJob{
			JobID:          "bgm-sync-scaffold",
			Status:         "succeeded",
			Channel:        "bangumi_sync_jobs",
			JobType:        jobType,
			RequestPayload: requestPayload,
			ResultPayload:  resultPayload,
		}, nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return BangumiImportJob{}, loadErr
		}
		userID = record.ID
	}

	requestPayloadRaw, err := json.Marshal(requestPayload)
	if err != nil {
		return BangumiImportJob{}, err
	}

	var jobID int64
	var status string
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into bangumi_sync_jobs (
			user_id,
			job_type,
			status,
			request_payload
		) values ($1, $2::sync_job_type, 'queued', $3::jsonb)
		returning id, status::text`,
		userID,
		jobType,
		string(requestPayloadRaw),
	).Scan(&jobID, &status); err != nil {
		return BangumiImportJob{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update bangumi_sync_jobs
		 set status = 'running',
		     started_at = now(),
		     updated_at = now()
		 where id = $1`,
		jobID,
	); err != nil {
		return BangumiImportJob{}, err
	}

	if syncMode == "account" {
		resultPayload, importErr = r.importBangumiCollectionsByUsernameNow(
			ctx,
			userID,
			bangumiUsername,
			normalizedVisibility,
			maxItems,
		)
	} else {
		resultPayload, importErr = r.importBangumiCollectionsNow(
			ctx,
			userID,
			normalizedSubjectIDs,
			normalizedStatus,
			normalizedVisibility,
		)
	}

	finalStatus := "succeeded"
	errorMessage := ""
	if importErr != nil {
		finalStatus = "failed"
		errorMessage = importErr.Error()
	}

	if resultPayload == nil {
		resultPayload = map[string]any{}
	}
	if _, exists := resultPayload["sync_mode"]; !exists {
		resultPayload["sync_mode"] = syncMode
	}
	if syncMode == "account" {
		if _, exists := resultPayload["bangumi_username"]; !exists {
			resultPayload["bangumi_username"] = bangumiUsername
		}
	}

	resultRaw, marshalErr := json.Marshal(resultPayload)
	if marshalErr != nil {
		resultRaw = []byte(`{}`)
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update bangumi_sync_jobs
		 set status = $2::sync_job_status,
		     result_payload = $3::jsonb,
		     error_message = nullif($4, ''),
		     finished_at = now(),
		     updated_at = now()
		 where id = $1`,
		jobID,
		finalStatus,
		string(resultRaw),
		errorMessage,
	); err != nil {
		return BangumiImportJob{}, err
	}

	return r.getBangumiJobByID(ctx, jobID)
}

type bangumiSubjectTag struct {
	Name string `json:"name"`
}

type bangumiSubjectImages struct {
	Large  string `json:"large"`
	Common string `json:"common"`
	Medium string `json:"medium"`
	Small  string `json:"small"`
	Grid   string `json:"grid"`
}

type bangumiSubjectRating struct {
	Rank  int     `json:"rank"`
	Score float64 `json:"score"`
	Total int     `json:"total"`
}

type bangumiSubjectResponse struct {
	ID       int64                `json:"id"`
	Type     int16                `json:"type"`
	Name     string               `json:"name"`
	NameCN   string               `json:"name_cn"`
	Summary  string               `json:"summary"`
	Date     string               `json:"date"`
	Platform string               `json:"platform"`
	Images   bangumiSubjectImages `json:"images"`
	Rating   bangumiSubjectRating `json:"rating"`
	Tags     []bangumiSubjectTag  `json:"tags"`
}

func normalizeBangumiSubjectIDs(ids []int64) []int64 {
	if len(ids) == 0 {
		return nil
	}

	seen := make(map[int64]struct{}, len(ids))
	result := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
		if len(result) >= maxBangumiImportSubjects {
			break
		}
	}
	return result
}

func normalizeBangumiSyncMode(raw string, subjectCount int, bangumiUsername string) (string, error) {
	mode := strings.ToLower(strings.TrimSpace(raw))
	if mode == "" {
		if strings.TrimSpace(bangumiUsername) != "" && subjectCount == 0 {
			return "account", nil
		}
		return "subject_ids", nil
	}

	switch mode {
	case "subject_ids", "subjects", "subject", "id":
		return "subject_ids", nil
	case "account", "username", "user":
		return "account", nil
	default:
		return "", fmt.Errorf("unsupported bangumi sync mode: %s", raw)
	}
}

func normalizeBangumiUsername(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", fmt.Errorf("bangumi username is required for account sync")
	}
	if len(value) > 64 {
		return "", fmt.Errorf("bangumi username is too long")
	}

	for i := 0; i < len(value); i++ {
		ch := value[i]
		isAllowed := (ch >= 'a' && ch <= 'z') ||
			(ch >= 'A' && ch <= 'Z') ||
			(ch >= '0' && ch <= '9') ||
			ch == '_' || ch == '-' || ch == '.'
		if !isAllowed {
			return "", fmt.Errorf("bangumi username contains unsupported character: %q", ch)
		}
	}

	return value, nil
}

func normalizeProfileUsername(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}
	if len(value) < 3 {
		return "", fmt.Errorf("username must be at least 3 characters")
	}
	if len(value) > 64 {
		return "", fmt.Errorf("username is too long")
	}

	for i := 0; i < len(value); i++ {
		ch := value[i]
		isAllowed := (ch >= 'a' && ch <= 'z') ||
			(ch >= 'A' && ch <= 'Z') ||
			(ch >= '0' && ch <= '9') ||
			ch == '_' || ch == '-' || ch == '.'
		if !isAllowed {
			return "", fmt.Errorf("username contains unsupported character: %q", ch)
		}
	}

	return value, nil
}

func normalizeBangumiSyncMaxItems(value int) int {
	switch {
	case value <= 0:
		return defaultBangumiSyncItems
	case value > maxBangumiSyncItems:
		return maxBangumiSyncItems
	default:
		return value
	}
}

func normalizeBangumiCollectionStatus(raw string) (string, error) {
	status := strings.ToLower(strings.TrimSpace(raw))
	switch status {
	case "wish", "doing", "collect", "on_hold", "dropped":
		return status, nil
	default:
		return "", fmt.Errorf("unsupported bangumi collection status: %s", raw)
	}
}

func bangumiCollectionTypeToStatus(value int) (string, error) {
	switch value {
	case 1:
		return "wish", nil
	case 2:
		return "collect", nil
	case 3:
		return "doing", nil
	case 4:
		return "on_hold", nil
	case 5:
		return "dropped", nil
	default:
		return "", fmt.Errorf("unsupported bangumi collection type: %d", value)
	}
}

func normalizeBangumiVisibility(raw string) (string, error) {
	visibility := strings.ToLower(strings.TrimSpace(raw))
	if visibility == "" {
		visibility = "public"
	}

	switch visibility {
	case "public", "members", "private":
		return visibility, nil
	default:
		return "", fmt.Errorf("unsupported visibility: %s", raw)
	}
}

func (r *repository) importBangumiCollectionsNow(
	ctx context.Context,
	userID int64,
	subjectIDs []int64,
	collectionStatus string,
	visibility string,
) (map[string]any, error) {
	imported := make([]int64, 0, len(subjectIDs))
	failed := make(map[string]string)

	for _, subjectID := range subjectIDs {
		subject, rawPayload, err := r.fetchBangumiSubject(ctx, subjectID)
		if err != nil {
			failed[strconv.FormatInt(subjectID, 10)] = err.Error()
			continue
		}

		if err := r.upsertBangumiCollection(ctx, userID, subject, rawPayload, collectionStatus, visibility); err != nil {
			failed[strconv.FormatInt(subjectID, 10)] = err.Error()
			continue
		}

		imported = append(imported, subjectID)
	}

	payload := map[string]any{
		"requested_subject_ids": subjectIDs,
		"imported_subject_ids":  imported,
		"requested":             len(subjectIDs),
		"imported":              len(imported),
		"failed":                len(failed),
		"status":                collectionStatus,
		"visibility":            visibility,
	}
	if len(failed) > 0 {
		payload["failed_details"] = failed
	}

	if len(imported) == 0 {
		return payload, fmt.Errorf("all requested subjects failed to import")
	}

	return payload, nil
}

type bangumiUserCollectionPage struct {
	Data   []bangumiUserCollectionEntry `json:"data"`
	Total  int                          `json:"total"`
	Limit  int                          `json:"limit"`
	Offset int                          `json:"offset"`
}

type bangumiUserCollectionEntry struct {
	SubjectID int64           `json:"subject_id"`
	Type      int             `json:"type"`
	Subject   json.RawMessage `json:"subject"`
}

type bangumiCollectionSyncItem struct {
	SubjectID int64
	Status    string
	Subject   json.RawMessage
}

func (r *repository) importBangumiCollectionsByUsernameNow(
	ctx context.Context,
	userID int64,
	bangumiUsername string,
	visibility string,
	maxItems int,
) (map[string]any, error) {
	items, fetchedStatusCounts, err := r.fetchBangumiCollectionItemsByUsername(ctx, bangumiUsername, maxItems)
	if err != nil {
		return map[string]any{
			"sync_mode":        "account",
			"bangumi_username": bangumiUsername,
			"visibility":       visibility,
			"requested":        0,
			"imported":         0,
			"failed":           0,
		}, err
	}

	imported := make([]int64, 0, len(items))
	importedStatusCounts := make(map[string]int, 5)
	failed := make(map[string]string)

	for _, item := range items {
		subject, rawPayload, parseErr := parseBangumiSubjectPayload(item.Subject, item.SubjectID)
		if parseErr != nil {
			subject, rawPayload, parseErr = r.fetchBangumiSubject(ctx, item.SubjectID)
		}
		if parseErr != nil {
			failed[strconv.FormatInt(item.SubjectID, 10)] = parseErr.Error()
			continue
		}

		if err := r.upsertBangumiCollection(ctx, userID, subject, rawPayload, item.Status, visibility); err != nil {
			failed[strconv.FormatInt(item.SubjectID, 10)] = err.Error()
			continue
		}

		imported = append(imported, item.SubjectID)
		importedStatusCounts[item.Status]++
	}

	payload := map[string]any{
		"sync_mode":             "account",
		"bangumi_username":      bangumiUsername,
		"visibility":            visibility,
		"max_items":             maxItems,
		"requested":             len(items),
		"imported":              len(imported),
		"failed":                len(failed),
		"imported_subject_ids":  imported,
		"fetched_status_counts": fetchedStatusCounts,
		"imported_status_counts": map[string]int{
			"wish":    importedStatusCounts["wish"],
			"doing":   importedStatusCounts["doing"],
			"collect": importedStatusCounts["collect"],
			"on_hold": importedStatusCounts["on_hold"],
			"dropped": importedStatusCounts["dropped"],
		},
	}
	if len(failed) > 0 {
		payload["failed_details"] = failed
	}

	if len(imported) == 0 {
		return payload, fmt.Errorf("all fetched collections failed to import")
	}

	return payload, nil
}

func (r *repository) fetchBangumiCollectionItemsByUsername(
	ctx context.Context,
	bangumiUsername string,
	maxItems int,
) ([]bangumiCollectionSyncItem, map[string]int, error) {
	statusCounters := map[string]int{
		"wish":    0,
		"doing":   0,
		"collect": 0,
		"on_hold": 0,
		"dropped": 0,
	}

	items := make([]bangumiCollectionSyncItem, 0, maxItems)
	seenSubjectIDs := make(map[int64]struct{}, maxItems)
	collectionTypes := []int{1, 2, 3, 4, 5}

	for _, collectionType := range collectionTypes {
		offset := 0
		for len(items) < maxItems {
			pageItems, total, err := r.fetchBangumiCollectionPage(ctx, bangumiUsername, collectionType, bangumiCollectionPage, offset)
			if err != nil {
				return nil, statusCounters, err
			}
			if len(pageItems) == 0 {
				break
			}

			for _, item := range pageItems {
				if len(items) >= maxItems {
					break
				}
				if item.SubjectID <= 0 {
					continue
				}
				if _, exists := seenSubjectIDs[item.SubjectID]; exists {
					continue
				}
				seenSubjectIDs[item.SubjectID] = struct{}{}
				items = append(items, item)
				statusCounters[item.Status]++
			}

			offset += len(pageItems)
			if total > 0 && offset >= total {
				break
			}
			if len(pageItems) < bangumiCollectionPage {
				break
			}
		}

		if len(items) >= maxItems {
			break
		}
	}

	if len(items) == 0 {
		return nil, statusCounters, fmt.Errorf("no collections found for bangumi user: %s", bangumiUsername)
	}

	return items, statusCounters, nil
}

func (r *repository) fetchBangumiCollectionPage(
	ctx context.Context,
	bangumiUsername string,
	collectionType int,
	limit int,
	offset int,
) ([]bangumiCollectionSyncItem, int, error) {
	status, err := bangumiCollectionTypeToStatus(collectionType)
	if err != nil {
		return nil, 0, err
	}

	endpoint, err := url.JoinPath(r.bangumiAPIBaseURL, "users", bangumiUsername, "collections")
	if err != nil {
		return nil, 0, err
	}

	parsed, err := url.Parse(endpoint)
	if err != nil {
		return nil, 0, err
	}
	query := parsed.Query()
	query.Set("type", strconv.Itoa(collectionType))
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", strconv.Itoa(offset))
	parsed.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", r.bangumiAPIUserAgent)

	resp, err := r.bangumiHTTPClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, 0, err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, 0, fmt.Errorf("bangumi collections api %d: %s", resp.StatusCode, compactErrorBody(rawBody))
	}

	var page bangumiUserCollectionPage
	if err := json.Unmarshal(rawBody, &page); err != nil || page.Data == nil {
		var rawItems []bangumiUserCollectionEntry
		if err := json.Unmarshal(rawBody, &rawItems); err != nil {
			return nil, 0, fmt.Errorf("invalid bangumi collections response: %w", err)
		}
		page.Data = rawItems
		page.Total = len(rawItems)
	}

	items := make([]bangumiCollectionSyncItem, 0, len(page.Data))
	for _, entry := range page.Data {
		subjectID := entry.SubjectID
		if subjectID <= 0 {
			subjectID = bangumiSubjectIDFromRaw(entry.Subject)
		}
		if subjectID <= 0 {
			continue
		}

		nextStatus := status
		if mapped, mapErr := bangumiCollectionTypeToStatus(entry.Type); mapErr == nil {
			nextStatus = mapped
		}

		items = append(items, bangumiCollectionSyncItem{
			SubjectID: subjectID,
			Status:    nextStatus,
			Subject:   entry.Subject,
		})
	}

	return items, page.Total, nil
}

func (r *repository) fetchBangumiSubject(ctx context.Context, subjectID int64) (bangumiSubjectResponse, map[string]any, error) {
	endpoint, err := url.JoinPath(r.bangumiAPIBaseURL, "subjects", strconv.FormatInt(subjectID, 10))
	if err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return bangumiSubjectResponse{}, nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", r.bangumiAPIUserAgent)

	resp, err := r.bangumiHTTPClient.Do(req)
	if err != nil {
		return bangumiSubjectResponse{}, nil, err
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return bangumiSubjectResponse{}, nil, fmt.Errorf("bangumi api %d: %s", resp.StatusCode, compactErrorBody(rawBody))
	}

	return parseBangumiSubjectPayload(rawBody, subjectID)
}

func parseBangumiSubjectPayload(rawBody []byte, fallbackSubjectID int64) (bangumiSubjectResponse, map[string]any, error) {
	if len(rawBody) == 0 {
		return bangumiSubjectResponse{}, nil, fmt.Errorf("empty bangumi subject payload")
	}

	var rawPayload map[string]any
	if err := json.Unmarshal(rawBody, &rawPayload); err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	var subject bangumiSubjectResponse
	if err := json.Unmarshal(rawBody, &subject); err != nil {
		return bangumiSubjectResponse{}, nil, err
	}

	if subject.ID == 0 {
		subject.ID = fallbackSubjectID
	}
	if subject.Type <= 0 {
		subject.Type = 2
	}
	subject.Name = strings.TrimSpace(subject.Name)
	if subject.Name == "" {
		subject.Name = fmt.Sprintf("Bangumi Subject %d", subject.ID)
	}
	subject.NameCN = strings.TrimSpace(subject.NameCN)
	subject.Summary = strings.TrimSpace(subject.Summary)
	subject.Platform = strings.TrimSpace(subject.Platform)

	return subject, rawPayload, nil
}

func bangumiSubjectURL(rawPayload map[string]any, subjectID int64) string {
	if rawPayload != nil {
		if rawURL, ok := rawPayload["url"].(string); ok {
			normalized := strings.TrimSpace(rawURL)
			if strings.HasPrefix(normalized, "http://") || strings.HasPrefix(normalized, "https://") {
				return normalized
			}
			if strings.HasPrefix(normalized, "/subject/") {
				return "https://bgm.tv" + normalized
			}
		}
	}

	if subjectID <= 0 {
		return ""
	}

	return fmt.Sprintf("%s/%d", bangumiSubjectWebBaseURL, subjectID)
}

func bangumiSubjectIDFromRaw(raw json.RawMessage) int64 {
	if len(raw) == 0 {
		return 0
	}

	var probe struct {
		ID        int64 `json:"id"`
		SubjectID int64 `json:"subject_id"`
	}
	if err := json.Unmarshal(raw, &probe); err != nil {
		return 0
	}
	if probe.ID > 0 {
		return probe.ID
	}
	if probe.SubjectID > 0 {
		return probe.SubjectID
	}
	return 0
}

func compactErrorBody(raw []byte) string {
	text := strings.TrimSpace(string(raw))
	if text == "" {
		return "empty response"
	}
	text = strings.ReplaceAll(text, "\n", " ")
	text = strings.Join(strings.Fields(text), " ")
	if len(text) > 240 {
		return text[:240] + "..."
	}
	return text
}

func selectBangumiCoverURL(images bangumiSubjectImages) string {
	candidates := []string{images.Large, images.Common, images.Medium, images.Small, images.Grid}
	for _, candidate := range candidates {
		value := strings.TrimSpace(candidate)
		if value != "" {
			return value
		}
	}
	return ""
}

func parseBangumiAirDate(value string) any {
	dateText := strings.TrimSpace(value)
	if dateText == "" {
		return nil
	}

	parsed, err := time.Parse("2006-01-02", dateText)
	if err != nil {
		return nil
	}
	return parsed
}

func uniqueNonEmptyStrings(items []string) []string {
	if len(items) == 0 {
		return []string{}
	}

	normalized := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for _, item := range items {
		next := strings.TrimSpace(item)
		if next == "" {
			continue
		}
		if _, exists := seen[next]; exists {
			continue
		}
		seen[next] = struct{}{}
		normalized = append(normalized, next)
	}

	if len(normalized) == 0 {
		return []string{}
	}

	slices.Sort(normalized)
	return normalized
}

func (r *repository) upsertBangumiCollection(
	ctx context.Context,
	userID int64,
	subject bangumiSubjectResponse,
	rawPayload map[string]any,
	collectionStatus string,
	visibility string,
) error {
	subjectURL := bangumiSubjectURL(rawPayload, subject.ID)

	tagNames := make([]string, 0, len(subject.Tags))
	for _, tag := range subject.Tags {
		tagNames = append(tagNames, tag.Name)
	}
	tagNames = uniqueNonEmptyStrings(tagNames)

	platforms := uniqueNonEmptyStrings([]string{subject.Platform})
	coverURL := selectBangumiCoverURL(subject.Images)
	airDate := parseBangumiAirDate(subject.Date)

	var ratingScore any = nil
	if subject.Rating.Score > 0 {
		ratingScore = subject.Rating.Score
	}

	var rankNo any = nil
	if subject.Rating.Rank > 0 {
		rankNo = subject.Rating.Rank
	}

	extraJSON, err := json.Marshal(map[string]any{
		"rating_total": subject.Rating.Total,
		"images": map[string]any{
			"large":  strings.TrimSpace(subject.Images.Large),
			"common": strings.TrimSpace(subject.Images.Common),
			"medium": strings.TrimSpace(subject.Images.Medium),
			"small":  strings.TrimSpace(subject.Images.Small),
			"grid":   strings.TrimSpace(subject.Images.Grid),
		},
	})
	if err != nil {
		return err
	}

	rawJSON, err := json.Marshal(rawPayload)
	if err != nil {
		return err
	}

	var localSubjectID int64
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into bangumi_subjects (
			bgm_subject_id,
			subject_type,
			name,
			name_cn,
			summary,
			cover_image_url,
			air_date,
			rating_score,
			rank_no,
			tags,
			platforms,
			extra,
			raw_payload,
			synced_at,
			updated_at
		) values (
			$1, $2, $3, nullif($4, ''), nullif($5, ''), nullif($6, ''), $7, $8, $9,
			$10, $11, $12::jsonb, $13::jsonb, now(), now()
		)
		on conflict (bgm_subject_id) do update
		 set subject_type = excluded.subject_type,
		     name = excluded.name,
		     name_cn = excluded.name_cn,
		     summary = excluded.summary,
		     cover_image_url = excluded.cover_image_url,
		     air_date = excluded.air_date,
		     rating_score = excluded.rating_score,
		     rank_no = excluded.rank_no,
		     tags = excluded.tags,
		     platforms = excluded.platforms,
		     extra = excluded.extra,
		     raw_payload = excluded.raw_payload,
		     synced_at = now(),
		     updated_at = now()
		returning id`,
		subject.ID,
		subject.Type,
		subject.Name,
		subject.NameCN,
		subject.Summary,
		coverURL,
		airDate,
		ratingScore,
		rankNo,
		tagNames,
		platforms,
		string(extraJSON),
		string(rawJSON),
	).Scan(&localSubjectID); err != nil {
		return err
	}

	collectionRawJSON, err := json.Marshal(map[string]any{
		"source":            "bangumi_v0",
		"bgm_subject_id":    subject.ID,
		"subject_url":       subjectURL,
		"collection_status": collectionStatus,
		"visibility":        visibility,
	})
	if err != nil {
		return err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`insert into user_bangumi_collections (
			user_id,
			subject_id,
			collection_status,
			display_visibility,
			raw_payload,
			synced_at,
			updated_at
		) values (
			$1, $2, $3::bangumi_collection_status, $4::visibility_level, $5::jsonb, now(), now()
		)
		on conflict (user_id, subject_id) do update
		 set collection_status = excluded.collection_status,
		     display_visibility = excluded.display_visibility,
		     raw_payload = excluded.raw_payload,
		     synced_at = now(),
		     updated_at = now()`,
		userID,
		localSubjectID,
		collectionStatus,
		visibility,
		string(collectionRawJSON),
	); err != nil {
		return err
	}

	return nil
}

func (r *repository) ListMyBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiJobs(principal.Username), params), nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return pagination.Result[BangumiImportJob]{}, loadErr
		}
		userID = record.ID
	}

	return r.listBangumiJobs(ctx, params, &userID)
}

func (r *repository) ListMyBangumiCollections(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiCollection], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiCollections(principal.Username), params), nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return pagination.Result[BangumiCollection]{}, loadErr
		}
		userID = record.ID
	}

	return r.listBangumiCollectionsByUserID(ctx, userID, params, false)
}

func (r *repository) ListUserBangumiCollections(ctx context.Context, username string, params pagination.Params) (pagination.Result[BangumiCollection], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiCollections(username), params), nil
	}

	record, err := r.loadUserByUsername(ctx, username)
	if err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}

	return r.listBangumiCollectionsByUserID(ctx, record.ID, params, true)
}

func (r *repository) listBangumiCollectionsByUserID(
	ctx context.Context,
	userID int64,
	params pagination.Params,
	onlyPublic bool,
) (pagination.Result[BangumiCollection], error) {
	countQuery := `select count(*)::int
	 from user_bangumi_collections
	 where user_id = $1`
	listQuery := `select
		ubc.id,
		ubc.subject_id,
		ubc.collection_status::text,
		ubc.display_visibility::text,
		ubc.synced_at,
		ubc.updated_at,
		bs.bgm_subject_id,
		bs.subject_type,
		bs.name,
		coalesce(bs.name_cn, ''),
		coalesce(bs.summary, ''),
		coalesce(bs.cover_image_url, ''),
		coalesce(to_char(bs.air_date, 'YYYY-MM-DD'), ''),
		bs.rating_score,
		bs.rank_no,
		coalesce(array_to_json(bs.platforms)::text, '[]'),
		coalesce(ubc.raw_payload::text, '{}')
	from user_bangumi_collections ubc
	join bangumi_subjects bs on bs.id = ubc.subject_id
	where ubc.user_id = $1`
	if onlyPublic {
		countQuery += ` and display_visibility = 'public'::visibility_level`
		listQuery += ` and ubc.display_visibility = 'public'::visibility_level`
	}

	listQuery += `
	order by ubc.updated_at desc, ubc.id desc
	limit $2 offset $3`

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		countQuery,
		userID,
	).Scan(&total); err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		listQuery,
		userID,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}
	defer rows.Close()

	items := make([]BangumiCollection, 0, params.PageSize)
	for rows.Next() {
		item, scanErr := scanBangumiCollection(rows)
		if scanErr != nil {
			return pagination.Result[BangumiCollection]{}, scanErr
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[BangumiCollection]{}, err
	}

	return pagination.NewResult(items, total, params), nil
}

func (r *repository) UpdateMyBangumiCollection(
	ctx context.Context,
	principal security.Principal,
	collectionID string,
	input UpdateBangumiCollectionRequest,
) (BangumiCollection, error) {
	if !r.hasPostgres() {
		collections := scaffoldBangumiCollections(principal.Username)
		if len(collections) == 0 {
			return BangumiCollection{}, fmt.Errorf("bangumi collection %s not found", collectionID)
		}
		item := collections[0]
		item.CollectionID = strings.TrimSpace(collectionID)
		item.CollectionStatus = strings.TrimSpace(strings.ToLower(input.CollectionStatus))
		item.MyScore = input.MyScore
		item.MyComment = strings.TrimSpace(input.MyComment)
		return item, nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		record, loadErr := r.loadUserByUsername(ctx, principal.Username)
		if loadErr != nil {
			return BangumiCollection{}, loadErr
		}
		userID = record.ID
	}

	collectionIDInt, err := strconv.ParseInt(strings.TrimSpace(collectionID), 10, 64)
	if err != nil || collectionIDInt <= 0 {
		return BangumiCollection{}, fmt.Errorf("invalid collection id: %s", collectionID)
	}

	normalizedStatus, err := normalizeBangumiCollectionStatus(input.CollectionStatus)
	if err != nil {
		return BangumiCollection{}, err
	}

	var normalizedScore *int
	if input.MyScore != nil {
		if *input.MyScore < 1 || *input.MyScore > 10 {
			return BangumiCollection{}, fmt.Errorf("my_score must be between 1 and 10")
		}
		score := *input.MyScore
		normalizedScore = &score
	}

	normalizedComment := strings.TrimSpace(input.MyComment)
	if len(normalizedComment) > 200 {
		normalizedComment = normalizedComment[:200]
	}

	var rawPayloadText string
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select coalesce(raw_payload::text, '{}')
		 from user_bangumi_collections
		 where id = $1 and user_id = $2`,
		collectionIDInt,
		userID,
	).Scan(&rawPayloadText); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BangumiCollection{}, fmt.Errorf("bangumi collection %s not found", collectionID)
		}
		return BangumiCollection{}, err
	}

	rawPayload := map[string]any{}
	if strings.TrimSpace(rawPayloadText) != "" {
		_ = json.Unmarshal([]byte(rawPayloadText), &rawPayload)
	}

	rawPayload["collection_status"] = normalizedStatus
	if normalizedScore != nil {
		rawPayload["my_score"] = *normalizedScore
	} else {
		delete(rawPayload, "my_score")
	}
	if normalizedComment != "" {
		rawPayload["my_comment"] = normalizedComment
	} else {
		delete(rawPayload, "my_comment")
	}

	nextRawPayloadJSON, err := json.Marshal(rawPayload)
	if err != nil {
		return BangumiCollection{}, err
	}

	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`with updated as (
			update user_bangumi_collections
			   set collection_status = $3::bangumi_collection_status,
			       raw_payload = $4::jsonb,
			       updated_at = now()
			 where id = $1 and user_id = $2
			 returning
			 	id,
			 	subject_id,
			 	collection_status::text,
			 	display_visibility::text,
			 	synced_at,
			 	updated_at,
			 	coalesce(raw_payload::text, '{}') as raw_payload_text
		)
		select
			updated.id,
			updated.subject_id,
			updated.collection_status,
			updated.display_visibility,
			updated.synced_at,
			updated.updated_at,
			bs.bgm_subject_id,
			bs.subject_type,
			bs.name,
			coalesce(bs.name_cn, ''),
			coalesce(bs.summary, ''),
			coalesce(bs.cover_image_url, ''),
			coalesce(to_char(bs.air_date, 'YYYY-MM-DD'), ''),
			bs.rating_score,
			bs.rank_no,
			coalesce(array_to_json(bs.platforms)::text, '[]'),
			updated.raw_payload_text
		from updated
		join bangumi_subjects bs on bs.id = updated.subject_id`,
		collectionIDInt,
		userID,
		normalizedStatus,
		string(nextRawPayloadJSON),
	)

	item, err := scanBangumiCollection(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return BangumiCollection{}, fmt.Errorf("bangumi collection %s not found", collectionID)
		}
		return BangumiCollection{}, err
	}

	return item, nil
}

func (r *repository) ListBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error) {
	if !r.hasPostgres() {
		return pagination.Slice(scaffoldBangumiJobs("rubedo_room"), params), nil
	}

	return r.listBangumiJobs(ctx, params, nil)
}

func (r *repository) UpdateBangumiImportJobStatus(ctx context.Context, principal security.Principal, jobID string, input UpdateBangumiJobStatusRequest) (BangumiImportJob, error) {
	if !r.hasPostgres() {
		jobs := scaffoldBangumiJobs(principal.Username)
		job := jobs[0]
		job.JobID = jobID
		job.Status = strings.TrimSpace(strings.ToLower(input.Status))
		job.ErrorMessage = strings.TrimSpace(input.ErrorMessage)
		job.ResultPayload = input.ResultPayload
		return job, nil
	}

	nextStatus := strings.TrimSpace(strings.ToLower(input.Status))
	switch nextStatus {
	case "queued", "running", "succeeded", "failed", "cancelled":
	default:
		return BangumiImportJob{}, fmt.Errorf("unsupported bangumi job status: %s", input.Status)
	}

	dbJobID, err := strconv.ParseInt(strings.TrimSpace(jobID), 10, 64)
	if err != nil {
		return BangumiImportJob{}, err
	}

	resultPayloadJSON := "{}"
	if input.ResultPayload != nil {
		raw, marshalErr := json.Marshal(input.ResultPayload)
		if marshalErr != nil {
			return BangumiImportJob{}, marshalErr
		}
		resultPayloadJSON = string(raw)
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update bangumi_sync_jobs
		 set status = $2::sync_job_status,
		     result_payload = case
		         when $3::jsonb = '{}'::jsonb and result_payload <> '{}'::jsonb then result_payload
		         else $3::jsonb
		     end,
		     error_message = nullif($4, ''),
		     started_at = case
		         when $2 = 'running' and started_at is null then now()
		         else started_at
		     end,
		     finished_at = case
		         when $2 in ('succeeded', 'failed', 'cancelled') then now()
		         else finished_at
		     end,
		     updated_at = now()
		 where id = $1`,
		dbJobID,
		nextStatus,
		resultPayloadJSON,
		strings.TrimSpace(input.ErrorMessage),
	); err != nil {
		return BangumiImportJob{}, err
	}

	return r.getBangumiJobByID(ctx, dbJobID)
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

func (r *repository) listFriendRequestsByDirection(
	ctx context.Context,
	params pagination.Params,
	userID int64,
	incoming bool,
) (pagination.Result[FriendRequest], error) {
	countQuery := `select count(*)::int
		from user_friend_requests
		where deleted_at is null
		  and status = $2
		  and requester_id = $1`
	dataQuery := `select
			fr.id,
			fr.requester_id,
			req.username,
			coalesce(nullif(req.nickname, ''), req.username) as requester_nickname,
			coalesce(req.avatar_url, '') as requester_avatar,
			fr.receiver_id,
			recv.username,
			coalesce(nullif(recv.nickname, ''), recv.username) as receiver_nickname,
			coalesce(recv.avatar_url, '') as receiver_avatar,
			fr.status,
			coalesce(fr.message, '') as message,
			fr.created_at,
			fr.reviewed_at
		from user_friend_requests fr
		join users req on req.id = fr.requester_id
		join users recv on recv.id = fr.receiver_id
		where fr.deleted_at is null
		  and fr.status = $2
		  and fr.requester_id = $1
		order by fr.created_at desc, fr.id desc
		limit $3 offset $4`
	if incoming {
		countQuery = `select count(*)::int
			from user_friend_requests
			where deleted_at is null
			  and status = $2
			  and receiver_id = $1`
		dataQuery = `select
				fr.id,
				fr.requester_id,
				req.username,
				coalesce(nullif(req.nickname, ''), req.username) as requester_nickname,
				coalesce(req.avatar_url, '') as requester_avatar,
				fr.receiver_id,
				recv.username,
				coalesce(nullif(recv.nickname, ''), recv.username) as receiver_nickname,
				coalesce(recv.avatar_url, '') as receiver_avatar,
				fr.status,
				coalesce(fr.message, '') as message,
				fr.created_at,
				fr.reviewed_at
			from user_friend_requests fr
			join users req on req.id = fr.requester_id
			join users recv on recv.id = fr.receiver_id
			where fr.deleted_at is null
			  and fr.status = $2
			  and fr.receiver_id = $1
			order by fr.created_at desc, fr.id desc
			limit $3 offset $4`
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		countQuery,
		userID,
		friendStatusPending,
	).Scan(&total); err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		dataQuery,
		userID,
		friendStatusPending,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[FriendRequest]{}, err
	}
	defer rows.Close()

	requests := make([]FriendRequest, 0)
	for rows.Next() {
		request, scanErr := scanFriendRequest(rows)
		if scanErr != nil {
			return pagination.Result[FriendRequest]{}, scanErr
		}
		requests = append(requests, request)
	}
	if err := rows.Err(); err != nil {
		return pagination.Result[FriendRequest]{}, err
	}

	return pagination.NewResult(requests, total, params), nil
}

func (r *repository) getFriendRequestByID(ctx context.Context, requestID int64) (FriendRequest, error) {
	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			fr.id,
			fr.requester_id,
			req.username,
			coalesce(nullif(req.nickname, ''), req.username) as requester_nickname,
			coalesce(req.avatar_url, '') as requester_avatar,
			fr.receiver_id,
			recv.username,
			coalesce(nullif(recv.nickname, ''), recv.username) as receiver_nickname,
			coalesce(recv.avatar_url, '') as receiver_avatar,
			fr.status,
			coalesce(fr.message, '') as message,
			fr.created_at,
			fr.reviewed_at
		 from user_friend_requests fr
		 join users req on req.id = fr.requester_id
		 join users recv on recv.id = fr.receiver_id
		 where fr.id = $1
		   and fr.deleted_at is null
		 limit 1`,
		requestID,
	)

	result, err := scanFriendRequest(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return FriendRequest{}, fmt.Errorf("friend request %d not found", requestID)
		}
		return FriendRequest{}, err
	}

	return result, nil
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

func (r *repository) listBangumiJobs(ctx context.Context, params pagination.Params, userID *int64) (pagination.Result[BangumiImportJob], error) {
	countQuery := `select count(*)::int from bangumi_sync_jobs`
	countArgs := make([]any, 0, 1)
	listQuery := `select
		bsj.id,
		bsj.user_id,
		coalesce(u.username, ''),
		coalesce(bsj.external_account_id, 0),
		bsj.job_type::text,
		bsj.status::text,
		bsj.request_payload::text,
		bsj.result_payload::text,
		coalesce(bsj.error_message, ''),
		bsj.started_at,
		bsj.finished_at,
		bsj.created_at,
		bsj.updated_at
	from bangumi_sync_jobs bsj
	left join users u on u.id = bsj.user_id`
	listArgs := make([]any, 0, 3)

	if userID != nil {
		countQuery += ` where user_id = $1`
		listQuery += ` where bsj.user_id = $1`
		countArgs = append(countArgs, *userID)
		listArgs = append(listArgs, *userID)
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return pagination.Result[BangumiImportJob]{}, err
	}

	orderClause := ` order by bsj.created_at desc, bsj.id desc`
	if userID != nil {
		listQuery += orderClause + ` limit $2 offset $3`
		listArgs = append(listArgs, params.PageSize, params.Offset())
	} else {
		listQuery += orderClause + ` limit $1 offset $2`
		listArgs = append(listArgs, params.PageSize, params.Offset())
	}

	rows, err := r.platform.Postgres.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return pagination.Result[BangumiImportJob]{}, err
	}
	defer rows.Close()

	items := make([]BangumiImportJob, 0)
	for rows.Next() {
		job, scanErr := scanBangumiJob(rows)
		if scanErr != nil {
			return pagination.Result[BangumiImportJob]{}, scanErr
		}
		items = append(items, job)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[BangumiImportJob]{}, err
	}

	return pagination.NewResult(items, total, params), nil
}

func (r *repository) getBangumiJobByID(ctx context.Context, jobID int64) (BangumiImportJob, error) {
	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			bsj.id,
			bsj.user_id,
			coalesce(u.username, ''),
			coalesce(bsj.external_account_id, 0),
			bsj.job_type::text,
			bsj.status::text,
			bsj.request_payload::text,
			bsj.result_payload::text,
			coalesce(bsj.error_message, ''),
			bsj.started_at,
			bsj.finished_at,
			bsj.created_at,
			bsj.updated_at
		from bangumi_sync_jobs bsj
		left join users u on u.id = bsj.user_id
		where bsj.id = $1`,
		jobID,
	)

	job, err := scanBangumiJob(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return BangumiImportJob{}, fmt.Errorf("bangumi job %d not found", jobID)
		}
		return BangumiImportJob{}, err
	}

	return job, nil
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
