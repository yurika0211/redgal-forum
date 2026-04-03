package user

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

func (s *Service) GetProfile(ctx context.Context, username string) (Profile, error) {
	return s.repo.GetProfile(ctx, username)
}

func (s *Service) GetMe(ctx context.Context, principal security.Principal) (Profile, error) {
	return s.repo.GetMe(ctx, principal)
}

func (s *Service) UpdateMe(ctx context.Context, principal security.Principal, input UpdateProfileRequest) (Profile, error) {
	return s.repo.UpdateMe(ctx, principal, input)
}

func (s *Service) QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error) {
	return s.repo.QueueBangumiImport(ctx, principal, input)
}
