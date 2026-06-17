import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type {
  Article as ApiArticle,
  DeleteArticleResult,
  Profile as ApiProfile,
  Session,
} from "../api";
import { fetchPublicProfile } from "../api";
import PaginationBar from "../components/PaginationBar";
import RichContent from "../components/RichContent";
import StatusChip from "../components/StatusChip";
import UserAvatar from "../components/UserAvatar";
import type { PagerState } from "../lib/pagination";
import { buildPublicProfileHref } from "../lib/profile";
import { resolveUserRoleRing } from "../lib/roles";
import {
  excerpt,
  extractMarkdownHeadings,
  extractMarkdownPreviewImage,
  formatPublishedAgo,
  normalizeVisibilityLabel,
} from "../lib/text";
import type { ArticleFormState, FormActionState } from "../types/app";

interface StoriesPageProps {
  activeArticle: ApiArticle | null;
  articleActionState: FormActionState<ApiArticle>;
  articleManageActionState: FormActionState<ApiArticle | DeleteArticleResult>;
  articleDetailError: string;
  articleForm: ArticleFormState;
  articlePager: PagerState;
  articleSearchKeyword: string;
  articlesError: string;
  canDeleteArticle: boolean;
  displayProfile: ApiProfile | null;
  hasVerifiedSpaceAccess: boolean;
  isLoadingData: boolean;
  isStoriesEditorMode: boolean;
  articleEditingTargetID: string | null;
  selectedArticleID: string | null;
  session: Session | null;
  storyFeed: ApiArticle[];
  onArticleFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onArticlePageChange: (page: number) => void;
  onArticleSearchKeywordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onArticleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onArticleDelete: (articleID: string) => Promise<boolean>;
  onStartArticleCreate: () => void;
  onStartArticleEdit: (article: ApiArticle) => void;
  onNavigate: (href: string) => void;
}

function formatStoryDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "----.--.--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "----.--.--";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function estimateReadMinutes(content: string): number {
  const chars = content.replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / 900));
}

export default function StoriesPage({
  activeArticle,
  articleActionState,
  articleManageActionState,
  articleDetailError,
  articleForm,
  articlePager,
  articleSearchKeyword,
  articlesError,
  canDeleteArticle,
  displayProfile,
  hasVerifiedSpaceAccess,
  isLoadingData,
  isStoriesEditorMode,
  articleEditingTargetID,
  selectedArticleID,
  session,
  storyFeed,
  onArticleDelete,
  onArticleFieldChange,
  onArticlePageChange,
  onArticleSearchKeywordChange,
  onArticleSubmit,
  onStartArticleCreate,
  onStartArticleEdit,
  onNavigate,
}: StoriesPageProps) {
  function navigateToAuthorSpace(name: string): void {
    const href = buildPublicProfileHref(name);
    if (!href) {
      return;
    }
    onNavigate(href);
  }

  function handleAuthorClickInList(event: MouseEvent<HTMLSpanElement>, name: string): void {
    event.preventDefault();
    event.stopPropagation();
    navigateToAuthorSpace(name);
  }

  function handleAuthorKeyDownInList(event: KeyboardEvent<HTMLSpanElement>, name: string): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    navigateToAuthorSpace(name);
  }

  async function handleDeleteArticle(): Promise<void> {
    if (!activeArticle) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`确认删除《${activeArticle.title}》？该操作不可撤销。`);
      if (!confirmed) {
        return;
      }
    }

    await onArticleDelete(activeArticle.id);
  }

  const profileNames = [
    displayProfile?.username?.trim().toLowerCase() ?? "",
    displayProfile?.nickname?.trim().toLowerCase() ?? "",
  ].filter(Boolean);
  const activeAuthor = activeArticle?.author.trim().toLowerCase() ?? "";
  const canEditActiveArticle = Boolean(
    session &&
      hasVerifiedSpaceAccess &&
      activeArticle &&
      profileNames.some((name) => name === activeAuthor),
  );
  const [authorProfile, setAuthorProfile] = useState<ApiProfile | null>(null);
  const [authorProfileError, setAuthorProfileError] = useState("");
  const [isAuthorProfileLoading, setIsAuthorProfileLoading] = useState(false);

  useEffect(() => {
    const normalizedAuthor = activeArticle?.author.trim().replace(/^@+/, "") ?? "";
    if (!selectedArticleID || !normalizedAuthor) {
      setAuthorProfile(null);
      setAuthorProfileError("");
      setIsAuthorProfileLoading(false);
      return;
    }

    const isCurrentProfileAuthor = Boolean(
      displayProfile &&
        [displayProfile.username, displayProfile.nickname]
          .map((value) => value.trim().replace(/^@+/, "").toLowerCase())
          .filter(Boolean)
          .some((value) => value === normalizedAuthor.toLowerCase()),
    );
    if (isCurrentProfileAuthor && displayProfile) {
      setAuthorProfile(displayProfile);
      setAuthorProfileError("");
      setIsAuthorProfileLoading(false);
      return;
    }

    let cancelled = false;
    setAuthorProfile(null);
    setAuthorProfileError("");
    setIsAuthorProfileLoading(true);

    void fetchPublicProfile(normalizedAuthor)
      .then((profile) => {
        if (cancelled) {
          return;
        }
        setAuthorProfile(profile);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error && error.message ? error.message : "作者资料暂不可用";
        setAuthorProfileError(message);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setIsAuthorProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeArticle?.author, displayProfile, selectedArticleID]);

  if (isStoriesEditorMode) {
    const isEditingMode = Boolean(articleEditingTargetID);

    return (
      <section className="story-editor-view grid gap-4">
        <article className="ui-card-panel rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm grid gap-2 py-3 story-editor-hero">
          <div className="story-editor-hero__head flex flex-wrap items-start justify-between gap-2">
            <button
              className="story-editor-hero__back inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => onNavigate("/stories")}
            >
              返回文章列表
            </button>
          </div>
          <div className="story-editor-hero__meta" aria-label="编辑状态">
            <span className="story-editor-hero__meta-chip">/ 文章编辑</span>
            <span className="story-editor-hero__meta-chip">{session ? "已登录" : "游客模式"}</span>
            <span className="story-editor-hero__meta-chip">{isEditingMode ? `编辑 #${articleEditingTargetID}` : "新建模式"}</span>
          </div>
          <h1 className="story-editor-hero__title">{isEditingMode ? "编辑文章" : "发布文章"}</h1>
          <p className="story-editor-hero__desc">
            在这里独立编辑标题、摘要、正文与可见范围，不再挤在文章详情面板里。
          </p>
        </article>

        {!session ? (
          <article className="story-editor-access-hint story-editor-access-hint--login rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <p className="story-editor-access-hint__title">登录并通过认证后可直接发布专栏文章。</p>
            <p className="story-editor-access-hint__desc">当前处于游客模式，你可以先回到列表浏览，再进入个人空间完成登录。</p>
            <p className="story-editor-access-hint__tip">提示：登录后请先在个人空间完成认证，再返回此页发布内容。</p>
            <div className="story-editor-access-hint__actions">
              <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105" type="button" onClick={() => onNavigate("/login")}>
                去登录
              </button>
              <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80" type="button" onClick={() => onNavigate("/stories")}>
                返回列表
              </button>
            </div>
          </article>
        ) : !hasVerifiedSpaceAccess ? (
          <article className="story-editor-access-hint story-editor-access-hint--verify rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <p className="story-editor-access-hint__title">当前账号还没有写作权限。</p>
            <p className="story-editor-access-hint__desc">请先完成认证流程，认证通过后即可使用文章编辑器发布内容。</p>
            <p className="story-editor-access-hint__tip">完成认证后，你将获得发布与编辑自己文章的权限。</p>
          </article>
        ) : (
          <form className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm form-layout story-editor-form" onSubmit={(event) => void onArticleSubmit(event)}>
            <div className="story-editor-form__head mb-2 flex flex-wrap items-start justify-between gap-3">
              <div className="story-editor-form__title-group">
                <p className="story-editor-form__kicker text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">编辑器</p>
                <h2 className="story-editor-form__title">Markdown 编辑器</h2>
              </div>
              <div className="story-editor-form__actions flex flex-wrap items-center gap-2">
                {articleActionState.success ? <span className="story-editor-form__feedback text-sm text-[color:var(--text-muted)]">{articleActionState.success}</span> : null}
                {isEditingMode ? (
                  <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={onStartArticleCreate}>
                    新建文章
                  </button>
                ) : null}
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={articleActionState.pending}>
                  {articleActionState.pending ? (isEditingMode ? "保存中..." : "发布中...") : isEditingMode ? "保存修改" : "发布文章"}
                </button>
              </div>
            </div>

            <label className="form-field">
              <span>标题</span>
              <input
                className="form-control"
                name="title"
                type="text"
                value={articleForm.title}
                onChange={onArticleFieldChange}
                placeholder="输入文章标题"
                required
              />
            </label>

            <div className="story-editor-meta">
              <div className="story-editor-meta__row">
                <fieldset className="story-editor-visibility">
                  <legend className="story-editor-visibility__legend">可见范围</legend>
                  <div className="story-editor-visibility__options">
                    <label
                      className={`story-editor-visibility__option ${
                        articleForm.visibility === "public" ? "story-editor-visibility__option--active" : ""
                      }`}
                    >
                      <input
                        checked={articleForm.visibility === "public"}
                        className="story-editor-visibility__input"
                        name="visibility"
                        onChange={onArticleFieldChange}
                        type="radio"
                        value="public"
                      />
                      <span>公开</span>
                    </label>
                    <label
                      className={`story-editor-visibility__option ${
                        articleForm.visibility === "member" ? "story-editor-visibility__option--active" : ""
                      }`}
                    >
                      <input
                        checked={articleForm.visibility === "member"}
                        className="story-editor-visibility__input"
                        name="visibility"
                        onChange={onArticleFieldChange}
                        type="radio"
                        value="member"
                      />
                      <span>仅成员可见</span>
                    </label>
                    <label
                      className={`story-editor-visibility__option ${
                        articleForm.visibility === "private" ? "story-editor-visibility__option--active" : ""
                      }`}
                    >
                      <input
                        checked={articleForm.visibility === "private"}
                        className="story-editor-visibility__input"
                        name="visibility"
                        onChange={onArticleFieldChange}
                        type="radio"
                        value="private"
                      />
                      <span>仅自己可见</span>
                    </label>
                  </div>
                </fieldset>
                <label className="form-field story-editor-meta__summary">
                  <span>摘要</span>
                  <input
                    className="form-control"
                    name="summary"
                    type="text"
                    value={articleForm.summary}
                    onChange={onArticleFieldChange}
                    placeholder="一句话概括这篇札记"
                  />
                </label>
              </div>
              <label className="form-field story-editor-meta__tags">
                <span>标签</span>
                <input
                  className="form-control"
                  name="tagsText"
                  type="text"
                  value={articleForm.tagsText}
                  onChange={onArticleFieldChange}
                  placeholder="用逗号分隔，例如：站台，慢热，短札"
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="story-editor-form__panel story-editor-form__panel--source grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-white/35 p-3">
                <div className="story-editor-form__panel-label text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Markdown 源文本</div>
                <textarea
                  className="form-control"
                  name="content"
                  rows={14}
                  value={articleForm.content}
                  onChange={onArticleFieldChange}
                  placeholder={"写下正文内容，支持 Markdown 与 LaTeX\n例如：行内 $E=mc^2$；块级 $$\\int_0^1 x^2\\,dx$$"}
                  required
                />
              </section>
              <section className="story-editor-form__panel story-editor-form__panel--preview grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-white/35 p-3 bg-[color:var(--surface-card)]">
                <div className="story-editor-form__panel-label text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">实时预览</div>
                <div className="story-editor-form__preview min-h-[220px] overflow-auto rounded-lg border border-[color:var(--line-soft)] bg-white/55 p-3">
                  {articleForm.content.trim() ? (
                    <RichContent content={articleForm.content} />
                  ) : (
                    <p className="text-sm text-[color:var(--text-muted)]">预览区：输入 Markdown 后会实时显示。</p>
                  )}
                </div>
              </section>
            </div>

            {articleActionState.error ? <p className="story-editor-form__feedback story-editor-form__feedback--error text-sm text-rose-500/90">{articleActionState.error}</p> : null}
          </form>
        )}
      </section>
    );
  }

  if (selectedArticleID) {
    const articleCover = activeArticle ? extractMarkdownPreviewImage(activeArticle.content) : null;
    const articleCreatedAt = formatStoryDate(activeArticle?.created_at);
    const articleUpdatedAt = formatStoryDate(activeArticle?.updated_at);
    const readMinutes = estimateReadMinutes(activeArticle?.content || "");
    const commentCount = activeArticle?.comment_count ?? 0;
    const likeCount = activeArticle?.like_count ?? 0;
    const articleHeadings = activeArticle
      ? extractMarkdownHeadings(activeArticle.content)
      : [];
    const authorName = (
      authorProfile?.nickname?.trim() ||
      authorProfile?.username?.trim() ||
      activeArticle?.author.trim() ||
      "作者"
    );
    const authorUsername = authorProfile?.username?.trim() || "";
    const authorBio = (
      authorProfile?.bio?.trim() ||
      authorProfile?.signature?.trim() ||
      (isAuthorProfileLoading ? "作者资料加载中..." : "这个作者还没有填写个人简介。")
    );
    const authorAvatarURL = authorProfile?.avatar_url?.trim() || "";
    const authorSpaceTarget = authorUsername || activeArticle?.author.trim() || "";
    const relatedArticles = storyFeed
      .filter((article) => article.id !== selectedArticleID)
      .slice(0, 5);

    return (
      <section className="story-article-view">
        <header
          className="story-article-hero"
          style={
            articleCover
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(18, 16, 30, 0.76), rgba(18, 16, 30, 0.8)), url(${articleCover})`,
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="story-article-hero__inner">
            <button className="story-article-hero__back" type="button" onClick={() => onNavigate("/stories")}>
              ← 返回列表
            </button>
            <div className="story-article-hero__headline">
              <h1>{activeArticle?.title || "文章详情"}</h1>
            </div>
            <div className="story-article-hero__meta" aria-label="文章信息">
              <p className="story-article-hero__meta-line">发布：{articleCreatedAt}</p>
              <p className="story-article-hero__meta-line">更新：{articleUpdatedAt}</p>
              <p className="story-article-hero__meta-line">
                {readMinutes} 分钟阅读 · {commentCount} 条评论 · {likeCount} 次点赞
              </p>
              <p className="story-article-hero__meta-line">
                作者：
                {activeArticle?.author ? (
                  <button
                    className="story-article-hero__author-link"
                    type="button"
                    onClick={() => navigateToAuthorSpace(activeArticle.author)}
                  >
                    {activeArticle.author}
                  </button>
                ) : (
                  "未知"
                )}
              </p>
            </div>
            {activeArticle?.tags.length ? (
              <div className="story-article-hero__tags" aria-label="文章标签">
                {activeArticle.tags.map((tag) => (
                  <span
                    className={tag.trim() === "征文" ? "story-article-hero__tag--plain" : undefined}
                    key={`${activeArticle.id}-hero-${tag}`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            {canEditActiveArticle || canDeleteArticle ? (
              <div className="story-article-hero__admin" aria-label="文章操作">
                {canEditActiveArticle && activeArticle ? (
                  <button
                    className="story-article-hero__admin-link"
                    type="button"
                    onClick={() => onStartArticleEdit(activeArticle)}
                    disabled={articleManageActionState.pending || articleActionState.pending}
                  >
                    编辑文章
                  </button>
                ) : null}
                {canDeleteArticle ? (
                  <button
                    className="story-article-hero__admin-link story-article-hero__admin-link--danger"
                    type="button"
                    onClick={() => void handleDeleteArticle()}
                    disabled={articleManageActionState.pending}
                  >
                    删除文章
                  </button>
                ) : null}
              </div>
            ) : null}
            {articleManageActionState.error || articleManageActionState.success ? (
              <div className="story-article-hero__feedback" aria-live="polite">
                {articleManageActionState.error ? <p className="text-sm text-rose-500/90">{articleManageActionState.error}</p> : null}
                {articleManageActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{articleManageActionState.success}</p> : null}
              </div>
            ) : null}
          </div>
        </header>

        <section className="story-article-sheet">
          <div className={`story-article-sheet__layout ${articleHeadings.length ? "" : "story-article-sheet__layout--no-toc"}`}>
            <aside className="story-article-author-card story-article-sheet__author">
              <p className="story-article-author-card__title">作者介绍</p>
              <div className="story-article-author-card__identity">
                <UserAvatar
                  className="story-article-author-card__avatar"
                  fallbackMode="initial"
                  label={authorName}
                  roleRing={resolveUserRoleRing(authorProfile?.roles)}
                  shape="circle"
                  size="xl"
                  src={authorAvatarURL}
                  statusTone={authorProfile?.verified ? "success" : "neutral"}
                />
                <div className="story-article-author-card__name-block">
                  <p className="story-article-author-card__name">{authorName}</p>
                  {authorUsername ? <p className="story-article-author-card__username">@{authorUsername}</p> : null}
                </div>
              </div>
              <p className="story-article-author-card__bio">{authorBio}</p>
              {buildPublicProfileHref(authorSpaceTarget) ? (
                <button
                  className="story-article-author-card__link"
                  type="button"
                  onClick={() => navigateToAuthorSpace(authorSpaceTarget)}
                >
                  查看个人空间
                </button>
              ) : null}
              {authorProfileError ? <p className="text-sm text-[color:var(--text-muted)] story-article-author-card__status">资料读取失败，先展示基础信息。</p> : null}
            </aside>

            <article className="story-article-main story-article-sheet__main">
              {articleDetailError ? (
                <p className="text-sm text-rose-500/90">{articleDetailError}</p>
              ) : activeArticle ? (
                <div className="story-article-main__body">
                  <RichContent content={activeArticle.content} />
                </div>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">文章详情加载中。</p>
              )}
            </article>

            {articleHeadings.length ? (
              <aside className="story-article-toc story-article-sheet__toc">
                <p className="story-article-toc__title">目录</p>
                <ul className="story-article-toc__list">
                  {articleHeadings.map((heading) => (
                    <li
                      className={`story-article-toc__item story-article-toc__item--level-${String(Math.min(heading.level, 4))}`}
                      key={`${selectedArticleID}-toc-${heading.anchorID}`}
                    >
                      <a className="story-article-toc__link" href={`#${heading.anchorID}`}>
                        {heading.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </section>

        <section className="story-reading-foot">
          <div className="story-reading-foot__inner">
            <div className="story-reading-foot__head">
              <span>继续阅读</span>
              <span>{relatedArticles.length} 篇</span>
            </div>
            {relatedArticles.length ? (
              <ul className="story-reading-related-list">
                {relatedArticles.map((article) => (
                  <li key={article.id}>
                    <button
                      className="story-reading-related-link"
                      type="button"
                      onClick={() => onNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                    >
                      {article.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">暂无可跳转的其他文章。</p>
            )}
          </div>
        </section>
      </section>
    );
  }

  const canWriteArticle = Boolean(session && hasVerifiedSpaceAccess);

  return (
    <>
      <section className="story-list-view grid gap-[18px]">
        <article className="ui-card-panel rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm story-list-panel">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3 story-list-panel__head">
            <div className="story-list-panel__intro">
              <p className="story-list-panel__kicker text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">最新文章</p>
              <h2 className="story-list-panel__title">专栏内容</h2>
              <p className="story-list-panel__note">按标题、摘要与标签快速筛选，优先浏览最近更新的内容。</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 story-list-panel__actions">
              <StatusChip tone="accent">{articlePager.total} 篇</StatusChip>
              <button
                className={`story-list-panel__publish-btn px-2.5 py-1 text-xs inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition ${ canWriteArticle ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)] text-[color:var(--text-strong)] hover:bg-[color:var(--surface-card)]" : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[color:var(--text-main)] hover:border-[color:var(--line-strong)]" }`}
                type="button"
                onClick={onStartArticleCreate}
              >
                发布文章
              </button>
            </div>
          </div>
          <label className="form-field story-list-panel__search" htmlFor="story-list-search">
            <span className="story-list-panel__search-label">关键词搜索</span>
            <input
              id="story-list-search"
              className="form-control"
              type="search"
              value={articleSearchKeyword}
              onChange={onArticleSearchKeywordChange}
              placeholder="按标题、摘要、正文、作者、标签搜索文章"
            />
          </label>
          {articlesError ? <p className="text-sm text-rose-500/90">{articlesError}</p> : null}
          <div className="story-snippet-list mt-2 grid gap-2.5">
            {storyFeed.map((article) => {
              const previewImage = extractMarkdownPreviewImage(article.content);
              const visibleTags = article.tags
                .map((tag) => tag.trim())
                .filter(Boolean)
                .slice(0, 4);
              const authorLabel = article.author.trim() || "未知作者";

              return (
                <button
                  className="story-snippet-item grid w-full rounded-xl border border-[color:var(--line-soft)] bg-white/[0.52] px-3 py-[14px] text-left transition hover:-translate-y-px hover:border-[color:var(--line-strong)] hover:bg-white/[0.78]"
                  key={article.id}
                  type="button"
                  onClick={() => onNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                >
                  <div className="story-snippet-item__layout flex items-start justify-between gap-[14px] max-[640px]:gap-2.5">
                    <div className="story-snippet-item__content min-w-0 flex-1">
                      <div className="story-snippet-item__head flex flex-wrap items-baseline justify-between gap-2.5">
                        <h3 className="story-snippet-item__title">{article.title}</h3>
                        <span className="story-snippet-item__visibility inline-flex items-center rounded-full border border-[color:var(--line-soft)] px-2 py-0.5 text-[0.78rem] text-[color:var(--text-muted)]">
                          {normalizeVisibilityLabel(article.visibility)}
                        </span>
                      </div>
                      <p className="story-snippet-item__excerpt mt-2.5 text-sm leading-[1.8] text-[color:var(--text-soft)]">{excerpt(article.summary || article.content, 190)}</p>
                      <p className="story-snippet-item__meta mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                        <span className="story-snippet-item__author font-medium text-[color:var(--text-main)]">
                          {buildPublicProfileHref(article.author) ? (
                            <span
                              className="inline-flex items-center text-[color:var(--color-primary)] underline decoration-dotted underline-offset-2 transition hover:text-[color:var(--text-strong)] font-medium"
                              role="link"
                              tabIndex={0}
                              onClick={(event) => handleAuthorClickInList(event, article.author)}
                              onKeyDown={(event) => handleAuthorKeyDownInList(event, article.author)}
                            >
                              {authorLabel}
                            </span>
                          ) : (
                            authorLabel
                          )}
                        </span>
                        <span className="text-[color:var(--text-faint)]" aria-hidden="true">
                          ·
                        </span>
                        <span className="story-snippet-item__date">
                          {formatPublishedAgo(article.created_at)}
                        </span>
                      </p>
                      {visibleTags.length ? (
                        <div className="story-snippet-item__tags mt-2 flex flex-wrap gap-1.5">
                          {visibleTags.map((tag) => (
                            <span className="story-snippet-item__tag rounded-full border border-[color:var(--line-soft)] px-2 py-0.5 text-[0.76rem] text-[color:var(--text-muted)]" key={`${article.id}-tag-${tag}`}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[color:var(--text-faint)]">暂无标签</p>
                      )}
                    </div>
                    {previewImage ? (
                      <div className="story-snippet-item__cover w-[120px] basis-[120px] shrink-0 aspect-[16/11] overflow-hidden rounded-xl border border-[color:var(--line-soft)] bg-white/[0.18] max-[640px]:w-[86px] max-[640px]:basis-[86px] max-[640px]:rounded-lg">
                        <img alt={`${article.title} 头图`} className="block h-full w-full object-cover" src={previewImage} />
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {!storyFeed.length ? (
              <p className="text-sm text-[color:var(--text-muted)]">
                {isLoadingData ? "文章数据加载中。" : "当前没有可展示的文章数据。"}
              </p>
            ) : null}
          </div>
          <PaginationBar pager={articlePager} onPageChange={onArticlePageChange} emptyText="暂无文章。" />
        </article>
      </section>
    </>
  );
}
