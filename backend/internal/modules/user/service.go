package user

import (
	"context"

	"example.com/rubedo/backend/internal/pagination"
	"example.com/rubedo/backend/internal/security"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetProfile(ctx context.Context, username string) (Profile, error) {
	return s.repo.GetProfile(ctx, username)
}

func (s *Service) GetMe(ctx context.Context, principal security.Principal) (Profile, error) {
	return s.repo.GetMe(ctx, principal)
}

func (s *Service) UpdateMe(ctx context.Context, principal security.Principal, input UpdateProfileRequest) (Profile, error) {
	return s.repo.UpdateMe(ctx, principal, input)
}

func (s *Service) QueueBangumiImport(ctx context.Context, principal security.Principal, input BangumiImportRequest) (BangumiImportJob, error) {
	return s.repo.QueueBangumiImport(ctx, principal, input)
}

func (s *Service) ListMyBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error) {
	return s.repo.ListMyBangumiImportJobs(ctx, principal, params)
}

func (s *Service) ListMyBangumiCollections(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiCollection], error) {
	return s.repo.ListMyBangumiCollections(ctx, principal, params)
}

func (s *Service) ListUserBangumiCollections(ctx context.Context, username string, params pagination.Params) (pagination.Result[BangumiCollection], error) {
	return s.repo.ListUserBangumiCollections(ctx, username, params)
}

func (s *Service) UpdateMyBangumiCollection(
	ctx context.Context,
	principal security.Principal,
	collectionID string,
	input UpdateBangumiCollectionRequest,
) (BangumiCollection, error) {
	return s.repo.UpdateMyBangumiCollection(ctx, principal, collectionID, input)
}

func (s *Service) ListBangumiImportJobs(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[BangumiImportJob], error) {
	return s.repo.ListBangumiImportJobs(ctx, principal, params)
}

func (s *Service) UpdateBangumiImportJobStatus(ctx context.Context, principal security.Principal, jobID string, input UpdateBangumiJobStatusRequest) (BangumiImportJob, error) {
	return s.repo.UpdateBangumiImportJobStatus(ctx, principal, jobID, input)
}

func (s *Service) GetAdminDashboard(ctx context.Context, principal security.Principal) (AdminDashboard, error) {
	return s.repo.GetAdminDashboard(ctx, principal)
}

func (s *Service) GetSuperAdminDashboard(ctx context.Context, principal security.Principal) (SuperAdminDashboard, error) {
	return s.repo.GetSuperAdminDashboard(ctx, principal)
}

func (s *Service) ListAdminUsers(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[AdminUser], error) {
	return s.repo.ListAdminUsers(ctx, principal, params)
}

func (s *Service) UpdateUserStatus(ctx context.Context, principal security.Principal, userID string, input UpdateUserStatusRequest) (AdminUser, error) {
	return s.repo.UpdateUserStatus(ctx, principal, userID, input)
}

func (s *Service) ModerateUser(ctx context.Context, principal security.Principal, userID string, input ModerateUserRequest) (AdminUser, error) {
	return s.repo.ModerateUser(ctx, principal, userID, input)
}

func (s *Service) ReviewVerification(ctx context.Context, principal security.Principal, userID string, input VerificationDecisionRequest) (VerificationDecisionResult, error) {
	return s.repo.ReviewVerification(ctx, principal, userID, input)
}

func (s *Service) ListFriends(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[FriendSummary], error) {
	return s.repo.ListFriends(ctx, principal, params)
}

func (s *Service) ListIncomingFriendRequests(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[FriendRequest], error) {
	return s.repo.ListIncomingFriendRequests(ctx, principal, params)
}

func (s *Service) ListOutgoingFriendRequests(ctx context.Context, principal security.Principal, params pagination.Params) (pagination.Result[FriendRequest], error) {
	return s.repo.ListOutgoingFriendRequests(ctx, principal, params)
}

func (s *Service) CreateFriendRequest(ctx context.Context, principal security.Principal, input CreateFriendRequest) (FriendRequest, error) {
	return s.repo.CreateFriendRequest(ctx, principal, input)
}

func (s *Service) ReviewFriendRequest(
	ctx context.Context,
	principal security.Principal,
	requestID string,
	input ReviewFriendRequest,
) (ReviewFriendRequestResult, error) {
	return s.repo.ReviewFriendRequest(ctx, principal, requestID, input)
}
