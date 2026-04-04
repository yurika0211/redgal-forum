package wall

import (
	"context"
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

type Repository interface {
	ListEntries(ctx context.Context, params pagination.Params) (pagination.Result[WallEntry], error)
	ListSubmissions(ctx context.Context, params pagination.Params) (pagination.Result[WallEntry], error)
	CreateSubmission(ctx context.Context, principal security.Principal, input CreateSubmissionRequest) (WallEntry, error)
	ReviewSubmission(ctx context.Context, principal security.Principal, submissionID string, input ReviewSubmissionRequest) (ReviewResult, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListEntries(ctx context.Context, params pagination.Params) (pagination.Result[WallEntry], error) {
	if !r.hasDatabase() {
		return pagination.Result[WallEntry]{}, fmt.Errorf("postgres unavailable for wall listing")
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from wall_entries we
		 where we.deleted_at is null
		   and we.visibility = 'public'
		   and we.status = 'approved'`,
	).Scan(&total); err != nil {
		return pagination.Result[WallEntry]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			we.id,
			we.title,
			coalesce(we.content_md, ''),
			coalesce(string_agg(wem.media_url, E'\n' order by wem.sort_order, wem.id), '') as media_urls,
			(we.status = 'approved') as approved,
			coalesce(nullif(u.nickname, ''), u.username) as contributor,
			we.status::text,
			we.created_at
		from wall_entries we
		join users u on u.id = we.submitter_id
		left join wall_entry_media wem on wem.entry_id = we.id
		where we.deleted_at is null
		  and we.visibility = 'public'
		  and we.status = 'approved'
		group by we.id, u.nickname, u.username
		order by coalesce(we.published_at, we.created_at) desc, we.id desc
		limit $1 offset $2`,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[WallEntry]{}, err
	}
	defer rows.Close()

	var entries []WallEntry
	for rows.Next() {
		entry, err := scanWallEntry(rows)
		if err != nil {
			return pagination.Result[WallEntry]{}, err
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[WallEntry]{}, err
	}

	return pagination.NewResult(entries, total, params), nil
}

func (r *repository) CreateSubmission(ctx context.Context, principal security.Principal, input CreateSubmissionRequest) (WallEntry, error) {
	if !r.hasDatabase() {
		return WallEntry{}, scaffold.ErrNotImplemented
	}

	submitterID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return WallEntry{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return WallEntry{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	slug := fmt.Sprintf("%s-%d", platformdb.Slugify(input.Title), time.Now().Unix())

	var entryID int64
	if err := tx.QueryRowContext(
		ctx,
		`insert into wall_entries (
			submitter_id,
			slug,
			title,
			content_md,
			visibility,
			status
		) values ($1, $2, $3, $4, 'public', 'pending_review')
		returning id`,
		submitterID,
		slug,
		input.Title,
		input.Content,
	).Scan(&entryID); err != nil {
		return WallEntry{}, err
	}

	for index, rawURL := range input.Images {
		mediaURL := strings.TrimSpace(rawURL)
		if mediaURL == "" {
			continue
		}

		if _, err := tx.ExecContext(
			ctx,
			`insert into wall_entry_media (entry_id, media_type, media_url, sort_order)
			 values ($1, 'image', $2, $3)`,
			entryID,
			mediaURL,
			index,
		); err != nil {
			return WallEntry{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return WallEntry{}, err
	}

	return WallEntry{
		ID:          strconv.FormatInt(entryID, 10),
		Title:       input.Title,
		Content:     input.Content,
		Images:      cleanedImages(input.Images),
		Approved:    false,
		Contributor: principal.Username,
		Status:      "pending_review",
		CreatedAt:   time.Now(),
	}, nil
}

func (r *repository) ListSubmissions(ctx context.Context, params pagination.Params) (pagination.Result[WallEntry], error) {
	if !r.hasDatabase() {
		return pagination.Result[WallEntry]{}, fmt.Errorf("postgres unavailable for wall moderation listing")
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from wall_entries
		 where deleted_at is null`,
	).Scan(&total); err != nil {
		return pagination.Result[WallEntry]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			we.id,
			we.title,
			coalesce(we.content_md, ''),
			coalesce(string_agg(wem.media_url, E'\n' order by wem.sort_order, wem.id), '') as media_urls,
			(we.status = 'approved') as approved,
			coalesce(nullif(u.nickname, ''), u.username) as contributor,
			we.status::text,
			we.created_at
		from wall_entries we
		join users u on u.id = we.submitter_id
		left join wall_entry_media wem on wem.entry_id = we.id
		where we.deleted_at is null
		group by we.id, u.nickname, u.username
		order by we.created_at desc, we.id desc
		limit $1 offset $2`,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[WallEntry]{}, err
	}
	defer rows.Close()

	entries := make([]WallEntry, 0)
	for rows.Next() {
		entry, scanErr := scanWallEntry(rows)
		if scanErr != nil {
			return pagination.Result[WallEntry]{}, scanErr
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[WallEntry]{}, err
	}

	return pagination.NewResult(entries, total, params), nil
}

func (r *repository) ReviewSubmission(ctx context.Context, principal security.Principal, submissionID string, input ReviewSubmissionRequest) (ReviewResult, error) {
	if !r.hasDatabase() {
		return ReviewResult{}, scaffold.ErrNotImplemented
	}

	entryID, err := strconv.ParseInt(strings.TrimSpace(submissionID), 10, 64)
	if err != nil {
		return ReviewResult{}, err
	}

	reviewerID, err := strconv.ParseInt(strings.TrimSpace(principal.UserID), 10, 64)
	if err != nil {
		return ReviewResult{}, err
	}

	decision := strings.TrimSpace(strings.ToLower(input.Decision))
	if decision == "" {
		return ReviewResult{}, fmt.Errorf("decision is required")
	}

	status := "pending_review"
	switch decision {
	case "approved":
		status = "approved"
	case "rejected":
		status = "rejected"
	case "changes_requested":
		status = "draft"
	default:
		return ReviewResult{}, fmt.Errorf("unsupported decision: %s", input.Decision)
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return ReviewResult{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(
		ctx,
		`insert into wall_entry_reviews (entry_id, reviewer_id, decision, review_note)
		 values ($1, $2, $3, nullif($4, ''))`,
		entryID,
		reviewerID,
		decision,
		strings.TrimSpace(input.Comment),
	); err != nil {
		return ReviewResult{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`update wall_entries
		 set status = $2::wall_entry_status,
		     approved_by = case when $2 = 'approved' then $3 else approved_by end,
		     approved_at = case when $2 = 'approved' then now() else approved_at end,
		     published_at = case when $2 = 'approved' then now() else published_at end,
		     rejection_reason = case when $2 = 'rejected' then nullif($4, '') else rejection_reason end
		 where id = $1`,
		entryID,
		status,
		reviewerID,
		strings.TrimSpace(input.Comment),
	); err != nil {
		return ReviewResult{}, err
	}

	if err := tx.Commit(); err != nil {
		return ReviewResult{}, err
	}

	return ReviewResult{
		SubmissionID: strconv.FormatInt(entryID, 10),
		Status:       decision,
	}, nil
}

func (r *repository) hasDatabase() bool {
	return r.platform != nil && r.platform.Postgres != nil && r.platform.Postgres.Available()
}

type wallScanner interface {
	Scan(dest ...any) error
}

func scanWallEntry(scanner wallScanner) (WallEntry, error) {
	var (
		id          int64
		title       string
		content     string
		imagesRaw   string
		approved    bool
		contributor string
		status      string
		createdAt   time.Time
	)

	if err := scanner.Scan(&id, &title, &content, &imagesRaw, &approved, &contributor, &status, &createdAt); err != nil {
		return WallEntry{}, err
	}

	return WallEntry{
		ID:          strconv.FormatInt(id, 10),
		Title:       title,
		Content:     content,
		Images:      splitImages(imagesRaw),
		Approved:    approved,
		Contributor: contributor,
		Status:      status,
		CreatedAt:   createdAt,
	}, nil
}

func splitImages(raw string) []string {
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

func cleanedImages(images []string) []string {
	result := make([]string, 0, len(images))
	for _, raw := range images {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	return result
}

func scaffoldEntries() []WallEntry {
	return []WallEntry{
		{
			ID:          "wall-001",
			Title:       "第一次社团招新",
			Content:     "This is the scaffolded memories wall entry.",
			Images:      []string{"https://example.com/wall-1.png"},
			Approved:    true,
			Contributor: "memory-curator",
		},
	}
}
