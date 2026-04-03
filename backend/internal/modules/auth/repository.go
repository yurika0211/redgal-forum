package auth

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"example.com/rubedo/backend/internal/config"
	"example.com/rubedo/backend/internal/platform"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	CreateAccount(ctx context.Context, input RegisterRequest) (RegisterResult, error)
	CreateSession(ctx context.Context, account, password string) (Session, error)
	InvalidateSession(ctx context.Context, userID string) error
}

type repository struct {
	platform *platform.Platform
	auth     config.AuthConfig
}

type accountRecord struct {
	ID           int64
	Username     string
	PasswordHash string
	Status       string
	Roles        []security.Role
}

func NewRepository(platform *platform.Platform, authConfig config.AuthConfig) Repository {
	return &repository{
		platform: platform,
		auth:     authConfig,
	}
}

func (r *repository) CreateAccount(ctx context.Context, input RegisterRequest) (RegisterResult, error) {
	if r.platform == nil || r.platform.Postgres == nil || !r.platform.Postgres.Available() {
		return RegisterResult{
			UserID:   "user-scaffold-001",
			Username: input.Username,
			Status:   "pending_verification",
			Verified: false,
			Roles:    []string{string(security.RoleUnverified)},
		}, nil
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return RegisterResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	username := strings.TrimSpace(input.Username)
	studentID := strings.TrimSpace(input.StudentID)
	passwordHash := "scaffold:" + strings.TrimSpace(input.Password)
	schoolEmail := fmt.Sprintf("%s@pending.local", studentID)
	nickname := username

	var userID int64
	if err := tx.QueryRowContext(
		ctx,
		`insert into users (
			username,
			password_hash,
			school_email,
			student_no,
			nickname,
			status
		) values ($1, $2, $3, $4, $5, 'pending_verification')
		returning id`,
		username,
		passwordHash,
		schoolEmail,
		studentID,
		nickname,
	).Scan(&userID); err != nil {
		return RegisterResult{}, err
	}

	proofPayload, err := json.Marshal(map[string]string{
		"student_id": studentID,
	})
	if err != nil {
		return RegisterResult{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`insert into user_verification_requests (user_id, method, proof_payload, status)
		 values ($1, 'student_id', $2::jsonb, 'pending')`,
		userID,
		string(proofPayload),
	); err != nil {
		return RegisterResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return RegisterResult{}, err
	}

	return RegisterResult{
		UserID:   strconv.FormatInt(userID, 10),
		Username: username,
		Status:   "pending_verification",
		Verified: false,
		Roles:    []string{string(security.RoleUnverified)},
	}, nil
}

func (r *repository) CreateSession(ctx context.Context, account, password string) (Session, error) {
	normalizedAccount := strings.TrimSpace(account)
	normalizedPassword := strings.TrimSpace(password)
	if normalizedAccount == "" || normalizedPassword == "" {
		return Session{}, ErrInvalidCredentials
	}

	if record, ok, err := r.loadAccountRecord(ctx, normalizedAccount); err != nil {
		return Session{}, err
	} else if ok {
		if !passwordMatches(record.PasswordHash, normalizedPassword) {
			return Session{}, ErrInvalidCredentials
		}

		principal := principalFromAccountRecord(record)
		return scaffoldSessionFromPrincipal(r.auth.JWTSecret, principal)
	}

	if !r.auth.AllowScaffoldLogin {
		return Session{}, ErrScaffoldLoginDisabled
	}

	expectedPassword := strings.TrimSpace(r.auth.ScaffoldLoginPassword)
	if expectedPassword == "" || normalizedPassword != expectedPassword {
		return Session{}, ErrInvalidCredentials
	}

	principal := security.Principal{
		UserID:     normalizedAccount,
		Username:   normalizedAccount,
		UserStatus: "active",
		Verified:   true,
		Roles:      []security.Role{security.RoleMember},
		Anonymous:  false,
	}

	return scaffoldSessionFromPrincipal(r.auth.JWTSecret, principal)
}

func (r *repository) InvalidateSession(ctx context.Context, userID string) error {
	return nil
}

func (r *repository) loadAccountRecord(ctx context.Context, account string) (accountRecord, bool, error) {
	if r.platform == nil || r.platform.Postgres == nil || !r.platform.Postgres.Available() {
		return accountRecord{}, false, nil
	}

	var record accountRecord
	err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, username, password_hash, status
		 from users
		 where deleted_at is null
		   and (
		     lower(username) = lower($1)
		     or lower(school_email) = lower($1)
		     or student_no = $1
		   )
		 limit 1`,
		account,
	).Scan(&record.ID, &record.Username, &record.PasswordHash, &record.Status)
	if err != nil {
		if err == sql.ErrNoRows {
			return accountRecord{}, false, nil
		}

		return accountRecord{}, false, err
	}

	roles, err := r.loadRoleCodes(ctx, record.ID)
	if err != nil {
		return accountRecord{}, false, err
	}
	record.Roles = roles

	return record, true, nil
}

func (r *repository) loadRoleCodes(ctx context.Context, userID int64) ([]security.Role, error) {
	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select r.code
		 from user_roles ur
		 join roles r on r.id = ur.role_id
		 where ur.user_id = $1
		 order by r.code asc`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []security.Role
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}

		role := security.Role(strings.TrimSpace(code))
		if role == "" {
			continue
		}
		roles = append(roles, role)
	}

	return roles, rows.Err()
}

func scaffoldSessionFromPrincipal(secret string, principal security.Principal) (Session, error) {
	accessToken := security.BuildScaffoldToken(secret, security.ScaffoldAccessTokenPrefix, principal)
	refreshToken := security.BuildScaffoldToken(secret, security.ScaffoldRefreshTokenPrefix, principal)
	if accessToken == "" || refreshToken == "" {
		return Session{}, ErrScaffoldLoginDisabled
	}

	return Session{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    3600,
	}, nil
}

func passwordMatches(storedHash, password string) bool {
	storedHash = strings.TrimSpace(storedHash)
	password = strings.TrimSpace(password)
	if storedHash == "" || password == "" {
		return false
	}

	if storedHash == password {
		return true
	}

	return storedHash == "scaffold:"+password
}

func principalFromAccountRecord(record accountRecord) security.Principal {
	roles := normalizeAccountRoles(record.Status, record.Roles)
	verified := false
	for _, role := range roles {
		if role == security.RoleMember || role == security.RoleAdmin || role == security.RoleSuperAdmin {
			verified = true
			break
		}
	}

	return security.Principal{
		UserID:     strconv.FormatInt(record.ID, 10),
		Username:   record.Username,
		UserStatus: record.Status,
		Verified:   verified,
		Roles:      roles,
		Anonymous:  false,
	}
}

func normalizeAccountRoles(status string, roles []security.Role) []security.Role {
	unique := make(map[security.Role]struct{}, len(roles))
	for _, role := range roles {
		if role == "" {
			continue
		}
		unique[role] = struct{}{}
	}

	if len(unique) == 0 {
		if status == "active" {
			return []security.Role{security.RoleMember}
		}

		return []security.Role{security.RoleUnverified}
	}

	result := make([]security.Role, 0, len(unique))
	for role := range unique {
		result = append(result, role)
	}

	return result
}
