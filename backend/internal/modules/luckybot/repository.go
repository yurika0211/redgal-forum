package luckybot

import (
	"context"

	"example.com/rubedo/backend/internal/platform"
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
	sessionID := input.SessionID
	if sessionID == "" {
		sessionID = "luckybot-session-001"
	}

	return ChatResult{
		SessionID: sessionID,
		Reply:     "Luckybot scaffold received your message. Worker integration is reserved for the next step.",
		Model:     "nanobot-placeholder",
	}, nil
}

func (r *repository) ReloadPersona(ctx context.Context, principal security.Principal) (ReloadResult, error) {
	return ReloadResult{
		Status: "reload_queued",
	}, nil
}
