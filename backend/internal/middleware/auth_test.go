package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/security"
	"github.com/gin-gonic/gin"
)

func TestOptionalAuthRejectsInvalidBearerToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("GET", "/", nil)
	request.Header.Set("Authorization", "Bearer definitely-invalid")
	context.Request = request

	OptionalAuth(config.AuthConfig{JWTSecret: "secret"})(context)

	principal := security.FromContext(context)
	if principal.Authenticated() {
		t.Fatalf("expected guest principal for invalid token, got authenticated principal %+v", principal)
	}
}

func TestOptionalAuthAcceptsSignedBearerToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	token := security.BuildScaffoldToken("secret", security.ScaffoldAccessTokenPrefix, security.Principal{
		UserID:     "alice",
		Username:   "alice",
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleMember},
	})
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("GET", "/", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	context.Request = request

	OptionalAuth(config.AuthConfig{JWTSecret: "secret"})(context)

	principal := security.FromContext(context)
	if !principal.Authenticated() {
		t.Fatal("expected authenticated principal for signed token")
	}
	if principal.Username != "alice" {
		t.Fatalf("expected username alice, got %q", principal.Username)
	}
	if !principal.Verified {
		t.Fatal("expected signed scaffold principal to be verified")
	}
}

func TestOptionalAuthIgnoresDebugHeadersWhenDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest("GET", "/", nil)
	request.Header.Set("X-Debug-User", "admin")
	request.Header.Set("X-Debug-Roles", "super_admin")
	context.Request = request

	OptionalAuth(config.AuthConfig{
		JWTSecret:         "secret",
		AllowDebugHeaders: false,
	})(context)

	principal := security.FromContext(context)
	if principal.Authenticated() {
		t.Fatalf("expected debug headers to be ignored, got principal %+v", principal)
	}
}

func TestRequireVerifiedUserRejectsUnverifiedPrincipal(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	security.SetPrincipal(context, security.Principal{
		UserID:     "u-1",
		Username:   "pending_user",
		UserStatus: "pending_verification",
		Verified:   false,
		Roles:      []security.Role{security.RoleUnverified},
	})

	RequireVerifiedUser()(context)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for unverified user, got %d", recorder.Code)
	}
}

func TestRequireVerifiedUserAcceptsMemberPrincipal(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	security.SetPrincipal(context, security.Principal{
		UserID:     "u-2",
		Username:   "member_user",
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleMember},
	})

	called := false
	handler := func(c *gin.Context) {
		called = true
	}

	RequireVerifiedUser()(context)
	if !context.IsAborted() {
		handler(context)
	}

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected default 200 status for verified user, got %d", recorder.Code)
	}
	if !called {
		t.Fatal("expected verified user to pass middleware")
	}
}
