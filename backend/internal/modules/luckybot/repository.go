package luckybot

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"

	"example.com/rubedo/backend/internal/platform"
	platformdb "example.com/rubedo/backend/internal/platform/database"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	Chat(ctx context.Context, principal security.Principal, input ChatRequest) (ChatResult, error)
	ReloadPersona(ctx context.Context, principal security.Principal) (ReloadResult, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) Chat(ctx context.Context, principal security.Principal, input ChatRequest) (ChatResult, error) {
	replyText := "Luckybot 还在施工中，但已经能记下你的对话。"

	if r.platform == nil || r.platform.Postgres == nil || !r.platform.Postgres.Available() {
		sessionID := strings.TrimSpace(input.SessionID)
		if sessionID == "" {
			sessionID = "luckybot-session-scaffold"
		}

		return ChatResult{
			SessionID: sessionID,
			Reply:     replyText,
			Model:     "rubedo-luckybot-scaffold",
		}, nil
	}

	userID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		userID, err = platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
		if err != nil {
			return ChatResult{}, err
		}
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return ChatResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	sessionID := strings.TrimSpace(input.SessionID)
	var dbSessionID int64
	if sessionID == "" {
		if err := tx.QueryRowContext(
			ctx,
			`insert into luckybot_sessions (
				owner_user_id,
				session_type,
				title,
				status,
				context_payload,
				last_message_at
			) values ($1, 'user_chat', $2, 'active', '{}'::jsonb, now())
			returning id`,
			userID,
			"Luckybot 对话",
		).Scan(&dbSessionID); err != nil {
			return ChatResult{}, err
		}
	} else {
		dbSessionID, err = strconv.ParseInt(sessionID, 10, 64)
		if err != nil {
			return ChatResult{}, err
		}
	}

	if _, err := tx.ExecContext(
		ctx,
		`insert into luckybot_messages (
			session_id,
			sender_type,
			sender_user_id,
			message_type,
			content
		) values ($1, 'user', $2, 'text', $3)`,
		dbSessionID,
		userID,
		strings.TrimSpace(input.Message),
	); err != nil {
		return ChatResult{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`insert into luckybot_messages (
			session_id,
			sender_type,
			message_type,
			content
		) values ($1, 'assistant', 'text', $2)`,
		dbSessionID,
		replyText,
	); err != nil {
		return ChatResult{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`update luckybot_sessions
		 set last_message_at = now(),
		     updated_at = now()
		 where id = $1`,
		dbSessionID,
	); err != nil {
		return ChatResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return ChatResult{}, err
	}

	return ChatResult{
		SessionID: strconv.FormatInt(dbSessionID, 10),
		Reply:     replyText,
		Model:     "rubedo-luckybot-scaffold",
	}, nil
}

func (r *repository) ReloadPersona(ctx context.Context, principal security.Principal) (ReloadResult, error) {
	if r.platform == nil || r.platform.Postgres == nil || !r.platform.Postgres.Available() {
		return ReloadResult{
			Status: "reload_queued",
		}, nil
	}

	actorUserID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		actorUserID, err = platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
		if err != nil {
			return ReloadResult{}, err
		}
	}

	resultPayload, err := json.Marshal(map[string]any{
		"status": "reload_queued",
	})
	if err != nil {
		return ReloadResult{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`insert into luckybot_admin_actions (
			actor_user_id,
			action_name,
			action_payload,
			result_payload
		) values ($1, 'reload_persona', '{}'::jsonb, $2::jsonb)`,
		actorUserID,
		string(resultPayload),
	); err != nil {
		return ReloadResult{}, err
	}

	return ReloadResult{
		Status: "reload_queued",
	}, nil
}
