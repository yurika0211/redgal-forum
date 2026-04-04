package article

import "time"

type Visibility string

const (
	VisibilityPublic  Visibility = "public"
	VisibilityMember  Visibility = "member"
	VisibilityPrivate Visibility = "private"
)

type Article struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	Summary      string     `json:"summary"`
	Content      string     `json:"content"`
	Visibility   Visibility `json:"visibility"`
	Author       string     `json:"author"`
	Tags         []string   `json:"tags"`
	CommentCount int        `json:"comment_count"`
	LikeCount    int        `json:"like_count"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type CreateArticleRequest struct {
	Title      string     `json:"title" binding:"required"`
	Summary    string     `json:"summary"`
	Content    string     `json:"content" binding:"required"`
	Visibility Visibility `json:"visibility" binding:"required"`
	Tags       []string   `json:"tags"`
}

type UpdateArticleRequest struct {
	Title      string     `json:"title"`
	Summary    string     `json:"summary"`
	Content    string     `json:"content"`
	Visibility Visibility `json:"visibility"`
	Tags       []string   `json:"tags"`
}

type DeleteArticleResult struct {
	ArticleID string `json:"article_id"`
	Status    string `json:"status"`
}
