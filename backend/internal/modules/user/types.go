package user

import "time"

type Profile struct {
	UserID          string         `json:"user_id"`
	Username        string         `json:"username"`
	SpaceIDEditable bool           `json:"space_id_editable"`
	Nickname        string         `json:"nickname"`
	Signature       string         `json:"signature"`
	Bio             string         `json:"bio"`
	AvatarURL       string         `json:"avatar_url"`
	Status          string         `json:"status"`
	Verified        bool           `json:"verified"`
	Roles           []string       `json:"roles"`
	Collections     map[string]int `json:"collections"`
}

type UpdateProfileRequest struct {
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Signature string `json:"signature"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatar_url"`
}

type BangumiImportRequest struct {
	SubjectIDs      []int64 `json:"subject_ids"`
	Status          string  `json:"status"`
	Visibility      string  `json:"visibility"`
	SyncMode        string  `json:"sync_mode"`
	BangumiUsername string  `json:"bangumi_username"`
	MaxItems        int     `json:"max_items"`
}

type BangumiImportJob struct {
	JobID             string         `json:"job_id"`
	UserID            string         `json:"user_id,omitempty"`
	Username          string         `json:"username,omitempty"`
	ExternalAccountID string         `json:"external_account_id,omitempty"`
	JobType           string         `json:"job_type,omitempty"`
	Status            string         `json:"status"`
	Channel           string         `json:"channel"`
	RequestPayload    map[string]any `json:"request_payload,omitempty"`
	ResultPayload     map[string]any `json:"result_payload,omitempty"`
	ErrorMessage      string         `json:"error_message,omitempty"`
	StartedAt         *time.Time     `json:"started_at,omitempty"`
	FinishedAt        *time.Time     `json:"finished_at,omitempty"`
	CreatedAt         *time.Time     `json:"created_at,omitempty"`
	UpdatedAt         *time.Time     `json:"updated_at,omitempty"`
}

type BangumiCollection struct {
	CollectionID      string     `json:"collection_id"`
	SubjectID         string     `json:"subject_id"`
	BangumiSubjectID  int64      `json:"bgm_subject_id"`
	SubjectURL        string     `json:"subject_url,omitempty"`
	SubjectType       int16      `json:"subject_type"`
	Name              string     `json:"name"`
	NameCN            string     `json:"name_cn,omitempty"`
	Summary           string     `json:"summary,omitempty"`
	CoverImageURL     string     `json:"cover_image_url,omitempty"`
	AirDate           string     `json:"air_date,omitempty"`
	RatingScore       *float64   `json:"rating_score,omitempty"`
	RankNo            *int       `json:"rank_no,omitempty"`
	Platforms         []string   `json:"platforms"`
	CollectionStatus  string     `json:"collection_status"`
	MyScore           *int       `json:"my_score,omitempty"`
	MyComment         string     `json:"my_comment,omitempty"`
	DisplayVisibility string     `json:"visibility"`
	SyncedAt          *time.Time `json:"synced_at,omitempty"`
	UpdatedAt         *time.Time `json:"updated_at,omitempty"`
}

type UpdateBangumiCollectionRequest struct {
	CollectionStatus string `json:"collection_status" binding:"required"`
	MyScore          *int   `json:"my_score"`
	MyComment        string `json:"my_comment"`
}

type UpdateBangumiJobStatusRequest struct {
	Status        string         `json:"status" binding:"required"`
	ResultPayload map[string]any `json:"result_payload"`
	ErrorMessage  string         `json:"error_message"`
}

type AdminUser struct {
	UserID                string   `json:"user_id"`
	Username              string   `json:"username"`
	Nickname              string   `json:"nickname"`
	Status                string   `json:"status"`
	Verified              bool     `json:"verified"`
	Roles                 []string `json:"roles"`
	PendingVerificationID string   `json:"pending_verification_id,omitempty"`
}

type AdminDashboard struct {
	TotalUsers               int            `json:"total_users"`
	PendingVerificationUsers int            `json:"pending_verification_users"`
	VerifiedUsers            int            `json:"verified_users"`
	AdminUsers               int            `json:"admin_users"`
	SuperAdminUsers          int            `json:"super_admin_users"`
	RoleDistribution         map[string]int `json:"role_distribution"`
	VerificationApprovalRule string         `json:"verification_approval_rule"`
}

type SuperAdminDashboard struct {
	AdminDashboard
	RelayEvents        int `json:"relay_events"`
	RelayEntries       int `json:"relay_entries"`
	WritingContests    int `json:"writing_contests"`
	WritingSubmissions int `json:"writing_submissions"`
	ContentReportsOpen int `json:"content_reports_open"`
	SiteContentBlocks  int `json:"site_content_blocks"`
	GalleryEntries     int `json:"gallery_entries"`
}

type UpdateUserStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type ModerateUserRequest struct {
	Action string `json:"action" binding:"required"`
}

type VerificationDecisionRequest struct {
	Action string `json:"action" binding:"required"`
	Note   string `json:"note"`
}

type VerificationDecisionResult struct {
	RequestID         string `json:"request_id"`
	UserID            string `json:"user_id"`
	ReviewAction      string `json:"review_action"`
	ApprovedCount     int    `json:"approved_count"`
	RejectedCount     int    `json:"rejected_count"`
	RequiredApprovals int    `json:"required_approvals"`
	FinalStatus       string `json:"final_status"`
}

type FriendSummary struct {
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
	Signature string `json:"signature"`
}

type FriendRequest struct {
	RequestID         string     `json:"request_id"`
	RequesterID       string     `json:"requester_id"`
	RequesterUsername string     `json:"requester_username"`
	RequesterNickname string     `json:"requester_nickname"`
	RequesterAvatar   string     `json:"requester_avatar_url"`
	ReceiverID        string     `json:"receiver_id"`
	ReceiverUsername  string     `json:"receiver_username"`
	ReceiverNickname  string     `json:"receiver_nickname"`
	ReceiverAvatar    string     `json:"receiver_avatar_url"`
	Status            string     `json:"status"`
	Message           string     `json:"message"`
	CreatedAt         time.Time  `json:"created_at"`
	ReviewedAt        *time.Time `json:"reviewed_at,omitempty"`
}

type CreateFriendRequest struct {
	Username string `json:"username" binding:"required"`
	Message  string `json:"message"`
}

type ReviewFriendRequest struct {
	Action string `json:"action" binding:"required"`
}

type ReviewFriendRequestResult struct {
	RequestID string `json:"request_id"`
	Status    string `json:"status"`
}
