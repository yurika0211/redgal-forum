package forum

import (
	"context"

	"example.com/rubedo/backend/internal/security"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListThreads(ctx context.Context) ([]Thread, error) {
	return s.repo.ListThreads(ctx)
}

func (s *Service) GetThread(ctx context.Context, threadID string) (ThreadDetail, error) {
	return s.repo.GetThread(ctx, threadID)
}

func (s *Service) CreateThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error) {
	return s.repo.CreateThread(ctx, principal, input)
}

func (s *Service) CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error) {
	return s.repo.CreateReply(ctx, principal, threadID, input)
}

func (s *Service) DeleteThread(ctx context.Context, principal security.Principal, threadID string) (DeleteThreadResult, error) {
	return s.repo.DeleteThread(ctx, principal, threadID)
}

func (s *Service) DeleteReply(ctx context.Context, principal security.Principal, threadID, replyID string) (DeleteReplyResult, error) {
	return s.repo.DeleteReply(ctx, principal, threadID, replyID)
}
