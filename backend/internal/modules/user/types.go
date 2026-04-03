package user

type Profile struct {
	UserID      string         `json:"user_id"`
	Username    string         `json:"username"`
	Nickname    string         `json:"nickname"`
	Signature   string         `json:"signature"`
	Bio         string         `json:"bio"`
	AvatarURL   string         `json:"avatar_url"`
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
