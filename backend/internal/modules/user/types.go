package user

type Profile struct {
	UserID      string         `json:"user_id"`
	Username    string         `json:"username"`
	Nickname    string         `json:"nickname"`
	Signature   string         `json:"signature"`
	Bio         string         `json:"bio"`
	AvatarURL   string         `json:"avatar_url"`
	Status      string         `json:"status"`
	Verified    bool           `json:"verified"`
	Roles       []string       `json:"roles"`
	Collections map[string]int `json:"collections"`
}

type UpdateProfileRequest struct {
	Nickname  string `json:"nickname"`
	Signature string `json:"signature"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatar_url"`
}

type BangumiImportRequest struct {
	SubjectIDs []int64 `json:"subject_ids" binding:"required"`
	Status     string  `json:"status" binding:"required"`
	Visibility string  `json:"visibility"`
}

type BangumiImportJob struct {
	JobID   string `json:"job_id"`
	Status  string `json:"status"`
	Channel string `json:"channel"`
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
	RelayEvents          int `json:"relay_events"`
	RelayEntries         int `json:"relay_entries"`
	WritingContests      int `json:"writing_contests"`
	WritingSubmissions   int `json:"writing_submissions"`
	ContentReportsOpen   int `json:"content_reports_open"`
	SiteContentBlocks    int `json:"site_content_blocks"`
	GalleryEntries       int `json:"gallery_entries"`
	LuckybotSessions     int `json:"luckybot_sessions"`
	LuckybotAdminActions int `json:"luckybot_admin_actions"`
}

type UpdateUserStatusRequest struct {
	Status string `json:"status" binding:"required"`
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
