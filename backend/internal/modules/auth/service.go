package auth

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

func (s *Service) Register(ctx context.Context, input RegisterRequest) (RegisterResult, error) {
	return s.repo.CreateAccount(ctx, input)
}

func (s *Service) Login(ctx context.Context, input LoginRequest) (Session, error) {
	return s.repo.CreateSession(ctx, input.Account, input.Password)
}

func (s *Service) Logout(ctx context.Context, principal security.Principal) error {
	return s.repo.InvalidateSession(ctx, principal.UserID)
}
