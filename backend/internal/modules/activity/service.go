package activity

import (
	"context"

	"example.com/rubedo/backend/internal/security"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListRelays(ctx context.Context) ([]RelayEvent, error) {
	return s.repo.ListRelays(ctx)
}

func (s *Service) GetRelay(ctx context.Context, relayID string) (RelayDetail, error) {
	return s.repo.GetRelay(ctx, relayID)
}

func (s *Service) CreateRelay(ctx context.Context, principal security.Principal, input CreateRelayRequest) (RelayEvent, error) {
	return s.repo.CreateRelay(ctx, principal, input)
}

func (s *Service) UpdateRelayStatus(ctx context.Context, principal security.Principal, relayID string, input UpdateRelayStatusRequest) (RelayEvent, error) {
	return s.repo.UpdateRelayStatus(ctx, principal, relayID, input)
}

func (s *Service) CreateRelayEntry(ctx context.Context, principal security.Principal, relayID string, input CreateRelayEntryRequest) (RelayEntry, error) {
	return s.repo.CreateRelayEntry(ctx, principal, relayID, input)
}

func (s *Service) ListWritingContests(ctx context.Context) ([]WritingContest, error) {
	return s.repo.ListWritingContests(ctx)
}

func (s *Service) GetWritingContest(ctx context.Context, contestID string) (WritingContestDetail, error) {
	return s.repo.GetWritingContest(ctx, contestID)
}

func (s *Service) CreateWritingContest(ctx context.Context, principal security.Principal, input CreateWritingContestRequest) (WritingContest, error) {
	return s.repo.CreateWritingContest(ctx, principal, input)
}

func (s *Service) UpdateWritingContestStatus(ctx context.Context, principal security.Principal, contestID string, input UpdateWritingContestStatusRequest) (WritingContest, error) {
	return s.repo.UpdateWritingContestStatus(ctx, principal, contestID, input)
}

func (s *Service) CreateWritingSubmission(ctx context.Context, principal security.Principal, contestID string, input CreateWritingSubmissionRequest) (WritingSubmission, error) {
	return s.repo.CreateWritingSubmission(ctx, principal, contestID, input)
}
