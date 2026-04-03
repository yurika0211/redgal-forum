package forum

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"example.com/rubedo/backend/internal/platform"
	platformdb "example.com/rubedo/backend/internal/platform/database"
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	ListThreads(ctx context.Context) ([]Thread, error)
	GetThread(ctx context.Context, threadID string) (ThreadDetail, error)
	CreateThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error)
	CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error)
	DeleteThread(ctx context.Context, principal security.Principal, threadID string) (DeleteThreadResult, error)
	DeleteReply(ctx context.Context, principal security.Principal, threadID, replyID string) (DeleteReplyResult, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListThreads(ctx context.Context) ([]Thread, error) {
	if !r.hasDatabase() {
		return scaffoldThreads(), nil
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			ft.id,
			ft.title,
			ft.content_md,
			fb.name,
			ft.is_anonymous,
			case
				when ft.is_anonymous then coalesce(fai.alias_name, '匿名旅人')
				else coalesce(nullif(u.nickname, ''), u.username)
			end as author_name,
			ft.reply_count,
			coalesce(string_agg(distinct tg.name, E'\n') filter (where tg.name is not null), '') as tags
		from forum_threads ft
		join forum_boards fb on fb.id = ft.board_id
		join users u on u.id = ft.author_id
		left join forum_anonymous_identities fai on fai.thread_id = ft.id and fai.user_id = ft.author_id
		left join forum_thread_tag_relations fttr on fttr.thread_id = ft.id
		left join forum_tags tg on tg.id = fttr.tag_id
		where ft.deleted_at is null
		  and ft.status = 'active'
		group by ft.id, fb.name, fai.alias_name, u.nickname, u.username
		order by ft.last_post_at desc, ft.id desc`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []Thread
	for rows.Next() {
		thread, err := scanThreadRow(rows)
		if err != nil {
			return nil, err
		}

		threads = append(threads, thread)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return threads, nil
}

func (r *repository) GetThread(ctx context.Context, threadID string) (ThreadDetail, error) {
	if !r.hasDatabase() {
		return scaffoldThreadDetail(threadID), nil
	}

	dbThreadID, err := parseThreadIdentifier(threadID)
	if err != nil {
		return ThreadDetail{}, err
	}

	threadRow := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			ft.id,
			ft.title,
			ft.content_md,
			fb.name,
			ft.is_anonymous,
			case
				when ft.is_anonymous then coalesce(fai.alias_name, '匿名旅人')
				else coalesce(nullif(u.nickname, ''), u.username)
			end as author_name,
			ft.reply_count,
			coalesce(string_agg(distinct tg.name, E'\n') filter (where tg.name is not null), '') as tags
		from forum_threads ft
		join forum_boards fb on fb.id = ft.board_id
		join users u on u.id = ft.author_id
		left join forum_anonymous_identities fai on fai.thread_id = ft.id and fai.user_id = ft.author_id
		left join forum_thread_tag_relations fttr on fttr.thread_id = ft.id
		left join forum_tags tg on tg.id = fttr.tag_id
		where ft.id = $1
		  and ft.deleted_at is null
		  and ft.status = 'active'
		group by ft.id, fb.name, fai.alias_name, u.nickname, u.username`,
		dbThreadID,
	)

	thread, err := scanThreadRow(threadRow)
	if err != nil {
		if err == sql.ErrNoRows {
			return ThreadDetail{}, fmt.Errorf("thread %s not found", threadID)
		}
		return ThreadDetail{}, err
	}

	replyRows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			fp.id,
			fp.thread_id,
			fp.content_md,
			case
				when fp.is_anonymous then coalesce(fai.alias_name, '匿名旅人')
				else coalesce(nullif(u.nickname, ''), u.username)
			end as author_name,
			fp.is_anonymous
		from forum_posts fp
		join users u on u.id = fp.author_id
		left join forum_anonymous_identities fai on fai.thread_id = fp.thread_id and fai.user_id = fp.author_id
		where fp.thread_id = $1
		  and fp.deleted_at is null
		  and fp.status = 'visible'
		order by fp.floor_no asc`,
		dbThreadID,
	)
	if err != nil {
		return ThreadDetail{}, err
	}
	defer replyRows.Close()

	replies := make([]Reply, 0)
	for replyRows.Next() {
		reply, err := scanReplyRow(replyRows)
		if err != nil {
			return ThreadDetail{}, err
		}

		replies = append(replies, reply)
	}

	if err := replyRows.Err(); err != nil {
		return ThreadDetail{}, err
	}

	return ThreadDetail{
		Thread:  thread,
		Replies: replies,
	}, nil
}

func (r *repository) CreateThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error) {
	if !r.hasDatabase() {
		return Thread{}, scaffold.ErrNotImplemented
	}

	authorID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return Thread{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return Thread{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	boardID, boardName, err := ensureBoard(ctx, tx, input.Board, authorID)
	if err != nil {
		return Thread{}, err
	}

	var threadID int64
	if err := tx.QueryRowContext(
		ctx,
		`insert into forum_threads (
			board_id,
			author_id,
			title,
			content_md,
			is_anonymous,
			status,
			reply_count,
			last_post_at
		) values ($1, $2, $3, $4, $5, 'active', 0, now())
		returning id`,
		boardID,
		authorID,
		input.Title,
		input.Content,
		input.Anonymous,
	).Scan(&threadID); err != nil {
		return Thread{}, err
	}

	if input.Anonymous {
		if err := ensureAnonymousIdentity(ctx, tx, threadID, authorID); err != nil {
			return Thread{}, err
		}
	}

	if err := syncThreadTags(ctx, tx, threadID, input.Tags); err != nil {
		return Thread{}, err
	}

	if err := tx.Commit(); err != nil {
		return Thread{}, err
	}

	author := principal.Username
	if input.Anonymous {
		author = "匿名旅人"
	}

	return Thread{
		ID:         strconv.FormatInt(threadID, 10),
		Title:      input.Title,
		Content:    input.Content,
		Board:      boardName,
		Anonymous:  input.Anonymous,
		Author:     author,
		Tags:       cleanedTags(input.Tags),
		ReplyCount: 0,
	}, nil
}

func (r *repository) CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error) {
	if !r.hasDatabase() {
		return Reply{}, scaffold.ErrNotImplemented
	}

	dbThreadID, err := parseThreadIdentifier(threadID)
	if err != nil {
		return Reply{}, err
	}

	authorID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return Reply{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return Reply{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var nextFloor int
	if err := tx.QueryRowContext(
		ctx,
		`select coalesce(max(floor_no), 0) + 1
		 from forum_posts
		 where thread_id = $1`,
		dbThreadID,
	).Scan(&nextFloor); err != nil {
		return Reply{}, err
	}

	var replyID int64
	if err := tx.QueryRowContext(
		ctx,
		`insert into forum_posts (
			thread_id,
			author_id,
			floor_no,
			content_md,
			is_anonymous,
			status
		) values ($1, $2, $3, $4, $5, 'visible')
		returning id`,
		dbThreadID,
		authorID,
		nextFloor,
		input.Content,
		input.Anonymous,
	).Scan(&replyID); err != nil {
		return Reply{}, err
	}

	if input.Anonymous {
		if err := ensureAnonymousIdentity(ctx, tx, dbThreadID, authorID); err != nil {
			return Reply{}, err
		}
	}

	if _, err := tx.ExecContext(
		ctx,
		`update forum_threads
		 set reply_count = reply_count + 1,
		     last_post_at = now()
		 where id = $1`,
		dbThreadID,
	); err != nil {
		return Reply{}, err
	}

	if err := tx.Commit(); err != nil {
		return Reply{}, err
	}

	author := principal.Username
	if input.Anonymous {
		author = "匿名旅人"
	}

	return Reply{
		ID:        strconv.FormatInt(replyID, 10),
		ThreadID:  strconv.FormatInt(dbThreadID, 10),
		Content:   input.Content,
		Author:    author,
		Anonymous: input.Anonymous,
	}, nil
}

func (r *repository) DeleteThread(ctx context.Context, principal security.Principal, threadID string) (DeleteThreadResult, error) {
	if !r.hasDatabase() {
		return DeleteThreadResult{
			ThreadID: threadID,
			Status:   "deleted",
		}, nil
	}

	dbThreadID, err := parseThreadIdentifier(threadID)
	if err != nil {
		return DeleteThreadResult{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update forum_threads
		 set status = 'deleted',
		     deleted_at = now()
		 where id = $1`,
		dbThreadID,
	); err != nil {
		return DeleteThreadResult{}, err
	}

	return DeleteThreadResult{
		ThreadID: strconv.FormatInt(dbThreadID, 10),
		Status:   "deleted",
	}, nil
}

func (r *repository) DeleteReply(ctx context.Context, principal security.Principal, threadID, replyID string) (DeleteReplyResult, error) {
	if !r.hasDatabase() {
		return DeleteReplyResult{
			ThreadID: threadID,
			ReplyID:  replyID,
			Status:   "deleted",
		}, nil
	}

	dbThreadID, err := parseThreadIdentifier(threadID)
	if err != nil {
		return DeleteReplyResult{}, err
	}

	dbReplyID, err := parseThreadIdentifier(replyID)
	if err != nil {
		return DeleteReplyResult{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return DeleteReplyResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(
		ctx,
		`update forum_posts
		 set status = 'deleted',
		     deleted_at = now()
		 where id = $1 and thread_id = $2`,
		dbReplyID,
		dbThreadID,
	); err != nil {
		return DeleteReplyResult{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`update forum_threads
		 set reply_count = greatest(reply_count - 1, 0),
		     last_post_at = now()
		 where id = $1`,
		dbThreadID,
	); err != nil {
		return DeleteReplyResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return DeleteReplyResult{}, err
	}

	return DeleteReplyResult{
		ThreadID: strconv.FormatInt(dbThreadID, 10),
		ReplyID:  strconv.FormatInt(dbReplyID, 10),
		Status:   "deleted",
	}, nil
}

func (r *repository) hasDatabase() bool {
	return r.platform != nil && r.platform.Postgres != nil && r.platform.Postgres.Available()
}

type threadScanner interface {
	Scan(dest ...any) error
}

func scanThreadRow(scanner threadScanner) (Thread, error) {
	var (
		id         int64
		title      string
		content    string
		board      string
		anonymous  bool
		author     string
		replyCount int
		tagsRaw    string
	)

	if err := scanner.Scan(&id, &title, &content, &board, &anonymous, &author, &replyCount, &tagsRaw); err != nil {
		return Thread{}, err
	}

	return Thread{
		ID:         strconv.FormatInt(id, 10),
		Title:      title,
		Content:    content,
		Board:      board,
		Anonymous:  anonymous,
		Author:     author,
		Tags:       splitAggregatedTags(tagsRaw),
		ReplyCount: replyCount,
	}, nil
}

func scanReplyRow(scanner threadScanner) (Reply, error) {
	var (
		id        int64
		threadID  int64
		content   string
		author    string
		anonymous bool
	)

	if err := scanner.Scan(&id, &threadID, &content, &author, &anonymous); err != nil {
		return Reply{}, err
	}

	return Reply{
		ID:        strconv.FormatInt(id, 10),
		ThreadID:  strconv.FormatInt(threadID, 10),
		Content:   content,
		Author:    author,
		Anonymous: anonymous,
	}, nil
}

func ensureBoard(ctx context.Context, tx *sql.Tx, rawBoard string, createdBy int64) (int64, string, error) {
	boardName := strings.TrimSpace(rawBoard)
	if boardName == "" {
		boardName = "站内讨论"
	}

	slug := platformdb.Slugify(boardName)

	if _, err := tx.ExecContext(
		ctx,
		`insert into forum_boards (
			name,
			slug,
			description,
			board_mode,
			read_visibility,
			write_visibility,
			sort_order,
			is_active,
			created_by
		) values ($1, $2, $3, 'normal', 'public', 'members', 0, true, $4)
		on conflict do nothing`,
		boardName,
		slug,
		fmt.Sprintf("%s 相关讨论分区。", boardName),
		createdBy,
	); err != nil {
		return 0, "", err
	}

	var boardID int64
	if err := tx.QueryRowContext(
		ctx,
		`select id, name
		 from forum_boards
		 where lower(slug) = lower($1)
		 limit 1`,
		slug,
	).Scan(&boardID, &boardName); err != nil {
		return 0, "", err
	}

	return boardID, boardName, nil
}

func ensureAnonymousIdentity(ctx context.Context, tx *sql.Tx, threadID, userID int64) error {
	aliasCode := fmt.Sprintf("anon-%d", userID)
	aliasName := fmt.Sprintf("匿名旅人 %02d", (userID%97)+1)

	_, err := tx.ExecContext(
		ctx,
		`insert into forum_anonymous_identities (thread_id, user_id, alias_code, alias_name)
		 values ($1, $2, $3, $4)
		 on conflict do nothing`,
		threadID,
		userID,
		aliasCode,
		aliasName,
	)
	return err
}

func syncThreadTags(ctx context.Context, tx *sql.Tx, threadID int64, tags []string) error {
	if _, err := tx.ExecContext(ctx, `delete from forum_thread_tag_relations where thread_id = $1`, threadID); err != nil {
		return err
	}

	for _, tag := range cleanedTags(tags) {
		slug := platformdb.Slugify(tag)

		if _, err := tx.ExecContext(
			ctx,
			`insert into forum_tags (name, slug)
			 values ($1, $2)
			 on conflict do nothing`,
			tag,
			slug,
		); err != nil {
			return err
		}

		var tagID int64
		if err := tx.QueryRowContext(
			ctx,
			`select id
			 from forum_tags
			 where lower(name) = lower($1)
			 limit 1`,
			tag,
		).Scan(&tagID); err != nil {
			return err
		}

		if _, err := tx.ExecContext(
			ctx,
			`insert into forum_thread_tag_relations (thread_id, tag_id)
			 values ($1, $2)
			 on conflict do nothing`,
			threadID,
			tagID,
		); err != nil {
			return err
		}
	}

	return nil
}

func cleanedTags(tags []string) []string {
	seen := make(map[string]struct{}, len(tags))
	cleaned := make([]string, 0, len(tags))

	for _, raw := range tags {
		tag := strings.TrimSpace(raw)
		if tag == "" {
			continue
		}

		key := strings.ToLower(tag)
		if _, exists := seen[key]; exists {
			continue
		}

		seen[key] = struct{}{}
		cleaned = append(cleaned, tag)
	}

	return cleaned
}

func splitAggregatedTags(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []string{}
	}

	parts := strings.Split(raw, "\n")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}

		result = append(result, trimmed)
	}

	return result
}

func parseThreadIdentifier(value string) (int64, error) {
	threadID, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("unsupported thread identifier %q", value)
	}

	return threadID, nil
}

func scaffoldThreads() []Thread {
	return []Thread{
		{
			ID:         "thread-001",
			Title:      "欢迎来到论坛讨论版",
			Content:    "This is the scaffolded discussion board thread.",
			Board:      "general",
			Anonymous:  false,
			Author:     "rubedo-member",
			Tags:       []string{"welcome"},
			ReplyCount: 1,
		},
	}
}

func scaffoldThreadDetail(threadID string) ThreadDetail {
	return ThreadDetail{
		Thread: Thread{
			ID:         threadID,
			Title:      "Scaffolded forum thread detail",
			Content:    "Forum thread detail will later be backed by PostgreSQL.",
			Board:      "general",
			Author:     "rubedo-member",
			ReplyCount: 1,
		},
		Replies: []Reply{
			{
				ID:       "reply-001",
				ThreadID: threadID,
				Content:  "First scaffolded reply.",
				Author:   "member-002",
			},
		},
	}
}
