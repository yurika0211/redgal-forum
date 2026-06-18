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
  like_count: number;
  favorite_count: number;
  liked: boolean;
  favorited: boolean;
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

export interface DeleteForumThreadResult {
  thread_id: string;
  status: string;
}

export interface DeleteForumReplyResult {
  thread_id: string;
  reply_id: string;
  status: string;
}

export interface UpdateThreadEngagementPayload {
  liked?: boolean;
  favorited?: boolean;
}

export interface ThreadEngagement {
  thread_id: string;
  liked: boolean;
  favorited: boolean;
  like_count: number;
  favorite_count: number;
}

export interface ForumThreadReplySnapshot {
  thread_id: string;
  title: string;
  reply_count: number;
  last_post_at: string;
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

export interface ForumAvailabilitySettings {
  forum_enabled: boolean;
  anonymous_enabled: boolean;
}

export interface UpdateForumAvailabilitySettingsPayload {
  forum_enabled?: boolean;
  anonymous_enabled?: boolean;
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

export interface GalleryAsset {
  url: string;
  filename: string;
  original_name?: string;
  content_type?: string;
  size?: number;
}

export interface GalleryAssetUploadResult {
  files: GalleryAsset[];
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
