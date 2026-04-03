package sitecontent

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"example.com/rubedo/backend/internal/platform"
	platformdb "example.com/rubedo/backend/internal/platform/database"
)

type Repository interface {
	GetContent(ctx context.Context) (SiteContent, error)
	CreateContentBlock(ctx context.Context, input CreateContentBlockRequest) (ContentBlock, error)
	UpdateContentBlock(ctx context.Context, blockID string, input UpdateContentBlockRequest) (ContentBlock, error)
	DeleteContentBlock(ctx context.Context, blockID string) error
	CreateGalleryEntry(ctx context.Context, input CreateGalleryEntryRequest) (GalleryEntry, error)
	UpdateGalleryEntry(ctx context.Context, entryID string, input UpdateGalleryEntryRequest) (GalleryEntry, error)
	DeleteGalleryEntry(ctx context.Context, entryID string) error
}

type repository struct {
	platform *platform.Platform
}

func NewRepository(platform *platform.Platform) Repository {
	return &repository{platform: platform}
}

func (r *repository) GetContent(ctx context.Context) (SiteContent, error) {
	if !r.hasDatabase() {
		return SiteContent{}, sql.ErrConnDone
	}

	content := SiteContent{}
	blockMap := map[ContentBlockType]*[]ContentBlock{
		ContentBlockHeroObject:      &content.HeroObjects,
		ContentBlockPortalPage:      &content.PortalPages,
		ContentBlockPortalHighlight: &content.PortalHighlights,
		ContentBlockPortalPillar:    &content.PortalPillars,
		ContentBlockPortalActivity:  &content.PortalActivities,
		ContentBlockPortalJoinStep:  &content.PortalJoinSteps,
	}

	rows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select id, block_type::text, slug, coalesce(path, ''), coalesce(kicker, ''), coalesce(label, ''), title,
		        coalesce(description, ''), coalesce(body, ''), sort_order, is_active
		 from site_content_blocks
		 where is_active = true
		 order by block_type asc, sort_order asc, id asc`,
	)
	if err != nil {
		return SiteContent{}, err
	}
	defer rows.Close()

	for rows.Next() {
		block, err := scanContentBlock(rows)
		if err != nil {
			return SiteContent{}, err
		}

		target, ok := blockMap[block.BlockType]
		if ok {
			*target = append(*target, block)
		}
	}

	if err := rows.Err(); err != nil {
		return SiteContent{}, err
	}

	galleryRows, err := r.platform.Postgres.QueryContext(
		ctx,
		`select id, entry_type::text, slug, title, coalesce(subtitle, ''), coalesce(body, ''), coalesce(extra_text, ''), sort_order, is_active
		 from gallery_entries
		 where is_active = true
		 order by entry_type asc, sort_order asc, id asc`,
	)
	if err != nil {
		return SiteContent{}, err
	}
	defer galleryRows.Close()

	for galleryRows.Next() {
		entry, err := scanGalleryEntry(galleryRows)
		if err != nil {
			return SiteContent{}, err
		}

		content.GalleryEntries = append(content.GalleryEntries, entry)
	}

	if err := galleryRows.Err(); err != nil {
		return SiteContent{}, err
	}

	return content, nil
}

func (r *repository) CreateContentBlock(ctx context.Context, input CreateContentBlockRequest) (ContentBlock, error) {
	if !r.hasDatabase() {
		return ContentBlock{}, sql.ErrConnDone
	}

	active := true
	if input.Active != nil {
		active = *input.Active
	}

	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = platformdb.Slugify(input.Title)
	}

	var id int64
	err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into site_content_blocks (
			block_type, slug, path, kicker, label, title, description, body, sort_order, is_active
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		returning id`,
		string(input.BlockType),
		slug,
		nullableString(input.Path),
		nullableString(input.Kicker),
		nullableString(input.Label),
		input.Title,
		nullableString(input.Description),
		nullableString(input.Body),
		input.SortOrder,
		active,
	).Scan(&id)
	if err != nil {
		return ContentBlock{}, err
	}

	return r.getContentBlock(ctx, strconv.FormatInt(id, 10))
}

func (r *repository) UpdateContentBlock(ctx context.Context, blockID string, input UpdateContentBlockRequest) (ContentBlock, error) {
	if !r.hasDatabase() {
		return ContentBlock{}, sql.ErrConnDone
	}

	current, err := r.getContentBlock(ctx, blockID)
	if err != nil {
		return ContentBlock{}, err
	}

	next := current
	if input.Slug != nil {
		next.Slug = normalizeOptionalSlug(*input.Slug, next.Title)
	}
	if input.Path != nil {
		next.Path = *input.Path
	}
	if input.Kicker != nil {
		next.Kicker = *input.Kicker
	}
	if input.Label != nil {
		next.Label = *input.Label
	}
	if input.Title != nil && strings.TrimSpace(*input.Title) != "" {
		next.Title = *input.Title
	}
	if input.Description != nil {
		next.Description = *input.Description
	}
	if input.Body != nil {
		next.Body = *input.Body
	}
	if input.SortOrder != nil {
		next.SortOrder = *input.SortOrder
	}
	if input.Active != nil {
		next.Active = *input.Active
	}

	dbID, err := strconv.ParseInt(blockID, 10, 64)
	if err != nil {
		return ContentBlock{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update site_content_blocks
		 set slug = $2,
		     path = $3,
		     kicker = $4,
		     label = $5,
		     title = $6,
		     description = $7,
		     body = $8,
		     sort_order = $9,
		     is_active = $10
		 where id = $1`,
		dbID,
		next.Slug,
		nullableString(next.Path),
		nullableString(next.Kicker),
		nullableString(next.Label),
		next.Title,
		nullableString(next.Description),
		nullableString(next.Body),
		next.SortOrder,
		next.Active,
	); err != nil {
		return ContentBlock{}, err
	}

	return r.getContentBlock(ctx, blockID)
}

func (r *repository) DeleteContentBlock(ctx context.Context, blockID string) error {
	if !r.hasDatabase() {
		return sql.ErrConnDone
	}

	dbID, err := strconv.ParseInt(blockID, 10, 64)
	if err != nil {
		return err
	}

	_, err = r.platform.Postgres.ExecContext(ctx, `delete from site_content_blocks where id = $1`, dbID)
	return err
}

func (r *repository) CreateGalleryEntry(ctx context.Context, input CreateGalleryEntryRequest) (GalleryEntry, error) {
	if !r.hasDatabase() {
		return GalleryEntry{}, sql.ErrConnDone
	}

	active := true
	if input.Active != nil {
		active = *input.Active
	}

	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = platformdb.Slugify(input.Title)
	}

	var id int64
	err := r.platform.Postgres.QueryRowContext(
		ctx,
		`insert into gallery_entries (
			entry_type, slug, title, subtitle, body, extra_text, sort_order, is_active
		) values ($1, $2, $3, $4, $5, $6, $7, $8)
		returning id`,
		string(input.EntryType),
		slug,
		input.Title,
		nullableString(input.Subtitle),
		nullableString(input.Body),
		nullableString(input.ExtraText),
		input.SortOrder,
		active,
	).Scan(&id)
	if err != nil {
		return GalleryEntry{}, err
	}

	return r.getGalleryEntry(ctx, strconv.FormatInt(id, 10))
}

func (r *repository) UpdateGalleryEntry(ctx context.Context, entryID string, input UpdateGalleryEntryRequest) (GalleryEntry, error) {
	if !r.hasDatabase() {
		return GalleryEntry{}, sql.ErrConnDone
	}

	current, err := r.getGalleryEntry(ctx, entryID)
	if err != nil {
		return GalleryEntry{}, err
	}

	next := current
	if input.Slug != nil {
		next.Slug = normalizeOptionalSlug(*input.Slug, next.Title)
	}
	if input.Title != nil && strings.TrimSpace(*input.Title) != "" {
		next.Title = *input.Title
	}
	if input.Subtitle != nil {
		next.Subtitle = *input.Subtitle
	}
	if input.Body != nil {
		next.Body = *input.Body
	}
	if input.ExtraText != nil {
		next.ExtraText = *input.ExtraText
	}
	if input.SortOrder != nil {
		next.SortOrder = *input.SortOrder
	}
	if input.Active != nil {
		next.Active = *input.Active
	}

	dbID, err := strconv.ParseInt(entryID, 10, 64)
	if err != nil {
		return GalleryEntry{}, err
	}

	if _, err := r.platform.Postgres.ExecContext(
		ctx,
		`update gallery_entries
		 set slug = $2,
		     title = $3,
		     subtitle = $4,
		     body = $5,
		     extra_text = $6,
		     sort_order = $7,
		     is_active = $8
		 where id = $1`,
		dbID,
		next.Slug,
		next.Title,
		nullableString(next.Subtitle),
		nullableString(next.Body),
		nullableString(next.ExtraText),
		next.SortOrder,
		next.Active,
	); err != nil {
		return GalleryEntry{}, err
	}

	return r.getGalleryEntry(ctx, entryID)
}

func (r *repository) DeleteGalleryEntry(ctx context.Context, entryID string) error {
	if !r.hasDatabase() {
		return sql.ErrConnDone
	}

	dbID, err := strconv.ParseInt(entryID, 10, 64)
	if err != nil {
		return err
	}

	_, err = r.platform.Postgres.ExecContext(ctx, `delete from gallery_entries where id = $1`, dbID)
	return err
}

func (r *repository) getContentBlock(ctx context.Context, blockID string) (ContentBlock, error) {
	dbID, err := strconv.ParseInt(blockID, 10, 64)
	if err != nil {
		return ContentBlock{}, err
	}

	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, block_type::text, slug, coalesce(path, ''), coalesce(kicker, ''), coalesce(label, ''),
		        title, coalesce(description, ''), coalesce(body, ''), sort_order, is_active
		 from site_content_blocks
		 where id = $1`,
		dbID,
	)

	block, err := scanContentBlock(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return ContentBlock{}, fmt.Errorf("content block %s not found", blockID)
		}
		return ContentBlock{}, err
	}

	return block, nil
}

func (r *repository) getGalleryEntry(ctx context.Context, entryID string) (GalleryEntry, error) {
	dbID, err := strconv.ParseInt(entryID, 10, 64)
	if err != nil {
		return GalleryEntry{}, err
	}

	row := r.platform.Postgres.QueryRowContext(
		ctx,
		`select id, entry_type::text, slug, title, coalesce(subtitle, ''), coalesce(body, ''), coalesce(extra_text, ''), sort_order, is_active
		 from gallery_entries
		 where id = $1`,
		dbID,
	)

	entry, err := scanGalleryEntry(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return GalleryEntry{}, fmt.Errorf("gallery entry %s not found", entryID)
		}
		return GalleryEntry{}, err
	}

	return entry, nil
}

func (r *repository) hasDatabase() bool {
	return r.platform != nil && r.platform.Postgres != nil && r.platform.Postgres.Available()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanContentBlock(scanner rowScanner) (ContentBlock, error) {
	var (
		id          int64
		blockType   string
		slug        string
		path        string
		kicker      string
		label       string
		title       string
		description string
		body        string
		sortOrder   int
		active      bool
	)

	if err := scanner.Scan(&id, &blockType, &slug, &path, &kicker, &label, &title, &description, &body, &sortOrder, &active); err != nil {
		return ContentBlock{}, err
	}

	return ContentBlock{
		ID:          strconv.FormatInt(id, 10),
		BlockType:   ContentBlockType(blockType),
		Slug:        slug,
		Path:        path,
		Kicker:      kicker,
		Label:       label,
		Title:       title,
		Description: description,
		Body:        body,
		SortOrder:   sortOrder,
		Active:      active,
	}, nil
}

func scanGalleryEntry(scanner rowScanner) (GalleryEntry, error) {
	var (
		id        int64
		entryType string
		slug      string
		title     string
		subtitle  string
		body      string
		extraText string
		sortOrder int
		active    bool
	)

	if err := scanner.Scan(&id, &entryType, &slug, &title, &subtitle, &body, &extraText, &sortOrder, &active); err != nil {
		return GalleryEntry{}, err
	}

	return GalleryEntry{
		ID:        strconv.FormatInt(id, 10),
		EntryType: GalleryEntryType(entryType),
		Slug:      slug,
		Title:     title,
		Subtitle:  subtitle,
		Body:      body,
		ExtraText: extraText,
		SortOrder: sortOrder,
		Active:    active,
	}, nil
}

func normalizeOptionalSlug(input, fallbackTitle string) string {
	value := strings.TrimSpace(input)
	if value == "" {
		return platformdb.Slugify(fallbackTitle)
	}

	return platformdb.Slugify(value)
}

func nullableString(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	return trimmed
}
