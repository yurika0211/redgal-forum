import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createFriendRequest,
  fetchIncomingFriendRequests,
  fetchMyFriends,
  fetchOutgoingFriendRequests,
  fetchUserFriends,
  fetchPublicProfile,
  reviewFriendRequest,
  updateMyBangumiCollection,
} from "../api";
import type {
  Article as ApiArticle,
  BangumiCollection,
  BangumiImportJob,
  ForumThread as ApiForumThread,
  BangumiImportPayload,
  FriendRequest as ApiFriendRequest,
  FriendSummary as ApiFriendSummary,
  Profile as ApiProfile,
  Session,
} from "../api";
import PaginationBar from "../components/PaginationBar";
import RichContent from "../components/RichContent";
import StatusChip from "../components/StatusChip";
import WorkspaceSidebar, {
  type WorkspaceSidebarIconName,
  type WorkspaceSidebarSection,
} from "../components/WorkspaceSidebar";
import { createPagerState, type PagerState } from "../lib/pagination";
import { excerpt, extractMarkdownPreviewImage, formatDateTime, normalizeVisibilityLabel } from "../lib/text";
import type {
  ArticleFormState,
  FormActionState,
} from "../types/app";

type SpaceShelfTab = "anime" | "books" | "games";
type SpaceCollectionStatus = "wish" | "doing" | "collect" | "on_hold" | "dropped";
type SpaceFriendStatus = "在线" | "忙碌" | "离线";
type SpaceSidebarSectionKey = "identity" | "creation" | "community";
type SpaceSidebarPageKey =
  | "profile"
  | "progress"
  | "journal"
  | "bangumi"
  | "favorites"
  | "friends"
  | "capsules";

interface SpaceShelfItem {
  id: string;
  collectionID?: string;
  sourceURL?: string;
  title: string;
  subtitle?: string;
  note: string;
  image: string;
  originalTitle?: string;
  score?: number;
  rank?: number;
  releaseYear?: number;
  episodes?: number;
  pages?: number;
  hours?: string;
  collectionStatus: SpaceCollectionStatus;
  myScore?: number;
  myComment?: string;
}

interface SpaceShowcaseGroup {
  id: SpaceShelfTab;
  label: string;
  items: SpaceShelfItem[];
}

interface SpaceFriend {
  avatarURL: string;
  id: string;
  isReal: boolean;
  name: string;
  note: string;
  status: SpaceFriendStatus;
  username: string;
}

interface SpaceFriendFormState {
  note: string;
  status: SpaceFriendStatus;
  username: string;
}

interface SpaceFriendActionState {
  error: string;
  pending: boolean;
  success: string;
}

interface SpaceShowcaseItemEdit {
  collectionStatus?: SpaceCollectionStatus;
  myScore?: number;
  myComment?: string;
}

interface SpaceShowcaseItemDraft {
  collectionStatus: SpaceCollectionStatus;
  myScore: number | null;
  myComment: string;
}

interface SpaceShowcaseActionState {
  pending: boolean;
  error: string;
  success: string;
}

const SPACE_FRIENDS_STORAGE_KEY = "rubedo.space.friends";
const SPACE_SHOWCASE_EDITS_STORAGE_KEY = "rubedo.space.showcase.edits";
const SPACE_FRIEND_STATUS_ORDER: SpaceFriendStatus[] = ["在线", "忙碌", "离线"];
const INITIAL_SPACE_FRIEND_FORM: SpaceFriendFormState = {
  username: "",
  note: "",
  status: "在线",
};

const SPACE_SIDEBAR_SECTIONS: ReadonlyArray<{
  id: SpaceSidebarSectionKey;
  title: string;
  kicker: string;
  description: string;
  children: ReadonlyArray<{
    id: SpaceSidebarPageKey;
    label: string;
  }>;
}> = [
  {
    id: "identity",
    title: "空间主控",
    kicker: "Identity",
    description: "查看资料卡与成长进度。",
    children: [
      { id: "profile", label: "个人资料卡" },
      { id: "progress", label: "成长进度" },
    ],
  },
  {
    id: "creation",
    title: "内容创作",
    kicker: "Creation",
    description: "管理日志区和 Bangumi 同步。",
    children: [
      { id: "journal", label: "Markdown 日志" },
      { id: "bangumi", label: "Bangumi 导入" },
    ],
  },
  {
    id: "community",
    title: "社交归档",
    kicker: "Community",
    description: "维护空间好友和时间胶囊记录。",
    children: [
      { id: "favorites", label: "收藏夹" },
      { id: "friends", label: "空间好友" },
      { id: "capsules", label: "时间胶囊" },
    ],
  },
] as const;

const SPACE_PAGE_ICONS: Record<SpaceSidebarPageKey, WorkspaceSidebarIconName> = {
  bangumi: "sparkles",
  capsules: "capsule",
  favorites: "heart",
  friends: "users",
  journal: "pen",
  profile: "user",
  progress: "pulse",
};

const PUBLIC_PROFILE_VISIBLE_PAGES = new Set<SpaceSidebarPageKey>([
  "profile",
  "journal",
  "friends",
]);

const SPACE_COLLECTION_STATUS_META: ReadonlyArray<{
  id: SpaceCollectionStatus;
  label: string;
}> = [
  { id: "collect", label: "看过" },
  { id: "doing", label: "在看" },
  { id: "wish", label: "想看" },
  { id: "on_hold", label: "搁置" },
  { id: "dropped", label: "抛弃" },
];

function isSpaceCollectionStatus(value: unknown): value is SpaceCollectionStatus {
  return SPACE_COLLECTION_STATUS_META.some((item) => item.id === value);
}

function toCollectionStatusLabel(status: SpaceCollectionStatus): string {
  return SPACE_COLLECTION_STATUS_META.find((item) => item.id === status)?.label ?? status;
}

function normalizeMyScore(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return undefined;
  }

  return value >= 1 && value <= 10 ? value : undefined;
}

function parseStoredShowcaseEdits(value: unknown): Record<string, SpaceShowcaseItemEdit> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, SpaceShowcaseItemEdit>>(
    (result, [itemID, rawEdit]) => {
      if (typeof rawEdit !== "object" || rawEdit === null) {
        return result;
      }

      const candidate = rawEdit as Partial<SpaceShowcaseItemEdit>;
      const normalizedStatus = isSpaceCollectionStatus(candidate.collectionStatus)
        ? candidate.collectionStatus
        : undefined;
      const normalizedScore = normalizeMyScore(candidate.myScore);
      const normalizedComment =
        typeof candidate.myComment === "string" && candidate.myComment.trim()
          ? candidate.myComment.trim().slice(0, 200)
          : undefined;

      if (!normalizedStatus && typeof normalizedScore !== "number" && !normalizedComment) {
        return result;
      }

      result[itemID] = {
        collectionStatus: normalizedStatus,
        myScore: normalizedScore,
        myComment: normalizedComment,
      };
      return result;
    },
    {},
  );
}

function readStoredShowcaseEdits(): Record<string, SpaceShowcaseItemEdit> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(SPACE_SHOWCASE_EDITS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseStoredShowcaseEdits(parsed);
  } catch {
    window.localStorage.removeItem(SPACE_SHOWCASE_EDITS_STORAGE_KEY);
    return {};
  }
}

function findPreferredCollectionStatus(items: readonly SpaceShelfItem[]): SpaceCollectionStatus {
  const fallback = SPACE_COLLECTION_STATUS_META[0].id;
  for (const meta of SPACE_COLLECTION_STATUS_META) {
    if (items.some((item) => item.collectionStatus === meta.id)) {
      return meta.id;
    }
  }
  return fallback;
}

function toMediaTypeLabel(tab: SpaceShelfTab): string {
  switch (tab) {
    case "anime":
      return "动画";
    case "books":
      return "书籍";
    case "games":
      return "游戏";
    default:
      return "收藏";
  }
}

const SPACE_SHOWCASE_TAB_ORDER: readonly SpaceShelfTab[] = ["anime", "books", "games"];
const SPACE_SHOWCASE_LABEL_BY_TAB: Record<SpaceShelfTab, string> = {
  anime: "动画",
  books: "书籍",
  games: "游戏",
};

function createEmptyShowcaseGroups(): SpaceShowcaseGroup[] {
  return SPACE_SHOWCASE_TAB_ORDER.map((id) => ({
    id,
    label: SPACE_SHOWCASE_LABEL_BY_TAB[id],
    items: [],
  }));
}

function normalizeCollectionStatus(
  value: BangumiCollection["collection_status"] | string,
): SpaceCollectionStatus | null {
  switch (value) {
    case "wish":
    case "doing":
    case "collect":
    case "on_hold":
    case "dropped":
      return value;
    default:
      return null;
  }
}

function inferShelfTabFromBangumiSubject(subjectType: number, platforms: readonly string[]): SpaceShelfTab | null {
  switch (subjectType) {
    case 1:
      return "books";
    case 2:
      return "anime";
    case 4:
      return "games";
    default:
      break;
  }

  const normalized = platforms.join(" ").toLowerCase();
  if (/(anime|tv|ova|web)/.test(normalized)) {
    return "anime";
  }
  if (/(game|pc|ps|steam|switch|xbox|visual\s*novel|gal)/.test(normalized)) {
    return "games";
  }
  if (/(book|novel|manga|comic|light\s*novel|小说|漫画)/.test(normalized)) {
    return "books";
  }

  return null;
}

function parseReleaseYear(airDate: string | undefined): number | undefined {
  if (!airDate) {
    return undefined;
  }

  const year = Number.parseInt(airDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
}

function selectFallbackCover(seed: number): string {
  return seed % 2 === 0 ? "/bg1.png" : "/bg2.png";
}

function createShowcaseGroupsFromBangumiCollections(collections: readonly BangumiCollection[]): SpaceShowcaseGroup[] {
  const groups = createEmptyShowcaseGroups();
  const byID: Record<SpaceShelfTab, Map<string, SpaceShelfItem>> = {
    anime: new Map<string, SpaceShelfItem>(),
    books: new Map<string, SpaceShelfItem>(),
    games: new Map<string, SpaceShelfItem>(),
  };

  collections.forEach((entry, index) => {
    const status = normalizeCollectionStatus(entry.collection_status);
    if (!status) {
      return;
    }

    const shelfTab = inferShelfTabFromBangumiSubject(entry.subject_type, entry.platforms || []);
    if (!shelfTab) {
      return;
    }

    const title = (entry.name_cn || entry.name || "").trim();
    if (!title) {
      return;
    }

    const originalTitle =
      entry.name && entry.name_cn && entry.name.trim() !== entry.name_cn.trim() ? entry.name.trim() : undefined;
    const note = entry.summary?.trim() ? excerpt(entry.summary, 72) : `Bangumi 条目 #${entry.bgm_subject_id}`;
    const subtitle = entry.platforms?.length ? entry.platforms.join(" / ") : `Bangumi #${entry.bgm_subject_id}`;
    const sourceURL = (entry.subject_url || "").trim() || `https://bgm.tv/subject/${entry.bgm_subject_id}`;
    const mapKey = `${entry.collection_id}:${entry.bgm_subject_id}:${status}`;
    byID[shelfTab].set(mapKey, {
      id: `bgm-${entry.collection_id}`,
      collectionID: entry.collection_id,
      sourceURL,
      title,
      subtitle,
      note,
      image: (entry.cover_image_url || "").trim() || selectFallbackCover(index),
      originalTitle,
      score: typeof entry.rating_score === "number" ? entry.rating_score : undefined,
      rank: typeof entry.rank_no === "number" ? entry.rank_no : undefined,
      releaseYear: parseReleaseYear(entry.air_date),
      collectionStatus: status,
      myScore: typeof entry.my_score === "number" ? entry.my_score : undefined,
      myComment: typeof entry.my_comment === "string" ? entry.my_comment.trim() : undefined,
    });
  });

  return groups.map((group) => {
    const items = Array.from(byID[group.id].values());
    items.sort((left, right) => {
      const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
      const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.title.localeCompare(right.title, "zh-CN");
    });
    return {
      ...group,
      items,
    };
  });
}

function applyShowcaseEdits(
  groups: readonly SpaceShowcaseGroup[],
  edits: Record<string, SpaceShowcaseItemEdit>,
): SpaceShowcaseGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const itemEdit = edits[item.id];
      if (!itemEdit) {
        return item;
      }

      return {
        ...item,
        collectionStatus: itemEdit.collectionStatus ?? item.collectionStatus,
        myScore: typeof itemEdit.myScore === "number" ? itemEdit.myScore : undefined,
        myComment: itemEdit.myComment?.trim() || undefined,
      };
    }),
  }));
}

function createShowcaseItemDraft(item: SpaceShelfItem): SpaceShowcaseItemDraft {
  return {
    collectionStatus: item.collectionStatus,
    myScore: typeof item.myScore === "number" ? item.myScore : null,
    myComment: item.myComment || "",
  };
}

function spaceSidebarSectionFromPage(page: SpaceSidebarPageKey): SpaceSidebarSectionKey {
  const section = SPACE_SIDEBAR_SECTIONS.find((item) =>
    item.children.some((child) => child.id === page),
  );

  return section?.id ?? "identity";
}

function isSpaceFriendStatus(value: unknown): value is SpaceFriendStatus {
  return (
    typeof value === "string" &&
    SPACE_FRIEND_STATUS_ORDER.some((status) => status === value)
  );
}

function createDefaultSpaceFriends(): SpaceFriend[] {
  return [];
}

function getSpaceFriendAvatarFallback(friend: Pick<SpaceFriend, "name" | "username">): string {
  const name = (friend.name || "").trim();
  const username = (friend.username || "").trim();
  return (name || username || "友").charAt(0).toUpperCase() || "友";
}

function parseStoredSpaceFriends(value: unknown): SpaceFriend[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<SpaceFriend[]>((result, item) => {
    if (typeof item !== "object" || item === null) {
      return result;
    }

    const candidate = item as Partial<SpaceFriend>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.username !== "string" ||
      typeof candidate.note !== "string" ||
      !isSpaceFriendStatus(candidate.status)
    ) {
      return result;
    }

    result.push({
      avatarURL: typeof candidate.avatarURL === "string" ? candidate.avatarURL : "",
      id: candidate.id,
      isReal: Boolean(candidate.isReal),
      name: candidate.name,
      note: candidate.note,
      status: candidate.status,
      username: candidate.username,
    });
    return result;
  }, []);
}

function readStoredSpaceFriends(): SpaceFriend[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SPACE_FRIENDS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseStoredSpaceFriends(parsed);
  } catch {
    window.localStorage.removeItem(SPACE_FRIENDS_STORAGE_KEY);
    return null;
  }
}

function createSpaceFriendID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `friend-${crypto.randomUUID()}`;
  }

  return `friend-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapFriendSummaryToSpaceFriend(friend: ApiFriendSummary): SpaceFriend {
  const nickname = (friend.nickname || "").trim();
  const username = (friend.username || "").trim();
  const signature = (friend.signature || "").trim();
  const avatarURL = (friend.avatar_url || "").trim();

  return {
    avatarURL,
    id: friend.user_id,
    isReal: true,
    name: nickname || username || "站内好友",
    note: signature || "互为好友",
    status: "在线",
    username,
  };
}

function formatRequestTime(value: string | undefined): string {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getSpaceFriendTone(status: SpaceFriendStatus): "success" | "accent" | "neutral" {
  if (status === "在线") {
    return "success";
  }
  if (status === "忙碌") {
    return "accent";
  }
  return "neutral";
}

function getNextSpaceFriendStatus(status: SpaceFriendStatus): SpaceFriendStatus {
  const currentIndex = SPACE_FRIEND_STATUS_ORDER.findIndex((item) => item === status);
  const nextIndex = (currentIndex + 1) % SPACE_FRIEND_STATUS_ORDER.length;
  return SPACE_FRIEND_STATUS_ORDER[nextIndex];
}

interface SpaceCapsule {
  id: string;
  title: string;
  time: string;
  record: string;
  sortGroup: number;
  sortOrder: number;
  timestamp: number | null;
}

type TimedArticle = ApiArticle & {
  created_at?: string;
  published_at?: string;
  updated_at?: string;
};

function parseTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatCapsuleTime(value: string | undefined, fallback: string): string {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) {
    return fallback;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function extractAnyPreviewImage(value: string): string | null {
  const markdownMatch = value.match(/!\[[^\]]*]\(([^)\s]+)\)/i);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  const htmlMatch = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return htmlMatch?.[1] || null;
}

function pickSpaceLogPreviewImage(article: ApiArticle, index: number): string {
  const fromContent = extractMarkdownPreviewImage(article.content) || extractAnyPreviewImage(article.content);
  if (fromContent) {
    return fromContent;
  }

  const fromSummary = extractMarkdownPreviewImage(article.summary) || extractAnyPreviewImage(article.summary);
  if (fromSummary) {
    return fromSummary;
  }

  return index % 2 === 0 ? "/bg1.png" : "/bg2.png";
}

function pickArticleEventTime(article: TimedArticle): string | undefined {
  return article.published_at || article.updated_at || article.created_at;
}

function pickBangumiEventTime(job: BangumiImportJob): string | undefined {
  return job.finished_at || job.updated_at || job.created_at || job.started_at;
}

function createSpaceCapsules(spaceLogEntries: ApiArticle[], bangumiJobs: BangumiImportJob[]): SpaceCapsule[] {
  const articleCapsules = spaceLogEntries.map((article, index) => {
    const timedArticle = article as TimedArticle;
    const eventTime = pickArticleEventTime(timedArticle);

    return {
      id: `article-${article.id}`,
      title: `发布日志：${article.title}`,
      time: formatCapsuleTime(eventTime, `最近日志 #${String(index + 1).padStart(2, "0")}`),
      record: `发布了日志《${article.title}》。`,
      timestamp: parseTimestamp(eventTime),
      sortGroup: 1,
      sortOrder: index,
    } satisfies SpaceCapsule;
  });

  const bangumiCapsules = bangumiJobs.map((job, index) => {
    const eventTime = pickBangumiEventTime(job);
    const statusLabel =
      job.status === "succeeded"
        ? "同步完成"
        : job.status === "failed"
          ? "同步失败"
          : job.status === "cancelled"
            ? "任务取消"
            : "同步处理中";

    return {
      id: `bangumi-${job.job_id}`,
      title: `Bangumi 导入任务 #${job.job_id}`,
      time: formatCapsuleTime(eventTime, `任务队列 #${String(index + 1).padStart(2, "0")}`),
      record: `发起了 Bangumi 同步任务，当前状态：${statusLabel}。`,
      timestamp: parseTimestamp(eventTime),
      sortGroup: 0,
      sortOrder: index,
    } satisfies SpaceCapsule;
  });

  return [...bangumiCapsules, ...articleCapsules].sort((left, right) => {
    if (left.timestamp !== null && right.timestamp !== null) {
      return right.timestamp - left.timestamp;
    }

    if (left.timestamp !== null) {
      return -1;
    }
    if (right.timestamp !== null) {
      return 1;
    }

    if (left.sortGroup !== right.sortGroup) {
      return left.sortGroup - right.sortGroup;
    }

    return left.sortOrder - right.sortOrder;
  });
}

interface SpacePageProps {
  articleActionState: FormActionState<ApiArticle>;
  articleForm: ArticleFormState;
  authForm: {
    account: string;
    password: string;
  };
  forumProgressPanel: ReactNode;
  bangumiActionState: FormActionState<BangumiImportJob>;
  bangumiCollections: BangumiCollection[];
  bangumiCollectionsError: string;
  bangumiForm: BangumiImportPayload & {
    subjectIdsText: string;
    sync_mode: "subject_ids" | "account";
    bangumi_username: string;
    status: string;
    visibility: string;
    maxItemsText: string;
  };
  bangumiJobs: BangumiImportJob[];
  bangumiJobsError: string;
  bangumiJobsPager: PagerState;
  canEditProfile: boolean;
  canEditShowcase: boolean;
  canUseBangumiImport: boolean;
  collectionTotal: number;
  displayProfile: ApiProfile | null;
  favoritedThreads: ApiForumThread[];
  favoritedThreadsError: string;
  favoritedThreadsPager: PagerState;
  hasVerifiedSpaceAccess: boolean;
  isAuthenticated: boolean;
  loginState: {
    pending: boolean;
    error: string;
  };
  profileActionState: FormActionState<ApiProfile>;
  profileError: string;
  profileForm: {
    username: string;
    nickname: string;
    signature: string;
    bio: string;
    avatar_url: string;
  };
  registerForm: {
    student_id: string;
    username: string;
    password: string;
  };
  registerState: {
    pending: boolean;
    error: string;
    success: string;
  };
  session: Session | null;
  spaceLogEntries: ApiArticle[];
  spaceShelfTab: SpaceShelfTab;
  viewingPublicProfileUsername: string | null;
  onAuthFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onArticleFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onArticleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBangumiFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onBangumiImportSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBangumiJobsPageChange: (page: number) => void;
  onFavoritedThreadsPageChange: (page: number) => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onProfileFieldChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRegisterFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRegisterSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSpaceShelfTabChange: (tab: SpaceShelfTab) => void;
}

function getAvatarFallback(profile: Pick<ApiProfile, "nickname" | "username"> | null): string {
  if (!profile) {
    return "R";
  }

  return (profile.nickname || profile.username || "R").trim().charAt(0).toUpperCase() || "R";
}

export default function SpacePage({
  articleActionState,
  articleForm,
  authForm,
  forumProgressPanel,
  bangumiActionState,
  bangumiCollections,
  bangumiCollectionsError,
  bangumiForm,
  bangumiJobs,
  bangumiJobsError,
  bangumiJobsPager,
  canEditProfile,
  canEditShowcase,
  canUseBangumiImport,
  collectionTotal,
  displayProfile,
  favoritedThreads,
  favoritedThreadsError,
  favoritedThreadsPager,
  hasVerifiedSpaceAccess,
  isAuthenticated,
  loginState,
  profileActionState,
  profileError,
  profileForm,
  registerForm,
  registerState,
  session,
  spaceLogEntries,
  spaceShelfTab,
  viewingPublicProfileUsername,
  onAuthFieldChange,
  onArticleFieldChange,
  onArticleSubmit,
  onBangumiFieldChange,
  onBangumiImportSubmit,
  onBangumiJobsPageChange,
  onFavoritedThreadsPageChange,
  onNavigate,
  onLogout,
  onLoginSubmit,
  onProfileFieldChange,
  onProfileSubmit,
  onRegisterFieldChange,
  onRegisterSubmit,
  onSpaceShelfTabChange,
}: SpacePageProps) {
  const [showcaseEdits, setShowcaseEdits] = useState<Record<string, SpaceShowcaseItemEdit>>(() =>
    readStoredShowcaseEdits(),
  );
  const [expandedShowcaseItemIDs, setExpandedShowcaseItemIDs] = useState<Record<string, boolean>>({});
  const showcaseGridRef = useRef<HTMLDivElement | null>(null);
  const showcaseCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [showcaseEditorOffsetTop, setShowcaseEditorOffsetTop] = useState(0);
  const [showcaseEditorFloatingStyle, setShowcaseEditorFloatingStyle] = useState<CSSProperties | null>(null);
  const [showcaseDrafts, setShowcaseDrafts] = useState<Record<string, SpaceShowcaseItemDraft>>({});
  const [showcaseActionStates, setShowcaseActionStates] =
    useState<Record<string, SpaceShowcaseActionState>>({});
  const baseShowcaseGroups = useMemo<SpaceShowcaseGroup[]>(
    () => createShowcaseGroupsFromBangumiCollections(bangumiCollections),
    [bangumiCollections],
  );
  const showcaseGroups = useMemo<SpaceShowcaseGroup[]>(
    () => applyShowcaseEdits(baseShowcaseGroups, showcaseEdits),
    [baseShowcaseGroups, showcaseEdits],
  );
  const activeSpaceShelf =
    showcaseGroups.find((group) => group.id === spaceShelfTab) ??
    showcaseGroups[0] ?? {
      id: "games",
      label: "游戏",
      items: [],
    };
  const [spaceCollectionStatus, setSpaceCollectionStatus] = useState<SpaceCollectionStatus>(() =>
    findPreferredCollectionStatus(activeSpaceShelf.items),
  );
  const [showcasePager, setShowcasePager] = useState<PagerState>(() => createPagerState(20));
  const [spaceActivePage, setSpaceActivePage] = useState<SpaceSidebarPageKey>("profile");
  const [isProfileEditorCollapsed, setIsProfileEditorCollapsed] = useState(true);
  const isViewingPublicProfile = Boolean(viewingPublicProfileUsername);
  const viewingProfileLabel = viewingPublicProfileUsername ? `@${viewingPublicProfileUsername}` : "当前账号";
  const canManageBangumiImport = canUseBangumiImport && !isViewingPublicProfile;
  const activeSidebarSection = spaceSidebarSectionFromPage(spaceActivePage);
  const spaceSidebarSections: WorkspaceSidebarSection[] = SPACE_SIDEBAR_SECTIONS.reduce<WorkspaceSidebarSection[]>(
    (result, section) => {
      const visibleChildren = section.children.filter(
        (child) => !isViewingPublicProfile || PUBLIC_PROFILE_VISIBLE_PAGES.has(child.id),
      );
      if (!visibleChildren.length) {
        return result;
      }

      result.push({
        id: section.id,
        kicker: section.kicker,
        title: isViewingPublicProfile
          ? section.id === "identity"
            ? `${viewingProfileLabel} 主页`
            : section.id === "creation"
              ? "内容浏览"
              : "社交归档"
          : section.title,
        description: isViewingPublicProfile
          ? section.id === "identity"
            ? `查看 ${viewingProfileLabel} 的基础资料与作品展示。`
            : section.id === "creation"
              ? `查看 ${viewingProfileLabel} 的日志区。`
              : `查看 ${viewingProfileLabel} 的好友关系。`
          : section.description,
        items: visibleChildren.map((child) => ({
          id: child.id,
          label:
            isViewingPublicProfile && child.id === "profile"
              ? `${viewingProfileLabel} 资料卡`
              : isViewingPublicProfile && child.id === "journal"
                ? `${viewingProfileLabel} 日志`
                : child.label,
          icon: SPACE_PAGE_ICONS[child.id],
        })),
      });
      return result;
    },
    [],
  );
  const activeSpaceSectionTitle =
    spaceSidebarSections.find((section) => section.id === activeSidebarSection)?.title ?? "空间主控";
  const activeSpacePageLabel =
    spaceSidebarSections
      .flatMap((section) => section.items)
      .find((item) => item.id === spaceActivePage)?.label ?? "个人资料卡";
  const spaceIDEditable = displayProfile?.space_id_editable !== false;
  const [spaceFriends, setSpaceFriends] = useState<SpaceFriend[]>(() => {
    const storedFriends = readStoredSpaceFriends();
    return storedFriends ?? createDefaultSpaceFriends();
  });
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<ApiFriendRequest[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<ApiFriendRequest[]>([]);
  const [spaceFriendsLoading, setSpaceFriendsLoading] = useState(false);
  const [spaceFriendForm, setSpaceFriendForm] = useState<SpaceFriendFormState>(INITIAL_SPACE_FRIEND_FORM);
  const [spaceFriendActionState, setSpaceFriendActionState] = useState<SpaceFriendActionState>({
    pending: false,
    error: "",
    success: "",
  });
  const spaceCapsules = createSpaceCapsules(spaceLogEntries, isViewingPublicProfile ? [] : bangumiJobs);
  const spaceCollectionStatusCounts = SPACE_COLLECTION_STATUS_META.map((meta) => ({
    ...meta,
    count: activeSpaceShelf.items.filter((item) => item.collectionStatus === meta.id).length,
  }));
  const filteredSpaceShelfItems = useMemo(
    () => activeSpaceShelf.items.filter((item) => item.collectionStatus === spaceCollectionStatus),
    [activeSpaceShelf.items, spaceCollectionStatus],
  );
  const pagedSpaceShelfItems = useMemo(() => {
    const start = Math.max(showcasePager.page - 1, 0) * showcasePager.pageSize;
    return filteredSpaceShelfItems.slice(start, start + showcasePager.pageSize);
  }, [filteredSpaceShelfItems, showcasePager.page, showcasePager.pageSize]);
  const expandedShowcaseItem = useMemo(
    () => filteredSpaceShelfItems.find((item) => Boolean(expandedShowcaseItemIDs[item.id])) ?? null,
    [expandedShowcaseItemIDs, filteredSpaceShelfItems],
  );
  const expandedShowcaseDraft = useMemo<SpaceShowcaseItemDraft | null>(() => {
    if (!expandedShowcaseItem) {
      return null;
    }
    return showcaseDrafts[expandedShowcaseItem.id] || createShowcaseItemDraft(expandedShowcaseItem);
  }, [expandedShowcaseItem, showcaseDrafts]);
  const expandedShowcaseActionState = expandedShowcaseItem
    ? showcaseActionStates[expandedShowcaseItem.id]
    : undefined;

  function handleShowcaseEditorClose(): void {
    setExpandedShowcaseItemIDs({});
  }

  useEffect(() => {
    if (!expandedShowcaseItem) {
      setShowcaseEditorOffsetTop(0);
      setShowcaseEditorFloatingStyle(null);
      return;
    }

    const syncEditorOffset = () => {
      const gridElement = showcaseGridRef.current;
      const cardElement = showcaseCardRefs.current[expandedShowcaseItem.id];
      if (!gridElement || !cardElement) {
        return;
      }

      const cardRect = cardElement.getBoundingClientRect();
      const gridRect = gridElement.getBoundingClientRect();
      const canFloatByCard = typeof window !== "undefined" && window.innerWidth > 900;

      if (!canFloatByCard) {
        const nextOffset = Math.max(Math.round(cardRect.top - gridRect.top), 0);
        setShowcaseEditorOffsetTop((current) => (current === nextOffset ? current : nextOffset));
        setShowcaseEditorFloatingStyle(null);
        return;
      }

      const margin = 12;
      const panelWidth = Math.min(360, Math.max(280, window.innerWidth - margin * 2));
      let nextLeft = cardRect.right + 12;
      if (nextLeft + panelWidth > window.innerWidth - margin) {
        nextLeft = cardRect.left - panelWidth - 12;
      }
      nextLeft = Math.min(Math.max(nextLeft, margin), window.innerWidth - panelWidth - margin);
      const nextTop = Math.min(Math.max(cardRect.top - 4, 78), Math.max(78, window.innerHeight - 280));

      setShowcaseEditorOffsetTop((current) => (current === 0 ? current : 0));
      setShowcaseEditorFloatingStyle((current) => {
        if (
          current &&
          current.top === Math.round(nextTop) &&
          current.left === Math.round(nextLeft) &&
          current.width === Math.round(panelWidth)
        ) {
          return current;
        }
        return {
          top: Math.round(nextTop),
          left: Math.round(nextLeft),
          width: Math.round(panelWidth),
        };
      });
    };

    syncEditorOffset();

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("resize", syncEditorOffset);
    window.addEventListener("scroll", syncEditorOffset, true);
    return () => {
      window.removeEventListener("resize", syncEditorOffset);
      window.removeEventListener("scroll", syncEditorOffset, true);
    };
  }, [expandedShowcaseItem?.id, pagedSpaceShelfItems]);

  useEffect(() => {
    setSpaceCollectionStatus((current) => {
      if (activeSpaceShelf.items.some((item) => item.collectionStatus === current)) {
        return current;
      }

      return findPreferredCollectionStatus(activeSpaceShelf.items);
    });
  }, [activeSpaceShelf]);

  useEffect(() => {
    setShowcasePager((current) => {
      const total = filteredSpaceShelfItems.length;
      const totalPages = total > 0 ? Math.ceil(total / current.pageSize) : 0;
      const nextPage = totalPages > 0 ? Math.min(current.page, totalPages) : 1;
      if (current.total === total && current.totalPages === totalPages && current.page === nextPage) {
        return current;
      }
      return {
        ...current,
        page: nextPage,
        total,
        totalPages,
      };
    });
  }, [filteredSpaceShelfItems.length]);

  useEffect(() => {
    if (!isViewingPublicProfile) {
      return;
    }

    if (!PUBLIC_PROFILE_VISIBLE_PAGES.has(spaceActivePage)) {
      setSpaceActivePage("profile");
    }
  }, [isViewingPublicProfile, spaceActivePage]);

  useEffect(() => {
    setShowcasePager((current) => {
      if (current.page === 1) {
        return current;
      }
      return {
        ...current,
        page: 1,
      };
    });
  }, [spaceShelfTab, spaceCollectionStatus]);

  useEffect(() => {
    setExpandedShowcaseItemIDs((current) => {
      const expandedID = Object.entries(current).find(([, expanded]) => expanded)?.[0];
      if (!expandedID) {
        return current;
      }
      if (filteredSpaceShelfItems.some((item) => item.id === expandedID)) {
        return current;
      }
      return {};
    });
  }, [filteredSpaceShelfItems]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session) {
      window.localStorage.removeItem(SPACE_SHOWCASE_EDITS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SPACE_SHOWCASE_EDITS_STORAGE_KEY, JSON.stringify(showcaseEdits));
  }, [session, showcaseEdits]);

  useEffect(() => {
    if (session) {
      setShowcaseEdits({});
    }
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isViewingPublicProfile) {
      return;
    }

    if (session) {
      window.localStorage.removeItem(SPACE_FRIENDS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SPACE_FRIENDS_STORAGE_KEY, JSON.stringify(spaceFriends));
  }, [isViewingPublicProfile, session, spaceFriends]);

  async function refreshFriendWorkspace(accessToken: string): Promise<void> {
    const [friendsResult, incomingResult, outgoingResult] = await Promise.all([
      fetchMyFriends(accessToken, { page: 1, pageSize: 200 }),
      fetchIncomingFriendRequests(accessToken, { page: 1, pageSize: 200 }),
      fetchOutgoingFriendRequests(accessToken, { page: 1, pageSize: 200 }),
    ]);

    setSpaceFriends(
      friendsResult.items.map((item) => mapFriendSummaryToSpaceFriend(item)),
    );
    setIncomingFriendRequests(incomingResult.items);
    setOutgoingFriendRequests(outgoingResult.items);
  }

  useEffect(() => {
    let active = true;

    if (isViewingPublicProfile) {
      setIncomingFriendRequests([]);
      setOutgoingFriendRequests([]);

      const targetUsername = viewingPublicProfileUsername?.trim();
      if (!targetUsername) {
        setSpaceFriends([]);
        setSpaceFriendsLoading(false);
        return () => {
          active = false;
        };
      }

      setSpaceFriendsLoading(true);
      setSpaceFriendActionState({
        pending: false,
        error: "",
        success: "",
      });
      void fetchUserFriends(targetUsername, { page: 1, pageSize: 200 })
        .then((result) => {
          if (!active) {
            return;
          }
          setSpaceFriends(result.items.map((item) => mapFriendSummaryToSpaceFriend(item)));
          setSpaceFriendsLoading(false);
        })
        .catch((error) => {
          if (!active) {
            return;
          }
          setSpaceFriends([]);
          setSpaceFriendsLoading(false);
          setSpaceFriendActionState({
            pending: false,
            error: error instanceof Error ? error.message : "加载该用户好友列表失败，请稍后重试。",
            success: "",
          });
        });

      return () => {
        active = false;
      };
    }

    if (!session?.accessToken) {
      setSpaceFriends(() => {
        const storedFriends = readStoredSpaceFriends();
        return storedFriends ?? createDefaultSpaceFriends();
      });
      setIncomingFriendRequests([]);
      setOutgoingFriendRequests([]);
      setSpaceFriendsLoading(false);
      return () => {
        active = false;
      };
    }

    setSpaceFriendsLoading(true);
    void refreshFriendWorkspace(session.accessToken)
      .then(() => {
        if (!active) {
          return;
        }
        setSpaceFriendsLoading(false);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setSpaceFriendsLoading(false);
        setSpaceFriendActionState({
          pending: false,
          error: error instanceof Error ? error.message : "加载好友信息失败，请稍后重试。",
          success: "",
        });
      });

    return () => {
      active = false;
    };
  }, [isViewingPublicProfile, session, viewingPublicProfileUsername]);

  function handleSpaceFriendFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void {
    const { name, value } = event.target;

    setSpaceFriendForm((current) => {
      if (name === "status" && isSpaceFriendStatus(value)) {
        return {
          ...current,
          status: value,
        };
      }

      if (name === "username" || name === "note") {
        return {
          ...current,
          [name]: value,
        };
      }

      return current;
    });
  }

  async function handleSpaceFriendSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const username = spaceFriendForm.username.trim();
    const note = spaceFriendForm.note.trim();
    if (!username) {
      setSpaceFriendActionState({
        pending: false,
        error: "请先输入好友用户名。",
        success: "",
      });
      return;
    }

    if (spaceFriends.some((friend) => friend.username.toLowerCase() === username.toLowerCase())) {
      setSpaceFriendActionState({
        pending: false,
        error: `@${username} 已在好友列表中。`,
        success: "",
      });
      return;
    }

    if (
      outgoingFriendRequests.some(
        (request) => request.receiver_username.toLowerCase() === username.toLowerCase(),
      )
    ) {
      setSpaceFriendActionState({
        pending: false,
        error: `已向 @${username} 发送过好友申请，请等待对方审核。`,
        success: "",
      });
      return;
    }

    setSpaceFriendActionState({
      pending: true,
      error: "",
      success: "",
    });

    if (session?.accessToken) {
      try {
        const request = await createFriendRequest(session.accessToken, {
          username,
          message: note || undefined,
        });

        await refreshFriendWorkspace(session.accessToken);
        setSpaceFriendForm(INITIAL_SPACE_FRIEND_FORM);
        setSpaceFriendActionState({
          pending: false,
          error: "",
          success: `已向 @${request.receiver_username} 发送好友申请，等待对方审核。`,
        });
      } catch (error) {
        setSpaceFriendActionState({
          pending: false,
          error: error instanceof Error ? error.message : "发送好友申请失败，请稍后再试。",
          success: "",
        });
      }
      return;
    }

    try {
      const profile = await fetchPublicProfile(username);
      const normalizedUsername = profile.username.trim();
      const normalizedName = (profile.nickname || profile.username).trim() || profile.username;
      const nextFriend: SpaceFriend = {
        avatarURL: (profile.avatar_url || "").trim(),
        id: createSpaceFriendID(),
        isReal: true,
        name: normalizedName,
        note: note || `真实账号好友，已校验 /users/${normalizedUsername}。`,
        status: spaceFriendForm.status,
        username: normalizedUsername,
      };

      setSpaceFriends((current) => {
        const deduped = current.filter(
          (friend) => friend.username.toLowerCase() !== normalizedUsername.toLowerCase(),
        );
        return [nextFriend, ...deduped];
      });
      setSpaceFriendForm(INITIAL_SPACE_FRIEND_FORM);
      setSpaceFriendActionState({
        pending: false,
        error: "",
        success: `已添加真实好友 @${normalizedUsername}（游客本地模式）。`,
      });
    } catch (error) {
      setSpaceFriendActionState({
        pending: false,
        error: `未找到用户 @${username}，请检查用户名是否正确。`,
        success: "",
      });
      console.error(error);
    }
  }

  function handleRotateSpaceFriendStatus(friendID: string): void {
    if (session?.accessToken) {
      setSpaceFriendActionState({
        pending: false,
        error: "",
        success: "真实好友状态由对方在线状态决定，当前版本暂不支持手动改状态。",
      });
      return;
    }

    setSpaceFriends((current) =>
      current.map((friend) =>
        friend.id === friendID
          ? {
              ...friend,
              status: getNextSpaceFriendStatus(friend.status),
            }
          : friend,
      ),
    );
    setSpaceFriendActionState((current) => ({
      ...current,
      error: "",
      success: "",
    }));
  }

  function handleRemoveSpaceFriend(friendID: string): void {
    if (session?.accessToken) {
      setSpaceFriendActionState({
        pending: false,
        error: "当前版本暂不支持直接删除真实好友关系。",
        success: "",
      });
      return;
    }

    setSpaceFriends((current) => current.filter((friend) => friend.id !== friendID));
    setSpaceFriendActionState({
      pending: false,
      error: "",
      success: "已从空间好友中移除。",
    });
  }

  async function handleViewSpaceFriendProfile(friend: SpaceFriend): Promise<void> {
    const username = friend.username.trim();
    if (!username) {
      setSpaceFriendActionState({
        pending: false,
        error: "该好友缺少用户名，无法打开主页。",
        success: "",
      });
      return;
    }

    setSpaceFriendActionState({
      pending: true,
      error: "",
      success: "",
    });

    try {
      const profile = await fetchPublicProfile(username);
      const normalizedUsername = profile.username.trim();
      const normalizedName = (profile.nickname || profile.username).trim() || profile.username;
      const normalizedAvatarURL = (profile.avatar_url || "").trim();

      setSpaceFriends((current) =>
        current.map((item) =>
          item.id === friend.id
            ? {
                ...item,
                avatarURL: normalizedAvatarURL,
                isReal: true,
                name: normalizedName,
                username: normalizedUsername,
              }
            : item,
        ),
      );
      setSpaceFriendActionState({
        pending: false,
        error: "",
        success: `已打开 @${normalizedUsername} 的主页。`,
      });
      onNavigate(`/users/${encodeURIComponent(normalizedUsername)}`);
    } catch (error) {
      setSpaceFriendActionState({
        pending: false,
        error: `未找到 @${username} 的主页，请先确认用户名是否真实存在。`,
        success: "",
      });
      console.error(error);
    }
  }

  async function handleReviewIncomingFriendRequest(
    request: ApiFriendRequest,
    action: "approve" | "reject",
  ): Promise<void> {
    if (!session?.accessToken) {
      setSpaceFriendActionState({
        pending: false,
        error: "请先登录后再处理好友申请。",
        success: "",
      });
      return;
    }

    setSpaceFriendActionState({
      pending: true,
      error: "",
      success: "",
    });

    try {
      await reviewFriendRequest(session.accessToken, request.request_id, { action });
      await refreshFriendWorkspace(session.accessToken);
      setSpaceFriendActionState({
        pending: false,
        error: "",
        success:
          action === "approve"
            ? `已通过 @${request.requester_username} 的好友申请。`
            : `已拒绝 @${request.requester_username} 的好友申请。`,
      });
    } catch (error) {
      setSpaceFriendActionState({
        pending: false,
        error: error instanceof Error ? error.message : "处理好友申请失败，请稍后再试。",
        success: "",
      });
    }
  }

  function handleResetSpaceFriends(): void {
    if (session?.accessToken) {
      setSpaceFriendActionState({
        pending: true,
        error: "",
        success: "",
      });
      void refreshFriendWorkspace(session.accessToken)
        .then(() => {
          setSpaceFriendActionState({
            pending: false,
            error: "",
            success: "已刷新好友关系与申请列表。",
          });
        })
        .catch((error) => {
          setSpaceFriendActionState({
            pending: false,
            error: error instanceof Error ? error.message : "刷新失败，请稍后重试。",
            success: "",
          });
        });
      return;
    }

    setSpaceFriends(createDefaultSpaceFriends());
    setSpaceFriendActionState({
      pending: false,
      error: "",
      success: "已清空本地好友列表。",
    });
  }

  function updateShowcaseItemEdit(
    itemID: string,
    patch: Partial<SpaceShowcaseItemEdit>,
  ): void {
    setShowcaseEdits((current) => {
      const currentEdit = current[itemID] || {};
      const merged: SpaceShowcaseItemEdit = {
        ...currentEdit,
        ...patch,
      };

      const normalizedStatus = isSpaceCollectionStatus(merged.collectionStatus)
        ? merged.collectionStatus
        : undefined;
      const normalizedScore = normalizeMyScore(merged.myScore);
      const normalizedComment =
        typeof merged.myComment === "string" && merged.myComment.trim()
          ? merged.myComment.trim().slice(0, 200)
          : undefined;

      if (!normalizedStatus && typeof normalizedScore !== "number" && !normalizedComment) {
        const { [itemID]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [itemID]: {
          collectionStatus: normalizedStatus,
          myScore: normalizedScore,
          myComment: normalizedComment,
        },
      };
    });
  }

  function handleShowcaseEditorToggle(item: SpaceShelfItem): void {
    setExpandedShowcaseItemIDs((current) => (current[item.id] ? {} : { [item.id]: true }));
    setShowcaseDrafts((current) => ({
      ...current,
      [item.id]: current[item.id] || createShowcaseItemDraft(item),
    }));
  }

  function setShowcaseActionState(itemID: string, next: SpaceShowcaseActionState): void {
    setShowcaseActionStates((current) => ({
      ...current,
      [itemID]: next,
    }));
  }

  function handleShowcaseDraftStatusChange(item: SpaceShelfItem, status: SpaceCollectionStatus): void {
    setShowcaseDrafts((current) => ({
      ...current,
      [item.id]: {
        ...(current[item.id] || createShowcaseItemDraft(item)),
        collectionStatus: status,
      },
    }));
    setShowcaseActionState(item.id, { pending: false, error: "", success: "" });
  }

  function handleShowcaseDraftScoreChange(item: SpaceShelfItem, value: string): void {
    const parsed = Number.parseInt(value, 10);
    setShowcaseDrafts((current) => ({
      ...current,
      [item.id]: {
        ...(current[item.id] || createShowcaseItemDraft(item)),
        myScore: Number.isInteger(parsed) ? parsed : null,
      },
    }));
    setShowcaseActionState(item.id, { pending: false, error: "", success: "" });
  }

  function handleShowcaseDraftCommentChange(item: SpaceShelfItem, value: string): void {
    setShowcaseDrafts((current) => ({
      ...current,
      [item.id]: {
        ...(current[item.id] || createShowcaseItemDraft(item)),
        myComment: value.slice(0, 200),
      },
    }));
    setShowcaseActionState(item.id, { pending: false, error: "", success: "" });
  }

  function handleShowcaseDraftReset(item: SpaceShelfItem): void {
    setShowcaseDrafts((current) => ({
      ...current,
      [item.id]: createShowcaseItemDraft(item),
    }));
    setShowcaseActionState(item.id, { pending: false, error: "", success: "" });
  }

  async function handleShowcaseDraftSave(item: SpaceShelfItem): Promise<void> {
    const currentDraft = showcaseDrafts[item.id] || createShowcaseItemDraft(item);
    const normalizedComment = currentDraft.myComment.trim().slice(0, 200);

    setShowcaseActionState(item.id, {
      pending: true,
      error: "",
      success: "",
    });

    if (session && item.collectionID) {
      try {
        const updated = await updateMyBangumiCollection(session.accessToken, item.collectionID, {
          collection_status: currentDraft.collectionStatus,
          my_score: currentDraft.myScore,
          my_comment: normalizedComment,
        });
        const nextStatus = isSpaceCollectionStatus(updated.collection_status)
          ? updated.collection_status
          : currentDraft.collectionStatus;
        const nextScore = typeof updated.my_score === "number" ? updated.my_score : undefined;
        const nextComment = typeof updated.my_comment === "string" ? updated.my_comment.trim() : "";

        updateShowcaseItemEdit(item.id, {
          collectionStatus: nextStatus,
          myScore: nextScore,
          myComment: nextComment || undefined,
        });
        setShowcaseDrafts((current) => ({
          ...current,
          [item.id]: {
            collectionStatus: nextStatus,
            myScore: typeof nextScore === "number" ? nextScore : null,
            myComment: nextComment,
          },
        }));
        setShowcaseActionState(item.id, {
          pending: false,
          error: "",
          success: "已保存到后端。",
        });
        return;
      } catch (error) {
        setShowcaseActionState(item.id, {
          pending: false,
          error: error instanceof Error ? error.message : "保存失败，请稍后重试。",
          success: "",
        });
        return;
      }
    }

    updateShowcaseItemEdit(item.id, {
      collectionStatus: currentDraft.collectionStatus,
      myScore: currentDraft.myScore ?? undefined,
      myComment: normalizedComment || undefined,
    });
    setShowcaseDrafts((current) => ({
      ...current,
      [item.id]: {
        ...currentDraft,
        myComment: normalizedComment,
      },
    }));
    setShowcaseActionState(item.id, {
      pending: false,
      error: "",
      success: "已保存。",
    });
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <WorkspaceSidebar
        activeItemId={spaceActivePage}
        footerAvatarLabel={displayProfile?.nickname || displayProfile?.username || viewingProfileLabel}
        footerAvatarUrl={displayProfile?.avatar_url || undefined}
        footerBadge={displayProfile?.verified ? "已认证" : isViewingPublicProfile ? "公开页" : "未认证"}
        footerSubtitle={
          displayProfile
            ? `@${displayProfile.username}${displayProfile.signature ? ` · ${displayProfile.signature}` : ""}`
            : "空间资料加载中"
        }
        footerTitle={displayProfile?.nickname || viewingProfileLabel}
        headerAvatarLabel={displayProfile?.nickname || displayProfile?.username || viewingProfileLabel}
        headerAvatarUrl={displayProfile?.avatar_url || undefined}
        headerBadge={isViewingPublicProfile ? "访客视图" : "工作台"}
        headerKicker={isViewingPublicProfile ? `${viewingProfileLabel} Space` : "My Space"}
        headerSubtitle={`${activeSpaceSectionTitle} · ${activeSpacePageLabel}`}
        headerTitle={isViewingPublicProfile ? `${viewingProfileLabel} 的空间` : "个人空间工作台"}
        onItemSelect={(itemId) => setSpaceActivePage(itemId as SpaceSidebarPageKey)}
        sections={spaceSidebarSections}
        tone="space"
      />

      <div className="grid gap-4">
        <section style={{ display: spaceActivePage === "profile" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm space-master-panel">
            {viewingPublicProfileUsername ? (
              <div className="space-visitor-banner">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">访客模式</p>
                  <strong>正在查看 @{viewingPublicProfileUsername} 的主页</strong>
                </div>
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => onNavigate("/space")}>
                  返回我的空间
                </button>
              </div>
            ) : null}
            {displayProfile ? (
              <>
                <div className="space-master-panel__identity">
                  {displayProfile.avatar_url ? (
                    <img
                      alt={displayProfile.nickname}
                      className="h-14 w-14 rounded-full border border-[color:var(--line-soft)] object-cover bg-white/40"
                      src={displayProfile.avatar_url}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full border border-[color:var(--line-soft)] object-cover bg-white/40 inline-flex items-center justify-center font-semibold text-[color:var(--text-main)]">
                      {getAvatarFallback(displayProfile)}
                    </div>
                  )}
                  <div className="space-master-panel__copy">
                    <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{isViewingPublicProfile ? `${viewingProfileLabel} 资料卡` : "个人资料卡"}</p>
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
                {canEditProfile ? (
                  <form
                    className={`grid gap-3 space-profile-editor ${isProfileEditorCollapsed ? "space-profile-editor--collapsed" : ""}`}
                    onSubmit={(event) => void onProfileSubmit(event)}
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">资料编辑</p>
                        <h3>空间身份设置</h3>
                      </div>
                      <div className="space-profile-editor__head-actions">
                        <button
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => setIsProfileEditorCollapsed((current) => !current)}
                        >
                          {isProfileEditorCollapsed ? "展开编辑" : "收起"}
                        </button>
                        {!isProfileEditorCollapsed ? (
                          <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={profileActionState.pending}>
                            {profileActionState.pending ? "保存中..." : "保存资料"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {!isProfileEditorCollapsed ? (
                      <>
                        <div className="space-profile-editor__grid">
                          <label>
                            <span>空间 ID</span>
                            <input
                              name="username"
                              type="text"
                              value={profileForm.username}
                              onChange={onProfileFieldChange}
                              placeholder="例如：demo_super_admin"
                              disabled={!spaceIDEditable}
                              required
                            />
                          </label>
                          <label>
                            <span>个性签名</span>
                            <input
                              name="signature"
                              type="text"
                              value={profileForm.signature}
                              onChange={onProfileFieldChange}
                              placeholder="写一句固定展示在资料卡上的签名"
                            />
                          </label>
                          <label>
                            <span>头像地址</span>
                            <input
                              name="avatar_url"
                              type="url"
                              value={profileForm.avatar_url}
                              onChange={onProfileFieldChange}
                              placeholder="https://example.com/avatar.png"
                            />
                          </label>
                          <label>
                            <span>显示昵称</span>
                            <input
                              name="nickname"
                              type="text"
                              value={profileForm.nickname}
                              onChange={onProfileFieldChange}
                              placeholder="用于主卡标题展示"
                            />
                          </label>
                        </div>
                        <label>
                          <span>个人简介</span>
                          <textarea
                            name="bio"
                            rows={3}
                            value={profileForm.bio}
                            onChange={onProfileFieldChange}
                            placeholder="写一段空间简介"
                          />
                        </label>
                        <div className="space-profile-editor__preview">
                          {profileForm.avatar_url.trim() ? (
                            <img alt="头像预览" className="h-14 w-14 rounded-full border border-[color:var(--line-soft)] object-cover bg-white/40" src={profileForm.avatar_url} />
                          ) : (
                            <div className="h-14 w-14 rounded-full border border-[color:var(--line-soft)] object-cover bg-white/40 inline-flex items-center justify-center font-semibold text-[color:var(--text-main)]">
                              {getAvatarFallback(displayProfile)}
                            </div>
                          )}
                          <p className="text-sm text-[color:var(--text-muted)]">
                            预览：@{profileForm.username || displayProfile.username}
                            {profileForm.signature.trim() ? ` · ${profileForm.signature.trim()}` : ""}
                          </p>
                        </div>
                        {!spaceIDEditable ? (
                          <p className="text-sm text-[color:var(--text-muted)]">空间 ID 仅允许修改一次，当前账号已用完修改次数。</p>
                        ) : null}
                        {profileActionState.error ? <p className="text-sm text-rose-500/90">{profileActionState.error}</p> : null}
                        {profileActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{profileActionState.success}</p> : null}
                      </>
                    ) : null}
                  </form>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">{profileError || "空间资料加载中。"}</p>
            )}
          </article>
          {!isViewingPublicProfile ? (
            <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm space-auth-panel">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">账号会话</p>
                <h2>{session ? "当前已登录" : "登录 / 注册"}</h2>
              </div>
              <StatusChip tone={session ? "success" : "neutral"}>
                {session ? "已认证会话" : "游客状态"}
              </StatusChip>
            </div>

            {session ? (
              <div className="grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4">
                <p className="text-sm text-[color:var(--text-muted)]">当前账号会话已生效，空间、收藏导入与投稿能力按账号权限开放。</p>
                {profileError ? <p className="text-sm text-rose-500/90">{profileError}</p> : null}
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={onLogout}>
                  退出当前会话
                </button>
              </div>
            ) : (
              <div className="space-auth-grid">
                <form className="grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4" onSubmit={(event) => void onLoginSubmit(event)}>
                  <p className="text-sm text-[color:var(--text-muted)]">登录后会同步当前空间会话。</p>
                  <label className="grid gap-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">账号</span>
                    <input
                      autoComplete="username"
                      className="w-full rounded-lg border border-[color:var(--line-soft)] bg-white/75 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--surface-tint-blue)]"
                      name="account"
                      onChange={onAuthFieldChange}
                      placeholder="用户名 / 学号 / 邮箱"
                      value={authForm.account}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">密码</span>
                    <input
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-[color:var(--line-soft)] bg-white/75 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--surface-tint-blue)]"
                      name="password"
                      onChange={onAuthFieldChange}
                      placeholder="输入账号密码"
                      type="password"
                      value={authForm.password}
                    />
                  </label>
                  {loginState.error ? <p className="text-sm text-rose-500/90">{loginState.error}</p> : null}
                  <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={loginState.pending} type="submit">
                    {loginState.pending ? "登录中..." : "登录"}
                  </button>
                </form>

                <form className="grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4" onSubmit={(event) => void onRegisterSubmit(event)}>
                  <p className="text-sm text-[color:var(--text-muted)]">注册完成后可直接用账号登录。</p>
                  <label className="grid gap-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">学号</span>
                    <input
                      autoComplete="off"
                      className="w-full rounded-lg border border-[color:var(--line-soft)] bg-white/75 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--surface-tint-blue)]"
                      name="student_id"
                      onChange={onRegisterFieldChange}
                      placeholder="例如：20260001"
                      value={registerForm.student_id}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">用户名</span>
                    <input
                      autoComplete="username"
                      className="w-full rounded-lg border border-[color:var(--line-soft)] bg-white/75 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--surface-tint-blue)]"
                      name="username"
                      onChange={onRegisterFieldChange}
                      placeholder="3-32 位字母/数字/下划线"
                      value={registerForm.username}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">密码</span>
                    <input
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-[color:var(--line-soft)] bg-white/75 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--surface-tint-blue)]"
                      name="password"
                      onChange={onRegisterFieldChange}
                      placeholder="设置登录密码"
                      type="password"
                      value={registerForm.password}
                    />
                  </label>
                  {registerState.error ? <p className="text-sm text-rose-500/90">{registerState.error}</p> : null}
                  {registerState.success ? <p className="text-sm text-[color:var(--text-muted)]">{registerState.success}</p> : null}
                  <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" disabled={registerState.pending} type="submit">
                    {registerState.pending ? "注册中..." : "注册"}
                  </button>
                </form>
              </div>
            )}
            </article>
          ) : null}
        </section>

        <section style={{ display: spaceActivePage === "progress" && !isViewingPublicProfile ? undefined : "none" }}>
          {forumProgressPanel}
        </section>

        <section style={{ display: spaceActivePage === "profile" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm space-showcase-panel">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">作品展示</p>
                <h2>Bangumi 风格收藏页</h2>
              </div>
              <StatusChip tone="accent">{activeSpaceShelf.label}</StatusChip>
            </div>
            <div className="space-shelf-tabs space-bgm-media-tabs">
              {showcaseGroups.map((group) => (
                <button
                  className={`space-shelf-tab ${group.id === activeSpaceShelf.id ? "space-shelf-tab--active" : ""}`}
                  key={group.id}
                  type="button"
                  onClick={() => onSpaceShelfTabChange(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
            {bangumiCollectionsError ? <p className="text-sm text-rose-500/90">{bangumiCollectionsError}</p> : null}
            <div className="space-bgm-status-tabs">
              {spaceCollectionStatusCounts.map((statusItem) => (
                <button
                  className={`space-bgm-status-tab ${
                    spaceCollectionStatus === statusItem.id ? "space-bgm-status-tab--active" : ""
                  }`}
                  key={statusItem.id}
                  type="button"
                  onClick={() => setSpaceCollectionStatus(statusItem.id)}
                >
                  <span>{statusItem.label}</span>
                  <strong>{statusItem.count}</strong>
                </button>
              ))}
            </div>
            <div
              className={`space-bgm-collection-layout ${
                canEditShowcase && expandedShowcaseItem && expandedShowcaseDraft
                  ? "space-bgm-collection-layout--editor-open"
                  : ""
              }`}
            >
              <div className="space-bgm-collection-grid" ref={showcaseGridRef}>
                {pagedSpaceShelfItems.map((item, index) => {
                  const isEditorExpanded = Boolean(expandedShowcaseItemIDs[item.id]);
                  const startIndex = Math.max(showcasePager.page - 1, 0) * showcasePager.pageSize;
                  return (
                    <article
                      className="space-bgm-item"
                      key={item.id}
                      ref={(node) => {
                        showcaseCardRefs.current[item.id] = node;
                      }}
                    >
                      <div className="space-bgm-item__cover">
                        <img alt={item.title} src={item.image} />
                        <span>{String(startIndex + index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="space-bgm-item__copy">
                        <strong>{item.title}</strong>
                        {item.originalTitle ? <p>{item.originalTitle}</p> : null}
                        <div className="space-bgm-item__meta">
                          <span>
                            Bangumi: {item.score ? `★${item.score.toFixed(1)}` : "★--"}
                            {typeof item.rank === "number" ? ` · Rank #${item.rank}` : ""}
                          </span>
                          <span>
                            {item.releaseYear || "--"} · {toMediaTypeLabel(activeSpaceShelf.id)}
                            {"episodes" in item && typeof item.episodes === "number" ? ` · ${item.episodes}话` : ""}
                            {"pages" in item && typeof item.pages === "number" ? ` · ${item.pages}页` : ""}
                            {"hours" in item && typeof item.hours === "string" && item.hours ? ` · ${item.hours}` : ""}
                          </span>
                          <span>收藏状态：{toCollectionStatusLabel(item.collectionStatus)}</span>
                          <span>收藏评分：{typeof item.myScore === "number" ? `${item.myScore} / 10` : "--"}</span>
                        </div>
                        <small>{item.note}</small>
                        {item.sourceURL ? (
                          <a
                            className="space-bgm-item__source-link"
                            href={item.sourceURL}
                            rel="noreferrer"
                            target="_blank"
                          >
                            查看 Bangumi 原链接
                          </a>
                        ) : null}
                        {item.myComment ? <p className="space-bgm-item__comment">短评：{item.myComment}</p> : null}
                      </div>
                      {canEditShowcase ? (
                        <div className="space-bgm-item__toolbar">
                          <button
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 space-bgm-item__toggle-button"
                            type="button"
                            onClick={() => handleShowcaseEditorToggle(item)}
                          >
                            {isEditorExpanded ? "收起操作" : "展开操作"}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
                {!filteredSpaceShelfItems.length ? (
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {canEditShowcase ? "这个分类下还没有同步条目，可先去 Bangumi 导入页提交任务。" : "这个用户在该分类还没有公开条目。"}
                  </p>
                ) : null}
              </div>
              {canEditShowcase && expandedShowcaseItem && expandedShowcaseDraft ? (
                <div
                  className={`space-bgm-item__editor-dock ${showcaseEditorFloatingStyle ? "space-bgm-item__editor-dock--floating" : ""}`}
                  style={showcaseEditorFloatingStyle ?? (showcaseEditorOffsetTop > 0 ? { marginTop: showcaseEditorOffsetTop } : undefined)}
                >
                  <div className="space-bgm-item__editor space-bgm-item__editor-panel">
                    <div className="space-bgm-item__editor-head">
                      <p className="space-bgm-item__editor-title">正在编辑：{expandedShowcaseItem.title}</p>
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 space-bgm-item__editor-cancel"
                        type="button"
                        onClick={handleShowcaseEditorClose}
                      >
                        退出
                      </button>
                    </div>
                    <div className="space-bgm-item__editor-status">
                      {SPACE_COLLECTION_STATUS_META.map((statusItem) => (
                        <button
                          className={`space-bgm-item__status-chip ${
                            expandedShowcaseDraft.collectionStatus === statusItem.id ? "space-bgm-item__status-chip--active" : ""
                          }`}
                          key={`${expandedShowcaseItem.id}-${statusItem.id}`}
                          type="button"
                          onClick={() => handleShowcaseDraftStatusChange(expandedShowcaseItem, statusItem.id)}
                        >
                          {statusItem.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span>评分</span>
                        <select
                          value={typeof expandedShowcaseDraft.myScore === "number" ? String(expandedShowcaseDraft.myScore) : ""}
                          onChange={(event) => handleShowcaseDraftScoreChange(expandedShowcaseItem, event.target.value)}
                        >
                          <option value="">--</option>
                          {Array.from({ length: 10 }, (_, value) => {
                            const score = value + 1;
                            return (
                              <option key={`${expandedShowcaseItem.id}-score-${score}`} value={score}>
                                {score}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className="grid gap-1.5 md:col-span-2">
                        <span>短评</span>
                        <input
                          type="text"
                          value={expandedShowcaseDraft.myComment}
                          onChange={(event) => handleShowcaseDraftCommentChange(expandedShowcaseItem, event.target.value)}
                          placeholder="写一句短评（最多 200 字）"
                          maxLength={200}
                        />
                      </label>
                    </div>
                    <div className="space-bgm-item__editor-actions">
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => handleShowcaseDraftReset(expandedShowcaseItem)}
                        disabled={Boolean(expandedShowcaseActionState?.pending)}
                      >
                        重置
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => void handleShowcaseDraftSave(expandedShowcaseItem)}
                        disabled={Boolean(expandedShowcaseActionState?.pending)}
                      >
                        {expandedShowcaseActionState?.pending ? "保存中..." : "保存"}
                      </button>
                    </div>
                    {expandedShowcaseActionState?.error ? <p className="text-sm text-rose-500/90">{expandedShowcaseActionState.error}</p> : null}
                    {expandedShowcaseActionState?.success ? <p className="text-sm text-[color:var(--text-muted)]">{expandedShowcaseActionState.success}</p> : null}
                  </div>
                </div>
              ) : null}
            </div>
            <PaginationBar
              pager={showcasePager}
              onPageChange={(page) =>
                setShowcasePager((current) => ({
                  ...current,
                  page,
                }))
              }
              emptyText={canEditShowcase ? "暂无作品条目。" : "该用户暂无公开作品。"}
            />
          </article>
        </section>

        <section style={{ display: spaceActivePage === "journal" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{isViewingPublicProfile ? `${viewingProfileLabel} 日志` : "个人日志"}</p>
                <h2>{isViewingPublicProfile ? `${viewingProfileLabel} 的 Markdown 日志区` : "Markdown 日志区"}</h2>
              </div>
              <StatusChip tone={isViewingPublicProfile ? "neutral" : hasVerifiedSpaceAccess ? "success" : "warn"}>
                {isViewingPublicProfile ? "访客只读" : hasVerifiedSpaceAccess ? "可发布日志" : "需要已认证账号"}
              </StatusChip>
            </div>
            {isViewingPublicProfile ? (
              <p className="text-sm text-[color:var(--text-muted)]">正在浏览 {viewingProfileLabel} 的日志归档，当前模式仅支持阅读。</p>
            ) : !session ? (
              <p className="text-sm text-[color:var(--text-muted)]">登录并通过认证后，可以在这里写个人日志。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="text-sm text-[color:var(--text-muted)]">当前账号还没有日志发布权限，需要通过认证后才能写日志。</p>
            ) : (
              <form className="grid gap-3" onSubmit={(event) => void onArticleSubmit(event)}>
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">空间编辑器</p>
                    <h2>Markdown 日志编辑器</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {articleActionState.success ? <span className="text-sm text-[color:var(--text-muted)]">{articleActionState.success}</span> : null}
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={articleActionState.pending}>
                      {articleActionState.pending ? "发布中..." : "发布日志"}
                    </button>
                  </div>
                </div>

                <label>
                  <span>日志标题</span>
                  <input
                    name="title"
                    type="text"
                    value={articleForm.title}
                    onChange={onArticleFieldChange}
                    placeholder="输入日志标题"
                    required
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label>
                    <span>可见范围</span>
                    <select name="visibility" value={articleForm.visibility} onChange={onArticleFieldChange}>
                      <option value="public">公开</option>
                      <option value="member">仅成员可见</option>
                      <option value="private">仅自己可见</option>
                    </select>
                  </label>
                  <label>
                    <span>摘要</span>
                    <input
                      name="summary"
                      type="text"
                      value={articleForm.summary}
                      onChange={onArticleFieldChange}
                      placeholder="一句话概括日志内容"
                    />
                  </label>
                  <label>
                    <span>标签</span>
                    <input
                      name="tagsText"
                      type="text"
                      value={articleForm.tagsText}
                      onChange={onArticleFieldChange}
                      placeholder="用逗号分隔，例如：日志，收藏，感想"
                    />
                  </label>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <section className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-white/35 p-3">
                    <div className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Markdown 源文本</div>
                    <textarea
                      name="content"
                      rows={14}
                      value={articleForm.content}
                      onChange={onArticleFieldChange}
                      placeholder={"支持 Markdown 与 LaTeX\n例如：\n![](https://example.com/image.png)\n行内 $E=mc^2$\n块级 $$\\int_0^1 x^2\\,dx$$"}
                      required
                    />
                  </section>
                  <section className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-white/35 p-3 bg-[color:var(--surface-card)]">
                    <div className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">实时预览</div>
                    <div className="min-h-[220px] overflow-auto rounded-lg border border-[color:var(--line-soft)] bg-white/55 p-3">
                      {articleForm.content.trim() ? (
                        <RichContent content={articleForm.content} />
                      ) : (
                        <p className="text-sm text-[color:var(--text-muted)]">预览区：输入 Markdown 后会实时显示。</p>
                      )}
                    </div>
                  </section>
                </div>

                <p className="text-sm text-[color:var(--text-muted)]">
                  当前后端还没有独立图片上传接口，所以日志里的图片先通过 Markdown 图片链接插入。
                </p>
                {articleActionState.error ? <p className="text-sm text-rose-500/90">{articleActionState.error}</p> : null}
              </form>
            )}
            <div className="space-log-list">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <strong>最近日志</strong>
                <span>{spaceLogEntries.length} 篇</span>
              </div>
              <div className="grid gap-3">
                {spaceLogEntries.length ? (
                  spaceLogEntries.slice(0, 4).map((article, index) => {
                    const previewImage = pickSpaceLogPreviewImage(article, index);
                    return (
                      <button
                        className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 w-full text-left transition hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] hover:bg-white/80 space-log-card"
                        key={article.id}
                        type="button"
                        onClick={() => onNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                      >
                        <div className="space-log-card__copy">
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <h3>{article.title}</h3>
                            <StatusChip tone="accent">
                              {normalizeVisibilityLabel(article.visibility)}
                            </StatusChip>
                          </div>
                          <p>{excerpt(article.summary || article.content, 120)}</p>
                        </div>
                        <div className="space-log-card__thumb" aria-hidden="true">
                          <img alt="" loading="lazy" src={previewImage} />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-[color:var(--text-muted)]">还没有匹配到这个空间的日志内容。</p>
                )}
              </div>
            </div>
          </article>
        </section>

        <section style={{ display: spaceActivePage === "bangumi" && !isViewingPublicProfile ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Bangumi 导入</p>
                <h2>作品与帐号同步</h2>
              </div>
              <StatusChip tone={canManageBangumiImport ? "accent" : "warn"}>
                {canManageBangumiImport ? "可发起导入" : "需要登录账号"}
              </StatusChip>
            </div>
            {!session ? (
              <p className="text-sm text-[color:var(--text-muted)]">登录后可按作品 ID 导入，或按 Bangumi 登录帐号批量同步收藏。</p>
            ) : !canManageBangumiImport ? (
              <p className="text-sm text-[color:var(--text-muted)]">当前账号无法发起导入，请重新登录后重试。</p>
            ) : (
              <form className="grid gap-3" onSubmit={(event) => void onBangumiImportSubmit(event)}>
                <label>
                  <span>同步模式</span>
                  <select name="sync_mode" value={bangumiForm.sync_mode} onChange={onBangumiFieldChange}>
                    <option value="subject_ids">条目 ID 导入</option>
                    <option value="account">登录帐号批量同步</option>
                  </select>
                </label>
                {bangumiForm.sync_mode === "account" ? (
                  <label>
                    <span>Bangumi 用户名</span>
                    <input
                      name="bangumi_username"
                      type="text"
                      value={bangumiForm.bangumi_username}
                      onChange={onBangumiFieldChange}
                      placeholder="例如：shiori_1"
                    />
                  </label>
                ) : (
                  <label>
                    <span>作品 ID</span>
                    <input
                      name="subjectIdsText"
                      type="text"
                      value={bangumiForm.subjectIdsText}
                      onChange={onBangumiFieldChange}
                      placeholder="例如：12345, 67890"
                    />
                  </label>
                )}
                {bangumiForm.sync_mode === "account" ? (
                  <label>
                    <span>最大同步数</span>
                    <input
                      name="maxItemsText"
                      type="number"
                      min={1}
                      max={240}
                      value={bangumiForm.maxItemsText}
                      onChange={onBangumiFieldChange}
                      placeholder="120"
                    />
                  </label>
                ) : (
                  <label>
                    <span>收藏状态</span>
                    <select name="status" value={bangumiForm.status} onChange={onBangumiFieldChange}>
                      <option value="wish">想看</option>
                      <option value="doing">在看</option>
                      <option value="collect">看过</option>
                      <option value="on_hold">搁置</option>
                      <option value="dropped">抛弃</option>
                    </select>
                  </label>
                )}
                <label>
                  <span>可见范围</span>
                  <select name="visibility" value={bangumiForm.visibility} onChange={onBangumiFieldChange}>
                    <option value="public">公开</option>
                    <option value="members">仅成员可见</option>
                    <option value="private">仅自己可见</option>
                  </select>
                </label>
                {bangumiActionState.error ? <p className="text-sm text-rose-500/90">{bangumiActionState.error}</p> : null}
                {bangumiActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{bangumiActionState.success}</p> : null}
                {bangumiActionState.data ? (
                  <div className="space-job-box">
                    <strong>任务已创建</strong>
                    <p>Job ID: {bangumiActionState.data.job_id}</p>
                    <p>Status: {bangumiActionState.data.status}</p>
                    <p>Channel: {bangumiActionState.data.channel}</p>
                  </div>
                ) : null}
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={bangumiActionState.pending}>
                  {bangumiActionState.pending
                    ? "提交中..."
                    : bangumiForm.sync_mode === "account"
                      ? "提交帐号批量同步"
                      : "提交导入任务"}
                </button>
              </form>
            )}
            {canManageBangumiImport ? (
              <div className="space-job-list">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <strong>我的导入任务</strong>
                  <span>{bangumiJobsPager.total} 条</span>
                </div>
                {bangumiJobsError ? <p className="text-sm text-rose-500/90">{bangumiJobsError}</p> : null}
                <div className="grid gap-3">
                  {bangumiJobs.map((job) => (
                    <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={job.job_id}>
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <h3>任务 #{job.job_id}</h3>
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        <span>{job.job_type || "collection_sync"}</span>
                        {job.created_at ? <span>{job.created_at}</span> : null}
                      </div>
                      {job.request_payload ? (
                        <p className="text-sm text-[color:var(--text-muted)]">
                          {String(job.request_payload.sync_mode || "subject_ids") === "account"
                            ? `account: ${String(job.request_payload.bangumi_username || "")} / max_items: ${String(
                                job.request_payload.max_items || "",
                              )}`
                            : `subject_ids: ${JSON.stringify(job.request_payload.subject_ids || [])}`}
                        </p>
                      ) : null}
                      {job.error_message ? <p className="text-sm text-rose-500/90">{job.error_message}</p> : null}
                    </div>
                  ))}
                  {!bangumiJobs.length ? <p className="text-sm text-[color:var(--text-muted)]">当前还没有导入任务记录。</p> : null}
                </div>
                <PaginationBar
                  pager={bangumiJobsPager}
                  onPageChange={onBangumiJobsPageChange}
                  emptyText="暂无导入任务。"
                />
              </div>
            ) : null}
          </article>
        </section>

        <section style={{ display: spaceActivePage === "favorites" && !isViewingPublicProfile ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">论坛收藏夹</p>
                <h2>我收藏的帖子</h2>
              </div>
              <StatusChip tone="accent">{favoritedThreadsPager.total} 条</StatusChip>
            </div>
            {!session ? (
              <p className="text-sm text-[color:var(--text-muted)]">登录后可在这里查看并管理收藏的论坛主题。</p>
            ) : (
              <>
                {favoritedThreadsError ? <p className="text-sm text-rose-500/90">{favoritedThreadsError}</p> : null}
                <div className="grid gap-3">
                  {favoritedThreads.map((thread) => (
                    <button
                      className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 w-full text-left transition hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] hover:bg-white/80"
                      key={thread.id}
                      type="button"
                      onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(thread.id)}`)}
                    >
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <h3>{thread.title}</h3>
                        <StatusChip tone="accent">/{thread.board}</StatusChip>
                      </div>
                      <p>{excerpt(thread.content, 140)}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                        <span>{thread.author}</span>
                        <span>{formatDateTime(thread.created_at)} 发布</span>
                        <span>{thread.reply_count} 回复</span>
                        <span>{thread.view_count} 浏览</span>
                        <span>{thread.like_count} 点赞</span>
                        <span>{thread.favorite_count} 收藏</span>
                      </div>
                    </button>
                  ))}
                  {!favoritedThreads.length ? <p className="text-sm text-[color:var(--text-muted)]">当前没有收藏的帖子。</p> : null}
                </div>
                <PaginationBar
                  pager={favoritedThreadsPager}
                  onPageChange={onFavoritedThreadsPageChange}
                  emptyText="暂无收藏帖子。"
                />
              </>
            )}
          </article>
        </section>

        <section style={{ display: spaceActivePage === "friends" ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">好友模块</p>
                <h2>空间好友</h2>
              </div>
              <StatusChip tone="accent">{spaceFriends.length} 位</StatusChip>
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">
              {isViewingPublicProfile
                ? `仅展示 ${viewingProfileLabel} 的好友列表。`
                : session
                ? "好友申请需要对方审核通过，审核前不会加入好友列表。"
                : "游客模式仅本地维护好友列表；登录后可使用真实好友审核流程。"}
            </p>
            {isViewingPublicProfile && spaceFriendActionState.error ? (
              <p className="text-sm text-rose-500/90">{spaceFriendActionState.error}</p>
            ) : null}
            {!isViewingPublicProfile ? (
              <form className="grid gap-3 space-friend-form" onSubmit={(event) => void handleSpaceFriendSubmit(event)}>
                <div className="space-friend-form__row">
                  <label>
                    <span>好友用户名</span>
                    <input
                      name="username"
                      type="text"
                      value={spaceFriendForm.username}
                      onChange={handleSpaceFriendFieldChange}
                      placeholder="例如：rubedo_room"
                      required
                    />
                  </label>
                  {!session ? (
                    <label>
                      <span>初始状态</span>
                      <select name="status" value={spaceFriendForm.status} onChange={handleSpaceFriendFieldChange}>
                        <option value="在线">在线</option>
                        <option value="忙碌">忙碌</option>
                        <option value="离线">离线</option>
                      </select>
                    </label>
                  ) : null}
                </div>
                <label>
                  <span>{session ? "申请备注" : "备注"}</span>
                  <input
                    name="note"
                    type="text"
                    value={spaceFriendForm.note}
                    onChange={handleSpaceFriendFieldChange}
                    placeholder={session ? "可选：给对方留一句话" : "可选：给好友写一句介绍"}
                  />
                </label>
                {spaceFriendActionState.error ? <p className="text-sm text-rose-500/90">{spaceFriendActionState.error}</p> : null}
                {spaceFriendActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{spaceFriendActionState.success}</p> : null}
                <div className="space-friend-form__actions">
                  <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={spaceFriendActionState.pending}>
                    {spaceFriendActionState.pending
                      ? session ? "发送中..." : "添加中..."
                      : session ? "发送好友申请" : "添加真实好友"}
                  </button>
                  <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleResetSpaceFriends}>
                    {session ? "刷新列表" : "清空列表"}
                  </button>
                </div>
              </form>
            ) : null}
            {!isViewingPublicProfile && session ? (
              <div className="space-friend-request-panels">
                <div className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong>收到的好友申请</strong>
                    <StatusChip tone="warn">{incomingFriendRequests.length} 条</StatusChip>
                  </div>
                  {incomingFriendRequests.length ? (
                    <div className="grid gap-2">
                      {incomingFriendRequests.map((request) => (
                        <div className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={`incoming-${request.request_id}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <strong>@{request.requester_username}</strong>
                            <StatusChip tone="accent">待审核</StatusChip>
                          </div>
                          <p>{request.message || "对方没有填写申请备注。"}</p>
                          <div className="grid gap-1 text-xs text-[color:var(--text-muted)]">
                            <span>{formatRequestTime(request.created_at)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                              disabled={spaceFriendActionState.pending}
                              onClick={() => void handleReviewIncomingFriendRequest(request, "approve")}
                            >
                              同意
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                              type="button"
                              disabled={spaceFriendActionState.pending}
                              onClick={() => void handleReviewIncomingFriendRequest(request, "reject")}
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[color:var(--text-muted)]">暂无待审核申请。</p>
                  )}
                </div>
                <div className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <strong>我发出的申请</strong>
                    <StatusChip tone="neutral">{outgoingFriendRequests.length} 条</StatusChip>
                  </div>
                  {outgoingFriendRequests.length ? (
                    <div className="grid gap-2">
                      {outgoingFriendRequests.map((request) => (
                        <div className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={`outgoing-${request.request_id}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <strong>@{request.receiver_username}</strong>
                            <StatusChip tone="neutral">等待审核</StatusChip>
                          </div>
                          <p>{request.message || "你没有填写申请备注。"}</p>
                          <div className="grid gap-1 text-xs text-[color:var(--text-muted)]">
                            <span>{formatRequestTime(request.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[color:var(--text-muted)]">暂无发出的申请。</p>
                  )}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2">
              {spaceFriends.map((friend) => (
                <div className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={friend.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {friend.avatarURL ? (
                        <img alt={`${friend.name} 的头像`} className="h-8 w-8 rounded-full object-cover" src={friend.avatarURL} />
                      ) : (
                        <div className="h-8 w-8 rounded-full object-cover inline-flex items-center justify-center bg-[color:var(--surface-tint-blue)] text-[color:var(--text-main)] font-semibold">
                          {getSpaceFriendAvatarFallback(friend)}
                        </div>
                      )}
                      <strong>{friend.name}</strong>
                    </div>
                    <StatusChip tone={getSpaceFriendTone(friend.status)}>{friend.status}</StatusChip>
                  </div>
                  <p>{friend.note}</p>
                  <div className="grid gap-1 text-xs text-[color:var(--text-muted)]">
                    <span>@{friend.username}</span>
                    <StatusChip tone={friend.isReal ? "success" : "neutral"}>
                      {friend.isReal ? "真实账号" : "本地好友"}
                    </StatusChip>
                  </div>
                  {!isViewingPublicProfile ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {!session ? (
                        <button
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => handleRotateSpaceFriendStatus(friend.id)}
                        >
                          切换状态
                        </button>
                      ) : null}
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={() => void handleViewSpaceFriendProfile(friend)}
                        disabled={spaceFriendActionState.pending}
                      >
                        查看主页
                      </button>
                      {!session ? (
                        <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => handleRemoveSpaceFriend(friend.id)}>
                          移除好友
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {spaceFriendsLoading ? <p className="text-sm text-[color:var(--text-muted)]">好友关系同步中...</p> : null}
              {!spaceFriendsLoading && !spaceFriends.length ? (
                <p className="text-sm text-[color:var(--text-muted)]">{isViewingPublicProfile ? "这个空间暂时没有公开好友。" : "好友列表为空，先添加一个真实好友吧。"}</p>
              ) : null}
            </div>
          </article>
        </section>

        <section style={{ display: spaceActivePage === "capsules" && !isViewingPublicProfile ? undefined : "none" }}>
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">时间胶囊</p>
                <h2>用户行为记录</h2>
              </div>
            </div>
            <div className="space-capsule-list">
              {spaceCapsules.map((capsule) => (
                <article className="space-capsule-card" key={capsule.id}>
                  <div className="space-capsule-card__header">
                    <strong>{capsule.title}</strong>
                    <span>{capsule.time}</span>
                  </div>
                  <p className="space-capsule-card__record">{capsule.record}</p>
                </article>
              ))}
              {!spaceCapsules.length ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  还没有行为记录。先发布日志或发起一次 Bangumi 导入，时间胶囊会自动生成。
                </p>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}
