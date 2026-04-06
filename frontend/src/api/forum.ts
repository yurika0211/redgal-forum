import { request, withListQuery } from "./request";
import type {
  CreateReplyPayload,
  CreateThreadPayload,
  DeleteForumReplyResult,
  DeleteForumThreadResult,
  ForumAvailabilitySettings,
  ForumProgress,
  ForumReply,
  ForumSignInResult,
  ForumThread,
  ForumThreadDetail,
  ForumThreadReplySnapshot,
  ListParams,
  Paginated,
  UpdateForumAvailabilitySettingsPayload,
} from "./types";

export function fetchThreads(token?: string, params?: ListParams): Promise<Paginated<ForumThread>> {
  return request<Paginated<ForumThread>>(withListQuery("/forum/threads", params), { token });
}

export function fetchAnonymousThreads(
  token?: string,
  params?: ListParams,
): Promise<Paginated<ForumThread>> {
  return request<Paginated<ForumThread>>(withListQuery("/forum/anonymous/threads", params), {
    token,
  });
}

export function fetchThreadDetail(threadID: string, token?: string): Promise<ForumThreadDetail> {
  return request<ForumThreadDetail>(`/forum/threads/${encodeURIComponent(threadID)}`, { token });
}

export function fetchAnonymousThreadDetail(
  threadID: string,
  token?: string,
): Promise<ForumThreadDetail> {
  return request<ForumThreadDetail>(`/forum/anonymous/threads/${encodeURIComponent(threadID)}`, {
    token,
  });
}

export function fetchSuperAdminForumSettings(token: string): Promise<ForumAvailabilitySettings> {
  return request<ForumAvailabilitySettings>("/super-admin/forum/settings", { token });
}

export function updateSuperAdminForumSettings(
  body: UpdateForumAvailabilitySettingsPayload,
  token: string,
): Promise<ForumAvailabilitySettings> {
  return request<ForumAvailabilitySettings>("/super-admin/forum/settings", {
    method: "PATCH",
    body,
    token,
  });
}

export function fetchForumProgress(token: string): Promise<ForumProgress> {
  return request<ForumProgress>("/forum/me/progression", { token });
}

export function fetchMyThreadReplySnapshots(
  token: string,
  params?: ListParams,
): Promise<Paginated<ForumThreadReplySnapshot>> {
  return request<Paginated<ForumThreadReplySnapshot>>(
    withListQuery("/forum/me/thread-reply-snapshots", params),
    { token },
  );
}

export function signInForum(token: string): Promise<ForumSignInResult> {
  return request<ForumSignInResult>("/forum/sign-in", {
    method: "POST",
    token,
  });
}

export function createThread(body: CreateThreadPayload, token: string): Promise<ForumThread> {
  return request<ForumThread>("/forum/threads", {
    method: "POST",
    body,
    token,
  });
}

export function createAnonymousThread(
  body: Omit<CreateThreadPayload, "board" | "anonymous">,
  token: string,
): Promise<ForumThread> {
  return request<ForumThread>("/forum/anonymous/threads", {
    method: "POST",
    body: {
      ...body,
      board: "匿名板",
      anonymous: true,
    },
    token,
  });
}

export function createReply(
  threadID: string,
  body: CreateReplyPayload,
  token: string,
): Promise<ForumReply> {
  return request<ForumReply>(`/forum/threads/${encodeURIComponent(threadID)}/replies`, {
    method: "POST",
    body,
    token,
  });
}

export function createAnonymousReply(
  threadID: string,
  body: Omit<CreateReplyPayload, "anonymous">,
  token: string,
): Promise<ForumReply> {
  return request<ForumReply>(`/forum/anonymous/threads/${encodeURIComponent(threadID)}/replies`, {
    method: "POST",
    body: {
      ...body,
      anonymous: true,
    },
    token,
  });
}

export function deleteThread(threadID: string, token: string): Promise<DeleteForumThreadResult> {
  return request<DeleteForumThreadResult>(`/admin/forum/threads/${encodeURIComponent(threadID)}`, {
    method: "DELETE",
    token,
  });
}

export function deleteReply(
  threadID: string,
  replyID: string,
  token: string,
): Promise<DeleteForumReplyResult> {
  return request<DeleteForumReplyResult>(
    `/admin/forum/threads/${encodeURIComponent(threadID)}/replies/${encodeURIComponent(replyID)}`,
    {
      method: "DELETE",
      token,
    },
  );
}
