const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginPayload {
  account: string;
  password: string;
}

export interface HealthData {
  app: string;
  env: string;
  services: Record<string, boolean>;
  service_details?: Record<
    string,
    {
      configured: boolean;
      reachable: boolean;
      error?: string;
    }
  >;
  modules: string[];
}

export interface Profile {
  user_id: string;
  username: string;
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
  status?: string;
  verified?: boolean;
  roles?: string[];
  collections: Record<string, number>;
}

export interface UpdateProfilePayload {
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
}

export interface BangumiImportPayload {
  subject_ids: number[];
  status: string;
  visibility?: string;
}

export interface BangumiImportJob {
  job_id: string;
  status: string;
  channel: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  visibility: string;
  author: string;
  tags: string[];
}

export interface CreateArticlePayload {
  title: string;
  summary: string;
  content: string;
  visibility: "public" | "member" | "private";
  tags: string[];
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  board: string;
  anonymous: boolean;
  author: string;
  tags: string[];
  reply_count: number;
}

export interface ForumReply {
  id: string;
  thread_id: string;
  content: string;
  author: string;
  anonymous: boolean;
}

export interface ForumThreadDetail {
  thread: ForumThread;
  replies: ForumReply[];
}

export interface CreateThreadPayload {
  title: string;
  content: string;
  board: string;
  anonymous: boolean;
  tags: string[];
}

export interface CreateReplyPayload {
  content: string;
  anonymous: boolean;
}

export interface WallEntry {
  id: string;
  title: string;
  content: string;
  images: string[];
  approved: boolean;
  contributor: string;
}

export interface CreateWallSubmissionPayload {
  title: string;
  content: string;
  images: string[];
}

export interface SiteContentBlock {
  id: string;
  block_type:
    | "hero_object"
    | "portal_page"
    | "portal_highlight"
    | "portal_pillar"
    | "portal_activity"
    | "portal_join_step";
  slug: string;
  path?: string;
  kicker?: string;
  label?: string;
  title: string;
  description?: string;
  body?: string;
  sort_order: number;
  active: boolean;
}

export interface SiteGalleryEntry {
  id: string;
  entry_type: "album" | "polaroid" | "paper" | "timeline" | "track";
  slug: string;
  title: string;
  subtitle?: string;
  body?: string;
  extra_text?: string;
  sort_order: number;
  active: boolean;
}

export interface CreateGalleryEntryPayload {
  entry_type: SiteGalleryEntry["entry_type"];
  slug?: string;
  title: string;
  subtitle?: string;
  body?: string;
  extra_text?: string;
  sort_order?: number;
  active?: boolean;
}

export interface UpdateGalleryEntryPayload {
  slug?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  extra_text?: string;
  sort_order?: number;
  active?: boolean;
}

export interface SiteContent {
  hero_objects: SiteContentBlock[];
  portal_pages: SiteContentBlock[];
  portal_highlights: SiteContentBlock[];
  portal_pillars: SiteContentBlock[];
  portal_activities: SiteContentBlock[];
  portal_join_steps: SiteContentBlock[];
  gallery_entries: SiteGalleryEntry[];
}

interface SessionResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface ApiEnvelope<T> {
  ok: boolean;
  request_id: string;
  data?: T;
  error?: string;
}

interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  token?: string;
  headers?: HeadersInit;
}

function withListQuery(path: string, params?: ListParams): string {
  if (!params) {
    return path;
  }

  const searchParams = new URLSearchParams();
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.pageSize) {
    searchParams.set("page_size", String(params.pageSize));
  }

  const suffix = searchParams.toString();
  return suffix ? `${path}?${suffix}` : path;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const requestHeaders = new Headers(headers || {});

  requestHeaders.set("Accept", "application/json");

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "data")) {
    throw new Error("Response payload missing data");
  }

  return payload.data as T;
}

export function fetchHealth(token?: string): Promise<HealthData> {
  return request<HealthData>("/health", { token });
}

export async function login(body: LoginPayload): Promise<Session> {
  const session = await request<SessionResponse>("/auth/login", {
    method: "POST",
    body,
  });

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  };
}

export function fetchMyProfile(token: string): Promise<Profile> {
  return request<Profile>("/users/me", { token });
}

export function updateMyProfile(token: string, body: UpdateProfilePayload): Promise<Profile> {
  return request<Profile>("/users/me", {
    method: "PATCH",
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

export function fetchPublicProfile(username: string): Promise<Profile> {
  return request<Profile>(`/users/${encodeURIComponent(username)}`);
}

export function fetchArticles(token?: string, params?: ListParams): Promise<Paginated<Article>> {
  return request<Paginated<Article>>(withListQuery("/articles", params), { token });
}

export function fetchArticleDetail(articleID: string, token?: string): Promise<Article> {
  return request<Article>(`/articles/${encodeURIComponent(articleID)}`, { token });
}

export function fetchThreads(token?: string, params?: ListParams): Promise<Paginated<ForumThread>> {
  return request<Paginated<ForumThread>>(withListQuery("/forum/threads", params), { token });
}

export function fetchThreadDetail(threadID: string, token?: string): Promise<ForumThreadDetail> {
  return request<ForumThreadDetail>(`/forum/threads/${encodeURIComponent(threadID)}`, { token });
}

export function createArticle(body: CreateArticlePayload, token: string): Promise<Article> {
  return request<Article>("/articles", {
    method: "POST",
    body,
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

export function createReply(
  threadID: string,
  body: CreateReplyPayload,
  token: string,
): Promise<void> {
  return request<void>(`/forum/threads/${encodeURIComponent(threadID)}/replies`, {
    method: "POST",
    body,
    token,
  });
}

export function fetchWallEntries(params?: ListParams): Promise<Paginated<WallEntry>> {
  return request<Paginated<WallEntry>>(withListQuery("/wall", params));
}

export function createWallSubmission(
  body: CreateWallSubmissionPayload,
  token: string,
): Promise<WallEntry> {
  return request<WallEntry>("/wall/submissions", {
    method: "POST",
    body,
    token,
  });
}

export function fetchSiteContent(): Promise<SiteContent> {
  return request<SiteContent>("/site/content");
}

export function fetchAdminGalleryEntries(token: string, params?: ListParams): Promise<Paginated<SiteGalleryEntry>> {
  return request<Paginated<SiteGalleryEntry>>(withListQuery("/admin/site/gallery-entries", params), {
    token,
  });
}

export function createGalleryEntry(token: string, body: CreateGalleryEntryPayload): Promise<SiteGalleryEntry> {
  return request<SiteGalleryEntry>("/admin/site/gallery-entries", {
    method: "POST",
    token,
    body,
  });
}

export function updateGalleryEntry(
  token: string,
  entryID: string,
  body: UpdateGalleryEntryPayload,
): Promise<SiteGalleryEntry> {
  return request<SiteGalleryEntry>(`/admin/site/gallery-entries/${encodeURIComponent(entryID)}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteGalleryEntry(token: string, entryID: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/admin/site/gallery-entries/${encodeURIComponent(entryID)}`, {
    method: "DELETE",
    token,
  });
}
