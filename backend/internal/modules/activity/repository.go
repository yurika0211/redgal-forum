package activity

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/platform"
	platformdb "example.com/rubedo/backend/internal/platform/database"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	ListRelays(ctx context.Context, params pagination.Params) (pagination.Result[RelayEvent], error)
	GetRelay(ctx context.Context, relayID string) (RelayDetail, error)
	CreateRelay(ctx context.Context, principal security.Principal, input CreateRelayRequest) (RelayEvent, error)
	UpdateRelayStatus(ctx context.Context, principal security.Principal, relayID string, input UpdateRelayStatusRequest) (RelayEvent, error)
	CreateRelayEntry(ctx context.Context, principal security.Principal, relayID string, input CreateRelayEntryRequest) (RelayEntry, error)
	ListWritingContests(ctx context.Context, params pagination.Params) (pagination.Result[WritingContest], error)
	GetWritingContest(ctx context.Context, contestID string) (WritingContestDetail, error)
	CreateWritingContest(ctx context.Context, principal security.Principal, input CreateWritingContestRequest) (WritingContest, error)
	UpdateWritingContestStatus(ctx context.Context, principal security.Principal, contestID string, input UpdateWritingContestStatusRequest) (WritingContest, error)
	CreateWritingSubmission(ctx context.Context, principal security.Principal, contestID string, input CreateWritingSubmissionRequest) (WritingSubmission, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListRelays(ctx context.Context, params pagination.Params) (pagination.Result[RelayEvent], error) {
	if !r.hasDatabase() {
		return pagination.Slice(scaffoldRelays(), params), nil
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from relay_events re
		 where re.deleted_at is null
		   and re.status <> 'deleted'`,
	).Scan(&total); err != nil {
		return pagination.Result[RelayEvent]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			re.id,
			re.title,
			coalesce(re.description, ''),
			coalesce(re.rules_md, ''),
			re.status::text,
			re.allow_unverified,
			coalesce(nullif(u.nickname, ''), u.username) as created_by,
			re.starts_at,
			re.ends_at,
			count(e.id)::int as entry_count
		from relay_events re
		join users u on u.id = re.created_by
		left join relay_entries e on e.relay_id = re.id and e.deleted_at is null and e.status = 'visible'
		where re.deleted_at is null
		  and re.status <> 'deleted'
		group by re.id, u.nickname, u.username
		order by re.created_at desc
		limit $1 offset $2`,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[RelayEvent]{}, err
	}
	defer rows.Close()

	var relays []RelayEvent
	for rows.Next() {
		event, err := scanRelayEvent(rows)
		if err != nil {
			return pagination.Result[RelayEvent]{}, err
		}
		relays = append(relays, event)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[RelayEvent]{}, err
	}

	return pagination.NewResult(relays, total, params), nil
}

func (r *repository) GetRelay(ctx context.Context, relayID string) (RelayDetail, error) {
	if !r.hasDatabase() {
		for _, relay := range scaffoldRelays() {
			if relay.ID == relayID {
				return RelayDetail{
					Event:   relay,
					Entries: scaffoldRelayEntries(relay.ID),
				}, nil
			}
		}
		return RelayDetail{}, fmt.Errorf("relay %s not found", relayID)
	}

	dbRelayID, err := parseNumericIdentifier(relayID)
	if err != nil {
		return RelayDetail{}, err
	}

	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			re.id,
			re.title,
			coalesce(re.description, ''),
			coalesce(re.rules_md, ''),
			re.status::text,
			re.allow_unverified,
			coalesce(nullif(u.nickname, ''), u.username) as created_by,
			re.starts_at,
			re.ends_at,
			(
				select count(*)::int
				from relay_entries e
				where e.relay_id = re.id and e.deleted_at is null and e.status = 'visible'
			) as entry_count
		from relay_events re
		join users u on u.id = re.created_by
		where re.id = $1 and re.deleted_at is null`,
		dbRelayID,
	)

	event, err := scanRelayEvent(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return RelayDetail{}, fmt.Errorf("relay %s not found", relayID)
		}
		return RelayDetail{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			e.id,
			e.relay_id,
			e.floor_no,
			e.content_md,
			coalesce(nullif(u.nickname, ''), u.username) as author_name,
			e.created_at
		from relay_entries e
		join users u on u.id = e.user_id
		where e.relay_id = $1
		  and e.deleted_at is null
		  and e.status = 'visible'
		order by e.floor_no asc, e.id asc`,
		dbRelayID,
	)
	if err != nil {
		return RelayDetail{}, err
	}
	defer rows.Close()

	var entries []RelayEntry
	for rows.Next() {
		entry, err := scanRelayEntry(rows)
		if err != nil {
			return RelayDetail{}, err
		}
		entries = append(entries, entry)
	}

	return RelayDetail{
		Event:   event,
		Entries: entries,
	}, rows.Err()
}

func (r *repository) CreateRelay(ctx context.Context, principal security.Principal, input CreateRelayRequest) (RelayEvent, error) {
	if !r.hasDatabase() {
		event := scaffoldRelays()[0]
		event.ID = "new-relay"
		event.Title = input.Title
		event.Description = input.Description
		event.Rules = input.Rules
		event.AllowUnverified = input.AllowUnverified
		event.CreatedBy = principal.Username
		event.Status = "draft"
		event.StartsAt = input.StartsAt
		event.EndsAt = input.EndsAt
		event.EntryCount = 0
		return event, nil
	}

	creatorID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return RelayEvent{}, err
	}

	slug := platformdb.Slugify(input.Title)
	var relayID int64
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into relay_events (
			title,
			slug,
			description,
			rules_md,
			status,
			allow_unverified,
			starts_at,
			ends_at,
			created_by
		) values ($1, $2, $3, $4, 'draft', $5, $6, $7, $8)
		returning id`,
		input.Title,
		slug,
		strings.TrimSpace(input.Description),
		strings.TrimSpace(input.Rules),
		input.AllowUnverified,
		input.StartsAt,
		input.EndsAt,
		creatorID,
	).Scan(&relayID); err != nil {
		return RelayEvent{}, err
	}

	detail, err := r.GetRelay(ctx, strconv.FormatInt(relayID, 10))
	if err != nil {
		return RelayEvent{}, err
	}

	return detail.Event, nil
}

func (r *repository) UpdateRelayStatus(ctx context.Context, principal security.Principal, relayID string, input UpdateRelayStatusRequest) (RelayEvent, error) {
	if !isAllowedRelayStatus(input.Status) {
		return RelayEvent{}, fmt.Errorf("unsupported relay status: %s", input.Status)
	}

	if !r.hasDatabase() {
		event := scaffoldRelays()[0]
		event.ID = relayID
		event.Status = input.Status
		return event, nil
	}

	dbRelayID, err := parseNumericIdentifier(relayID)
	if err != nil {
		return RelayEvent{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update relay_events
		 set status = $2::relay_status,
		     updated_at = now(),
		     deleted_at = case when $2 = 'deleted' then now() else deleted_at end
		 where id = $1`,
		dbRelayID,
		input.Status,
	); err != nil {
		return RelayEvent{}, err
	}

	detail, err := r.GetRelay(ctx, strconv.FormatInt(dbRelayID, 10))
	if err != nil {
		return RelayEvent{}, err
	}

	return detail.Event, nil
}

func (r *repository) CreateRelayEntry(ctx context.Context, principal security.Principal, relayID string, input CreateRelayEntryRequest) (RelayEntry, error) {
	if !r.hasDatabase() {
		return RelayEntry{
			ID:        "relay-entry-new",
			RelayID:   relayID,
			FloorNo:   len(scaffoldRelayEntries(relayID)) + 1,
			Content:   input.Content,
			Author:    principal.Username,
			CreatedAt: time.Now(),
		}, nil
	}

	dbRelayID, err := parseNumericIdentifier(relayID)
	if err != nil {
		return RelayEntry{}, err
	}

	if !principal.Verified && !principal.HasRole(security.RoleUnverified) {
		return RelayEntry{}, fmt.Errorf("relay participation requires an authenticated user")
	}

	userID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return RelayEntry{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return RelayEntry{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var allowUnverified bool
	var relayStatus string
	if err := tx.QueryRowContext(
		ctx,
		`select allow_unverified, status::text
		 from relay_events
		 where id = $1 and deleted_at is null`,
		dbRelayID,
	).Scan(&allowUnverified, &relayStatus); err != nil {
		return RelayEntry{}, err
	}
	if relayStatus != "open" {
		return RelayEntry{}, fmt.Errorf("relay is not open")
	}
	if !principal.Verified && !allowUnverified {
		return RelayEntry{}, fmt.Errorf("unverified users cannot join this relay")
	}

	var nextFloor int
	if err := tx.QueryRowContext(
		ctx,
		`select coalesce(max(floor_no), 0) + 1
		 from relay_entries
		 where relay_id = $1 and deleted_at is null`,
		dbRelayID,
	).Scan(&nextFloor); err != nil {
		return RelayEntry{}, err
	}

	var entryID int64
	var createdAt time.Time
	if err := tx.QueryRowContext(
		ctx,
		`insert into relay_entries (relay_id, user_id, floor_no, content_md, status)
		 values ($1, $2, $3, $4, 'visible')
		 returning id, created_at`,
		dbRelayID,
		userID,
		nextFloor,
		strings.TrimSpace(input.Content),
	).Scan(&entryID, &createdAt); err != nil {
		return RelayEntry{}, err
	}

	if err := tx.Commit(); err != nil {
		return RelayEntry{}, err
	}

	return RelayEntry{
		ID:        strconv.FormatInt(entryID, 10),
		RelayID:   strconv.FormatInt(dbRelayID, 10),
		FloorNo:   nextFloor,
		Content:   strings.TrimSpace(input.Content),
		Author:    principal.Username,
		CreatedAt: createdAt,
	}, nil
}

func (r *repository) ListWritingContests(ctx context.Context, params pagination.Params) (pagination.Result[WritingContest], error) {
	if !r.hasDatabase() {
		return pagination.Slice(scaffoldContests(), params), nil
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from writing_contests wc
		 where wc.deleted_at is null
		   and wc.status <> 'deleted'`,
	).Scan(&total); err != nil {
		return pagination.Result[WritingContest]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			wc.id,
			wc.title,
			coalesce(wc.description, ''),
			coalesce(wc.rules_md, ''),
			wc.status::text,
			wc.allow_article_repost,
			coalesce(nullif(u.nickname, ''), u.username) as created_by,
			wc.starts_at,
			wc.ends_at,
			count(ws.id)::int as submission_count
		from writing_contests wc
		join users u on u.id = wc.created_by
		left join writing_submissions ws on ws.contest_id = wc.id and ws.deleted_at is null and ws.status <> 'deleted'
		where wc.deleted_at is null
		  and wc.status <> 'deleted'
		group by wc.id, u.nickname, u.username
		order by wc.created_at desc
		limit $1 offset $2`,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[WritingContest]{}, err
	}
	defer rows.Close()

	var contests []WritingContest
	for rows.Next() {
		contest, err := scanWritingContest(rows)
		if err != nil {
			return pagination.Result[WritingContest]{}, err
		}
		contests = append(contests, contest)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[WritingContest]{}, err
	}

	return pagination.NewResult(contests, total, params), nil
}

func (r *repository) GetWritingContest(ctx context.Context, contestID string) (WritingContestDetail, error) {
	if !r.hasDatabase() {
		for _, contest := range scaffoldContests() {
			if contest.ID == contestID {
				return WritingContestDetail{
					Contest:     contest,
					Submissions: scaffoldSubmissions(contest.ID),
				}, nil
			}
		}
		return WritingContestDetail{}, fmt.Errorf("contest %s not found", contestID)
	}

	dbContestID, err := parseNumericIdentifier(contestID)
	if err != nil {
		return WritingContestDetail{}, err
	}

	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			wc.id,
			wc.title,
			coalesce(wc.description, ''),
			coalesce(wc.rules_md, ''),
			wc.status::text,
			wc.allow_article_repost,
			coalesce(nullif(u.nickname, ''), u.username) as created_by,
			wc.starts_at,
			wc.ends_at,
			(
				select count(*)::int
				from writing_submissions ws
				where ws.contest_id = wc.id and ws.deleted_at is null and ws.status <> 'deleted'
			) as submission_count
		from writing_contests wc
		join users u on u.id = wc.created_by
		where wc.id = $1 and wc.deleted_at is null`,
		dbContestID,
	)
	contest, err := scanWritingContest(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return WritingContestDetail{}, fmt.Errorf("contest %s not found", contestID)
		}
		return WritingContestDetail{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			ws.id,
			ws.contest_id,
			ws.title,
			coalesce(ws.summary, ''),
			coalesce(ws.content_md, ''),
			ws.source::text,
			coalesce(ws.source_article_id::text, ''),
			coalesce(nullif(u.nickname, ''), u.username) as author_name,
			ws.status::text,
			ws.created_at
		from writing_submissions ws
		join users u on u.id = ws.user_id
		where ws.contest_id = $1
		  and ws.deleted_at is null
		  and ws.status <> 'deleted'
		order by ws.created_at desc`,
		dbContestID,
	)
	if err != nil {
		return WritingContestDetail{}, err
	}
	defer rows.Close()

	var submissions []WritingSubmission
	for rows.Next() {
		submission, err := scanWritingSubmission(rows)
		if err != nil {
			return WritingContestDetail{}, err
		}
		submissions = append(submissions, submission)
	}

	return WritingContestDetail{
		Contest:     contest,
		Submissions: submissions,
	}, rows.Err()
}

func (r *repository) CreateWritingContest(ctx context.Context, principal security.Principal, input CreateWritingContestRequest) (WritingContest, error) {
	if !r.hasDatabase() {
		contest := scaffoldContests()[0]
		contest.ID = "new-contest"
		contest.Title = input.Title
		contest.Description = input.Description
		contest.Rules = input.Rules
		contest.AllowArticleRepost = input.AllowArticleRepost
		contest.Status = "draft"
		contest.CreatedBy = principal.Username
		contest.StartsAt = input.StartsAt
		contest.EndsAt = input.EndsAt
		contest.SubmissionCount = 0
		return contest, nil
	}

	creatorID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return WritingContest{}, err
	}

	slug := platformdb.Slugify(input.Title)
	var contestID int64
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into writing_contests (
			title,
			slug,
			description,
			rules_md,
			status,
			allow_article_repost,
			starts_at,
			ends_at,
			created_by
		) values ($1, $2, $3, $4, 'draft', $5, $6, $7, $8)
		returning id`,
		input.Title,
		slug,
		strings.TrimSpace(input.Description),
		strings.TrimSpace(input.Rules),
		input.AllowArticleRepost,
		input.StartsAt,
		input.EndsAt,
		creatorID,
	).Scan(&contestID); err != nil {
		return WritingContest{}, err
	}

	detail, err := r.GetWritingContest(ctx, strconv.FormatInt(contestID, 10))
	if err != nil {
		return WritingContest{}, err
	}

	return detail.Contest, nil
}

func (r *repository) UpdateWritingContestStatus(ctx context.Context, principal security.Principal, contestID string, input UpdateWritingContestStatusRequest) (WritingContest, error) {
	if !isAllowedContestStatus(input.Status) {
		return WritingContest{}, fmt.Errorf("unsupported contest status: %s", input.Status)
	}

	if !r.hasDatabase() {
		contest := scaffoldContests()[0]
		contest.ID = contestID
		contest.Status = input.Status
		return contest, nil
	}

	dbContestID, err := parseNumericIdentifier(contestID)
	if err != nil {
		return WritingContest{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update writing_contests
		 set status = $2::contest_status,
		     updated_at = now(),
		     deleted_at = case when $2 = 'deleted' then now() else deleted_at end
		 where id = $1`,
		dbContestID,
		input.Status,
	); err != nil {
		return WritingContest{}, err
	}

	detail, err := r.GetWritingContest(ctx, strconv.FormatInt(dbContestID, 10))
	if err != nil {
		return WritingContest{}, err
	}

	return detail.Contest, nil
}

func (r *repository) CreateWritingSubmission(ctx context.Context, principal security.Principal, contestID string, input CreateWritingSubmissionRequest) (WritingSubmission, error) {
	if !r.hasDatabase() {
		return WritingSubmission{
			ID:        "submission-new",
			ContestID: contestID,
			Title:     input.Title,
			Summary:   input.Summary,
			Content:   input.Content,
			Source:    deriveSubmissionSource(input.SourceArticleID),
			Author:    principal.Username,
			Status:    "submitted",
			CreatedAt: time.Now(),
		}, nil
	}

	dbContestID, err := parseNumericIdentifier(contestID)
	if err != nil {
		return WritingSubmission{}, err
	}

	userID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return WritingSubmission{}, err
	}

	content, summary, source, sourceArticleID, err := r.resolveSubmissionContent(ctx, input)
	if err != nil {
		return WritingSubmission{}, err
	}

	var allowArticleRepost bool
	var contestStatus string
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select allow_article_repost, status::text
		 from writing_contests
		 where id = $1 and deleted_at is null`,
		dbContestID,
	).Scan(&allowArticleRepost, &contestStatus); err != nil {
		return WritingSubmission{}, err
	}
	if contestStatus != "open" {
		return WritingSubmission{}, fmt.Errorf("contest is not open")
	}
	if source == "article_repost" && !allowArticleRepost {
		return WritingSubmission{}, fmt.Errorf("article repost is disabled for this contest")
	}

	var submissionID int64
	var createdAt time.Time
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into writing_submissions (
			contest_id,
			user_id,
			title,
			summary,
			content_md,
			source,
			source_article_id,
			status
		) values ($1, $2, $3, $4, $5, $6, $7, 'submitted')
		returning id, created_at`,
		dbContestID,
		userID,
		input.Title,
		summary,
		content,
		source,
		sourceArticleID,
	).Scan(&submissionID, &createdAt); err != nil {
		return WritingSubmission{}, err
	}

	return WritingSubmission{
		ID:              strconv.FormatInt(submissionID, 10),
		ContestID:       strconv.FormatInt(dbContestID, 10),
		Title:           input.Title,
		Summary:         summary,
		Content:         content,
		Source:          source,
		SourceArticleID: nullableInt64String(sourceArticleID),
		Author:          principal.Username,
		Status:          "submitted",
		CreatedAt:       createdAt,
	}, nil
}

func (r *repository) resolveSubmissionContent(ctx context.Context, input CreateWritingSubmissionRequest) (string, string, string, sql.NullInt64, error) {
	articleIDRaw := strings.TrimSpace(input.SourceArticleID)
	if articleIDRaw == "" {
		return strings.TrimSpace(input.Content), strings.TrimSpace(input.Summary), "direct", sql.NullInt64{}, nil
	}

	articleID, err := parseNumericIdentifier(articleIDRaw)
	if err != nil {
		return "", "", "", sql.NullInt64{}, err
	}

	var summary, content string
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select coalesce(summary, ''), content_md
		 from articles
		 where id = $1 and deleted_at is null`,
		articleID,
	).Scan(&summary, &content); err != nil {
		return "", "", "", sql.NullInt64{}, err
	}

	if strings.TrimSpace(input.Summary) != "" {
		summary = strings.TrimSpace(input.Summary)
	}

	return content, summary, "article_repost", sql.NullInt64{Int64: articleID, Valid: true}, nil
}

func (r *repository) hasDatabase() bool {
	return r.platform != nil && r.platform.Postgres != nil && r.platform.Postgres.Available()
}

type relayEventScanner interface {
	Scan(dest ...any) error
}

func scanRelayEvent(scanner relayEventScanner) (RelayEvent, error) {
	var (
		id              int64
		title           string
		description     string
		rules           string
		status          string
		allowUnverified bool
		createdBy       string
		startsAt        sql.NullTime
		endsAt          sql.NullTime
		entryCount      int
	)

	if err := scanner.Scan(&id, &title, &description, &rules, &status, &allowUnverified, &createdBy, &startsAt, &endsAt, &entryCount); err != nil {
		return RelayEvent{}, err
	}

	return RelayEvent{
		ID:              strconv.FormatInt(id, 10),
		Title:           title,
		Description:     description,
		Rules:           rules,
		Status:          status,
		AllowUnverified: allowUnverified,
		CreatedBy:       createdBy,
		StartsAt:        nullableTimePointer(startsAt),
		EndsAt:          nullableTimePointer(endsAt),
		EntryCount:      entryCount,
	}, nil
}

func scanRelayEntry(scanner relayEventScanner) (RelayEntry, error) {
	var (
		id        int64
		relayID   int64
		floorNo   int
		content   string
		author    string
		createdAt time.Time
	)

	if err := scanner.Scan(&id, &relayID, &floorNo, &content, &author, &createdAt); err != nil {
		return RelayEntry{}, err
	}

	return RelayEntry{
		ID:        strconv.FormatInt(id, 10),
		RelayID:   strconv.FormatInt(relayID, 10),
		FloorNo:   floorNo,
		Content:   content,
		Author:    author,
		CreatedAt: createdAt,
	}, nil
}

func scanWritingContest(scanner relayEventScanner) (WritingContest, error) {
	var (
		id                 int64
		title              string
		description        string
		rules              string
		status             string
		allowArticleRepost bool
		createdBy          string
		startsAt           sql.NullTime
		endsAt             sql.NullTime
		submissionCount    int
	)

	if err := scanner.Scan(&id, &title, &description, &rules, &status, &allowArticleRepost, &createdBy, &startsAt, &endsAt, &submissionCount); err != nil {
		return WritingContest{}, err
	}

	return WritingContest{
		ID:                 strconv.FormatInt(id, 10),
		Title:              title,
		Description:        description,
		Rules:              rules,
		Status:             status,
		AllowArticleRepost: allowArticleRepost,
		CreatedBy:          createdBy,
		StartsAt:           nullableTimePointer(startsAt),
		EndsAt:             nullableTimePointer(endsAt),
		SubmissionCount:    submissionCount,
	}, nil
}

func scanWritingSubmission(scanner relayEventScanner) (WritingSubmission, error) {
	var (
		id              int64
		contestID       int64
		title           string
		summary         string
		content         string
		source          string
		sourceArticleID string
		author          string
		status          string
		createdAt       time.Time
	)

	if err := scanner.Scan(&id, &contestID, &title, &summary, &content, &source, &sourceArticleID, &author, &status, &createdAt); err != nil {
		return WritingSubmission{}, err
	}

	return WritingSubmission{
		ID:              strconv.FormatInt(id, 10),
		ContestID:       strconv.FormatInt(contestID, 10),
		Title:           title,
		Summary:         summary,
		Content:         content,
		Source:          source,
		SourceArticleID: sourceArticleID,
		Author:          author,
		Status:          status,
		CreatedAt:       createdAt,
	}, nil
}

func nullableTimePointer(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}
	v := value.Time
	return &v
}

func nullableInt64String(value sql.NullInt64) string {
	if !value.Valid {
		return ""
	}
	return strconv.FormatInt(value.Int64, 10)
}

func parseNumericIdentifier(value string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid identifier: %s", value)
	}
	return id, nil
}

func deriveSubmissionSource(sourceArticleID string) string {
	if strings.TrimSpace(sourceArticleID) != "" {
		return "article_repost"
	}
	return "direct"
}

func isAllowedRelayStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "draft", "open", "closed", "archived", "deleted":
		return true
	default:
		return false
	}
}

func isAllowedContestStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case "draft", "open", "reviewing", "closed", "archived", "deleted":
		return true
	default:
		return false
	}
}

func scaffoldRelays() []RelayEvent {
	now := time.Now()
	end := now.Add(6 * 24 * time.Hour)
	return []RelayEvent{
		{
			ID:              "1",
			Title:           "本周剧情接龙",
			Description:     "给未认证用户和正式成员都能参与的基础接龙入口。",
			Rules:           "每人一段，尽量承接上一层情绪，不发布违规内容。",
			Status:          "open",
			AllowUnverified: true,
			CreatedBy:       "rubedo_room",
			StartsAt:        &now,
			EndsAt:          &end,
			EntryCount:      2,
		},
	}
}

func scaffoldRelayEntries(relayID string) []RelayEntry {
	now := time.Now()
	return []RelayEntry{
		{
			ID:        "1",
			RelayID:   relayID,
			FloorNo:   1,
			Content:   "风吹过站台的时候，谁也没有先开口，像是都在等对方先承认自己舍不得。",
			Author:    "night_editor",
			CreatedAt: now.Add(-2 * time.Hour),
		},
		{
			ID:        "2",
			RelayID:   relayID,
			FloorNo:   2,
			Content:   "于是那一点沉默被夜色收走，变成后来每次想起时都还能听见的回声。",
			Author:    "archive_keeper",
			CreatedAt: now.Add(-90 * time.Minute),
		},
	}
}

func scaffoldContests() []WritingContest {
	now := time.Now()
	end := now.Add(12 * 24 * time.Hour)
	return []WritingContest{
		{
			ID:                 "1",
			Title:              "雨与回声主题征文",
			Description:        "围绕“雨”“站台”“回声”等意象发起的站内征文活动。",
			Rules:              "支持直接投稿，也支持引用站内文章转投征文；内容需要符合站内规范。",
			Status:             "open",
			AllowArticleRepost: true,
			CreatedBy:          "rubedo_room",
			StartsAt:           &now,
			EndsAt:             &end,
			SubmissionCount:    1,
		},
	}
}

func scaffoldSubmissions(contestID string) []WritingSubmission {
	return []WritingSubmission{
		{
			ID:        "1",
			ContestID: contestID,
			Title:     "站台边缘的那一点风",
			Summary:   "从慢热叙事里的停顿和回声切入的一篇短文。",
			Content:   "如果故事真的会留下气味，那么站台边缘的风，大概就是最容易被记住的那一种。",
			Source:    "direct",
			Author:    "night_editor",
			Status:    "submitted",
			CreatedAt: time.Now().Add(-6 * time.Hour),
		},
	}
}
