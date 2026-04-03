package security

import "github.com/gin-gonic/gin"

type Role string

const (
	RoleGuest      Role = "guest"
	RoleUnverified Role = "unverified_user"
	RoleMember     Role = "member"
	RoleModerator  Role = "moderator"
	RoleAdmin      Role = "admin"
	RoleSuperAdmin Role = "super_admin"
)

type Principal struct {
	UserID     string `json:"user_id"`
	Username   string `json:"username"`
	UserStatus string `json:"user_status"`
	Verified   bool   `json:"verified"`
	Roles      []Role `json:"roles"`
	Anonymous  bool   `json:"anonymous"`
}

const principalContextKey = "principal"

func Guest() Principal {
	return Principal{
		Username:   "guest",
		UserStatus: "guest",
		Roles:      []Role{RoleGuest},
		Anonymous:  true,
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

func (p Principal) HasRole(role Role) bool {
	return p.HasAnyRole(role)
}

func (p Principal) IsVerifiedUser() bool {
	return p.HasAnyRole(RoleMember, RoleAdmin, RoleSuperAdmin)
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
