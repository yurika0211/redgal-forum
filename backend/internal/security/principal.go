package security

import "github.com/gin-gonic/gin"

type Role string

const (
	RoleGuest      Role = "guest"
	RoleMember     Role = "member"
	RoleModerator  Role = "moderator"
	RoleAdmin      Role = "admin"
	RoleSuperAdmin Role = "super_admin"
)

type Principal struct {
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Roles     []Role `json:"roles"`
	Anonymous bool   `json:"anonymous"`
}

const principalContextKey = "principal"

func Guest() Principal {
	return Principal{
		Username:  "guest",
		Roles:     []Role{RoleGuest},
		Anonymous: true,
	}
}

func (p Principal) Authenticated() bool {
	return p.UserID != ""
}

func (p Principal) HasAnyRole(roles ...Role) bool {
	for _, expected := range roles {
		for _, actual := range p.Roles {
			if actual == expected {
				return true
			}
		}
	}

	return false
}

func SetPrincipal(c *gin.Context, principal Principal) {
	c.Set(principalContextKey, principal)
}

func FromContext(c *gin.Context) Principal {
	value, exists := c.Get(principalContextKey)
	if !exists {
		return Guest()
	}

	principal, ok := value.(Principal)
	if !ok {
		return Guest()
	}

	return principal
}
