package middleware

import (
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
