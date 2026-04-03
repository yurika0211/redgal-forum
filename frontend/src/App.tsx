import {
  startTransition,
  useEffect,
  useEffectEvent,
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
  fetchThreads,
  login,
  type Article,
  type ForumThread,
  type HealthData,
  type Profile,
  type Session,
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
  SPACE_MEMORIES,
  TIMELINE_ENTRIES,
} from "./content";

const SESSION_STORAGE_KEY = "rubedo.frontend.session";

type RoutePath = (typeof NAV_ITEMS)[number]["href"];
type StatusTone = "neutral" | "success" | "warn" | "accent";
type DashboardErrorKey = "health" | "articles" | "threads" | "profile";

interface AuthFormState {
  account: string;
  password: string;
}

interface LoginState {
  pending: boolean;
  error: string;
}

interface ChatMessage {
  id: string;
  alias: string;
  mood: string;
  stamp: string;
  body: string;
}

type DashboardErrors = Partial<Record<DashboardErrorKey, string>>;

interface DashboardState {
  health: HealthData | null;
  profile: Profile | null;
  articles: Article[];
  threads: ForumThread[];
  errors: DashboardErrors;
  updatedAt: string;
}

interface PageState {
  loading: boolean;
  refreshing: boolean;
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

const TITLE_BY_ROUTE: Record<RoutePath, string> = {
  "/": "Rubedo Forum",
  "/forum": "论坛聊天室 | Rubedo Forum",
  "/gallery": "展示墙 | Rubedo Forum",
  "/space": "个人空间 | Rubedo Forum",
  "/stories": "文章感悟 | Rubedo Forum",
};

function normalizePath(pathname: string): RoutePath {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  switch (normalized) {
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

function createInitialDashboardState(): DashboardState {
  return {
    health: null,
    profile: null,
    articles: [],
    threads: [],
    errors: {},
    updatedAt: "",
  };
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
    // Ignore malformed session payloads and clear them below.
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown request failure";
}

function formatUpdatedAt(value: string): string {
  if (!value) {
    return "Waiting for first sync";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
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
    return "内容暂时为空，等待后端返回更多字段。";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function getAvatarFallback(profile: Profile | null): string {
  if (!profile) {
    return "R";
  }

  return (profile.nickname || profile.username || "R").trim().charAt(0).toUpperCase() || "R";
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
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [authForm, setAuthForm] = useState<AuthFormState>({
    account: "",
    password: "",
  });
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    CHATROOM_SEED.map((message) => ({ ...message })),
  );
  const [loginState, setLoginState] = useState<LoginState>({
    pending: false,
    error: "",
  });
  const [dashboard, setDashboard] = useState<DashboardState>(createInitialDashboardState);
  const [pageState, setPageState] = useState<PageState>({
    loading: true,
    refreshing: false,
  });

  const token = session?.accessToken ?? "";
  const isAuthenticated = session !== null;
  const backendReachable = Boolean(dashboard.health) && !dashboard.errors.health;
  const lastUpdatedLabel = formatUpdatedAt(dashboard.updatedAt);
  const publicArticles = dashboard.articles.filter((article) => article.visibility === "public");
  const storyFeed = publicArticles.length ? publicArticles : dashboard.articles;
  const featuredArticle = storyFeed[0] ?? null;
  const featuredThread = dashboard.threads[0] ?? null;
  const profile = dashboard.profile;
  const boardCount = new Set(dashboard.threads.map((thread) => thread.board)).size;
  const collectionTotal = profile
    ? Object.values(profile.collections).reduce((count, item) => count + item, 0)
    : 0;
  const showcaseCount =
    ALBUM_ENTRIES.length +
    POLAROID_ENTRIES.length +
    PAPER_ENTRIES.length +
    TIMELINE_ENTRIES.length +
    GRAMOPHONE_TRACKS.length;

  const loadDashboard = useEffectEvent(async (currentToken: string) => {
    const [healthResult, articleResult, threadResult, profileResult] =
      await Promise.allSettled([
        fetchHealth(currentToken),
        fetchArticles(currentToken),
        fetchThreads(currentToken),
        currentToken ? fetchMyProfile(currentToken) : Promise.resolve<Profile | null>(null),
      ]);

    const nextState = createInitialDashboardState();
    nextState.updatedAt = new Date().toISOString();

    if (healthResult.status === "fulfilled") {
      nextState.health = healthResult.value;
    } else {
      nextState.errors.health = toErrorMessage(healthResult.reason);
    }

    if (articleResult.status === "fulfilled") {
      nextState.articles = articleResult.value;
    } else {
      nextState.errors.articles = toErrorMessage(articleResult.reason);
    }

    if (threadResult.status === "fulfilled") {
      nextState.threads = threadResult.value;
    } else {
      nextState.errors.threads = toErrorMessage(threadResult.reason);
    }

    if (profileResult.status === "fulfilled") {
      nextState.profile = profileResult.value;
    } else {
      nextState.errors.profile = toErrorMessage(profileResult.reason);
    }

    startTransition(() => {
      setDashboard(nextState);
    });
  });

  useEffect(() => {
    let active = true;

    setPageState({
      loading: true,
      refreshing: true,
    });

    void loadDashboard(token).finally(() => {
      if (!active) {
        return;
      }

      setPageState({
        loading: false,
        refreshing: false,
      });
    });

    return () => {
      active = false;
    };
  }, [token]);

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

  async function handleRefresh(): Promise<void> {
    setPageState((current) => ({
      ...current,
      refreshing: true,
    }));

    await loadDashboard(token);

    setPageState((current) => ({
      ...current,
      refreshing: false,
    }));
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
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
    } catch (error) {
      setLoginState({
        pending: false,
        error: toErrorMessage(error),
      });
      return;
    }

    setLoginState({
      pending: false,
      error: "",
    });
  }

  function handleLogout(): void {
    persistSession(null);
    setSession(null);
  }

  function handleFieldChange(event: ChangeEvent<HTMLInputElement>): void {
    const fieldName = event.target.name as keyof AuthFormState;
    const { value } = event.target;

    setAuthForm((current) => ({
      ...current,
      [fieldName]: value,
    }));
  }

  function handleChatDraftChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setChatDraft(event.target.value);
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

  function renderAuthBridge(guestHint: string, signedInHint: string): ReactNode {
    if (session) {
      return (
        <div className="session-box">
          <p>{signedInHint}</p>
          <code className="token-preview">{session.accessToken}</code>
          <button className="primary-button" type="button" onClick={handleLogout}>
            Clear session
          </button>
        </div>
      );
    }

    return (
      <>
        <p className="panel-empty">{guestHint}</p>
        <form className="auth-form" onSubmit={(event) => void handleLogin(event)}>
          <label>
            <span>账号</span>
            <input
              name="account"
              type="text"
              value={authForm.account}
              onChange={handleFieldChange}
              placeholder="student-id or username"
              autoComplete="username"
              required
            />
          </label>
          <label>
            <span>密码</span>
            <input
              name="password"
              type="password"
              value={authForm.password}
              onChange={handleFieldChange}
              placeholder="any non-empty value for scaffold"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loginState.pending}>
            {loginState.pending ? "Signing in..." : "POST /auth/login"}
          </button>
          {loginState.error ? <p className="panel-error">{loginState.error}</p> : null}
        </form>
      </>
    );
  }

  function renderHomePage(): ReactNode {
    return (
      <>
        <section className="hero-panel landing-hero">
          <div className="landing-hero__copy">
            <p className="eyebrow">Rubedo portal</p>
            <h1>把内容流、讨论区、个人空间和展示墙放进一张更有氛围的首页。</h1>
            <p className="hero-description">
              首屏现在不只负责入口分发，也负责把作品站该有的光晕、立绘、浮动物件和象征性陈列先立起来。
            </p>
            <div className="hero-action-row">
              <button
                className="primary-button"
                type="button"
                onClick={() => handleNavigate("/stories")}
              >
                进入文章感悟
              </button>
              <button
                className="ghost-button hero-action-button"
                type="button"
                onClick={() => handleNavigate("/gallery")}
              >
                查看展示墙
              </button>
            </div>

            <div className="symbol-grid">
              {HERO_OBJECTS.map((item) => (
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
              Record
            </span>
            <span className="floating-badge floating-badge--letter" aria-hidden="true">
              Letter
            </span>
            <span className="floating-badge floating-badge--frame" aria-hidden="true">
              Frame
            </span>

            <div className="art-stage">
              <div className="art-stage__standee">
                <div className="art-stage__standee-frame" aria-hidden="true" />
                <img
                  alt="Decorative Rubedo key visual"
                  className="art-stage__standee-image"
                  src="/bg1.png"
                />
              </div>

              <div className="art-stage__postcard">
                <img
                  alt="Decorative supporting visual"
                  className="art-stage__postcard-image"
                  src="/bg2.png"
                />
                <div className="art-stage__postcard-copy">
                  <span>Night postcard</span>
                  <strong>Album / Memory cut</strong>
                </div>
              </div>
            </div>

            <div className="hero-metrics landing-hero__metrics">
              <div className="metric-card">
                <span>Stories</span>
                <strong>{storyFeed.length}</strong>
                <StatusChip tone={storyFeed.length ? "success" : "warn"}>
                  {storyFeed.length ? "Public feed ready" : "Waiting for articles"}
                </StatusChip>
              </div>
              <div className="metric-card">
                <span>Forum</span>
                <strong>{dashboard.threads.length}</strong>
                <StatusChip tone={dashboard.threads.length ? "accent" : "warn"}>
                  {dashboard.threads.length ? "Live boards ready" : "Waiting for threads"}
                </StatusChip>
              </div>
              <div className="metric-card">
                <span>Gallery wall</span>
                <strong>5 zones</strong>
                <StatusChip tone="neutral">{showcaseCount} static exhibits</StatusChip>
              </div>
            </div>
          </div>
        </section>

        <section className="portal-grid">
          {PORTAL_PAGES.map((page) => (
            <button
              className="portal-card"
              key={page.href}
              type="button"
              onClick={() => handleNavigate(page.href)}
            >
              <span className="portal-card__kicker">{page.kicker}</span>
              <strong>{page.title}</strong>
              <p>{page.description}</p>
              <span className="portal-card__cta">Open page</span>
            </button>
          ))}
        </section>

        <section className="panel-grid">
          <article className="panel auth-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Auth bridge</p>
                <h2>登录联调</h2>
              </div>
              <StatusChip tone={isAuthenticated ? "success" : "neutral"}>
                {isAuthenticated ? "Token stored" : "No session"}
              </StatusChip>
            </div>
            {renderAuthBridge(
              "这里继续保留登录桥，方便联调后端受保护接口。",
              "当前已使用脚手架 token 登录。个人空间页会直接复用这组身份信息。",
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Health</p>
                <h2>服务连通性</h2>
              </div>
              <StatusChip tone={backendReachable ? "success" : "warn"}>
                {backendReachable ? "Reachable" : "Pending"}
              </StatusChip>
            </div>
            {dashboard.health ? (
              <>
                <div className="service-grid">
                  {Object.entries(dashboard.health.services).map(([service, ready]) => (
                    <div className="service-card" key={service}>
                      <span>{service}</span>
                      <StatusChip tone={ready ? "success" : "warn"}>
                        {ready ? "configured" : "not wired"}
                      </StatusChip>
                    </div>
                  ))}
                </div>
                <div className="module-list">
                  {dashboard.health.modules.map((moduleName) => (
                    <span className="module-tag" key={moduleName}>
                      {moduleName}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="panel-empty">
                {dashboard.errors.health || "Backend health response has not arrived yet."}
              </p>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Profile preview</p>
                <h2>空间速览</h2>
              </div>
            </div>
            {profile ? (
              <div className="profile-card">
                <div>
                  <p className="profile-name">{profile.nickname}</p>
                  <p className="profile-meta">
                    @{profile.username} · {profile.signature}
                  </p>
                </div>
                <p className="profile-bio">{profile.bio}</p>
                <div className="collection-grid">
                  {Object.entries(profile.collections).map(([label, count]) => (
                    <div className="collection-item" key={label}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="panel-empty">
                {isAuthenticated
                  ? dashboard.errors.profile || "Profile request is pending."
                  : "登录后，个人空间页会展示头像、签名和收藏统计。"}
              </p>
            )}
          </article>
        </section>

        <section className="panel-grid preview-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Featured story</p>
                <h2>文章流预览</h2>
              </div>
            </div>
            {featuredArticle ? (
              <div className="content-card">
                <div className="content-card__header">
                  <h3>{featuredArticle.title}</h3>
                  <StatusChip tone="success">{featuredArticle.visibility}</StatusChip>
                </div>
                <p>{excerpt(featuredArticle.summary || featuredArticle.content, 180)}</p>
                <div className="meta-row">
                  <span>{featuredArticle.author}</span>
                  <span>{featuredArticle.tags.join(" · ") || "暂无标签"}</span>
                </div>
              </div>
            ) : (
              <p className="panel-empty">
                {dashboard.errors.articles || "文章感悟页会从这里挑一条公开文章做预览。"}
              </p>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Forum preview</p>
                <h2>讨论串预览</h2>
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
                  <span>{featuredThread.reply_count} replies</span>
                </div>
              </div>
            ) : (
              <p className="panel-empty">
                {dashboard.errors.threads || "论坛聊天室页会把最新讨论和匿名聊天拆开展示。"}
              </p>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Exhibit preview</p>
                <h2>展示墙预览</h2>
              </div>
            </div>
            <div className="stack-list">
              <div className="content-card">
                <div className="content-card__header">
                  <h3>{ALBUM_ENTRIES[0].title}</h3>
                  <StatusChip tone="accent">{ALBUM_ENTRIES[0].accent}</StatusChip>
                </div>
                <p>{ALBUM_ENTRIES[0].caption}</p>
              </div>
              <div className="content-card">
                <div className="content-card__header">
                  <h3>{GRAMOPHONE_TRACKS[0].title}</h3>
                  <StatusChip tone="neutral">{GRAMOPHONE_TRACKS[0].length}</StatusChip>
                </div>
                <p>{GRAMOPHONE_TRACKS[0].detail}</p>
              </div>
            </div>
          </article>
        </section>
      </>
    );
  }

  function renderStoriesPage(): ReactNode {
    return (
      <>
        <SectionHero
          kicker="Public stories"
          title="公开文章与感悟区"
          description="把可公开浏览的文章和编辑部式的短感悟拆成同页双栏，一边是内容流，一边是更轻的情绪记录。"
          metrics={[
            {
              detail: publicArticles.length ? "Public only" : "Using all article items",
              label: "Visible articles",
              tone: publicArticles.length ? "success" : "warn",
              value: String(storyFeed.length),
            },
            {
              detail: "Curated thoughts",
              label: "Reflection notes",
              tone: "accent",
              value: String(REFLECTION_ENTRIES.length),
            },
            {
              detail: dashboard.errors.articles || "Article feed synced",
              label: "Feed status",
              tone: dashboard.errors.articles ? "warn" : "success",
              value: lastUpdatedLabel,
            },
          ]}
        />

        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Article stream</p>
                <h2>公开文章</h2>
              </div>
              <StatusChip tone="accent">{storyFeed.length} items</StatusChip>
            </div>
            {dashboard.errors.articles ? <p className="panel-error">{dashboard.errors.articles}</p> : null}
            <div className="stack-list">
              {storyFeed.map((article) => (
                <div className="content-card content-card--story" key={article.id}>
                  <div className="content-card__header">
                    <h3>{article.title}</h3>
                    <StatusChip tone={article.visibility === "public" ? "success" : "accent"}>
                      {article.visibility}
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
              {!storyFeed.length && !pageState.loading ? (
                <p className="panel-empty">No article data returned.</p>
              ) : null}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Reflection board</p>
                <h2>感悟区</h2>
              </div>
              <StatusChip tone="accent">Editor&apos;s desk</StatusChip>
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
          kicker="Live talk"
          title="论坛讨论与匿名聊天室"
          description="讨论串负责沉淀，匿名聊天室负责即时吐槽。两个入口分工不同，但共享同一层社区氛围。"
          metrics={[
            {
              detail: boardCount ? `${boardCount} boards` : "No boards yet",
              label: "Discussion threads",
              tone: dashboard.threads.length ? "accent" : "warn",
              value: String(dashboard.threads.length),
            },
            {
              detail: "Front-end only demo",
              label: "Anon room",
              tone: "neutral",
              value: `${chatMessages.length} msgs`,
            },
            {
              detail: dashboard.errors.threads || "Forum feed synced",
              label: "Sync status",
              tone: dashboard.errors.threads ? "warn" : "success",
              value: lastUpdatedLabel,
            },
          ]}
        />

        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Forum stream</p>
                <h2>讨论串</h2>
              </div>
              <StatusChip tone="accent">{dashboard.threads.length} threads</StatusChip>
            </div>
            {dashboard.errors.threads ? <p className="panel-error">{dashboard.errors.threads}</p> : null}
            <div className="stack-list">
              {dashboard.threads.map((thread) => (
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
                    <span>{thread.reply_count} replies</span>
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
              {!dashboard.threads.length && !pageState.loading ? (
                <p className="panel-empty">No thread data returned.</p>
              ) : null}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Anonymous room</p>
                <h2>匿名聊天室</h2>
              </div>
              <StatusChip tone="neutral">Local-only</StatusChip>
            </div>
            <p className="panel-empty">
              这里先做前端展示态。你发出的消息只保留在当前浏览器会话里，用于验证页面结构和氛围。
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
                <span>投下一句匿名感想</span>
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
          kicker="Private room"
          title="用户个人空间"
          description="个人空间不只是一张资料卡，它还应该能承接收藏、短感想、最近在意的内容和时间痕迹。"
          metrics={[
            {
              detail: isAuthenticated ? "Signed in" : "Guest mode",
              label: "Access",
              tone: isAuthenticated ? "success" : "neutral",
              value: isAuthenticated ? "Private" : "Guest",
            },
            {
              detail: profile ? "Collected items" : "Profile pending",
              label: "Collection",
              tone: profile ? "accent" : "warn",
              value: String(collectionTotal),
            },
            {
              detail: profile ? profile.signature : "Login to unlock profile card",
              label: "Current status",
              tone: profile ? "success" : "neutral",
              value: profile ? profile.nickname : "Awaiting login",
            },
          ]}
        />

        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Profile stage</p>
                <h2>空间主卡</h2>
              </div>
              <StatusChip tone={profile ? "success" : "neutral"}>
                {profile ? "Profile loaded" : "Guest preview"}
              </StatusChip>
            </div>
            {profile ? (
              <div className="profile-stage">
                <div className="profile-stage__header">
                  {profile.avatar_url ? (
                    <img
                      alt={profile.nickname}
                      className="profile-stage__avatar"
                      src={profile.avatar_url}
                    />
                  ) : (
                    <div className="profile-stage__avatar profile-stage__avatar--fallback">
                      {getAvatarFallback(profile)}
                    </div>
                  )}
                  <div className="profile-stage__copy">
                    <p className="profile-name">{profile.nickname}</p>
                    <p className="profile-meta">
                      @{profile.username} · {profile.signature}
                    </p>
                    <p className="profile-bio">{profile.bio}</p>
                  </div>
                </div>
                <div className="collection-grid">
                  {Object.entries(profile.collections).map(([label, count]) => (
                    <div className="collection-item" key={label}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="profile-stage profile-stage--empty">
                <div className="profile-stage__avatar profile-stage__avatar--fallback">
                  {getAvatarFallback(null)}
                </div>
                <div className="profile-stage__copy">
                  <p className="profile-name">Guest room</p>
                  <p className="profile-meta">登录后可拉取 `/users/me` 并填满这块空间。</p>
                  <p className="profile-bio">
                    这里预留给头像、签名、个性简介和收藏统计，页面结构已经独立出来。
                  </p>
                </div>
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Identity</p>
                <h2>登录与空间同步</h2>
              </div>
              <StatusChip tone={isAuthenticated ? "success" : "neutral"}>
                {isAuthenticated ? "Linked" : "Sign in needed"}
              </StatusChip>
            </div>
            {renderAuthBridge(
              "登录后，这个页面会自动展示昵称、签名、简介和收藏统计。",
              "当前会话已经连上个人空间，退出后会回到游客预览态。",
            )}
          </article>
        </section>

        <section className="panel-grid preview-grid">
          {SPACE_MEMORIES.map((memory) => (
            <article className="panel memory-card" key={memory.id}>
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Space note</p>
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
          kicker="Showcase wall"
          title="相册、拍立得、旧纸、时间轴与留声机的展示墙"
          description="这一页不强调接口联调，而是强调展示方式本身。每个区域像一个展柜，负责承接不同质感的内容。"
          metrics={[
            {
              detail: "Album + polaroids",
              label: "Images",
              tone: "accent",
              value: String(ALBUM_ENTRIES.length + POLAROID_ENTRIES.length),
            },
            {
              detail: "Archive notes",
              label: "Paper pieces",
              tone: "warn",
              value: String(PAPER_ENTRIES.length),
            },
            {
              detail: "Timeline + gramophone",
              label: "Ambient zones",
              tone: "neutral",
              value: String(TIMELINE_ENTRIES.length + GRAMOPHONE_TRACKS.length),
            },
          ]}
        />

        <section className="showcase-grid">
          <article className="panel showcase-panel showcase-panel--wide">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Album wall</p>
                <h2>相册</h2>
              </div>
            </div>
            <div className="album-grid">
              {ALBUM_ENTRIES.map((entry) => (
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
                <p className="panel-kicker">Polaroid board</p>
                <h2>拍立得</h2>
              </div>
            </div>
            <div className="polaroid-grid">
              {POLAROID_ENTRIES.map((entry) => (
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
                <p className="panel-kicker">Old paper</p>
                <h2>旧纸</h2>
              </div>
            </div>
            <div className="paper-stack">
              {PAPER_ENTRIES.map((entry) => (
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
                <p className="panel-kicker">Timeline</p>
                <h2>时间轴</h2>
              </div>
            </div>
            <div className="timeline-list">
              {TIMELINE_ENTRIES.map((entry) => (
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
                <p className="panel-kicker">Gramophone</p>
                <h2>留声机</h2>
              </div>
              <StatusChip tone="neutral">Now spinning</StatusChip>
            </div>
            <div className="track-list">
              {GRAMOPHONE_TRACKS.map((track) => (
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
          backendReachable={backendReachable}
          currentPath={routePath}
          hidden={isHeaderHidden}
          isAuthenticated={isAuthenticated}
          isRefreshing={pageState.refreshing}
          lastUpdatedLabel={lastUpdatedLabel}
          navigation={NAV_ITEMS}
          onNavigate={handleNavigate}
          onRefresh={() => {
            void handleRefresh();
          }}
        />
        {renderCurrentPage()}
      </main>
    </>
  );
}

export default App;
