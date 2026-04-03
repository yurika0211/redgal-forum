package luckybot

import (
	"context"

	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	Chat(ctx context.Context, principal security.Principal, input ChatRequest) (ChatResult, error)
	ReloadPersona(ctx context.Context, principal security.Principal) (ReloadResult, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) Chat(ctx context.Context, principal security.Principal, input ChatRequest) (ChatResult, error) {
	return ChatResult{}, scaffold.ErrNotImplemented
}

func (r *repository) ReloadPersona(ctx context.Context, principal security.Principal) (ReloadResult, error) {
	return ReloadResult{}, scaffold.ErrNotImplemented
}
