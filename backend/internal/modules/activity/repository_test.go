package activity

import (
	"context"
	"testing"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
)

func TestListRelaysFallsBackToScaffoldData(t *testing.T) {
	repo := NewRepository(nil)

	events, err := repo.ListRelays(context.Background(), pagination.Params{Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("expected scaffold relays to load, got %v", err)
	}
	if len(events.Items) == 0 {
		t.Fatal("expected at least one scaffold relay event")
	}
	if !events.Items[0].AllowUnverified {
		t.Fatal("expected scaffold relay to allow unverified users")
	}
}

func TestCreateRelayFallsBackToScaffoldEvent(t *testing.T) {
	repo := NewRepository(nil)

	event, err := repo.CreateRelay(context.Background(), security.Principal{
		UserID:     "1",
		Username:   "demo_admin",
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleAdmin},
	}, CreateRelayRequest{
		Title:           "测试接龙",
		Description:     "测试描述",
		Rules:           "测试规则",
		AllowUnverified: true,
	})
	if err != nil {
		t.Fatalf("expected scaffold relay creation to succeed, got %v", err)
	}

	if event.Title != "测试接龙" {
		t.Fatalf("expected created relay title to roundtrip, got %q", event.Title)
	}
	if event.Status != "draft" {
		t.Fatalf("expected scaffold relay to start as draft, got %q", event.Status)
	}
}

func TestCreateWritingSubmissionFallsBackToScaffoldSubmission(t *testing.T) {
	repo := NewRepository(nil)

	submission, err := repo.CreateWritingSubmission(context.Background(), security.Principal{
		UserID:     "2",
		Username:   "demo_member",
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleMember},
	}, "1", CreateWritingSubmissionRequest{
		Title:   "测试征文",
		Summary: "摘要",
		Content: "正文",
	})
	if err != nil {
		t.Fatalf("expected scaffold writing submission to succeed, got %v", err)
	}

	if submission.Title != "测试征文" {
		t.Fatalf("expected submission title to roundtrip, got %q", submission.Title)
	}
	if submission.Source != "direct" {
		t.Fatalf("expected default source direct, got %q", submission.Source)
	}
}
