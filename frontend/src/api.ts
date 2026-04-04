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
  q?: string;
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

export interface RegisterPayload {
  student_id: string;
  username: string;
  password: string;
}

export interface RegisterResult {
  user_id: string;
  username: string;
  status: string;
  verified: boolean;
  roles: string[];
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
  space_id_editable?: boolean;
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
  status?: string;
  verified?: boolean;
  roles?: string[];
  collections: Record<string, number>;
}

export interface FriendSummary {
  user_id: string;
  username: string;
  nickname: string;
  avatar_url: string;
  signature: string;
}

export interface FriendRequest {
  request_id: string;
  requester_id: string;
  requester_username: string;
  requester_nickname: string;
  requester_avatar_url: string;
  receiver_id: string;
  receiver_username: string;
  receiver_nickname: string;
  receiver_avatar_url: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  message: string;
  created_at: string;
  reviewed_at?: string;
}

export interface CreateFriendRequestPayload {
  username: string;
  message?: string;
}

export interface ReviewFriendRequestPayload {
  action: "approve" | "reject";
}

export interface ReviewFriendRequestResult {
  request_id: string;
  status: string;
}

export interface UpdateProfilePayload {
  username: string;
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
}

export interface BangumiImportPayload {
  subject_ids?: number[];
  status?: string;
  visibility?: string;
  sync_mode?: "subject_ids" | "account";
  bangumi_username?: string;
  max_items?: number;
}

export interface BangumiImportJob {
  job_id: string;
  user_id?: string;
  username?: string;
  external_account_id?: string;
  job_type?: string;
  status: string;
  channel: string;
  request_payload?: Record<string, unknown>;
  result_payload?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BangumiCollection {
  collection_id: string;
  subject_id: string;
  bgm_subject_id: number;
  subject_url?: string;
  subject_type: number;
  name: string;
  name_cn?: string;
  summary?: string;
  cover_image_url?: string;
  air_date?: string;
  rating_score?: number;
  rank_no?: number;
  platforms: string[];
  collection_status: "wish" | "doing" | "collect" | "on_hold" | "dropped";
  my_score?: number;
  my_comment?: string;
  visibility: "public" | "members" | "private";
  synced_at?: string;
  updated_at?: string;
}

export interface UpdateMyBangumiCollectionPayload {
  collection_status: "wish" | "doing" | "collect" | "on_hold" | "dropped";
  my_score?: number | null;
  my_comment?: string;
}

export interface UpdateBangumiJobStatusPayload {
  status: string;
  result_payload?: Record<string, unknown>;
  error_message?: string;
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

export interface ModerateUserPayload {
  action: "mute" | "unmute" | "ban" | "unban" | "demote";
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
  comment_count?: number;
  like_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateArticlePayload {
  title: string;
  summary: string;
  content: string;
  visibility: "public" | "member" | "private";
  tags: string[];
}

export interface DeleteArticleResult {
  article_id: string;
  status: string;
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
    | "portal_notice"
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
  portal_notices: SiteContentBlock[];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isApiEnvelopeValue<T>(value: unknown): value is ApiEnvelope<T> {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.ok !== "boolean") {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(value, "data") ||
    Object.prototype.hasOwnProperty.call(value, "error") ||
    Object.prototype.hasOwnProperty.call(value, "request_id")
  );
}

function parseJSONLoose(text: string): unknown {
  const normalized = text.trim().replace(/^\uFEFF/, "");
  if (!normalized) {
    return null;
  }

  const candidates = [normalized];

  const withoutNullPrefix = normalized.replace(/^null\s*(?=[{\[])/i, "");
  if (withoutNullPrefix !== normalized) {
    candidates.push(withoutNullPrefix);
  }

  const firstObjectStart = withoutNullPrefix.indexOf("{");
  const lastObjectEnd = withoutNullPrefix.lastIndexOf("}");
  if (firstObjectStart >= 0 && lastObjectEnd > firstObjectStart) {
    candidates.push(withoutNullPrefix.slice(firstObjectStart, lastObjectEnd + 1));
  }

  const firstArrayStart = withoutNullPrefix.indexOf("[");
  const lastArrayEnd = withoutNullPrefix.lastIndexOf("]");
  if (firstArrayStart >= 0 && lastArrayEnd > firstArrayStart) {
    candidates.push(withoutNullPrefix.slice(firstArrayStart, lastArrayEnd + 1));
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("invalid JSON response");
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
  if (typeof params.q === "string" && params.q.trim()) {
    searchParams.set("q", params.q.trim());
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
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = parseJSONLoose(text);
    } catch (error) {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      throw new Error(`Response is not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`);
    }
  }

  const envelope = isApiEnvelopeValue<T>(parsed) ? parsed : null;

  if (!response.ok || envelope?.ok === false) {
    if (envelope?.error) {
      throw new Error(envelope.error);
    }

    const compact = text.replace(/\s+/g, " ").trim();
    throw new Error(compact || `Request failed with status ${response.status}`);
  }

  if (envelope) {
    if (!Object.prototype.hasOwnProperty.call(envelope, "data")) {
      throw new Error("Response payload missing data");
    }

    return envelope.data as T;
  }

  if (parsed !== null) {
    return parsed as T;
  }

  throw new Error("Response payload missing data");
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

export function registerAccount(body: RegisterPayload): Promise<RegisterResult> {
  return request<RegisterResult>("/auth/register", {
    method: "POST",
    body,
  });
}

export function logout(token: string): Promise<{ status: string }> {
  return request<{ status: string }>("/auth/logout", {
    method: "POST",
    token,
  });
}

export function fetchMyProfile(token: string): Promise<Profile> {
  return request<Profile>("/users/me", { token });
}

export function fetchMyFriends(token: string, params?: ListParams): Promise<Paginated<FriendSummary>> {
  return request<Paginated<FriendSummary>>(withListQuery("/users/me/friends", params), { token });
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

export function updateArticle(
  articleID: string,
  body: CreateArticlePayload,
  token: string,
): Promise<Article> {
  return request<Article>(`/articles/${encodeURIComponent(articleID)}`, {
    method: "PATCH",
    body,
    token,
  });
}

export function deleteArticle(articleID: string, token: string): Promise<DeleteArticleResult> {
  return request<DeleteArticleResult>(`/admin/articles/${encodeURIComponent(articleID)}`, {
    method: "DELETE",
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
