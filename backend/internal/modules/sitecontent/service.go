package sitecontent

import (
	"context"
	"time"

	"example.com/rubedo/backend/internal/pagination"
	platformcache "example.com/rubedo/backend/internal/platform/cache"
)

type Service struct {
	repo         Repository
	cache        *platformcache.MultiLevel
	cacheEnabled bool
	cacheTTL     time.Duration
}

const (
	siteContentCacheKey   = "content"
	defaultSiteContentTTL = 45 * time.Second
)

type CacheOptions struct {
	Enabled bool
	TTL     time.Duration
}

func NewService(repo Repository, cache *platformcache.MultiLevel) *Service {
	return &Service{
		repo:         repo,
		cache:        cache,
		cacheEnabled: true,
		cacheTTL:     defaultSiteContentTTL,
	}
}

func (s *Service) ConfigureCache(options CacheOptions) *Service {
	s.cacheEnabled = options.Enabled

	if options.TTL > 0 {
		s.cacheTTL = options.TTL
	} else {
		s.cacheTTL = defaultSiteContentTTL
	}

	return s
}

func (s *Service) GetContent(ctx context.Context) (SiteContent, error) {
	if s.cacheEnabled && s.cache != nil {
		var cached SiteContent
		hit, err := s.cache.GetJSON(ctx, siteContentCacheKey, &cached)
		if err == nil && hit {
			return cached, nil
		}
	}

	content, err := s.repo.GetContent(ctx)
	if err != nil {
		return SiteContent{}, err
	}

	if s.cacheEnabled && s.cache != nil {
		_ = s.cache.SetJSON(ctx, siteContentCacheKey, content, s.cacheTTL)
	}

	return content, nil
}

func (s *Service) ListContentBlocks(ctx context.Context, params pagination.Params) (pagination.Result[ContentBlock], error) {
	return s.repo.ListContentBlocks(ctx, params)
}

func (s *Service) ListGalleryEntries(ctx context.Context, params pagination.Params) (pagination.Result[GalleryEntry], error) {
	return s.repo.ListGalleryEntries(ctx, params)
}

func (s *Service) CreateContentBlock(ctx context.Context, input CreateContentBlockRequest) (ContentBlock, error) {
	block, err := s.repo.CreateContentBlock(ctx, input)
	if err != nil {
		return ContentBlock{}, err
	}

	s.invalidateSiteContentCache(ctx)
	return block, nil
}

func (s *Service) UpdateContentBlock(ctx context.Context, blockID string, input UpdateContentBlockRequest) (ContentBlock, error) {
	block, err := s.repo.UpdateContentBlock(ctx, blockID, input)
	if err != nil {
		return ContentBlock{}, err
	}

	s.invalidateSiteContentCache(ctx)
	return block, nil
}

func (s *Service) DeleteContentBlock(ctx context.Context, blockID string) error {
	if err := s.repo.DeleteContentBlock(ctx, blockID); err != nil {
		return err
	}

	s.invalidateSiteContentCache(ctx)
	return nil
}

func (s *Service) CreateGalleryEntry(ctx context.Context, input CreateGalleryEntryRequest) (GalleryEntry, error) {
	entry, err := s.repo.CreateGalleryEntry(ctx, input)
	if err != nil {
		return GalleryEntry{}, err
	}

	s.invalidateSiteContentCache(ctx)
	return entry, nil
}

func (s *Service) UpdateGalleryEntry(ctx context.Context, entryID string, input UpdateGalleryEntryRequest) (GalleryEntry, error) {
	entry, err := s.repo.UpdateGalleryEntry(ctx, entryID, input)
	if err != nil {
		return GalleryEntry{}, err
	}

	s.invalidateSiteContentCache(ctx)
	return entry, nil
}

func (s *Service) DeleteGalleryEntry(ctx context.Context, entryID string) error {
	if err := s.repo.DeleteGalleryEntry(ctx, entryID); err != nil {
		return err
	}

	s.invalidateSiteContentCache(ctx)
	return nil
}

func (s *Service) invalidateSiteContentCache(ctx context.Context) {
	if !s.cacheEnabled || s.cache == nil {
		return
	}

	s.cache.Delete(ctx, siteContentCacheKey)
}
