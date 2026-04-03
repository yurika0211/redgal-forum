package middleware

import (
	"encoding/base64"
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
					UserID:    debugUser,
					Username:  debugUser,
					Roles:     parseRoles(c.GetHeader("X-Debug-Roles")),
					Anonymous: false,
				}
			}
		}

		if !principal.Authenticated() {
			token := bearerToken(c.GetHeader("Authorization"))
			if token != "" {
				principal = principalFromToken(token)
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
		if role == "" {
			continue
		}

		roles = append(roles, role)
	}

	if len(roles) == 0 {
		return []security.Role{security.RoleMember}
	}

	return roles
}

func principalFromToken(token string) security.Principal {
	username := "member"

	for _, prefix := range []string{"scaffold-access.", "scaffold-refresh."} {
		if !strings.HasPrefix(token, prefix) {
			continue
		}

		encodedIdentity := strings.TrimPrefix(token, prefix)
		decodedIdentity, err := base64.RawURLEncoding.DecodeString(encodedIdentity)
		if err == nil {
			candidate := strings.TrimSpace(string(decodedIdentity))
			if candidate != "" {
				username = candidate
			}
		}
		break
	}

	return security.Principal{
		UserID:    username,
		Username:  username,
		Roles:     []security.Role{security.RoleMember},
		Anonymous: false,
	}
}
