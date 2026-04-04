import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
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
  fetchIncomingFriendRequests,
  fetchForumProgress,
  fetchAnonymousThreadDetail,
  fetchAnonymousThreads,
  fetchHealth,
  fetchMyBangumiCollections,
  fetchMyBangumiJobs,
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
  type ForumProgress as ApiForumProgress,
  type ForumReply as ApiForumReply,
  type ForumSignInResult as ApiForumSignInResult,
  type ForumThread as ApiForumThread,
  type ForumThreadDetail as ApiForumThreadDetail,
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
  updateContentBlock,
  signInForum,
  type Session,
  type SiteContent,
  type UpdateProfilePayload,
  type UpdateGalleryEntryPayload,
  updateGalleryEntry,
  updateRelayStatus,
  updateWritingContestStatus,
  updateMyProfile,
} from "./api";
import Header, { type HeaderNotificationItem } from "./components/Header";
import ForumProgressPanel from "./components/ForumProgressPanel";
import AnonymousPage from "./pages/AnonymousPage";
import ForumPage from "./pages/ForumPage";
import GalleryPage from "./pages/GalleryPage";
import HomePage from "./pages/HomePage";
import PortalPage from "./pages/PortalPage";
import SpacePage from "./pages/SpacePage";
import StoriesPage from "./pages/StoriesPage";
import {
  NAV_ITEMS,
  DEFAULT_PUBLIC_PROFILE_USERNAME,
  SPACE_SHOWCASE_GROUPS,
} from "./content";
import { buildForumReplyTree, forumActionLabel, formatForumFloor, type ForumReplyNode } from "./lib/forum";
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
  type RoutePath,
} from "./lib/routes";
import { persistSession, readStoredSession } from "./lib/session";
import {
  createAnonymousThreadTitle,
  excerpt,
  extractMarkdownPreviewImage,
  formatDateTime,
  formatUpdatedAt,
  galleryEntryTypeLabel,
  isAuthFailure,
  normalizeVisibilityLabel,
  parseLines,
  parseTags,
  toErrorMessage,
} from "./lib/text";

type StatusTone = "neutral" | "success" | "warn" | "accent";
type ThemeMode = "day" | "night";

const THEME_STORAGE_KEY = "rubedo_theme_mode";
const NOTIFICATION_STORE_KEY = "rubedo_notification_store_v1";
const NOTIFICATION_MAX_ITEMS = 48;
const HOME_NOTICE_SEEN_KEY = "rubedo_home_notice_seen_v1";
const HOME_NOTICE_SEEN_LIMIT = 96;

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "night";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "day" ? "day" : "night";
}

type NotificationKind = "forum_reply" | "friend_request" | "announcement";

interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  href?: string;
  createdAt: string;
  unread: boolean;
}

interface NotificationStore {
  friendBaselineReady: boolean;
  items: AppNotification[];
  noticeBaselineReady: boolean;
  seenNoticeIDs: string[];
  seenIncomingRequestIDs: string[];
  threadBaselineReady: boolean;
  threadReplySnapshot: Record<string, number>;
}

function createEmptyNotificationStore(): NotificationStore {
  return {
    friendBaselineReady: false,
    items: [],
    noticeBaselineReady: false,
    seenNoticeIDs: [],
    seenIncomingRequestIDs: [],
    threadBaselineReady: false,
    threadReplySnapshot: {},
  };
}

function sortAndTrimNotifications(items: readonly AppNotification[]): AppNotification[] {
  const map = new Map<string, AppNotification>();
  items.forEach((item) => {
    if (typeof item.id !== "string" || !item.id.trim()) {
      return;
    }

    map.set(item.id, {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      unread: Boolean(item.unread),
    });
  });

  return Array.from(map.values())
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt) || 0;
      const rightTime = Date.parse(right.createdAt) || 0;
      return rightTime - leftTime;
    })
    .slice(0, NOTIFICATION_MAX_ITEMS);
}

function readStoredNotificationStore(): NotificationStore {
  if (typeof window === "undefined") {
    return createEmptyNotificationStore();
  }

  const raw = window.localStorage.getItem(NOTIFICATION_STORE_KEY);
  if (!raw) {
    return createEmptyNotificationStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationStore> | null;
    if (!parsed || typeof parsed !== "object") {
      return createEmptyNotificationStore();
    }

    const items = Array.isArray(parsed.items)
      ? sortAndTrimNotifications(parsed.items as AppNotification[])
      : [];
    const seenIncomingRequestIDs = Array.isArray(parsed.seenIncomingRequestIDs)
      ? parsed.seenIncomingRequestIDs.filter(
          (item): item is string => typeof item === "string" && Boolean(item.trim()),
        )
      : [];
    const seenNoticeIDs = Array.isArray(parsed.seenNoticeIDs)
      ? parsed.seenNoticeIDs.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : [];
    const threadReplySnapshot =
      parsed.threadReplySnapshot && typeof parsed.threadReplySnapshot === "object"
        ? Object.entries(parsed.threadReplySnapshot).reduce<Record<string, number>>(
            (result, [threadID, count]) => {
              if (typeof count === "number" && Number.isFinite(count) && count >= 0) {
                result[threadID] = count;
              }
              return result;
            },
            {},
          )
        : {};

    return {
      friendBaselineReady: Boolean(parsed.friendBaselineReady),
      items,
      noticeBaselineReady: Boolean(parsed.noticeBaselineReady),
      seenNoticeIDs,
      seenIncomingRequestIDs,
      threadBaselineReady: Boolean(parsed.threadBaselineReady),
      threadReplySnapshot,
    };
  } catch {
    window.localStorage.removeItem(NOTIFICATION_STORE_KEY);
    return createEmptyNotificationStore();
  }
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

interface StatusChipProps {
  tone?: StatusTone;
  children: ReactNode;
}

interface HeroMetric {
  detail: string;
  label: string;
  tone?: StatusTone;
  value: string;
}

interface SectionHeroProps {
  children?: ReactNode;
  description: string;
  kicker: string;
  metrics: HeroMetric[];
  title: string;
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
  label: string;
  sort_order: string;
  active: boolean;
}

interface FormActionState<T> {
  pending: boolean;
  error: string;
  data: T | null;
  success: string;
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
  label: string;
  title: string;
  description: string;
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
    kicker: "Moderation",
    description: "展示墙投稿与 Bangumi 任务状态。",
    children: [
      { id: "moderation-wall", label: "展示墙投稿审核" },
      { id: "moderation-bangumi", label: "Bangumi 导入任务" },
    ],
  },
  {
    id: "dashboard",
    title: "数据看板",
    kicker: "Dashboard",
    description: "核心指标、待办提醒与快捷入口。",
    children: [
      { id: "dashboard-overview", label: "核心指标速览" },
      { id: "dashboard-todos", label: "待办提醒" },
      { id: "dashboard-actions", label: "高频入口" },
    ],
  },
  {
    id: "site",
    title: "站点内容管理",
    kicker: "CMS",
    description: "内容块、接龙活动、征文活动与系统说明。",
    children: [
      { id: "site-blocks", label: "内容块编辑" },
      { id: "site-relays", label: "接龙活动" },
      { id: "site-contests", label: "征文活动" },
      { id: "site-notes", label: "系统说明" },
    ],
  },
  {
    id: "gallery",
    title: "展示条目列表",
    kicker: "Gallery Assets",
    description: "展示资源录入、编辑与列表维护。",
    children: [
      { id: "gallery-editor", label: "新建展示条目" },
      { id: "gallery-list", label: "展示条目列表" },
    ],
  },
  {
    id: "members",
    title: "成员与审核管理",
    kicker: "Members",
    description: "成员状态流转、认证审批与权限说明。",
    children: [
      { id: "members-users", label: "成员状态" },
      { id: "members-verifications", label: "认证审批" },
      { id: "members-permissions", label: "权限建议" },
    ],
  },
] as const;

function adminSectionFromPage(page: AdminPageKey): AdminSectionKey {
  const match = ADMIN_SIDEBAR_SECTIONS.find((section) =>
    section.children.some((child) => child.id === page),
  );

  return match?.id ?? "dashboard";
}

const HOME_POEM_LINES = [
  "似活水之源之传承，滋润贫瘠精神",
  "仿月出星隐之交替，澄澈臃肿灵魂",
  "拟竹林清风之轮转，氤氲懵懂心灵",
] as const;

const HOME_HISTORY_PARAGRAPHS = [
  "百川乃大视觉小说研建立于 2017 年。它最初并不是一场被郑重规划的成立仪式，而是从一个“需要有地方认真聊 Galgame”的意外契机里生长出来的。",
  "同好会正式出现之前，一部分成员长期在四川大学校级 ACG 社团的群聊里活动。由于视觉小说相关话题常常比普通二次元讨论更私密、更细腻，也更需要单独展开，于是才有了最早的分群与最初的聚拢。",
  "2017 到 2020 年之间，这个群聊并不算很热闹；真正让它重新活起来的，是 2020 年以后不断加入的新生。到了 2024 年，百川乃大视觉小说研这个名字正式确立，同好会也开始以更明确的姿态被大家认识。",
  "这些年里，社团并没有真正完成一部属于自己的视觉小说，但那份“我们来做一部 Galgame 吧”的冲动从未消失。有人离开，有人继续创作，也有人第一次在这里知道，原来校园里还有这样一群愿意认真谈作品、谈叙事、谈制作的人。",
] as const;

const HOME_RULE_CARDS = [
  {
    id: "guest",
    title: "公开访客",
    body: "可以浏览首页、公开札记、部分讨论与展示内容。首页保持开放，但不会把站内更私密的讨论直接摊开给所有人。",
  },
  {
    id: "member",
    title: "认证成员",
    body: "通过认证后，可以参与更多讨论、维护个人空间、投稿展示墙，也能进入更完整的社团内容流。",
  },
  {
    id: "moderation",
    title: "维护与审核",
    body: "管理组负责整理站点秩序、审核投稿与维护讨论环境。规则会尽量温和克制，但会优先保护创作、交流与成员体验。",
  },
] as const;

const HOME_PHOTO_WALL = [
  {
    id: "photo-1",
    src: "/graphs/ex1.png",
    title: "照片墙精选 01",
    note: "把属于社团的线下活动、展板、群像和那些值得被记住的瞬间，直接压到首页底部。",
  },
  {
    id: "photo-2",
    src: "/graphs/ex2.png",
    title: "照片墙精选 02",
    note: "照片墙不只是装饰，它应该像社团的延伸记忆，把过去活动留下的温度继续展示出来。",
  },
] as const;

const DEFAULT_PORTAL_PAGES: DisplayPortalPage[] = [
  {
    href: "/stories",
    kicker: "文章札记",
    title: "公开文章与随想",
    description: "把前台文章、专题标签和短篇感悟收束到一条更适合浏览的内容流里。",
  },
  {
    href: "/forum",
    kicker: "论坛交流",
    title: "论坛讨论与匿名聊天室",
    description: "保留讨论串结构，同时给匿名即时聊天一个更轻、更松弛的入口。",
  },
  {
    href: "/space",
    kicker: "个人空间",
    title: "用户个人空间",
    description: "把个人资料、收藏统计和带情绪的空间陈列集中到一个独立页。",
  },
  {
    href: "/gallery",
    kicker: "展示陈列",
    title: "相册与留声机展示墙",
    description: "相册、拍立得、旧纸、时间轴和留声机以策展式布局并列展开。",
  },
];

const DEFAULT_SOCIETY_HIGHLIGHTS: DisplayHighlight[] = [
  {
    id: "highlight-1",
    kicker: "社团定位",
    title: "以 Galgame、叙事与视觉表达为核心的同好社团。",
    body: "我们把文字、音乐、美术、配音、讨论和策展放在同一条线上，让喜欢故事的人能在同一个地方相遇。",
  },
  {
    id: "highlight-2",
    kicker: "日常氛围",
    title: "不是只聊作品，也一起做展示、写札记、办分享。",
    body: "首页承担社团门面，站内的文章区、论坛区、展示墙和个人空间则是社团活动的延展场景。",
  },
  {
    id: "highlight-3",
    kicker: "成员构成",
    title: "欢迎写手、画手、配音、剪辑、策展和单纯热爱剧情的人。",
    body: "不要求每个人都产出内容，但希望每个人都能带来自己最真切的兴趣方向。",
  },
];

const DEFAULT_SOCIETY_PILLARS: DisplayPillar[] = [
  {
    id: "pillar-1",
    title: "作品赏析",
    description: "围绕 Galgame、AVG 和相关叙事作品做主题讨论、慢热作品导读与角色分析。",
  },
  {
    id: "pillar-2",
    title: "内容共创",
    description: "支持成员写短札、做展板、整理专题页，把零散灵感做成能被看见的社团成果。",
  },
  {
    id: "pillar-3",
    title: "活动陈列",
    description: "把相册、拍立得、旧纸、时间轴和留声机这类展示方式融入社团活动发布与归档。",
  },
];

const DEFAULT_SOCIETY_ACTIVITIES: DisplayActivity[] = [
  {
    id: "activity-1",
    label: "每周",
    title: "夜读与共赏会",
    description: "围绕某一部作品的章节、路线或主题做小范围共读，再把讨论整理成社团札记。",
  },
  {
    id: "activity-2",
    label: "专题",
    title: "剧情拆解工作坊",
    description: "从开场、冲突、转折和结尾几条线去拆一部作品，看它如何建立情绪和节奏。",
  },
  {
    id: "activity-3",
    label: "展示",
    title: "展墙与图像策展",
    description: "把截图、封面、短句、场景构图和音乐卡片排成一面真正有叙述感的展示墙。",
  },
  {
    id: "activity-4",
    label: "社交",
    title: "匿名聊天室与主题串",
    description: "给轻量讨论留出口，也给深度帖子留位置，让成员可以按自己舒服的方式参与。",
  },
];

const DEFAULT_SOCIETY_NOTICES: DisplayNotice[] = [
  {
    id: "notice-1",
    kicker: "公告",
    label: "置顶",
    title: "公告功能已接入管理界面",
    description: "管理员可在后台直接发布公告，前台会自动同步展示。",
    body: "公告支持标题、摘要与正文；后续会继续补充定时发布与归档。",
  },
];

const DEFAULT_SOCIETY_JOIN_STEPS: DisplayJoinStep[] = [
  {
    id: "join-1",
    step: "01",
    title: "先逛一圈社团页面",
    description: "从首页、文章札记、论坛聊天室和展示墙里感受社团目前的内容方向。",
  },
  {
    id: "join-2",
    step: "02",
    title: "带着兴趣点进组",
    description: "你可以偏剧情、偏美术、偏配音，也可以只是想找一群愿意认真聊作品的人。",
  },
  {
    id: "join-3",
    step: "03",
    title: "参加一次共赏或共创",
    description: "从最轻的一次参与开始，让社团先认识你的节奏，再慢慢展开更多合作。",
  },
];

const DEFAULT_GALLERY_ALBUMS: DisplayAlbum[] = [
  { id: "album-1", title: "夏夜公园", accent: "橙灯", caption: "适合挂长图、封面和同主题多图编排。" },
  { id: "album-2", title: "终电之前", accent: "蓝站台", caption: "一组图可以像章节卡片一样依次展开，而不是孤立平铺。" },
  { id: "album-3", title: "雨后的窗边", accent: "灰银", caption: "相册区更适合做整套视觉叙述，保留同一时期的情绪密度。" },
];

const DEFAULT_GALLERY_POLAROIDS: DisplayPolaroid[] = [
  { id: "polaroid-1", title: "拍立得 01", stamp: "Sat 23:14", note: "给瞬时心情留一个更轻的展示方式，像贴在墙上的即时便签。" },
  { id: "polaroid-2", title: "拍立得 02", stamp: "Sun 10:08", note: "适合角色台词、通关感想和单张插画，不需要完整长文承接。" },
  { id: "polaroid-3", title: "拍立得 03", stamp: "Tue 18:42", note: "可以混排手写感、日期戳和简短说明，强化收藏物件的质感。" },
];

const DEFAULT_GALLERY_PAPERS: DisplayPaper[] = [
  { id: "paper-1", title: "旧纸札记", signature: "编辑台旁注", body: "把长评论里舍不得删的边角话放到旧纸区，像夹在档案盒里的补充说明。" },
  { id: "paper-2", title: "未寄出的信", signature: "无投递地址", body: "适合写给角色、写给过去的自己，或者写给某个已经散场的讨论夜晚。" },
  { id: "paper-3", title: "折角页", signature: "纸张微黄", body: "视觉上偏暖、偏旧，可以承接有年代感的文本和带折痕的回忆。" },
];

const DEFAULT_GALLERY_TIMELINE: DisplayTimeline[] = [
  { id: "timeline-1", year: "2023", title: "最初的文章流", summary: "从单纯的文章列表开始，先把内容生产入口搭起来。" },
  { id: "timeline-2", year: "2024", title: "论坛讨论加入主站", summary: "讨论串成为作品周边交流的主阵地，用户开始沉淀标签化话题。" },
  { id: "timeline-3", year: "2025", title: "个人收藏意识增强", summary: "用户不再只看内容，也希望把喜欢的图、句子和帖子带回自己的空间。" },
  { id: "timeline-4", year: "2026", title: "展示墙独立成页", summary: "从功能性列表转向展示性策展，页面开始承担氛围和叙述职责。" },
];

const DEFAULT_GALLERY_TRACKS: DisplayTrack[] = [
  { id: "track-1", title: "A 面 / 开场曲", mood: "雾气", length: "03:24", detail: "适合放 BGM、印象曲和页面主题绑定的声音索引。" },
  { id: "track-2", title: "B 面 / 雨声循环", mood: "低回", length: "04:11", detail: "留声机区域可以强调正在播放、收藏顺序和带情绪的标题设计。" },
  { id: "track-3", title: "落针 / 归档", mood: "颗粒", length: "02:52", detail: "声音内容即使暂时没有真实播放能力，也能先形成视觉记忆点。" },
];

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

function createAnnouncementFormState(): AnnouncementFormState {
  return {
    title: "",
    description: "",
    body: "",
    label: "公告",
    sort_order: "0",
    active: true,
  };
}

function slugifyValue(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return "item";
  }

  const slug = normalized.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return slug || "item";
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

function StatusChip({ tone = "neutral", children }: StatusChipProps) {
  return <span className={`status-chip status-chip--${tone}`}>{children}</span>;
}

function SectionHero({ children, description, kicker, metrics, title }: SectionHeroProps) {
  return (
    <section className="hero-panel page-hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p className="hero-description">{description}</p>
        {children}
      </div>
      <div className="hero-metrics">
        {metrics.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <StatusChip tone={metric.tone}>{metric.detail}</StatusChip>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const forumReplyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [routePath, setRoutePath] = useState<RoutePath>(() => readCurrentPath());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredThemeMode());
  const [spaceShelfTab, setSpaceShelfTab] = useState<(typeof SPACE_SHOWCASE_GROUPS)[number]["id"]>("games");
  const [selectedArticleID, setSelectedArticleID] = useState<string | null>(() =>
    readSelectedArticleID(),
  );
  const [isStoriesEditorMode, setIsStoriesEditorMode] = useState<boolean>(() =>
    readStoriesEditorMode(),
  );
  const [selectedForumThreadID, setSelectedForumThreadID] = useState<string | null>(() =>
    readSelectedForumThreadID(),
  );
  const [isForumEditorMode, setIsForumEditorMode] = useState<boolean>(() =>
    readForumEditorMode(),
  );
  const [selectedPublicProfileUsername, setSelectedPublicProfileUsername] = useState<string | null>(
    () => readPublicProfileUsername(),
  );
  const [selectedAnonymousThreadID, setSelectedAnonymousThreadID] = useState<string | null>(() =>
    readSelectedAnonymousThreadID(),
  );
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
  const [myBangumiJobsPager, setMyBangumiJobsPager] = useState<PagerState>(() => createPagerState(6));
  const [bangumiJobsError, setBangumiJobsError] = useState("");
  const [bangumiCollectionsError, setBangumiCollectionsError] = useState("");
  const [adminGalleryEntries, setAdminGalleryEntries] = useState<SiteGalleryEntry[]>([]);
  const [galleryForm, setGalleryForm] = useState<GalleryFormState>(() => createGalleryFormState());
  const [galleryActionState, setGalleryActionState] =
    useState<FormActionState<SiteGalleryEntry>>(createEmptyActionState<SiteGalleryEntry>);
  const [editingGalleryEntryID, setEditingGalleryEntryID] = useState<string | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<ApiAdminDashboard | null>(null);
  const [superAdminDashboard, setSuperAdminDashboard] = useState<ApiSuperAdminDashboard | null>(null);
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
    tagsText: "闲聊",
  }));
  const [anonymousThreadActionState, setAnonymousThreadActionState] =
    useState<FormActionState<ApiForumThread>>(createEmptyActionState<ApiForumThread>);
  const [anonymousReplyForm, setAnonymousReplyForm] = useState<ReplyFormState>(() => createReplyFormState());
  const [anonymousReplyActionState, setAnonymousReplyActionState] =
    useState<FormActionState<ApiForumReply>>(createEmptyActionState<ApiForumReply>);
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
  const [anonymousThreadPager, setAnonymousThreadPager] = useState<PagerState>(() => createPagerState(6));
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [notificationStore, setNotificationStore] = useState<NotificationStore>(() =>
    readStoredNotificationStore(),
  );
  const [homeNoticeSeenIDs, setHomeNoticeSeenIDs] = useState<string[]>(() =>
    readStoredHomeNoticeSeenIDs(),
  );

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
    ? siteContent.portal_activities.map((item) => ({
        id: item.slug,
        label: item.label || "",
        title: item.title,
        description: item.description || "",
      }))
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

  const galleryAlbums: DisplayAlbum[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "album")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          accent: entry.subtitle || "",
          caption: entry.body || "",
        }))
    : DEFAULT_GALLERY_ALBUMS;
  const galleryPolaroids: DisplayPolaroid[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "polaroid")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          stamp: entry.subtitle || "",
          note: entry.body || "",
        }))
    : DEFAULT_GALLERY_POLAROIDS;
  const galleryPapers: DisplayPaper[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "paper")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          signature: entry.subtitle || "",
          body: entry.body || "",
        }))
    : DEFAULT_GALLERY_PAPERS;
  const galleryTimeline: DisplayTimeline[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "timeline")
        .map((entry) => ({
          id: entry.slug,
          year: entry.subtitle || "",
          title: entry.title,
          summary: entry.body || "",
        }))
    : DEFAULT_GALLERY_TIMELINE;
  const galleryTracks: DisplayTrack[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
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
  const activeSpaceShelf =
    SPACE_SHOWCASE_GROUPS.find((group) => group.id === spaceShelfTab) ?? SPACE_SHOWCASE_GROUPS[0];
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
    forumProgress?.levels.find((level) => level.level === forumLevelSummary?.current_level) ?? null;
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
  const sortedNotifications = [...notificationStore.items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt) || 0;
    const rightTime = Date.parse(right.createdAt) || 0;
    return rightTime - leftTime;
  });
  const unreadNotificationCount = notificationStore.items.reduce(
    (count, item) => count + (item.unread ? 1 : 0),
    0,
  );
  const headerNotifications: HeaderNotificationItem[] = sortedNotifications.slice(0, 18).map((item) => ({
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
    if (typeof window === "undefined") {
      return;
    }

    function handlePopstate(): void {
      setRoutePath(readCurrentPath());
      setSelectedArticleID(readSelectedArticleID());
      setIsStoriesEditorMode(readStoriesEditorMode());
      setSelectedForumThreadID(readSelectedForumThreadID());
      setIsForumEditorMode(readForumEditorMode());
      setSelectedPublicProfileUsername(readPublicProfileUsername());
      setSelectedAnonymousThreadID(readSelectedAnonymousThreadID());
    }

    window.addEventListener("popstate", handlePopstate);
    return () => {
      window.removeEventListener("popstate", handlePopstate);
    };
  }, []);

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

    window.localStorage.setItem(NOTIFICATION_STORE_KEY, JSON.stringify(notificationStore));
  }, [notificationStore]);

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
    if (session) {
      return;
    }

    setNotificationStore(createEmptyNotificationStore());
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(NOTIFICATION_STORE_KEY);
    }
  }, [session]);

  useEffect(() => {
    const noticeBlocks = (siteContent?.portal_notices || []).filter((item) => item.active);
    if (!noticeBlocks.length) {
      return;
    }

    setNotificationStore((current) => {
      const next: NotificationStore = {
        ...current,
        items: [...current.items],
        seenNoticeIDs: [...current.seenNoticeIDs],
      };
      const seenNoticeIDs = new Set(next.seenNoticeIDs);
      const notificationIDs = new Set(next.items.map((item) => item.id));

      if (!next.noticeBaselineReady) {
        noticeBlocks.forEach((notice) => {
          const noticeKey = `${notice.id}:${notice.slug || notice.title}`;
          seenNoticeIDs.add(noticeKey);
        });
        next.noticeBaselineReady = true;
        next.seenNoticeIDs = Array.from(seenNoticeIDs).slice(-320);
        return next;
      }

      noticeBlocks.forEach((notice) => {
        const noticeKey = `${notice.id}:${notice.slug || notice.title}`;
        if (seenNoticeIDs.has(noticeKey)) {
          return;
        }

        const notificationID = `announcement:${noticeKey}`;
        if (!notificationIDs.has(notificationID)) {
          const summary = (notice.description || notice.body || "").trim();
          next.items.push({
            id: notificationID,
            kind: "announcement",
            title: `站内公告：${notice.title}`,
            description: summary ? excerpt(summary, 72) : "后台发布了新的站内公告。",
            href: "/",
            createdAt: new Date().toISOString(),
            unread: true,
          });
          notificationIDs.add(notificationID);
        }

        seenNoticeIDs.add(noticeKey);
      });

      next.items = sortAndTrimNotifications(next.items);
      next.seenNoticeIDs = Array.from(seenNoticeIDs).slice(-320);
      return next;
    });
  }, [session, siteContent]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!session?.accessToken || !profile) {
      return;
    }

    const identityAliases = Array.from(
      new Set(
        [profile.username, profile.nickname]
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    if (!identityAliases.length) {
      return;
    }

    let active = true;
    const accessToken = session.accessToken;

    async function pollNotificationEvents(): Promise<void> {
      const [incomingResult, threadsResult] = await Promise.allSettled([
        fetchIncomingFriendRequests(accessToken, { page: 1, pageSize: 60 }),
        fetchThreads(accessToken, { page: 1, pageSize: 120 }),
      ]);
      if (!active) {
        return;
      }

      setNotificationStore((current) => {
        const next: NotificationStore = {
          ...current,
          items: [...current.items],
          seenIncomingRequestIDs: [...current.seenIncomingRequestIDs],
          threadReplySnapshot: { ...current.threadReplySnapshot },
        };
        const seenRequestIDs = new Set(next.seenIncomingRequestIDs);
        const notificationIDs = new Set(next.items.map((item) => item.id));

        if (incomingResult.status === "fulfilled") {
          const pendingIncoming = incomingResult.value.items.filter((request) => request.status === "pending");

          if (!next.friendBaselineReady) {
            pendingIncoming.forEach((request) => {
              seenRequestIDs.add(request.request_id);
            });
            next.friendBaselineReady = true;
          } else {
            pendingIncoming.forEach((request) => {
              if (seenRequestIDs.has(request.request_id)) {
                return;
              }

              const notificationID = `friend-request:${request.request_id}`;
              if (!notificationIDs.has(notificationID)) {
                next.items.push({
                  id: notificationID,
                  kind: "friend_request",
                  title: "收到新的好友申请",
                  description: `@${request.requester_username} 请求添加你为好友。`,
                  href: "/space",
                  createdAt: request.created_at || new Date().toISOString(),
                  unread: true,
                });
                notificationIDs.add(notificationID);
              }
              seenRequestIDs.add(request.request_id);
            });
          }
        }

        if (threadsResult.status === "fulfilled") {
          const ownThreads = threadsResult.value.items.filter((thread) =>
            identityAliases.includes((thread.author || "").trim().toLowerCase()),
          );

          if (!next.threadBaselineReady) {
            ownThreads.forEach((thread) => {
              next.threadReplySnapshot[thread.id] = thread.reply_count;
            });
            next.threadBaselineReady = true;
          } else {
            ownThreads.forEach((thread) => {
              const previousReplyCount = next.threadReplySnapshot[thread.id];
              if (typeof previousReplyCount === "number" && thread.reply_count > previousReplyCount) {
                const increasedCount = thread.reply_count - previousReplyCount;
                const notificationID = `forum-reply:${thread.id}:${thread.reply_count}:${thread.last_post_at || ""}`;
                if (!notificationIDs.has(notificationID)) {
                  next.items.push({
                    id: notificationID,
                    kind: "forum_reply",
                    title: "你的帖子有新回复",
                    description: `《${thread.title}》新增 ${increasedCount} 条回复。`,
                    href: `/forum/threads/${encodeURIComponent(thread.id)}`,
                    createdAt: thread.last_post_at || new Date().toISOString(),
                    unread: true,
                  });
                  notificationIDs.add(notificationID);
                }
              }

              next.threadReplySnapshot[thread.id] = thread.reply_count;
            });
          }
        }

        next.items = sortAndTrimNotifications(next.items);
        next.seenIncomingRequestIDs = Array.from(seenRequestIDs).slice(-240);
        return next;
      });
    }

    void pollNotificationEvents();
    const intervalID = window.setInterval(() => {
      void pollNotificationEvents();
    }, 45000);

    return () => {
      active = false;
      window.clearInterval(intervalID);
    };
  }, [profile, session?.accessToken]);

  useEffect(() => {
    if (routePath === "/stories" && !isStoriesEditorMode && articleEditingTargetID) {
      setArticleEditingTargetID(null);
    }
  }, [articleEditingTargetID, isStoriesEditorMode, routePath]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId = 0;
    let lastScrollY = window.scrollY;

    function updateHeaderVisibility(): void {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      setIsHeaderHidden((current) => {
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (routePath === "/stories" && isStoriesEditorMode) {
      document.title = "发布文章 | Rubedo Forum";
      return;
    }

    if (routePath === "/stories" && selectedArticleID && activeArticle) {
      document.title = `${activeArticle.title} | Rubedo Forum`;
      return;
    }

    if (routePath === "/forum" && selectedForumThreadID && activeForumThread) {
      document.title = `${activeForumThread.title} | Rubedo Forum`;
      return;
    }

    if (routePath === "/forum" && isForumEditorMode) {
      document.title = "发布主题 | Rubedo Forum";
      return;
    }

    if (routePath === "/anonymous" && selectedAnonymousThreadID && activeAnonymousThread) {
      document.title = `${activeAnonymousThread.title} | Rubedo Forum`;
      return;
    }

    document.title = TITLE_BY_ROUTE[routePath];
  }, [
    activeAnonymousThread,
    activeArticle,
    activeForumThread,
    routePath,
    isForumEditorMode,
    isStoriesEditorMode,
    selectedAnonymousThreadID,
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
      const articleDetailRequest =
        routePath === "/stories" && selectedArticleID
          ? fetchArticleDetail(selectedArticleID, token || undefined)
          : Promise.resolve<ApiArticle | null>(null);
      const threadDetailRequest =
        routePath === "/forum" && selectedForumThreadID
          ? fetchThreadDetail(selectedForumThreadID, token || undefined)
          : Promise.resolve<ApiForumThreadDetail | null>(null);
      const anonymousThreadResult =
        routePath === "/anonymous"
          ? fetchAnonymousThreads(token || undefined, {
              page: anonymousThreadPager.page,
              pageSize: anonymousThreadPager.pageSize,
            })
          : Promise.resolve<Paginated<ApiForumThread>>({
              items: [],
              page: anonymousThreadPager.page,
              page_size: anonymousThreadPager.pageSize,
              total: 0,
              total_pages: 0,
            });
      const anonymousThreadDetailRequest =
        routePath === "/anonymous" && selectedAnonymousThreadID
          ? fetchAnonymousThreadDetail(selectedAnonymousThreadID, token || undefined)
          : Promise.resolve<ApiForumThreadDetail | null>(null);

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
        setLastUpdatedAt(new Date().toISOString());
        setHasLoadedOnce(true);
        setIsLoadingData(false);
        setIsRefreshing(false);
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
    anonymousThreadPager.page,
    anonymousThreadPager.pageSize,
    threadPager.page,
    threadPager.pageSize,
    threadSearchKeyword,
    wallPager.page,
    wallPager.pageSize,
  ]);

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
        usersResult,
        bangumiJobsResult,
        blocksResult,
        wallSubmissionsResult,
        relaysResult,
        contestsResult,
      ] = await Promise.allSettled([
        fetchAdminDashboard(accessToken),
        canSuperAdmin ? fetchSuperAdminDashboard(accessToken) : Promise.resolve<ApiSuperAdminDashboard | null>(null),
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

      startTransition(() => {
        setAdminDashboard(dashboardResult.status === "fulfilled" ? dashboardResult.value : null);
        setSuperAdminDashboard(superAdminResult.status === "fulfilled" ? superAdminResult.value : null);

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
    setNotificationStore((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === notificationID
          ? {
              ...item,
              unread: false,
            }
          : item,
      ),
    }));

    if (href) {
      handleNavigate(href);
    }
  }

  function handleNotificationsMarkAllRead(): void {
    setNotificationStore((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.unread
          ? {
              ...item,
              unread: false,
            }
          : item,
      ),
    }));
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
    const resolvedURL =
      typeof window !== "undefined"
        ? new URL(nextHref, window.location.origin)
        : new URL(`http://localhost${nextHref}`);
    const nextPath = normalizePath(resolvedURL.pathname);
    const nextArticleID = readSelectedArticleID(resolvedURL.pathname);
    const nextStoriesEditorMode = readStoriesEditorMode(resolvedURL.pathname);
    const nextForumEditorMode = readForumEditorMode(resolvedURL.pathname);
    const nextPublicProfileUsername = readPublicProfileUsername(resolvedURL.pathname);
    const nextThreadID =
      nextPath === "/forum" ? readSelectedForumThreadID(resolvedURL.pathname, resolvedURL.search) : null;
    const nextAnonymousThreadID =
      nextPath === "/anonymous" ? readSelectedAnonymousThreadID(resolvedURL.pathname) : null;

    if (
      typeof window !== "undefined" &&
      (window.location.pathname !== resolvedURL.pathname || window.location.search !== resolvedURL.search)
    ) {
      window.history.pushState({}, "", `${resolvedURL.pathname}${resolvedURL.search}`);
    }

    setIsHeaderHidden(false);

    startTransition(() => {
      setRoutePath(nextPath);
      setSelectedArticleID(nextArticleID);
      setIsStoriesEditorMode(nextStoriesEditorMode);
      setSelectedForumThreadID(nextThreadID);
      setIsForumEditorMode(nextForumEditorMode);
      setSelectedPublicProfileUsername(nextPublicProfileUsername);
      setSelectedAnonymousThreadID(nextAnonymousThreadID);
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
    setArticleEditingTargetID(null);
    setArticleManageActionState(createEmptyActionState<ApiArticle | DeleteArticleResult>());
    setForumProgress(null);
    setForumSignInState(createEmptyActionState<ApiForumSignInResult>());
    setAdminGalleryEntries([]);
    setGalleryForm(createGalleryFormState());
    setGalleryActionState(createEmptyActionState<SiteGalleryEntry>());
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
        error: "请先登录后再发起匿名主题。",
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
      const anonymousTags = parseTags(anonymousThreadForm.tagsText);
      const primaryTopic = anonymousTags[0] || "闲聊";
      const thread = await createAnonymousThread(
        {
          title:
            anonymousThreadForm.title.trim() ||
            createAnonymousThreadTitle(anonymousThreadForm.content, primaryTopic),
          content: anonymousThreadForm.content.trim(),
          tags: anonymousTags.length ? anonymousTags : [primaryTopic],
        },
        session.accessToken,
      );

      setAnonymousThreadForm({
        ...createThreadFormState(),
        board: "匿名板",
        anonymous: true,
        tagsText: primaryTopic,
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
        success: "匿名主题已发布。",
      });
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

  function handleAnonymousTopicChange(topic: string): void {
    setAnonymousThreadForm((current) => ({
      ...current,
      tagsText: topic,
    }));
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
        success: anonymousReplyForm.sage ? "匿名回复已提交（sage，不顶帖）。" : "匿名回复已提交。",
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
  }

  function resetGalleryEditor(): void {
    setEditingGalleryEntryID(null);
    setGalleryForm(createGalleryFormState());
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
      const confirmed = window.confirm(`确定删除展示条目「${entry.title}」吗？`);
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
        label: contentBlockForm.label.trim() || undefined,
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
      const confirmed = window.confirm(`确定删除内容块「${block.title}」吗？`);
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
        label: announcementForm.label.trim() || "公告",
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

  async function handleRelayStatusChange(relayID: string, status: string): Promise<void> {
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

  async function handleContestStatusChange(contestID: string, status: string): Promise<void> {
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
      <article className="panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">服务状态</p>
            <h2>后端连通性</h2>
          </div>
          <StatusChip tone={backendReachable ? "success" : "warn"}>
            {backendReachable ? "在线" : "待确认"}
          </StatusChip>
        </div>
        {health ? (
          <>
            <div className="service-grid">
              {serviceEntries.map(([serviceName, detail]) => (
                <div className="service-card content-card" key={serviceName}>
                  <span>{serviceName}</span>
                  <StatusChip tone={detail.reachable ? "success" : detail.configured ? "warn" : "neutral"}>
                    {detail.reachable ? "reachable" : detail.configured ? "configured only" : "not configured"}
                  </StatusChip>
                  {detail.error ? <p className="panel-empty">{detail.error}</p> : null}
                </div>
              ))}
            </div>
            <div className="module-list">
              {health.modules.map((moduleName) => (
                <span className="module-tag" key={moduleName}>
                  {moduleName}
                </span>
              ))}
            </div>
            <p className="panel-empty">最近同步：{lastUpdatedLabel}</p>
          </>
        ) : (
          <p className="panel-error">{healthError || "健康检查尚未返回。"}</p>
        )}
        <button className="ghost-button" type="button" onClick={handleRefresh} disabled={isRefreshing}>
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
    if (pager.total <= 0) {
      return <p className="panel-empty">{emptyText}</p>;
    }

    return (
      <div className="pagination-bar">
        <span className="pagination-bar__meta">
          第 {pager.page} / {Math.max(pager.totalPages, 1)} 页，共 {pager.total} 条，每页 6 条
        </span>
        <div className="pagination-bar__actions">
          <button
            className="ghost-button"
            disabled={pager.page <= 1}
            onClick={() => onPageChange(pager.page - 1)}
            type="button"
          >
            上一页
          </button>
          <button
            className="ghost-button"
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
    return (
      <>
        <HomePage
          articlePager={articlePager}
          collectionTotal={collectionTotal}
          displayProfile={displayProfile}
          galleryAlbums={galleryAlbums}
          galleryPapers={galleryPapers}
          galleryPolaroids={galleryPolaroids}
          galleryTimeline={galleryTimeline}
          galleryTracks={galleryTracks}
          threadPager={threadPager}
          wallPager={wallPager}
          onNavigate={handleNavigate}
        />
        <PortalPage
          notices={societyNotices}
          portalPages={portalPages}
          societyActivities={societyActivities}
          societyJoinSteps={societyJoinSteps}
          societyPillars={societyPillars}
          onNavigate={handleNavigate}
        />
      </>
    );
  }

  function renderPortalPage(): ReactNode {
    return renderHomePage();
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

  function renderInlineFormattedText(text: string, keyPrefix: string): ReactNode[] {
    const tokens = text.split(/(\[[^\]]+]\((?:https?:\/\/|\/)[^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g);

    return tokens.filter(Boolean).map((token, index) => {
      const key = `${keyPrefix}-${index}`;
      const linkMatch = token.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        return (
          <a
            className="detail-body__link"
            href={href}
            key={key}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            target={href.startsWith("http") ? "_blank" : undefined}
          >
            {label}
          </a>
        );
      }

      if (/^`[^`]+`$/.test(token)) {
        return <code key={key}>{token.slice(1, -1)}</code>;
      }

      if (/^\*\*[^*]+\*\*$/.test(token)) {
        return <strong key={key}>{token.slice(2, -2)}</strong>;
      }

      return <span key={key}>{token}</span>;
    });
  }

  function renderRichContent(content: string): ReactNode {
    const normalized = content.replace(/\r/g, "").trim();
    if (!normalized) {
      return <p className="panel-empty">内容暂时为空。</p>;
    }

    const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

    return blocks.map((block, blockIndex) => {
      const key = `detail-block-${blockIndex}`;
      const lines = block.split("\n");
      const imageLines = lines
        .map((line) => line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/))
        .filter(Boolean) as RegExpMatchArray[];

      if (imageLines.length === lines.length && imageLines.length > 0) {
        return (
          <div className="detail-body__gallery" key={key}>
            {imageLines.map((match, imageIndex) => (
              <figure className="detail-body__figure" key={`${key}-image-${imageIndex}`}>
                <img alt={match[1] || "详情图片"} src={match[2]} />
                {match[1] ? <figcaption>{match[1]}</figcaption> : null}
              </figure>
            ))}
          </div>
        );
      }

      const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const [, marks, title] = headingMatch;
        if (marks.length === 1) {
          return <h2 className="detail-body__heading" key={key}>{title}</h2>;
        }
        if (marks.length === 2) {
          return <h3 className="detail-body__heading" key={key}>{title}</h3>;
        }
        return <h4 className="detail-body__heading" key={key}>{title}</h4>;
      }

      if (lines.every((line) => /^\d+\.\s+/.test(line.trim()))) {
        return (
          <ol className="detail-body__list" key={key}>
            {lines.map((line, index) => (
              <li key={`${key}-li-${index}`}>{renderInlineFormattedText(line.replace(/^\d+\.\s+/, ""), `${key}-li-${index}`)}</li>
            ))}
          </ol>
        );
      }

      if (lines.every((line) => /^[-*+]\s+/.test(line.trim()))) {
        return (
          <ul className="detail-body__list" key={key}>
            {lines.map((line, index) => (
              <li key={`${key}-li-${index}`}>{renderInlineFormattedText(line.replace(/^[-*+]\s+/, ""), `${key}-li-${index}`)}</li>
            ))}
          </ul>
        );
      }

      if (lines.every((line) => /^>\s?/.test(line.trim()))) {
        return (
          <blockquote className="detail-body__quote" key={key}>
            {lines.map((line, index) => (
              <p key={`${key}-quote-${index}`}>{renderInlineFormattedText(line.replace(/^>\s?/, ""), `${key}-quote-${index}`)}</p>
            ))}
          </blockquote>
        );
      }

      if (block.startsWith("```") && block.endsWith("```")) {
        const code = block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
        return (
          <pre className="detail-body__code" key={key}>
            <code>{code}</code>
          </pre>
        );
      }

      return (
        <p className="detail-body__paragraph" key={key}>
          {lines.map((line, lineIndex) => (
            <span key={`${key}-line-${lineIndex}`}>
              {renderInlineFormattedText(line, `${key}-line-${lineIndex}`)}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      );
    });
  }

  function renderForumPage(): ReactNode {
    return (
      <ForumPage
        activeForumThread={activeForumThread}
        boardFilterOptions={boardFilterOptions}
        boardOptions={boardOptions}
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
        activeAnonymousThread={activeAnonymousThread}
        anonymousReplyActionState={anonymousReplyActionState}
        anonymousReplyForm={anonymousReplyForm}
        anonymousThreadActionState={anonymousThreadActionState}
        anonymousThreadDetail={anonymousThreadDetail}
        anonymousThreadDetailError={anonymousThreadDetailError}
        anonymousThreadFeed={anonymousThreadFeed}
        anonymousThreadForm={anonymousThreadForm}
        anonymousThreadPager={anonymousThreadPager}
        anonymousThreadsError={anonymousThreadsError}
        isLoadingData={isLoadingData}
        selectedAnonymousThreadID={selectedAnonymousThreadID}
        session={session}
        onAnonymousReplyFieldChange={handleAnonymousReplyFieldChange}
        onAnonymousReplyTargetChange={handleAnonymousReplyTargetChange}
        onAnonymousReplyTargetClear={handleAnonymousReplyTargetClear}
        onAnonymousReplySubmit={handleAnonymousReplySubmit}
        onAnonymousThreadFieldChange={handleAnonymousThreadFieldChange}
        onAnonymousThreadPageChange={(page) =>
          setAnonymousThreadPager((current) => ({ ...current, page }))
        }
        onAnonymousTopicChange={handleAnonymousTopicChange}
        onAnonymousThreadSubmit={handleAnonymousThreadSubmit}
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

  function renderGalleryPage(): ReactNode {
    return (
      <GalleryPage
        galleryAlbums={galleryAlbums}
        galleryPapers={galleryPapers}
        galleryPolaroids={galleryPolaroids}
        galleryTimeline={galleryTimeline}
        galleryTracks={galleryTracks}
        hasVerifiedSpaceAccess={hasVerifiedSpaceAccess}
        isAuthenticated={isAuthenticated}
        session={session}
        wallActionState={wallActionState}
        wallEntries={wallEntries}
        wallError={wallError}
        wallForm={wallForm}
        wallPager={wallPager}
        onWallFieldChange={handleWallFieldChange}
        onWallPageChange={(page) => setWallPager((current) => ({ ...current, page }))}
        onWallSubmit={handleWallSubmit}
      />
    );
  }

  function renderAdminPage(): ReactNode {
    if (!session) {
      return (
        <section className="panel admin-empty-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">管理界面</p>
              <h2>请先登录管理员账号</h2>
            </div>
            <StatusChip tone="warn">需要登录</StatusChip>
          </div>
          <p className="panel-empty">后台工作台只对管理员开放。先登录，再进入管理界面。</p>
        </section>
      );
    }

    if (!canAdmin) {
      return (
        <section className="panel admin-empty-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">管理界面</p>
              <h2>当前账号没有后台权限</h2>
            </div>
            <StatusChip tone="warn">只读用户</StatusChip>
          </div>
          <p className="panel-empty">
            当前角色：{profile?.roles?.join(", ") || "未返回角色信息"}。管理员或超级管理员才能进入后台工作台。
          </p>
        </section>
      );
    }

    const adminActiveSection = adminSectionFromPage(adminActivePage);
    const pendingVerificationUsers = adminUsers.filter((user) => user.pending_verification_id);
    const announcementBlocks = adminContentBlocks
      .filter((block) => block.block_type === "portal_notice")
      .sort((left, right) => right.sort_order - left.sort_order);
    const adminTerminalSpaceID = (profile?.username || "guest").trim();

    return (
      <>
        <section className="admin-shell">
          <aside className="panel admin-sidebar">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">后台工作台</p>
                <h2>管理导航</h2>
              </div>
              <StatusChip tone="accent">Sidebar</StatusChip>
            </div>
            <div className="admin-shell__bootlog" aria-hidden="true">
              <p className="admin-shell__bootline admin-shell__bootline--title">
                <span className="admin-shell__prompt">^ .</span> // Admin Workbench
              </p>
              <p className="admin-shell__bootline">
                <span className="admin-shell__prompt">.$</span> boot.dashboard --scope admin
              </p>
              <p className="admin-shell__bootline admin-shell__bootline--ok">SYSTEM READY.</p>
              <p className="admin-shell__bootline">
                <span className="admin-shell__prompt">{adminTerminalSpaceID}@redgal:~$</span> watch -n 5 service.status
                <span className="admin-shell__cursor" />
              </p>
            </div>
            <div className="stack-list">
              {ADMIN_SIDEBAR_SECTIONS.map((section) => {
                const active = section.id === adminActiveSection;
                return (
                  <div
                    className={`admin-sidebar__section ${active ? "admin-sidebar__section--active" : ""}`}
                    key={section.id}
                  >
                    <button
                      className="admin-sidebar__button"
                      type="button"
                      onClick={() => setAdminActivePage(section.children[0].id)}
                    >
                      <span>{section.kicker}</span>
                      <strong>{section.title}</strong>
                      <p>{section.description}</p>
                    </button>
                    {active ? (
                      <div className="admin-sidebar__children">
                        {section.children.map((child) => (
                          <button
                            className={`admin-sidebar__child ${
                              child.id === adminActivePage ? "admin-sidebar__child--active" : ""
                            }`}
                            key={child.id}
                            type="button"
                            onClick={() => setAdminActivePage(child.id)}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="admin-content">

        <section className="admin-dashboard-grid" style={{ display: adminActivePage === "dashboard-overview" ? undefined : "none" }}>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Dashboard</p>
                <h2>核心指标速览</h2>
              </div>
              <StatusChip tone="accent">管理员</StatusChip>
            </div>
            {adminDashboardError ? <p className="panel-error">{adminDashboardError}</p> : null}
            <div className="service-grid admin-metric-grid">
              {[
                ["注册总数", String(adminDashboard?.total_users ?? 0)],
                ["已认证成员", String(adminDashboard?.verified_users ?? 0)],
                ["管理员", String(adminDashboard?.admin_users ?? 0)],
                ["超级管理员", String(adminDashboard?.super_admin_users ?? 0)],
              ].map(([label, value]) => (
                <div className="service-card content-card" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel-grid preview-grid" style={{ display: adminActivePage === "dashboard-todos" ? undefined : "none" }}>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">待办提醒</p>
                <h2>当前需要优先处理的事项</h2>
              </div>
              <StatusChip tone={(adminDashboard?.pending_verification_users ?? 0) > 0 ? "warn" : "success"}>
                {adminDashboard?.pending_verification_users ?? 0} 条
              </StatusChip>
            </div>
            <div className="stack-list">
              <div className="content-card">
                <div className="content-card__header">
                  <h3>成员认证</h3>
                  <StatusChip tone={(adminDashboard?.pending_verification_users ?? 0) > 0 ? "warn" : "success"}>
                    {adminDashboard?.pending_verification_users ?? 0} 条
                  </StatusChip>
                </div>
                <p>当前最需要处理的是成员认证与状态流转。审核通过后，前台更多功能才会开放给成员。</p>
              </div>
              <div className="content-card">
                <div className="content-card__header">
                  <h3>展示墙投稿</h3>
                  <StatusChip tone="accent">{wallSubmissionsPager.total} 条</StatusChip>
                </div>
                <p>展示墙投稿已经进入后台审核流，可以切到“展示墙投稿审核”分页继续处理。</p>
              </div>
              {canSuperAdmin && superAdminDashboard ? (
                <div className="content-card">
                  <div className="content-card__header">
                    <h3>超级管理员扩展</h3>
                    <StatusChip tone="accent">Super Admin</StatusChip>
                  </div>
                  <div className="meta-row">
                    <span>内容块 {superAdminDashboard.site_content_blocks}</span>
                    <span>展示条目 {superAdminDashboard.gallery_entries}</span>
                    <span>活动 {superAdminDashboard.relay_events + superAdminDashboard.writing_contests}</span>
                    <span>待处理举报 {superAdminDashboard.content_reports_open}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </section>

        <section className="panel-grid preview-grid" style={{ display: adminActivePage === "dashboard-actions" ? undefined : "none" }}>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">快捷操作</p>
                <h2>高频入口</h2>
              </div>
              <StatusChip tone="neutral">Quick Actions</StatusChip>
            </div>
            <div className="admin-quick-grid">
              {[
                { title: "发布新接龙", body: "在接龙活动页创建并维护接龙活动。", next: "site-relays" as const },
                { title: "发布新征文", body: "在征文活动页创建并维护征文活动。", next: "site-contests" as const },
                { title: "维护首页内容", body: "内容块管理可直接修改 Portal、Highlight、Join Step 等前台区块。", next: "site-blocks" as const },
                { title: "审核成员申请", body: "用户与审核区可处理待认证用户。", next: "members-verifications" as const },
              ].map((item) => (
                <button
                  className="portal-card"
                  key={item.title}
                  type="button"
                  onClick={() => setAdminActivePage(item.next)}
                >
                  <span className="portal-card__kicker">入口</span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--members"
          id="admin-users"
          style={{ display: adminActivePage === "members-users" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Recruitment & Forms</p>
                <h2>成员与审核管理</h2>
              </div>
              <StatusChip tone="accent">{adminUsersPager.total} 人</StatusChip>
            </div>
            {adminUsersError ? <p className="panel-error">{adminUsersError}</p> : null}
            {adminUserActionState.error ? <p className="panel-error">{adminUserActionState.error}</p> : null}
            {adminUserActionState.success ? <p className="panel-empty">{adminUserActionState.success}</p> : null}
            <div className="stack-list">
              {adminUsers.map((user) => (
                <div className="content-card admin-user-card" key={user.user_id}>
                  <div className="content-card__header">
                    <div>
                      <h3>{user.nickname || user.username}</h3>
                      <p className="forum-reply-meta">
                        <span>@{user.username}</span>
                        <span>{user.roles.join(", ") || "无角色"}</span>
                      </p>
                    </div>
                    <StatusChip tone={user.verified ? "success" : user.status === "pending_verification" ? "warn" : "neutral"}>
                      {user.status}
                    </StatusChip>
                  </div>
                  <div className="meta-row">
                    <span>{user.verified ? "已认证" : "未认证"}</span>
                    {user.pending_verification_id ? <span>待审请求 {user.pending_verification_id}</span> : null}
                  </div>
                  <div className="admin-user-card__actions">
                    {user.pending_verification_id ? (
                      <>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={adminUserActionState.pending}
                          onClick={() => void handleAdminVerificationReview(user.user_id, "approved")}
                        >
                          通过审核
                        </button>
                        <button
                          className="ghost-button gallery-admin__danger"
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
                        className="ghost-button"
                        type="button"
                        disabled={adminUserActionState.pending}
                        onClick={() => void handleAdminUserModerationAction(user.user_id, "unmute")}
                      >
                        解除禁言
                      </button>
                    ) : (
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={adminUserActionState.pending}
                        onClick={() => void handleAdminUserModerationAction(user.user_id, "mute")}
                      >
                        禁言
                      </button>
                    )}
                    {user.status === "banned" ? (
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={adminUserActionState.pending}
                        onClick={() => void handleAdminUserModerationAction(user.user_id, "unban")}
                      >
                        解除封禁
                      </button>
                    ) : (
                      <button
                        className="ghost-button gallery-admin__danger"
                        type="button"
                        disabled={adminUserActionState.pending}
                        onClick={() => void handleAdminUserModerationAction(user.user_id, "ban")}
                      >
                        封禁
                      </button>
                    )}
                    {user.roles.some((role) => role === "moderator" || role === "admin" || role === "super_admin") ? (
                      <button
                        className="ghost-button gallery-admin__danger"
                        type="button"
                        disabled={adminUserActionState.pending}
                        onClick={() => void handleAdminUserModerationAction(user.user_id, "demote")}
                      >
                        降级
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {!adminUsers.length ? <p className="panel-empty">当前没有可管理的成员数据。</p> : null}
            </div>
            {renderPager(adminUsersPager, (page) => setAdminUsersPager((current) => ({ ...current, page })), "暂无成员。")}
          </article>
        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--verifications"
          style={{ display: adminActivePage === "members-verifications" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Verification Queue</p>
                <h2>认证审批</h2>
              </div>
              <StatusChip tone="warn">{pendingVerificationUsers.length} 条</StatusChip>
            </div>
            {adminUsersError ? <p className="panel-error">{adminUsersError}</p> : null}
            {adminUserActionState.error ? <p className="panel-error">{adminUserActionState.error}</p> : null}
            {adminUserActionState.success ? <p className="panel-empty">{adminUserActionState.success}</p> : null}
            <div className="stack-list">
              {pendingVerificationUsers.map((user) => (
                <div className="content-card admin-user-card" key={user.user_id}>
                  <div className="content-card__header">
                    <div>
                      <h3>{user.nickname || user.username}</h3>
                      <p className="forum-reply-meta">
                        <span>@{user.username}</span>
                        <span>{user.roles.join(", ") || "无角色"}</span>
                      </p>
                    </div>
                    <StatusChip tone="warn">{user.status}</StatusChip>
                  </div>
                  <div className="meta-row">
                    <span>待审请求 {user.pending_verification_id}</span>
                    <span>{user.verified ? "已认证" : "未认证"}</span>
                  </div>
                  <div className="admin-user-card__actions">
                    <button className="ghost-button" type="button" onClick={() => void handleAdminVerificationReview(user.user_id, "approved")}>
                      通过审核
                    </button>
                    <button className="ghost-button gallery-admin__danger" type="button" onClick={() => void handleAdminVerificationReview(user.user_id, "rejected")}>
                      驳回申请
                    </button>
                  </div>
                </div>
              ))}
              {!pendingVerificationUsers.length ? <p className="panel-empty">当前没有待处理的认证申请。</p> : null}
            </div>
          </article>
        </section>

        <section className="panel-grid preview-grid" style={{ display: adminActivePage === "members-permissions" ? undefined : "none" }}>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Permission Notes</p>
                <h2>权限分工建议</h2>
              </div>
            </div>
            <div className="stack-list">
              <div className="content-card">
                <div className="content-card__header">
                  <h3>超级管理员</h3>
                  <StatusChip tone="accent">all access</StatusChip>
                </div>
                <p>负责系统级配置、人员状态维护和全站风险处理。</p>
              </div>
              <div className="content-card">
                <div className="content-card__header">
                  <h3>内容编辑</h3>
                  <StatusChip tone="neutral">cms only</StatusChip>
                </div>
                <p>负责首页内容块、公告文案、展示墙资源和活动封面的更新。</p>
              </div>
              <div className="content-card">
                <div className="content-card__header">
                  <h3>招新审核</h3>
                  <StatusChip tone="warn">review flow</StatusChip>
                </div>
                <p>重点处理待认证用户、状态流转和面试后的最终结论。</p>
              </div>
            </div>
          </article>
        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--cms"
          id="admin-cms"
          style={{ display: adminActivePage === "site-blocks" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">CMS</p>
                <h2>{editingContentBlockID ? "编辑站点内容块" : "新建站点内容块"}</h2>
              </div>
              <StatusChip tone="accent">site_content_blocks</StatusChip>
            </div>
            {contentBlockActionState.error ? <p className="panel-error">{contentBlockActionState.error}</p> : null}
            {contentBlockActionState.success ? <p className="panel-empty">{contentBlockActionState.success}</p> : null}
            <form className="space-form" onSubmit={(event) => void handleContentBlockSubmit(event)}>
              <label>
                <span>内容块类型</span>
                <select name="block_type" value={contentBlockForm.block_type} onChange={handleContentBlockFieldChange}>
                  <option value="portal_page">portal_page</option>
                  <option value="portal_highlight">portal_highlight</option>
                  <option value="portal_pillar">portal_pillar</option>
                  <option value="portal_notice">portal_notice</option>
                  <option value="portal_activity">portal_activity</option>
                  <option value="portal_join_step">portal_join_step</option>
                  <option value="hero_object">hero_object</option>
                </select>
              </label>
              <label>
                <span>标题</span>
                <input name="title" value={contentBlockForm.title} onChange={handleContentBlockFieldChange} required />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" value={contentBlockForm.slug} onChange={handleContentBlockFieldChange} />
              </label>
              <label>
                <span>路径</span>
                <input name="path" value={contentBlockForm.path} onChange={handleContentBlockFieldChange} placeholder="/forum" />
              </label>
              <label>
                <span>Kicker</span>
                <input name="kicker" value={contentBlockForm.kicker} onChange={handleContentBlockFieldChange} />
              </label>
              <label>
                <span>Label</span>
                <input name="label" value={contentBlockForm.label} onChange={handleContentBlockFieldChange} />
              </label>
              <label>
                <span>Description</span>
                <textarea name="description" rows={3} value={contentBlockForm.description} onChange={handleContentBlockFieldChange} />
              </label>
              <label>
                <span>Body</span>
                <textarea name="body" rows={4} value={contentBlockForm.body} onChange={handleContentBlockFieldChange} />
              </label>
              <label>
                <span>排序</span>
                <input name="sort_order" value={contentBlockForm.sort_order} onChange={handleContentBlockFieldChange} />
              </label>
              <label className="gallery-admin__toggle">
                <input name="active" checked={contentBlockForm.active} onChange={handleContentBlockFieldChange} type="checkbox" />
                <span>启用这个内容块</span>
              </label>
              <div className="gallery-admin__actions">
                <button className="primary-button" type="submit" disabled={contentBlockActionState.pending}>
                  {contentBlockActionState.pending ? "保存中..." : editingContentBlockID ? "更新内容块" : "创建内容块"}
                </button>
                <button className="ghost-button" type="button" onClick={resetContentBlockEditor}>
                  清空表单
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">当前内容块</p>
                <h2>站点内容管理</h2>
              </div>
              <StatusChip tone="neutral">{adminContentBlocksPager.total} 条</StatusChip>
            </div>
            {adminContentBlocksError ? <p className="panel-error">{adminContentBlocksError}</p> : null}
            <div className="stack-list">
              {adminContentBlocks.map((block) => (
                <div className="content-card" key={block.id}>
                  <div className="content-card__header">
                    <h3>{block.title}</h3>
                    <StatusChip tone={block.active ? "success" : "warn"}>{block.block_type}</StatusChip>
                  </div>
                  <p>{block.description || block.body || "暂无说明。"}</p>
                  <div className="meta-row">
                    <span>slug: {block.slug}</span>
                    <span>sort: {block.sort_order}</span>
                    {block.path ? <span>path: {block.path}</span> : null}
                  </div>
                  <div className="gallery-admin__actions">
                    <button className="ghost-button" type="button" onClick={() => handleContentBlockEditStart(block)}>
                      编辑
                    </button>
                    <button className="ghost-button gallery-admin__danger" type="button" onClick={() => void handleContentBlockDelete(block)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {!adminContentBlocks.length ? <p className="panel-empty">当前没有内容块数据。</p> : null}
            </div>
            {renderPager(adminContentBlocksPager, (page) => setAdminContentBlocksPager((current) => ({ ...current, page })), "暂无内容块。")}
          </article>
        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--gallery-editor"
          id="admin-gallery"
          style={{ display: adminActivePage === "gallery-editor" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Gallery Assets</p>
                <h2>{editingGalleryEntryID ? "编辑展示条目" : "新建展示条目"}</h2>
              </div>
              <StatusChip tone="accent">{editingGalleryEntryID ? "编辑模式" : "创建模式"}</StatusChip>
            </div>
            {galleryActionState.error ? <p className="panel-error">{galleryActionState.error}</p> : null}
            {galleryActionState.success ? <p className="panel-empty">{galleryActionState.success}</p> : null}
            <form className="space-form" onSubmit={(event) => void handleGallerySubmit(event)}>
              <label>
                <span>条目类型</span>
                <select
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
              <label>
                <span>标题</span>
                <input name="title" onChange={handleGalleryFieldChange} value={galleryForm.title} required />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" onChange={handleGalleryFieldChange} value={galleryForm.slug} />
              </label>
              <label>
                <span>副标题</span>
                <input name="subtitle" onChange={handleGalleryFieldChange} value={galleryForm.subtitle} />
              </label>
              <label>
                <span>正文 / 描述</span>
                <textarea name="body" onChange={handleGalleryFieldChange} rows={4} value={galleryForm.body} />
              </label>
              <label>
                <span>额外文本</span>
                <input name="extra_text" onChange={handleGalleryFieldChange} value={galleryForm.extra_text} />
              </label>
              <label>
                <span>排序</span>
                <input name="sort_order" onChange={handleGalleryFieldChange} value={galleryForm.sort_order} />
              </label>
              <label className="gallery-admin__toggle">
                <input checked={galleryForm.active} name="active" onChange={handleGalleryFieldChange} type="checkbox" />
                <span>设为公开展示</span>
              </label>
              <div className="gallery-admin__actions">
                <button className="primary-button" disabled={galleryActionState.pending} type="submit">
                  {galleryActionState.pending ? "保存中..." : editingGalleryEntryID ? "更新展示条目" : "创建展示条目"}
                </button>
                <button className="ghost-button" onClick={resetGalleryEditor} type="button">
                  清空表单
                </button>
              </div>
            </form>
          </article>

        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--gallery-list"
          style={{ display: adminActivePage === "gallery-list" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">当前展示资源</p>
                <h2>展示条目列表</h2>
              </div>
              <StatusChip tone="neutral">{adminGalleryPager.total} 条</StatusChip>
            </div>
            <div className="stack-list">
              {adminGalleryEntries.map((entry) => (
                <div className="content-card" key={entry.id}>
                  <div className="content-card__header">
                    <h3>{entry.title}</h3>
                    <StatusChip tone={entry.active ? "success" : "warn"}>
                      {entry.active ? "active" : "inactive"}
                    </StatusChip>
                  </div>
                  <p>{entry.body || "暂无描述。"}</p>
                  <div className="meta-row">
                    <span>{galleryEntryTypeLabel(entry.entry_type)}</span>
                    <span>slug: {entry.slug}</span>
                  </div>
                  <div className="gallery-admin__actions">
                    <button className="ghost-button" onClick={() => handleGalleryEditStart(entry)} type="button">
                      编辑
                    </button>
                    <button className="ghost-button gallery-admin__danger" onClick={() => void handleGalleryDelete(entry)} type="button">
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {!adminGalleryEntries.length ? <p className="panel-empty">当前还没有可管理的 gallery 条目。</p> : null}
            </div>
            {renderPager(adminGalleryPager, (page) => setAdminGalleryPager((current) => ({ ...current, page })), "暂无可管理条目。")}
          </article>
        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--activities"
          id="admin-relays"
          style={{ display: adminActivePage === "site-relays" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Activities</p>
                <h2>接龙活动管理</h2>
              </div>
              <StatusChip tone="accent">Relay</StatusChip>
            </div>
            {adminActivityError ? <p className="panel-error">{adminActivityError}</p> : null}
            {relayActionState.error ? <p className="panel-error">{relayActionState.error}</p> : null}
            {relayActionState.success ? <p className="panel-empty">{relayActionState.success}</p> : null}
            <form className="space-form" onSubmit={(event) => void handleRelaySubmit(event)}>
              <h3>发布新接龙活动</h3>
              <label>
                <span>标题</span>
                <input name="title" value={relayForm.title} onChange={handleRelayFieldChange} required />
              </label>
              <label>
                <span>描述</span>
                <textarea name="description" rows={3} value={relayForm.description} onChange={handleRelayFieldChange} />
              </label>
              <label>
                <span>规则</span>
                <textarea name="rules" rows={3} value={relayForm.rules} onChange={handleRelayFieldChange} />
              </label>
              <label>
                <span>开始时间</span>
                <input name="starts_at" type="datetime-local" value={relayForm.starts_at} onChange={handleRelayFieldChange} />
              </label>
              <label>
                <span>结束时间</span>
                <input name="ends_at" type="datetime-local" value={relayForm.ends_at} onChange={handleRelayFieldChange} />
              </label>
              <label className="gallery-admin__toggle">
                <input name="allow_unverified" type="checkbox" checked={relayForm.allow_unverified} onChange={handleRelayFieldChange} />
                <span>允许未认证用户参与</span>
              </label>
              <button className="primary-button" type="submit" disabled={relayActionState.pending}>
                {relayActionState.pending ? "创建中..." : "创建接龙活动"}
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">状态流转</p>
                <h2>接龙活动列表</h2>
              </div>
              <StatusChip tone="accent">{relayPager.total} 场</StatusChip>
            </div>
            <div className="stack-list">
              {relays.map((relay) => (
                <div className="admin-status-row" key={relay.id}>
                  <div>
                    <strong>{relay.title}</strong>
                    <p className="forum-reply-meta">
                      <span>{relay.status}</span>
                      <span>{relay.entry_count} 条参与</span>
                    </p>
                  </div>
                  <div className="forum-reply-actions">
                    {["draft", "open", "closed"].map((status) => (
                      <button className="ghost-button" key={status} type="button" onClick={() => void handleRelayStatusChange(relay.id, status)}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!relays.length ? <p className="panel-empty">当前没有活动。</p> : null}
            </div>
            {renderPager(relayPager, (page) => setRelayPager((current) => ({ ...current, page })), "暂无活动。")}
          </article>
        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--activities"
          id="admin-contests"
          style={{ display: adminActivePage === "site-contests" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Activities</p>
                <h2>征文活动管理</h2>
              </div>
              <StatusChip tone="accent">Contest</StatusChip>
            </div>
            {adminActivityError ? <p className="panel-error">{adminActivityError}</p> : null}
            {contestActionState.error ? <p className="panel-error">{contestActionState.error}</p> : null}
            {contestActionState.success ? <p className="panel-empty">{contestActionState.success}</p> : null}
            <form className="space-form" onSubmit={(event) => void handleContestSubmit(event)}>
              <h3>发布新征文活动</h3>
              <label>
                <span>标题</span>
                <input name="title" value={contestForm.title} onChange={handleContestFieldChange} required />
              </label>
              <label>
                <span>描述</span>
                <textarea name="description" rows={3} value={contestForm.description} onChange={handleContestFieldChange} />
              </label>
              <label>
                <span>规则</span>
                <textarea name="rules" rows={3} value={contestForm.rules} onChange={handleContestFieldChange} />
              </label>
              <label>
                <span>开始时间</span>
                <input name="starts_at" type="datetime-local" value={contestForm.starts_at} onChange={handleContestFieldChange} />
              </label>
              <label>
                <span>结束时间</span>
                <input name="ends_at" type="datetime-local" value={contestForm.ends_at} onChange={handleContestFieldChange} />
              </label>
              <label className="gallery-admin__toggle">
                <input name="allow_article_repost" type="checkbox" checked={contestForm.allow_article_repost} onChange={handleContestFieldChange} />
                <span>允许文章转载投稿</span>
              </label>
              <button className="primary-button" type="submit" disabled={contestActionState.pending}>
                {contestActionState.pending ? "创建中..." : "创建征文活动"}
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">状态流转</p>
                <h2>征文活动列表</h2>
              </div>
              <StatusChip tone="accent">{contestPager.total} 场</StatusChip>
            </div>
            <div className="stack-list">
              {contests.map((contest) => (
                <div className="admin-status-row" key={contest.id}>
                  <div>
                    <strong>{contest.title}</strong>
                    <p className="forum-reply-meta">
                      <span>{contest.status}</span>
                      <span>{contest.submission_count} 篇投稿</span>
                    </p>
                  </div>
                  <div className="forum-reply-actions">
                    {["draft", "open", "closed"].map((status) => (
                      <button className="ghost-button" key={status} type="button" onClick={() => void handleContestStatusChange(contest.id, status)}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!contests.length ? <p className="panel-empty">当前没有征文活动。</p> : null}
            </div>
            {renderPager(contestPager, (page) => setContestPager((current) => ({ ...current, page })), "暂无征文活动。")}
          </article>
        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--moderation"
          id="admin-moderation"
          style={{ display: adminActivePage === "moderation-wall" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Interaction Management</p>
                <h2>展示墙投稿审核</h2>
              </div>
              <StatusChip tone="accent">{wallSubmissionsPager.total} 条</StatusChip>
            </div>
            {wallModerationError ? <p className="panel-error">{wallModerationError}</p> : null}
            {wallActionState.error ? <p className="panel-error">{wallActionState.error}</p> : null}
            {wallActionState.success ? <p className="panel-empty">{wallActionState.success}</p> : null}
            <div className="stack-list">
              {wallSubmissions.map((entry) => (
                <div className="content-card" key={entry.id}>
                  <div className="content-card__header">
                    <h3>{entry.title}</h3>
                    <StatusChip tone={entry.status === "approved" ? "success" : entry.status === "pending_review" ? "warn" : "neutral"}>
                      {entry.status || "unknown"}
                    </StatusChip>
                  </div>
                  <p>{excerpt(entry.content, 180)}</p>
                  <div className="meta-row">
                    <span>{entry.contributor}</span>
                    <span>{entry.images.length} 张图片</span>
                    {entry.created_at ? <span>{formatDateTime(entry.created_at)}</span> : null}
                  </div>
                  <div className="gallery-admin__actions">
                    <button className="ghost-button" type="button" onClick={() => void handleWallSubmissionReview(entry.id, "approved")}>
                      通过
                    </button>
                    <button className="ghost-button" type="button" onClick={() => void handleWallSubmissionReview(entry.id, "changes_requested")}>
                      要求修改
                    </button>
                    <button className="ghost-button gallery-admin__danger" type="button" onClick={() => void handleWallSubmissionReview(entry.id, "rejected")}>
                      驳回
                    </button>
                  </div>
                </div>
              ))}
              {!wallSubmissions.length ? <p className="panel-empty">当前没有待管理的展示墙投稿。</p> : null}
            </div>
            {renderPager(wallSubmissionsPager, (page) => setWallSubmissionsPager((current) => ({ ...current, page })), "暂无投稿。")}
          </article>

        </section>

        <section
          className="page-split-grid admin-page-grid admin-page-grid--bangumi"
          id="admin-bangumi"
          style={{ display: adminActivePage === "moderation-bangumi" ? undefined : "none" }}
        >
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Bangumi Sync Jobs</p>
                <h2>导入任务列表</h2>
              </div>
              <StatusChip tone="accent">{adminBangumiJobsPager.total} 条</StatusChip>
            </div>
            {adminBangumiJobsError ? <p className="panel-error">{adminBangumiJobsError}</p> : null}
            <p className="panel-empty">导入任务由系统自动执行并回写状态，无需人工审批。</p>
            <div className="stack-list">
              {adminBangumiJobs.map((job) => (
                <div className="content-card" key={job.job_id}>
                  <div className="content-card__header">
                    <div>
                      <h3>任务 #{job.job_id}</h3>
                      <p className="forum-reply-meta">
                        <span>{job.username || "unknown user"}</span>
                        <span>{job.job_type || "collection_sync"}</span>
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
                      {job.status}
                    </StatusChip>
                  </div>
                  {job.request_payload ? (
                    <div className="meta-row">
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
                        <span>目标状态: {String(job.request_payload.status || "")}</span>
                      ) : null}
                      {"visibility" in (job.request_payload || {}) ? (
                        <span>可见范围: {String(job.request_payload.visibility || "")}</span>
                      ) : null}
                    </div>
                  ) : null}
                  {job.error_message ? <p className="panel-error">{job.error_message}</p> : null}
                </div>
              ))}
              {!adminBangumiJobs.length ? <p className="panel-empty">当前没有 Bangumi 导入任务。</p> : null}
            </div>
            {renderPager(
              adminBangumiJobsPager,
              (page) => setAdminBangumiJobsPager((current) => ({ ...current, page })),
              "暂无 Bangumi 任务。",
            )}
          </article>

        </section>

        <section className="panel-grid preview-grid" style={{ display: adminActivePage === "site-notes" ? undefined : "none" }}>
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">公告中心</p>
                <h2>发布站点公告</h2>
              </div>
              <StatusChip tone="accent">portal_notice</StatusChip>
            </div>
            {announcementActionState.error ? <p className="panel-error">{announcementActionState.error}</p> : null}
            {announcementActionState.success ? <p className="panel-empty">{announcementActionState.success}</p> : null}
            <form className="space-form" onSubmit={(event) => void handleAnnouncementSubmit(event)}>
              <label>
                <span>公告标题</span>
                <input
                  name="title"
                  value={announcementForm.title}
                  onChange={handleAnnouncementFieldChange}
                  placeholder="例如：下周共赏会时间调整"
                  required
                />
              </label>
              <label>
                <span>公告摘要</span>
                <input
                  name="description"
                  value={announcementForm.description}
                  onChange={handleAnnouncementFieldChange}
                  placeholder="一句话摘要，显示在公告列表"
                />
              </label>
              <label>
                <span>公告正文</span>
                <textarea
                  name="body"
                  rows={4}
                  value={announcementForm.body}
                  onChange={handleAnnouncementFieldChange}
                  placeholder="补充详细说明（可选）"
                />
              </label>
              <label>
                <span>标签</span>
                <input
                  name="label"
                  value={announcementForm.label}
                  onChange={handleAnnouncementFieldChange}
                  placeholder="例如：置顶 / 活动 / 维护"
                />
              </label>
              <label>
                <span>排序</span>
                <input
                  name="sort_order"
                  value={announcementForm.sort_order}
                  onChange={handleAnnouncementFieldChange}
                />
              </label>
              <label className="gallery-admin__toggle">
                <input
                  name="active"
                  type="checkbox"
                  checked={announcementForm.active}
                  onChange={handleAnnouncementFieldChange}
                />
                <span>发布后立即展示</span>
              </label>
              <button className="primary-button" type="submit" disabled={announcementActionState.pending}>
                {announcementActionState.pending ? "发布中..." : "发布公告"}
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">公告列表</p>
                <h2>已发布公告</h2>
              </div>
              <StatusChip tone="neutral">{announcementBlocks.length} 条</StatusChip>
            </div>
            <div className="stack-list">
              {announcementBlocks.map((notice) => (
                <div className="content-card" key={notice.id}>
                  <div className="content-card__header">
                    <h3>{notice.title}</h3>
                    <StatusChip tone={notice.active ? "success" : "warn"}>
                      {notice.active ? "active" : "inactive"}
                    </StatusChip>
                  </div>
                  <p>{notice.description || notice.body || "暂无公告说明。"}</p>
                  <div className="meta-row">
                    <span>{notice.label || "公告"}</span>
                    <span>sort: {notice.sort_order}</span>
                    <span>slug: {notice.slug}</span>
                  </div>
                  <div className="gallery-admin__actions">
                    <button className="ghost-button" type="button" onClick={() => handleContentBlockEditStart(notice)}>
                      在内容块编辑器中修改
                    </button>
                    <button className="ghost-button gallery-admin__danger" type="button" onClick={() => void handleContentBlockDelete(notice)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {!announcementBlocks.length ? <p className="panel-empty">当前还没有公告。</p> : null}
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
      case "/portal":
        return renderPortalPage();
      case "/stories":
        return renderStoriesPage();
      case "/forum":
        return renderForumPage();
      case "/anonymous":
        return renderAnonymousPage();
      case "/admin":
        return renderAdminPage();
      case "/space":
        return renderSpacePage();
      case "/gallery":
        return renderGalleryPage();
      default:
        return renderHomePage();
    }
  }

  const isStoryDetailView = routePath === "/stories" && Boolean(selectedArticleID) && !isStoriesEditorMode;
  const visibleNavigation = canAdmin
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.href !== "/admin");

  return (
    <>
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

      <main className={`app-shell ${isStoryDetailView ? "app-shell--story-detail" : ""}`}>
        <Header
          authHref="/space"
          authLabel={isAuthenticated ? "我的空间" : "登录"}
          currentPath={routePath}
          hidden={isHeaderHidden}
          navigation={visibleNavigation}
          notifications={headerNotifications}
          onNotificationClick={handleNotificationClick}
          onNotificationsMarkAllRead={handleNotificationsMarkAllRead}
          onNavigate={handleNavigate}
          onToggleTheme={handleToggleTheme}
          themeMode={themeMode}
          unreadNotificationCount={unreadNotificationCount}
          utilityHref={routePath === "/" ? "/forum" : "/"}
          utilityLabel={routePath === "/" ? "论坛讨论" : "返回首页"}
        />
        <div
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
                      : "page-shell--gallery"
          } ${isStoryDetailView ? "page-shell--story-detail" : ""}`}
        >
          {renderCurrentPage()}
        </div>
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
              <p className="panel-kicker">站点公告</p>
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
                className="ghost-button"
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
