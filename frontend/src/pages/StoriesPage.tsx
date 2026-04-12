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
import type { PagerState } from "../lib/pagination";
import { buildPublicProfileHref } from "../lib/profile";
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

function toAuthorInitial(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "R";
  }

  return normalized.charAt(0).toUpperCase();
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
      <section className="mt-5 grid gap-4">
        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm grid gap-2 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5" type="button" onClick={() => onNavigate("/stories")}>
              返回文章列表
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)] gap-x-2">
            <span>/ 文章编辑</span>
            <span>{session ? "已登录" : "游客模式"}</span>
            <span>{isEditingMode ? `编辑 #${articleEditingTargetID}` : "新建模式"}</span>
          </div>
          <h1 className="text-2xl font-semibold text-[color:var(--text-strong)] text-xl">{isEditingMode ? "编辑文章" : "发布文章"}</h1>
          <p className="text-sm leading-7 text-[color:var(--text-soft)]">
            在这里独立编辑标题、摘要、正文与可见范围，不再挤在文章详情面板里。
          </p>
        </article>

        {!session ? (
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <p className="text-sm text-[color:var(--text-muted)]">登录并通过认证后，这里可以直接发布新的专栏文章。</p>
          </article>
        ) : !hasVerifiedSpaceAccess ? (
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <p className="text-sm text-[color:var(--text-muted)]">当前账号还没有写作权限，需要通过认证后才能发文。</p>
          </article>
        ) : (
          <form className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm grid gap-3" onSubmit={(event) => void onArticleSubmit(event)}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">编辑器</p>
                <h2>Markdown 编辑器</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {articleActionState.success ? <span className="text-sm text-[color:var(--text-muted)]">{articleActionState.success}</span> : null}
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

            <label>
              <span>标题</span>
              <input
                name="title"
                type="text"
                value={articleForm.title}
                onChange={onArticleFieldChange}
                placeholder="输入文章标题"
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span>摘要</span>
                <input
                  name="summary"
                  type="text"
                  value={articleForm.summary}
                  onChange={onArticleFieldChange}
                  placeholder="一句话概括这篇札记"
                />
              </label>
              <label>
                <span>标签</span>
                <input
                  name="tagsText"
                  type="text"
                  value={articleForm.tagsText}
                  onChange={onArticleFieldChange}
                  placeholder="用逗号分隔，例如：站台，慢热，短札"
                />
              </label>
              <label>
                <span>可见范围</span>
                <select name="visibility" value={articleForm.visibility} onChange={onArticleFieldChange}>
                  <option value="public">公开</option>
                  <option value="member">仅成员可见</option>
                  <option value="private">仅自己可见</option>
                </select>
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
                  placeholder={"写下正文内容，支持 Markdown 与 LaTeX\n例如：行内 $E=mc^2$；块级 $$\\int_0^1 x^2\\,dx$$"}
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

            {articleActionState.error ? <p className="text-sm text-rose-500/90">{articleActionState.error}</p> : null}
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
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5" type="button" onClick={() => onNavigate("/stories")}>
              ← 返回列表
            </button>
            <h1>{activeArticle?.title || "文章详情"}</h1>
            <p className="text-sm text-[color:var(--text-muted)]">创建时间：{articleCreatedAt}</p>
            <p className="text-sm text-[color:var(--text-muted)]">更新时间：{articleUpdatedAt}</p>
            <p className="text-sm text-[color:var(--text-muted)]">
              {readMinutes} 分钟阅读 · {commentCount} 条评论 · {likeCount} 次点赞
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              作者：
              {activeArticle?.author ? (
                <button
                  className="inline-flex items-center text-[color:var(--color-primary)] underline decoration-dotted underline-offset-2 transition hover:text-[color:var(--text-strong)] font-medium"
                  type="button"
                  onClick={() => navigateToAuthorSpace(activeArticle.author)}
                >
                  {activeArticle.author}
                </button>
              ) : (
                "未知"
              )}
            </p>
            {activeArticle?.tags.length ? (
              <div className="story-article-hero__tags">
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
              <div className="story-article-hero__actions">
                {canEditActiveArticle && activeArticle ? (
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => onStartArticleEdit(activeArticle)}
                    disabled={articleManageActionState.pending || articleActionState.pending}
                  >
                    编辑文章
                  </button>
                ) : null}
                {canDeleteArticle ? (
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 story-reading-delete-button"
                    type="button"
                    onClick={() => void handleDeleteArticle()}
                    disabled={articleManageActionState.pending}
                  >
                    删除文章
                  </button>
                ) : null}
              </div>
            ) : null}
            {articleManageActionState.error ? <p className="text-sm text-rose-500/90">{articleManageActionState.error}</p> : null}
            {articleManageActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{articleManageActionState.success}</p> : null}
          </div>
        </header>

        <section className="story-article-sheet">
          <div className={`story-article-sheet__layout ${articleHeadings.length ? "" : "story-article-sheet__layout--no-toc"}`}>
            <aside className="story-article-author-card">
              <p className="story-article-author-card__title">作者介绍</p>
              <div className="story-article-author-card__identity">
                {authorAvatarURL ? (
                  <img
                    alt={`${authorName} 的头像`}
                    className="h-10 w-10 rounded-full border border-[color:var(--line-soft)] object-cover bg-white/40"
                    src={authorAvatarURL}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full border border-[color:var(--line-soft)] object-cover bg-white/40 inline-flex items-center justify-center font-semibold text-[color:var(--text-main)]">
                    {toAuthorInitial(authorName)}
                  </div>
                )}
                <div className="story-article-author-card__name-block">
                  <p className="story-article-author-card__name">{authorName}</p>
                  {authorUsername ? <p className="story-article-author-card__username">@{authorUsername}</p> : null}
                </div>
              </div>
              <p className="story-article-author-card__bio">{authorBio}</p>
              {buildPublicProfileHref(authorSpaceTarget) ? (
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 story-article-author-card__link"
                  type="button"
                  onClick={() => navigateToAuthorSpace(authorSpaceTarget)}
                >
                  查看个人空间
                </button>
              ) : null}
              {authorProfileError ? <p className="text-sm text-[color:var(--text-muted)]">资料读取失败，先展示基础信息。</p> : null}
            </aside>

            <article className="story-article-main">
              <p className="story-article-main__date">{articleCreatedAt}</p>
              {articleDetailError ? (
                <p className="text-sm text-rose-500/90">{articleDetailError}</p>
              ) : activeArticle ? (
                <div className="grid gap-3 text-sm leading-7 text-[color:var(--text-main)] story-article-main__body">
                  <RichContent content={activeArticle.content} />
                </div>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">文章详情加载中。</p>
              )}
            </article>

            {articleHeadings.length ? (
              <aside className="story-article-toc">
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
      <section className="mt-5 grid gap-[18px]">
        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm story-list-panel">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3 story-list-panel__head">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)] text-xs tracking-[0.14em] text-[color:var(--text-faint)]">最新文章</p>
              <h2 className="text-xl font-semibold text-[color:var(--text-strong)]">专栏内容</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 story-list-panel__actions">
              <StatusChip tone="accent">{articlePager.total} 篇</StatusChip>
              <button
                className={`px-2.5 py-1 text-xs inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition ${ canWriteArticle ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)] text-[color:var(--text-strong)] hover:bg-[color:var(--surface-card)]" : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[color:var(--text-main)] hover:border-[color:var(--line-strong)]" }`}
                type="button"
                onClick={onStartArticleCreate}
              >
                发布文章
              </button>
            </div>
          </div>
          <label className="grid gap-1 mb-2" htmlFor="story-list-search">
            <span className="text-xs text-[color:var(--text-muted)]">关键词搜索</span>
            <input
              id="story-list-search"
              className="w-full rounded-lg border border-[color:var(--line-soft)] bg-white/70 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)]"
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
                        <h3 className="text-lg font-semibold leading-snug text-[color:var(--text-strong)]">{article.title}</h3>
                        <span className="story-snippet-item__visibility inline-flex items-center rounded-full border border-[color:var(--line-soft)] px-2 py-0.5 text-[0.78rem] text-[color:var(--text-muted)]">
                          {normalizeVisibilityLabel(article.visibility)}
                        </span>
                      </div>
                      <p className="story-snippet-item__excerpt mt-2.5 text-sm leading-[1.8] text-[color:var(--text-soft)]">{excerpt(article.summary || article.content, 190)}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--text-muted)]">
                        <span className="font-medium text-[color:var(--text-main)]">
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
                        <span className="">
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
