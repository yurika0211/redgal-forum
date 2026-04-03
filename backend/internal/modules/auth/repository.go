package auth

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"example.com/rubedo/backend/internal/platform"
)

type Repository interface {
	CreateAccount(ctx context.Context, input RegisterRequest) (RegisterResult, error)
	CreateSession(ctx context.Context, account string) (Session, error)
	InvalidateSession(ctx context.Context, userID string) error
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) CreateAccount(ctx context.Context, input RegisterRequest) (RegisterResult, error) {
	return RegisterResult{
		UserID:   "user-scaffold-001",
		Username: input.Username,
		Status:   "pending_verification",
	}, nil
}

func (r *repository) CreateSession(ctx context.Context, account string) (Session, error) {
	normalizedAccount := strings.TrimSpace(account)
	if normalizedAccount == "" {
		normalizedAccount = "member"
	}

	encodedAccount := base64.RawURLEncoding.EncodeToString([]byte(normalizedAccount))

	return Session{
		AccessToken:  fmt.Sprintf("scaffold-access.%s", encodedAccount),
		RefreshToken: fmt.Sprintf("scaffold-refresh.%s", encodedAccount),
		ExpiresIn:    3600,
	}, nil
}

func (r *repository) InvalidateSession(ctx context.Context, userID string) error {
	return nil
}
