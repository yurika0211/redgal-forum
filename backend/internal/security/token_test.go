package security

import "testing"

func TestBuildAndParseScaffoldTokenPreservesClaims(t *testing.T) {
	original := Principal{
		UserID:     "42",
		Username:   "demo_admin",
		UserStatus: "active",
		Verified:   true,
		Roles:      []Role{RoleMember, RoleAdmin},
		Anonymous:  false,
	}

	token := BuildScaffoldToken("secret", ScaffoldAccessTokenPrefix, original)
	if token == "" {
		t.Fatal("expected non-empty scaffold token")
	}

	parsed, ok := ParseScaffoldAccessToken("secret", token)
	if !ok {
		t.Fatal("expected scaffold token to be parseable")
	}

	if parsed.UserID != original.UserID {
		t.Fatalf("expected user id %q, got %q", original.UserID, parsed.UserID)
	}
	if parsed.Username != original.Username {
		t.Fatalf("expected username %q, got %q", original.Username, parsed.Username)
	}
	if parsed.UserStatus != original.UserStatus {
		t.Fatalf("expected user status %q, got %q", original.UserStatus, parsed.UserStatus)
	}
	if !parsed.Verified {
		t.Fatal("expected parsed token to stay verified")
	}
	if !parsed.HasRole(RoleAdmin) {
		t.Fatalf("expected parsed roles to include admin, got %+v", parsed.Roles)
	}
}

func TestParseScaffoldAccessTokenDefaultsUnverifiedRoleWhenClaimsNotVerified(t *testing.T) {
	token := BuildScaffoldToken("secret", ScaffoldAccessTokenPrefix, Principal{
		UserID:     "84",
		Username:   "pending_user",
		UserStatus: "pending_verification",
		Verified:   false,
		Roles:      nil,
	})

	parsed, ok := ParseScaffoldAccessToken("secret", token)
	if !ok {
		t.Fatal("expected token to parse")
	}

	if parsed.Verified {
		t.Fatal("expected parsed principal to stay unverified")
	}
	if !parsed.HasRole(RoleUnverified) {
		t.Fatalf("expected unverified role to be synthesized, got %+v", parsed.Roles)
	}
}
