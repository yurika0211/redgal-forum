package database

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"strings"
)

var slugSanitizer = regexp.MustCompile(`[^a-z0-9]+`)

func EnsureUser(ctx context.Context, client *Client, username string) (int64, error) {
	if client == nil || !client.Available() {
		return 0, sql.ErrConnDone
	}

	normalizedUsername := strings.TrimSpace(strings.ToLower(username))
	if normalizedUsername == "" {
		normalizedUsername = "rubedo-room"
	}

	var userID int64
	err := client.QueryRowContext(
		ctx,
		`select id
		 from users
		 where lower(username) = lower($1)
		   and deleted_at is null
		 limit 1`,
		normalizedUsername,
	).Scan(&userID)
	if err == nil {
		return userID, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return 0, err
	}

	email := fmt.Sprintf("%s@example.local", normalizedUsername)
	nickname := normalizedUsername

	if _, err := client.ExecContext(
		ctx,
		`insert into users (
			username,
			password_hash,
			school_email,
			nickname,
			signature,
			bio,
			status,
			email_verified_at,
			profile_visibility
		) values ($1, $2, $3, $4, $5, $6, 'active', now(), 'public')
		on conflict do nothing`,
		normalizedUsername,
		"$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
		email,
		nickname,
		"由脚手架接口自动补建的站内用户。",
		"这个用户是为了让后端 CRUD 在本地环境里可以直接落库。",
	); err != nil {
		return 0, err
	}

	if err := client.QueryRowContext(
		ctx,
		`select id
		 from users
		 where lower(username) = lower($1)
		   and deleted_at is null
		 limit 1`,
		normalizedUsername,
	).Scan(&userID); err != nil {
		return 0, err
	}

	if _, err := client.ExecContext(
		ctx,
		`insert into user_roles (user_id, role_id)
		 select $1, id
		 from roles
		 where code in ('member', 'user')
		 order by case when code = 'member' then 0 else 1 end
		 limit 1
		 on conflict do nothing`,
		userID,
	); err != nil {
		return 0, err
	}

	return userID, nil
}

func Slugify(input string) string {
	normalized := strings.ToLower(strings.TrimSpace(input))
	if normalized == "" {
		return "item"
	}

	normalized = slugSanitizer.ReplaceAllString(normalized, "-")
	normalized = strings.Trim(normalized, "-")
	if normalized == "" {
		return "item"
	}

	return normalized
}
