package luckybot

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

func (s *Service) Chat(ctx context.Context, principal security.Principal, input ChatRequest) (ChatResult, error) {
	return s.repo.Chat(ctx, principal, input)
}

func (s *Service) ReloadPersona(ctx context.Context, principal security.Principal) (ReloadResult, error) {
	return s.repo.ReloadPersona(ctx, principal)
}
