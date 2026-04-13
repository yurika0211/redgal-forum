package forum

import (
	"context"
	"fmt"
	"time"

	"example.com/rubedo/backend/internal/pagination"
	platformcache "example.com/rubedo/backend/internal/platform/cache"
	"example.com/rubedo/backend/internal/security"
)

type Service struct {
	repo                 Repository
	snapshotCache        *platformcache.MultiLevel
	snapshotCacheEnabled bool
	snapshotCacheTTL     time.Duration
}

const defaultMyThreadSnapshotCacheTTL = 20 * time.Second

type SnapshotCacheOptions struct {
	Enabled bool
	TTL     time.Duration
}

func NewService(repo Repository, snapshotCache *platformcache.MultiLevel) *Service {
	return &Service{
		repo:                 repo,
		snapshotCache:        snapshotCache,
		snapshotCacheEnabled: true,
		snapshotCacheTTL:     defaultMyThreadSnapshotCacheTTL,
	}
}

func (s *Service) ConfigureSnapshotCache(options SnapshotCacheOptions) *Service {
	s.snapshotCacheEnabled = options.Enabled

	if options.TTL > 0 {
		s.snapshotCacheTTL = options.TTL
	} else {
		s.snapshotCacheTTL = defaultMyThreadSnapshotCacheTTL
	}

	return s
}

func (s *Service) ListThreads(
	ctx context.Context,
	viewer security.Principal,
	params pagination.Params,
	query string,
) (pagination.Result[Thread], error) {
	return s.repo.ListThreads(ctx, viewer, params, query)
}

func (s *Service) ListAnonymousThreads(
	ctx context.Context,
	params pagination.Params,
	query string,
) (pagination.Result[Thread], error) {
	return s.repo.ListAnonymousThreads(ctx, params, query)
}

func (s *Service) GetThread(
	ctx context.Context,
	viewer security.Principal,
	threadID string,
) (ThreadDetail, error) {
	return s.repo.GetThread(ctx, viewer, threadID)
}

func (s *Service) GetAnonymousThread(ctx context.Context, threadID string) (ThreadDetail, error) {
	return s.repo.GetAnonymousThread(ctx, threadID)
}

func (s *Service) GetAvailabilitySettings(ctx context.Context) (AvailabilitySettings, error) {
	return s.repo.GetAvailabilitySettings(ctx)
}

func (s *Service) UpdateAvailabilitySettings(
	ctx context.Context,
	input UpdateAvailabilitySettingsRequest,
) (AvailabilitySettings, error) {
	return s.repo.UpdateAvailabilitySettings(ctx, input)
}

func (s *Service) GetProgress(ctx context.Context, principal security.Principal) (Progress, error) {
	return s.repo.GetProgress(ctx, principal)
}

func (s *Service) ListMyThreadReplySnapshots(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[ThreadReplySnapshot], error) {
	cacheKey := fmt.Sprintf(
		"reply-snapshots:user=%s:page=%d:size=%d",
		principal.Username,
		params.Page,
		params.PageSize,
	)

	if s.snapshotCacheEnabled && s.snapshotCache != nil {
		var cached pagination.Result[ThreadReplySnapshot]
		hit, err := s.snapshotCache.GetJSON(ctx, cacheKey, &cached)
		if err == nil && hit {
			return cached, nil
		}
	}

	result, err := s.repo.ListMyThreadReplySnapshots(ctx, principal, params)
	if err != nil {
		return pagination.Result[ThreadReplySnapshot]{}, err
	}

	if s.snapshotCacheEnabled && s.snapshotCache != nil {
		_ = s.snapshotCache.SetJSON(ctx, cacheKey, result, s.snapshotCacheTTL)
	}

	return result, nil
}

func (s *Service) ListMyFavoritedThreads(
	ctx context.Context,
	principal security.Principal,
	params pagination.Params,
) (pagination.Result[Thread], error) {
	return s.repo.ListMyFavoritedThreads(ctx, principal, params)
}

func (s *Service) SignIn(ctx context.Context, principal security.Principal) (SignInResult, error) {
	return s.repo.SignIn(ctx, principal)
}

func (s *Service) UpdateThreadEngagement(
	ctx context.Context,
	principal security.Principal,
	threadID string,
	input UpdateThreadEngagementRequest,
) (ThreadEngagement, error) {
	return s.repo.UpdateThreadEngagement(ctx, principal, threadID, input)
}

func (s *Service) CreateThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error) {
	return s.repo.CreateThread(ctx, principal, input)
}

func (s *Service) CreateAnonymousThread(ctx context.Context, principal security.Principal, input CreateThreadRequest) (Thread, error) {
	return s.repo.CreateAnonymousThread(ctx, principal, input)
}

func (s *Service) CreateReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error) {
	return s.repo.CreateReply(ctx, principal, threadID, input)
}

func (s *Service) CreateAnonymousReply(ctx context.Context, principal security.Principal, threadID string, input CreateReplyRequest) (Reply, error) {
	return s.repo.CreateAnonymousReply(ctx, principal, threadID, input)
}

func (s *Service) DeleteThread(ctx context.Context, principal security.Principal, threadID string) (DeleteThreadResult, error) {
	return s.repo.DeleteThread(ctx, principal, threadID)
}

func (s *Service) DeleteReply(ctx context.Context, principal security.Principal, threadID, replyID string) (DeleteReplyResult, error) {
	return s.repo.DeleteReply(ctx, principal, threadID, replyID)
}
