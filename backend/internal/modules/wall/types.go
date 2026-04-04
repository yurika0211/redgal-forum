package wall

import "time"

type WallEntry struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Images      []string `json:"images"`
	Approved    bool     `json:"approved"`
	Contributor string   `json:"contributor"`
	Status      string   `json:"status,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateSubmissionRequest struct {
	Title   string   `json:"title" binding:"required"`
	Content string   `json:"content" binding:"required"`
	Images  []string `json:"images"`
}

type ReviewSubmissionRequest struct {
	Decision string `json:"decision" binding:"required"`
	Comment  string `json:"comment"`
}

type ReviewResult struct {
	SubmissionID string `json:"submission_id"`
	Status       string `json:"status"`
}
