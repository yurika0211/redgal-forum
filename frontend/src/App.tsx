import {
  startTransition,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import "./App.css";
import {
  createArticle,
  createReply,
  createThread,
  createWallSubmission,
  createGalleryEntry,
  deleteGalleryEntry,
  fetchArticleDetail,
  fetchArticles,
  fetchAdminGalleryEntries,
  fetchHealth,
  fetchMyProfile,
  fetchPublicProfile,
  fetchSiteContent,
  fetchThreadDetail,
  fetchThreads,
  fetchWallEntries,
  importBangumiCollections,
  type Article as ApiArticle,
  type BangumiImportJob,
  type BangumiImportPayload,
  type CreateArticlePayload,
  type CreateReplyPayload,
  type CreateThreadPayload,
  type CreateGalleryEntryPayload,
  type CreateWallSubmissionPayload,
  type ForumThread as ApiForumThread,
  type ForumThreadDetail as ApiForumThreadDetail,
  type HealthData,
  type Paginated,
  type Profile as ApiProfile,
  type SiteGalleryEntry,
  type WallEntry as ApiWallEntry,
  login,
  type Session,
  type SiteContent,
  type UpdateProfilePayload,
  type UpdateGalleryEntryPayload,
  updateGalleryEntry,
  updateMyProfile,
} from "./api";
import Header from "./components/Header";
import {
  NAV_ITEMS,
  DEFAULT_PUBLIC_PROFILE_USERNAME,
  SPACE_FRIENDS,
  SPACE_SHOWCASE_GROUPS,
  SPACE_TIME_CAPSULES,
} from "./content";

type RoutePath = (typeof NAV_ITEMS)[number]["href"];
type StatusTone = "neutral" | "success" | "warn" | "accent";

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

interface ProfileFormState {
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
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
  content: string;
  anonymous: boolean;
}

interface WallSubmissionFormState {
  title: string;
  content: string;
  imagesText: string;
}

interface FormActionState<T> {
  pending: boolean;
  error: string;
  data: T | null;
  success: string;
}

interface PagerState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface DisplayHeroObject {
  id: string;
  label: string;
  title: string;
  note: string;
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

const TITLE_BY_ROUTE: Record<RoutePath, string> = {
  "/": "首页总览 | Rubedo Forum",
  "/portal": "社团介绍 | Rubedo Forum",
  "/stories": "文章札记 | Rubedo Forum",
  "/forum": "论坛聊天室 | Rubedo Forum",
  "/space": "个人空间 | Rubedo Forum",
  "/gallery": "展示墙 | Rubedo Forum",
};

const HEADER_SUMMARY_BY_ROUTE: Record<RoutePath, string> = {
  "/": "首页导览",
  "/portal": "社团介绍",
  "/stories": "文章与随想",
  "/forum": "讨论与留言",
  "/space": "收藏与空间",
  "/gallery": "展示与归档",
};

const SESSION_STORAGE_KEY = "rubedo.frontend.session";

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

function normalizePath(pathname: string): RoutePath {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (normalized.startsWith("/stories/")) {
    return "/stories";
  }

  if (normalized.startsWith("/forum/threads/")) {
    return "/forum";
  }

  switch (normalized) {
    case "/portal":
      return "/portal";
    case "/stories":
      return "/stories";
    case "/forum":
      return "/forum";
    case "/space":
      return "/space";
    case "/gallery":
      return "/gallery";
    default:
      return "/";
  }
}

function readSelectedArticleID(
  pathname: string = typeof window === "undefined" ? "/" : window.location.pathname,
): string | null {
  const match = pathname.match(/^\/stories\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function readSelectedForumThreadID(
  pathname: string = typeof window === "undefined" ? "/" : window.location.pathname,
): string | null {
  const match = pathname.match(/^\/forum\/threads\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function readCurrentPath(): RoutePath {
  if (typeof window === "undefined") {
    return "/";
  }

  return normalizePath(window.location.pathname);
}

function excerpt(value: string, maxLength = 160): string {
  const normalized = value.trim();

  if (!normalized) {
    return "内容暂时为空。";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function getAvatarFallback(profile: Pick<ApiProfile, "nickname" | "username"> | null): string {
  if (!profile) {
    return "R";
  }

  return (profile.nickname || profile.username || "R").trim().charAt(0).toUpperCase() || "R";
}

function createProfileFormState(profile: ApiProfile | null): ProfileFormState {
  return {
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
    content: "",
    anonymous: false,
  };
}

function createWallSubmissionFormState(): WallSubmissionFormState {
  return {
    title: "",
    content: "",
    imagesText: "",
  };
}

function createEmptyActionState<T>(): FormActionState<T> {
  return {
    pending: false,
    error: "",
    data: null,
    success: "",
  };
}

function createPagerState(pageSize: number): PagerState {
  return {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
  };
}

function normalizeVisibilityLabel(value: string): string {
  switch (value) {
    case "public":
      return "公开";
    case "member":
    case "members":
      return "成员";
    case "private":
      return "私有";
    default:
      return value;
  }
}

function galleryEntryTypeLabel(value: SiteGalleryEntry["entry_type"]): string {
  switch (value) {
    case "album":
      return "相册";
    case "polaroid":
      return "拍立得";
    case "paper":
      return "旧纸";
    case "timeline":
      return "时间轴";
    case "track":
      return "留声机";
    default:
      return value;
  }
}

function formatUpdatedAt(value: string): string {
  if (!value) {
    return "尚未同步";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请求失败";
}

function parseLines(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Session>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    typeof candidate.expiresIn === "number"
  );
}

function readStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isSession(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed stored session and clear it below.
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  return null;
}

function persistSession(session: Session | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function isAuthFailure(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return message.includes("authentication") || message.includes("unauthorized") || message.includes("401");
}

function updatePagerFromResult<T>(result: Paginated<T>): PagerState {
  return {
    page: result.page,
    pageSize: result.page_size,
    total: result.total,
    totalPages: result.total_pages,
  };
}

function normalizeListResult<T>(value: unknown, currentPager: PagerState): { items: T[]; pager: PagerState } {
  if (Array.isArray(value)) {
    return {
      items: value as T[],
      pager: {
        ...currentPager,
        total: value.length,
        totalPages: value.length > 0 ? 1 : 0,
      },
    };
  }

  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    const paginated = value as Paginated<T>;
    return {
      items: paginated.items,
      pager: updatePagerFromResult(paginated),
    };
  }

  return {
    items: [],
    pager: {
      ...currentPager,
      total: 0,
      totalPages: 0,
    },
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
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [routePath, setRoutePath] = useState<RoutePath>(() => readCurrentPath());
  const [spaceShelfTab, setSpaceShelfTab] = useState<(typeof SPACE_SHOWCASE_GROUPS)[number]["id"]>("games");
  const [selectedArticleID, setSelectedArticleID] = useState<string | null>(() =>
    readSelectedArticleID(),
  );
  const [selectedForumThreadID, setSelectedForumThreadID] = useState<string | null>(() =>
    readSelectedForumThreadID(),
  );
  const [storyFeed, setStoryFeed] = useState<ApiArticle[]>([]);
  const [articleDetail, setArticleDetail] = useState<ApiArticle | null>(null);
  const [threadFeed, setThreadFeed] = useState<ApiForumThread[]>([]);
  const [threadDetail, setThreadDetail] = useState<ApiForumThreadDetail | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [authForm, setAuthForm] = useState<AuthFormState>({
    account: DEFAULT_PUBLIC_PROFILE_USERNAME,
    password: "",
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => createProfileFormState(null));
  const [profileActionState, setProfileActionState] =
    useState<FormActionState<ApiProfile>>(createEmptyActionState<ApiProfile>);
  const [bangumiForm, setBangumiForm] = useState<BangumiImportPayload & { subjectIdsText: string }>({
    subjectIdsText: "",
    subject_ids: [],
    status: "wish",
    visibility: "public",
  });
  const [bangumiActionState, setBangumiActionState] =
    useState<FormActionState<BangumiImportJob>>(createEmptyActionState<BangumiImportJob>);
  const [adminGalleryEntries, setAdminGalleryEntries] = useState<SiteGalleryEntry[]>([]);
  const [galleryForm, setGalleryForm] = useState<GalleryFormState>(() => createGalleryFormState());
  const [galleryActionState, setGalleryActionState] =
    useState<FormActionState<SiteGalleryEntry>>(createEmptyActionState<SiteGalleryEntry>);
  const [editingGalleryEntryID, setEditingGalleryEntryID] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState<ArticleFormState>(() => createArticleFormState());
  const [articleActionState, setArticleActionState] =
    useState<FormActionState<ApiArticle>>(createEmptyActionState<ApiArticle>);
  const [threadForm, setThreadForm] = useState<ThreadFormState>(() => createThreadFormState());
  const [threadActionState, setThreadActionState] =
    useState<FormActionState<ApiForumThread>>(createEmptyActionState<ApiForumThread>);
  const [replyForm, setReplyForm] = useState<ReplyFormState>(() => createReplyFormState());
  const [replyActionState, setReplyActionState] =
    useState<FormActionState<{ thread_id: string }>>(createEmptyActionState<{ thread_id: string }>);
  const [wallForm, setWallForm] = useState<WallSubmissionFormState>(() => createWallSubmissionFormState());
  const [wallActionState, setWallActionState] =
    useState<FormActionState<ApiWallEntry>>(createEmptyActionState<ApiWallEntry>);
  const [wallEntries, setWallEntries] = useState<ApiWallEntry[]>([]);
  const [loginState, setLoginState] = useState<LoginState>({
    pending: false,
    error: "",
  });
  const [articlePager, setArticlePager] = useState<PagerState>(() => createPagerState(6));
  const [threadPager, setThreadPager] = useState<PagerState>(() => createPagerState(6));
  const [wallPager, setWallPager] = useState<PagerState>(() => createPagerState(6));
  const [adminGalleryPager, setAdminGalleryPager] = useState<PagerState>(() => createPagerState(8));
  const [healthError, setHealthError] = useState("");
  const [articlesError, setArticlesError] = useState("");
  const [articleDetailError, setArticleDetailError] = useState("");
  const [threadsError, setThreadsError] = useState("");
  const [threadDetailError, setThreadDetailError] = useState("");
  const [wallError, setWallError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  const heroObjects: DisplayHeroObject[] = siteContent?.hero_objects.length
    ? siteContent.hero_objects.map((item) => ({
        id: item.slug,
        label: item.label || "",
        title: item.title,
        note: item.body || item.description || "",
      }))
    : [];
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
  const activeSpaceShelf =
    SPACE_SHOWCASE_GROUPS.find((group) => group.id === spaceShelfTab) ?? SPACE_SHOWCASE_GROUPS[0];
  const boardOptions = Array.from(
    new Set(["剧情讨论", "美术交流", "站内想法", ...threadFeed.map((thread) => thread.board)]),
  );
  const boardCount = new Set(threadFeed.map((thread) => thread.board)).size;
  const isAuthenticated = session !== null;
  const displayProfile = profile;
  const canManageGallery = Boolean(
    session && profile?.roles?.some((role) => role === "admin" || role === "super_admin"),
  );
  const hasVerifiedSpaceAccess = Boolean(session && profile);
  const spaceAccessBlocked =
    Boolean(session) && !profile && profileError.toLowerCase().includes("verified user required");
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handlePopstate(): void {
      setRoutePath(readCurrentPath());
      setSelectedArticleID(readSelectedArticleID());
      setSelectedForumThreadID(readSelectedForumThreadID());
    }

    window.addEventListener("popstate", handlePopstate);
    return () => {
      window.removeEventListener("popstate", handlePopstate);
    };
  }, []);

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

    if (routePath === "/stories" && selectedArticleID && activeArticle) {
      document.title = `${activeArticle.title} | Rubedo Forum`;
      return;
    }

    if (routePath === "/forum" && selectedForumThreadID && activeForumThread) {
      document.title = `${activeForumThread.title} | Rubedo Forum`;
      return;
    }

    document.title = TITLE_BY_ROUTE[routePath];
  }, [activeArticle, activeForumThread, routePath, selectedArticleID, selectedForumThreadID]);

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
    if (!selectedForumThreadID) {
      return;
    }

    setReplyForm((current) => ({
      ...current,
      threadID: selectedForumThreadID,
    }));
  }, [selectedForumThreadID]);

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
      const profileRequest = token
        ? fetchMyProfile(token)
        : fetchPublicProfile(DEFAULT_PUBLIC_PROFILE_USERNAME);
      const articleDetailRequest =
        routePath === "/stories" && selectedArticleID
          ? fetchArticleDetail(selectedArticleID, token || undefined)
          : Promise.resolve<ApiArticle | null>(null);
      const threadDetailRequest =
        routePath === "/forum" && selectedForumThreadID
          ? fetchThreadDetail(selectedForumThreadID, token || undefined)
          : Promise.resolve<ApiForumThreadDetail | null>(null);

      const [
        healthResult,
        siteResult,
        articleResult,
        articleDetailResult,
        threadResult,
        threadDetailResult,
        wallResult,
        profileResult,
      ] =
        await Promise.allSettled([
          fetchHealth(token || undefined),
          fetchSiteContent(),
          fetchArticles(token || undefined, {
            page: articlePager.page,
            pageSize: articlePager.pageSize,
          }),
          articleDetailRequest,
          fetchThreads(token || undefined, {
            page: threadPager.page,
            pageSize: threadPager.pageSize,
          }),
          threadDetailRequest,
          fetchWallEntries({
            page: wallPager.page,
            pageSize: wallPager.pageSize,
          }),
          profileRequest,
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
      const nextWallError = wallResult.status === "rejected" ? toErrorMessage(wallResult.reason) : "";
      const nextProfileError =
        profileResult.status === "rejected" ? toErrorMessage(profileResult.reason) : "";
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

        if (shouldDropSession) {
          setSession(null);
        }

        setHealthError(nextHealthError);
        setArticlesError(nextArticlesError);
        setArticleDetailError(nextArticleDetailError);
        setThreadsError(nextThreadsError);
        setThreadDetailError(nextThreadDetailError);
        setWallError(nextWallError);
        setProfileError(
          shouldDropSession ? "当前会话已失效，已切回游客预览。" : nextProfileError,
        );
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
    refreshNonce,
    routePath,
    selectedArticleID,
    selectedForumThreadID,
    session,
    threadPager.page,
    threadPager.pageSize,
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

  function handleRefresh(): void {
    setRefreshNonce((current) => current + 1);
  }

  function handleNavigate(nextHref: string): void {
    const resolvedURL =
      typeof window !== "undefined"
        ? new URL(nextHref, window.location.origin)
        : new URL(`http://localhost${nextHref}`);
    const nextPath = normalizePath(resolvedURL.pathname);
    const nextArticleID = readSelectedArticleID(resolvedURL.pathname);
    const nextThreadID =
      nextPath === "/forum" ? readSelectedForumThreadID(resolvedURL.pathname) : null;

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
      setSelectedForumThreadID(nextThreadID);
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

    setBangumiForm((current) => ({
      ...current,
      [name]: value,
    }));
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

  function handleReplyFieldChange(
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>,
  ): void {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" && event.target instanceof HTMLInputElement ? event.target.checked : value;

    setReplyForm((current) => ({
      ...current,
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

    setLoginState({
      pending: true,
      error: "",
    });

    try {
      const nextSession = await login(authForm);
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
    } catch (error) {
      setLoginState({
        pending: false,
        error: toErrorMessage(error),
      });
    }
  }

  function handleLogout(): void {
    persistSession(null);
    setSession(null);
    setProfile(null);
    setProfileForm(createProfileFormState(null));
    setProfileActionState(createEmptyActionState<ApiProfile>());
    setBangumiActionState(createEmptyActionState<BangumiImportJob>());
    setAdminGalleryEntries([]);
    setGalleryForm(createGalleryFormState());
    setGalleryActionState(createEmptyActionState<SiteGalleryEntry>());
    setEditingGalleryEntryID(null);
    setLoginState({
      pending: false,
      error: "",
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
      const nextProfile = await updateMyProfile(session.accessToken, profileForm as UpdateProfilePayload);
      setProfile(nextProfile);
      setProfileActionState({
        pending: false,
        error: "",
        data: nextProfile,
        success: "个人资料已同步到后端。",
      });
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

    const payload: BangumiImportPayload = {
      subject_ids: subjectIDs,
      status: bangumiForm.status,
      visibility: bangumiForm.visibility || undefined,
    };

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
        success: "导入任务已提交到后端队列。",
      });
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
        error: "请先登录后再发布文章。",
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
      const article = await createArticle(
        {
          title: articleForm.title.trim(),
          summary: articleForm.summary.trim(),
          content: articleForm.content.trim(),
          visibility: articleForm.visibility,
          tags: parseTags(articleForm.tagsText),
        },
        session.accessToken,
      );

      setArticleForm(createArticleFormState());
      setArticleActionState({
        pending: false,
        error: "",
        data: article,
        success: "文章已发布。",
      });
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
          anonymous: threadForm.anonymous,
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
      await createReply(
        replyForm.threadID,
        {
          content: replyForm.content.trim(),
          anonymous: replyForm.anonymous,
        },
        session.accessToken,
      );

      setReplyForm((current) => ({
        ...current,
        content: "",
        anonymous: false,
      }));
      setReplyActionState({
        pending: false,
        error: "",
        data: { thread_id: replyForm.threadID },
        success: "回复已提交。",
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
          第 {pager.page} / {Math.max(pager.totalPages, 1)} 页，共 {pager.total} 条
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

  function renderAuthPanel(): ReactNode {
    if (isAuthenticated && session) {
      return (
        <div className="session-box">
          <p className="panel-empty">当前已连上后端会话，个人空间将直接读取 `/users/me`。</p>
          <span className="token-preview">{session.accessToken}</span>
          {profileError ? <p className="panel-error">{profileError}</p> : null}
          <button className="ghost-button" type="button" onClick={handleLogout}>
            退出当前会话
          </button>
        </div>
      );
    }

    return (
      <form className="auth-form" onSubmit={(event) => void handleLoginSubmit(event)}>
        <p className="panel-empty">
          登录会直接走后端 `/auth/login`。当前脚手架登录只在开发环境且
          `AUTH_ALLOW_SCAFFOLD_LOGIN=true` 时可用。
        </p>
        <label>
          <span>账号</span>
          <input
            autoComplete="username"
            name="account"
            onChange={handleAuthFieldChange}
            placeholder="例如：rubedo_room"
            value={authForm.account}
          />
        </label>
        <label>
          <span>密码</span>
          <input
            autoComplete="current-password"
            name="password"
            onChange={handleAuthFieldChange}
            placeholder="输入脚手架登录密码"
            type="password"
            value={authForm.password}
          />
        </label>
        {loginState.error ? <p className="panel-error">{loginState.error}</p> : null}
        <button className="primary-button" type="submit" disabled={loginState.pending}>
          {loginState.pending ? "登录中..." : "登录并同步空间"}
        </button>
      </form>
    );
  }

  function renderHomePage(): ReactNode {
    return (
      <>
        <section className="hero-panel landing-hero home-hero">
          <div className="landing-hero__copy home-hero__copy">
            <p className="eyebrow">百川乃大视觉小说研 / Since 2017</p>
            <h1>让对视觉小说的热爱，在校园里继续被传下去。</h1>
            <p className="hero-description home-hero__lead">
              从最早那个专门聊 Galgame 的分群，到后来真正被大家叫出名字的同好会，
              百川乃大一直在校园里慢慢长大。
            </p>
            <p className="home-hero__intro">
              这里放的不只是导航，还有社团这些年留下来的讨论、照片、札记和那句总会反复出现的话：
              “我们来做一部视觉小说吧。”
            </p>
            <div className="hero-action-row">
              <button className="primary-button" type="button" onClick={() => handleNavigate("/forum")}>
                进入论坛讨论
              </button>
              <button className="ghost-button hero-action-button" type="button" onClick={() => handleNavigate("/gallery")}>
                查看照片墙
              </button>
            </div>

            <div className="home-poem-card">
              <span className="home-poem-card__kicker">社团题记</span>
              {HOME_POEM_LINES.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <div className="hero-metrics landing-hero__metrics home-hero__metrics">
              <div className="metric-card">
                <span>社团起源</span>
                <strong>2017</strong>
                <StatusChip tone="success">从 Galgame 分群开始</StatusChip>
              </div>
              <div className="metric-card">
                <span>名称确立</span>
                <strong>2024</strong>
                <StatusChip tone="accent">百川乃大视觉小说研正式命名</StatusChip>
              </div>
              <div className="metric-card">
                <span>成员规模</span>
                <strong>300+</strong>
                <StatusChip tone="neutral">热爱仍在持续扩散</StatusChip>
              </div>
            </div>
          </div>

          <div className="landing-hero__visual home-hero__visual">
            <div className="landing-hero__glow landing-hero__glow--one" aria-hidden="true" />
            <div className="landing-hero__glow landing-hero__glow--two" aria-hidden="true" />
            <div className="landing-hero__glow landing-hero__glow--three" aria-hidden="true" />

            <div className="art-stage home-hero__art-stage">
              <div className="art-stage__standee home-hero__standee">
                <div className="art-stage__standee-frame" aria-hidden="true" />
                <img
                  alt="百川乃大视觉小说研首页主视觉"
                  className="art-stage__standee-image"
                  src="/bg1.png"
                />
              </div>

              <div className="art-stage__postcard home-hero__postcard">
                <img alt="百川乃大视觉小说研辅助视觉" className="art-stage__postcard-image" src="/bg2.png" />
                <div className="art-stage__postcard-copy">
                  <span>Campus Memory</span>
                  <strong>从意外起源，到名字被正式说出口</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-split-grid home-history-grid">
          <article className="panel home-history-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">社团沿革</p>
                <h2>从分群、沉寂、活跃，到真正成为同好会</h2>
              </div>
            </div>
            <div className="home-history-copy">
              {HOME_HISTORY_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <article className="panel home-history-side">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">当前内容</p>
                <h2>社团在这里做什么</h2>
              </div>
            </div>
            <div className="stack-list">
              <div className="content-card">
                <div className="content-card__header">
                  <h3>文章札记</h3>
                  <StatusChip tone="success">{articlePager.total} 篇</StatusChip>
                </div>
                <p>把对作品的感想、路线阅读、对白笔记和短札都沉淀下来。</p>
              </div>
              <div className="content-card">
                <div className="content-card__header">
                  <h3>论坛讨论</h3>
                  <StatusChip tone="accent">{threadPager.total} 条</StatusChip>
                </div>
                <p>适合长帖、剧情拆解、氛围交流，也保留更轻的即时讨论入口。</p>
              </div>
              <div className="content-card">
                <div className="content-card__header">
                  <h3>个人空间</h3>
                  <StatusChip tone="neutral">{displayProfile?.nickname || "Space"}</StatusChip>
                </div>
                <p>把收藏、个性、札记与长期归档慢慢放进自己的空间里。</p>
              </div>
            </div>
          </article>
        </section>

        <section className="home-link-grid">
          {[
            {
              href: "/stories",
              kicker: "文章札记",
              title: "公开文章与感悟区",
              description: "读后感、路线记录、角色笔记，还有一些没来得及在群里说完的话。",
              meta: `${articlePager.total} 篇内容`,
            },
            {
              href: "/forum",
              kicker: "论坛讨论",
              title: "讨论、共赏与站内交流",
              description: "剧情、人物、配音、美术、企划脑洞，都可以在这里慢慢摊开讲。",
              meta: `${threadPager.total} 条主题`,
            },
            {
              href: "/space",
              kicker: "个人空间",
              title: "收藏、札记与长期归档",
              description: "把喜欢的作品、截图、碎句和时间胶囊放回自己的空间里。",
              meta: `${collectionTotal} 项个人收藏`,
            },
            {
              href: "/gallery",
              kicker: "展示墙",
              title: "照片墙与活动记忆",
              description: "活动照片、线下展板、群像与那些确实发生过的时刻，都留在这里。",
              meta: `${wallPager.total} 条公开展墙`,
            },
          ].map((item) => (
            <button
              className="portal-card home-link-card"
              key={item.href}
              type="button"
              onClick={() => handleNavigate(item.href)}
            >
              <span className="portal-card__kicker">{item.kicker}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span className="home-link-card__meta">{item.meta}</span>
            </button>
          ))}
        </section>

        <section className="panel-grid preview-grid home-rules-grid">
          {HOME_RULE_CARDS.map((card) => (
            <article className="panel home-rule-card" key={card.id}>
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">站内说明</p>
                  <h2>{card.title}</h2>
                </div>
              </div>
              <p className="panel-empty">{card.body}</p>
            </article>
          ))}
        </section>

        <section className="showcase-grid home-photo-grid">
          {HOME_PHOTO_WALL.map((photo) => (
            <article className="panel home-photo-card" key={photo.id}>
              <img alt={photo.title} className="home-photo-card__image" src={photo.src} />
              <div className="home-photo-card__copy">
                <p className="panel-kicker">首页照片墙</p>
                <h2>{photo.title}</h2>
                <p>{photo.note}</p>
              </div>
            </article>
          ))}

          <article className="panel showcase-panel--wide home-photo-summary">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">照片墙下沉</p>
                <h2>把照片墙直接放到首页底部</h2>
              </div>
              <StatusChip tone="neutral">{wallPager.total} 条公开内容</StatusChip>
            </div>
            <p className="panel-empty">
              照片墙不应该藏在二级页面里。它应该成为首页的结尾，让第一次进入的人直接看见这个社团真实存在过、
              活动过、聚在一起过的证据。
            </p>
            <div className="stack-list">
              {wallEntries.slice(0, 3).map((entry) => (
                <div className="content-card" key={entry.id}>
                  <div className="content-card__header">
                    <h3>{entry.title}</h3>
                    <StatusChip tone="success">公开展示</StatusChip>
                  </div>
                  <p>{excerpt(entry.content, 140)}</p>
                  <div className="meta-row">
                    <span>{entry.contributor}</span>
                    <span>{entry.images.length} 张图片</span>
                  </div>
                </div>
              ))}
              {!wallEntries.length ? (
                <p className="panel-empty">当前还没有公开照片墙内容，后续会从展示墙页持续回流到首页。</p>
              ) : null}
            </div>
            <div className="hero-action-row">
              <button className="primary-button" type="button" onClick={() => handleNavigate("/gallery")}>
                进入完整照片墙
              </button>
              <button className="ghost-button" type="button" onClick={() => handleNavigate("/forum")}>
                去论坛继续讨论
              </button>
            </div>
          </article>
        </section>
      </>
    );
  }

  function renderPortalPage(): ReactNode {
    return (
      <>
        <section className="panel portal-manifesto">
          <div className="portal-manifesto__head">
            <p className="eyebrow">社团介绍 / manifesto</p>
            <h1>这里聚着一群愿意认真聊视觉小说的人。</h1>
          </div>
          <div className="portal-manifesto__body">
            <div className="portal-manifesto__copy">
              <p>
                百川乃大不是只用来“看作品”的地方。我们会拆剧情、聊角色、做共赏、
                也会把截图、札记、活动照片和那些一闪而过的灵感慢慢收起来。
              </p>
              <p>
                有人偏爱写长评，有人更在意场景和音乐，有人只是想在校园里找到可以认真聊 Galgame 的同类。
                这些差异不会被抹平，反而正是社团最重要的部分。
              </p>
              <p>
                如果你也会在深夜里突然冒出一句“我们来做一部视觉小说吧”，
                那你大概就能明白这个地方为什么会存在。
              </p>
            </div>
            <aside className="portal-manifesto__aside">
              {societyHighlights.map((highlight) => (
                <div className="portal-manifesto__note" key={highlight.id}>
                  <span>{highlight.kicker}</span>
                  <strong>{highlight.title}</strong>
                  <p>{highlight.body}</p>
                </div>
              ))}
            </aside>
          </div>
        </section>

        <section className="page-split-grid portal-brief-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">平时在做什么</p>
                <h2>社团的几条主线</h2>
              </div>
            </div>
            <div className="portal-brief-list">
              {societyPillars.map((pillar) => (
                <div className="portal-brief-item" key={pillar.id}>
                  <strong>{pillar.title}</strong>
                  <p>{pillar.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">先从哪里看起</p>
                <h2>站内入口</h2>
              </div>
            </div>
            <div className="portal-route-list">
              {portalPages.map((page) => (
                <button
                  className="portal-route-item"
                  key={page.href}
                  type="button"
                  onClick={() => handleNavigate(page.href)}
                >
                  <span>{page.kicker}</span>
                  <strong>{page.title}</strong>
                  <p>{page.description}</p>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="page-split-grid portal-brief-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">活动与聚会</p>
                <h2>最近会遇到的事情</h2>
              </div>
            </div>
            <div className="portal-brief-list">
              {societyActivities.map((activity) => (
                <div className="portal-brief-item" key={activity.id}>
                  <span>{activity.label}</span>
                  <strong>{activity.title}</strong>
                  <p>{activity.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">如果你准备加入</p>
                <h2>不用一下子变得很熟</h2>
              </div>
            </div>
            <div className="portal-step-list">
              {societyJoinSteps.map((step) => (
                <div className="portal-step-item" key={step.id}>
                  <span>{step.step}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">一句实话</p>
              <h2>我们并不完美，但一直有人还想继续做下去</h2>
            </div>
          </div>
          <p className="panel-empty">
            百川乃大未必已经完成过属于自己的视觉小说，站点也还在一点点长出来。
            但社团真正重要的并不是“已经做成了什么”，而是每一年总会有人重新把热情接过来。
          </p>
        </section>
      </>
    );
  }

  function renderStoriesPage(): ReactNode {
    if (selectedArticleID) {
      return (
        <>
          <SectionHero
            kicker="文章详情"
            title={activeArticle?.title || "文章详情"}
            description={
              activeArticle
                ? "这里会展示单篇文章的完整正文、标签和作者信息，适合从文章流进入更专注的阅读状态。"
                : "正在读取文章详情，如果后端已接入该接口，这里会展示完整正文。"
            }
            metrics={[
              {
                label: "可见范围",
                value: activeArticle ? normalizeVisibilityLabel(activeArticle.visibility) : "读取中",
                detail: activeArticle ? `作者：${activeArticle.author}` : "等待后端返回文章数据",
                tone: activeArticle ? "success" : "neutral",
              },
              {
                label: "标签数量",
                value: String(activeArticle?.tags.length ?? 0),
                detail: activeArticle ? "文章标签已接入" : "标签数据读取中",
                tone: activeArticle ? "accent" : "neutral",
              },
              {
                label: "快速返回",
                value: "列表",
                detail: "可从详情页返回文章流",
                tone: "neutral",
              },
            ]}
          >
            <div className="hero-action-row">
              <button className="ghost-button hero-action-button" type="button" onClick={() => handleNavigate("/stories")}>
                返回文章列表
              </button>
            </div>
          </SectionHero>

          <section className="page-split-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">文章正文</p>
                  <h2>{activeArticle?.title || "文章内容"}</h2>
                </div>
                {activeArticle ? (
                  <StatusChip tone={activeArticle.visibility === "public" ? "success" : "accent"}>
                    {normalizeVisibilityLabel(activeArticle.visibility)}
                  </StatusChip>
                ) : null}
              </div>
              {articleDetailError ? (
                <p className="panel-error">{articleDetailError}</p>
              ) : activeArticle ? (
                <div className="stack-list">
                  <div className="content-card content-card--story">
                    <div className="content-card__header">
                      <h3>{activeArticle.title}</h3>
                      <StatusChip tone="neutral">{activeArticle.author}</StatusChip>
                    </div>
                    <p>{activeArticle.summary}</p>
                    <p>{activeArticle.content}</p>
                    <div className="tag-row">
                      {activeArticle.tags.map((tag) => (
                        <span className="module-tag" key={`${activeArticle.id}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="panel-empty">文章详情加载中。</p>
              )}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">继续阅读</p>
                  <h2>更多文章</h2>
                </div>
              </div>
              <div className="stack-list">
                {storyFeed
                  .filter((article) => article.id !== selectedArticleID)
                  .slice(0, 4)
                  .map((article) => (
                    <button
                      className="content-card thread-card-button"
                      key={article.id}
                      type="button"
                      onClick={() => handleNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                    >
                      <div className="content-card__header">
                        <h3>{article.title}</h3>
                        <StatusChip tone="accent">
                          {normalizeVisibilityLabel(article.visibility)}
                        </StatusChip>
                      </div>
                      <p>{excerpt(article.summary || article.content, 120)}</p>
                    </button>
                  ))}
              </div>
            </article>
          </section>
        </>
      );
    }

    return (
      <>
        <SectionHero
          kicker="文章札记"
          title="公开文章与感悟区"
          description="这里放长文、短札、读后感和那些没来得及在群里说完的话。"
          metrics={[
            {
              label: "可见文章",
              value: String(storyFeed.length),
              detail: articlesError || "公开浏览与主题标签并列呈现",
              tone: articlesError ? "warn" : "success",
            },
            {
              label: "当前详情",
              value: activeArticle ? "已展开" : "未选择",
              detail: activeArticle ? "正在阅读真实文章正文" : "从左侧文章列表选择一篇查看",
              tone: activeArticle ? "accent" : "neutral",
            },
            {
              label: "同步时间",
              value: lastUpdatedLabel,
              detail: backendReachable ? "后端数据已接入" : "后端当前不可达",
              tone: backendReachable ? "neutral" : "warn",
            },
          ]}
        />

        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">文章流</p>
                <h2>公开文章</h2>
              </div>
              <StatusChip tone="accent">{articlePager.total} 篇</StatusChip>
            </div>
            {articlesError ? <p className="panel-error">{articlesError}</p> : null}
            <div className="stack-list">
              {storyFeed.map((article) => (
                <button
                  className="content-card content-card--story thread-card-button"
                  key={article.id}
                  type="button"
                  onClick={() => handleNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                >
                  <div className="content-card__header">
                    <h3>{article.title}</h3>
                    <StatusChip tone={article.visibility === "public" ? "success" : "accent"}>
                      {normalizeVisibilityLabel(article.visibility)}
                    </StatusChip>
                  </div>
                  <p>{excerpt(article.summary || article.content, 220)}</p>
                  <div className="meta-row">
                    <span>{article.author}</span>
                    <span>{article.tags.join(" · ") || "暂无标签"}</span>
                  </div>
                  <div className="tag-row">
                    {article.tags.map((tag) => (
                      <span className="module-tag" key={`${article.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {!storyFeed.length ? (
                <p className="panel-empty">
                  {isLoadingData ? "文章数据加载中。" : "当前没有可展示的文章数据。"}
                </p>
              ) : null}
            </div>
            {renderPager(articlePager, (page) => setArticlePager((current) => ({ ...current, page })), "暂无文章。")}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">文章详情</p>
                <h2>{activeArticle?.title || "选择文章查看正文"}</h2>
              </div>
              <StatusChip tone={activeArticle ? "accent" : "neutral"}>
                {activeArticle ? "详情模式" : "等待选择"}
              </StatusChip>
            </div>
            {articleDetailError ? <p className="panel-error">{articleDetailError}</p> : null}
            {activeArticle ? (
              <div className="content-card content-card--story">
                <div className="content-card__header">
                  <h3>{activeArticle.title}</h3>
                  <StatusChip tone={activeArticle.visibility === "public" ? "success" : "accent"}>
                    {normalizeVisibilityLabel(activeArticle.visibility)}
                  </StatusChip>
                </div>
                <p>{activeArticle.summary}</p>
                <p>{activeArticle.content}</p>
                <div className="meta-row">
                  <span>{activeArticle.author}</span>
                  <span>{activeArticle.tags.join(" · ") || "暂无标签"}</span>
                </div>
                <div className="tag-row">
                  {activeArticle.tags.map((tag) => (
                    <span className="module-tag" key={`${activeArticle.id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="panel-empty">从左侧列表中点击一篇文章，即可在这里查看完整正文。</p>
            )}
            {!session ? (
              <p className="panel-empty">登录并通过认证后，这里可以直接发布新的文章札记。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="panel-empty">当前账号还没有写作权限，需要通过认证后才能发文。</p>
            ) : (
              <form className="space-form" onSubmit={(event) => void handleArticleSubmit(event)}>
                <label>
                  <span>标题</span>
                  <input
                    name="title"
                    type="text"
                    value={articleForm.title}
                    onChange={handleArticleFieldChange}
                    placeholder="输入文章标题"
                    required
                  />
                </label>
                <label>
                  <span>摘要</span>
                  <input
                    name="summary"
                    type="text"
                    value={articleForm.summary}
                    onChange={handleArticleFieldChange}
                    placeholder="一句话概括这篇札记"
                  />
                </label>
                <label>
                  <span>正文</span>
                  <textarea
                    name="content"
                    rows={6}
                    value={articleForm.content}
                    onChange={handleArticleFieldChange}
                    placeholder="写下正文内容"
                    required
                  />
                </label>
                <label>
                  <span>标签</span>
                  <input
                    name="tagsText"
                    type="text"
                    value={articleForm.tagsText}
                    onChange={handleArticleFieldChange}
                    placeholder="用逗号分隔，例如：站台，慢热，短札"
                  />
                </label>
                <label>
                  <span>可见范围</span>
                  <select name="visibility" value={articleForm.visibility} onChange={handleArticleFieldChange}>
                    <option value="public">公开</option>
                    <option value="member">成员</option>
                    <option value="private">私有</option>
                  </select>
                </label>
                {articleActionState.error ? <p className="panel-error">{articleActionState.error}</p> : null}
                {articleActionState.success ? <p className="panel-empty">{articleActionState.success}</p> : null}
                <button className="primary-button" type="submit" disabled={articleActionState.pending}>
                  {articleActionState.pending ? "发布中..." : "发布文章"}
                </button>
              </form>
            )}
          </article>
        </section>
      </>
    );
  }

  function renderForumPage(): ReactNode {
    if (selectedForumThreadID) {
      return (
        <>
          <SectionHero
            kicker="主题详情"
            title={activeForumThread?.title || "论坛主题详情"}
            description={
              activeForumThread
                ? "这里会展示单个讨论主题的正文、标签和回复，方便从列表页切换到更聚焦的阅读与回复模式。"
                : "正在读取主题详情，如果后端已接入该接口，这里会展示完整帖子与回复。"
            }
            metrics={[
              {
                label: "所在分区",
                value: activeForumThread?.board || "读取中",
                detail: activeForumThread ? `作者：${activeForumThread.author}` : "等待后端返回主题数据",
                tone: activeForumThread ? "accent" : "neutral",
              },
              {
                label: "回复数量",
                value: String(threadDetail?.replies.length ?? 0),
                detail: threadDetail ? "单主题回复已接入" : "回复列表读取中",
                tone: threadDetail ? "success" : "neutral",
              },
              {
                label: "快速返回",
                value: "列表",
                detail: "可从详情页直接回到论坛总览",
                tone: "neutral",
              },
            ]}
          >
            <div className="hero-action-row">
              <button className="ghost-button hero-action-button" type="button" onClick={() => handleNavigate("/forum")}>
                返回论坛列表
              </button>
            </div>
          </SectionHero>

          <section className="page-split-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">主题正文</p>
                  <h2>{activeForumThread?.title || "讨论主题"}</h2>
                </div>
                {activeForumThread ? (
                  <StatusChip tone={activeForumThread.anonymous ? "warn" : "neutral"}>
                    /{activeForumThread.board}
                  </StatusChip>
                ) : null}
              </div>
              {threadDetailError ? (
                <p className="panel-error">{threadDetailError}</p>
              ) : activeForumThread ? (
                <div className="stack-list">
                  <div className="content-card">
                    <div className="content-card__header">
                      <h3>{activeForumThread.title}</h3>
                      <StatusChip tone={activeForumThread.anonymous ? "warn" : "neutral"}>
                        {activeForumThread.author}
                      </StatusChip>
                    </div>
                    <p>{activeForumThread.content}</p>
                    <div className="meta-row">
                      <span>{activeForumThread.author}</span>
                      <span>{activeForumThread.reply_count} 条回复</span>
                    </div>
                    <div className="tag-row">
                      {activeForumThread.tags.map((tag) => (
                        <span className="module-tag" key={`${activeForumThread.id}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="thread-reply-list">
                    {(threadDetail?.replies || []).map((reply, index) => (
                      <div className="content-card thread-reply-card" key={reply.id}>
                        <div className="content-card__header">
                          <h3>#{index + 1}</h3>
                          <StatusChip tone={reply.anonymous ? "warn" : "neutral"}>
                            {reply.author}
                          </StatusChip>
                        </div>
                        <p>{reply.content}</p>
                      </div>
                    ))}
                    {threadDetail && threadDetail.replies.length === 0 ? (
                      <p className="panel-empty">这个主题暂时还没有回复。</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="panel-empty">主题详情加载中。</p>
              )}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">参与讨论</p>
                  <h2>回复这个主题</h2>
                </div>
                <StatusChip tone={hasVerifiedSpaceAccess ? "accent" : "warn"}>
                  {hasVerifiedSpaceAccess ? "POST /forum/threads/:id/replies" : "需要已认证账号"}
                </StatusChip>
              </div>
              {!session ? (
                <p className="panel-empty">登录并通过认证后，可以直接在详情页回复当前主题。</p>
              ) : !hasVerifiedSpaceAccess ? (
                <p className="panel-empty">当前账号还没有回复权限，需要通过认证后才能参与讨论。</p>
              ) : (
                <form className="space-form" onSubmit={(event) => void handleReplySubmit(event)}>
                  <label>
                    <span>当前主题</span>
                    <input type="text" value={activeForumThread?.title || ""} disabled readOnly />
                  </label>
                  <label>
                    <span>回复内容</span>
                    <textarea
                      name="content"
                      rows={5}
                      value={replyForm.content}
                      onChange={handleReplyFieldChange}
                      placeholder="写下你的回复"
                      required
                    />
                  </label>
                  <label className="gallery-admin__toggle">
                    <input
                      checked={replyForm.anonymous}
                      name="anonymous"
                      type="checkbox"
                      onChange={handleReplyFieldChange}
                    />
                    <span>匿名回复</span>
                  </label>
                  {replyActionState.error ? <p className="panel-error">{replyActionState.error}</p> : null}
                  {replyActionState.success ? <p className="panel-empty">{replyActionState.success}</p> : null}
                  <button className="primary-button" type="submit" disabled={replyActionState.pending}>
                    {replyActionState.pending ? "提交中..." : "提交回复"}
                  </button>
                </form>
              )}
            </article>
          </section>
        </>
      );
    }

    return (
      <>
        <SectionHero
          kicker="论坛交流"
          title="论坛讨论与匿名聊天室"
          description="剧情、人物、场景、美术、配音、制作想法，都可以在这里摊开讲。"
          metrics={[
            {
              label: "讨论主题",
              value: String(threadFeed.length),
              detail: threadsError || (boardCount ? `${boardCount} 个分区在持续活跃` : "讨论区正在整理中"),
              tone: threadsError ? "warn" : threadFeed.length ? "accent" : "warn",
            },
            {
              label: "回复视图",
              value: selectedForumThreadID ? "已展开" : "待选择",
              detail: selectedForumThreadID ? "当前展示真实回复列表" : "这里不再预填本地假消息",
              tone: selectedForumThreadID ? "success" : "neutral",
            },
            {
              label: "同步时间",
              value: lastUpdatedLabel,
              detail: backendReachable ? "讨论区已接入后端" : "后端当前不可达",
              tone: backendReachable ? "success" : "warn",
            },
          ]}
        />

        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">讨论区</p>
                <h2>讨论串</h2>
              </div>
              <StatusChip tone="accent">{threadPager.total} 条主题</StatusChip>
            </div>
            {threadsError ? <p className="panel-error">{threadsError}</p> : null}
            <div className="stack-list">
              {threadFeed.map((thread) => (
                <button
                  className="content-card thread-card-button"
                  key={thread.id}
                  type="button"
                  onClick={() => handleNavigate(`/forum?thread=${encodeURIComponent(thread.id)}`)}
                >
                  <div className="content-card__header">
                    <h3>{thread.title}</h3>
                    <StatusChip tone={thread.anonymous ? "warn" : "neutral"}>
                      /{thread.board}
                    </StatusChip>
                  </div>
                  <p>{excerpt(thread.content, 180)}</p>
                  <div className="meta-row">
                    <span>{thread.author}</span>
                    <span>{thread.reply_count} 条回复</span>
                  </div>
                  <div className="tag-row">
                    {thread.tags.map((tag) => (
                      <span className="module-tag" key={`${thread.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              {!threadFeed.length ? (
                <p className="panel-empty">
                  {isLoadingData ? "讨论数据加载中。" : "当前没有可展示的讨论主题。"}
                </p>
              ) : null}
            </div>
            {renderPager(threadPager, (page) => setThreadPager((current) => ({ ...current, page })), "暂无讨论主题。")}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">主题操作</p>
                <h2>发帖与回复</h2>
              </div>
              <StatusChip tone="neutral">轻量交流</StatusChip>
            </div>
            {!session ? (
              <p className="panel-empty">登录并通过认证后，可以在这里发布主题和回复帖子。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="panel-empty">当前账号还没有论坛写权限，需要通过认证后才能发帖和回复。</p>
            ) : (
              <div className="stack-list">
                <form className="space-form" onSubmit={(event) => void handleThreadSubmit(event)}>
                  <label>
                    <span>主题标题</span>
                    <input
                      name="title"
                      type="text"
                      value={threadForm.title}
                      onChange={handleThreadFieldChange}
                      placeholder="输入讨论主题"
                      required
                    />
                  </label>
                  <label>
                    <span>所属分区</span>
                    <input
                      name="board"
                      type="text"
                      value={threadForm.board}
                      onChange={handleThreadFieldChange}
                      list="forum-board-options"
                      placeholder="例如：剧情讨论"
                      required
                    />
                    <datalist id="forum-board-options">
                      {boardOptions.map((board) => (
                        <option key={board} value={board} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    <span>标签</span>
                    <input
                      name="tagsText"
                      type="text"
                      value={threadForm.tagsText}
                      onChange={handleThreadFieldChange}
                      placeholder="用逗号分隔，例如：叙事，慢热"
                    />
                  </label>
                  <label>
                    <span>主题内容</span>
                    <textarea
                      name="content"
                      rows={5}
                      value={threadForm.content}
                      onChange={handleThreadFieldChange}
                      placeholder="写下主题内容"
                      required
                    />
                  </label>
                  <label className="gallery-admin__toggle">
                    <input
                      checked={threadForm.anonymous}
                      name="anonymous"
                      type="checkbox"
                      onChange={handleThreadFieldChange}
                    />
                    <span>匿名发布</span>
                  </label>
                  {threadActionState.error ? <p className="panel-error">{threadActionState.error}</p> : null}
                  {threadActionState.success ? <p className="panel-empty">{threadActionState.success}</p> : null}
                  <button className="primary-button" type="submit" disabled={threadActionState.pending}>
                    {threadActionState.pending ? "发布中..." : "发布主题"}
                  </button>
                </form>

                <form className="space-form" onSubmit={(event) => void handleReplySubmit(event)}>
                  <label>
                    <span>回复主题</span>
                    <select name="threadID" value={replyForm.threadID} onChange={handleReplyFieldChange}>
                      <option value="">请选择主题</option>
                      {threadFeed.map((thread) => (
                        <option key={thread.id} value={thread.id}>
                          {thread.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>回复内容</span>
                    <textarea
                      name="content"
                      rows={4}
                      value={replyForm.content}
                      onChange={handleReplyFieldChange}
                      placeholder="写下你的回复"
                      required
                    />
                  </label>
                  <label className="gallery-admin__toggle">
                    <input
                      checked={replyForm.anonymous}
                      name="anonymous"
                      type="checkbox"
                      onChange={handleReplyFieldChange}
                    />
                    <span>匿名回复</span>
                  </label>
                  {replyActionState.error ? <p className="panel-error">{replyActionState.error}</p> : null}
                  {replyActionState.success ? <p className="panel-empty">{replyActionState.success}</p> : null}
                  <button className="primary-button" type="submit" disabled={replyActionState.pending}>
                    {replyActionState.pending ? "提交中..." : "提交回复"}
                  </button>
                </form>
              </div>
            )}
            <p className="panel-empty">
              当前论坛页不再展示本地 mock 聊天记录。真实回复内容会在主题详情页中读取并展示。
            </p>
          </article>
        </section>
      </>
    );
  }

  function renderSpacePage(): ReactNode {
    return (
      <>
        <section className="panel space-master-panel">
          {displayProfile ? (
            <>
              <div className="space-master-panel__identity">
                {displayProfile.avatar_url ? (
                  <img
                    alt={displayProfile.nickname}
                    className="profile-stage__avatar"
                    src={displayProfile.avatar_url}
                  />
                ) : (
                  <div className="profile-stage__avatar profile-stage__avatar--fallback">
                    {getAvatarFallback(displayProfile)}
                  </div>
                )}
                <div className="space-master-panel__copy">
                  <p className="panel-kicker">空间主卡</p>
                  <h2 className="space-master-panel__title">{displayProfile.nickname}</h2>
                  <p className="profile-meta">
                    @{displayProfile.username} · {displayProfile.signature}
                  </p>
                  <p className="profile-bio">{displayProfile.bio}</p>
                  <div className="space-master-panel__status-row">
                    <StatusChip tone={hasVerifiedSpaceAccess ? "success" : isAuthenticated ? "warn" : "neutral"}>
                      {hasVerifiedSpaceAccess ? "已认证成员空间" : isAuthenticated ? "待认证空间" : "游客预览"}
                    </StatusChip>
                    <StatusChip tone="accent">{collectionTotal} 项收藏</StatusChip>
                  </div>
                </div>
              </div>
              <div className="space-master-panel__stats">
                {Object.entries(displayProfile.collections).map(([label, count]) => (
                  <div className="space-master-panel__stat" key={label}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="panel-empty">{profileError || "空间资料加载中。"}</p>
          )}
        </section>

        <section className="space-layout-grid">
          <div className="space-layout-grid__main">
            <article className="panel space-showcase-panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">作品展示</p>
                  <h2>动画 / 书籍 / 游戏</h2>
                </div>
                <StatusChip tone="accent">{activeSpaceShelf.label}</StatusChip>
              </div>
              <div className="space-shelf-tabs">
                {SPACE_SHOWCASE_GROUPS.map((group) => (
                  <button
                    className={`space-shelf-tab ${
                      group.id === activeSpaceShelf.id ? "space-shelf-tab--active" : ""
                    }`}
                    key={group.id}
                    type="button"
                    onClick={() => setSpaceShelfTab(group.id)}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              <div className="space-shelf-grid">
                {activeSpaceShelf.items.map((item, index) => (
                  <article className="space-shelf-item" key={item.id}>
                    <div className="space-shelf-item__cover">
                      <img alt={item.title} src={item.image} />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="space-shelf-item__copy">
                      <strong>{item.title}</strong>
                      <p>{item.subtitle}</p>
                      <small>{item.note}</small>
                    </div>
                  </article>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">个人日志</p>
                  <h2>Markdown 日志区</h2>
                </div>
                <StatusChip tone={hasVerifiedSpaceAccess ? "success" : "warn"}>
                  {hasVerifiedSpaceAccess ? "POST /articles" : "需要已认证账号"}
                </StatusChip>
              </div>
              {!session ? (
                <p className="panel-empty">登录并通过认证后，可以在这里写个人日志。</p>
              ) : !hasVerifiedSpaceAccess ? (
                <p className="panel-empty">当前账号还没有日志发布权限，需要通过认证后才能写日志。</p>
              ) : (
                <form className="space-form" onSubmit={(event) => void handleArticleSubmit(event)}>
                  <label>
                    <span>日志标题</span>
                    <input
                      name="title"
                      type="text"
                      value={articleForm.title}
                      onChange={handleArticleFieldChange}
                      placeholder="输入日志标题"
                      required
                    />
                  </label>
                  <label>
                    <span>可见范围</span>
                    <select name="visibility" value={articleForm.visibility} onChange={handleArticleFieldChange}>
                      <option value="public">公开</option>
                      <option value="member">成员</option>
                      <option value="private">仅自己可见</option>
                    </select>
                  </label>
                  <label>
                    <span>摘要</span>
                    <input
                      name="summary"
                      type="text"
                      value={articleForm.summary}
                      onChange={handleArticleFieldChange}
                      placeholder="一句话概括日志内容"
                    />
                  </label>
                  <label>
                    <span>Markdown 正文</span>
                    <textarea
                      name="content"
                      rows={8}
                      value={articleForm.content}
                      onChange={handleArticleFieldChange}
                      placeholder={"支持 Markdown\n例如：\n![](https://example.com/image.png)"}
                      required
                    />
                  </label>
                  <label>
                    <span>标签</span>
                    <input
                      name="tagsText"
                      type="text"
                      value={articleForm.tagsText}
                      onChange={handleArticleFieldChange}
                      placeholder="用逗号分隔，例如：日志，收藏，感想"
                    />
                  </label>
                  <p className="panel-empty">
                    当前后端还没有独立图片上传接口，所以日志里的图片先通过 Markdown 图片链接插入。
                  </p>
                  {articleActionState.error ? <p className="panel-error">{articleActionState.error}</p> : null}
                  {articleActionState.success ? <p className="panel-empty">{articleActionState.success}</p> : null}
                  <button className="primary-button" type="submit" disabled={articleActionState.pending}>
                    {articleActionState.pending ? "发布中..." : "发布日志"}
                  </button>
                </form>
              )}
              <div className="space-log-list">
                <div className="space-log-list__header">
                  <strong>最近日志</strong>
                  <span>{spaceLogEntries.length} 篇</span>
                </div>
                <div className="stack-list">
                  {spaceLogEntries.length ? (
                    spaceLogEntries.slice(0, 4).map((article) => (
                      <button
                        className="content-card thread-card-button"
                        key={article.id}
                        type="button"
                        onClick={() => handleNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                      >
                        <div className="content-card__header">
                          <h3>{article.title}</h3>
                          <StatusChip tone="accent">
                            {normalizeVisibilityLabel(article.visibility)}
                          </StatusChip>
                        </div>
                        <p>{excerpt(article.summary || article.content, 120)}</p>
                      </button>
                    ))
                  ) : (
                    <p className="panel-empty">还没有匹配到这个空间的日志内容。</p>
                  )}
                </div>
              </div>
            </article>
          </div>

          <aside className="space-layout-grid__side">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">身份联调</p>
                  <h2>登录与空间同步</h2>
                </div>
                <StatusChip tone={isAuthenticated ? "success" : "neutral"}>
                  {isAuthenticated ? "已连接" : "等待登录"}
                </StatusChip>
              </div>
              {renderAuthPanel()}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Bangumi 导入</p>
                  <h2>作品同步</h2>
                </div>
                <StatusChip tone={hasVerifiedSpaceAccess ? "accent" : "warn"}>
                  {hasVerifiedSpaceAccess ? "POST /users/me/bangumi/import" : "需要已认证账号"}
                </StatusChip>
              </div>
              {spaceAccessBlocked ? (
                <p className="panel-error">
                  当前账号已登录，但后端返回 `verified user required`。未认证用户还不能打开个人空间能力。
                </p>
              ) : null}
              {!session ? (
                <p className="panel-empty">登录后可按作品 ID 发起 Bangumi 导入任务。</p>
              ) : !hasVerifiedSpaceAccess ? (
                <p className="panel-empty">当前账号还没有导入权限，认证通过后才能调用该接口。</p>
              ) : (
                <form className="space-form" onSubmit={(event) => void handleBangumiImportSubmit(event)}>
                  <label>
                    <span>作品 ID</span>
                    <input
                      name="subjectIdsText"
                      type="text"
                      value={bangumiForm.subjectIdsText}
                      onChange={handleBangumiFieldChange}
                      placeholder="例如：12345, 67890"
                    />
                  </label>
                  <label>
                    <span>收藏状态</span>
                    <select name="status" value={bangumiForm.status} onChange={handleBangumiFieldChange}>
                      <option value="wish">wish</option>
                      <option value="doing">doing</option>
                      <option value="collect">collect</option>
                      <option value="on_hold">on_hold</option>
                      <option value="dropped">dropped</option>
                    </select>
                  </label>
                  <label>
                    <span>可见范围</span>
                    <select name="visibility" value={bangumiForm.visibility} onChange={handleBangumiFieldChange}>
                      <option value="public">public</option>
                      <option value="members">members</option>
                      <option value="private">private</option>
                    </select>
                  </label>
                  {bangumiActionState.error ? <p className="panel-error">{bangumiActionState.error}</p> : null}
                  {bangumiActionState.success ? <p className="panel-empty">{bangumiActionState.success}</p> : null}
                  {bangumiActionState.data ? (
                    <div className="space-job-box">
                      <strong>任务已创建</strong>
                      <p>Job ID: {bangumiActionState.data.job_id}</p>
                      <p>Status: {bangumiActionState.data.status}</p>
                      <p>Channel: {bangumiActionState.data.channel}</p>
                    </div>
                  ) : null}
                  <button className="primary-button" type="submit" disabled={bangumiActionState.pending}>
                    {bangumiActionState.pending ? "提交中..." : "提交导入任务"}
                  </button>
                </form>
              )}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">好友模块</p>
                  <h2>空间好友</h2>
                </div>
              </div>
              <div className="space-side-list">
                {SPACE_FRIENDS.map((friend) => (
                  <div className="space-side-card" key={friend.id}>
                    <div className="space-side-card__header">
                      <strong>{friend.name}</strong>
                      <StatusChip
                        tone={
                          friend.status === "在线"
                            ? "success"
                            : friend.status === "忙碌"
                              ? "accent"
                              : "neutral"
                        }
                      >
                        {friend.status}
                      </StatusChip>
                    </div>
                    <p>{friend.note}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">时间胶囊</p>
                  <h2>记忆模块</h2>
                </div>
              </div>
              <div className="space-side-list">
                {SPACE_TIME_CAPSULES.map((capsule) => (
                  <div className="space-side-card" key={capsule.id}>
                    <div className="space-side-card__header">
                      <strong>{capsule.title}</strong>
                      <span>{capsule.time}</span>
                    </div>
                    <p>{capsule.body}</p>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </>
    );
  }

  function renderGalleryPage(): ReactNode {
    return (
      <>
        <SectionHero
          kicker="展示陈列"
          title="相册、拍立得、旧纸、时间轴与留声机的展示墙"
          description="这里不急着解释功能，只把照片、旧纸、拍立得和时间线摆出来。"
          metrics={[
            {
              label: "图像内容",
              value: String(galleryAlbums.length + galleryPolaroids.length),
              detail: "相册与拍立得共同组成图像区",
              tone: "accent",
            },
            {
              label: "纸面片段",
              value: String(galleryPapers.length),
              detail: "旧纸与手记负责承接文字气味",
              tone: "warn",
            },
            {
              label: "氛围区域",
              value: String(galleryTimeline.length + galleryTracks.length),
              detail: "时间轴与留声机撑起整体氛围",
              tone: "neutral",
            },
          ]}
        />

        {canManageGallery ? (
          <section className="page-split-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">展示墙管理</p>
                  <h2>{editingGalleryEntryID ? "编辑展示条目" : "新建展示条目"}</h2>
                </div>
                <StatusChip tone="accent">
                  {editingGalleryEntryID ? "编辑模式" : "创建模式"}
                </StatusChip>
              </div>
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
                  <input
                    name="title"
                    onChange={handleGalleryFieldChange}
                    placeholder="例如：社团春季共赏记录"
                    value={galleryForm.title}
                  />
                </label>
                <label>
                  <span>Slug</span>
                  <input
                    name="slug"
                    onChange={handleGalleryFieldChange}
                    placeholder="留空则按标题自动生成"
                    value={galleryForm.slug}
                  />
                </label>
                <label>
                  <span>副标题</span>
                  <input
                    name="subtitle"
                    onChange={handleGalleryFieldChange}
                    placeholder="相册可写强调词，时间轴可写年份"
                    value={galleryForm.subtitle}
                  />
                </label>
                <label>
                  <span>正文 / 描述</span>
                  <textarea
                    name="body"
                    onChange={handleGalleryFieldChange}
                    placeholder="输入展示条目的说明文案"
                    rows={5}
                    value={galleryForm.body}
                  />
                </label>
                <label>
                  <span>额外文本</span>
                  <input
                    name="extra_text"
                    onChange={handleGalleryFieldChange}
                    placeholder="例如：03:24 或其他辅助文本"
                    value={galleryForm.extra_text}
                  />
                </label>
                <label>
                  <span>排序</span>
                  <input
                    name="sort_order"
                    onChange={handleGalleryFieldChange}
                    placeholder="0"
                    value={galleryForm.sort_order}
                  />
                </label>
                <label className="gallery-admin__toggle">
                  <input
                    checked={galleryForm.active}
                    name="active"
                    onChange={handleGalleryFieldChange}
                    type="checkbox"
                  />
                  <span>设为公开展示</span>
                </label>
                {galleryActionState.error ? (
                  <p className="panel-error">{galleryActionState.error}</p>
                ) : null}
                {galleryActionState.success ? (
                  <p className="panel-empty">{galleryActionState.success}</p>
                ) : null}
                <div className="gallery-admin__actions">
                  <button
                    className="primary-button"
                    disabled={galleryActionState.pending}
                    type="submit"
                  >
                    {galleryActionState.pending
                      ? "保存中..."
                      : editingGalleryEntryID
                        ? "更新展示条目"
                        : "创建展示条目"}
                  </button>
                  <button
                    className="ghost-button"
                    onClick={resetGalleryEditor}
                    type="button"
                  >
                    清空表单
                  </button>
                </div>
              </form>
            </article>

            <article className="panel">
              <div className="panel-heading">
              <div>
                <p className="panel-kicker">当前条目</p>
                <h2>管理列表</h2>
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
                    <div className="meta-row">
                      <span>排序 {entry.sort_order}</span>
                      <span>{entry.subtitle || entry.extra_text || "无附加文本"}</span>
                    </div>
                    <div className="gallery-admin__actions">
                      <button
                        className="ghost-button"
                        onClick={() => handleGalleryEditStart(entry)}
                        type="button"
                      >
                        编辑
                      </button>
                      <button
                        className="ghost-button gallery-admin__danger"
                        onClick={() => void handleGalleryDelete(entry)}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                {!adminGalleryEntries.length ? (
                  <p className="panel-empty">当前还没有可管理的 gallery 条目。</p>
                ) : null}
              </div>
              {renderPager(
                adminGalleryPager,
                (page) => setAdminGalleryPager((current) => ({ ...current, page })),
                "暂无可管理条目。",
              )}
            </article>
          </section>
        ) : isAuthenticated ? (
          <section className="panel-grid preview-grid">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">管理权限</p>
                  <h2>当前账号不能维护展示墙</h2>
                </div>
                <StatusChip tone="warn">只读模式</StatusChip>
              </div>
              <p className="panel-empty">
                `/gallery` 的增删查改只对 `admin` 和 `super_admin` 开放。当前角色：
                {profile?.roles?.join(", ") || "未返回角色信息"}。
              </p>
            </article>
          </section>
        ) : null}

        <section className="showcase-grid">
          <article className="panel showcase-panel showcase-panel--wide">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">相册墙</p>
                <h2>相册</h2>
              </div>
            </div>
            <div className="album-grid">
              {galleryAlbums.map((entry) => (
                <div className="album-card" key={entry.id}>
                  <span>{entry.accent}</span>
                  <strong>{entry.title}</strong>
                  <p>{entry.caption}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel showcase-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">拍立得板</p>
                <h2>拍立得</h2>
              </div>
            </div>
            <div className="polaroid-grid">
              {galleryPolaroids.map((entry) => (
                <div className="polaroid-card" key={entry.id}>
                  <strong>{entry.title}</strong>
                  <p>{entry.note}</p>
                  <span>{entry.stamp}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel showcase-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">旧纸页</p>
                <h2>旧纸</h2>
              </div>
            </div>
            <div className="paper-stack">
              {galleryPapers.map((entry) => (
                <div className="paper-note" key={entry.id}>
                  <strong>{entry.title}</strong>
                  <p>{entry.body}</p>
                  <span>{entry.signature}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel showcase-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">时间线</p>
                <h2>时间轴</h2>
              </div>
            </div>
            <div className="timeline-list">
              {galleryTimeline.map((entry) => (
                <div className="timeline-item" key={entry.id}>
                  <span className="timeline-item__year">{entry.year}</span>
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{entry.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel showcase-panel showcase-panel--wide">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">留声机</p>
                <h2>留声机</h2>
              </div>
              <StatusChip tone="neutral">正在旋转</StatusChip>
            </div>
            <div className="track-list">
              {galleryTracks.map((track) => (
                <div className="track-card" key={track.id}>
                  <div className="track-card__meta">
                    <span>{track.mood}</span>
                    <span>{track.length}</span>
                  </div>
                  <strong>{track.title}</strong>
                  <p>{track.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel-grid preview-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">展示墙投稿</p>
                <h2>提交新的展墙内容</h2>
              </div>
              <StatusChip tone={hasVerifiedSpaceAccess ? "accent" : "warn"}>
                {hasVerifiedSpaceAccess ? "POST /wall/submissions" : "需要已认证账号"}
              </StatusChip>
            </div>
            {!session ? (
              <p className="panel-empty">登录并通过认证后，可以向展示墙提交新的图文内容。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="panel-empty">当前账号还没有投稿权限，需要通过认证后才能提交展示墙内容。</p>
            ) : (
              <form className="space-form" onSubmit={(event) => void handleWallSubmit(event)}>
                <label>
                  <span>标题</span>
                  <input
                    name="title"
                    type="text"
                    value={wallForm.title}
                    onChange={handleWallFieldChange}
                    placeholder="输入投稿标题"
                    required
                  />
                </label>
                <label>
                  <span>内容</span>
                  <textarea
                    name="content"
                    rows={5}
                    value={wallForm.content}
                    onChange={handleWallFieldChange}
                    placeholder="写下展示内容说明"
                    required
                  />
                </label>
                <label>
                  <span>图片地址</span>
                  <textarea
                    name="imagesText"
                    rows={4}
                    value={wallForm.imagesText}
                    onChange={handleWallFieldChange}
                    placeholder={"每行一个图片 URL\nhttps://example.com/cover.png"}
                  />
                </label>
                {wallActionState.error ? <p className="panel-error">{wallActionState.error}</p> : null}
                {wallActionState.success ? <p className="panel-empty">{wallActionState.success}</p> : null}
                <button className="primary-button" type="submit" disabled={wallActionState.pending}>
                  {wallActionState.pending ? "投稿中..." : "提交投稿"}
                </button>
              </form>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">展示墙动态</p>
                <h2>已发布内容</h2>
              </div>
              <StatusChip tone="neutral">{wallPager.total} 条</StatusChip>
            </div>
            {wallError ? <p className="panel-error">{wallError}</p> : null}
            <div className="stack-list">
              {wallEntries.map((entry) => (
                <div className="content-card" key={entry.id}>
                  <div className="content-card__header">
                    <h3>{entry.title}</h3>
                    <StatusChip tone={entry.approved ? "success" : "warn"}>
                      {entry.approved ? "已发布" : "待审核"}
                    </StatusChip>
                  </div>
                  <p>{excerpt(entry.content, 180)}</p>
                  <div className="meta-row">
                    <span>{entry.contributor}</span>
                    <span>{entry.images.length} 张图片</span>
                  </div>
                </div>
              ))}
              {!wallEntries.length ? <p className="panel-empty">当前还没有公开展示的投稿。</p> : null}
            </div>
            {renderPager(wallPager, (page) => setWallPager((current) => ({ ...current, page })), "暂无公开展示内容。")}
          </article>
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
      case "/space":
        return renderSpacePage();
      case "/gallery":
        return renderGalleryPage();
      default:
        return renderHomePage();
    }
  }

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

      <main className="app-shell">
        <Header
          currentPath={routePath}
          hidden={isHeaderHidden}
          navigation={NAV_ITEMS}
          onNavigate={handleNavigate}
          summary={`${HEADER_SUMMARY_BY_ROUTE[routePath]} · ${backendReachable ? "backend online" : "backend offline"} · ${isAuthenticated ? "member" : "guest"}`}
          utilityHref={routePath === "/portal" ? "/" : "/portal"}
          utilityLabel={routePath === "/portal" ? "返回首页" : "社团介绍"}
        />
        {renderCurrentPage()}
      </main>
    </>
  );
}

export default App;
