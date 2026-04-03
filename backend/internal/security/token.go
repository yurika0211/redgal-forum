package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"strings"
)

const (
	ScaffoldAccessTokenPrefix  = "scaffold-access"
	ScaffoldRefreshTokenPrefix = "scaffold-refresh"
)

type scaffoldTokenClaims struct {
	UserID     string `json:"user_id"`
	Username   string `json:"username"`
	UserStatus string `json:"user_status"`
	Verified   bool   `json:"verified"`
	Roles      []Role `json:"roles"`
}

func BuildScaffoldToken(secret, prefix string, principal Principal) string {
	trimmedSecret := strings.TrimSpace(secret)
	trimmedUsername := strings.TrimSpace(principal.Username)
	if trimmedSecret == "" || trimmedUsername == "" {
		return ""
	}

	claims := scaffoldTokenClaims{
		UserID:     strings.TrimSpace(principal.UserID),
		Username:   trimmedUsername,
		UserStatus: strings.TrimSpace(principal.UserStatus),
		Verified:   principal.Verified,
		Roles:      principal.Roles,
	}

	if claims.UserID == "" {
		claims.UserID = claims.Username
	}
	if claims.UserStatus == "" {
		if claims.Verified {
			claims.UserStatus = "active"
		} else {
			claims.UserStatus = "pending_verification"
		}
	}

	encodedClaims, err := json.Marshal(claims)
	if err != nil {
		return ""
	}

	payload := base64.RawURLEncoding.EncodeToString(encodedClaims)
	message := prefix + "." + payload
	signature := signToken(trimmedSecret, message)

	return message + "." + base64.RawURLEncoding.EncodeToString(signature)
}

func ParseScaffoldAccessToken(secret, token string) (Principal, bool) {
	principal, ok := parseScaffoldToken(secret, token, ScaffoldAccessTokenPrefix)
	if !ok {
		return Guest(), false
	}

	return principal, true
}

func parseScaffoldToken(secret, token, expectedPrefix string) (Principal, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != expectedPrefix {
		return Guest(), false
	}

	message := parts[0] + "." + parts[1]
	expectedSignature := signToken(strings.TrimSpace(secret), message)

	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(signature, expectedSignature) {
		return Guest(), false
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Guest(), false
	}

	var claims scaffoldTokenClaims
	if err := json.Unmarshal(payload, &claims); err == nil {
		username := strings.TrimSpace(claims.Username)
		if username == "" {
			return Guest(), false
		}

		userID := strings.TrimSpace(claims.UserID)
		if userID == "" {
			userID = username
		}

		roles := claims.Roles
		if len(roles) == 0 {
			if claims.Verified {
				roles = []Role{RoleMember}
			} else {
				roles = []Role{RoleUnverified}
			}
		}

		return Principal{
			UserID:     userID,
			Username:   username,
			UserStatus: strings.TrimSpace(claims.UserStatus),
			Verified:   claims.Verified,
			Roles:      roles,
			Anonymous:  false,
		}, true
	}

	username := strings.TrimSpace(string(payload))
	if username == "" {
		return Guest(), false
	}

	return Principal{
		UserID:     username,
		Username:   username,
		UserStatus: "active",
		Verified:   true,
		Roles:      []Role{RoleMember},
		Anonymous:  false,
	}, true
}

func signToken(secret, message string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(message))
	return mac.Sum(nil)
}
