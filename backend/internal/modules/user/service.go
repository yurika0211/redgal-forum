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

func (s *Service) GetAdminDashboard(ctx context.Context, principal security.Principal) (AdminDashboard, error) {
	return s.repo.GetAdminDashboard(ctx, principal)
}

func (s *Service) GetSuperAdminDashboard(ctx context.Context, principal security.Principal) (SuperAdminDashboard, error) {
	return s.repo.GetSuperAdminDashboard(ctx, principal)
}

func (s *Service) ListAdminUsers(ctx context.Context, principal security.Principal) ([]AdminUser, error) {
	return s.repo.ListAdminUsers(ctx, principal)
}

func (s *Service) UpdateUserStatus(ctx context.Context, principal security.Principal, userID string, input UpdateUserStatusRequest) (AdminUser, error) {
	return s.repo.UpdateUserStatus(ctx, principal, userID, input)
}

func (s *Service) ReviewVerification(ctx context.Context, principal security.Principal, userID string, input VerificationDecisionRequest) (VerificationDecisionResult, error) {
	return s.repo.ReviewVerification(ctx, principal, userID, input)
}
