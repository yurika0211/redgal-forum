package article

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
	"example.com/rubedo/backend/internal/scaffold"
	"example.com/rubedo/backend/internal/security"
)

type Repository interface {
	ListArticles(ctx context.Context, viewer security.Principal, params pagination.Params) (pagination.Result[Article], error)
	GetArticle(ctx context.Context, viewer security.Principal, articleID string) (Article, error)
	CreateArticle(ctx context.Context, principal security.Principal, input CreateArticleRequest) (Article, error)
	UpdateArticle(ctx context.Context, principal security.Principal, articleID string, input UpdateArticleRequest) (Article, error)
	DeleteArticle(ctx context.Context, principal security.Principal, articleID string) (DeleteArticleResult, error)
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) ListArticles(ctx context.Context, viewer security.Principal, params pagination.Params) (pagination.Result[Article], error) {
	if !r.hasDatabase() {
		return pagination.Result[Article]{}, fmt.Errorf("postgres unavailable for article listing")
	}

	var total int
	if err := r.platform.Postgres.QueryRowContext(
		ctx,
		`select count(*)::int
		 from articles a
		 join users u on u.id = a.author_id
		 where a.deleted_at is null
		   and a.status = 'published'
		   and (
		     a.visibility = 'public'
		     or ($1 and a.visibility = 'members')
		     or ($2 <> '' and lower(u.username) = lower($2))
		   )`,
		viewer.Authenticated(),
		viewer.Username,
	).Scan(&total); err != nil {
		return pagination.Result[Article]{}, err
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select
			a.id,
			a.title,
			coalesce(a.summary, ''),
			a.content_md,
			a.visibility::text,
			coalesce(nullif(u.nickname, ''), u.username) as author_name,
			coalesce(string_agg(distinct t.name, E'\n') filter (where t.name is not null), '') as tags
		from articles a
		join users u on u.id = a.author_id
		left join article_tag_relations atr on atr.article_id = a.id
		left join article_tags t on t.id = atr.tag_id
		where a.deleted_at is null
		  and a.status = 'published'
		  and (
		    a.visibility = 'public'
		    or ($1 and a.visibility = 'members')
		    or ($2 <> '' and lower(u.username) = lower($2))
		  )
		group by a.id, u.nickname, u.username
		order by coalesce(a.published_at, a.created_at) desc, a.id desc
		limit $3 offset $4`,
		viewer.Authenticated(),
		viewer.Username,
		params.PageSize,
		params.Offset(),
	)
	if err != nil {
		return pagination.Result[Article]{}, err
	}
	defer rows.Close()

	var articles []Article
	for rows.Next() {
		article, err := scanArticleRow(rows)
		if err != nil {
			return pagination.Result[Article]{}, err
		}

		articles = append(articles, article)
	}

	if err := rows.Err(); err != nil {
		return pagination.Result[Article]{}, err
	}

	return pagination.NewResult(articles, total, params), nil
}

func (r *repository) GetArticle(ctx context.Context, viewer security.Principal, articleID string) (Article, error) {
	if !r.hasDatabase() {
		return Article{}, fmt.Errorf("postgres unavailable for article detail")
	}

	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select
			a.id,
			a.title,
			coalesce(a.summary, ''),
			a.content_md,
			a.visibility::text,
			coalesce(nullif(u.nickname, ''), u.username) as author_name,
			coalesce(string_agg(distinct t.name, E'\n') filter (where t.name is not null), '') as tags
		from articles a
		join users u on u.id = a.author_id
		left join article_tag_relations atr on atr.article_id = a.id
		left join article_tags t on t.id = atr.tag_id
		where a.deleted_at is null
		  and a.status = 'published'
		  and (
		    cast(a.id as text) = $1
		    or lower(a.slug) = lower($1)
		  )
		  and (
		    a.visibility = 'public'
		    or ($2 and a.visibility = 'members')
		    or ($3 <> '' and lower(u.username) = lower($3))
		  )
		group by a.id, u.nickname, u.username`,
		articleID,
		viewer.Authenticated(),
		viewer.Username,
	)

	article, err := scanArticleRow(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return Article{}, fmt.Errorf("article %s not found", articleID)
		}
		return Article{}, err
	}

	return article, nil
}

func (r *repository) CreateArticle(ctx context.Context, principal security.Principal, input CreateArticleRequest) (Article, error) {
	if !r.hasDatabase() {
		return Article{}, scaffold.ErrNotImplemented
	}

	authorID, err := platformdb.EnsureUser(ctx, r.platform.Postgres, principal.Username)
	if err != nil {
		return Article{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return Article{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	slug, err := ensureArticleSlug(ctx, tx, input.Title)
	if err != nil {
		return Article{}, err
	}

	var articleID int64
	err = tx.QueryRowContext(
		ctx,
		`insert into articles (
			author_id,
			title,
			slug,
			summary,
			content_md,
			visibility,
			status,
			allow_comments,
			published_at
		) values ($1, $2, $3, $4, $5, $6, 'published', true, now())
		returning id`,
		authorID,
		input.Title,
		slug,
		input.Summary,
		input.Content,
		toDBVisibility(input.Visibility),
	).Scan(&articleID)
	if err != nil {
		return Article{}, err
	}

	if err := syncArticleTags(ctx, tx, articleID, input.Tags); err != nil {
		return Article{}, err
	}

	if err := tx.Commit(); err != nil {
		return Article{}, err
	}

	return r.GetArticle(ctx, principal, strconv.FormatInt(articleID, 10))
}

func (r *repository) UpdateArticle(ctx context.Context, principal security.Principal, articleID string, input UpdateArticleRequest) (Article, error) {
	if !r.hasDatabase() {
		return Article{}, scaffold.ErrNotImplemented
	}

	dbArticleID, err := parseArticleIdentifier(articleID)
	if err != nil {
		return Article{}, err
	}

	tx, err := r.platform.Postgres.BeginTx(ctx, nil)
	if err != nil {
		return Article{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	current, err := r.GetArticle(ctx, principal, articleID)
	if err != nil {
		return Article{}, err
	}

	nextTitle := current.Title
	nextSummary := current.Summary
	nextContent := current.Content
	nextVisibility := current.Visibility
	nextTags := current.Tags

	if strings.TrimSpace(input.Title) != "" {
		nextTitle = input.Title
	}
	if input.Summary != "" {
		nextSummary = input.Summary
	}
	if input.Content != "" {
		nextContent = input.Content
	}
	if input.Visibility != "" {
		nextVisibility = input.Visibility
	}
	if input.Tags != nil {
		nextTags = input.Tags
	}

	if _, err := tx.ExecContext(
		ctx,
		`update articles
		 set title = $2,
		     summary = $3,
		     content_md = $4,
		     visibility = $5
		 where id = $1`,
		dbArticleID,
		nextTitle,
		nextSummary,
		nextContent,
		toDBVisibility(nextVisibility),
	); err != nil {
		return Article{}, err
	}

	if err := syncArticleTags(ctx, tx, dbArticleID, nextTags); err != nil {
		return Article{}, err
	}

	if err := tx.Commit(); err != nil {
		return Article{}, err
	}

	return r.GetArticle(ctx, principal, articleID)
}

func (r *repository) DeleteArticle(ctx context.Context, principal security.Principal, articleID string) (DeleteArticleResult, error) {
	if !r.hasDatabase() {
		return DeleteArticleResult{
			ArticleID: articleID,
			Status:    "deleted",
		}, nil
	}

	dbArticleID, err := parseArticleIdentifier(articleID)
	if err != nil {
		return DeleteArticleResult{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update articles
		 set status = 'deleted',
		     deleted_at = now()
		 where id = $1`,
		dbArticleID,
	); err != nil {
		return DeleteArticleResult{}, err
	}

	return DeleteArticleResult{
		ArticleID: strconv.FormatInt(dbArticleID, 10),
		Status:    "deleted",
	}, nil
}

func (r *repository) hasDatabase() bool {
	return r.platform != nil && r.platform.Postgres != nil && r.platform.Postgres.Available()
}

type articleScanner interface {
	Scan(dest ...any) error
}

func scanArticleRow(scanner articleScanner) (Article, error) {
	var (
		id         int64
		title      string
		summary    string
		content    string
		visibility string
		author     string
		tagsRaw    string
	)

	if err := scanner.Scan(&id, &title, &summary, &content, &visibility, &author, &tagsRaw); err != nil {
		return Article{}, err
	}

	return Article{
		ID:         strconv.FormatInt(id, 10),
		Title:      title,
		Summary:    summary,
		Content:    content,
		Visibility: fromDBVisibility(visibility),
		Author:     author,
		Tags:       splitAggregatedText(tagsRaw),
	}, nil
}

func splitAggregatedText(raw string) []string {
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

func ensureArticleSlug(ctx context.Context, tx *sql.Tx, title string) (string, error) {
	base := platformdb.Slugify(title)
	candidate := base

	for attempt := 1; attempt <= 50; attempt++ {
		var exists bool
		if err := tx.QueryRowContext(
			ctx,
			`select exists(
				select 1
				from articles
				where lower(slug) = lower($1)
				  and deleted_at is null
			)`,
			candidate,
		).Scan(&exists); err != nil {
			return "", err
		}

		if !exists {
			return candidate, nil
		}

		candidate = fmt.Sprintf("%s-%d", base, attempt+1)
	}

	return fmt.Sprintf("%s-%d", base, time.Now().Unix()), nil
}

func syncArticleTags(ctx context.Context, tx *sql.Tx, articleID int64, tags []string) error {
	if _, err := tx.ExecContext(ctx, `delete from article_tag_relations where article_id = $1`, articleID); err != nil {
		return err
	}

	for _, rawTag := range tags {
		tag := strings.TrimSpace(rawTag)
		if tag == "" {
			continue
		}

		slug := platformdb.Slugify(tag)
		if _, err := tx.ExecContext(
			ctx,
			`insert into article_tags (name, slug)
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
			 from article_tags
			 where lower(name) = lower($1)
			 limit 1`,
			tag,
		).Scan(&tagID); err != nil {
			return err
		}

		if _, err := tx.ExecContext(
			ctx,
			`insert into article_tag_relations (article_id, tag_id)
			 values ($1, $2)
			 on conflict do nothing`,
			articleID,
			tagID,
		); err != nil {
			return err
		}
	}

	return nil
}

func parseArticleIdentifier(value string) (int64, error) {
	articleID, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("unsupported article identifier %q", value)
	}

	return articleID, nil
}

func toDBVisibility(value Visibility) string {
	switch value {
	case VisibilityMember:
		return "members"
	case VisibilityPrivate:
		return "private"
	default:
		return "public"
	}
}

func fromDBVisibility(value string) Visibility {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "members", "member":
		return VisibilityMember
	case "private":
		return VisibilityPrivate
	default:
		return VisibilityPublic
	}
}

func scaffoldArticles(viewer security.Principal) []Article {
	articles := []Article{
		{
			ID:         "article-001",
			Title:      "公开区示例感想",
			Summary:    "公开可见文章占位数据",
			Content:    "This is a scaffolded public article.",
			Visibility: VisibilityPublic,
			Author:     "rubedo-member",
			Tags:       []string{"galgame", "public"},
		},
	}

	if viewer.Authenticated() {
		articles = append(articles, Article{
			ID:         "article-002",
			Title:      "登录可见示例感想",
			Summary:    "成员可见文章占位数据",
			Content:    "This is a scaffolded members-only article.",
			Visibility: VisibilityMember,
			Author:     "rubedo-member",
			Tags:       []string{"member"},
		})
	}

	return articles
}

func scaffoldArticleDetail(articleID string) Article {
	return Article{
		ID:         articleID,
		Title:      "Scaffolded article detail",
		Summary:    "Reserved for public/member/private visibility logic.",
		Content:    "Full article content will be backed by PostgreSQL later.",
		Visibility: VisibilityPublic,
		Author:     "rubedo-member",
		Tags:       []string{"scaffold"},
	}
}
