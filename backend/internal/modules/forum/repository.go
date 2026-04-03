package forum

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/platform"
	platformdb "example.com/rubedo/backend/internal/platform/database"
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
)

const (
	anonymousBoardSlug       = "anonymous"
	anonymousBoardName       = "匿名板"
	anonymousTripcodeSecret  = "shiokou"
	anonymousThreadHardLimit = 1000
	anonymousBoardThreadCap  = 100
	signInExpDelta           = 5
	postThreadExpDelta       = 10
	replyExpDelta            = 3
)

type Repository interface {
	ListThreads(ctx context.Context, params pagination.Params) (pagination.Result[Thread], error)
	ListAnonymousThreads(ctx context.Context, params pagination.Params) (pagination.Result[Thread], error)
	GetThread(ctx context.Context, threadID string) (ThreadDetail, error)
	GetAnonymousThread(ctx context.Context, threadID string) (ThreadDetail, error)
	GetProgress(ctx context.Context, principal security.Principal) (Progress, error)
	SignIn(ctx context.Context, principal security.Principal) (SignInResult, error)
	CreateThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error)
	CreateAnonymousThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error)
	CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error)
	CreateAnonymousReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error)
	DeleteThread(ctx context.Context, principal security.Principal, threadID string) (DeleteThreadResult, error)
	DeleteReply(ctx context.Context, principal security.Principal, threadID, replyID string) (DeleteReplyResult, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListThreads(ctx context.Context, params pagination.Params) (pagination.Result[Thread], error) {
	if !r.hasDatabase() {
		return pagination.Result[Thread]{}, fmt.Errorf("postgres unavailable for forum thread listing")
	}

	return r.listThreadsByMode(ctx, params, "normal")
}

func (r *repository) ListAnonymousThreads(ctx context.Context, params pagination.Params) (pagination.Result[Thread], error) {
	if !r.hasDatabase() {
		return pagination.NewResult(scaffoldAnonymousThreads(), len(scaffoldAnonymousThreads()), params), nil
	}

	return r.listThreadsByMode(ctx, params, "anonymous")
}

func (r *repository) listThreadsByMode(ctx context.Context, params pagination.Params, mode string) (pagination.Result[Thread], error) {
	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from forum_threads ft
		 join forum_boards fb on fb.id = ft.board_id
		 where ft.deleted_at is null
		   and ft.status in ('active', 'locked')
		   and fb.board_mode = $1`,
		mode,
	).Scan(&total); err != nil {
		return pagination.Result[Thread]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			ft.id,
			ft.title,
			ft.content_md,
			fb.name,
			ft.is_anonymous,
			(ft.status = 'locked') as is_locked,
			case
				when fb.board_mode = 'anonymous' then '匿名旅人'
				when ft.is_anonymous then coalesce(fai.alias_name, '匿名旅人')
				else coalesce(nullif(u.nickname, ''), u.username)
			end as author_name,
			case
				when fb.board_mode = 'anonymous' then '◆' || substr(md5($3 || ':' || lower(u.username)), 1, 10)
				else ''
			end as tripcode,
			ft.reply_count,
			coalesce(string_agg(distinct tg.name, E'\n') filter (where tg.name is not null), '') as tags,
			ft.view_count,
			ft.is_pinned,
			ft.last_post_at,
			ft.created_at
		from forum_threads ft
		join forum_boards fb on fb.id = ft.board_id
		join users u on u.id = ft.author_id
		left join forum_anonymous_identities fai on fai.thread_id = ft.id and fai.user_id = ft.author_id
		left join forum_thread_tag_relations fttr on fttr.thread_id = ft.id
		left join forum_tags tg on tg.id = fttr.tag_id
		where ft.deleted_at is null
		  and ft.status in ('active', 'locked')
		  and fb.board_mode = $1
		group by ft.id, fb.name, fb.board_mode, fai.alias_name, u.nickname, u.username
		order by ft.is_pinned desc, ft.last_post_at desc, ft.id desc
		limit $2 offset $4`,
		mode,
		params.PageSize,
		anonymousTripcodeSecret,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[Thread]{}, err
	}
	defer rows.Close()

	var threads []Thread
	for rows.Next() {
		thread, err := scanThreadRow(rows)
		if err != nil {
			return pagination.Result[Thread]{}, err
		}

		threads = append(threads, thread)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[Thread]{}, err
	}

	return pagination.NewResult(threads, total, params), nil
}

func (r *repository) GetThread(ctx context.Context, threadID string) (ThreadDetail, error) {
	if !r.hasDatabase() {
		return ThreadDetail{}, fmt.Errorf("postgres unavailable for forum thread detail")
	}

	return r.getThreadByMode(ctx, threadID, "")
}

func (r *repository) GetAnonymousThread(ctx context.Context, threadID string) (ThreadDetail, error) {
	if !r.hasDatabase() {
		return scaffoldAnonymousThreadDetail(threadID), nil
	}

	return r.getThreadByMode(ctx, threadID, "anonymous")
}

func (r *repository) GetProgress(ctx context.Context, principal security.Principal) (Progress, error) {
	if !r.hasDatabase() {
		return scaffoldProgress(principal.Username), nil
	}

	userID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return Progress{}, err
	}

	return r.loadProgress(ctx, r.platform.Postgres, userID)
}

func (r *repository) SignIn(ctx context.Context, principal security.Principal) (SignInResult, error) {
	if !r.hasDatabase() {
		progress := scaffoldProgress(principal.Username)
		progress.Summary.SignedInToday = true
		return SignInResult{
			Status:   "signed_in",
			ExpDelta: signInExpDelta,
			Progress: progress,
			Message:  "签到成功。",
		}, nil
	}

	userID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return SignInResult{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return SignInResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	progressBefore, err := r.loadProgress(ctx, tx, userID)
	if err != nil {
		return SignInResult{}, err
	}
	if progressBefore.Summary.SignedInToday {
		if err := tx.Commit(); err != nil {
			return SignInResult{}, err
		}
		return SignInResult{
			Status:   "already_signed_in",
			ExpDelta: 0,
			Progress: progressBefore,
			Message:  "今天已经签到过了。",
		}, nil
	}

	if _, err := awardForumExp(ctx, tx, userID, "SIGN_IN", signInExpDelta, sql.NullInt64{}); err != nil {
		return SignInResult{}, err
	}

	progressAfter, err := r.loadProgress(ctx, tx, userID)
	if err != nil {
		return SignInResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return SignInResult{}, err
	}

	return SignInResult{
		Status:   "signed_in",
		ExpDelta: signInExpDelta,
		Progress: progressAfter,
		Message:  "签到成功。",
	}, nil
}

func (r *repository) getThreadByMode(ctx context.Context, threadID string, mode string) (ThreadDetail, error) {
	dbThreadID, err := parseThreadIdentifier(threadID)
	if err != nil {
		return ThreadDetail{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update forum_threads
		 set view_count = view_count + 1
		 where id = $1
		   and deleted_at is null
		   and status in ('active', 'locked')`,
		dbThreadID,
	); err != nil {
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
			(ft.status = 'locked') as is_locked,
			case
				when fb.board_mode = 'anonymous' then '匿名旅人'
				when ft.is_anonymous then coalesce(fai.alias_name, '匿名旅人')
				else coalesce(nullif(u.nickname, ''), u.username)
			end as author_name,
			case
				when fb.board_mode = 'anonymous' then '◆' || substr(md5($2 || ':' || lower(u.username)), 1, 10)
				else ''
			end as tripcode,
			ft.reply_count,
			coalesce(string_agg(distinct tg.name, E'\n') filter (where tg.name is not null), '') as tags,
			ft.view_count,
			ft.is_pinned,
			ft.last_post_at,
			ft.created_at
		from forum_threads ft
		join forum_boards fb on fb.id = ft.board_id
		join users u on u.id = ft.author_id
		left join forum_anonymous_identities fai on fai.thread_id = ft.id and fai.user_id = ft.author_id
		left join forum_thread_tag_relations fttr on fttr.thread_id = ft.id
		left join forum_tags tg on tg.id = fttr.tag_id
		where ft.id = $1
		  and ft.deleted_at is null
		  and ft.status in ('active', 'locked')
		  and ($3 = '' or fb.board_mode::text = $3)
		group by ft.id, fb.name, fb.board_mode, fai.alias_name, u.nickname, u.username`,
		dbThreadID,
		anonymousTripcodeSecret,
		mode,
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
			fp.parent_id,
			fp.floor_no,
			coalesce(parent.floor_no, 0) as parent_floor_no,
			case
				when fp.reply_to_user_id is null then ''
				when fb.board_mode = 'anonymous' then '匿名旅人'
				else coalesce(reply_to_alias.alias_name, nullif(reply_to_user.nickname, ''), reply_to_user.username, '')
			end as reply_to_author,
			fp.content_md,
			case
				when fb.board_mode = 'anonymous' then '匿名旅人'
				when fp.is_anonymous then coalesce(fai.alias_name, '匿名旅人')
				else coalesce(nullif(u.nickname, ''), u.username)
			end as author_name,
			case
				when fb.board_mode = 'anonymous' then '◆' || substr(md5($2 || ':' || lower(u.username)), 1, 10)
				else ''
			end as tripcode,
			fp.is_anonymous,
			fp.created_at
		from forum_posts fp
		join forum_threads ft on ft.id = fp.thread_id
		join forum_boards fb on fb.id = ft.board_id
		join users u on u.id = fp.author_id
		left join forum_anonymous_identities fai on fai.thread_id = fp.thread_id and fai.user_id = fp.author_id
		left join forum_posts parent on parent.id = fp.parent_id
		left join users reply_to_user on reply_to_user.id = fp.reply_to_user_id
		left join forum_anonymous_identities reply_to_alias
			on reply_to_alias.thread_id = fp.thread_id
		   and reply_to_alias.user_id = fp.reply_to_user_id
		where fp.thread_id = $1
		  and fp.deleted_at is null
		  and fp.status = 'visible'
		  and ($3 = '' or fb.board_mode::text = $3)
		order by fp.floor_no asc`,
		dbThreadID,
		anonymousTripcodeSecret,
		mode,
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

	return r.createThreadForBoard(ctx, principal, input, false)
}

func (r *repository) CreateAnonymousThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error) {
	if !r.hasDatabase() {
		thread := scaffoldAnonymousThreads()[0]
		thread.ID = "anon-new"
		thread.Title = input.Title
		thread.Content = input.Content
		thread.Tags = cleanedTags(input.Tags)
		return thread, nil
	}

	return r.createThreadForBoard(ctx, principal, input, true)
}

func (r *repository) createThreadForBoard(ctx context.Context, principal security.Principal, input CreateThreadRequest, anonymousBoard bool) (Thread, error) {
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

	boardID, boardName, boardMode, err := ensureBoard(ctx, tx, input.Board, authorID, anonymousBoard)
	if err != nil {
		return Thread{}, err
	}

	var (
		threadID   int64
		lastPostAt sql.NullTime
		createdAt  sql.NullTime
	)
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
		returning id, last_post_at, created_at`,
		boardID,
		authorID,
		input.Title,
		input.Content,
		input.Anonymous || anonymousBoard,
	).Scan(&threadID, &lastPostAt, &createdAt); err != nil {
		return Thread{}, err
	}

	if input.Anonymous || anonymousBoard {
		if err := ensureAnonymousIdentity(ctx, tx, threadID, authorID); err != nil {
			return Thread{}, err
		}
	}

	if anonymousBoard {
		if err := archiveOverflowAnonymousThreads(ctx, tx, boardID); err != nil {
			return Thread{}, err
		}
	}

	if err := syncThreadTags(ctx, tx, threadID, input.Tags); err != nil {
		return Thread{}, err
	}

	if _, err := awardForumExp(
		ctx,
		tx,
		authorID,
		"POST_THREAD",
		postThreadExpDelta,
		sql.NullInt64{Int64: threadID, Valid: true},
	); err != nil {
		return Thread{}, err
	}

	if err := tx.Commit(); err != nil {
		return Thread{}, err
	}

	author := principal.Username
	tripcode := ""
	if input.Anonymous || anonymousBoard {
		author = "匿名旅人"
		tripcode = tripcodeDisplay(boardMode == "anonymous", principal.Username)
	}

	return Thread{
		ID:         strconv.FormatInt(threadID, 10),
		Title:      input.Title,
		Content:    input.Content,
		Board:      boardName,
		Anonymous:  input.Anonymous || anonymousBoard,
		Author:     author,
		Tripcode:   tripcode,
		Locked:     false,
		Tags:       cleanedTags(input.Tags),
		ReplyCount: 0,
		ViewCount:  0,
		IsPinned:   false,
		LastPostAt: lastPostAt.Time,
		CreatedAt:  createdAt.Time,
	}, nil
}

func (r *repository) CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error) {
	if !r.hasDatabase() {
		return Reply{}, scaffold.ErrNotImplemented
	}

	return r.createReplyForThread(ctx, principal, threadID, input, false)
}

func (r *repository) CreateAnonymousReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error) {
	if !r.hasDatabase() {
		reply := scaffoldAnonymousThreadDetail(threadID).Replies[0]
		reply.ID = "anon-reply-new"
		reply.Content = input.Content
		return reply, nil
	}

	return r.createReplyForThread(ctx, principal, threadID, input, true)
}

func (r *repository) createReplyForThread(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest, requireAnonymousBoard bool) (Reply, error) {
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

	var (
		nextFloor    int
		threadStatus string
		boardMode    string
	)
	if err := tx.QueryRowContext(
		ctx,
		`select coalesce(max(fp.floor_no), 0) + 1, ft.status::text, fb.board_mode::text
		 from forum_threads ft
		 join forum_boards fb on fb.id = ft.board_id
		 left join forum_posts fp on fp.thread_id = ft.id and fp.deleted_at is null
		 where ft.id = $1
		 group by ft.id, fb.board_mode`,
		dbThreadID,
	).Scan(&nextFloor, &threadStatus, &boardMode); err != nil {
		return Reply{}, err
	}

	if requireAnonymousBoard && boardMode != "anonymous" {
		return Reply{}, fmt.Errorf("thread %s is not in anonymous board", threadID)
	}
	if threadStatus == "locked" {
		return Reply{}, fmt.Errorf("thread %s is locked", threadID)
	}
	if boardMode == "anonymous" && nextFloor > anonymousThreadHardLimit {
		return Reply{}, fmt.Errorf("thread %s reached 1000 replies", threadID)
	}

	var (
		parentReplyID sql.NullInt64
		replyToUserID sql.NullInt64
		parentFloorNo int
		replyToAuthor string
		replyID       int64
		createdAt     sql.NullTime
	)
	if parentID := strings.TrimSpace(input.ParentID); parentID != "" {
		dbParentID, err := parseThreadIdentifier(parentID)
		if err != nil {
			return Reply{}, err
		}

		var parentAuthorID int64
		if err := tx.QueryRowContext(
			ctx,
			`select
				fp.author_id,
				fp.floor_no,
				case
					when fb.board_mode = 'anonymous' then '匿名旅人'
					when fp.is_anonymous then coalesce(fai.alias_name, '匿名旅人')
					else coalesce(nullif(u.nickname, ''), u.username)
				end as author_name
			 from forum_posts fp
			 join forum_threads ft on ft.id = fp.thread_id
			 join forum_boards fb on fb.id = ft.board_id
			 join users u on u.id = fp.author_id
			 left join forum_anonymous_identities fai on fai.thread_id = fp.thread_id and fai.user_id = fp.author_id
			 where fp.id = $1
			   and fp.thread_id = $2
			   and fp.deleted_at is null
			   and fp.status = 'visible'`,
			dbParentID,
			dbThreadID,
		).Scan(&parentAuthorID, &parentFloorNo, &replyToAuthor); err != nil {
			if err == sql.ErrNoRows {
				return Reply{}, fmt.Errorf("parent reply %s not found", parentID)
			}
			return Reply{}, err
		}

		parentReplyID = sql.NullInt64{Int64: dbParentID, Valid: true}
		replyToUserID = sql.NullInt64{Int64: parentAuthorID, Valid: true}
	}

	if err := tx.QueryRowContext(
		ctx,
		`insert into forum_posts (
			thread_id,
			author_id,
			parent_id,
			reply_to_user_id,
			floor_no,
			content_md,
			is_anonymous,
			status
		) values ($1, $2, $3, $4, $5, $6, $7, 'visible')
		returning id, created_at`,
		dbThreadID,
		authorID,
		parentReplyID,
		replyToUserID,
		nextFloor,
		input.Content,
		input.Anonymous || boardMode == "anonymous",
	).Scan(&replyID, &createdAt); err != nil {
		return Reply{}, err
	}

	if input.Anonymous || boardMode == "anonymous" {
		if err := ensureAnonymousIdentity(ctx, tx, dbThreadID, authorID); err != nil {
			return Reply{}, err
		}
	}

	updateQuery := `update forum_threads
		set reply_count = reply_count + 1`
	if !(boardMode == "anonymous" && input.Sage) {
		updateQuery += `, last_post_at = now()`
	}
	if boardMode == "anonymous" && nextFloor >= anonymousThreadHardLimit {
		updateQuery += `, status = 'locked'`
	}
	updateQuery += ` where id = $1`

	if _, err := tx.ExecContext(ctx, updateQuery, dbThreadID); err != nil {
		return Reply{}, err
	}

	if _, err := awardForumExp(
		ctx,
		tx,
		authorID,
		"REPLY",
		replyExpDelta,
		sql.NullInt64{Int64: replyID, Valid: true},
	); err != nil {
		return Reply{}, err
	}

	if err := tx.Commit(); err != nil {
		return Reply{}, err
	}

	author := principal.Username
	tripcode := ""
	if input.Anonymous || boardMode == "anonymous" {
		author = "匿名旅人"
		tripcode = tripcodeDisplay(boardMode == "anonymous", principal.Username)
	}

	return Reply{
		ID:            strconv.FormatInt(replyID, 10),
		ThreadID:      strconv.FormatInt(dbThreadID, 10),
		ParentID:      nullableID(parentReplyID),
		FloorNo:       nextFloor,
		ParentFloorNo: parentFloorNo,
		ReplyToAuthor: replyToAuthor,
		Content:       input.Content,
		Author:        author,
		Tripcode:      tripcode,
		Anonymous:     input.Anonymous || boardMode == "anonymous",
		CreatedAt:     createdAt.Time,
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
		locked     bool
		author     string
		tripcode   string
		replyCount int
		tagsRaw    string
		viewCount  int64
		isPinned   bool
		lastPostAt sql.NullTime
		createdAt  sql.NullTime
	)

	if err := scanner.Scan(
		&id,
		&title,
		&content,
		&board,
		&anonymous,
		&locked,
		&author,
		&tripcode,
		&replyCount,
		&tagsRaw,
		&viewCount,
		&isPinned,
		&lastPostAt,
		&createdAt,
	); err != nil {
		return Thread{}, err
	}

	return Thread{
		ID:         strconv.FormatInt(id, 10),
		Title:      title,
		Content:    content,
		Board:      board,
		Anonymous:  anonymous,
		Locked:     locked,
		Author:     author,
		Tripcode:   tripcode,
		Tags:       splitAggregatedTags(tagsRaw),
		ReplyCount: replyCount,
		ViewCount:  viewCount,
		IsPinned:   isPinned,
		LastPostAt: lastPostAt.Time,
		CreatedAt:  createdAt.Time,
	}, nil
}

func scanReplyRow(scanner threadScanner) (Reply, error) {
	var (
		id            int64
		threadID      int64
		parentID      sql.NullInt64
		floorNo       int
		parentFloorNo int
		replyToAuthor string
		content       string
		author        string
		tripcode      string
		anonymous     bool
		createdAt     sql.NullTime
	)

	if err := scanner.Scan(
		&id,
		&threadID,
		&parentID,
		&floorNo,
		&parentFloorNo,
		&replyToAuthor,
		&content,
		&author,
		&tripcode,
		&anonymous,
		&createdAt,
	); err != nil {
		return Reply{}, err
	}

	return Reply{
		ID:            strconv.FormatInt(id, 10),
		ThreadID:      strconv.FormatInt(threadID, 10),
		ParentID:      nullableID(parentID),
		FloorNo:       floorNo,
		ParentFloorNo: parentFloorNo,
		ReplyToAuthor: strings.TrimSpace(replyToAuthor),
		Content:       content,
		Author:        author,
		Tripcode:      tripcode,
		Anonymous:     anonymous,
		CreatedAt:     createdAt.Time,
	}, nil
}

func ensureBoard(ctx context.Context, tx *sql.Tx, rawBoard string, createdBy int64, anonymousBoard bool) (int64, string, string, error) {
	boardName := strings.TrimSpace(rawBoard)
	if boardName == "" {
		boardName = "站内讨论"
	}
	boardMode := "normal"
	if anonymousBoard {
		boardName = anonymousBoardName
		boardMode = "anonymous"
	}

	slug := platformdb.Slugify(boardName)
	if anonymousBoard {
		slug = anonymousBoardSlug
	}

	var existingBoardID int64
	var existingBoardName string
	var existingBoardMode string
	err := tx.QueryRowContext(
		ctx,
		`select id, name, board_mode::text
		 from forum_boards
		 where lower(name) = lower($1)
		    or lower(slug) = lower($2)
		 limit 1`,
		boardName,
		slug,
	).Scan(&existingBoardID, &existingBoardName, &existingBoardMode)
	if err == nil {
		return existingBoardID, existingBoardName, existingBoardMode, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return 0, "", "", err
	}

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
		) values ($1, $2, $3, $4, 'public', 'members', 0, true, $5)
		on conflict do nothing`,
		boardName,
		slug,
		fmt.Sprintf("%s 相关讨论分区。", boardName),
		boardMode,
		createdBy,
	); err != nil {
		return 0, "", "", err
	}

	var boardID int64
	if err := tx.QueryRowContext(
		ctx,
		`select id, name, board_mode::text
		 from forum_boards
		 where lower(name) = lower($1)
		    or lower(slug) = lower($2)
		 limit 1`,
		boardName,
		slug,
	).Scan(&boardID, &boardName, &boardMode); err != nil {
		return 0, "", "", err
	}

	return boardID, boardName, boardMode, nil
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

func tripcodeDisplay(enabled bool, username string) string {
	if !enabled || strings.TrimSpace(username) == "" {
		return ""
	}

	sum := md5.Sum([]byte(anonymousTripcodeSecret + ":" + strings.ToLower(strings.TrimSpace(username))))
	encoded := fmt.Sprintf("%x", sum)
	if len(encoded) > 10 {
		encoded = encoded[:10]
	}

	return "◆" + encoded
}

func archiveOverflowAnonymousThreads(ctx context.Context, tx *sql.Tx, boardID int64) error {
	_, err := tx.ExecContext(
		ctx,
		`update forum_threads
		 set status = 'hidden',
		     updated_at = now()
		 where id in (
		     select id
		     from forum_threads
		     where board_id = $1
		       and deleted_at is null
		       and status in ('active', 'locked')
		     order by is_pinned desc, last_post_at desc, id desc
		     offset $2
		 )`,
		boardID,
		anonymousBoardThreadCap,
	)
	return err
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
			Locked:     false,
			Tags:       []string{"welcome"},
			ReplyCount: 1,
		},
	}
}

func scaffoldAnonymousThreads() []Thread {
	return []Thread{
		{
			ID:         "anon-thread-001",
			Title:      "匿名板：今天想聊哪部作品？",
			Content:    "匿名板会展示 bump / sage 逻辑与楼层式回复。",
			Board:      anonymousBoardName,
			Anonymous:  true,
			Author:     "匿名旅人",
			Tripcode:   tripcodeDisplay(true, "scaffold"),
			Locked:     false,
			Tags:       []string{"匿名", "试运行"},
			ReplyCount: 2,
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
			Locked:     false,
			ReplyCount: 1,
		},
		Replies: []Reply{
			{
				ID:       "reply-001",
				ThreadID: threadID,
				FloorNo:  1,
				Content:  "First scaffolded reply.",
				Author:   "member-002",
			},
		},
	}
}

func scaffoldAnonymousThreadDetail(threadID string) ThreadDetail {
	thread := scaffoldAnonymousThreads()[0]
	thread.ID = threadID
	return ThreadDetail{
		Thread: thread,
		Replies: []Reply{
			{
				ID:        "anon-reply-001",
				ThreadID:  threadID,
				FloorNo:   1,
				Content:   "匿名板第一条回复。",
				Author:    "匿名旅人",
				Tripcode:  tripcodeDisplay(true, "reply-a"),
				Anonymous: true,
			},
			{
				ID:            "anon-reply-002",
				ThreadID:      threadID,
				ParentID:      "anon-reply-001",
				FloorNo:       2,
				ParentFloorNo: 1,
				ReplyToAuthor: "匿名旅人",
				Content:       "这是一条楼中楼回复。",
				Author:        "匿名旅人",
				Tripcode:      tripcodeDisplay(true, "reply-b"),
				Anonymous:     true,
			},
		},
	}
}

func nullableID(value sql.NullInt64) string {
	if !value.Valid {
		return ""
	}
	return strconv.FormatInt(value.Int64, 10)
}

type progressQueryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

func (r *repository) loadProgress(ctx context.Context, db progressQueryer, userID int64) (Progress, error) {
	if _, err := db.ExecContext(
		ctx,
		`insert into forum_user_levels (user_id, current_level, total_exp)
		 values ($1, 1, 0)
		 on conflict (user_id) do nothing`,
		userID,
	); err != nil {
		return Progress{}, err
	}

	summary, err := loadLevelSummary(ctx, db, userID)
	if err != nil {
		return Progress{}, err
	}

	levelRows, err := db.QueryContext(
		ctx,
		`select level, min_exp, coalesce(title_name, ''), coalesce(privileges::text, '{}')
		 from forum_level_configs
		 order by level asc`,
	)
	if err != nil {
		return Progress{}, err
	}
	defer levelRows.Close()

	levels := make([]LevelConfig, 0)
	for levelRows.Next() {
		var (
			config         LevelConfig
			privilegesJSON string
		)
		if err := levelRows.Scan(&config.Level, &config.MinExp, &config.TitleName, &privilegesJSON); err != nil {
			return Progress{}, err
		}
		if strings.TrimSpace(privilegesJSON) != "" && privilegesJSON != "{}" {
			var privileges map[string]any
			if err := json.Unmarshal([]byte(privilegesJSON), &privileges); err == nil && len(privileges) > 0 {
				config.Privileges = privileges
			}
		}
		levels = append(levels, config)
	}
	if err := levelRows.Err(); err != nil {
		return Progress{}, err
	}

	logRows, err := db.QueryContext(
		ctx,
		`select log_id, action_type, exp_delta, target_id, action_date, created_at
		 from forum_exp_action_logs
		 where user_id = $1
		 order by created_at desc, log_id desc
		 limit 12`,
		userID,
	)
	if err != nil {
		return Progress{}, err
	}
	defer logRows.Close()

	recentLogs := make([]ExpActionLog, 0)
	for logRows.Next() {
		var (
			logEntry   ExpActionLog
			logID      int64
			targetID   sql.NullInt64
			actionDate time.Time
		)
		if err := logRows.Scan(&logID, &logEntry.ActionType, &logEntry.ExpDelta, &targetID, &actionDate, &logEntry.CreatedAt); err != nil {
			return Progress{}, err
		}
		logEntry.LogID = strconv.FormatInt(logID, 10)
		logEntry.TargetID = nullableID(targetID)
		logEntry.ActionDate = actionDate.Format("2006-01-02")
		recentLogs = append(recentLogs, logEntry)
	}
	if err := logRows.Err(); err != nil {
		return Progress{}, err
	}

	return Progress{
		Summary:    summary,
		Levels:     levels,
		RecentLogs: recentLogs,
	}, nil
}

func loadLevelSummary(ctx context.Context, db progressQueryer, userID int64) (LevelSummary, error) {
	var (
		summary      LevelSummary
		titleName    string
		lastSignInAt sql.NullTime
	)

	if err := db.QueryRowContext(
		ctx,
		`with current_level as (
		     select ful.user_id, ful.current_level, ful.total_exp, coalesce(cfg.title_name, '') as title_name
		     from forum_user_levels ful
		     left join forum_level_configs cfg on cfg.level = ful.current_level
		     where ful.user_id = $1
		 ),
		 next_level as (
		     select cfg.level, cfg.min_exp
		     from forum_level_configs cfg
		     join current_level cl on cfg.min_exp > cl.total_exp
		     order by cfg.level asc
		     limit 1
		 ),
		 signins as (
		     select
		         exists(
		             select 1
		             from forum_exp_action_logs log
		             where log.user_id = $1
		               and log.action_type = 'SIGN_IN'
		               and log.action_date = current_date
		         ) as signed_today,
		         (
		             select max(log.created_at)
		             from forum_exp_action_logs log
		             where log.user_id = $1
		               and log.action_type = 'SIGN_IN'
		         ) as last_sign_in_at
		 )
		 select
		     cl.current_level,
		     cl.total_exp,
		     cl.title_name,
		     coalesce(nl.level, cl.current_level),
		     coalesce(nl.min_exp, cl.total_exp),
		     greatest(coalesce(nl.min_exp, cl.total_exp) - cl.total_exp, 0),
		     signins.signed_today,
		     signins.last_sign_in_at
		 from current_level cl
		 cross join signins
		 left join next_level nl on true`,
		userID,
	).Scan(
		&summary.CurrentLevel,
		&summary.TotalExp,
		&titleName,
		&summary.NextLevel,
		&summary.NextLevelExp,
		&summary.ExpToNext,
		&summary.SignedInToday,
		&lastSignInAt,
	); err != nil {
		return LevelSummary{}, err
	}

	summary.TitleName = titleName
	if lastSignInAt.Valid {
		summary.LastSignInAt = &lastSignInAt.Time
	}

	return summary, nil
}

func awardForumExp(
	ctx context.Context,
	db progressQueryer,
	userID int64,
	actionType string,
	expDelta int,
	targetID sql.NullInt64,
) (LevelSummary, error) {
	if _, err := db.ExecContext(
		ctx,
		`insert into forum_user_levels (user_id, current_level, total_exp)
		 values ($1, 1, 0)
		 on conflict (user_id) do nothing`,
		userID,
	); err != nil {
		return LevelSummary{}, err
	}

	var totalExp int
	if err := db.QueryRowContext(
		ctx,
		`update forum_user_levels
		 set total_exp = total_exp + $2,
		     updated_at = now()
		 where user_id = $1
		 returning total_exp`,
		userID,
		expDelta,
	).Scan(&totalExp); err != nil {
		return LevelSummary{}, err
	}

	var nextLevel int
	if err := db.QueryRowContext(
		ctx,
		`select level
		 from forum_level_configs
		 where min_exp <= $1
		 order by level desc
		 limit 1`,
		totalExp,
	).Scan(&nextLevel); err != nil {
		return LevelSummary{}, err
	}

	if _, err := db.ExecContext(
		ctx,
		`update forum_user_levels
		 set current_level = $2,
		     updated_at = now()
		 where user_id = $1`,
		userID,
		nextLevel,
	); err != nil {
		return LevelSummary{}, err
	}

	if _, err := db.ExecContext(
		ctx,
		`insert into forum_exp_action_logs (user_id, action_type, exp_delta, target_id)
		 values ($1, $2, $3, $4)`,
		userID,
		actionType,
		expDelta,
		targetID,
	); err != nil {
		return LevelSummary{}, err
	}

	return loadLevelSummary(ctx, db, userID)
}

func scaffoldProgress(username string) Progress {
	levels := []LevelConfig{
		{Level: 1, MinExp: 0, TitleName: "初来乍到"},
		{Level: 2, MinExp: 15, TitleName: "常驻旅人"},
		{Level: 3, MinExp: 40, TitleName: "夜谈熟客"},
		{Level: 4, MinExp: 80, TitleName: "剧情考据组"},
		{Level: 5, MinExp: 140, TitleName: "长帖记录者"},
	}

	return Progress{
		Summary: LevelSummary{
			CurrentLevel:  2,
			TitleName:     "常驻旅人",
			TotalExp:      23,
			NextLevel:     3,
			NextLevelExp:  40,
			ExpToNext:     17,
			SignedInToday: false,
		},
		Levels: levels,
		RecentLogs: []ExpActionLog{
			{
				LogID:      "1",
				ActionType: "POST_THREAD",
				ExpDelta:   postThreadExpDelta,
				TargetID:   "101",
				ActionDate: "2026-04-04",
			},
			{
				LogID:      "2",
				ActionType: "REPLY",
				ExpDelta:   replyExpDelta,
				TargetID:   "102",
				ActionDate: "2026-04-04",
			},
			{
				LogID:      "3",
				ActionType: "SIGN_IN",
				ExpDelta:   signInExpDelta,
				ActionDate: "2026-04-03",
			},
		},
	}
}
