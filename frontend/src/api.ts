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

export interface AdminUser {
  user_id: string;
  username: string;
  nickname: string;
  status: string;
  verified: boolean;
  roles: string[];
  pending_verification_id?: string;
}

export interface AdminDashboard {
  total_users: number;
  pending_verification_users: number;
  verified_users: number;
  admin_users: number;
  super_admin_users: number;
  role_distribution: Record<string, number>;
  verification_approval_rule: string;
}

export interface SuperAdminDashboard extends AdminDashboard {
  relay_events: number;
  relay_entries: number;
  writing_contests: number;
  writing_submissions: number;
  content_reports_open: number;
  site_content_blocks: number;
  gallery_entries: number;
  luckybot_sessions: number;
  luckybot_admin_actions: number;
}

export interface UpdateUserStatusPayload {
  status: string;
}

export interface ReviewVerificationPayload {
  action: string;
  note?: string;
}

export interface VerificationDecisionResult {
  request_id: string;
  user_id: string;
  review_action: string;
  approved_count: number;
  rejected_count: number;
  required_approvals: number;
  final_status: string;
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
  tripcode?: string;
  locked: boolean;
  tags: string[];
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  last_post_at: string;
  created_at: string;
}

export interface ForumReply {
  id: string;
  thread_id: string;
  parent_id?: string;
  floor_no: number;
  parent_floor_no?: number;
  reply_to_author?: string;
  content: string;
  author: string;
  tripcode?: string;
  anonymous: boolean;
  created_at: string;
}

export interface ForumThreadDetail {
  thread: ForumThread;
  replies: ForumReply[];
}

export interface ForumLevelConfig {
  level: number;
  min_exp: number;
  title_name: string;
  privileges?: Record<string, unknown>;
}

export interface ForumLevelSummary {
  current_level: number;
  title_name: string;
  total_exp: number;
  next_level: number;
  next_level_exp: number;
  exp_to_next: number;
  signed_in_today: boolean;
  last_sign_in_at?: string;
}

export interface ForumExpActionLog {
  log_id: string;
  action_type: string;
  exp_delta: number;
  target_id?: string;
  action_date: string;
  created_at: string;
}

export interface ForumProgress {
  summary: ForumLevelSummary;
  levels: ForumLevelConfig[];
  recent_logs: ForumExpActionLog[];
}

export interface ForumSignInResult {
  status: string;
  exp_delta: number;
  progress: ForumProgress;
  message: string;
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
  parent_id?: string;
  sage?: boolean;
}

export interface WallEntry {
  id: string;
  title: string;
  content: string;
  images: string[];
  approved: boolean;
  contributor: string;
  status?: string;
  created_at?: string;
}

export interface CreateWallSubmissionPayload {
  title: string;
  content: string;
  images: string[];
}

export interface RelayEvent {
  id: string;
  title: string;
  description: string;
  rules: string;
  status: string;
  allow_unverified: boolean;
  created_by: string;
  starts_at?: string;
  ends_at?: string;
  entry_count: number;
}

export interface WritingContest {
  id: string;
  title: string;
  description: string;
  rules: string;
  status: string;
  allow_article_repost: boolean;
  created_by: string;
  starts_at?: string;
  ends_at?: string;
  submission_count: number;
}

export interface CreateRelayPayload {
  title: string;
  description?: string;
  rules?: string;
  allow_unverified: boolean;
  starts_at?: string;
  ends_at?: string;
}

export interface UpdateRelayStatusPayload {
  status: string;
}

export interface CreateWritingContestPayload {
  title: string;
  description?: string;
  rules?: string;
  allow_article_repost: boolean;
  starts_at?: string;
  ends_at?: string;
}

export interface UpdateWritingContestStatusPayload {
  status: string;
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

export interface CreateContentBlockPayload {
  block_type: SiteContentBlock["block_type"];
  slug?: string;
  path?: string;
  kicker?: string;
  label?: string;
  title: string;
  description?: string;
  body?: string;
  sort_order?: number;
  active?: boolean;
}

export interface UpdateContentBlockPayload {
  slug?: string;
  path?: string;
  kicker?: string;
  label?: string;
  title?: string;
  description?: string;
  body?: string;
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

export function fetchForumProgress(token: string): Promise<ForumProgress> {
  return request<ForumProgress>("/forum/me/progression", { token });
}

export function signInForum(token: string): Promise<ForumSignInResult> {
  return request<ForumSignInResult>("/forum/sign-in", {
    method: "POST",
    token,
  });
}

export function fetchAnonymousThreadDetail(
  threadID: string,
  token?: string,
): Promise<ForumThreadDetail> {
  return request<ForumThreadDetail>(`/forum/anonymous/threads/${encodeURIComponent(threadID)}`, {
    token,
  });
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

export function fetchWallEntries(params?: ListParams): Promise<Paginated<WallEntry>> {
  return request<Paginated<WallEntry>>(withListQuery("/wall", params));
}

export function fetchWallSubmissions(token: string, params?: ListParams): Promise<Paginated<WallEntry>> {
  return request<Paginated<WallEntry>>(withListQuery("/wall/submissions", params), {
    token,
  });
}

export function fetchRelays(params?: ListParams): Promise<Paginated<RelayEvent>> {
  return request<Paginated<RelayEvent>>(withListQuery("/activities/relays", params));
}

export function fetchWritingContests(params?: ListParams): Promise<Paginated<WritingContest>> {
  return request<Paginated<WritingContest>>(withListQuery("/activities/contests", params));
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

export function reviewWallSubmission(
  token: string,
  submissionID: string,
  body: { decision: string; comment?: string },
): Promise<{ submission_id: string; status: string }> {
  return request<{ submission_id: string; status: string }>(
    `/wall/submissions/${encodeURIComponent(submissionID)}/review`,
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function fetchSiteContent(): Promise<SiteContent> {
  return request<SiteContent>("/site/content");
}

export function fetchAdminContentBlocks(
  token: string,
  params?: ListParams,
): Promise<Paginated<SiteContentBlock>> {
  return request<Paginated<SiteContentBlock>>(withListQuery("/admin/site/content-blocks", params), {
    token,
  });
}

export function createContentBlock(
  token: string,
  body: CreateContentBlockPayload,
): Promise<SiteContentBlock> {
  return request<SiteContentBlock>("/admin/site/content-blocks", {
    method: "POST",
    token,
    body,
  });
}

export function updateContentBlock(
  token: string,
  blockID: string,
  body: UpdateContentBlockPayload,
): Promise<SiteContentBlock> {
  return request<SiteContentBlock>(`/admin/site/content-blocks/${encodeURIComponent(blockID)}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteContentBlock(token: string, blockID: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/admin/site/content-blocks/${encodeURIComponent(blockID)}`, {
    method: "DELETE",
    token,
  });
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

export function createRelay(token: string, body: CreateRelayPayload): Promise<RelayEvent> {
  return request<RelayEvent>("/admin/activities/relays", {
    method: "POST",
    token,
    body,
  });
}

export function updateRelayStatus(
  token: string,
  relayID: string,
  body: UpdateRelayStatusPayload,
): Promise<RelayEvent> {
  return request<RelayEvent>(`/admin/activities/relays/${encodeURIComponent(relayID)}/status`, {
    method: "PATCH",
    token,
    body,
  });
}

export function createWritingContest(
  token: string,
  body: CreateWritingContestPayload,
): Promise<WritingContest> {
  return request<WritingContest>("/admin/activities/contests", {
    method: "POST",
    token,
    body,
  });
}

export function updateWritingContestStatus(
  token: string,
  contestID: string,
  body: UpdateWritingContestStatusPayload,
): Promise<WritingContest> {
  return request<WritingContest>(`/admin/activities/contests/${encodeURIComponent(contestID)}/status`, {
    method: "PATCH",
    token,
    body,
  });
}
