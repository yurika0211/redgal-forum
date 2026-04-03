package forum

import (
	"context"
	"testing"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
)

func TestTripcodeDisplayIsStableAndMasked(t *testing.T) {
	first := tripcodeDisplay(true, "DemoUser")
	second := tripcodeDisplay(true, "demouser")

	if first == "" {
		t.Fatal("expected tripcode to be generated")
	}
	if first != second {
		t.Fatalf("expected case-insensitive stable tripcode, got %q and %q", first, second)
	}
	if len([]rune(first)) == 0 || []rune(first)[0] != '◆' {
		t.Fatalf("expected tripcode prefix ◆, got %q", first)
	}
	if len(first) != len("◆")+10 {
		t.Fatalf("expected 10-char hashed suffix, got %q", first)
	}
}

func TestListAnonymousThreadsFallsBackToScaffoldData(t *testing.T) {
	repo := NewRepository(nil)

	result, err := repo.ListAnonymousThreads(context.Background(), pagination.Params{Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("expected scaffold anonymous thread listing to succeed, got %v", err)
	}

	if len(result.Items) == 0 {
		t.Fatal("expected scaffold anonymous threads to be returned")
	}
	if result.Items[0].Board != anonymousBoardName {
		t.Fatalf("expected anonymous board name %q, got %q", anonymousBoardName, result.Items[0].Board)
	}
	if result.Items[0].Tripcode == "" {
		t.Fatal("expected scaffold anonymous thread to include tripcode")
	}
}

func TestCreateAnonymousReplyFallsBackToScaffoldReply(t *testing.T) {
	repo := NewRepository(nil)

	reply, err := repo.CreateAnonymousReply(context.Background(), security.Principal{
		UserID:     "u-1",
		Username:   "demo_user",
		UserStatus: "pending_verification",
		Verified:   false,
		Roles:      []security.Role{security.RoleUnverified},
	}, "anon-001", CreateReplyRequest{
		Content: "测试匿名回复",
		Sage:    true,
	})
	if err != nil {
		t.Fatalf("expected scaffold anonymous reply to succeed, got %v", err)
	}

	if reply.Content != "测试匿名回复" {
		t.Fatalf("expected reply content to roundtrip, got %q", reply.Content)
	}
	if !reply.Anonymous {
		t.Fatal("expected scaffold anonymous reply to remain anonymous")
	}
}
