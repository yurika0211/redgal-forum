package sitecontent

import "context"

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetContent(ctx context.Context) (SiteContent, error) {
	return s.repo.GetContent(ctx)
}

func (s *Service) CreateContentBlock(ctx context.Context, input CreateContentBlockRequest) (ContentBlock, error) {
	return s.repo.CreateContentBlock(ctx, input)
}

func (s *Service) UpdateContentBlock(ctx context.Context, blockID string, input UpdateContentBlockRequest) (ContentBlock, error) {
	return s.repo.UpdateContentBlock(ctx, blockID, input)
}

func (s *Service) DeleteContentBlock(ctx context.Context, blockID string) error {
	return s.repo.DeleteContentBlock(ctx, blockID)
}

func (s *Service) CreateGalleryEntry(ctx context.Context, input CreateGalleryEntryRequest) (GalleryEntry, error) {
	return s.repo.CreateGalleryEntry(ctx, input)
}

func (s *Service) UpdateGalleryEntry(ctx context.Context, entryID string, input UpdateGalleryEntryRequest) (GalleryEntry, error) {
	return s.repo.UpdateGalleryEntry(ctx, entryID, input)
}

func (s *Service) DeleteGalleryEntry(ctx context.Context, entryID string) error {
	return s.repo.DeleteGalleryEntry(ctx, entryID)
}
