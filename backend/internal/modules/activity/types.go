package activity

import "time"

type RelayEvent struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	Rules           string     `json:"rules"`
	Status          string     `json:"status"`
	AllowUnverified bool       `json:"allow_unverified"`
	CreatedBy       string     `json:"created_by"`
	StartsAt        *time.Time `json:"starts_at,omitempty"`
	EndsAt          *time.Time `json:"ends_at,omitempty"`
	EntryCount      int        `json:"entry_count"`
}

type RelayEntry struct {
	ID        string    `json:"id"`
	RelayID   string    `json:"relay_id"`
	FloorNo   int       `json:"floor_no"`
	Content   string    `json:"content"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"created_at"`
}

type RelayDetail struct {
	Event   RelayEvent   `json:"event"`
	Entries []RelayEntry `json:"entries"`
}

type CreateRelayRequest struct {
	Title           string     `json:"title" binding:"required"`
	Description     string     `json:"description"`
	Rules           string     `json:"rules"`
	AllowUnverified bool       `json:"allow_unverified"`
	StartsAt        *time.Time `json:"starts_at"`
	EndsAt          *time.Time `json:"ends_at"`
}

type UpdateRelayStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type CreateRelayEntryRequest struct {
	Content string `json:"content" binding:"required"`
}

type WritingContest struct {
	ID                 string     `json:"id"`
	Title              string     `json:"title"`
	Description        string     `json:"description"`
	Rules              string     `json:"rules"`
	Status             string     `json:"status"`
	AllowArticleRepost bool       `json:"allow_article_repost"`
	CreatedBy          string     `json:"created_by"`
	StartsAt           *time.Time `json:"starts_at,omitempty"`
	EndsAt             *time.Time `json:"ends_at,omitempty"`
	SubmissionCount    int        `json:"submission_count"`
}

type WritingSubmission struct {
	ID              string    `json:"id"`
	ContestID       string    `json:"contest_id"`
	Title           string    `json:"title"`
	Summary         string    `json:"summary"`
	Content         string    `json:"content"`
	Source          string    `json:"source"`
	SourceArticleID string    `json:"source_article_id,omitempty"`
	Author          string    `json:"author"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

type WritingContestDetail struct {
	Contest     WritingContest      `json:"contest"`
	Submissions []WritingSubmission `json:"submissions"`
}

type CreateWritingContestRequest struct {
	Title              string     `json:"title" binding:"required"`
	Description        string     `json:"description"`
	Rules              string     `json:"rules"`
	AllowArticleRepost bool       `json:"allow_article_repost"`
	StartsAt           *time.Time `json:"starts_at"`
	EndsAt             *time.Time `json:"ends_at"`
}

type UpdateWritingContestStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type CreateWritingSubmissionRequest struct {
	Title           string `json:"title" binding:"required"`
	Summary         string `json:"summary"`
	Content         string `json:"content"`
	SourceArticleID string `json:"source_article_id"`
}
