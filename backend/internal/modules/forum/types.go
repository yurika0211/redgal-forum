package forum

import "time"

type Thread struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	Board      string    `json:"board"`
	Anonymous  bool      `json:"anonymous"`
	Author     string    `json:"author"`
	Tripcode   string    `json:"tripcode,omitempty"`
	Locked     bool      `json:"locked"`
	Tags       []string  `json:"tags"`
	ReplyCount int       `json:"reply_count"`
	ViewCount  int64     `json:"view_count"`
	IsPinned   bool      `json:"is_pinned"`
	LastPostAt time.Time `json:"last_post_at"`
	CreatedAt  time.Time `json:"created_at"`
}

type Reply struct {
	ID            string    `json:"id"`
	ThreadID      string    `json:"thread_id"`
	ParentID      string    `json:"parent_id,omitempty"`
	FloorNo       int       `json:"floor_no"`
	ParentFloorNo int       `json:"parent_floor_no,omitempty"`
	ReplyToAuthor string    `json:"reply_to_author,omitempty"`
	Content       string    `json:"content"`
	Author        string    `json:"author"`
	Tripcode      string    `json:"tripcode,omitempty"`
	Anonymous     bool      `json:"anonymous"`
	CreatedAt     time.Time `json:"created_at"`
}

type ThreadDetail struct {
	Thread  Thread  `json:"thread"`
	Replies []Reply `json:"replies"`
}

type ThreadReplySnapshot struct {
	ThreadID   string    `json:"thread_id"`
	Title      string    `json:"title"`
	ReplyCount int       `json:"reply_count"`
	LastPostAt time.Time `json:"last_post_at"`
}

type LevelConfig struct {
	Level      int            `json:"level"`
	MinExp     int            `json:"min_exp"`
	TitleName  string         `json:"title_name"`
	Privileges map[string]any `json:"privileges,omitempty"`
}

type LevelSummary struct {
	CurrentLevel  int        `json:"current_level"`
	TitleName     string     `json:"title_name"`
	TotalExp      int        `json:"total_exp"`
	NextLevel     int        `json:"next_level"`
	NextLevelExp  int        `json:"next_level_exp"`
	ExpToNext     int        `json:"exp_to_next"`
	SignedInToday bool       `json:"signed_in_today"`
	LastSignInAt  *time.Time `json:"last_sign_in_at,omitempty"`
}

type ExpActionLog struct {
	LogID      string    `json:"log_id"`
	ActionType string    `json:"action_type"`
	ExpDelta   int       `json:"exp_delta"`
	TargetID   string    `json:"target_id,omitempty"`
	ActionDate string    `json:"action_date"`
	CreatedAt  time.Time `json:"created_at"`
}

type Progress struct {
	Summary    LevelSummary   `json:"summary"`
	Levels     []LevelConfig  `json:"levels"`
	RecentLogs []ExpActionLog `json:"recent_logs"`
}

type SignInResult struct {
	Status   string   `json:"status"`
	ExpDelta int      `json:"exp_delta"`
	Progress Progress `json:"progress"`
	Message  string   `json:"message"`
}

type CreateThreadRequest struct {
	Title     string   `json:"title" binding:"required"`
	Content   string   `json:"content" binding:"required"`
	Board     string   `json:"board" binding:"required"`
	Anonymous bool     `json:"anonymous"`
	Tags      []string `json:"tags"`
}

type CreateReplyRequest struct {
	Content   string `json:"content" binding:"required"`
	Anonymous bool   `json:"anonymous"`
	Sage      bool   `json:"sage"`
	ParentID  string `json:"parent_id"`
}

type DeleteThreadResult struct {
	ThreadID string `json:"thread_id"`
	Status   string `json:"status"`
}

type DeleteReplyResult struct {
	ThreadID string `json:"thread_id"`
	ReplyID  string `json:"reply_id"`
	Status   string `json:"status"`
}
