import {
  lazy,
  Suspense,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import "./App.css";
import {
  createContentBlock,
  createAnonymousReply,
  createAnonymousThread,
  createArticle,
  createRelay,
  createReply,
  createThread,
  createWritingContest,
  createWallSubmission,
  createGalleryEntry,
  deleteThread,
  deleteArticle,
  deleteContentBlock,
  deleteGalleryEntry,
  fetchAdminContentBlocks,
  fetchAdminBangumiJobs,
  fetchAdminDashboard,
  fetchArticleDetail,
  fetchArticles,
  fetchAdminGalleryEntries,
  fetchAdminUsers,
  fetchForumProgress,
  fetchMyFavoritedThreads,
  fetchAnonymousThreadDetail,
  fetchAnonymousThreads,
  fetchHealth,
  fetchMyBangumiCollections,
  fetchMyBangumiJobs,
  fetchSuperAdminForumSettings,
  fetchUserBangumiCollections,
  fetchMyProfile,
  fetchPublicProfile,
  fetchRelays,
  fetchSiteContent,
  fetchSuperAdminDashboard,
  fetchThreadDetail,
  fetchThreads,
  fetchWallEntries,
  fetchWallSubmissions,
  fetchWritingContests,
  importBangumiCollections,
  reviewWallSubmission,
  reviewUserVerification,
  type Article as ApiArticle,
  type AdminDashboard as ApiAdminDashboard,
  type AdminUser as ApiAdminUser,
  type BangumiImportJob,
  type BangumiImportPayload,
  type BangumiCollection,
  type CreateContentBlockPayload,
  type CreateRelayPayload,
  type CreateArticlePayload,
  type DeleteArticleResult,
  type CreateReplyPayload,
  type CreateThreadPayload,
  type CreateGalleryEntryPayload,
  type CreateWritingContestPayload,
  type CreateWallSubmissionPayload,
  type DeleteForumThreadResult,
  type ForumProgress as ApiForumProgress,
  type ForumReply as ApiForumReply,
  type ForumAvailabilitySettings as ApiForumAvailabilitySettings,
  type ForumSignInResult as ApiForumSignInResult,
  type ForumThread as ApiForumThread,
  type ForumThreadDetail as ApiForumThreadDetail,
  type ThreadEngagement as ApiThreadEngagement,
  type HealthData,
  type Paginated,
  type Profile as ApiProfile,
  type RelayEvent as ApiRelayEvent,
  type SiteGalleryEntry,
  type SiteContentBlock,
  type SuperAdminDashboard as ApiSuperAdminDashboard,
  type UpdateContentBlockPayload,
  type ModerateUserPayload,
  type UpdateRelayStatusPayload,
  type UpdateWritingContestStatusPayload,
  type VerificationDecisionResult as ApiVerificationDecisionResult,
  type WallEntry as ApiWallEntry,
  type WritingContest as ApiWritingContest,
  login,
  logout,
  registerAccount,
  moderateAdminUser,
  updateArticle,
  updateThreadEngagement,
  updateContentBlock,
  signInForum,
  type Session,
  type SiteContent,
  type UpdateProfilePayload,
  type UpdateGalleryEntryPayload,
  updateGalleryEntry,
  uploadGalleryAssets,
  updateRelayStatus,
  updateWritingContestStatus,
  updateSuperAdminForumSettings,
  updateMyProfile,
} from "./api";
import Header, { type HeaderNotificationItem, type NavigationGroup } from "./components/Header";
import ForumProgressPanel from "./components/ForumProgressPanel";
import StatusChip from "./components/StatusChip";
import WorkspaceSidebar, {
  type WorkspaceSidebarIconName,
  type WorkspaceSidebarSection,
} from "./components/WorkspaceSidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/table";
import {
  NAV_ITEMS,
  DEFAULT_PUBLIC_PROFILE_USERNAME,
} from "./content";
import { buildForumReplyTree, forumActionLabel, formatForumFloor, type ForumReplyNode } from "./lib/forum";
import {
  HOME_PAGE_CONFIG_SLUG,
  parseHomeConfigFromBlock,
  serializeHomeConfig,
  type HomeConfig,
} from "./lib/homeConfig";
import {
  createPagerState,
  normalizeListResult,
  type PagerState,
} from "./lib/pagination";
import {
  HEADER_SUMMARY_BY_ROUTE,
  normalizePath,
  readCurrentPath,
  readForumEditorMode,
  readPublicProfileUsername,
  readSelectedAnonymousThreadID,
  readSelectedArticleID,
  readSelectedForumThreadID,
  readStoriesEditorMode,
  TITLE_BY_ROUTE,
} from "./lib/routes";
import { resolveUserRoleRing } from "./lib/roles";
import { persistSession, readStoredSession } from "./lib/session";
import {
  excerpt,
  extractMarkdownPreviewImage,
  formatDateTime,
  formatUpdatedAt,
  galleryEntryTypeLabel,
  isStandardDateLabel,
  isAuthFailure,
  normalizeVisibilityLabel,
  parseLines,
  parseStandardDateLabel,
  parseTags,
  toErrorMessage,
} from "./lib/text";
import { useAppNotifications } from "./hooks/useAppNotifications";
import { useAppRouteState } from "./hooks/useAppRouteState";

const PortalPage = lazy(() => import("./pages/PortalPage"));
const StoriesPage = lazy(() => import("./pages/StoriesPage"));
const ForumPage = lazy(() => import("./pages/ForumPage"));
const AnonymousPage = lazy(() => import("./pages/AnonymousPage"));
const SpacePage = lazy(() => import("./pages/SpacePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));

type ThemeMode = "day" | "night";
type SpaceShelfTab = "anime" | "books" | "games";

const THEME_STORAGE_KEY = "rubedo_theme_mode";
const HOME_NOTICE_SEEN_KEY = "rubedo_home_notice_seen_v1";
const HOME_NOTICE_SEEN_LIMIT = 96;
const ANONYMOUS_BOARD_MESSAGE_CAP = 250;
const ADMIN_DASHBOARD_SNAPSHOT_KEY = "rubedo_admin_dashboard_snapshot_v1";
const PAGE_SCENE_EASE = [0.22, 1, 0.36, 1] as const;
const PAGE_SCENE_ENTER_TRANSITION = { duration: 0.34, ease: PAGE_SCENE_EASE };
const PAGE_SCENE_EXIT_TRANSITION = { duration: 0.2, ease: PAGE_SCENE_EASE };

const ADMIN_DASHBOARD_TREND_KEYS = [
  "total_users",
  "verified_users",
  "admin_users",
  "super_admin_users",
] as const;

type AdminDashboardTrendKey = (typeof ADMIN_DASHBOARD_TREND_KEYS)[number];

type AdminDashboardSnapshot = Pick<ApiAdminDashboard, AdminDashboardTrendKey> & {
  captured_at: string;
};

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "night";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "day" ? "day" : "night";
}

function normalizeHomeNoticeSeenIDs(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  items.forEach((item) => {
    const value = typeof item === "string" ? item.trim() : "";
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    normalized.push(value);
  });

  return normalized.slice(0, HOME_NOTICE_SEEN_LIMIT);
}

function readStoredHomeNoticeSeenIDs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(HOME_NOTICE_SEEN_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(HOME_NOTICE_SEEN_KEY);
      return [];
    }

    return normalizeHomeNoticeSeenIDs(parsed);
  } catch {
    window.localStorage.removeItem(HOME_NOTICE_SEEN_KEY);
    return [];
  }
}

function createAdminDashboardSnapshot(dashboard: ApiAdminDashboard): AdminDashboardSnapshot {
  return {
    total_users: dashboard.total_users,
    verified_users: dashboard.verified_users,
    admin_users: dashboard.admin_users,
    super_admin_users: dashboard.super_admin_users,
    captured_at: new Date().toISOString(),
  };
}

function readStoredAdminDashboardSnapshot(): AdminDashboardSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(ADMIN_DASHBOARD_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminDashboardSnapshot>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const next = {
      total_users: Number(parsed.total_users ?? 0),
      verified_users: Number(parsed.verified_users ?? 0),
      admin_users: Number(parsed.admin_users ?? 0),
      super_admin_users: Number(parsed.super_admin_users ?? 0),
      captured_at: typeof parsed.captured_at === "string" ? parsed.captured_at : "",
    };

    if (ADMIN_DASHBOARD_TREND_KEYS.some((key) => !Number.isFinite(next[key]))) {
      return null;
    }

    return next;
  } catch {
    return null;
  }
}

function persistAdminDashboardSnapshot(snapshot: AdminDashboardSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ADMIN_DASHBOARD_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore localStorage write failures (private mode/quota) and keep UI usable
  }
}

function comparePortalActivitiesByLabelDateDesc(left: DisplayActivity, right: DisplayActivity): number {
  const leftDate = parseStandardDateLabel(left.label);
  const rightDate = parseStandardDateLabel(right.label);

  if (leftDate !== null && rightDate !== null && leftDate !== rightDate) {
    return rightDate - leftDate;
  }
  if (leftDate !== null && rightDate === null) {
    return -1;
  }
  if (leftDate === null && rightDate !== null) {
    return 1;
  }

  const leftSortOrder = left.sortOrder ?? 0;
  const rightSortOrder = right.sortOrder ?? 0;
  if (leftSortOrder !== rightSortOrder) {
    return leftSortOrder - rightSortOrder;
  }

  return left.id.localeCompare(right.id, "zh-CN");
}

interface AuthFormState {
  account: string;
  password: string;
}

interface LoginState {
  pending: boolean;
  error: string;
}

interface RegisterFormState {
  student_id: string;
  username: string;
  password: string;
}

interface RegisterState {
  pending: boolean;
  error: string;
  success: string;
}

interface ProfileFormState {
  username: string;
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
}

type BangumiSyncMode = "subject_ids" | "account";

interface BangumiImportFormState extends BangumiImportPayload {
  subjectIdsText: string;
  sync_mode: BangumiSyncMode;
  bangumi_username: string;
  status: string;
  visibility: string;
  maxItemsText: string;
}

interface GalleryFormState {
  entry_type: SiteGalleryEntry["entry_type"];
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  extra_text: string;
  sort_order: string;
  active: boolean;
}

interface ArticleFormState {
  title: string;
  summary: string;
  content: string;
  visibility: CreateArticlePayload["visibility"];
  tagsText: string;
}

interface ThreadFormState {
  title: string;
  content: string;
  board: string;
  anonymous: boolean;
  tagsText: string;
}

interface ReplyFormState {
  threadID: string;
  parentID: string;
  content: string;
  anonymous: boolean;
  sage: boolean;
}

interface WallSubmissionFormState {
  title: string;
  content: string;
  imagesText: string;
}

interface ContentBlockFormState {
  block_type: SiteContentBlock["block_type"];
  slug: string;
  path: string;
  kicker: string;
  label: string;
  title: string;
  description: string;
  body: string;
  sort_order: string;
  active: boolean;
}

interface RelayFormState {
  title: string;
  description: string;
  rules: string;
  allow_unverified: boolean;
  starts_at: string;
  ends_at: string;
}

interface ContestFormState {
  title: string;
  description: string;
  rules: string;
  allow_article_repost: boolean;
  starts_at: string;
  ends_at: string;
}

interface AnnouncementFormState {
  title: string;
  description: string;
  body: string;
  kicker: string;
  published_on: string;
  sort_order: string;
  active: boolean;
}

interface FormActionState<T> {
  pending: boolean;
  error: string;
  data: T | null;
  success: string;
}

interface ActivityEditorPayload {
  label: string;
  title: string;
  description: string;
}

interface DisplayPortalPage {
  href: string;
  kicker: string;
  title: string;
  description: string;
}

interface DisplayHighlight {
  id: string;
  kicker: string;
  title: string;
  body: string;
}

interface DisplayPillar {
  id: string;
  title: string;
  description: string;
}

interface DisplayActivity {
  id: string;
  blockID?: string;
  label: string;
  title: string;
  description: string;
  sortOrder?: number;
  active?: boolean;
}

interface DisplayNotice {
  id: string;
  kicker: string;
  label: string;
  title: string;
  description: string;
  body: string;
}

interface DisplayJoinStep {
  id: string;
  step: string;
  title: string;
  description: string;
}

interface DisplayAlbum {
  id: string;
  title: string;
  accent: string;
  caption: string;
}

interface DisplayPolaroid {
  id: string;
  title: string;
  stamp: string;
  note: string;
}

interface DisplayPaper {
  id: string;
  title: string;
  signature: string;
  body: string;
}

interface DisplayTimeline {
  id: string;
  year: string;
  title: string;
  summary: string;
}

interface DisplayTrack {
  id: string;
  title: string;
  mood: string;
  length: string;
  detail: string;
}

type AdminSectionKey = "moderation" | "dashboard" | "site" | "gallery" | "members";
type AdminPageKey =
  | "moderation-wall"
  | "moderation-bangumi"
  | "dashboard-overview"
  | "dashboard-todos"
  | "dashboard-actions"
  | "site-blocks"
  | "site-relays"
  | "site-contests"
  | "site-notes"
  | "gallery-editor"
  | "gallery-list"
  | "members-users"
  | "members-verifications"
  | "members-permissions";

const ADMIN_SIDEBAR_SECTIONS: ReadonlyArray<{
  id: AdminSectionKey;
  title: string;
  kicker: string;
  description: string;
  children: ReadonlyArray<{
    id: AdminPageKey;
    label: string;
  }>;
}> = [
  {
    id: "moderation",
    title: "审核内容",
    kicker: "审核",
    description: "集中处理展示墙投稿和 Bangumi 同步任务。",
    children: [
      { id: "moderation-wall", label: "展示墙投稿审核" },
      { id: "moderation-bangumi", label: "Bangumi 导入任务" },
    ],
  },
  {
    id: "dashboard",
    title: "数据看板",
    kicker: "看板",
    description: "先看核心指标，再处理待办与快捷入口。",
    children: [
      { id: "dashboard-overview", label: "核心指标速览" },
      { id: "dashboard-todos", label: "待办提醒" },
      { id: "dashboard-actions", label: "高频入口" },
    ],
  },
  {
    id: "site",
    title: "站点内容管理",
    kicker: "内容管理",
    description: "维护内容块、活动信息和站内公告。",
    children: [
      { id: "site-blocks", label: "内容块编辑" },
      { id: "site-relays", label: "接龙活动" },
      { id: "site-contests", label: "征文活动" },
      { id: "site-notes", label: "公告中心" },
    ],
  },
  {
    id: "gallery",
    title: "展示资源管理",
    kicker: "展示资源",
    description: "创建、编辑、上下线展示条目。",
    children: [
      { id: "gallery-editor", label: "条目编辑器" },
      { id: "gallery-list", label: "条目列表" },
    ],
  },
  {
    id: "members",
    title: "成员与审核管理",
    kicker: "成员",
    description: "处理成员状态、认证审批与权限分工。",
    children: [
      { id: "members-users", label: "成员列表与状态" },
      { id: "members-verifications", label: "认证审批" },
      { id: "members-permissions", label: "权限分工" },
    ],
  },
] as const;

const ADMIN_PAGE_ICONS: Record<AdminPageKey, WorkspaceSidebarIconName> = {
  "dashboard-actions": "radio",
  "dashboard-overview": "chart",
  "dashboard-todos": "layers",
  "gallery-editor": "grid",
  "gallery-list": "grid",
  "members-permissions": "key",
  "members-users": "users",
  "members-verifications": "shield",
  "moderation-bangumi": "sparkles",
  "moderation-wall": "shield",
  "site-blocks": "note",
  "site-contests": "trophy",
  "site-notes": "note",
  "site-relays": "radio",
};

function adminSectionFromPage(page: AdminPageKey): AdminSectionKey {
  const match = ADMIN_SIDEBAR_SECTIONS.find((section) =>
    section.children.some((child) => child.id === page),
  );

  return match?.id ?? "dashboard";
}

const DEFAULT_PORTAL_PAGES: DisplayPortalPage[] = [];
const DEFAULT_SOCIETY_HIGHLIGHTS: DisplayHighlight[] = [];
const DEFAULT_SOCIETY_PILLARS: DisplayPillar[] = [];
const DEFAULT_SOCIETY_ACTIVITIES: DisplayActivity[] = [];
const DEFAULT_SOCIETY_NOTICES: DisplayNotice[] = [];
const DEFAULT_SOCIETY_JOIN_STEPS: DisplayJoinStep[] = [];
const DEFAULT_GALLERY_ALBUMS: DisplayAlbum[] = [];
const DEFAULT_GALLERY_POLAROIDS: DisplayPolaroid[] = [];
const DEFAULT_GALLERY_PAPERS: DisplayPaper[] = [];
const DEFAULT_GALLERY_TIMELINE: DisplayTimeline[] = [];
const DEFAULT_GALLERY_TRACKS: DisplayTrack[] = [];

function getAvatarFallback(profile: Pick<ApiProfile, "nickname" | "username"> | null): string {
  if (!profile) {
    return "R";
  }

  return (profile.nickname || profile.username || "R").trim().charAt(0).toUpperCase() || "R";
}

function createProfileFormState(profile: ApiProfile | null): ProfileFormState {
  return {
    username: profile?.username || "",
    nickname: profile?.nickname || "",
    signature: profile?.signature || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
  };
}

function createGalleryFormState(entry?: SiteGalleryEntry | null): GalleryFormState {
  return {
    entry_type: entry?.entry_type || "album",
    slug: entry?.slug || "",
    title: entry?.title || "",
    subtitle: entry?.subtitle || "",
    body: entry?.body || "",
    extra_text: entry?.extra_text || "",
    sort_order: entry ? String(entry.sort_order) : "0",
    active: entry?.active ?? true,
  };
}

function createArticleFormState(): ArticleFormState {
  return {
    title: "",
    summary: "",
    content: "",
    visibility: "public",
    tagsText: "",
  };
}

function createArticleFormStateFromArticle(article: ApiArticle): ArticleFormState {
  return {
    title: article.title,
    summary: article.summary,
    content: article.content,
    visibility: article.visibility === "private" ? "private" : article.visibility === "member" || article.visibility === "members" ? "member" : "public",
    tagsText: article.tags.join(", "),
  };
}

function createThreadFormState(): ThreadFormState {
  return {
    title: "",
    content: "",
    board: "剧情讨论",
    anonymous: false,
    tagsText: "",
  };
}

function createReplyFormState(threadID = ""): ReplyFormState {
  return {
    threadID,
    parentID: "",
    content: "",
    anonymous: false,
    sage: false,
  };
}

function createWallSubmissionFormState(): WallSubmissionFormState {
  return {
    title: "",
    content: "",
    imagesText: "",
  };
}

function createContentBlockFormState(block?: SiteContentBlock | null): ContentBlockFormState {
  return {
    block_type: block?.block_type || "portal_page",
    slug: block?.slug || "",
    path: block?.path || "",
    kicker: block?.kicker || "",
    label: block?.label || "",
    title: block?.title || "",
    description: block?.description || "",
    body: block?.body || "",
    sort_order: block ? String(block.sort_order) : "0",
    active: block?.active ?? true,
  };
}

function contentBlockTypeLabel(value: SiteContentBlock["block_type"]): string {
  switch (value) {
    case "portal_page":
      return "首页页面";
    case "portal_highlight":
      return "首页亮点";
    case "portal_pillar":
      return "栏目支柱";
    case "portal_notice":
      return "公告";
    case "portal_activity":
      return "活动";
    case "portal_join_step":
      return "加入步骤";
    case "hero_object":
      return "主视觉对象";
    default:
      return "内容块";
  }
}

function wallSubmissionStatusLabel(value: string): string {
  switch (value) {
    case "approved":
      return "已通过";
    case "pending_review":
      return "待审核";
    case "changes_requested":
      return "待修改";
    case "rejected":
      return "已驳回";
    default:
      return "未知状态";
  }
}

function adminRoleLabel(value: string): string {
  switch (value) {
    case "member":
      return "成员";
    case "moderator":
      return "版主";
    case "admin":
      return "管理员";
    case "super_admin":
      return "超级管理员";
    default:
      return value || "未分配";
  }
}

function formatAdminRoles(roles: readonly string[] | null | undefined): string {
  if (!roles?.length) {
    return "只读账号";
  }

  return roles.map((role) => adminRoleLabel(role)).join(" / ");
}

function adminUserStatusLabel(value: string): string {
  switch (value) {
    case "pending_verification":
      return "待认证";
    case "active":
      return "正常";
    case "suspended":
      return "已禁言";
    case "banned":
      return "已封禁";
    case "approved":
      return "已通过";
    case "rejected":
      return "已驳回";
    default:
      return value || "未知状态";
  }
}

function activityStatusLabel(value: string): string {
  switch (value) {
    case "draft":
      return "草稿";
    case "open":
      return "进行中";
    case "reviewing":
      return "评审中";
    case "closed":
      return "已结束";
    case "archived":
      return "已归档";
    case "deleted":
      return "已删除";
    default:
      return value || "未知状态";
  }
}

const FLOW_ACTIVITY_STATUSES = ["draft", "open", "closed"] as const;

function canProgressActivityStatus(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) {
    return false;
  }

  const currentIndex = FLOW_ACTIVITY_STATUSES.indexOf(currentStatus as (typeof FLOW_ACTIVITY_STATUSES)[number]);
  const nextIndex = FLOW_ACTIVITY_STATUSES.indexOf(nextStatus as (typeof FLOW_ACTIVITY_STATUSES)[number]);
  if (currentIndex === -1 || nextIndex === -1) {
    return true;
  }

  return nextIndex > currentIndex;
}

function bangumiJobStatusLabel(value: string): string {
  switch (value) {
    case "queued":
      return "排队中";
    case "running":
      return "执行中";
    case "succeeded":
      return "已成功";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    default:
      return value || "未知状态";
  }
}

function bangumiJobTypeLabel(value: string): string {
  switch (value) {
    case "collection_sync":
      return "收藏同步";
    default:
      return value || "未指定类型";
  }
}

function bangumiCollectionStatusLabel(value: string): string {
  switch (value) {
    case "wish":
      return "想看";
    case "doing":
      return "在看";
    case "collect":
      return "看过";
    case "on_hold":
      return "搁置";
    case "dropped":
      return "抛弃";
    default:
      return value || "未指定";
  }
}

function createRelayFormState(): RelayFormState {
  return {
    title: "",
    description: "",
    rules: "",
    allow_unverified: true,
    starts_at: "",
    ends_at: "",
  };
}

function createContestFormState(): ContestFormState {
  return {
    title: "",
    description: "",
    rules: "",
    allow_article_repost: true,
    starts_at: "",
    ends_at: "",
  };
}

function createTodayDateStamp(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createAnnouncementFormState(): AnnouncementFormState {
  return {
    title: "",
    description: "",
    body: "",
    kicker: "公告",
    published_on: createTodayDateStamp(),
    sort_order: "0",
    active: true,
  };
}

function slugifyValue(input: string): string {
  const normalized = sanitizeUnsafeTerm(input.trim().toLowerCase(), "safe");
  if (!normalized) {
    return "item";
  }

  const slug = normalized.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return slug || "item";
}

const UNSAFE_TERM_PATTERNS = [/鸡巴/giu, /鸡8/giu, /jiba/giu];

function sanitizeUnsafeTerm(input: string, replacement: string): string {
  return UNSAFE_TERM_PATTERNS.reduce((current, pattern) => current.replace(pattern, replacement), input);
}

function sanitizeDisplayText(input: string | null | undefined, fallback = "未命名"): string {
  const raw = (input || "").trim();
  if (!raw) {
    return fallback;
  }

  const sanitized = sanitizeUnsafeTerm(raw, "***");
  return sanitized || fallback;
}

function createAnnouncementSlug(title: string): string {
  const suffix = Date.now().toString(36);
  const normalized = slugifyValue(title);
  const base = normalized === "item" ? "notice" : normalized;
  const maxBaseLength = Math.max(8, 112 - suffix.length);
  const trimmedBase = base.slice(0, maxBaseLength);

  return `notice-${trimmedBase}-${suffix}`;
}

function createEmptyActionState<T>(): FormActionState<T> {
  return {
    pending: false,
    error: "",
    data: null,
    success: "",
  };
}

function mergeAnonymousThreads(
  existing: readonly ApiForumThread[],
  incoming: readonly ApiForumThread[],
): ApiForumThread[] {
  const byID = new Map<string, ApiForumThread>();
  existing.forEach((item) => {
    byID.set(item.id, item);
  });
  incoming.forEach((item) => {
    byID.set(item.id, item);
  });
  return Array.from(byID.values());
}

function applyThreadEngagement(
  thread: ApiForumThread,
  engagement: ApiThreadEngagement,
): ApiForumThread {
  if (thread.id !== engagement.thread_id) {
    return thread;
  }

  return {
    ...thread,
    liked: engagement.liked,
    favorited: engagement.favorited,
    like_count: engagement.like_count,
    favorite_count: engagement.favorite_count,
  };
}

function App() {
  const forumReplyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const {
    routePath,
    selectedArticleID,
    isStoriesEditorMode,
    selectedForumThreadID,
    isForumEditorMode,
    selectedPublicProfileUsername,
    selectedAnonymousThreadID,
    navigate: navigateRoute,
  } = useAppRouteState();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const [spaceShelfTab, setSpaceShelfTab] = useState<SpaceShelfTab>("games");
  const [storyFeed, setStoryFeed] = useState<ApiArticle[]>([]);
  const [articleDetail, setArticleDetail] = useState<ApiArticle | null>(null);
  const [threadFeed, setThreadFeed] = useState<ApiForumThread[]>([]);
  const [threadDetail, setThreadDetail] = useState<ApiForumThreadDetail | null>(null);
  const [anonymousThreadFeed, setAnonymousThreadFeed] = useState<ApiForumThread[]>([]);
  const [anonymousThreadDetail, setAnonymousThreadDetail] = useState<ApiForumThreadDetail | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [authForm, setAuthForm] = useState<AuthFormState>({
    account: DEFAULT_PUBLIC_PROFILE_USERNAME,
    password: "",
  });
  const [registerForm, setRegisterForm] = useState<RegisterFormState>({
    student_id: "",
    username: "",
    password: "",
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => createProfileFormState(null));
  const [profileActionState, setProfileActionState] =
    useState<FormActionState<ApiProfile>>(createEmptyActionState<ApiProfile>);
  const [bangumiForm, setBangumiForm] = useState<BangumiImportFormState>({
    subjectIdsText: "",
    subject_ids: [],
    sync_mode: "subject_ids",
    bangumi_username: "",
    status: "wish",
    visibility: "public",
    maxItemsText: "120",
    max_items: 120,
  });
  const [bangumiActionState, setBangumiActionState] =
    useState<FormActionState<BangumiImportJob>>(createEmptyActionState<BangumiImportJob>);
  const [myBangumiJobs, setMyBangumiJobs] = useState<BangumiImportJob[]>([]);
  const [myBangumiCollections, setMyBangumiCollections] = useState<BangumiCollection[]>([]);
  const [myFavoritedThreads, setMyFavoritedThreads] = useState<ApiForumThread[]>([]);
  const [myBangumiJobsPager, setMyBangumiJobsPager] = useState<PagerState>(() => createPagerState(6));
  const [myFavoritedThreadsPager, setMyFavoritedThreadsPager] = useState<PagerState>(() => createPagerState(6));
  const [bangumiJobsError, setBangumiJobsError] = useState("");
  const [bangumiCollectionsError, setBangumiCollectionsError] = useState("");
  const [myFavoritedThreadsError, setMyFavoritedThreadsError] = useState("");
  const [adminGalleryEntries, setAdminGalleryEntries] = useState<SiteGalleryEntry[]>([]);
  const [galleryForm, setGalleryForm] = useState<GalleryFormState>(() => createGalleryFormState());
  const [galleryActionState, setGalleryActionState] =
    useState<FormActionState<SiteGalleryEntry>>(createEmptyActionState<SiteGalleryEntry>);
  const [galleryUploadState, setGalleryUploadState] =
    useState<FormActionState<SiteGalleryEntry[]>>(createEmptyActionState<SiteGalleryEntry[]>);
  const [editingGalleryEntryID, setEditingGalleryEntryID] = useState<string | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<ApiAdminDashboard | null>(null);
  const [adminDashboardTrendBase, setAdminDashboardTrendBase] =
    useState<AdminDashboardSnapshot | null>(() => readStoredAdminDashboardSnapshot());
  const [superAdminDashboard, setSuperAdminDashboard] = useState<ApiSuperAdminDashboard | null>(null);
  const [forumAvailabilitySettings, setForumAvailabilitySettings] =
    useState<ApiForumAvailabilitySettings | null>(null);
  const [forumAvailabilityActionState, setForumAvailabilityActionState] =
    useState<FormActionState<ApiForumAvailabilitySettings>>(createEmptyActionState<ApiForumAvailabilitySettings>);
  const [adminUsers, setAdminUsers] = useState<ApiAdminUser[]>([]);
  const [adminUsersPager, setAdminUsersPager] = useState<PagerState>(() => createPagerState(6));
  const [adminUserActionState, setAdminUserActionState] =
    useState<FormActionState<ApiAdminUser | ApiVerificationDecisionResult>>(
      createEmptyActionState<ApiAdminUser | ApiVerificationDecisionResult>,
    );
  const [adminBangumiJobs, setAdminBangumiJobs] = useState<BangumiImportJob[]>([]);
  const [adminBangumiJobsPager, setAdminBangumiJobsPager] = useState<PagerState>(() => createPagerState(6));
  const [adminActivePage, setAdminActivePage] =
    useState<AdminPageKey>("dashboard-overview");
  const [adminContentBlocks, setAdminContentBlocks] = useState<SiteContentBlock[]>([]);
  const [adminContentBlocksPager, setAdminContentBlocksPager] = useState<PagerState>(() => createPagerState(6));
  const [contentBlockForm, setContentBlockForm] =
    useState<ContentBlockFormState>(() => createContentBlockFormState());
  const [contentBlockActionState, setContentBlockActionState] =
    useState<FormActionState<SiteContentBlock>>(createEmptyActionState<SiteContentBlock>);
  const [portalActivityActionState, setPortalActivityActionState] =
    useState<FormActionState<SiteContentBlock>>(createEmptyActionState<SiteContentBlock>);
  const [editingContentBlockID, setEditingContentBlockID] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] =
    useState<AnnouncementFormState>(() => createAnnouncementFormState());
  const [announcementActionState, setAnnouncementActionState] =
    useState<FormActionState<SiteContentBlock>>(createEmptyActionState<SiteContentBlock>);
  const [relays, setRelays] = useState<ApiRelayEvent[]>([]);
  const [relayPager, setRelayPager] = useState<PagerState>(() => createPagerState(6));
  const [relayForm, setRelayForm] = useState<RelayFormState>(() => createRelayFormState());
  const [relayActionState, setRelayActionState] =
    useState<FormActionState<ApiRelayEvent>>(createEmptyActionState<ApiRelayEvent>);
  const [contests, setContests] = useState<ApiWritingContest[]>([]);
  const [contestPager, setContestPager] = useState<PagerState>(() => createPagerState(6));
  const [contestForm, setContestForm] = useState<ContestFormState>(() => createContestFormState());
  const [contestActionState, setContestActionState] =
    useState<FormActionState<ApiWritingContest>>(createEmptyActionState<ApiWritingContest>);
  const [articleForm, setArticleForm] = useState<ArticleFormState>(() => createArticleFormState());
  const [articleActionState, setArticleActionState] =
    useState<FormActionState<ApiArticle>>(createEmptyActionState<ApiArticle>);
  const [articleEditingTargetID, setArticleEditingTargetID] = useState<string | null>(null);
  const [articleManageActionState, setArticleManageActionState] =
    useState<FormActionState<ApiArticle | DeleteArticleResult>>(
      createEmptyActionState<ApiArticle | DeleteArticleResult>,
    );
  const [threadForm, setThreadForm] = useState<ThreadFormState>(() => createThreadFormState());
  const [threadActionState, setThreadActionState] =
    useState<FormActionState<ApiForumThread>>(createEmptyActionState<ApiForumThread>);
  const [threadEngagementActionState, setThreadEngagementActionState] =
    useState<FormActionState<ApiThreadEngagement>>(createEmptyActionState<ApiThreadEngagement>);
  const [threadManageActionState, setThreadManageActionState] =
    useState<FormActionState<ApiForumThread | DeleteForumThreadResult>>(
      createEmptyActionState<ApiForumThread | DeleteForumThreadResult>,
    );
  const adminDashboardRef = useRef<ApiAdminDashboard | null>(null);
  const [forumProgress, setForumProgress] = useState<ApiForumProgress | null>(null);
  const [forumSignInState, setForumSignInState] =
    useState<FormActionState<ApiForumSignInResult>>(createEmptyActionState<ApiForumSignInResult>);
  const [replyForm, setReplyForm] = useState<ReplyFormState>(() => createReplyFormState());
  const [replyActionState, setReplyActionState] =
    useState<FormActionState<ApiForumReply>>(createEmptyActionState<ApiForumReply>);
  const [anonymousThreadForm, setAnonymousThreadForm] = useState<ThreadFormState>(() => ({
    ...createThreadFormState(),
    board: "匿名板",
    anonymous: true,
    tagsText: "",
  }));
  const [anonymousThreadActionState, setAnonymousThreadActionState] =
    useState<FormActionState<ApiForumThread>>(createEmptyActionState<ApiForumThread>);
  const [anonymousReplyForm, setAnonymousReplyForm] = useState<ReplyFormState>(() => createReplyFormState());
  const [anonymousReplyActionState, setAnonymousReplyActionState] =
    useState<FormActionState<ApiForumReply>>(createEmptyActionState<ApiForumReply>);
  const [pendingAnonymousScrollMessageID, setPendingAnonymousScrollMessageID] = useState<string | null>(null);
  const [articleSearchKeyword, setArticleSearchKeyword] = useState("");
  const [selectedForumBoard, setSelectedForumBoard] = useState("全部");
  const [threadSearchKeyword, setThreadSearchKeyword] = useState("");
  const [onlyShowThreadAuthor, setOnlyShowThreadAuthor] = useState(false);
  const [expandedReplyIDs, setExpandedReplyIDs] = useState<string[]>([]);
  const [wallForm, setWallForm] = useState<WallSubmissionFormState>(() => createWallSubmissionFormState());
  const [wallActionState, setWallActionState] =
    useState<FormActionState<ApiWallEntry>>(createEmptyActionState<ApiWallEntry>);
  const [wallEntries, setWallEntries] = useState<ApiWallEntry[]>([]);
  const [wallSubmissions, setWallSubmissions] = useState<ApiWallEntry[]>([]);
  const [wallSubmissionsPager, setWallSubmissionsPager] = useState<PagerState>(() => createPagerState(6));
  const [loginState, setLoginState] = useState<LoginState>({
    pending: false,
    error: "",
  });
  const [registerState, setRegisterState] = useState<RegisterState>({
    pending: false,
    error: "",
    success: "",
  });
  const [articlePager, setArticlePager] = useState<PagerState>(() => createPagerState(6));
  const [threadPager, setThreadPager] = useState<PagerState>(() => createPagerState(6));
  const [anonymousThreadPager, setAnonymousThreadPager] = useState<PagerState>(() =>
    createPagerState(ANONYMOUS_BOARD_MESSAGE_CAP),
  );
  const [anonymousLoadingMore, setAnonymousLoadingMore] = useState(false);
  const [wallPager, setWallPager] = useState<PagerState>(() => createPagerState(6));
  const [adminGalleryPager, setAdminGalleryPager] = useState<PagerState>(() => createPagerState(6));
  const [healthError, setHealthError] = useState("");
  const [articlesError, setArticlesError] = useState("");
  const [articleDetailError, setArticleDetailError] = useState("");
  const [threadsError, setThreadsError] = useState("");
  const [threadDetailError, setThreadDetailError] = useState("");
  const [forumProgressError, setForumProgressError] = useState("");
  const [anonymousThreadsError, setAnonymousThreadsError] = useState("");
  const [anonymousThreadDetailError, setAnonymousThreadDetailError] = useState("");
  const [wallError, setWallError] = useState("");
  const [wallModerationError, setWallModerationError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [adminDashboardError, setAdminDashboardError] = useState("");
  const [adminUsersError, setAdminUsersError] = useState("");
  const [adminBangumiJobsError, setAdminBangumiJobsError] = useState("");
  const [adminContentBlocksError, setAdminContentBlocksError] = useState("");
  const [adminActivityError, setAdminActivityError] = useState("");
  const [forumAvailabilityError, setForumAvailabilityError] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [homeNoticeSeenIDs, setHomeNoticeSeenIDs] = useState<string[]>(() =>
    readStoredHomeNoticeSeenIDs(),
  );
  const {
    notifications,
    unreadCount: unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppNotifications({
    session,
    profileVerified: Boolean(profile?.verified),
    portalNotices: siteContent?.portal_notices ?? [],
  });

  const homeConfigBlock =
    (siteContent?.hero_objects ?? []).find((item) => item.slug === HOME_PAGE_CONFIG_SLUG) || null;
  const homeConfig = parseHomeConfigFromBlock(homeConfigBlock);

  const portalPages: DisplayPortalPage[] = siteContent?.portal_pages.length
    ? siteContent.portal_pages.map((item) => ({
        href: item.path || "/",
        kicker: item.kicker || "",
        title: item.title,
        description: item.description || "",
      }))
    : DEFAULT_PORTAL_PAGES;
  const societyHighlights: DisplayHighlight[] = siteContent?.portal_highlights.length
    ? siteContent.portal_highlights.map((item) => ({
        id: item.slug,
        kicker: item.kicker || "",
        title: item.title,
        body: item.body || item.description || "",
      }))
    : DEFAULT_SOCIETY_HIGHLIGHTS;
  const societyPillars: DisplayPillar[] = siteContent?.portal_pillars.length
    ? siteContent.portal_pillars.map((item) => ({
        id: item.slug,
        title: item.title,
        description: item.description || "",
      }))
    : DEFAULT_SOCIETY_PILLARS;
  const societyActivities: DisplayActivity[] = siteContent?.portal_activities.length
    ? siteContent.portal_activities
        .map((item) => ({
          id: item.slug || item.id,
          blockID: item.id,
          label: item.label || "",
          title: item.title,
          description: item.description || "",
          sortOrder: item.sort_order,
          active: item.active,
        }))
        .sort(comparePortalActivitiesByLabelDateDesc)
    : DEFAULT_SOCIETY_ACTIVITIES;
  const societyNotices: DisplayNotice[] = siteContent?.portal_notices?.length
    ? siteContent.portal_notices.map((item) => ({
        id: item.slug,
        kicker: item.kicker || "公告",
        label: item.label || "",
        title: item.title,
        description: item.description || "",
        body: item.body || "",
      }))
    : DEFAULT_SOCIETY_NOTICES;
  const societyJoinSteps: DisplayJoinStep[] = siteContent?.portal_join_steps.length
    ? siteContent.portal_join_steps.map((item) => ({
        id: item.slug,
        step: item.label || "",
        title: item.title,
        description: item.description || "",
      }))
    : DEFAULT_SOCIETY_JOIN_STEPS;

  const galleryEntriesRaw: SiteGalleryEntry[] = siteContent?.gallery_entries ?? [];
  const galleryAlbums: DisplayAlbum[] = galleryEntriesRaw.length
    ? galleryEntriesRaw
        .filter((entry) => entry.entry_type === "album")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          accent: entry.subtitle || "",
          caption: entry.body || "",
        }))
    : DEFAULT_GALLERY_ALBUMS;
  const galleryPolaroids: DisplayPolaroid[] = galleryEntriesRaw.length
    ? galleryEntriesRaw
        .filter((entry) => entry.entry_type === "polaroid")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          stamp: entry.subtitle || "",
          note: entry.body || "",
        }))
    : DEFAULT_GALLERY_POLAROIDS;
  const galleryPapers: DisplayPaper[] = galleryEntriesRaw.length
    ? galleryEntriesRaw
        .filter((entry) => entry.entry_type === "paper")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          signature: entry.subtitle || "",
          body: entry.body || "",
        }))
    : DEFAULT_GALLERY_PAPERS;
  const galleryTimeline: DisplayTimeline[] = galleryEntriesRaw.length
    ? galleryEntriesRaw
        .filter((entry) => entry.entry_type === "timeline")
        .map((entry) => ({
          id: entry.slug,
          year: entry.subtitle || "",
          title: entry.title,
          summary: entry.body || "",
        }))
    : DEFAULT_GALLERY_TIMELINE;
  const galleryTracks: DisplayTrack[] = galleryEntriesRaw.length
    ? galleryEntriesRaw
        .filter((entry) => entry.entry_type === "track")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          mood: entry.subtitle || "",
          length: entry.extra_text || "",
          detail: entry.body || "",
        }))
    : DEFAULT_GALLERY_TRACKS;

  const featuredArticle = storyFeed[0] ?? null;
  const activeArticle = articleDetail ?? null;
  const featuredThread = threadFeed[0] ?? null;
  const activeForumThread = threadDetail?.thread ?? null;
  const featuredAnonymousThread = anonymousThreadFeed[0] ?? null;
  const activeAnonymousThread = anonymousThreadDetail?.thread ?? null;
  const boardOptions = Array.from(
    new Set(["剧情讨论", "美术交流", "站内想法", ...threadFeed.map((thread) => thread.board)]),
  );
  const boardFilterOptions = ["全部", ...Array.from(new Set(threadFeed.map((thread) => thread.board)))];
  const filteredThreadFeed =
    selectedForumBoard === "全部"
      ? threadFeed
      : threadFeed.filter((thread) => thread.board === selectedForumBoard);
  const boardCount = new Set(threadFeed.map((thread) => thread.board)).size;
  const isAuthenticated = session !== null;
  const displayProfile = profile;
  const canAdmin = Boolean(
    session && profile?.roles?.some((role) => role === "admin" || role === "super_admin"),
  );
  const canSuperAdmin = Boolean(session && profile?.roles?.some((role) => role === "super_admin"));
  const canManageGallery = Boolean(
    session && profile?.roles?.some((role) => role === "admin" || role === "super_admin"),
  );
  const canUseBangumiImport = Boolean(session);
  const canAccessAnonymous = Boolean(session && profile?.verified);
  const hasVerifiedSpaceAccess = Boolean(session && profile);
  const spaceLogEntries = storyFeed.filter((article) => {
    if (!displayProfile) {
      return false;
    }

    return article.author === displayProfile.nickname || article.author === displayProfile.username;
  });
  const collectionTotal = Object.values(displayProfile?.collections ?? {}).reduce(
    (count, item) => count + item,
    0,
  );
  const showcaseCount =
    galleryAlbums.length +
    galleryPolaroids.length +
    galleryPapers.length +
    galleryTimeline.length +
    galleryTracks.length;
  const backendReachable = health !== null && !healthError;
  const lastUpdatedLabel = formatUpdatedAt(lastUpdatedAt);
  const forumLevelSummary = forumProgress?.summary ?? null;
  const currentForumLevelConfig =
    (forumProgress?.levels ?? []).find((level) => level.level === forumLevelSummary?.current_level) ?? null;
  const forumLevelPercent = forumLevelSummary
    ? forumLevelSummary.next_level_exp > (currentForumLevelConfig?.min_exp ?? 0)
      ? Math.min(
          ((forumLevelSummary.total_exp - (currentForumLevelConfig?.min_exp ?? 0)) /
            (forumLevelSummary.next_level_exp - (currentForumLevelConfig?.min_exp ?? 0))) *
            100,
          100,
        )
      : 100
    : 0;
  const headerNotifications: HeaderNotificationItem[] = notifications.slice(0, 18).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    href: item.href,
    timeLabel: formatDateTime(item.createdAt),
    unread: item.unread,
  }));
  const activeHomeNotice =
    routePath === "/"
      ? societyNotices.find((notice) => {
          const noticeID = notice.id.trim();
          return noticeID !== "" && !homeNoticeSeenIDs.includes(noticeID);
        }) || null
      : null;
  const activeHomeNoticeID = activeHomeNotice?.id.trim() || "";

  useEffect(() => {
    adminDashboardRef.current = adminDashboard;
  }, [adminDashboard]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", themeMode);
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (homeNoticeSeenIDs.length === 0) {
      window.localStorage.removeItem(HOME_NOTICE_SEEN_KEY);
      return;
    }

    window.localStorage.setItem(HOME_NOTICE_SEEN_KEY, JSON.stringify(homeNoticeSeenIDs));
  }, [homeNoticeSeenIDs]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeHomeNoticeID) {
      return;
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      setHomeNoticeSeenIDs((current) => normalizeHomeNoticeSeenIDs([activeHomeNoticeID, ...current]));
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [activeHomeNoticeID]);

  useEffect(() => {
    if (routePath === "/stories" && !isStoriesEditorMode && !selectedArticleID && articleEditingTargetID) {
      setArticleEditingTargetID(null);
    }
  }, [articleEditingTargetID, isStoriesEditorMode, routePath, selectedArticleID]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mobileHeaderBreakpoint = 980;
    let frameId = 0;
    let lastScrollY = window.scrollY;

    function shouldKeepHeaderVisible(): boolean {
      return window.innerWidth <= mobileHeaderBreakpoint;
    }

    function updateHeaderVisibility(): void {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      setIsHeaderHidden((current) => {
        if (shouldKeepHeaderVisible()) {
          return false;
        }

        if (currentScrollY <= 32) {
          return false;
        }

        if (delta > 8) {
          return true;
        }

        if (delta < -8) {
          return false;
        }

        return current;
      });

      lastScrollY = currentScrollY;
      frameId = 0;
    }

    function handleScroll(): void {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(updateHeaderVisibility);
    }

    function handleResize(): void {
      if (shouldKeepHeaderVisible()) {
        setIsHeaderHidden(false);
      }
    }

    if (shouldKeepHeaderVisible()) {
      setIsHeaderHidden(false);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (routePath === "/stories" && isStoriesEditorMode) {
      document.title = "发布文章 | redgal forum";
      return;
    }

    if (routePath === "/stories" && selectedArticleID && activeArticle) {
      document.title = `${activeArticle.title} | redgal forum`;
      return;
    }

    if (routePath === "/forum" && selectedForumThreadID && activeForumThread) {
      document.title = `${activeForumThread.title} | redgal forum`;
      return;
    }

    if (routePath === "/forum" && isForumEditorMode) {
      document.title = "发布主题 | redgal forum";
      return;
    }

    document.title = TITLE_BY_ROUTE[routePath];
  }, [
    activeArticle,
    activeForumThread,
    routePath,
    isForumEditorMode,
    isStoriesEditorMode,
    selectedArticleID,
    selectedForumThreadID,
  ]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setProfileForm(createProfileFormState(profile));
  }, [profile]);

  useEffect(() => {
    if (replyForm.threadID || threadFeed.length === 0) {
      return;
    }

    setReplyForm(createReplyFormState(threadFeed[0]?.id || ""));
  }, [replyForm.threadID, threadFeed]);

  useEffect(() => {
    if (selectedForumBoard !== "全部" && !threadFeed.some((thread) => thread.board === selectedForumBoard)) {
      setSelectedForumBoard("全部");
    }
  }, [selectedForumBoard, threadFeed]);

  useEffect(() => {
    if (!selectedForumThreadID) {
      return;
    }

    setReplyForm((current) => ({
      ...current,
      threadID: selectedForumThreadID,
      parentID: "",
      sage: false,
    }));
    setOnlyShowThreadAuthor(false);
    setExpandedReplyIDs([]);
  }, [selectedForumThreadID]);

  useEffect(() => {
    setThreadEngagementActionState(createEmptyActionState<ApiThreadEngagement>());
  }, [selectedForumThreadID]);

  useEffect(() => {
    if (!selectedAnonymousThreadID) {
      setAnonymousReplyForm((current) => {
        if (!current.threadID && !current.parentID && !current.content && !current.sage) {
          return current;
        }

        return {
          ...current,
          threadID: "",
          parentID: "",
          content: "",
          sage: false,
        };
      });
      return;
    }

    setAnonymousReplyForm((current) => ({
      ...current,
      threadID: selectedAnonymousThreadID,
      parentID: "",
      sage: false,
    }));
  }, [selectedAnonymousThreadID]);

  useEffect(() => {
    let active = true;
    const refreshing = hasLoadedOnce;

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoadingData(true);
    }

    async function loadPageContent(): Promise<void> {
      const token = session?.accessToken;
      const profileRequest = selectedPublicProfileUsername
        ? fetchPublicProfile(selectedPublicProfileUsername)
        : token
          ? fetchMyProfile(token)
          : fetchPublicProfile(DEFAULT_PUBLIC_PROFILE_USERNAME);
      const forumProgressRequest = token
        ? fetchForumProgress(token)
        : Promise.resolve<ApiForumProgress | null>(null);
      const favoritedThreadsRequest = token
        ? fetchMyFavoritedThreads(token, {
            page: myFavoritedThreadsPager.page,
            pageSize: myFavoritedThreadsPager.pageSize,
          })
        : Promise.resolve<Paginated<ApiForumThread>>({
            items: [],
            page: 1,
            page_size: myFavoritedThreadsPager.pageSize,
            total: 0,
            total_pages: 0,
          });
      const articleDetailRequest =
        routePath === "/stories" && selectedArticleID
          ? fetchArticleDetail(selectedArticleID, token || undefined)
          : Promise.resolve<ApiArticle | null>(null);
      const threadDetailRequest =
        routePath === "/forum" && selectedForumThreadID
          ? fetchThreadDetail(selectedForumThreadID, token || undefined)
          : Promise.resolve<ApiForumThreadDetail | null>(null);
      const anonymousThreadResult =
        routePath === "/anonymous" && canAccessAnonymous
          ? fetchAnonymousThreads(token || undefined, {
              page: 1,
              pageSize: ANONYMOUS_BOARD_MESSAGE_CAP,
            })
          : Promise.resolve<Paginated<ApiForumThread>>({
              items: [],
              page: 1,
              page_size: ANONYMOUS_BOARD_MESSAGE_CAP,
              total: 0,
              total_pages: 0,
            });
      const anonymousThreadDetailRequest = Promise.resolve<ApiForumThreadDetail | null>(null);

      const [
        healthResult,
        siteResult,
        articleResult,
        articleDetailResult,
        threadResult,
        threadDetailResult,
        anonymousThreadsListResult,
        anonymousThreadDetailResult,
        wallResult,
        profileResult,
        forumProgressResult,
        favoritedThreadsResult,
      ] =
        await Promise.allSettled([
          fetchHealth(token || undefined),
          fetchSiteContent(),
          fetchArticles(token || undefined, {
            page: articlePager.page,
            pageSize: articlePager.pageSize,
            q: articleSearchKeyword,
          }),
          articleDetailRequest,
          fetchThreads(token || undefined, {
            page: threadPager.page,
            pageSize: threadPager.pageSize,
            q: threadSearchKeyword,
          }),
          threadDetailRequest,
          anonymousThreadResult,
          anonymousThreadDetailRequest,
          fetchWallEntries({
            page: wallPager.page,
            pageSize: wallPager.pageSize,
          }),
          profileRequest,
          forumProgressRequest,
          favoritedThreadsRequest,
        ]);

      if (!active) {
        return;
      }

      const nextHealthError = healthResult.status === "rejected" ? toErrorMessage(healthResult.reason) : "";
      const nextArticlesError =
        articleResult.status === "rejected" ? toErrorMessage(articleResult.reason) : "";
      const nextArticleDetailError =
        articleDetailResult.status === "rejected" ? toErrorMessage(articleDetailResult.reason) : "";
      const nextThreadsError =
        threadResult.status === "rejected" ? toErrorMessage(threadResult.reason) : "";
      const nextThreadDetailError =
        threadDetailResult.status === "rejected" ? toErrorMessage(threadDetailResult.reason) : "";
      const nextAnonymousThreadsError =
        anonymousThreadsListResult.status === "rejected"
          ? toErrorMessage(anonymousThreadsListResult.reason)
          : "";
      const nextAnonymousThreadDetailError =
        anonymousThreadDetailResult.status === "rejected"
          ? toErrorMessage(anonymousThreadDetailResult.reason)
          : "";
      const nextWallError = wallResult.status === "rejected" ? toErrorMessage(wallResult.reason) : "";
      const nextProfileError =
        profileResult.status === "rejected" ? toErrorMessage(profileResult.reason) : "";
      const nextForumProgressError =
        forumProgressResult.status === "rejected" ? toErrorMessage(forumProgressResult.reason) : "";
      const nextMyFavoritedThreadsError =
        favoritedThreadsResult.status === "rejected"
          ? toErrorMessage(favoritedThreadsResult.reason)
          : "";
      const shouldDropSession = token && profileResult.status === "rejected" && isAuthFailure(profileResult.reason);

      if (shouldDropSession) {
        persistSession(null);
      }

      startTransition(() => {
        if (healthResult.status === "fulfilled") {
          setHealth(healthResult.value);
        } else {
          setHealth(null);
        }

        if (siteResult.status === "fulfilled") {
          setSiteContent(siteResult.value);
        }

        if (articleResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiArticle>(articleResult.value, articlePager);
          setStoryFeed(normalized.items);
          setArticlePager(normalized.pager);
        } else {
          setStoryFeed([]);
        }

        if (articleDetailResult.status === "fulfilled") {
          setArticleDetail(articleDetailResult.value);
        } else {
          setArticleDetail(null);
        }

        if (threadResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiForumThread>(threadResult.value, threadPager);
          setThreadFeed(normalized.items);
          setThreadPager(normalized.pager);
        } else {
          setThreadFeed([]);
        }

        if (threadDetailResult.status === "fulfilled") {
          setThreadDetail(threadDetailResult.value);
        } else {
          setThreadDetail(null);
        }

        if (anonymousThreadsListResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiForumThread>(
            anonymousThreadsListResult.value,
            anonymousThreadPager,
          );
          setAnonymousThreadFeed(normalized.items);
          setAnonymousThreadPager(normalized.pager);
        } else {
          setAnonymousThreadFeed([]);
        }

        if (anonymousThreadDetailResult.status === "fulfilled") {
          setAnonymousThreadDetail(anonymousThreadDetailResult.value);
        } else {
          setAnonymousThreadDetail(null);
        }

        if (wallResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiWallEntry>(wallResult.value, wallPager);
          setWallEntries(normalized.items);
          setWallPager(normalized.pager);
        } else {
          setWallEntries([]);
        }

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        } else {
          setProfile(null);
        }

        if (forumProgressResult.status === "fulfilled") {
          setForumProgress(forumProgressResult.value);
        } else {
          setForumProgress(null);
        }

        if (favoritedThreadsResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiForumThread>(
            favoritedThreadsResult.value,
            myFavoritedThreadsPager,
          );
          setMyFavoritedThreads(normalized.items);
          setMyFavoritedThreadsPager(normalized.pager);
        } else {
          setMyFavoritedThreads([]);
        }

        if (shouldDropSession) {
          setSession(null);
        }

        setHealthError(nextHealthError);
        setArticlesError(nextArticlesError);
        setArticleDetailError(nextArticleDetailError);
        setThreadsError(nextThreadsError);
        setThreadDetailError(nextThreadDetailError);
        setAnonymousThreadsError(nextAnonymousThreadsError);
        setAnonymousThreadDetailError(nextAnonymousThreadDetailError);
        setWallError(nextWallError);
        setProfileError(
          shouldDropSession ? "当前会话已失效，已切回游客预览。" : nextProfileError,
        );
        setForumProgressError(nextForumProgressError);
        setMyFavoritedThreadsError(nextMyFavoritedThreadsError);
        setLastUpdatedAt(new Date().toISOString());
        setHasLoadedOnce(true);
        setIsLoadingData(false);
        setIsRefreshing(false);
        setAnonymousLoadingMore(false);
      });
    }

    void loadPageContent();

    return () => {
      active = false;
    };
  }, [
    articlePager.page,
    articlePager.pageSize,
    articleSearchKeyword,
    refreshNonce,
    routePath,
    selectedPublicProfileUsername,
    selectedArticleID,
    selectedAnonymousThreadID,
    selectedForumThreadID,
    session,
    threadPager.page,
    threadPager.pageSize,
    threadSearchKeyword,
    myFavoritedThreadsPager.page,
    myFavoritedThreadsPager.pageSize,
    wallPager.page,
    wallPager.pageSize,
    canAccessAnonymous,
  ]);

  useEffect(() => {
    let active = true;
    let inFlight = false;

    if (routePath !== "/anonymous" || !canAccessAnonymous || typeof window === "undefined") {
      return () => {
        active = false;
      };
    }

    const token = session?.accessToken;

    async function refreshAnonymousFeed(): Promise<void> {
      if (!active || inFlight) {
        return;
      }

      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      inFlight = true;
      try {
        const result = await fetchAnonymousThreads(token || undefined, {
          page: 1,
          pageSize: ANONYMOUS_BOARD_MESSAGE_CAP,
        });
        if (!active) {
          return;
        }

        const normalized = normalizeListResult<ApiForumThread>(
          result,
          createPagerState(ANONYMOUS_BOARD_MESSAGE_CAP),
        );
        setAnonymousThreadFeed((current) => mergeAnonymousThreads(current, normalized.items));
        setAnonymousThreadPager((current) => ({
          ...current,
          page:
            normalized.pager.totalPages > 0
              ? Math.min(Math.max(current.page, 1), normalized.pager.totalPages)
              : 1,
          pageSize: normalized.pager.pageSize,
          total: normalized.pager.total,
          totalPages: normalized.pager.totalPages,
        }));
        setAnonymousThreadsError("");
      } catch (error) {
        if (!active) {
          return;
        }

        setAnonymousThreadsError(`自动刷新失败：${toErrorMessage(error)}`);
      } finally {
        inFlight = false;
      }
    }

    const intervalID = window.setInterval(() => {
      void refreshAnonymousFeed();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalID);
    };
  }, [routePath, session, canAccessAnonymous]);

  useEffect(() => {
    if (routePath !== "/anonymous" || canAccessAnonymous) {
      return;
    }

    navigateRoute(isAuthenticated ? "/space" : "/login");
  }, [routePath, canAccessAnonymous, isAuthenticated, navigateRoute]);

  useEffect(() => {
    if (!selectedPublicProfileUsername || routePath !== "/space" || !profile?.username) {
      return;
    }

    const current = selectedPublicProfileUsername.trim().toLowerCase();
    const canonical = profile.username.trim().toLowerCase();
    if (!current || !canonical || current === canonical) {
      return;
    }

    navigateRoute(`/users/${encodeURIComponent(profile.username)}`);
  }, [navigateRoute, profile?.username, routePath, selectedPublicProfileUsername]);

  useEffect(() => {
    if (routePath !== "/space" || isAuthenticated || selectedPublicProfileUsername) {
      return;
    }

    navigateRoute("/login");
  }, [routePath, isAuthenticated, selectedPublicProfileUsername, navigateRoute]);

  useEffect(() => {
    if (routePath !== "/login" || !isAuthenticated) {
      return;
    }

    navigateRoute("/space");
  }, [routePath, isAuthenticated, navigateRoute]);

  useEffect(() => {
    let active = true;

    if (!session || !canManageGallery) {
      setAdminGalleryEntries([]);
      return () => {
        active = false;
      };
    }

    const accessToken = session.accessToken;

    async function loadAdminGalleryEntries(): Promise<void> {
      try {
        const entries = await fetchAdminGalleryEntries(accessToken, {
          page: adminGalleryPager.page,
          pageSize: adminGalleryPager.pageSize,
        });
        if (!active) {
          return;
        }

        const normalized = normalizeListResult<SiteGalleryEntry>(entries, adminGalleryPager);
        setAdminGalleryEntries(normalized.items);
        setAdminGalleryPager(normalized.pager);
      } catch (error) {
        if (!active) {
          return;
        }

        setGalleryActionState((current) => ({
          ...current,
          error: current.error || toErrorMessage(error),
        }));
      }
    }

    void loadAdminGalleryEntries();

    return () => {
      active = false;
    };
  }, [adminGalleryPager.page, adminGalleryPager.pageSize, canManageGallery, refreshNonce, session]);

  useEffect(() => {
    let active = true;

    if (!session || !canUseBangumiImport || routePath !== "/space") {
      setMyBangumiJobs([]);
      setBangumiJobsError("");
      return () => {
        active = false;
      };
    }

    async function loadMyBangumiJobs(): Promise<void> {
      const accessToken = session?.accessToken;
      if (!accessToken) {
        return;
      }
      try {
        const result = await fetchMyBangumiJobs(accessToken, {
          page: myBangumiJobsPager.page,
          pageSize: myBangumiJobsPager.pageSize,
        });
        if (!active) {
          return;
        }
        const normalized = normalizeListResult<BangumiImportJob>(result, myBangumiJobsPager);
        setMyBangumiJobs(normalized.items);
        setMyBangumiJobsPager(normalized.pager);
        setBangumiJobsError("");
      } catch (error) {
        if (!active) {
          return;
        }
        setMyBangumiJobs([]);
        setBangumiJobsError(toErrorMessage(error));
      }
    }

    void loadMyBangumiJobs();

    return () => {
      active = false;
    };
  }, [
    canUseBangumiImport,
    myBangumiJobsPager.page,
    myBangumiJobsPager.pageSize,
    refreshNonce,
    routePath,
    session,
  ]);

  useEffect(() => {
    let active = true;

    if (routePath !== "/space") {
      setMyBangumiCollections([]);
      setBangumiCollectionsError("");
      return () => {
        active = false;
      };
    }

    const targetPublicUsername =
      selectedPublicProfileUsername || (!session ? DEFAULT_PUBLIC_PROFILE_USERNAME : null);

    async function loadSpaceBangumiCollections(): Promise<void> {
      if (!targetPublicUsername && !session?.accessToken) {
        setMyBangumiCollections([]);
        setBangumiCollectionsError("");
        return;
      }

      try {
        const fetchCollectionsPage = (page: number): Promise<Paginated<BangumiCollection>> =>
          targetPublicUsername
            ? fetchUserBangumiCollections(targetPublicUsername, {
                page,
                pageSize: 100,
              })
            : fetchMyBangumiCollections(session!.accessToken, {
                page,
                pageSize: 100,
              });
        const items: BangumiCollection[] = [];
        let page = 1;
        while (true) {
          const pageResult = await fetchCollectionsPage(page);
          items.push(...pageResult.items);
          if (page >= pageResult.total_pages || pageResult.total_pages <= 0) {
            break;
          }
          page += 1;
        }
        if (!active) {
          return;
        }
        setMyBangumiCollections(items);
        setBangumiCollectionsError("");
      } catch (error) {
        if (!active) {
          return;
        }
        setMyBangumiCollections([]);
        setBangumiCollectionsError(toErrorMessage(error));
      }
    }

    void loadSpaceBangumiCollections();

    return () => {
      active = false;
    };
  }, [
    refreshNonce,
    routePath,
    selectedPublicProfileUsername,
    session,
  ]);

  useEffect(() => {
    let active = true;

    if (!session || !canAdmin || routePath !== "/admin") {
      setAdminDashboard(null);
      setSuperAdminDashboard(null);
      setForumAvailabilitySettings(null);
      setForumAvailabilityError("");
      setForumAvailabilityActionState(createEmptyActionState<ApiForumAvailabilitySettings>());
      setAdminUsers([]);
      setAdminContentBlocks([]);
      setRelays([]);
      setContests([]);
      setAdminDashboardError("");
      setAdminUsersError("");
      setAdminContentBlocksError("");
      setAdminActivityError("");
      return () => {
        active = false;
      };
    }

    async function loadAdminWorkspace(): Promise<void> {
      const accessToken = session?.accessToken;
      if (!accessToken) {
        return;
      }
      const [
        dashboardResult,
        superAdminResult,
        forumSettingsResult,
        usersResult,
        bangumiJobsResult,
        blocksResult,
        wallSubmissionsResult,
        relaysResult,
        contestsResult,
      ] = await Promise.allSettled([
        fetchAdminDashboard(accessToken),
        canSuperAdmin ? fetchSuperAdminDashboard(accessToken) : Promise.resolve<ApiSuperAdminDashboard | null>(null),
        canSuperAdmin
          ? fetchSuperAdminForumSettings(accessToken)
          : Promise.resolve<ApiForumAvailabilitySettings | null>(null),
        fetchAdminUsers(accessToken, {
          page: adminUsersPager.page,
          pageSize: adminUsersPager.pageSize,
        }),
        fetchAdminBangumiJobs(accessToken, {
          page: adminBangumiJobsPager.page,
          pageSize: adminBangumiJobsPager.pageSize,
        }),
        fetchAdminContentBlocks(accessToken, {
          page: adminContentBlocksPager.page,
          pageSize: adminContentBlocksPager.pageSize,
        }),
        fetchWallSubmissions(accessToken, {
          page: wallSubmissionsPager.page,
          pageSize: wallSubmissionsPager.pageSize,
        }),
        fetchRelays({
          page: relayPager.page,
          pageSize: relayPager.pageSize,
        }),
        fetchWritingContests({
          page: contestPager.page,
          pageSize: contestPager.pageSize,
        }),
      ]);

      if (!active) {
        return;
      }

      const previousAdminDashboard = adminDashboardRef.current;

      startTransition(() => {
        if (dashboardResult.status === "fulfilled") {
          const nextAdminDashboard = dashboardResult.value;
          setAdminDashboard(nextAdminDashboard);
          setAdminDashboardTrendBase((current) =>
            previousAdminDashboard
              ? createAdminDashboardSnapshot(previousAdminDashboard)
              : current ?? readStoredAdminDashboardSnapshot(),
          );
          persistAdminDashboardSnapshot(createAdminDashboardSnapshot(nextAdminDashboard));
        } else {
          setAdminDashboard(null);
        }
        setSuperAdminDashboard(superAdminResult.status === "fulfilled" ? superAdminResult.value : null);
        setForumAvailabilitySettings(
          forumSettingsResult.status === "fulfilled" ? forumSettingsResult.value : null,
        );

        if (usersResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiAdminUser>(usersResult.value, adminUsersPager);
          setAdminUsers(normalized.items);
          setAdminUsersPager(normalized.pager);
        } else {
          setAdminUsers([]);
        }

        if (bangumiJobsResult.status === "fulfilled") {
          const normalized = normalizeListResult<BangumiImportJob>(bangumiJobsResult.value, adminBangumiJobsPager);
          setAdminBangumiJobs(normalized.items);
          setAdminBangumiJobsPager(normalized.pager);
        } else {
          setAdminBangumiJobs([]);
        }

        if (blocksResult.status === "fulfilled") {
          const normalized = normalizeListResult<SiteContentBlock>(blocksResult.value, adminContentBlocksPager);
          setAdminContentBlocks(normalized.items);
          setAdminContentBlocksPager(normalized.pager);
        } else {
          setAdminContentBlocks([]);
        }

        if (wallSubmissionsResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiWallEntry>(wallSubmissionsResult.value, wallSubmissionsPager);
          setWallSubmissions(normalized.items);
          setWallSubmissionsPager(normalized.pager);
        } else {
          setWallSubmissions([]);
        }

        if (relaysResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiRelayEvent>(relaysResult.value, relayPager);
          setRelays(normalized.items);
          setRelayPager(normalized.pager);
        } else {
          setRelays([]);
        }

        if (contestsResult.status === "fulfilled") {
          const normalized = normalizeListResult<ApiWritingContest>(contestsResult.value, contestPager);
          setContests(normalized.items);
          setContestPager(normalized.pager);
        } else {
          setContests([]);
        }

        setAdminDashboardError(dashboardResult.status === "rejected" ? toErrorMessage(dashboardResult.reason) : "");
        setAdminUsersError(usersResult.status === "rejected" ? toErrorMessage(usersResult.reason) : "");
        setAdminBangumiJobsError(
          bangumiJobsResult.status === "rejected" ? toErrorMessage(bangumiJobsResult.reason) : "",
        );
        setAdminContentBlocksError(
          blocksResult.status === "rejected" ? toErrorMessage(blocksResult.reason) : "",
        );
        setWallModerationError(
          wallSubmissionsResult.status === "rejected"
            ? toErrorMessage(wallSubmissionsResult.reason)
            : "",
        );
        setAdminActivityError(
          relaysResult.status === "rejected"
            ? toErrorMessage(relaysResult.reason)
            : contestsResult.status === "rejected"
              ? toErrorMessage(contestsResult.reason)
              : "",
        );
        setForumAvailabilityError(
          forumSettingsResult.status === "rejected"
            ? toErrorMessage(forumSettingsResult.reason)
            : "",
        );
      });
    }

    void loadAdminWorkspace();

    return () => {
      active = false;
    };
  }, [
    adminContentBlocksPager.page,
    adminContentBlocksPager.pageSize,
    adminBangumiJobsPager.page,
    adminBangumiJobsPager.pageSize,
    adminUsersPager.page,
    adminUsersPager.pageSize,
    canAdmin,
    canSuperAdmin,
    contestPager.page,
    contestPager.pageSize,
    refreshNonce,
    relayPager.page,
    relayPager.pageSize,
    routePath,
    session,
    wallSubmissionsPager.page,
    wallSubmissionsPager.pageSize,
  ]);

  function handleRefresh(): void {
    setRefreshNonce((current) => current + 1);
  }

  function handleToggleTheme(): void {
    setThemeMode((current) => (current === "night" ? "day" : "night"));
  }

  function handleNotificationClick(notificationID: string, href?: string): void {
    markNotificationRead(notificationID);

    if (href) {
      handleNavigate(href);
    }
  }

  function handleNotificationsMarkAllRead(): void {
    markAllNotificationsRead();
  }

  function handleDismissHomeNotice(noticeID: string): void {
    const normalizedNoticeID = noticeID.trim();
    if (!normalizedNoticeID) {
      return;
    }

    setHomeNoticeSeenIDs((current) =>
      normalizeHomeNoticeSeenIDs([normalizedNoticeID, ...current]),
    );
  }

  function handleNavigate(nextHref: string): void {
    setIsHeaderHidden(false);
    const resolvedURL =
      typeof window !== "undefined"
        ? new URL(nextHref, window.location.origin)
        : new URL(`http://localhost${nextHref}`);
    const nextPath = normalizePath(resolvedURL.pathname);
    const nextPublicProfileUsername = readPublicProfileUsername(resolvedURL.pathname);

    if (nextPath === "/space" && !isAuthenticated && !nextPublicProfileUsername) {
      navigateRoute("/login");
      return;
    }

    if (nextPath === "/anonymous" && !canAccessAnonymous) {
      navigateRoute(isAuthenticated ? "/space" : "/login");
      return;
    }

    if (nextPath === "/login" && isAuthenticated) {
      navigateRoute("/space");
      return;
    }

    navigateRoute(nextHref);
  }

  function handleAuthFieldChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;

    setAuthForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleRegisterFieldChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;

    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleProfileFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value } = event.target;

    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleBangumiFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void {
    const { name, value } = event.target;

    setBangumiForm((current) => {
      switch (name) {
        case "sync_mode":
          return {
            ...current,
            sync_mode: value === "account" ? "account" : "subject_ids",
          };
        case "subjectIdsText":
        case "bangumi_username":
        case "status":
        case "visibility":
        case "maxItemsText":
          return {
            ...current,
            [name]: value,
          };
        default:
          return current;
      }
    });
  }

  function handleArticleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    const { name, value } = event.target;

    setArticleForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleArticleSearchKeywordChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextKeyword = event.target.value;
    setArticleSearchKeyword(nextKeyword);
    setArticlePager((current) =>
      current.page === 1 ? current : { ...current, page: 1 },
    );
  }

  function handleStartArticleCreate(): void {
    setArticleEditingTargetID(null);
    setArticleForm(createArticleFormState());
    setArticleActionState(createEmptyActionState<ApiArticle>());
    setArticleManageActionState(createEmptyActionState<ApiArticle | DeleteArticleResult>());
    handleNavigate("/stories/editor");
  }

  function handleStartArticleEdit(article: ApiArticle): void {
    setArticleEditingTargetID(article.id);
    setArticleForm(createArticleFormStateFromArticle(article));
    setArticleActionState(createEmptyActionState<ApiArticle>());
    setArticleManageActionState(createEmptyActionState<ApiArticle | DeleteArticleResult>());
    handleNavigate("/stories/editor");
  }

  function handleThreadFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" && event.target instanceof HTMLInputElement ? event.target.checked : value;

    setThreadForm((current) => ({
      ...current,
      [name]: nextValue,
    }));
  }

  function handleThreadSearchKeywordChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextKeyword = event.target.value;
    setThreadSearchKeyword(nextKeyword);
    setThreadPager((current) =>
      current.page === 1 ? current : { ...current, page: 1 },
    );
  }

  function handleAnonymousThreadFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" && event.target instanceof HTMLInputElement ? event.target.checked : value;

    setAnonymousThreadForm((current) => ({
      ...current,
      [name]: nextValue,
    }));
  }

  function handleReplyFieldChange(
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>,
  ): void {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" && event.target instanceof HTMLInputElement ? event.target.checked : value;

    setReplyForm((current) => ({
      ...current,
      ...(name === "threadID" ? { parentID: "", sage: false } : {}),
      [name]: nextValue,
    }));
  }

  function handleAnonymousReplyFieldChange(
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>,
  ): void {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" && event.target instanceof HTMLInputElement ? event.target.checked : value;

    setAnonymousReplyForm((current) => ({
      ...current,
      ...(name === "threadID" ? { parentID: "", sage: false } : {}),
      [name]: nextValue,
    }));
  }

  function handleWallFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value } = event.target;

    setWallForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const account = authForm.account.trim();
    const password = authForm.password.trim();
    if (!account || !password) {
      setLoginState({
        pending: false,
        error: "请填写账号和密码。",
      });
      return;
    }

    setLoginState({
      pending: true,
      error: "",
    });

    try {
      const nextSession = await login({
        account,
        password,
      });
      persistSession(nextSession);
      setSession(nextSession);
      setAuthForm((current) => ({
        ...current,
        password: "",
      }));
      setLoginState({
        pending: false,
        error: "",
      });
      setRegisterState({
        pending: false,
        error: "",
        success: "",
      });
    } catch (error) {
      setLoginState({
        pending: false,
        error: toErrorMessage(error),
      });
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const studentID = registerForm.student_id.trim();
    const username = registerForm.username.trim();
    const password = registerForm.password.trim();
    if (!studentID || !username || !password) {
      setRegisterState({
        pending: false,
        error: "请完整填写学号、用户名和密码。",
        success: "",
      });
      return;
    }

    setRegisterState({
      pending: true,
      error: "",
      success: "",
    });

    try {
      const result = await registerAccount({
        student_id: studentID,
        username,
        password,
      });
      setRegisterState({
        pending: false,
        error: "",
        success: `注册成功：@${result.username}，当前状态 ${result.status}。请使用该账号登录。`,
      });
      setAuthForm({
        account: username,
        password: "",
      });
      setRegisterForm({
        student_id: "",
        username,
        password: "",
      });
      setLoginState((current) => ({
        ...current,
        error: "",
      }));
    } catch (error) {
      setRegisterState({
        pending: false,
        error: toErrorMessage(error),
        success: "",
      });
    }
  }

  function handleLogout(): void {
    if (session) {
      void logout(session.accessToken).catch(() => undefined);
    }
    persistSession(null);
    setSession(null);
    setProfile(null);
    setProfileForm(createProfileFormState(null));
    setProfileActionState(createEmptyActionState<ApiProfile>());
    setBangumiActionState(createEmptyActionState<BangumiImportJob>());
    setMyFavoritedThreads([]);
    setMyFavoritedThreadsPager(createPagerState(6));
    setMyFavoritedThreadsError("");
    setArticleEditingTargetID(null);
    setArticleManageActionState(createEmptyActionState<ApiArticle | DeleteArticleResult>());
    setForumProgress(null);
    setForumSignInState(createEmptyActionState<ApiForumSignInResult>());
    setThreadEngagementActionState(createEmptyActionState<ApiThreadEngagement>());
    setForumAvailabilitySettings(null);
    setForumAvailabilityError("");
    setForumAvailabilityActionState(createEmptyActionState<ApiForumAvailabilitySettings>());
    setAdminGalleryEntries([]);
    setGalleryForm(createGalleryFormState());
    setGalleryActionState(createEmptyActionState<SiteGalleryEntry>());
    setGalleryUploadState(createEmptyActionState<SiteGalleryEntry[]>());
    setEditingGalleryEntryID(null);
    setLoginState({
      pending: false,
      error: "",
    });
    setRegisterState({
      pending: false,
      error: "",
      success: "",
    });
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setProfileActionState({
        pending: false,
        error: "请先登录后再编辑个人空间。",
        data: null,
        success: "",
      });
      return;
    }

    setProfileActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const previousUsername = (profile?.username || "").trim();
      const nextProfile = await updateMyProfile(session.accessToken, profileForm as UpdateProfilePayload);
      setProfile(nextProfile);
      setProfileActionState({
        pending: false,
        error: "",
        data: nextProfile,
        success:
          previousUsername && previousUsername !== nextProfile.username
            ? "个人资料已同步。空间 ID 已变更，请重新登录后继续操作。"
            : "个人资料已同步到后端。",
      });

      if (previousUsername && previousUsername !== nextProfile.username) {
        persistSession(null);
        setSession(null);
        handleNavigate(`/users/${encodeURIComponent(nextProfile.username)}`);
      }
    } catch (error) {
      setProfileActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleBangumiImportSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setBangumiActionState({
        pending: false,
        error: "请先登录后再发起 Bangumi 导入。",
        data: null,
        success: "",
      });
      return;
    }

    const syncMode: BangumiSyncMode = bangumiForm.sync_mode === "account" ? "account" : "subject_ids";
    let payload: BangumiImportPayload;
    if (syncMode === "account") {
      const username = bangumiForm.bangumi_username.trim();
      if (!username) {
        setBangumiActionState({
          pending: false,
          error: "请输入 Bangumi 登录用户名。",
          data: null,
          success: "",
        });
        return;
      }

      const parsedMaxItems = Number.parseInt(bangumiForm.maxItemsText, 10);
      const maxItems = Number.isFinite(parsedMaxItems) && parsedMaxItems > 0 ? parsedMaxItems : undefined;
      payload = {
        sync_mode: "account",
        bangumi_username: username,
        visibility: bangumiForm.visibility || undefined,
        max_items: maxItems,
      };
    } else {
      const subjectIDs = bangumiForm.subjectIdsText
        .split(/[,\s]+/)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0);

      if (subjectIDs.length === 0) {
        setBangumiActionState({
          pending: false,
          error: "请至少填写一个有效的 Bangumi 条目 ID。",
          data: null,
          success: "",
        });
        return;
      }

      payload = {
        sync_mode: "subject_ids",
        subject_ids: subjectIDs,
        status: bangumiForm.status,
        visibility: bangumiForm.visibility || undefined,
      };
    }

    setBangumiActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const job = await importBangumiCollections(session.accessToken, payload);
      setBangumiActionState({
        pending: false,
        error: "",
        data: job,
        success: syncMode === "account" ? "帐号批量同步已自动执行，无需审批。" : "导入已自动执行，无需审批。",
      });
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setBangumiActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleArticleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setArticleActionState({
        pending: false,
        error: "请先登录后再提交文章。",
        data: null,
        success: "",
      });
      return;
    }

    setArticleActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const payload: CreateArticlePayload = {
        title: articleForm.title.trim(),
        summary: articleForm.summary.trim(),
        content: articleForm.content.trim(),
        visibility: articleForm.visibility,
        tags: parseTags(articleForm.tagsText),
      };
      const article = articleEditingTargetID
        ? await updateArticle(articleEditingTargetID, payload, session.accessToken)
        : await createArticle(payload, session.accessToken);

      setArticleActionState({
        pending: false,
        error: "",
        data: article,
        success: articleEditingTargetID ? "文章已更新。" : "文章已发布。",
      });
      if (articleEditingTargetID) {
        setArticleEditingTargetID(null);
        handleNavigate(`/stories/${encodeURIComponent(article.id)}`);
      } else {
        setArticleForm(createArticleFormState());
      }
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setArticleActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleArticleDelete(articleID: string): Promise<boolean> {
    if (!session) {
      setArticleManageActionState({
        pending: false,
        error: "请先登录后再删除文章。",
        data: null,
        success: "",
      });
      return false;
    }

    if (!canAdmin) {
      setArticleManageActionState({
        pending: false,
        error: "当前账号没有删除文章权限。",
        data: null,
        success: "",
      });
      return false;
    }

    setArticleManageActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await deleteArticle(articleID, session.accessToken);
      setArticleManageActionState({
        pending: false,
        error: "",
        data: result,
        success: "文章已删除。",
      });
      setArticleEditingTargetID(null);
      handleNavigate("/stories");
      setRefreshNonce((current) => current + 1);
      return true;
    } catch (error) {
      setArticleManageActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
      return false;
    }
  }

  async function handleThreadSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setThreadActionState({
        pending: false,
        error: "请先登录后再发帖。",
        data: null,
        success: "",
      });
      return;
    }

    setThreadActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const thread = await createThread(
        {
          title: threadForm.title.trim(),
          content: threadForm.content.trim(),
          board: threadForm.board.trim(),
          anonymous: false,
          tags: parseTags(threadForm.tagsText),
        },
        session.accessToken,
      );

      setThreadForm(createThreadFormState());
      setReplyForm(createReplyFormState(thread.id));
      setThreadActionState({
        pending: false,
        error: "",
        data: thread,
        success: "主题已发布。",
      });
      handleNavigate(`/forum/threads/${encodeURIComponent(thread.id)}`);
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setThreadActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleThreadDelete(threadID: string): Promise<boolean> {
    if (!session) {
      setThreadManageActionState({
        pending: false,
        error: "请先登录后再删除帖子。",
        data: null,
        success: "",
      });
      return false;
    }

    if (!canAdmin) {
      setThreadManageActionState({
        pending: false,
        error: "当前账号没有删除帖子权限。",
        data: null,
        success: "",
      });
      return false;
    }

    setThreadManageActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await deleteThread(threadID, session.accessToken);
      setThreadManageActionState({
        pending: false,
        error: "",
        data: result,
        success: "帖子已删除。",
      });
      setExpandedReplyIDs([]);
      setOnlyShowThreadAuthor(false);
      setReplyForm(createReplyFormState());
      handleNavigate("/forum");
      setRefreshNonce((current) => current + 1);
      return true;
    } catch (error) {
      setThreadManageActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
      return false;
    }
  }

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setReplyActionState({
        pending: false,
        error: "请先登录后再回复。",
        data: null,
        success: "",
      });
      return;
    }

    if (!replyForm.threadID) {
      setReplyActionState({
        pending: false,
        error: "请先选择要回复的主题。",
        data: null,
        success: "",
      });
      return;
    }

    setReplyActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const reply = await createReply(
        replyForm.threadID,
        {
          content: replyForm.content.trim(),
          anonymous: false,
          parent_id: replyForm.parentID || undefined,
          sage: replyForm.sage,
        },
        session.accessToken,
      );

      setReplyForm((current) => ({
        ...current,
        parentID: "",
        content: "",
        anonymous: false,
        sage: false,
      }));
      setReplyActionState({
        pending: false,
        error: "",
        data: reply,
        success: replyForm.parentID ? "楼中楼回复已提交。" : "回复已提交。",
      });
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setReplyActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleAnonymousThreadSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setAnonymousThreadActionState({
        pending: false,
        error: "请先登录后再发送聊天室消息。",
        data: null,
        success: "",
      });
      return;
    }

    setAnonymousThreadActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const content = anonymousThreadForm.content.trim();
      const generatedTitle = content.slice(0, 24) || "聊天室消息";
      const thread = await createAnonymousThread(
        {
          title: anonymousThreadForm.title.trim() || generatedTitle,
          content,
          tags: ["聊天室"],
        },
        session.accessToken,
      );

      setAnonymousThreadForm({
        ...createThreadFormState(),
        board: "匿名板",
        anonymous: true,
        tagsText: "",
      });
      setAnonymousReplyForm((current) => ({
        ...current,
        threadID: "",
        parentID: "",
        content: "",
        anonymous: true,
        sage: false,
      }));
      setAnonymousThreadActionState({
        pending: false,
        error: "",
        data: thread,
        success: "聊天室消息已发送。",
      });
      setPendingAnonymousScrollMessageID(thread.id);
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setAnonymousThreadActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleAnonymousLoadMore(): Promise<void> {
    if (anonymousLoadingMore || !canAccessAnonymous) {
      return;
    }

    const nextPage = anonymousThreadPager.page + 1;
    if (anonymousThreadPager.totalPages > 0 && nextPage > anonymousThreadPager.totalPages) {
      return;
    }

    setAnonymousLoadingMore(true);

    try {
      const result = await fetchAnonymousThreads(session?.accessToken || undefined, {
        page: nextPage,
        pageSize: ANONYMOUS_BOARD_MESSAGE_CAP,
      });
      const normalized = normalizeListResult<ApiForumThread>(
        result,
        createPagerState(ANONYMOUS_BOARD_MESSAGE_CAP),
      );

      setAnonymousThreadFeed((current) => mergeAnonymousThreads(current, normalized.items));
      setAnonymousThreadPager((current) => ({
        ...current,
        page:
          normalized.pager.totalPages > 0
            ? Math.min(Math.max(current.page, normalized.pager.page), normalized.pager.totalPages)
            : 1,
        pageSize: normalized.pager.pageSize,
        total: normalized.pager.total,
        totalPages: normalized.pager.totalPages,
      }));
      setAnonymousThreadsError("");
    } catch (error) {
      setAnonymousThreadsError(`加载历史消息失败：${toErrorMessage(error)}`);
    } finally {
      setAnonymousLoadingMore(false);
    }
  }

  function handleAnonymousScrollDone(): void {
    setPendingAnonymousScrollMessageID(null);
  }

  function handleAnonymousReplyTargetChange(threadID: string): void {
    setAnonymousReplyForm((current) => ({
      ...current,
      threadID,
      parentID: "",
      content: "",
      sage: false,
    }));
  }

  function handleAnonymousReplyTargetClear(): void {
    setAnonymousReplyForm((current) => ({
      ...current,
      threadID: "",
      parentID: "",
      content: "",
      sage: false,
    }));
  }

  async function handleAnonymousReplySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setAnonymousReplyActionState({
        pending: false,
        error: "请先登录后再回复匿名主题。",
        data: null,
        success: "",
      });
      return;
    }

    if (!anonymousReplyForm.threadID) {
      setAnonymousReplyActionState({
        pending: false,
        error: "请先选择要回复的匿名主题。",
        data: null,
        success: "",
      });
      return;
    }

    setAnonymousReplyActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const reply = await createAnonymousReply(
        anonymousReplyForm.threadID,
        {
          content: anonymousReplyForm.content.trim(),
          parent_id: anonymousReplyForm.parentID || undefined,
          sage: anonymousReplyForm.sage,
        },
        session.accessToken,
      );

      const keepReplyTarget = Boolean(selectedAnonymousThreadID);
      setAnonymousReplyForm((current) => ({
        ...current,
        threadID: keepReplyTarget ? current.threadID : "",
        parentID: "",
        content: "",
        anonymous: true,
        sage: false,
      }));
      setAnonymousReplyActionState({
        pending: false,
        error: "",
        data: reply,
        success: anonymousReplyForm.sage ? "匿名回复已提交（不顶帖 (Sage)）。" : "匿名回复已提交。",
      });
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setAnonymousReplyActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  function focusForumReplyBox(): void {
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        forumReplyTextareaRef.current?.focus();
        forumReplyTextareaRef.current?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      });
    }
  }

  function preserveForumViewport(action: () => void): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      action();
      return;
    }

    const { scrollX, scrollY } = window;
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    action();

    const restore = (): void => {
      window.scrollTo(scrollX, scrollY);
    };

    window.requestAnimationFrame(() => {
      restore();
      window.requestAnimationFrame(() => {
        restore();
        root.style.scrollBehavior = previousScrollBehavior;
      });
    });
  }

  function handleReplyToFloor(reply: ApiForumReply): void {
    const threadReplies = threadDetail?.replies || [];
    const replyIndex = new Map(threadReplies.map((item) => [item.id, item]));
    const visited = new Set<string>();
    let rootReplyID = reply.id;
    let cursor: ApiForumReply | undefined = reply;

    while (cursor?.parent_id) {
      if (visited.has(cursor.id)) {
        break;
      }
      visited.add(cursor.id);

      const parent = replyIndex.get(cursor.parent_id);
      if (!parent) {
        rootReplyID = cursor.parent_id;
        break;
      }

      rootReplyID = parent.id;
      cursor = parent;
    }

    preserveForumViewport(() => {
      setReplyForm((current) => ({
        ...current,
        threadID: selectedForumThreadID || current.threadID,
        parentID: reply.id,
        content:
          current.parentID === reply.id && current.content.trim()
            ? current.content
            : `@${reply.author} `,
        sage: false,
      }));
      setExpandedReplyIDs((current) =>
        current.includes(rootReplyID) ? current : [...current, rootReplyID],
      );
    });
  }

  function handleCollapseNestedReplies(): void {
    preserveForumViewport(() => {
      setExpandedReplyIDs([]);
    });
  }

  function handleExpandedReplyToggle(replyID: string): void {
    preserveForumViewport(() => {
      setExpandedReplyIDs((current) =>
        current.includes(replyID)
          ? current.filter((currentID) => currentID !== replyID)
          : [...current, replyID],
      );
    });
  }

  function handleClearReplyTarget(): void {
    setReplyForm((current) => ({
      ...current,
      parentID: "",
    }));
  }

  function handleInsertReplySnippet(snippet: string): void {
    setReplyForm((current) => ({
      ...current,
      content: current.content ? `${current.content}${snippet}` : snippet.trimStart(),
    }));
    focusForumReplyBox();
  }

  async function handleThreadEngagementToggle(
    field: "liked" | "favorited",
  ): Promise<void> {
    if (!session) {
      setThreadEngagementActionState({
        pending: false,
        error: "请先登录后再进行点赞或收藏。",
        data: null,
        success: "",
      });
      return;
    }
    if (!hasVerifiedSpaceAccess) {
      setThreadEngagementActionState({
        pending: false,
        error: "当前账号还没有论坛互动权限，请先完成认证。",
        data: null,
        success: "",
      });
      return;
    }
    if (!activeForumThread) {
      return;
    }

    const nextValue = field === "liked" ? !activeForumThread.liked : !activeForumThread.favorited;

    setThreadEngagementActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const engagement = await updateThreadEngagement(
        activeForumThread.id,
        field === "liked" ? { liked: nextValue } : { favorited: nextValue },
        session.accessToken,
      );

      setThreadDetail((current) => {
        if (!current || current.thread.id !== engagement.thread_id) {
          return current;
        }
        return {
          ...current,
          thread: applyThreadEngagement(current.thread, engagement),
        };
      });
      setThreadFeed((current) =>
        current.map((thread) => applyThreadEngagement(thread, engagement)),
      );
      setMyFavoritedThreads((current) => {
        const currentThread = activeForumThread.id === engagement.thread_id
          ? applyThreadEngagement(activeForumThread, engagement)
          : null;
        if (engagement.favorited) {
          const updated = current.map((thread) => applyThreadEngagement(thread, engagement));
          if (updated.some((thread) => thread.id === engagement.thread_id)) {
            return updated;
          }
          return currentThread ? [currentThread, ...updated] : updated;
        }

        return current
          .filter((thread) => thread.id !== engagement.thread_id)
          .map((thread) => applyThreadEngagement(thread, engagement));
      });
      setThreadEngagementActionState({
        pending: false,
        error: "",
        data: engagement,
        success:
          field === "liked"
            ? engagement.liked
              ? "已点赞该主题。"
              : "已取消点赞。"
            : engagement.favorited
              ? "已收藏该主题。"
              : "已取消收藏。",
      });
    } catch (error) {
      setThreadEngagementActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleShareThread(): Promise<void> {
    if (typeof window === "undefined" || !selectedForumThreadID) {
      return;
    }

    const url = `${window.location.origin}/forum/threads/${encodeURIComponent(selectedForumThreadID)}`;
    try {
      const browserNavigator = window.navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        clipboard?: Clipboard;
      };
      const share = browserNavigator.share;
      const clipboard = browserNavigator.clipboard;

      if (typeof share === "function") {
        await share({
          title: activeForumThread?.title || "论坛主题",
          url,
        });
      } else if (clipboard && typeof clipboard.writeText === "function") {
        await clipboard.writeText(url);
      }

      setReplyActionState((current) => ({
        ...current,
        success: "主题链接已复制，可以直接分享给别人。",
      }));
    } catch (error) {
      setReplyActionState((current) => ({
        ...current,
        error: current.error || toErrorMessage(error),
      }));
    }
  }

  async function handleForumSignIn(): Promise<void> {
    if (!session) {
      setForumSignInState({
        pending: false,
        error: "请先登录后再签到。",
        data: null,
        success: "",
      });
      return;
    }

    setForumSignInState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await signInForum(session.accessToken);
      setForumProgress(result.progress);
      setForumSignInState({
        pending: false,
        error: "",
        data: result,
        success: result.message,
      });
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setForumSignInState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleWallSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setWallActionState({
        pending: false,
        error: "请先登录后再投稿。",
        data: null,
        success: "",
      });
      return;
    }

    setWallActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const entry = await createWallSubmission(
        {
          title: wallForm.title.trim(),
          content: wallForm.content.trim(),
          images: parseLines(wallForm.imagesText),
        },
        session.accessToken,
      );

      setWallForm(createWallSubmissionFormState());
      setWallActionState({
        pending: false,
        error: "",
        data: entry,
        success: "投稿已提交，等待审核。",
      });
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setWallActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  function handleGalleryFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    const target = event.target;
    const nextValue =
      "checked" in target && target.type === "checkbox" ? target.checked : target.value;

    setGalleryForm((current) => ({
      ...current,
      [target.name]: nextValue,
    }));
  }

  function handleGalleryEditStart(entry: SiteGalleryEntry): void {
    setEditingGalleryEntryID(entry.id);
    setGalleryForm(createGalleryFormState(entry));
    setGalleryActionState(createEmptyActionState<SiteGalleryEntry>());
    setGalleryUploadState(createEmptyActionState<SiteGalleryEntry[]>());
  }

  function resetGalleryEditor(): void {
    setEditingGalleryEntryID(null);
    setGalleryForm(createGalleryFormState());
    setGalleryUploadState(createEmptyActionState<SiteGalleryEntry[]>());
  }

  async function handleGalleryUploadFiles(files: readonly File[]): Promise<void> {
    if (!session || !canManageGallery) {
      setGalleryUploadState({
        pending: false,
        error: "请先登录管理员账号后再上传图片。",
        data: null,
        success: "",
      });
      return;
    }

    if (!files.length) {
      setGalleryUploadState({
        pending: false,
        error: "请先选择至少一张图片。",
        data: null,
        success: "",
      });
      return;
    }

    setGalleryUploadState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const uploadResult = await uploadGalleryAssets(session.accessToken, files);
      const uploadedURLs = uploadResult.files
        .map((item) => item.url.trim())
        .filter((url) => Boolean(url));

      if (!uploadedURLs.length) {
        throw new Error("上传成功，但没有返回可用图片地址。");
      }

      if (uploadedURLs.length === 1) {
        setGalleryForm((current) => ({
          ...current,
          extra_text: uploadedURLs[0],
        }));
        setGalleryUploadState({
          pending: false,
          error: "",
          data: null,
          success: "图片已上传并填入当前条目。",
        });
        return;
      }

      if (editingGalleryEntryID) {
        setGalleryForm((current) => ({
          ...current,
          extra_text: uploadedURLs[0],
        }));
        setGalleryUploadState({
          pending: false,
          error: "",
          data: null,
          success: `已上传 ${uploadedURLs.length} 张图片。编辑模式下已填入第一张，批量建条目请先退出编辑模式。`,
        });
        return;
      }

      const sortOrderRaw = Number.parseInt(galleryForm.sort_order.trim() || "0", 10);
      const baseSortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : 0;
      const baseTitle = galleryForm.title.trim() || "展示图片";
      const baseSlug = slugifyValue(galleryForm.slug.trim() || baseTitle);
      const subtitle = galleryForm.subtitle.trim();
      const body = galleryForm.body.trim();
      const createdEntries: SiteGalleryEntry[] = [];
      const uniquePrefix = Date.now().toString(36);

      for (let index = 0; index < uploadedURLs.length; index += 1) {
        const orderNo = index + 1;
        const title = `${baseTitle} ${String(orderNo).padStart(2, "0")}`;
        const payload: CreateGalleryEntryPayload = {
          entry_type: galleryForm.entry_type,
          slug: `${baseSlug}-${uniquePrefix}-${orderNo}`,
          title,
          subtitle: subtitle || undefined,
          body: body || undefined,
          extra_text: uploadedURLs[index],
          sort_order: baseSortOrder + index,
          active: galleryForm.active,
        };

        const entry = await createGalleryEntry(session.accessToken, payload);
        createdEntries.push(entry);
      }

      setGalleryUploadState({
        pending: false,
        error: "",
        data: createdEntries,
        success: `已上传并创建 ${createdEntries.length} 条展示条目。`,
      });
      setGalleryActionState({
        pending: false,
        error: "",
        data: createdEntries[createdEntries.length - 1] ?? null,
        success: `批量创建完成（${createdEntries.length} 条）。`,
      });
      resetGalleryEditor();
      handleRefresh();
    } catch (error) {
      setGalleryUploadState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleGallerySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setGalleryActionState({
        pending: false,
        error: "请先登录管理员账号后再维护展示墙。",
        data: null,
        success: "",
      });
      return;
    }

    const title = galleryForm.title.trim();
    if (!title) {
      setGalleryActionState({
        pending: false,
        error: "标题不能为空。",
        data: null,
        success: "",
      });
      return;
    }

    const parsedSortOrder = Number.parseInt(galleryForm.sort_order.trim() || "0", 10);
    if (!Number.isFinite(parsedSortOrder)) {
      setGalleryActionState({
        pending: false,
        error: "排序必须是整数。",
        data: null,
        success: "",
      });
      return;
    }

    setGalleryActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      let nextEntry: SiteGalleryEntry;

      if (editingGalleryEntryID) {
        const payload: UpdateGalleryEntryPayload = {
          slug: galleryForm.slug.trim() || undefined,
          title,
          subtitle: galleryForm.subtitle.trim() || undefined,
          body: galleryForm.body.trim() || undefined,
          extra_text: galleryForm.extra_text.trim() || undefined,
          sort_order: parsedSortOrder,
          active: galleryForm.active,
        };

        nextEntry = await updateGalleryEntry(session.accessToken, editingGalleryEntryID, payload);
      } else {
        const payload: CreateGalleryEntryPayload = {
          entry_type: galleryForm.entry_type,
          slug: galleryForm.slug.trim() || undefined,
          title,
          subtitle: galleryForm.subtitle.trim() || undefined,
          body: galleryForm.body.trim() || undefined,
          extra_text: galleryForm.extra_text.trim() || undefined,
          sort_order: parsedSortOrder,
          active: galleryForm.active,
        };

        nextEntry = await createGalleryEntry(session.accessToken, payload);
      }

      setGalleryActionState({
        pending: false,
        error: "",
        data: nextEntry,
        success: editingGalleryEntryID ? "展示条目已更新。" : "展示条目已创建。",
      });
      resetGalleryEditor();
      handleRefresh();
    } catch (error) {
      setGalleryActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleGalleryAnnotate(entryID: string, annotation: string): Promise<void> {
    if (!session || !canManageGallery) {
      setGalleryActionState({
        pending: false,
        error: "仅管理员可编辑图片注释。",
        data: null,
        success: "",
      });
      throw new Error("permission denied");
    }

    setGalleryActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const nextEntry = await updateGalleryEntry(session.accessToken, entryID, {
        body: annotation.trim() || undefined,
      });

      if (editingGalleryEntryID === entryID) {
        setGalleryForm((current) => ({
          ...current,
          body: annotation,
        }));
      }

      setGalleryActionState({
        pending: false,
        error: "",
        data: nextEntry,
        success: "图片注释已更新。",
      });
      handleRefresh();
    } catch (error) {
      const message = toErrorMessage(error);
      setGalleryActionState({
        pending: false,
        error: message,
        data: null,
        success: "",
      });
      throw error;
    }
  }

  async function handleGalleryDelete(entry: SiteGalleryEntry): Promise<void> {
    if (!session) {
      setGalleryActionState({
        pending: false,
        error: "请先登录管理员账号后再删除展示条目。",
        data: null,
        success: "",
      });
      return;
    }

    if (typeof window !== "undefined") {
      const safeTitle = sanitizeDisplayText(entry.title, "未命名条目");
      const confirmed = window.confirm(`确定删除展示条目「${safeTitle}」吗？`);
      if (!confirmed) {
        return;
      }
    }

    setGalleryActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      await deleteGalleryEntry(session.accessToken, entry.id);
      if (editingGalleryEntryID === entry.id) {
        resetGalleryEditor();
      }
      setGalleryActionState({
        pending: false,
        error: "",
        data: null,
        success: "展示条目已删除。",
      });
      handleRefresh();
    } catch (error) {
      setGalleryActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleGallerySortNudge(entry: SiteGalleryEntry, delta: -1 | 1): Promise<void> {
    if (!session) {
      setGalleryActionState({
        pending: false,
        error: "请先登录管理员账号后再调整展示条目顺序。",
        data: null,
        success: "",
      });
      return;
    }

    setGalleryActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const nextEntry = await updateGalleryEntry(session.accessToken, entry.id, {
        sort_order: entry.sort_order + delta,
      });

      setGalleryActionState({
        pending: false,
        error: "",
        data: nextEntry,
        success: delta < 0 ? "展示条目已上移。" : "展示条目已下移。",
      });
      handleRefresh();
    } catch (error) {
      setGalleryActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleGalleryReorder(orderedEntryIDs: readonly string[]): Promise<void> {
    if (!session) {
      setGalleryActionState({
        pending: false,
        error: "请先登录管理员账号后再调整展示条目顺序。",
        data: null,
        success: "",
      });
      return;
    }

    const normalizedIDs = orderedEntryIDs
      .map((entryID) => entryID.trim())
      .filter((entryID): entryID is string => Boolean(entryID));
    if (normalizedIDs.length < 2) {
      return;
    }

    const entryMap = new Map(adminGalleryEntries.map((entry) => [entry.id, entry]));
    const typedOrdered: Record<SiteGalleryEntry["entry_type"], SiteGalleryEntry[]> = {
      album: [],
      polaroid: [],
      paper: [],
      timeline: [],
      track: [],
    };

    normalizedIDs.forEach((entryID) => {
      const entry = entryMap.get(entryID);
      if (!entry) {
        return;
      }
      typedOrdered[entry.entry_type].push(entry);
    });

    const updateTasks: Array<{ id: string; sortOrder: number }> = [];
    (Object.keys(typedOrdered) as SiteGalleryEntry["entry_type"][]).forEach((entryType) => {
      const nextTypedEntries = typedOrdered[entryType];
      if (!nextTypedEntries.length) {
        return;
      }

      const baseline = [...nextTypedEntries]
        .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
        .map((entry) => entry.sort_order);

      nextTypedEntries.forEach((entry, index) => {
        const nextSortOrder = baseline[index] ?? index * 10;
        if (entry.sort_order !== nextSortOrder) {
          updateTasks.push({
            id: entry.id,
            sortOrder: nextSortOrder,
          });
        }
      });
    });

    if (!updateTasks.length) {
      return;
    }

    setGalleryActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      await Promise.all(
        updateTasks.map((task) =>
          updateGalleryEntry(session.accessToken, task.id, {
            sort_order: task.sortOrder,
          }),
        ),
      );
      setGalleryActionState({
        pending: false,
        error: "",
        data: null,
        success: "展示条目顺序已更新。",
      });
      handleRefresh();
    } catch (error) {
      setGalleryActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleGalleryBulkSetActive(entryIDs: readonly string[], active: boolean): Promise<void> {
    if (!session) {
      setGalleryActionState({
        pending: false,
        error: "请先登录管理员账号后再批量更新。",
        data: null,
        success: "",
      });
      return;
    }

    const normalizedIDs = Array.from(new Set(entryIDs.map((entryID) => entryID.trim()).filter(Boolean)));
    if (!normalizedIDs.length) {
      return;
    }

    setGalleryActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      await Promise.all(
        normalizedIDs.map((entryID) =>
          updateGalleryEntry(session.accessToken, entryID, {
            active,
          }),
        ),
      );
      setGalleryActionState({
        pending: false,
        error: "",
        data: null,
        success: active ? "已批量设为公开展示。" : "已批量设为隐藏。",
      });
      handleRefresh();
    } catch (error) {
      setGalleryActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleGalleryBulkDelete(entryIDs: readonly string[]): Promise<void> {
    if (!session) {
      setGalleryActionState({
        pending: false,
        error: "请先登录管理员账号后再批量删除。",
        data: null,
        success: "",
      });
      return;
    }

    const normalizedIDs = Array.from(new Set(entryIDs.map((entryID) => entryID.trim()).filter(Boolean)));
    if (!normalizedIDs.length) {
      return;
    }

    setGalleryActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      await Promise.all(normalizedIDs.map((entryID) => deleteGalleryEntry(session.accessToken, entryID)));
      if (editingGalleryEntryID && normalizedIDs.includes(editingGalleryEntryID)) {
        resetGalleryEditor();
      }
      setGalleryActionState({
        pending: false,
        error: "",
        data: null,
        success: `已批量删除 ${normalizedIDs.length} 条展示条目。`,
      });
      handleRefresh();
    } catch (error) {
      setGalleryActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  function handleContentBlockFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    const target = event.target;
    const nextValue =
      "checked" in target && target.type === "checkbox" ? target.checked : target.value;

    setContentBlockForm((current) => ({
      ...current,
      [target.name]: nextValue,
    }));
  }

  function handleContentBlockEditStart(block: SiteContentBlock): void {
    setEditingContentBlockID(block.id);
    setContentBlockForm(createContentBlockFormState(block));
    setContentBlockActionState(createEmptyActionState<SiteContentBlock>());
  }

  function resetContentBlockEditor(): void {
    setEditingContentBlockID(null);
    setContentBlockForm(createContentBlockFormState());
  }

  function createPortalActivitySlug(title: string): string {
    const suffix = Date.now().toString(36);
    return `activity-${slugifyValue(title)}-${suffix}`;
  }

  async function handlePortalActivityCreate(payload: ActivityEditorPayload): Promise<void> {
    const title = payload.title.trim();
    const label = payload.label.trim();
    if (!session || !canAdmin) {
      setPortalActivityActionState({
        pending: false,
        error: "请先登录管理员账号后再编辑时间轴。",
        data: null,
        success: "",
      });
      throw new Error("admin session required");
    }

    if (!title) {
      setPortalActivityActionState({
        pending: false,
        error: "活动标题不能为空。",
        data: null,
        success: "",
      });
      throw new Error("activity title required");
    }

    if (!label) {
      setPortalActivityActionState({
        pending: false,
        error: "时间标签不能为空，格式需为 YYYY-MM-DD。",
        data: null,
        success: "",
      });
      throw new Error("activity label required");
    }

    if (!isStandardDateLabel(label)) {
      setPortalActivityActionState({
        pending: false,
        error: "时间标签格式错误，请填写 YYYY-MM-DD（例如 2026-04-06）。",
        data: null,
        success: "",
      });
      throw new Error("invalid activity label date");
    }

    setPortalActivityActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const maxSort = societyActivities.reduce(
        (max, item) => Math.max(max, item.sortOrder ?? 0),
        0,
      );
      const result = await createContentBlock(session.accessToken, {
        block_type: "portal_activity",
        slug: createPortalActivitySlug(title),
        label,
        title,
        description: payload.description.trim() || undefined,
        sort_order: maxSort + 10,
        active: true,
      });

      setPortalActivityActionState({
        pending: false,
        error: "",
        data: result,
        success: "时间轴节点已新增。",
      });
      handleRefresh();
    } catch (error) {
      setPortalActivityActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
      throw error instanceof Error ? error : new Error("create timeline activity failed");
    }
  }

  async function handlePortalActivityUpdate(
    activity: DisplayActivity,
    payload: ActivityEditorPayload,
  ): Promise<void> {
    const title = payload.title.trim();
    const label = payload.label.trim();
    if (!session || !canAdmin) {
      setPortalActivityActionState({
        pending: false,
        error: "请先登录管理员账号后再编辑时间轴。",
        data: null,
        success: "",
      });
      throw new Error("admin session required");
    }

    if (!activity.blockID) {
      setPortalActivityActionState({
        pending: false,
        error: "当前节点缺少内容块 ID，无法更新。",
        data: null,
        success: "",
      });
      throw new Error("activity block id missing");
    }

    if (!title) {
      setPortalActivityActionState({
        pending: false,
        error: "活动标题不能为空。",
        data: null,
        success: "",
      });
      throw new Error("activity title required");
    }

    if (!label) {
      setPortalActivityActionState({
        pending: false,
        error: "时间标签不能为空，格式需为 YYYY-MM-DD。",
        data: null,
        success: "",
      });
      throw new Error("activity label required");
    }

    if (!isStandardDateLabel(label)) {
      setPortalActivityActionState({
        pending: false,
        error: "时间标签格式错误，请填写 YYYY-MM-DD（例如 2026-04-06）。",
        data: null,
        success: "",
      });
      throw new Error("invalid activity label date");
    }

    setPortalActivityActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await updateContentBlock(session.accessToken, activity.blockID, {
        label,
        title,
        description: payload.description.trim() || undefined,
        sort_order: activity.sortOrder ?? 0,
        active: activity.active ?? true,
      });

      setPortalActivityActionState({
        pending: false,
        error: "",
        data: result,
        success: "时间轴节点已更新。",
      });
      handleRefresh();
    } catch (error) {
      setPortalActivityActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
      throw error instanceof Error ? error : new Error("update timeline activity failed");
    }
  }

  async function handlePortalActivityDelete(activity: DisplayActivity): Promise<void> {
    if (!session || !canAdmin) {
      setPortalActivityActionState({
        pending: false,
        error: "请先登录管理员账号后再编辑时间轴。",
        data: null,
        success: "",
      });
      throw new Error("admin session required");
    }

    if (!activity.blockID) {
      setPortalActivityActionState({
        pending: false,
        error: "当前节点缺少内容块 ID，无法删除。",
        data: null,
        success: "",
      });
      throw new Error("activity block id missing");
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`确定删除时间轴节点「${activity.title}」吗？`);
      if (!confirmed) {
        return;
      }
    }

    setPortalActivityActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      await deleteContentBlock(session.accessToken, activity.blockID);
      setPortalActivityActionState({
        pending: false,
        error: "",
        data: null,
        success: "时间轴节点已删除。",
      });
      handleRefresh();
    } catch (error) {
      setPortalActivityActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
      throw error instanceof Error ? error : new Error("delete timeline activity failed");
    }
  }

  async function handleContentBlockSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setContentBlockActionState({
        pending: false,
        error: "请先登录管理员账号后再维护站点内容。",
        data: null,
        success: "",
      });
      return;
    }

    const title = contentBlockForm.title.trim();
    if (!title) {
      setContentBlockActionState({
        pending: false,
        error: "标题不能为空。",
        data: null,
        success: "",
      });
      return;
    }

    const sortOrder = Number.parseInt(contentBlockForm.sort_order.trim() || "0", 10);
    if (!Number.isFinite(sortOrder)) {
      setContentBlockActionState({
        pending: false,
        error: "排序必须是整数。",
        data: null,
        success: "",
      });
      return;
    }

    const label = contentBlockForm.label.trim();
    if (contentBlockForm.block_type === "portal_activity") {
      if (!label) {
        setContentBlockActionState({
          pending: false,
          error: "活动类型的时间标签不能为空，格式需为 YYYY-MM-DD。",
          data: null,
          success: "",
        });
        return;
      }
      if (!isStandardDateLabel(label)) {
        setContentBlockActionState({
          pending: false,
          error: "活动类型的时间标签格式错误，请填写 YYYY-MM-DD（例如 2026-04-06）。",
          data: null,
          success: "",
        });
        return;
      }
    }

    setContentBlockActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const payload: CreateContentBlockPayload | UpdateContentBlockPayload = {
        block_type: contentBlockForm.block_type,
        slug: contentBlockForm.slug.trim() || undefined,
        path: contentBlockForm.path.trim() || undefined,
        kicker: contentBlockForm.kicker.trim() || undefined,
        label: label || undefined,
        title,
        description: contentBlockForm.description.trim() || undefined,
        body: contentBlockForm.body.trim() || undefined,
        sort_order: sortOrder,
        active: contentBlockForm.active,
      };

      const result = editingContentBlockID
        ? await updateContentBlock(session.accessToken, editingContentBlockID, payload)
        : await createContentBlock(session.accessToken, payload as CreateContentBlockPayload);

      setContentBlockActionState({
        pending: false,
        error: "",
        data: result,
        success: editingContentBlockID ? "内容块已更新。" : "内容块已创建。",
      });
      resetContentBlockEditor();
      handleRefresh();
    } catch (error) {
      setContentBlockActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleContentBlockDelete(block: SiteContentBlock): Promise<void> {
    if (!session) {
      return;
    }

    if (typeof window !== "undefined") {
      const safeTitle = sanitizeDisplayText(block.title, "未命名内容块");
      const confirmed = window.confirm(`确定删除内容块「${safeTitle}」吗？`);
      if (!confirmed) {
        return;
      }
    }

    setContentBlockActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      await deleteContentBlock(session.accessToken, block.id);
      if (editingContentBlockID === block.id) {
        resetContentBlockEditor();
      }
      setContentBlockActionState({
        pending: false,
        error: "",
        data: null,
        success: "内容块已删除。",
      });
      handleRefresh();
    } catch (error) {
      setContentBlockActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleHomeConfigSave(config: HomeConfig): Promise<void> {
    if (!session || !canAdmin) {
      throw new Error("请先登录管理员账号后再编辑首页。");
    }

    const body = serializeHomeConfig(config);
    const description = "管理员可直接编辑首页文案与布局。";

    if (homeConfigBlock) {
      await updateContentBlock(session.accessToken, homeConfigBlock.id, {
        slug: HOME_PAGE_CONFIG_SLUG,
        title: "首页配置",
        description,
        body,
        sort_order: homeConfigBlock.sort_order,
        active: true,
      });
      handleRefresh();
      return;
    }

    await createContentBlock(session.accessToken, {
      block_type: "hero_object",
      slug: HOME_PAGE_CONFIG_SLUG,
      title: "首页配置",
      description,
      body,
      sort_order: 0,
      active: true,
    });
    handleRefresh();
  }

  function handleAnnouncementFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const target = event.target;
    const nextValue =
      "checked" in target && target.type === "checkbox" ? target.checked : target.value;

    setAnnouncementForm((current) => ({
      ...current,
      [target.name]: nextValue,
    }));
  }

  async function handleAnnouncementSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      setAnnouncementActionState({
        pending: false,
        error: "请先登录管理员账号后再发布公告。",
        data: null,
        success: "",
      });
      return;
    }

    const title = announcementForm.title.trim();
    if (!title) {
      setAnnouncementActionState({
        pending: false,
        error: "公告标题不能为空。",
        data: null,
        success: "",
      });
      return;
    }

    const sortOrder = Number.parseInt(announcementForm.sort_order.trim() || "0", 10);
    if (!Number.isFinite(sortOrder)) {
      setAnnouncementActionState({
        pending: false,
        error: "排序必须是整数。",
        data: null,
        success: "",
      });
      return;
    }

    setAnnouncementActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await createContentBlock(session.accessToken, {
        block_type: "portal_notice",
        slug: createAnnouncementSlug(title),
        title,
        kicker: announcementForm.kicker.trim() || "公告",
        label: announcementForm.published_on.trim() || createTodayDateStamp(),
        description: announcementForm.description.trim() || undefined,
        body: announcementForm.body.trim() || undefined,
        sort_order: sortOrder,
        active: announcementForm.active,
      });

      setAnnouncementActionState({
        pending: false,
        error: "",
        data: result,
        success: "公告已发布。",
      });
      setAnnouncementForm(createAnnouncementFormState());
      handleRefresh();
    } catch (error) {
      setAnnouncementActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleAdminUserModerationAction(
    userID: string,
    action: ModerateUserPayload["action"],
  ): Promise<void> {
    if (!session) {
      return;
    }

    const actionLabel: Record<ModerateUserPayload["action"], string> = {
      mute: "禁言",
      unmute: "解除禁言",
      ban: "封禁",
      unban: "解除封禁",
      demote: "降级",
    };

    setAdminUserActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await moderateAdminUser(session.accessToken, userID, { action });
      setAdminUserActionState({
        pending: false,
        error: "",
        data: result,
        success: `用户${actionLabel[action]}已提交。`,
      });
      handleRefresh();
    } catch (error) {
      setAdminUserActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleAdminVerificationReview(userID: string, action: "approved" | "rejected"): Promise<void> {
    if (!session) {
      return;
    }

    setAdminUserActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await reviewUserVerification(session.accessToken, userID, { action });
      setAdminUserActionState({
        pending: false,
        error: "",
        data: result,
        success: action === "approved" ? "审核通过已提交。" : "审核驳回已提交。",
      });
      handleRefresh();
    } catch (error) {
      setAdminUserActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleSuperAdminForumAvailabilityToggle(
    key: "forum_enabled" | "anonymous_enabled",
  ): Promise<void> {
    if (!session || !canSuperAdmin) {
      return;
    }

    const current = forumAvailabilitySettings ?? {
      forum_enabled: true,
      anonymous_enabled: true,
    };
    const payload = {
      forum_enabled: key === "forum_enabled" ? !current.forum_enabled : current.forum_enabled,
      anonymous_enabled:
        key === "anonymous_enabled" ? !current.anonymous_enabled : current.anonymous_enabled,
    };

    setForumAvailabilityActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await updateSuperAdminForumSettings(payload, session.accessToken);
      setForumAvailabilitySettings(result);
      setForumAvailabilityError("");
      setForumAvailabilityActionState({
        pending: false,
        error: "",
        data: result,
        success: "论坛开关已更新。",
      });
    } catch (error) {
      setForumAvailabilityActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  function handleRelayFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const target = event.target;
    const nextValue =
      "checked" in target && target.type === "checkbox" ? target.checked : target.value;

    setRelayForm((current) => ({
      ...current,
      [target.name]: nextValue,
    }));
  }

  function handleContestFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const target = event.target;
    const nextValue =
      "checked" in target && target.type === "checkbox" ? target.checked : target.value;

    setContestForm((current) => ({
      ...current,
      [target.name]: nextValue,
    }));
  }

  function toISODateTime(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  async function handleRelaySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      return;
    }

    setRelayActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await createRelay(session.accessToken, {
        title: relayForm.title.trim(),
        description: relayForm.description.trim() || undefined,
        rules: relayForm.rules.trim() || undefined,
        allow_unverified: relayForm.allow_unverified,
        starts_at: toISODateTime(relayForm.starts_at),
        ends_at: toISODateTime(relayForm.ends_at),
      });
      setRelayForm(createRelayFormState());
      setRelayActionState({
        pending: false,
        error: "",
        data: result,
        success: "活动已创建。",
      });
      handleRefresh();
    } catch (error) {
      setRelayActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleRelayStatusChange(relayID: string, status: string, currentStatus?: string): Promise<void> {
    if (!session) {
      return;
    }
    if (currentStatus && !canProgressActivityStatus(currentStatus, status)) {
      return;
    }

    setRelayActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await updateRelayStatus(session.accessToken, relayID, { status });
      setRelayActionState({
        pending: false,
        error: "",
        data: result,
        success: "活动状态已更新。",
      });
      handleRefresh();
    } catch (error) {
      setRelayActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleContestSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!session) {
      return;
    }

    setContestActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await createWritingContest(session.accessToken, {
        title: contestForm.title.trim(),
        description: contestForm.description.trim() || undefined,
        rules: contestForm.rules.trim() || undefined,
        allow_article_repost: contestForm.allow_article_repost,
        starts_at: toISODateTime(contestForm.starts_at),
        ends_at: toISODateTime(contestForm.ends_at),
      });
      setContestForm(createContestFormState());
      setContestActionState({
        pending: false,
        error: "",
        data: result,
        success: "征文活动已创建。",
      });
      handleRefresh();
    } catch (error) {
      setContestActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleContestStatusChange(contestID: string, status: string, currentStatus?: string): Promise<void> {
    if (!session) {
      return;
    }
    if (currentStatus && !canProgressActivityStatus(currentStatus, status)) {
      return;
    }

    setContestActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      const result = await updateWritingContestStatus(session.accessToken, contestID, { status });
      setContestActionState({
        pending: false,
        error: "",
        data: result,
        success: "征文活动状态已更新。",
      });
      handleRefresh();
    } catch (error) {
      setContestActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  async function handleWallSubmissionReview(
    submissionID: string,
    decision: "approved" | "rejected" | "changes_requested",
  ): Promise<void> {
    if (!session) {
      return;
    }

    setWallActionState({
      pending: true,
      error: "",
      data: null,
      success: "",
    });

    try {
      await reviewWallSubmission(session.accessToken, submissionID, { decision });
      setWallActionState({
        pending: false,
        error: "",
        data: null,
        success:
          decision === "approved"
            ? "投稿已通过审核。"
            : decision === "rejected"
              ? "投稿已驳回。"
              : "已要求投稿人修改后重提。",
      });
      handleRefresh();
    } catch (error) {
      setWallActionState({
        pending: false,
        error: toErrorMessage(error),
        data: null,
        success: "",
      });
    }
  }

  function renderHealthPanel(): ReactNode {
    const serviceEntries: Array<
      [string, { configured: boolean; reachable: boolean; error?: string }]
    > = health?.service_details
      ? Object.entries(health.service_details)
      : Object.entries(health?.services || {}).map(
          ([name, reachable]): [string, { configured: boolean; reachable: boolean; error?: string }] => [
            name,
            {
              configured: reachable,
              reachable,
            },
          ],
        );

    return (
      <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">服务状态</p>
            <h2>后端连通性</h2>
          </div>
          <StatusChip tone={backendReachable ? "success" : "warn"}>
            {backendReachable ? "在线" : "待确认"}
          </StatusChip>
        </div>
        {health ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {serviceEntries.map(([serviceName, detail]) => (
                <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={serviceName}>
                  <span>{serviceName}</span>
                  <StatusChip tone={detail.reachable ? "success" : detail.configured ? "warn" : "neutral"}>
                    {detail.reachable ? "reachable" : detail.configured ? "configured only" : "not configured"}
                  </StatusChip>
                  {detail.error ? <p className="text-sm text-[color:var(--text-muted)]">{detail.error}</p> : null}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {health.modules.map((moduleName) => (
                <span className="inline-flex items-center rounded-full border border-[color:var(--line-soft)] bg-white/45 px-2 py-0.5 text-xs text-[color:var(--text-muted)]" key={moduleName}>
                  {moduleName}
                </span>
              ))}
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">最近同步：{lastUpdatedLabel}</p>
          </>
        ) : (
          <p className="text-sm text-rose-500/90">{healthError || "健康检查尚未返回。"}</p>
        )}
        <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? "同步中..." : "刷新状态"}
        </button>
      </article>
    );
  }

  function renderPager(
    pager: PagerState,
    onPageChange: (page: number) => void,
    emptyText: string,
  ): ReactNode {
    const pagerButtonClassName =
      "inline-flex min-h-8 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-white/60 px-3 py-1 text-xs font-semibold text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45";

    if (pager.total <= 0) {
      return <p className="text-sm text-[color:var(--text-muted)]">{emptyText}</p>;
    }

    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-2">
        <span className="text-xs text-[color:var(--text-muted)]">
          第 {pager.page} / {Math.max(pager.totalPages, 1)} 页，共 {pager.total} 条，每页 {pager.pageSize} 条
        </span>
        <div className="flex items-center gap-2">
          <button
            className={pagerButtonClassName}
            disabled={pager.page <= 1}
            onClick={() => onPageChange(pager.page - 1)}
            type="button"
          >
            上一页
          </button>
          <button
            className={pagerButtonClassName}
            disabled={pager.totalPages === 0 || pager.page >= pager.totalPages}
            onClick={() => onPageChange(pager.page + 1)}
            type="button"
          >
            下一页
          </button>
        </div>
      </div>
    );
  }

  function renderHomePage(): ReactNode {
    return renderPortalPage();
  }

  function renderPortalPage(): ReactNode {
    return (
      <PortalPage
        activityActionState={portalActivityActionState}
        canAdmin={canAdmin}
        notices={societyNotices}
        portalPages={portalPages}
        societyActivities={societyActivities}
        onActivityCreate={handlePortalActivityCreate}
        onActivityDelete={handlePortalActivityDelete}
        onActivityUpdate={handlePortalActivityUpdate}
        onNavigate={handleNavigate}
      />
    );
  }

  function renderStoriesPage(): ReactNode {
    return (
      <StoriesPage
        activeArticle={activeArticle}
        articleActionState={articleActionState}
        articleManageActionState={articleManageActionState}
        articleEditingTargetID={articleEditingTargetID}
        articleDetailError={articleDetailError}
        articleForm={articleForm}
        articlePager={articlePager}
        articleSearchKeyword={articleSearchKeyword}
        articlesError={articlesError}
        canDeleteArticle={canAdmin}
        displayProfile={displayProfile}
        hasVerifiedSpaceAccess={hasVerifiedSpaceAccess}
        isLoadingData={isLoadingData}
        isStoriesEditorMode={isStoriesEditorMode}
        selectedArticleID={selectedArticleID}
        session={session}
        storyFeed={storyFeed}
        onArticleDelete={handleArticleDelete}
        onArticleFieldChange={handleArticleFieldChange}
        onArticlePageChange={(page) => setArticlePager((current) => ({ ...current, page }))}
        onArticleSearchKeywordChange={handleArticleSearchKeywordChange}
        onArticleSubmit={handleArticleSubmit}
        onStartArticleCreate={handleStartArticleCreate}
        onStartArticleEdit={handleStartArticleEdit}
        onNavigate={handleNavigate}
      />
    );
  }

function renderForumProgressPanel(mode: "compact" | "full" = "full"): ReactNode {
    return (
      <ForumProgressPanel
        forumLevelPercent={forumLevelPercent}
        forumProgress={forumProgress}
        forumProgressError={forumProgressError}
        forumSignInState={forumSignInState}
        hasVerifiedSpaceAccess={hasVerifiedSpaceAccess}
        mode={mode}
        session={session}
        onForumSignIn={handleForumSignIn}
      />
    );
  }

  function renderForumPage(): ReactNode {
    return (
      <ForumPage
        activeForumThread={activeForumThread}
        boardFilterOptions={boardFilterOptions}
        boardOptions={boardOptions}
        canDeleteThread={canAdmin}
        expandedReplyIDs={expandedReplyIDs}
        featuredThread={featuredThread}
        filteredThreadFeed={filteredThreadFeed}
        forumReplyTextareaRef={forumReplyTextareaRef}
        hasVerifiedSpaceAccess={hasVerifiedSpaceAccess}
        isLoadingData={isLoadingData}
        isForumEditorMode={isForumEditorMode}
        onlyShowThreadAuthor={onlyShowThreadAuthor}
        replyActionState={replyActionState}
        replyForm={replyForm}
        selectedForumBoard={selectedForumBoard}
        selectedForumThreadID={selectedForumThreadID}
        session={session}
        threadActionState={threadActionState}
        threadEngagementActionState={threadEngagementActionState}
        threadManageActionState={threadManageActionState}
        threadDetail={threadDetail}
        threadDetailError={threadDetailError}
        threadForm={threadForm}
        threadPager={threadPager}
        threadSearchKeyword={threadSearchKeyword}
        threadsError={threadsError}
        onClearReplyTarget={handleClearReplyTarget}
        onCollapseNestedReplies={handleCollapseNestedReplies}
        onExpandedReplyToggle={handleExpandedReplyToggle}
        onInsertReplySnippet={handleInsertReplySnippet}
        onNavigate={handleNavigate}
        onReplyFieldChange={handleReplyFieldChange}
        onReplySubmit={handleReplySubmit}
        onReplyToFloor={handleReplyToFloor}
        onSelectedForumBoardChange={setSelectedForumBoard}
        onShareThread={handleShareThread}
        onToggleThreadLike={() => void handleThreadEngagementToggle("liked")}
        onToggleThreadFavorite={() => void handleThreadEngagementToggle("favorited")}
        onThreadDelete={handleThreadDelete}
        onThreadFieldChange={handleThreadFieldChange}
        onThreadPageChange={(page) => setThreadPager((current) => ({ ...current, page }))}
        onThreadSearchKeywordChange={handleThreadSearchKeywordChange}
        onThreadSubmit={handleThreadSubmit}
        onToggleOnlyShowThreadAuthor={() => setOnlyShowThreadAuthor((current) => !current)}
      />
    );
  }

  function renderAnonymousPage(): ReactNode {
    return (
      <AnonymousPage
        anonymousLoadingMore={anonymousLoadingMore}
        anonymousThreadActionState={anonymousThreadActionState}
        anonymousThreadFeed={anonymousThreadFeed}
        anonymousThreadForm={anonymousThreadForm}
        anonymousThreadPager={anonymousThreadPager}
        anonymousThreadsError={anonymousThreadsError}
        hasMoreAnonymousMessages={
          anonymousThreadPager.totalPages > 0 && anonymousThreadPager.page < anonymousThreadPager.totalPages
        }
        isLoadingData={isLoadingData}
        session={session}
        onAnonymousLoadMore={handleAnonymousLoadMore}
        onAnonymousThreadFieldChange={handleAnonymousThreadFieldChange}
        onAnonymousThreadSubmit={handleAnonymousThreadSubmit}
        onAnonymousScrollDone={handleAnonymousScrollDone}
        pendingAnonymousScrollMessageID={pendingAnonymousScrollMessageID}
        onNavigate={handleNavigate}
      />
    );
  }

  function renderSpacePage(): ReactNode {
    return (
      <SpacePage
        articleActionState={articleActionState}
        articleForm={articleForm}
        authForm={authForm}
        forumProgressPanel={renderForumProgressPanel("full")}
        bangumiActionState={bangumiActionState}
        bangumiCollections={myBangumiCollections}
        bangumiCollectionsError={bangumiCollectionsError}
        bangumiForm={bangumiForm}
        bangumiJobs={myBangumiJobs}
        bangumiJobsError={bangumiJobsError}
        bangumiJobsPager={myBangumiJobsPager}
        canEditProfile={Boolean(session && !selectedPublicProfileUsername)}
        canEditShowcase={Boolean(session) && !selectedPublicProfileUsername}
        collectionTotal={collectionTotal}
        canUseBangumiImport={canUseBangumiImport}
        displayProfile={displayProfile}
        favoritedThreads={myFavoritedThreads}
        favoritedThreadsError={myFavoritedThreadsError}
        favoritedThreadsPager={myFavoritedThreadsPager}
        hasVerifiedSpaceAccess={hasVerifiedSpaceAccess}
        isAuthenticated={isAuthenticated}
        loginState={loginState}
        profileActionState={profileActionState}
        profileError={profileError}
        profileForm={profileForm}
        registerForm={registerForm}
        registerState={registerState}
        session={session}
        spaceLogEntries={spaceLogEntries}
        spaceShelfTab={spaceShelfTab}
        viewingPublicProfileUsername={selectedPublicProfileUsername}
        onAuthFieldChange={handleAuthFieldChange}
        onArticleFieldChange={handleArticleFieldChange}
        onArticleSubmit={handleArticleSubmit}
        onBangumiFieldChange={handleBangumiFieldChange}
        onBangumiImportSubmit={handleBangumiImportSubmit}
        onBangumiJobsPageChange={(page) => setMyBangumiJobsPager((current) => ({ ...current, page }))}
        onNavigate={handleNavigate}
        onFavoritedThreadsPageChange={(page) =>
          setMyFavoritedThreadsPager((current) => ({ ...current, page }))
        }
        onLogout={handleLogout}
        onLoginSubmit={handleLoginSubmit}
        onProfileFieldChange={handleProfileFieldChange}
        onProfileSubmit={handleProfileSubmit}
        onRegisterFieldChange={handleRegisterFieldChange}
        onRegisterSubmit={handleRegisterSubmit}
        onSpaceShelfTabChange={setSpaceShelfTab}
      />
    );
  }

  function renderLoginPage(): ReactNode {
    return (
      <LoginPage
        authForm={authForm}
        loginState={loginState}
        registerForm={registerForm}
        registerState={registerState}
        session={session}
        onAuthFieldChange={handleAuthFieldChange}
        onLoginSubmit={handleLoginSubmit}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onRegisterFieldChange={handleRegisterFieldChange}
        onRegisterSubmit={handleRegisterSubmit}
      />
    );
  }

  function renderGalleryPage(): ReactNode {
    return (
      <GalleryPage
        adminGalleryEntries={adminGalleryEntries}
        adminGalleryPager={adminGalleryPager}
        canManageGallery={canManageGallery}
        editingGalleryEntryID={editingGalleryEntryID}
        galleryActionState={galleryActionState}
        galleryUploadState={galleryUploadState}
        galleryAlbums={galleryAlbums}
        galleryEntriesRaw={galleryEntriesRaw}
        galleryForm={galleryForm}
        galleryPapers={galleryPapers}
        galleryPolaroids={galleryPolaroids}
        galleryTimeline={galleryTimeline}
        galleryTracks={galleryTracks}
        onGalleryBulkDelete={handleGalleryBulkDelete}
        onGalleryBulkSetActive={handleGalleryBulkSetActive}
        onGalleryAnnotate={handleGalleryAnnotate}
        onGalleryDelete={handleGalleryDelete}
        onGalleryEditStart={handleGalleryEditStart}
        onGalleryEditorReset={resetGalleryEditor}
        onGalleryFieldChange={handleGalleryFieldChange}
        onGalleryUploadFiles={handleGalleryUploadFiles}
        onGalleryPageChange={(page) => setAdminGalleryPager((current) => ({ ...current, page }))}
        onGalleryReorder={handleGalleryReorder}
        onGallerySortNudge={handleGallerySortNudge}
        onGallerySubmit={handleGallerySubmit}
      />
    );
  }

  function renderAdminPage(): ReactNode {
    if (!session) {
      return (
        <section className="admin-access-guard admin-access-guard--login rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="admin-access-guard__head mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="admin-access-guard__title-wrap">
              <p className="admin-access-guard__kicker text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">管理后台</p>
              <h2 className="admin-access-guard__title">请先登录管理账号</h2>
            </div>
            <StatusChip tone="warn">需要登录</StatusChip>
          </div>
          <p className="admin-access-guard__desc text-sm text-[color:var(--text-muted)]">后台工作台仅对管理员和超级管理员开放，登录后会自动校验角色权限。</p>
          <p className="admin-access-guard__hint">你可以先登录账号，系统会根据角色自动切换到可访问的后台页面。</p>
          <div className="admin-access-guard__actions">
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105"
              type="button"
              onClick={() => handleNavigate("/login")}
            >
              前往登录
            </button>
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80"
              type="button"
              onClick={() => handleNavigate("/")}
            >
              返回首页
            </button>
          </div>
        </section>
      );
    }

    if (!canAdmin) {
      return (
        <section className="admin-access-guard admin-access-guard--forbidden rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="admin-access-guard__head mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="admin-access-guard__title-wrap">
              <p className="admin-access-guard__kicker text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">管理后台</p>
              <h2 className="admin-access-guard__title">当前账号没有后台权限</h2>
            </div>
            <StatusChip tone="warn">权限不足</StatusChip>
          </div>
          <p className="admin-access-guard__desc text-sm text-[color:var(--text-muted)]">
            当前角色：{formatAdminRoles(profile?.roles)}。仅管理员或超级管理员可以访问后台工作台。
          </p>
          <p className="admin-access-guard__hint">如需开通权限，请联系超级管理员完成角色分配。</p>
          <div className="admin-access-guard__actions">
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80"
              type="button"
              onClick={() => handleNavigate("/space")}
            >
              返回个人空间
            </button>
          </div>
        </section>
      );
    }

    const adminActiveSection = adminSectionFromPage(adminActivePage);
    const pendingVerificationUsers = adminUsers.filter((user) => user.pending_verification_id);
    const adminSidebarSections: WorkspaceSidebarSection[] = ADMIN_SIDEBAR_SECTIONS.map((section) => ({
      id: section.id,
      kicker: section.kicker,
      title: section.title,
      items: section.children.map((child) => ({
        id: child.id,
        label: child.label,
        icon: ADMIN_PAGE_ICONS[child.id],
      })),
    }));
    const activeAdminSectionMeta =
      ADMIN_SIDEBAR_SECTIONS.find((section) => section.id === adminActiveSection) ?? ADMIN_SIDEBAR_SECTIONS[0];
    const activeAdminPageLabel =
      adminSidebarSections
        .flatMap((section) => section.items)
        .find((item) => item.id === adminActivePage)?.label ?? "核心指标速览";
    const activeAdminSectionPages = activeAdminSectionMeta.children;
    const pendingAdminTaskCount =
      Number(adminDashboard?.pending_verification_users ?? 0) + Number(wallSubmissionsPager.total ?? 0);
    const announcementBlocks = adminContentBlocks
      .filter((block) => block.block_type === "portal_notice")
      .sort((left, right) => right.sort_order - left.sort_order);
    const forumEnabled = forumAvailabilitySettings?.forum_enabled ?? true;
    const anonymousEnabled = forumAvailabilitySettings?.anonymous_enabled ?? true;
    const dashboardMetricDefinitions: Array<{ key: AdminDashboardTrendKey; label: string }> = [
      { key: "total_users", label: "注册总数" },
      { key: "verified_users", label: "已认证成员" },
      { key: "admin_users", label: "管理员" },
      { key: "super_admin_users", label: "超级管理员" },
    ];
    const dashboardMetricCards = dashboardMetricDefinitions.map((metric) => {
      const currentValue = Number(adminDashboard?.[metric.key] ?? 0);
      const baselineValue =
        adminDashboardTrendBase && Number.isFinite(adminDashboardTrendBase[metric.key])
          ? Number(adminDashboardTrendBase[metric.key])
          : null;
      const delta = baselineValue === null ? null : currentValue - baselineValue;
      const trendIcon = delta === null ? "•" : delta > 0 ? "▲" : delta < 0 ? "▼" : "■";
      const trendClassName =
        delta === null
          ? "text-[color:var(--text-faint)]"
          : delta > 0
            ? "text-emerald-600/90"
            : delta < 0
              ? "text-rose-500/90"
              : "text-[color:var(--text-muted)]";
      const trendText =
        delta === null
          ? "暂无对比基线"
          : delta > 0
            ? `较上次 +${delta}`
            : delta < 0
              ? `较上次 ${delta}`
              : "较上次持平";

      return {
        ...metric,
        currentLabel: currentValue.toLocaleString("zh-CN"),
        trendClassName,
        trendIcon,
        trendText,
      };
    });
    const dashboardTrendTimestamp = adminDashboardTrendBase?.captured_at
      ? formatDateTime(adminDashboardTrendBase.captured_at)
      : "";

    return (
      <>
        <section className="admin-dashboard-layout">
          <WorkspaceSidebar
            activeItemId={adminActivePage}
            footerAvatarLabel={profile?.nickname || profile?.username || "后台成员"}
            footerAvatarRole={resolveUserRoleRing(profile?.roles)}
            footerAvatarUrl={profile?.avatar_url || undefined}
            footerBadge={pendingVerificationUsers.length ? `${pendingVerificationUsers.length} 待审` : "就绪"}
            footerSubtitle={`角色：${formatAdminRoles(profile?.roles)}`}
            footerTitle={profile?.nickname || profile?.username || "后台成员"}
            headerAvatarLabel="Rubedo"
            headerAvatarRole="super_admin"
            headerKicker="Rubedo Control"
            headerSubtitle={`${activeAdminSectionMeta.title} · ${activeAdminPageLabel}`}
            headerTitle="后台工作台"
            onItemSelect={(itemId) => setAdminActivePage(itemId as AdminPageKey)}
            sections={adminSidebarSections}
            showHeader
            tone="space"
          />

          <div className="admin-main admin-dashboard-main grid gap-4">
            <header className="admin-dashboard-topbar">
              <div className="admin-dashboard-topbar__copy">
                <p className="admin-dashboard-topbar__eyebrow">{activeAdminSectionMeta.kicker}</p>
                <h1>{activeAdminSectionMeta.title}</h1>
                <p>{activeAdminSectionMeta.description}</p>
              </div>
              <div className="admin-dashboard-topbar__meta">
                <StatusChip tone={pendingAdminTaskCount > 0 ? "warn" : "success"}>
                  {pendingAdminTaskCount > 0 ? `${pendingAdminTaskCount} 项待处理` : "无待办"}
                </StatusChip>
                <button
                  className="admin-dashboard-topbar__action"
                  type="button"
                  onClick={() => setAdminActivePage("dashboard-actions")}
                >
                  快捷入口
                </button>
              </div>
            </header>

            <nav className="admin-dashboard-tabs" aria-label="后台当前分组页面">
              {activeAdminSectionPages.map((page) => (
                <button
                  aria-current={adminActivePage === page.id ? "page" : undefined}
                  className="admin-dashboard-tabs__item"
                  key={page.id}
                  type="button"
                  onClick={() => setAdminActivePage(page.id)}
                >
                  {page.label}
                </button>
              ))}
            </nav>

        <section className="grid gap-4" style={{ display: adminActivePage === "dashboard-overview" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">数据看板</p>
                <h2>核心指标速览</h2>
                <p className="text-sm text-[color:var(--text-muted)]">用于快速判断社区规模与管理负载。</p>
                <p className="text-xs text-[color:var(--text-faint)]">
                  对比基线：{dashboardTrendTimestamp || "首次访问后自动建立"}
                </p>
              </div>
              <StatusChip tone="accent">管理员</StatusChip>
            </div>
            {adminDashboardError ? <p className="text-sm text-rose-500/90">{adminDashboardError}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dashboardMetricCards.map((metric) => (
                <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3.5 py-3" key={metric.label}>
                  <span className="block text-[0.74rem] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">{metric.label}</span>
                  <strong className="mt-1.5 block text-[clamp(1.8rem,3.8vw,2.6rem)] font-bold leading-none text-[color:var(--color-primary)]">
                    {metric.currentLabel}
                  </strong>
                  <p className={`mt-1 text-[0.76rem] font-medium ${metric.trendClassName}`}>
                    <span className="mr-1">{metric.trendIcon}</span>
                    {metric.trendText}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" style={{ display: adminActivePage === "dashboard-todos" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">待办提醒</p>
              </div>
              <StatusChip tone={(adminDashboard?.pending_verification_users ?? 0) > 0 ? "warn" : "success"}>
                {adminDashboard?.pending_verification_users ?? 0} 条
              </StatusChip>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h3>成员认证</h3>
                  <StatusChip tone={(adminDashboard?.pending_verification_users ?? 0) > 0 ? "warn" : "success"}>
                    {adminDashboard?.pending_verification_users ?? 0} 条
                  </StatusChip>
                </div>
                <p>审核通过后，论坛与空间的完整功能才会开放给成员。</p>
              </div>
              <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h3>展示墙投稿</h3>
                  <StatusChip tone="accent">{wallSubmissionsPager.total} 条</StatusChip>
                </div>
                <p>可切到“展示墙投稿审核”分页处理通过、驳回或要求修改。</p>
              </div>
              {canSuperAdmin && superAdminDashboard ? (
                <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h3>超级管理员扩展</h3>
                    <StatusChip tone="accent">超级管理员</StatusChip>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                    <span>内容配置项 {superAdminDashboard.site_content_blocks}</span>
                    <span>展示条目 {superAdminDashboard.gallery_entries}</span>
                    <span>活动 {superAdminDashboard.relay_events + superAdminDashboard.writing_contests}</span>
                    <span>待处理举报 {superAdminDashboard.content_reports_open}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" style={{ display: adminActivePage === "dashboard-actions" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">快捷操作</p>
              </div>
              <StatusChip tone="neutral">快捷入口</StatusChip>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "发布新接龙", body: "创建活动并设置时间、规则与参与范围。", next: "site-relays" as const },
                { title: "发布新征文", body: "发布征文主题并维护投稿开放状态。", next: "site-contests" as const },
                { title: "维护首页内容", body: "统一维护首页卡片、公告和加入流程文案。", next: "site-blocks" as const },
                { title: "处理认证申请", body: "进入认证审批页，集中处理待审成员。", next: "members-verifications" as const },
              ].map((item) => (
                <button
                  className="grid gap-1 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[color:var(--line-strong)]"
                  key={item.title}
                  type="button"
                  onClick={() => setAdminActivePage(item.next)}
                >
                  <span className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">入口</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          id="admin-users"
          style={{ display: adminActivePage === "members-users" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">成员管理</p>
              </div>
              <StatusChip tone="accent">{adminUsersPager.total} 人</StatusChip>
            </div>
            {adminUsersError ? <p className="text-sm text-rose-500/90">{adminUsersError}</p> : null}
            {adminUserActionState.error ? <p className="text-sm text-rose-500/90">{adminUserActionState.error}</p> : null}
            {adminUserActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{adminUserActionState.success}</p> : null}
            <div className="grid gap-3">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>成员</TableHeader>
                    <TableHeader>角色</TableHeader>
                    <TableHeader>状态</TableHeader>
                    <TableHeader>认证</TableHeader>
                    <TableHeader>待审请求</TableHeader>
                    <TableHeader>操作</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{user.nickname || user.username}</span>
                          <span className="text-xs text-zinc-500">@{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-500">{formatAdminRoles(user.roles)}</TableCell>
                      <TableCell>
                        <StatusChip tone={user.verified ? "success" : user.status === "pending_verification" ? "warn" : "neutral"}>
                          {adminUserStatusLabel(user.status)}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-zinc-500">{user.verified ? "已认证" : "未认证"}</TableCell>
                      <TableCell className="text-zinc-500">{user.pending_verification_id ? user.pending_verification_id : "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.pending_verification_id ? (
                            <>
                              <button
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                                type="button"
                                disabled={adminUserActionState.pending}
                                onClick={() => void handleAdminVerificationReview(user.user_id, "approved")}
                              >
                                通过审核
                              </button>
                              <button
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30"
                                type="button"
                                disabled={adminUserActionState.pending}
                                onClick={() => void handleAdminVerificationReview(user.user_id, "rejected")}
                              >
                                驳回申请
                              </button>
                            </>
                          ) : null}
                          {user.status === "suspended" ? (
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                              disabled={adminUserActionState.pending}
                              onClick={() => void handleAdminUserModerationAction(user.user_id, "unmute")}
                            >
                              解除禁言
                            </button>
                          ) : (
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                              disabled={adminUserActionState.pending}
                              onClick={() => void handleAdminUserModerationAction(user.user_id, "mute")}
                            >
                              禁言
                            </button>
                          )}
                          {user.status === "banned" ? (
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                              disabled={adminUserActionState.pending}
                              onClick={() => void handleAdminUserModerationAction(user.user_id, "unban")}
                            >
                              解除封禁
                            </button>
                          ) : (
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30"
                              type="button"
                              disabled={adminUserActionState.pending}
                              onClick={() => void handleAdminUserModerationAction(user.user_id, "ban")}
                            >
                              封禁
                            </button>
                          )}
                          {user.roles.some((role) => role === "moderator" || role === "admin" || role === "super_admin") ? (
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30"
                              type="button"
                              disabled={adminUserActionState.pending}
                              onClick={() => void handleAdminUserModerationAction(user.user_id, "demote")}
                            >
                              降级
                            </button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!adminUsers.length ? (
                    <TableRow>
                      <TableCell className="text-zinc-500" colSpan={6}>
                        当前没有可管理的成员数据。
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            {renderPager(adminUsersPager, (page) => setAdminUsersPager((current) => ({ ...current, page })), "暂无成员。")}
          </article>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          style={{ display: adminActivePage === "members-verifications" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">审核队列</p>
              </div>
              <StatusChip tone="warn">{pendingVerificationUsers.length} 条</StatusChip>
            </div>
            {adminUsersError ? <p className="text-sm text-rose-500/90">{adminUsersError}</p> : null}
            {adminUserActionState.error ? <p className="text-sm text-rose-500/90">{adminUserActionState.error}</p> : null}
            {adminUserActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{adminUserActionState.success}</p> : null}
            <div className="grid gap-3">
              {pendingVerificationUsers.map((user) => (
                <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 grid gap-2" key={user.user_id}>
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3>{user.nickname || user.username}</h3>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        <span>@{user.username}</span>
                        <span>{formatAdminRoles(user.roles)}</span>
                      </p>
                    </div>
                    <StatusChip tone="warn">{adminUserStatusLabel(user.status)}</StatusChip>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                    <span>待审请求 {user.pending_verification_id}</span>
                    <span>{user.verified ? "已认证" : "未认证"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void handleAdminVerificationReview(user.user_id, "approved")}>
                      通过审核
                    </button>
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30" type="button" onClick={() => void handleAdminVerificationReview(user.user_id, "rejected")}>
                      驳回申请
                    </button>
                  </div>
                </div>
              ))}
              {!pendingVerificationUsers.length ? <p className="text-sm text-[color:var(--text-muted)]">当前没有待处理的认证申请。</p> : null}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" style={{ display: adminActivePage === "members-permissions" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">权限说明</p>
              </div>
            </div>
            <div className="grid gap-3">
              {canSuperAdmin ? (
                <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h3>论坛入口开关</h3>
                    <StatusChip tone="accent">超级管理员</StatusChip>
                  </div>
                  {forumAvailabilityError ? <p className="text-sm text-rose-500/90">{forumAvailabilityError}</p> : null}
                  {forumAvailabilityActionState.error ? (
                    <p className="text-sm text-rose-500/90">{forumAvailabilityActionState.error}</p>
                  ) : null}
                  {forumAvailabilityActionState.success ? (
                    <p className="text-sm text-[color:var(--text-muted)]">{forumAvailabilityActionState.success}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                    <span>论坛：{forumEnabled ? "开启" : "关闭"}</span>
                    <span>匿名板：{anonymousEnabled ? "开启" : "关闭"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 ${forumEnabled ? "border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30" : ""}`}
                      type="button"
                      disabled={forumAvailabilityActionState.pending}
                      onClick={() => void handleSuperAdminForumAvailabilityToggle("forum_enabled")}
                    >
                      {forumAvailabilityActionState.pending
                        ? "更新中..."
                        : forumEnabled
                          ? "暂停论坛"
                          : "恢复论坛"}
                    </button>
                    <button
                      className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 ${anonymousEnabled ? "border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30" : ""}`}
                      type="button"
                      disabled={forumAvailabilityActionState.pending}
                      onClick={() => void handleSuperAdminForumAvailabilityToggle("anonymous_enabled")}
                    >
                      {forumAvailabilityActionState.pending
                        ? "更新中..."
                        : anonymousEnabled
                          ? "暂停匿名板"
                          : "恢复匿名板"}
                    </button>
                  </div>
                  <p className="text-sm text-[color:var(--text-muted)]">暂停后会拦截对应板块的列表、详情、发帖和回复请求。</p>
                </div>
              ) : null}
              <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h3>超级管理员</h3>
                  <StatusChip tone="accent">全站权限</StatusChip>
                </div>
                <p>负责系统级配置、风险处置和跨模块最终决策。</p>
              </div>
              <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h3>内容编辑</h3>
                  <StatusChip tone="neutral">内容管理</StatusChip>
                </div>
                <p>负责首页内容块、公告文案、展示资源与活动描述维护。</p>
              </div>
              <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <h3>招新审核</h3>
                  <StatusChip tone="warn">审核流程</StatusChip>
                </div>
                <p>重点处理待认证成员、状态流转与审批结论留痕。</p>
              </div>
            </div>
          </article>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          id="admin-cms"
          style={{ display: adminActivePage === "site-blocks" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">内容管理</p>
              </div>
              <StatusChip tone="accent">内容块</StatusChip>
            </div>
            {contentBlockActionState.error ? <p className="text-sm text-rose-500/90">{contentBlockActionState.error}</p> : null}
            {contentBlockActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{contentBlockActionState.success}</p> : null}
            <form className="form-layout admin-cms-form" onSubmit={(event) => void handleContentBlockSubmit(event)}>
              <label className="form-field">
                <span>内容块类型</span>
                <select className="form-control" name="block_type" value={contentBlockForm.block_type} onChange={handleContentBlockFieldChange}>
                  <option value="portal_page">首页页面</option>
                  <option value="portal_highlight">首页亮点</option>
                  <option value="portal_pillar">栏目支柱</option>
                  <option value="portal_notice">公告</option>
                  <option value="portal_activity">活动</option>
                  <option value="portal_join_step">加入步骤</option>
                  <option value="hero_object">主视觉对象</option>
                </select>
              </label>
              <label className="form-field">
                <span>标题</span>
                <input className="form-control" name="title" value={contentBlockForm.title} onChange={handleContentBlockFieldChange} required />
              </label>
              <label className="form-field">
                <span>别名（slug）</span>
                <input className="form-control" name="slug" value={contentBlockForm.slug} onChange={handleContentBlockFieldChange} />
              </label>
              <label className="form-field">
                <span>路由路径</span>
                <input className="form-control" name="path" value={contentBlockForm.path} onChange={handleContentBlockFieldChange} placeholder="/forum" />
              </label>
              <label className="form-field">
                <span>角标 / 小标题</span>
                <input className="form-control" name="kicker" value={contentBlockForm.kicker} onChange={handleContentBlockFieldChange} />
              </label>
              <label className="form-field">
                <span>标签</span>
                <input
                  className="form-control"
                  name="label"
                  value={contentBlockForm.label}
                  onChange={handleContentBlockFieldChange}
                  placeholder={contentBlockForm.block_type === "portal_activity" ? "活动建议使用日期，如 2026-04-06" : "用于前台识别，如 公告 / 置顶 / 报名中"}
                />
              </label>
              <label className="form-field">
                <span>摘要</span>
                <textarea className="form-control" name="description" rows={3} value={contentBlockForm.description} onChange={handleContentBlockFieldChange} />
              </label>
              <label className="form-field">
                <span>正文</span>
                <textarea className="form-control" name="body" rows={4} value={contentBlockForm.body} onChange={handleContentBlockFieldChange} />
              </label>
              <label className="form-field">
                <span>排序权重</span>
                <input className="form-control" name="sort_order" value={contentBlockForm.sort_order} onChange={handleContentBlockFieldChange} />
              </label>
              <label className="form-check admin-cms-form__check">
                <input name="active" checked={contentBlockForm.active} onChange={handleContentBlockFieldChange} type="checkbox" />
                <span>保存后立即在前台生效</span>
              </label>
              <div className="form-actions admin-cms-form__actions">
                <button className="admin-cms-form__submit inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={contentBlockActionState.pending}>
                  {contentBlockActionState.pending ? "保存中..." : editingContentBlockID ? "更新内容块" : "创建内容块"}
                </button>
                <button className="admin-cms-form__reset inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={resetContentBlockEditor}>
                  清空表单
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">当前内容块</p>
                <h2>已配置内容块</h2>
              </div>
              <StatusChip tone="neutral">{adminContentBlocksPager.total} 条</StatusChip>
            </div>
            {adminContentBlocksError ? <p className="text-sm text-rose-500/90">{adminContentBlocksError}</p> : null}
            <div className="grid gap-3">
              {adminContentBlocks.map((block) => {
                const safeTitle = sanitizeDisplayText(block.title, "未命名内容块");
                const safeDescription = sanitizeDisplayText(block.description || block.body, "暂无说明。");
                const safeSlug = sanitizeDisplayText(block.slug, "--");

                return (
                  <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={block.id}>
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <h3>{safeTitle}</h3>
                      <StatusChip tone={block.active ? "success" : "neutral"}>
                        {contentBlockTypeLabel(block.block_type)}
                      </StatusChip>
                    </div>
                    <p>{safeDescription}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                      <span>slug: {safeSlug}</span>
                      <span>排序: {block.sort_order}</span>
                      {block.path ? <span>路径: {block.path}</span> : null}
                    </div>
                    <div className="admin-cms-item__actions flex flex-wrap items-center gap-1.5">
                      <button className="admin-cms-item__action" type="button" onClick={() => handleContentBlockEditStart(block)}>
                        编辑
                      </button>
                      <button className="admin-cms-item__action admin-cms-item__action--danger" type="button" onClick={() => void handleContentBlockDelete(block)}>
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {!adminContentBlocks.length ? <p className="text-sm text-[color:var(--text-muted)]">当前没有内容块，请先在左侧创建。</p> : null}
            </div>
            {renderPager(adminContentBlocksPager, (page) => setAdminContentBlocksPager((current) => ({ ...current, page })), "暂无内容块。")}
          </article>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          id="admin-gallery"
          style={{ display: adminActivePage === "gallery-editor" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">展示资源</p>
              </div>
              <StatusChip tone="accent">{editingGalleryEntryID ? "编辑模式" : "创建模式"}</StatusChip>
            </div>
            {galleryActionState.error ? <p className="text-sm text-rose-500/90">{galleryActionState.error}</p> : null}
            {galleryActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{galleryActionState.success}</p> : null}
            <form className="form-layout admin-cms-form admin-gallery-form" onSubmit={(event) => void handleGallerySubmit(event)}>
              <label className="form-field">
                <span>条目类型</span>
                <select
                  className="form-control"
                  disabled={Boolean(editingGalleryEntryID)}
                  name="entry_type"
                  onChange={handleGalleryFieldChange}
                  value={galleryForm.entry_type}
                >
                  <option value="album">相册</option>
                  <option value="polaroid">拍立得</option>
                  <option value="paper">旧纸</option>
                  <option value="timeline">时间轴</option>
                  <option value="track">留声机</option>
                </select>
              </label>
              <label className="form-field">
                <span>标题</span>
                <input className="form-control" name="title" onChange={handleGalleryFieldChange} value={galleryForm.title} required />
              </label>
              <div className="form-grid-2 admin-gallery-form__grid">
                <label className="form-field">
                  <span>别名（slug）</span>
                  <input className="form-control" name="slug" onChange={handleGalleryFieldChange} value={galleryForm.slug} />
                </label>
                <label className="form-field">
                  <span>副标题</span>
                  <input className="form-control" name="subtitle" onChange={handleGalleryFieldChange} value={galleryForm.subtitle} />
                </label>
              </div>
              <label className="form-field">
                <span>正文 / 描述</span>
                <textarea className="form-control" name="body" onChange={handleGalleryFieldChange} rows={5} value={galleryForm.body} />
              </label>
              <div className="form-grid-2 admin-gallery-form__grid">
                <label className="form-field">
                  <span>额外文本</span>
                  <input className="form-control" name="extra_text" onChange={handleGalleryFieldChange} value={galleryForm.extra_text} />
                </label>
                <label className="form-field">
                  <span>排序权重</span>
                  <input className="form-control" name="sort_order" onChange={handleGalleryFieldChange} value={galleryForm.sort_order} />
                </label>
              </div>
              <label className="form-check admin-gallery-form__check">
                <input checked={galleryForm.active} name="active" onChange={handleGalleryFieldChange} type="checkbox" />
                <span>设为公开展示</span>
              </label>
              <div className="form-actions admin-gallery-form__actions">
                <button className="admin-gallery-form__submit inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={galleryActionState.pending} type="submit">
                  {galleryActionState.pending ? "保存中..." : editingGalleryEntryID ? "更新展示条目" : "创建展示条目"}
                </button>
                <button className="admin-cms-form__reset inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60" onClick={resetGalleryEditor} type="button">
                  清空表单
                </button>
              </div>
            </form>
          </article>

        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          style={{ display: adminActivePage === "gallery-list" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">当前展示资源</p>
              </div>
              <StatusChip tone="neutral">{adminGalleryPager.total} 条</StatusChip>
            </div>
            <div className="grid gap-3">
              {adminGalleryEntries.map((entry) => {
                const safeTitle = sanitizeDisplayText(entry.title, "未命名条目");
                const safeBody = sanitizeDisplayText(entry.body, "暂无描述。");
                const safeSlug = sanitizeDisplayText(entry.slug, "--");

                return (
                  <div className="admin-gallery-list-item rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={entry.id}>
                    <div className="admin-gallery-list-item__head">
                      <h3>{safeTitle}</h3>
                      <StatusChip
                        className={entry.active ? "admin-status-chip admin-status-chip--active" : "admin-status-chip admin-status-chip--inactive"}
                        tone={entry.active ? "success" : "neutral"}
                      >
                        {entry.active ? "已启用" : "已隐藏"}
                      </StatusChip>
                    </div>
                    <p>{safeBody}</p>
                    <div className="admin-gallery-list-item__meta">
                      <div className="admin-gallery-list-item__meta-copy text-xs text-[color:var(--text-muted)]">
                        <span>{galleryEntryTypeLabel(entry.entry_type)}</span>
                        <span>slug: {safeSlug}</span>
                      </div>
                      <div className="admin-gallery-list-item__actions">
                        <button className="admin-gallery-list-item__action" onClick={() => handleGalleryEditStart(entry)} type="button">
                          编辑
                        </button>
                        <span aria-hidden="true" className="admin-gallery-list-item__divider">|</span>
                        <button className="admin-gallery-list-item__action admin-gallery-list-item__action--danger" onClick={() => void handleGalleryDelete(entry)} type="button">
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!adminGalleryEntries.length ? <p className="text-sm text-[color:var(--text-muted)]">当前还没有可管理的展示条目。</p> : null}
            </div>
            {renderPager(adminGalleryPager, (page) => setAdminGalleryPager((current) => ({ ...current, page })), "暂无可管理条目。")}
          </article>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          id="admin-relays"
          style={{ display: adminActivePage === "site-relays" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">活动管理</p>
              </div>
              <StatusChip tone="accent">接龙</StatusChip>
            </div>
            {adminActivityError ? <p className="text-sm text-rose-500/90">{adminActivityError}</p> : null}
            {relayActionState.error ? <p className="text-sm text-rose-500/90">{relayActionState.error}</p> : null}
            {relayActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{relayActionState.success}</p> : null}
            <form className="form-layout admin-cms-form" onSubmit={(event) => void handleRelaySubmit(event)}>
              <h3>发布新接龙活动</h3>
              <label className="form-field">
                <span>标题</span>
                <input className="form-control" name="title" value={relayForm.title} onChange={handleRelayFieldChange} required />
              </label>
              <label className="form-field">
                <span>描述</span>
                <textarea className="form-control" name="description" rows={3} value={relayForm.description} onChange={handleRelayFieldChange} />
              </label>
              <label className="form-field">
                <span>规则</span>
                <textarea className="form-control" name="rules" rows={3} value={relayForm.rules} onChange={handleRelayFieldChange} />
              </label>
              <div className="form-grid-2">
                <label className="form-field">
                  <span>开始时间</span>
                  <input className="form-control" name="starts_at" type="datetime-local" value={relayForm.starts_at} onChange={handleRelayFieldChange} />
                </label>
                <label className="form-field">
                  <span>结束时间</span>
                  <input className="form-control" name="ends_at" type="datetime-local" value={relayForm.ends_at} onChange={handleRelayFieldChange} />
                </label>
              </div>
              <label className="form-check admin-cms-form__check">
                <input name="allow_unverified" type="checkbox" checked={relayForm.allow_unverified} onChange={handleRelayFieldChange} />
                <span>允许未认证用户参与</span>
              </label>
              <div className="form-actions admin-cms-form__actions">
                <button className="admin-cms-form__submit inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={relayActionState.pending}>
                  {relayActionState.pending ? "创建中..." : "创建接龙活动"}
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">状态流转</p>
                <h2>接龙活动列表</h2>
              </div>
              <StatusChip tone="accent">{relayPager.total} 场</StatusChip>
            </div>
            <div className="grid gap-3">
              {relays.map((relay) => (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--line-soft)] bg-white/35 px-3 py-2" key={relay.id}>
                  <div>
                    <strong>{relay.title}</strong>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                      <span>{activityStatusLabel(relay.status)}</span>
                      <span>{relay.entry_count} 条参与</span>
                    </p>
                  </div>
                  <div className="admin-activity-status__actions">
                    {FLOW_ACTIVITY_STATUSES.map((status) => (
                      <button
                        aria-pressed={relay.status === status}
                        className={`admin-activity-status__button ${
                          relay.status === status
                            ? `admin-activity-status__button--active admin-activity-status__button--${status}`
                            : ""
                        }`}
                        disabled={relayActionState.pending || !canProgressActivityStatus(relay.status, status)}
                        key={status}
                        type="button"
                        onClick={() => void handleRelayStatusChange(relay.id, status, relay.status)}
                      >
                        {activityStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!relays.length ? <p className="text-sm text-[color:var(--text-muted)]">当前没有接龙活动，可在左侧直接创建。</p> : null}
            </div>
            {renderPager(relayPager, (page) => setRelayPager((current) => ({ ...current, page })), "暂无活动。")}
          </article>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          id="admin-contests"
          style={{ display: adminActivePage === "site-contests" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">活动管理</p>
              </div>
              <StatusChip tone="accent">征文</StatusChip>
            </div>
            {adminActivityError ? <p className="text-sm text-rose-500/90">{adminActivityError}</p> : null}
            {contestActionState.error ? <p className="text-sm text-rose-500/90">{contestActionState.error}</p> : null}
            {contestActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{contestActionState.success}</p> : null}
            <form className="form-layout admin-cms-form" onSubmit={(event) => void handleContestSubmit(event)}>
              <h3>发布新征文活动</h3>
              <label className="form-field">
                <span>标题</span>
                <input className="form-control" name="title" value={contestForm.title} onChange={handleContestFieldChange} required />
              </label>
              <label className="form-field">
                <span>描述</span>
                <textarea className="form-control" name="description" rows={3} value={contestForm.description} onChange={handleContestFieldChange} />
              </label>
              <label className="form-field">
                <span>规则</span>
                <textarea className="form-control" name="rules" rows={3} value={contestForm.rules} onChange={handleContestFieldChange} />
              </label>
              <label className="form-field">
                <span>开始时间</span>
                <input className="form-control" name="starts_at" type="datetime-local" value={contestForm.starts_at} onChange={handleContestFieldChange} />
              </label>
              <label className="form-field">
                <span>结束时间</span>
                <input className="form-control" name="ends_at" type="datetime-local" value={contestForm.ends_at} onChange={handleContestFieldChange} />
              </label>
              <label className="form-check admin-cms-form__check">
                <input name="allow_article_repost" type="checkbox" checked={contestForm.allow_article_repost} onChange={handleContestFieldChange} />
                <span>允许文章转载投稿</span>
              </label>
              <div className="form-actions admin-cms-form__actions">
                <button className="admin-cms-form__submit inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={contestActionState.pending}>
                  {contestActionState.pending ? "创建中..." : "创建征文活动"}
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">状态流转</p>
                <h2>征文活动列表</h2>
              </div>
              <StatusChip tone="accent">{contestPager.total} 场</StatusChip>
            </div>
            <div className="grid gap-3">
              {contests.map((contest) => (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--line-soft)] bg-white/35 px-3 py-2" key={contest.id}>
                  <div>
                    <strong>{contest.title}</strong>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                      <span>{activityStatusLabel(contest.status)}</span>
                      <span>{contest.submission_count} 篇投稿</span>
                    </p>
                  </div>
                  <div className="admin-activity-status__actions">
                    {FLOW_ACTIVITY_STATUSES.map((status) => (
                      <button
                        aria-pressed={contest.status === status}
                        className={`admin-activity-status__button ${
                          contest.status === status
                            ? `admin-activity-status__button--active admin-activity-status__button--${status}`
                            : ""
                        }`}
                        disabled={contestActionState.pending || !canProgressActivityStatus(contest.status, status)}
                        key={status}
                        type="button"
                        onClick={() => void handleContestStatusChange(contest.id, status, contest.status)}
                      >
                        {activityStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!contests.length ? <p className="text-sm text-[color:var(--text-muted)]">当前没有征文活动，可先发布本期主题。</p> : null}
            </div>
            {renderPager(contestPager, (page) => setContestPager((current) => ({ ...current, page })), "暂无征文活动。")}
          </article>
        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          id="admin-moderation"
          style={{ display: adminActivePage === "moderation-wall" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">互动管理</p>
                <h2>展示墙投稿审核</h2>
                <p className="text-sm text-[color:var(--text-muted)]">逐条审核投稿质量，决定发布、退回修改或驳回。</p>
              </div>
              <StatusChip tone="accent">{wallSubmissionsPager.total} 条</StatusChip>
            </div>
            {wallModerationError ? <p className="text-sm text-rose-500/90">{wallModerationError}</p> : null}
            {wallActionState.error ? <p className="text-sm text-rose-500/90">{wallActionState.error}</p> : null}
            {wallActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{wallActionState.success}</p> : null}
            <div className="grid gap-3">
              {wallSubmissions.map((entry) => (
                <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={entry.id}>
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h3>{entry.title}</h3>
                    <StatusChip tone={entry.status === "approved" ? "success" : entry.status === "pending_review" ? "warn" : "neutral"}>
                      {wallSubmissionStatusLabel(entry.status || "")}
                    </StatusChip>
                  </div>
                  <p>{excerpt(entry.content, 180)}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                    <span>{entry.contributor}</span>
                    <span>{entry.images.length} 张图片</span>
                    {entry.created_at ? <span>{formatDateTime(entry.created_at)}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void handleWallSubmissionReview(entry.id, "approved")}>
                      通过发布
                    </button>
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void handleWallSubmissionReview(entry.id, "changes_requested")}>
                      退回修改
                    </button>
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30" type="button" onClick={() => void handleWallSubmissionReview(entry.id, "rejected")}>
                      驳回
                    </button>
                  </div>
                </div>
              ))}
              {!wallSubmissions.length ? <p className="text-sm text-[color:var(--text-muted)]">当前没有待管理的展示墙投稿。</p> : null}
            </div>
            {renderPager(wallSubmissionsPager, (page) => setWallSubmissionsPager((current) => ({ ...current, page })), "暂无投稿。")}
          </article>

        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          id="admin-bangumi"
          style={{ display: adminActivePage === "moderation-bangumi" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Bangumi 同步任务</p>
                <h2>导入任务列表</h2>
                <p className="text-sm text-[color:var(--text-muted)]">用于追踪任务执行情况和失败原因，无需手工审批。</p>
              </div>
              <StatusChip tone="accent">{adminBangumiJobsPager.total} 条</StatusChip>
            </div>
            {adminBangumiJobsError ? <p className="text-sm text-rose-500/90">{adminBangumiJobsError}</p> : null}
            <p className="text-sm text-[color:var(--text-muted)]">任务执行失败时可在卡片内查看错误信息并定位请求参数。</p>
            <div className="grid gap-3">
              {adminBangumiJobs.map((job) => (
                <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={job.job_id}>
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3>任务 #{job.job_id}</h3>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        <span>{job.username || "未知用户"}</span>
                        <span>{bangumiJobTypeLabel(job.job_type || "collection_sync")}</span>
                        {job.created_at ? <span>{formatDateTime(job.created_at)}</span> : null}
                      </p>
                    </div>
                    <StatusChip
                      tone={
                        job.status === "succeeded"
                          ? "success"
                          : job.status === "failed" || job.status === "cancelled"
                            ? "warn"
                            : "accent"
                      }
                    >
                      {bangumiJobStatusLabel(job.status)}
                    </StatusChip>
                  </div>
                  {job.request_payload ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                      {"sync_mode" in job.request_payload ? (
                        <span>模式: {String(job.request_payload.sync_mode || "subject_ids")}</span>
                      ) : null}
                      {"bangumi_username" in job.request_payload ? (
                        <span>账号: {String(job.request_payload.bangumi_username || "")}</span>
                      ) : null}
                      {"max_items" in job.request_payload ? (
                        <span>上限: {String(job.request_payload.max_items || "")}</span>
                      ) : null}
                      {"subject_ids" in job.request_payload ? (
                        <span>subject_ids: {JSON.stringify(job.request_payload.subject_ids || [])}</span>
                      ) : null}
                      {"status" in (job.request_payload || {}) ? (
                        <span>目标状态: {bangumiCollectionStatusLabel(String(job.request_payload.status || ""))}</span>
                      ) : null}
                      {"visibility" in (job.request_payload || {}) ? (
                        <span>可见范围: {String(job.request_payload.visibility || "")}</span>
                      ) : null}
                    </div>
                  ) : null}
                  {job.error_message ? <p className="text-sm text-rose-500/90">{job.error_message}</p> : null}
                </div>
              ))}
              {!adminBangumiJobs.length ? <p className="text-sm text-[color:var(--text-muted)]">当前没有 Bangumi 同步任务。</p> : null}
            </div>
            {renderPager(
              adminBangumiJobsPager,
              (page) => setAdminBangumiJobsPager((current) => ({ ...current, page })),
              "暂无 Bangumi 同步任务。",
            )}
          </article>

        </section>

        <section
          className="grid gap-4 lg:grid-cols-2"
          style={{ display: adminActivePage === "site-notes" ? undefined : "none" }}
        >
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">公告中心</p>
              </div>
              <StatusChip tone="accent">公告块</StatusChip>
            </div>
            {announcementActionState.error ? <p className="text-sm text-rose-500/90">{announcementActionState.error}</p> : null}
            {announcementActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{announcementActionState.success}</p> : null}
            <form className="form-layout admin-cms-form" onSubmit={(event) => void handleAnnouncementSubmit(event)}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="form-field">
                  <span>公告分类</span>
                  <input
                    className="form-control"
                    name="kicker"
                    value={announcementForm.kicker}
                    onChange={handleAnnouncementFieldChange}
                    placeholder="例如：置顶通知 / 活动提醒 / 维护公告"
                  />
                </label>
                <label className="form-field">
                  <span>发布时间</span>
                  <input
                    className="form-control"
                    name="published_on"
                    type="date"
                    value={announcementForm.published_on}
                    onChange={handleAnnouncementFieldChange}
                  />
                </label>
              </div>
              <label className="form-field">
                <span>公告标题</span>
                <input
                  className="form-control"
                  name="title"
                  value={announcementForm.title}
                  onChange={handleAnnouncementFieldChange}
                  placeholder="例如：4 月 20 日共赏会改为 19:30 开始"
                  required
                />
              </label>
              <label className="form-field">
                <span>公告摘要</span>
                <input
                  className="form-control"
                  name="description"
                  value={announcementForm.description}
                  onChange={handleAnnouncementFieldChange}
                  placeholder="例如：原定 19:00 调整为 19:30，地点不变，请提前 10 分钟入场。"
                />
              </label>
              <label className="form-field">
                <span>公告正文</span>
                <textarea
                  className="form-control"
                  name="body"
                  rows={4}
                  value={announcementForm.body}
                  onChange={handleAnnouncementFieldChange}
                  placeholder="补充活动流程、调整原因或注意事项（可选）。"
                />
              </label>
              <label className="form-field">
                <span>排序</span>
                <input
                  className="form-control"
                  name="sort_order"
                  value={announcementForm.sort_order}
                  onChange={handleAnnouncementFieldChange}
                />
              </label>
              <label className="form-check admin-cms-form__check">
                <input
                  name="active"
                  type="checkbox"
                  checked={announcementForm.active}
                  onChange={handleAnnouncementFieldChange}
                />
                <span>发布后立即展示</span>
              </label>
              <div className="form-actions admin-cms-form__actions">
                <button className="admin-cms-form__submit inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={announcementActionState.pending}>
                  {announcementActionState.pending ? "发布中..." : "发布公告"}
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">公告列表</p>
                <h2>已发布公告</h2>
              </div>
              <StatusChip tone="neutral">{announcementBlocks.length} 条</StatusChip>
            </div>
            <div className="grid gap-3">
              {announcementBlocks.map((notice) => {
                const safeTitle = sanitizeDisplayText(notice.title, "未命名公告");
                const safeDescription = sanitizeDisplayText(notice.description || notice.body, "暂无公告说明。");
                const safeSlug = sanitizeDisplayText(notice.slug, "--");

                return (
                  <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={notice.id}>
                    <button
                      className={`w-full text-left ${editingContentBlockID === notice.id ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)]" : ""}`}
                      type="button"
                      onClick={() => handleContentBlockEditStart(notice)}
                    >
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <h3>{safeTitle}</h3>
                        <StatusChip
                          className={notice.active ? "admin-status-chip admin-status-chip--active" : "admin-status-chip admin-status-chip--inactive"}
                          tone={notice.active ? "success" : "neutral"}
                        >
                          {notice.active ? "已启用" : "已隐藏"}
                        </StatusChip>
                      </div>
                      <p>{safeDescription}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        <span>分类: {notice.kicker || "公告"}</span>
                        <span>时间: {notice.label || "未填写"}</span>
                        <span>排序: {notice.sort_order}</span>
                        <span>slug: {safeSlug}</span>
                      </div>
                      <p className="text-sm text-[color:var(--text-muted)]">点击卡片载入编辑区。</p>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5 py-1 text-xs border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30"
                        type="button"
                        onClick={() => void handleContentBlockDelete(notice)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {!announcementBlocks.length ? <p className="text-sm text-[color:var(--text-muted)]">当前还没有公告，可先发布一条站点通知。</p> : null}
            </div>
          </article>
        </section>
          </div>
        </section>
      </>
    );
  }

  function renderCurrentPage(): ReactNode {
    switch (routePath) {
      case "/stories":
        return renderStoriesPage();
      case "/forum":
        return renderForumPage();
      case "/anonymous":
        return renderAnonymousPage();
      case "/admin":
        return renderAdminPage();
      case "/space":
        return !isAuthenticated && !selectedPublicProfileUsername
          ? renderLoginPage()
          : renderSpacePage();
      case "/login":
        return renderLoginPage();
      case "/gallery":
        return renderGalleryPage();
      default:
        return renderHomePage();
    }
  }

  const isStoryDetailView = routePath === "/stories" && Boolean(selectedArticleID) && !isStoriesEditorMode;
  const pageSceneKey = useMemo(() => {
    switch (routePath) {
      case "/stories":
        return isStoriesEditorMode ? "stories:editor" : selectedArticleID ? `stories:detail:${selectedArticleID}` : "stories:list";
      case "/forum":
        return isForumEditorMode
          ? "forum:editor"
          : selectedForumThreadID
            ? `forum:thread:${selectedForumThreadID}`
            : "forum:list";
      case "/anonymous":
        return selectedAnonymousThreadID ? `anonymous:thread:${selectedAnonymousThreadID}` : "anonymous:list";
      case "/space":
        return selectedPublicProfileUsername ? `space:profile:${selectedPublicProfileUsername}` : "space:mine";
      case "/login":
        return "auth:login";
      default:
        return routePath;
    }
  }, [
    isForumEditorMode,
    isStoriesEditorMode,
    routePath,
    selectedAnonymousThreadID,
    selectedArticleID,
    selectedForumThreadID,
    selectedPublicProfileUsername,
  ]);
  const visibleNavigation = (canAdmin
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.href !== "/admin"))
    .filter((item) => isAuthenticated || item.href !== "/space");
  const accessibleNavigation = canAccessAnonymous
    ? visibleNavigation
    : visibleNavigation.filter((item) => item.href !== "/anonymous");
  const navigationMap = new Map(accessibleNavigation.map((item) => [item.href, item]));
  const groupedNavigation: NavigationGroup[] = [
    {
      id: "browse",
      label: "redgal forum",
      items: (["/", "/stories", "/gallery"] as const)
        .map((href) => navigationMap.get(href))
        .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item)),
    },
    {
      id: "community",
      label: "社区",
      items: (["/forum", "/anonymous"] as const)
        .map((href) => navigationMap.get(href))
        .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item)),
    },
    {
      id: "workspace",
      label: "我的",
      items: (["/space"] as const)
        .map((href) => navigationMap.get(href))
        .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item)),
    },
    {
      id: "admin",
      label: "管理",
      items: (["/admin"] as const)
        .map((href) => navigationMap.get(href))
        .filter((item): item is (typeof NAV_ITEMS)[number] => Boolean(item)),
    },
  ].filter((group) => group.items.length > 0);
  const copyrightYear = new Date().getFullYear();

  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <div className="background-stage" aria-hidden="true">
        <div className="background-slide background-slide--one" />
        <div className="background-slide background-slide--two" />
        <div className="background-overlay" />
      </div>
      <div className="scene-ornaments" aria-hidden="true">
        <span className="scene-ornament scene-ornament--orb" />
        <span className="scene-ornament scene-ornament--ticket" />
        <span className="scene-ornament scene-ornament--ring" />
        <span className="scene-ornament scene-ornament--shard" />
      </div>

      <main className={`app-shell ${isStoryDetailView ? "app-shell--story-detail" : ""} ${routePath === "/login" ? "app-shell--auth" : ""}`}>
        <Header
          authHref={isAuthenticated ? "/space" : "/login"}
          authLabel={isAuthenticated ? "我的空间" : "登录"}
          currentPath={routePath}
          hidden={isHeaderHidden}
          navigationGroups={groupedNavigation}
          navigation={accessibleNavigation}
          notifications={headerNotifications}
          onNotificationClick={handleNotificationClick}
          onNotificationsMarkAllRead={handleNotificationsMarkAllRead}
          onNavigate={handleNavigate}
          onToggleTheme={handleToggleTheme}
          themeMode={themeMode}
          unreadNotificationCount={unreadNotificationCount}
          utilityHref={routePath === "/" ? "/forum" : "/"}
          utilityLabel={routePath === "/" ? "进入论坛" : "返回首页"}
        />
        <div
          id="main-content"
          className={`page-shell ${
            routePath === "/"
              ? "page-shell--home"
              : routePath === "/stories"
                ? "page-shell--stories"
                : routePath === "/forum"
                  ? "page-shell--forum"
                  : routePath === "/anonymous"
                    ? "page-shell--anonymous"
                    : routePath === "/admin"
                      ? "page-shell--admin"
                    : routePath === "/space"
                      ? "page-shell--space"
                      : routePath === "/login"
                        ? "page-shell--login"
                      : "page-shell--gallery"
          } ${isStoryDetailView ? "page-shell--story-detail" : ""}`}
        >
          <Suspense
            fallback={
              <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm text-center">
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">加载中</p>
                <p className="text-sm text-[color:var(--text-muted)]">页面模块正在加载，请稍候...</p>
              </section>
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pageSceneKey}
                className="page-scene"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.985, filter: "blur(8px)" }}
                animate={
                  shouldReduceMotion
                    ? { opacity: 1, transition: { duration: 0 } }
                    : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: PAGE_SCENE_ENTER_TRANSITION }
                }
                exit={
                  shouldReduceMotion
                    ? { opacity: 1, transition: { duration: 0 } }
                    : { opacity: 0, y: -12, scale: 0.99, filter: "blur(6px)", transition: PAGE_SCENE_EXIT_TRANSITION }
                }
              >
                {renderCurrentPage()}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
        {routePath !== "/login" ? (
          <footer className="site-copyright" role="contentinfo">
            <p>版权所属：百川乃大视觉小说研 © {copyrightYear}</p>
          </footer>
        ) : null}
      </main>
      {activeHomeNotice ? (
        <div
          className="home-notice-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-notice-modal-title"
        >
          <button
            className="home-notice-modal__backdrop"
            type="button"
            aria-label="关闭公告弹窗"
            onClick={() => handleDismissHomeNotice(activeHomeNotice.id)}
          />
          <article className="home-notice-modal__panel">
            <div className="home-notice-modal__head">
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">站点公告</p>
              <StatusChip tone="accent">{activeHomeNotice.label || "公告"}</StatusChip>
            </div>
            <h2 id="home-notice-modal-title">{activeHomeNotice.title}</h2>
            {activeHomeNotice.description ? (
              <p className="home-notice-modal__summary">{activeHomeNotice.description}</p>
            ) : null}
            {activeHomeNotice.body ? (
              <div className="home-notice-modal__body">
                {parseLines(activeHomeNotice.body).map((line, index) => (
                  <p key={`${activeHomeNotice.id}-line-${index}`}>{line}</p>
                ))}
              </div>
            ) : null}
            <div className="home-notice-modal__actions">
              <button
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => handleDismissHomeNotice(activeHomeNotice.id)}
              >
                我知道了
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}

export default App;
