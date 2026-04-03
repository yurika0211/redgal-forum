package middleware

import (
	"net/http"
	"strings"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/security"
	"github.com/gin-gonic/gin"
)

func OptionalAuth(cfg config.AuthConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := security.Guest()

		if cfg.AllowDebugHeaders {
			debugUser := strings.TrimSpace(c.GetHeader("X-Debug-User"))
			if debugUser != "" {
				principal = security.Principal{
					UserID:     debugUser,
					Username:   debugUser,
					UserStatus: "active",
					Verified:   true,
					Roles:      parseRoles(c.GetHeader("X-Debug-Roles")),
					Anonymous:  false,
				}
			}
		}

		if !principal.Authenticated() {
			token := bearerToken(c.GetHeader("Authorization"))
			if token != "" {
				principal = principalFromToken(cfg, token)
			}
		}

		security.SetPrincipal(c, principal)
		c.Next()
	}
}

func RequireAuthenticated() gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := security.FromContext(c)
		if !principal.Authenticated() {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"ok":         false,
				"error":      "authentication required",
				"request_id": RequestIDFromGin(c),
			})
			return
		}

		c.Next()
	}
}

func RequireRoles(roles ...security.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := security.FromContext(c)
		if !principal.HasAnyRole(roles...) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"ok":         false,
				"error":      "insufficient role",
				"request_id": RequestIDFromGin(c),
			})
			return
		}

		c.Next()
	}
}

func RequireVerifiedUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := security.FromContext(c)
		if !principal.IsVerifiedUser() {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"ok":         false,
				"error":      "verified user required",
				"request_id": RequestIDFromGin(c),
			})
			return
		}

		c.Next()
	}
}

func bearerToken(header string) string {
	if len(header) < len("Bearer ")+1 {
		return ""
	}

	if !strings.EqualFold(header[:7], "Bearer ") {
		return ""
	}

	return strings.TrimSpace(header[7:])
}

func parseRoles(raw string) []security.Role {
	if strings.TrimSpace(raw) == "" {
		return []security.Role{security.RoleMember}
	}

	parts := strings.Split(raw, ",")
	roles := make([]security.Role, 0, len(parts))
	for _, part := range parts {
		role := security.Role(strings.TrimSpace(part))
		if role == "" || !isKnownRole(role) {
			continue
		}

		roles = append(roles, role)
	}

	if len(roles) == 0 {
		return []security.Role{security.RoleMember}
	}

	return roles
}

func isKnownRole(role security.Role) bool {
	switch role {
	case security.RoleGuest,
		security.RoleUnverified,
		security.RoleMember,
		security.RoleModerator,
		security.RoleAdmin,
		security.RoleSuperAdmin:
		return true
	default:
		return false
	}
}

func principalFromToken(cfg config.AuthConfig, token string) security.Principal {
	principal, ok := security.ParseScaffoldAccessToken(cfg.JWTSecret, token)
	if !ok {
		return security.Guest()
	}

	return principal
}
