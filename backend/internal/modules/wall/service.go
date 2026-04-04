package wall

import (
	"context"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, params pagination.Params) (pagination.Result[WallEntry], error) {
	return s.repo.ListEntries(ctx, params)
}

func (s *Service) ListSubmissions(ctx context.Context, params pagination.Params) (pagination.Result[WallEntry], error) {
	return s.repo.ListSubmissions(ctx, params)
}

func (s *Service) CreateSubmission(ctx context.Context, principal security.Principal, input CreateSubmissionRequest) (WallEntry, error) {
	return s.repo.CreateSubmission(ctx, principal, input)
}

func (s *Service) ReviewSubmission(ctx context.Context, principal security.Principal, submissionID string, input ReviewSubmissionRequest) (ReviewResult, error) {
	return s.repo.ReviewSubmission(ctx, principal, submissionID, input)
}
