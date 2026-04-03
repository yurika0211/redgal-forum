package auth

import (
	"context"
	"errors"
	"testing"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/security"
)

func TestCreateSessionRejectsInvalidPassword(t *testing.T) {
	repo := NewRepository(nil, config.AuthConfig{
		JWTSecret:             "secret",
		AllowScaffoldLogin:    true,
		ScaffoldLoginPassword: "correct-password",
	})

	_, err := repo.CreateSession(context.Background(), "alice", "wrong-password")
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected invalid credentials error, got %v", err)
	}
}

func TestCreateSessionCreatesSignedTokens(t *testing.T) {
	repo := NewRepository(nil, config.AuthConfig{
		JWTSecret:             "secret",
		AllowScaffoldLogin:    true,
		ScaffoldLoginPassword: "correct-password",
	})

	session, err := repo.CreateSession(context.Background(), "alice", "correct-password")
	if err != nil {
		t.Fatalf("expected successful session creation, got %v", err)
	}

	principal, ok := security.ParseScaffoldAccessToken("secret", session.AccessToken)
	if !ok {
		t.Fatal("expected generated access token to be parseable")
	}
	if principal.Username != "alice" {
		t.Fatalf("expected username alice, got %q", principal.Username)
	}
	if !principal.Authenticated() {
		t.Fatal("expected generated access token to represent an authenticated principal")
	}
}

func TestCreateSessionFailsWhenScaffoldLoginDisabled(t *testing.T) {
	repo := NewRepository(nil, config.AuthConfig{
		JWTSecret:             "secret",
		AllowScaffoldLogin:    false,
		ScaffoldLoginPassword: "correct-password",
	})

	_, err := repo.CreateSession(context.Background(), "alice", "correct-password")
	if !errors.Is(err, ErrScaffoldLoginDisabled) {
		t.Fatalf("expected scaffold login disabled error, got %v", err)
	}
}
