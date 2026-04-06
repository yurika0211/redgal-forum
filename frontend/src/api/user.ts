import { request, withListQuery } from "./request";
import type {
  AdminDashboard,
  AdminUser,
  BangumiCollection,
  BangumiImportJob,
  BangumiImportPayload,
  CreateFriendRequestPayload,
  FriendRequest,
  FriendSummary,
  ListParams,
  ModerateUserPayload,
  Paginated,
  Profile,
  ReviewFriendRequestPayload,
  ReviewFriendRequestResult,
  ReviewVerificationPayload,
  SuperAdminDashboard,
  UpdateBangumiJobStatusPayload,
  UpdateMyBangumiCollectionPayload,
  UpdateProfilePayload,
  UpdateUserStatusPayload,
  VerificationDecisionResult,
} from "./types";

export function fetchMyProfile(token: string): Promise<Profile> {
  return request<Profile>("/users/me", { token });
}

export function fetchPublicProfile(username: string): Promise<Profile> {
  return request<Profile>(`/users/${encodeURIComponent(username)}`);
}

export function updateMyProfile(token: string, body: UpdateProfilePayload): Promise<Profile> {
  return request<Profile>("/users/me", {
    method: "PATCH",
    token,
    body,
  });
}

export function fetchMyFriends(token: string, params?: ListParams): Promise<Paginated<FriendSummary>> {
  return request<Paginated<FriendSummary>>(withListQuery("/users/me/friends", params), { token });
}

export function fetchUserFriends(username: string, params?: ListParams): Promise<Paginated<FriendSummary>> {
  return request<Paginated<FriendSummary>>(
    withListQuery(`/users/${encodeURIComponent(username)}/friends`, params),
  );
}

export function fetchIncomingFriendRequests(token: string, params?: ListParams): Promise<Paginated<FriendRequest>> {
  return request<Paginated<FriendRequest>>(withListQuery("/users/me/friend-requests/incoming", params), {
    token,
  });
}

export function fetchOutgoingFriendRequests(token: string, params?: ListParams): Promise<Paginated<FriendRequest>> {
  return request<Paginated<FriendRequest>>(withListQuery("/users/me/friend-requests/outgoing", params), {
    token,
  });
}

export function createFriendRequest(token: string, body: CreateFriendRequestPayload): Promise<FriendRequest> {
  return request<FriendRequest>("/users/me/friend-requests", {
    method: "POST",
    token,
    body,
  });
}

export function reviewFriendRequest(
  token: string,
  requestID: string,
  body: ReviewFriendRequestPayload,
): Promise<ReviewFriendRequestResult> {
  return request<ReviewFriendRequestResult>(`/users/me/friend-requests/${encodeURIComponent(requestID)}/review`, {
    method: "POST",
    token,
    body,
  });
}

export function importBangumiCollections(
  token: string,
  body: BangumiImportPayload,
): Promise<BangumiImportJob> {
  return request<BangumiImportJob>("/users/me/bangumi/import", {
    method: "POST",
    token,
    body,
  });
}

export function fetchMyBangumiJobs(token: string, params?: ListParams): Promise<Paginated<BangumiImportJob>> {
  return request<Paginated<BangumiImportJob>>(withListQuery("/users/me/bangumi/jobs", params), {
    token,
  });
}

export function fetchMyBangumiCollections(
  token: string,
  params?: ListParams,
): Promise<Paginated<BangumiCollection>> {
  return request<Paginated<BangumiCollection>>(withListQuery("/users/me/bangumi/collections", params), {
    token,
  });
}

export function fetchUserBangumiCollections(
  username: string,
  params?: ListParams,
): Promise<Paginated<BangumiCollection>> {
  return request<Paginated<BangumiCollection>>(
    withListQuery(`/users/${encodeURIComponent(username)}/bangumi/collections`, params),
  );
}

export function updateMyBangumiCollection(
  token: string,
  collectionID: string,
  body: UpdateMyBangumiCollectionPayload,
): Promise<BangumiCollection> {
  return request<BangumiCollection>(`/users/me/bangumi/collections/${encodeURIComponent(collectionID)}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function fetchAdminDashboard(token: string): Promise<AdminDashboard> {
  return request<AdminDashboard>("/admin/dashboard", { token });
}

export function fetchSuperAdminDashboard(token: string): Promise<SuperAdminDashboard> {
  return request<SuperAdminDashboard>("/super-admin/dashboard", { token });
}

export function fetchAdminUsers(token: string, params?: ListParams): Promise<Paginated<AdminUser>> {
  return request<Paginated<AdminUser>>(withListQuery("/admin/users", params), { token });
}

export function updateAdminUserStatus(
  token: string,
  userID: string,
  body: UpdateUserStatusPayload,
): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${encodeURIComponent(userID)}/status`, {
    method: "PATCH",
    token,
    body,
  });
}

export function moderateAdminUser(
  token: string,
  userID: string,
  body: ModerateUserPayload,
): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${encodeURIComponent(userID)}/moderation`, {
    method: "POST",
    token,
    body,
  });
}

export function reviewUserVerification(
  token: string,
  userID: string,
  body: ReviewVerificationPayload,
): Promise<VerificationDecisionResult> {
  return request<VerificationDecisionResult>(`/admin/users/${encodeURIComponent(userID)}/verification/reviews`, {
    method: "POST",
    token,
    body,
  });
}

export function fetchAdminBangumiJobs(
  token: string,
  params?: ListParams,
): Promise<Paginated<BangumiImportJob>> {
  return request<Paginated<BangumiImportJob>>(withListQuery("/admin/bangumi/jobs", params), {
    token,
  });
}

export function updateBangumiJobStatus(
  token: string,
  jobID: string,
  body: UpdateBangumiJobStatusPayload,
): Promise<BangumiImportJob> {
  return request<BangumiImportJob>(`/admin/bangumi/jobs/${encodeURIComponent(jobID)}/status`, {
    method: "PATCH",
    token,
    body,
  });
}
