package user

import (
	"context"
	"testing"

	"example.com/rubedo/backend/internal/security"
)

func TestGetAdminDashboardFallbackIncludesApprovalRule(t *testing.T) {
	repo := NewRepository(nil)

	dashboard, err := repo.GetAdminDashboard(context.Background(), security.Principal{
		UserID:     "9",
		Username:   "demo_admin",
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleAdmin},
	})
	if err != nil {
		t.Fatalf("expected scaffold admin dashboard to load, got %v", err)
	}

	if dashboard.VerificationApprovalRule == "" {
		t.Fatal("expected approval rule to be present")
	}
	if dashboard.RoleDistribution[string(security.RoleAdmin)] == 0 {
		t.Fatal("expected scaffold role distribution to include admin role")
	}
}

func TestGetSuperAdminDashboardFallbackIncludesActivityCounts(t *testing.T) {
	repo := NewRepository(nil)

	dashboard, err := repo.GetSuperAdminDashboard(context.Background(), security.Principal{
		UserID:     "10",
		Username:   "demo_super_admin",
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleSuperAdmin},
	})
	if err != nil {
		t.Fatalf("expected scaffold super admin dashboard to load, got %v", err)
	}

	if dashboard.RelayEvents == 0 {
		t.Fatal("expected relay count in super admin dashboard")
	}
	if dashboard.WritingContests == 0 {
		t.Fatal("expected writing contest count in super admin dashboard")
	}
}

func TestReviewVerificationFallbackSuperAdminDirectApproval(t *testing.T) {
	repo := NewRepository(nil)

	result, err := repo.ReviewVerification(context.Background(), security.Principal{
		UserID:     "10",
		Username:   "demo_super_admin",
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleSuperAdmin},
	}, "7", VerificationDecisionRequest{
		Action: "approved",
	})
	if err != nil {
		t.Fatalf("expected scaffold verification review to succeed, got %v", err)
	}

	if result.FinalStatus != "approved" {
		t.Fatalf("expected super admin direct approval, got %q", result.FinalStatus)
	}
	if result.RequiredApprovals != requiredAdminApprovals {
		t.Fatalf("expected required approvals %d, got %d", requiredAdminApprovals, result.RequiredApprovals)
	}
}
