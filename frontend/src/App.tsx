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
  fetchArticles,
  fetchHealth,
  fetchMyProfile,
  fetchPublicProfile,
  fetchSiteContent,
  fetchThreads,
  type Article as ApiArticle,
  type ForumThread as ApiForumThread,
  type HealthData,
  type Profile as ApiProfile,
  login,
  type Session,
  type SiteContent,
} from "./api";
import Header from "./components/Header";
import {
  ALBUM_ENTRIES,
  CHATROOM_SEED,
  GRAMOPHONE_TRACKS,
  HERO_OBJECTS,
  NAV_ITEMS,
  PAPER_ENTRIES,
  POLAROID_ENTRIES,
  PORTAL_PAGES,
  REFLECTION_ENTRIES,
  SOCIETY_ACTIVITIES,
  SOCIETY_HIGHLIGHTS,
  SOCIETY_JOIN_STEPS,
  SOCIETY_PILLARS,
  SPACE_PROFILE_PREVIEW,
  SPACE_MEMORIES,
  type SpaceProfilePreview,
  TIMELINE_ENTRIES,
} from "./content";

type RoutePath = (typeof NAV_ITEMS)[number]["href"];
type StatusTone = "neutral" | "success" | "warn" | "accent";

interface ChatMessage {
  id: string;
  alias: string;
  mood: string;
  stamp: string;
  body: string;
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

function normalizePath(pathname: string): RoutePath {
  const normalized = pathname.replace(/\/+$/, "") || "/";

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

function readCurrentPath(): RoutePath {
  if (typeof window === "undefined") {
    return "/";
  }

  return normalizePath(window.location.pathname);
}

function formatMinuteStamp(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function getAvatarFallback(profile: Pick<SpaceProfilePreview, "nickname" | "username"> | null): string {
  if (!profile) {
    return "R";
  }

  return (profile.nickname || profile.username || "R").trim().charAt(0).toUpperCase() || "R";
}

function createFallbackProfile(): ApiProfile {
  return {
    user_id: "rubedo-room",
    username: SPACE_PROFILE_PREVIEW.username,
    nickname: SPACE_PROFILE_PREVIEW.nickname,
    signature: SPACE_PROFILE_PREVIEW.signature,
    bio: SPACE_PROFILE_PREVIEW.bio,
    avatar_url: "",
    status: "guest_preview",
    verified: false,
    roles: [],
    collections: SPACE_PROFILE_PREVIEW.collections,
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
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    CHATROOM_SEED.map((message) => ({ ...message })),
  );
  const [storyFeed, setStoryFeed] = useState<ApiArticle[]>([]);
  const [threadFeed, setThreadFeed] = useState<ApiForumThread[]>([]);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [authForm, setAuthForm] = useState<AuthFormState>({
    account: SPACE_PROFILE_PREVIEW.username,
    password: "",
  });
  const [loginState, setLoginState] = useState<LoginState>({
    pending: false,
    error: "",
  });
  const [healthError, setHealthError] = useState("");
  const [articlesError, setArticlesError] = useState("");
  const [threadsError, setThreadsError] = useState("");
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
    : HERO_OBJECTS.map((item) => ({ ...item }));
  const portalPages: DisplayPortalPage[] = siteContent?.portal_pages.length
    ? siteContent.portal_pages.map((item) => ({
        href: item.path || "/",
        kicker: item.kicker || "",
        title: item.title,
        description: item.description || "",
      }))
    : PORTAL_PAGES.map((item) => ({ ...item }));
  const societyHighlights: DisplayHighlight[] = siteContent?.portal_highlights.length
    ? siteContent.portal_highlights.map((item) => ({
        id: item.slug,
        kicker: item.kicker || "",
        title: item.title,
        body: item.body || item.description || "",
      }))
    : SOCIETY_HIGHLIGHTS.map((item) => ({ ...item }));
  const societyPillars: DisplayPillar[] = siteContent?.portal_pillars.length
    ? siteContent.portal_pillars.map((item) => ({
        id: item.slug,
        title: item.title,
        description: item.description || "",
      }))
    : SOCIETY_PILLARS.map((item) => ({ ...item }));
  const societyActivities: DisplayActivity[] = siteContent?.portal_activities.length
    ? siteContent.portal_activities.map((item) => ({
        id: item.slug,
        label: item.label || "",
        title: item.title,
        description: item.description || "",
      }))
    : SOCIETY_ACTIVITIES.map((item) => ({ ...item }));
  const societyJoinSteps: DisplayJoinStep[] = siteContent?.portal_join_steps.length
    ? siteContent.portal_join_steps.map((item) => ({
        id: item.slug,
        step: item.label || "",
        title: item.title,
        description: item.description || "",
      }))
    : SOCIETY_JOIN_STEPS.map((item) => ({ ...item }));

  const galleryAlbums: DisplayAlbum[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "album")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          accent: entry.subtitle || "",
          caption: entry.body || "",
        }))
    : ALBUM_ENTRIES.map((item) => ({ ...item }));
  const galleryPolaroids: DisplayPolaroid[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "polaroid")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          stamp: entry.subtitle || "",
          note: entry.body || "",
        }))
    : POLAROID_ENTRIES.map((item) => ({ ...item }));
  const galleryPapers: DisplayPaper[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "paper")
        .map((entry) => ({
          id: entry.slug,
          title: entry.title,
          signature: entry.subtitle || "",
          body: entry.body || "",
        }))
    : PAPER_ENTRIES.map((item) => ({ ...item }));
  const galleryTimeline: DisplayTimeline[] = siteContent?.gallery_entries.length
    ? siteContent.gallery_entries
        .filter((entry) => entry.entry_type === "timeline")
        .map((entry) => ({
          id: entry.slug,
          year: entry.subtitle || "",
          title: entry.title,
          summary: entry.body || "",
        }))
    : TIMELINE_ENTRIES.map((item) => ({ ...item }));
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
    : GRAMOPHONE_TRACKS.map((item) => ({ ...item }));

  const featuredArticle = storyFeed[0] ?? null;
  const featuredThread = threadFeed[0] ?? null;
  const boardCount = new Set(threadFeed.map((thread) => thread.board)).size;
  const isAuthenticated = session !== null;
  const displayProfile = profile ?? (!isAuthenticated ? createFallbackProfile() : null);
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

    document.title = TITLE_BY_ROUTE[routePath];
  }, [routePath]);

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
        : fetchPublicProfile(SPACE_PROFILE_PREVIEW.username);

      const [healthResult, siteResult, articleResult, threadResult, profileResult] =
        await Promise.allSettled([
          fetchHealth(token || undefined),
          fetchSiteContent(),
          fetchArticles(token || undefined),
          fetchThreads(token || undefined),
          profileRequest,
        ]);

      if (!active) {
        return;
      }

      const nextHealthError = healthResult.status === "rejected" ? toErrorMessage(healthResult.reason) : "";
      const nextArticlesError =
        articleResult.status === "rejected" ? toErrorMessage(articleResult.reason) : "";
      const nextThreadsError =
        threadResult.status === "rejected" ? toErrorMessage(threadResult.reason) : "";
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
          setStoryFeed(articleResult.value);
        } else {
          setStoryFeed([]);
        }

        if (threadResult.status === "fulfilled") {
          setThreadFeed(threadResult.value);
        } else {
          setThreadFeed([]);
        }

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        } else if (token) {
          setProfile(null);
        } else {
          setProfile(createFallbackProfile());
        }

        if (shouldDropSession) {
          setSession(null);
        }

        setHealthError(nextHealthError);
        setArticlesError(nextArticlesError);
        setThreadsError(nextThreadsError);
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
  }, [refreshNonce, session]);

  function handleRefresh(): void {
    setRefreshNonce((current) => current + 1);
  }

  function handleNavigate(nextHref: string): void {
    const nextPath = normalizePath(nextHref);

    if (typeof window !== "undefined" && normalizePath(window.location.pathname) !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setIsHeaderHidden(false);

    startTransition(() => {
      setRoutePath(nextPath);
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleChatDraftChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setChatDraft(event.target.value);
  }

  function handleAuthFieldChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;

    setAuthForm((current) => ({
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
    setLoginState({
      pending: false,
      error: "",
    });
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const body = chatDraft.trim();
    if (!body) {
      return;
    }

    const nextMessage: ChatMessage = {
      id: `chat-${Date.now()}`,
      alias: `匿名旅人 ${String(chatMessages.length + 1).padStart(2, "0")}`,
      mood: ["耳语", "弹幕", "回声"][chatMessages.length % 3],
      stamp: formatMinuteStamp(new Date()),
      body,
    };

    setChatMessages((current) => [nextMessage, ...current].slice(0, 8));
    setChatDraft("");
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
            placeholder="例如：rubedo-room"
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
        <section className="hero-panel landing-hero">
          <div className="landing-hero__copy">
            <p className="eyebrow">首页导览</p>
            <h1>把文章、讨论、个人空间和展示墙收进同一张更有氛围的首页。</h1>
            <p className="hero-description">
              首页负责先把站点的整体气质铺开，让初次进入的人能快速看见这里的内容方向，也能感受到社团式的叙事氛围。
            </p>
            <div className="hero-action-row">
              <button
                className="primary-button"
                type="button"
                onClick={() => handleNavigate("/portal")}
              >
                查看社团介绍
              </button>
              <button
                className="ghost-button hero-action-button"
                type="button"
                onClick={() => handleNavigate("/stories")}
              >
                进入文章札记
              </button>
            </div>

            <div className="symbol-grid">
              {heroObjects.map((item) => (
                <div className={`symbol-card symbol-card--${item.id}`} key={item.id}>
                  <span className="symbol-card__icon" aria-hidden="true" />
                  <div className="symbol-card__copy">
                    <span className="symbol-card__label">{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-hero__visual">
            <div className="landing-hero__glow landing-hero__glow--one" aria-hidden="true" />
            <div className="landing-hero__glow landing-hero__glow--two" aria-hidden="true" />
            <div className="landing-hero__glow landing-hero__glow--three" aria-hidden="true" />

            <span className="floating-badge floating-badge--record" aria-hidden="true">
              留声
            </span>
            <span className="floating-badge floating-badge--letter" aria-hidden="true">
              信笺
            </span>
            <span className="floating-badge floating-badge--frame" aria-hidden="true">
              相框
            </span>

            <div className="art-stage">
              <div className="art-stage__standee">
                <div className="art-stage__standee-frame" aria-hidden="true" />
                <img
                  alt="Rubedo 视觉主图"
                  className="art-stage__standee-image"
                  src="/bg1.png"
                />
              </div>

              <div className="art-stage__postcard">
                <img alt="辅助视觉图" className="art-stage__postcard-image" src="/bg2.png" />
                <div className="art-stage__postcard-copy">
                  <span>夜色切片</span>
                  <strong>相册 / 记忆片段</strong>
                </div>
              </div>
            </div>

            <div className="hero-metrics landing-hero__metrics">
              <div className="metric-card">
                <span>文章札记</span>
                <strong>{storyFeed.length}</strong>
                <StatusChip tone="success">公开文章与短札并行展开</StatusChip>
              </div>
              <div className="metric-card">
                <span>论坛讨论</span>
                <strong>{threadFeed.length}</strong>
                <StatusChip tone="accent">主题串与匿名留言同时存在</StatusChip>
              </div>
              <div className="metric-card">
                <span>展示墙</span>
                <strong>5 区</strong>
                <StatusChip tone="neutral">{showcaseCount} 个陈列单元</StatusChip>
              </div>
            </div>
          </div>
        </section>

        <section className="portal-grid">
          {portalPages.map((page) => (
            <button
              className="portal-card"
              key={page.href}
              type="button"
              onClick={() => handleNavigate(page.href)}
            >
              <span className="portal-card__kicker">{page.kicker}</span>
              <strong>{page.title}</strong>
              <p>{page.description}</p>
              <span className="portal-card__cta">进入页面</span>
            </button>
          ))}
        </section>

        <section className="panel-grid preview-grid">
          {renderHealthPanel()}

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">社团速览</p>
                <h2>{societyHighlights[0]?.title || "社团速览"}</h2>
              </div>
            </div>
            <p className="panel-empty">{societyHighlights[0]?.body || "这里展示社团的第一印象与定位。"}</p>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">文章预览</p>
                <h2>今日札记</h2>
              </div>
            </div>
            {featuredArticle ? (
              <div className="content-card">
                <div className="content-card__header">
                  <h3>{featuredArticle.title}</h3>
                  <StatusChip tone="success">{normalizeVisibilityLabel(featuredArticle.visibility)}</StatusChip>
                </div>
                <p>{excerpt(featuredArticle.summary || featuredArticle.content, 180)}</p>
                <div className="meta-row">
                  <span>{featuredArticle.author}</span>
                  <span>{featuredArticle.tags.join(" · ")}</span>
                </div>
              </div>
            ) : (
              <p className="panel-empty">{articlesError || (isLoadingData ? "文章数据加载中。" : "暂时没有可展示的文章。")}</p>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">论坛预览</p>
                <h2>最近讨论</h2>
              </div>
            </div>
            {featuredThread ? (
              <div className="content-card">
                <div className="content-card__header">
                  <h3>{featuredThread.title}</h3>
                  <StatusChip tone="neutral">/{featuredThread.board}</StatusChip>
                </div>
                <p>{excerpt(featuredThread.content, 180)}</p>
                <div className="meta-row">
                  <span>{featuredThread.author}</span>
                  <span>{featuredThread.reply_count} 条回复</span>
                </div>
              </div>
            ) : (
              <p className="panel-empty">{threadsError || (isLoadingData ? "讨论数据加载中。" : "最近还没有新的讨论主题。")}</p>
            )}
          </article>
        </section>
      </>
    );
  }

  function renderPortalPage(): ReactNode {
    return (
      <>
        <SectionHero
          kicker="社团介绍"
          title="围绕 Galgame、叙事与视觉表达展开的同好社团"
          description="这一页把社团定位、活动方式和加入路径集中整理出来，让第一次进入站点的人先知道这里在做什么。"
          metrics={[
            {
              label: "社团亮点",
              value: String(societyHighlights.length),
              detail: "从气质、日常到成员构成",
              tone: "success",
            },
            {
              label: "内容支柱",
              value: String(societyPillars.length),
              detail: "讨论、共创与展示同时展开",
              tone: "accent",
            },
            {
              label: "加入步骤",
              value: String(societyJoinSteps.length),
              detail: "从浏览到参与逐步靠近",
              tone: "neutral",
            },
          ]}
        />

        <section className="panel-grid preview-grid">
          {societyHighlights.map((highlight) => (
            <article className="panel" key={highlight.id}>
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">{highlight.kicker}</p>
                  <h2>{highlight.title}</h2>
                </div>
              </div>
              <p className="panel-empty">{highlight.body}</p>
            </article>
          ))}
        </section>

        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">社团支柱</p>
                <h2>日常内容方向</h2>
              </div>
            </div>
            <div className="stack-list">
              {societyPillars.map((pillar) => (
                <div className="content-card" key={pillar.id}>
                  <div className="content-card__header">
                    <h3>{pillar.title}</h3>
                  </div>
                  <p>{pillar.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">活动安排</p>
                <h2>常见活动形态</h2>
              </div>
            </div>
            <div className="stack-list">
              {societyActivities.map((activity) => (
                <div className="content-card" key={activity.id}>
                  <div className="content-card__header">
                    <h3>{activity.title}</h3>
                    <StatusChip tone="neutral">{activity.label}</StatusChip>
                  </div>
                  <p>{activity.description}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel-grid preview-grid">
          {societyJoinSteps.map((step) => (
            <article className="panel memory-card" key={step.id}>
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">加入路径</p>
                  <h2>
                    {step.step} · {step.title}
                  </h2>
                </div>
              </div>
              <p className="panel-empty">{step.description}</p>
            </article>
          ))}
        </section>
      </>
    );
  }

  function renderStoriesPage(): ReactNode {
    return (
      <>
        <SectionHero
          kicker="文章札记"
          title="公开文章与感悟区"
          description="把可公开浏览的文章和编辑部式的短感悟拆成同页双栏，一边是内容流，一边是更轻的情绪记录。"
          metrics={[
            {
              label: "可见文章",
              value: String(storyFeed.length),
              detail: articlesError || "公开浏览与主题标签并列呈现",
              tone: articlesError ? "warn" : "success",
            },
            {
              label: "感悟札记",
              value: String(REFLECTION_ENTRIES.length),
              detail: "编辑部式的短感悟卡片",
              tone: "accent",
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
              <StatusChip tone="accent">{storyFeed.length} 篇</StatusChip>
            </div>
            {articlesError ? <p className="panel-error">{articlesError}</p> : null}
            <div className="stack-list">
              {storyFeed.map((article) => (
                <div className="content-card content-card--story" key={article.id}>
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
                </div>
              ))}
              {!storyFeed.length ? (
                <p className="panel-empty">
                  {isLoadingData ? "文章数据加载中。" : "当前没有可展示的文章数据。"}
                </p>
              ) : null}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">感悟区</p>
                <h2>编辑台短札</h2>
              </div>
              <StatusChip tone="accent">编辑台</StatusChip>
            </div>
            <div className="reflection-grid">
              {REFLECTION_ENTRIES.map((entry) => (
                <div className="reflection-card" key={entry.id}>
                  <div className="reflection-card__meta">
                    <span>{entry.mood}</span>
                    <span>{entry.stamp}</span>
                  </div>
                  <h3>{entry.title}</h3>
                  <p>{entry.body}</p>
                  <div className="tag-row">
                    {entry.tags.map((tag) => (
                      <span className="module-tag" key={`${entry.id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </>
    );
  }

  function renderForumPage(): ReactNode {
    return (
      <>
        <SectionHero
          kicker="论坛交流"
          title="论坛讨论与匿名聊天室"
          description="讨论串负责沉淀，匿名聊天室负责即时吐槽。两个入口分工不同，但共享同一层社区氛围。"
          metrics={[
            {
              label: "讨论主题",
              value: String(threadFeed.length),
              detail: threadsError || (boardCount ? `${boardCount} 个分区在持续活跃` : "讨论区正在整理中"),
              tone: threadsError ? "warn" : threadFeed.length ? "accent" : "warn",
            },
            {
              label: "匿名留言",
              value: `${chatMessages.length} 条`,
              detail: "适合承接更轻的即时交流",
              tone: "neutral",
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
              <StatusChip tone="accent">{threadFeed.length} 条主题</StatusChip>
            </div>
            {threadsError ? <p className="panel-error">{threadsError}</p> : null}
            <div className="stack-list">
              {threadFeed.map((thread) => (
                <div className="content-card" key={thread.id}>
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
                </div>
              ))}
              {!threadFeed.length ? (
                <p className="panel-empty">
                  {isLoadingData ? "讨论数据加载中。" : "当前没有可展示的讨论主题。"}
                </p>
              ) : null}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">匿名聊天室</p>
                <h2>即时留言</h2>
              </div>
              <StatusChip tone="neutral">轻量交流</StatusChip>
            </div>
            <p className="panel-empty">
              这里适合收纳更轻、更短的即时感想，让论坛不只剩下完整讨论串，也能保留深夜里那种一闪而过的聊天气氛。
            </p>
            <div className="chat-feed">
              {chatMessages.map((message) => (
                <article className="chat-bubble" key={message.id}>
                  <div className="chat-bubble__meta">
                    <strong>{message.alias}</strong>
                    <span>
                      {message.mood} · {message.stamp}
                    </span>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))}
            </div>
            <form className="chat-form" onSubmit={handleChatSubmit}>
              <label>
                <span>写下一句匿名感想</span>
                <textarea
                  name="message"
                  rows={4}
                  value={chatDraft}
                  onChange={handleChatDraftChange}
                  placeholder="例如：这条线的收束比我想象得更安静。"
                />
              </label>
              <button className="primary-button" type="submit" disabled={!chatDraft.trim()}>
                发送到房间
              </button>
            </form>
          </article>
        </section>
      </>
    );
  }

  function renderSpacePage(): ReactNode {
    return (
      <>
        <SectionHero
          kicker="个人空间"
          title="用户个人空间"
          description="个人空间不只是一张资料卡，它还应该能承接收藏、短感想、最近在意的内容和时间痕迹。"
          metrics={[
            {
              label: "空间身份",
              value: isAuthenticated ? "成员" : "访客",
              detail: isAuthenticated ? "当前读取 `/users/me`" : "展示公共预览档案",
              tone: isAuthenticated ? "success" : "neutral",
            },
            {
              label: "收藏总数",
              value: String(collectionTotal),
              detail: displayProfile ? "收藏内容会在这里逐步累积" : "等待空间资料返回",
              tone: "accent",
            },
            {
              label: "当前气质",
              value: displayProfile?.nickname || "空间加载中",
              detail: displayProfile?.signature || "等待空间资料同步",
              tone: "neutral",
            },
          ]}
        />

        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">空间主卡</p>
                <h2>空间主卡</h2>
              </div>
              <StatusChip tone={isAuthenticated ? "success" : "neutral"}>
                {isAuthenticated ? "已同步" : "游客预览"}
              </StatusChip>
            </div>
            {displayProfile ? (
              <div className="profile-stage">
                <div className="profile-stage__header">
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
                  <div className="profile-stage__copy">
                    <p className="profile-name">{displayProfile.nickname}</p>
                    <p className="profile-meta">
                      @{displayProfile.username} · {displayProfile.signature}
                    </p>
                    <p className="profile-bio">{displayProfile.bio}</p>
                  </div>
                </div>
                <div className="collection-grid">
                  {Object.entries(displayProfile.collections).map(([label, count]) => (
                    <div className="collection-item" key={label}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="panel-empty">{profileError || "空间资料加载中。"}</p>
            )}
          </article>

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
        </section>

        <section className="panel-grid preview-grid">
          {SPACE_MEMORIES.map((memory) => (
            <article className="panel memory-card" key={memory.id}>
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">空间便笺</p>
                  <h2>{memory.title}</h2>
                </div>
              </div>
              <p className="panel-empty">{memory.description}</p>
            </article>
          ))}
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
          description="这一页更强调展示方式本身。每个区域像一个展柜，负责承接不同质感的内容。"
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
