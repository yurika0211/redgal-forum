package wall

import (
	"context"

	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	ListEntries(ctx context.Context) ([]WallEntry, error)
	CreateSubmission(ctx context.Context, principal security.Principal, input CreateSubmissionRequest) (WallEntry, error)
	ReviewSubmission(ctx context.Context, principal security.Principal, submissionID string, input ReviewSubmissionRequest) (ReviewResult, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListEntries(ctx context.Context) ([]WallEntry, error) {
	return []WallEntry{
		{
			ID:          "wall-001",
			Title:       "第一次社团招新",
			Content:     "This is the scaffolded memories wall entry.",
			Images:      []string{"https://example.com/wall-1.png"},
			Approved:    true,
			Contributor: "memory-curator",
		},
	}, nil
}

func (r *repository) CreateSubmission(ctx context.Context, principal security.Principal, input CreateSubmissionRequest) (WallEntry, error) {
	return WallEntry{
		ID:          "wall-submission-001",
		Title:       input.Title,
		Content:     input.Content,
		Images:      input.Images,
		Approved:    false,
		Contributor: principal.Username,
	}, nil
}

func (r *repository) ReviewSubmission(ctx context.Context, principal security.Principal, submissionID string, input ReviewSubmissionRequest) (ReviewResult, error) {
	return ReviewResult{
		SubmissionID: submissionID,
		Status:       input.Decision,
	}, nil
}
