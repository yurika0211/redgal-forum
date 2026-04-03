import type {
  ChangeEvent,
  FormEvent,
} from "react";
import type { Article as ApiArticle, Session } from "../api";
import PaginationBar from "../components/PaginationBar";
import RichContent from "../components/RichContent";
import SectionHero from "../components/SectionHero";
import StatusChip from "../components/StatusChip";
import type { PagerState } from "../lib/pagination";
import {
  excerpt,
  extractMarkdownPreviewImage,
  normalizeVisibilityLabel,
} from "../lib/text";
import type { ArticleFormState, FormActionState } from "../types/app";

interface StoriesPageProps {
  activeArticle: ApiArticle | null;
  articleActionState: FormActionState<ApiArticle>;
  articleDetailError: string;
  articleForm: ArticleFormState;
  articlePager: PagerState;
  articlesError: string;
  backendReachable: boolean;
  hasVerifiedSpaceAccess: boolean;
  isLoadingData: boolean;
  lastUpdatedLabel: string;
  selectedArticleID: string | null;
  session: Session | null;
  storyFeed: ApiArticle[];
  onArticleFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onArticlePageChange: (page: number) => void;
  onArticleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onNavigate: (href: string) => void;
}

export default function StoriesPage({
  activeArticle,
  articleActionState,
  articleDetailError,
  articleForm,
  articlePager,
  articlesError,
  backendReachable,
  hasVerifiedSpaceAccess,
  isLoadingData,
  lastUpdatedLabel,
  selectedArticleID,
  session,
  storyFeed,
  onArticleFieldChange,
  onArticlePageChange,
  onArticleSubmit,
  onNavigate,
}: StoriesPageProps) {
  if (selectedArticleID) {
    const articleCover = activeArticle ? extractMarkdownPreviewImage(activeArticle.content) : null;
    const relatedArticles = storyFeed
      .filter((article) => article.id !== selectedArticleID)
      .slice(0, 5);

    return (
      <section className="detail-page">
        <article className="panel detail-hero detail-hero--story">
          <div className="detail-hero__top">
            <button className="ghost-button detail-back-link" type="button" onClick={() => onNavigate("/stories")}>
              返回文章列表
            </button>
          </div>
          <p className="eyebrow">文章详情</p>
          <h1 className="detail-hero__title">{activeArticle?.title || "文章详情"}</h1>
          <p className="detail-hero__lede">
            {activeArticle?.summary || "这里会像博客文章页一样，把正文放在单独的阅读上下文里。"}
          </p>
          <div className="detail-hero__meta">
            <span>{activeArticle?.author || "读取中"}</span>
            <span>{activeArticle ? normalizeVisibilityLabel(activeArticle.visibility) : "读取中"}</span>
            <span>{activeArticle?.tags.length || 0} 个标签</span>
          </div>
          {activeArticle?.tags.length ? (
            <div className="tag-row">
              {activeArticle.tags.map((tag) => (
                <span className="module-tag" key={`${activeArticle.id}-hero-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        {articleCover ? (
          <section className="panel detail-cover">
            <img alt={activeArticle?.title || "文章封面"} src={articleCover} />
          </section>
        ) : null}

        <section className="detail-layout">
          <article className="panel detail-main">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">正文</p>
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
              <div className="detail-body">
                <RichContent content={activeArticle.content} />
              </div>
            ) : (
              <p className="panel-empty">文章详情加载中。</p>
            )}
          </article>

          <aside className="panel detail-side">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">文章信息</p>
                <h2>阅读索引</h2>
              </div>
            </div>
            <div className="stack-list">
              <div className="content-card detail-side-card">
                <div className="content-card__header">
                  <h3>作者</h3>
                  <StatusChip tone="neutral">Article</StatusChip>
                </div>
                <p>{activeArticle?.author || "读取中"}</p>
              </div>
              <div className="content-card detail-side-card">
                <div className="content-card__header">
                  <h3>可见范围</h3>
                  <StatusChip tone="accent">Visibility</StatusChip>
                </div>
                <p>{activeArticle ? normalizeVisibilityLabel(activeArticle.visibility) : "读取中"}</p>
              </div>
              <div className="content-card detail-side-card">
                <div className="content-card__header">
                  <h3>继续阅读</h3>
                  <StatusChip tone="neutral">{relatedArticles.length} 篇</StatusChip>
                </div>
                <div className="stack-list detail-related-list">
                  {relatedArticles.map((article) => (
                    <button
                      className="content-card thread-card-button detail-related-card"
                      key={article.id}
                      type="button"
                      onClick={() => onNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                    >
                      <strong>{article.title}</strong>
                      <p>{excerpt(article.summary || article.content, 110)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>
      </section>
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
            label: "文章数",
            value: String(storyFeed.length),
            detail: articlesError || "本页公开可读",
            tone: articlesError ? "warn" : "success",
          },
          {
            label: "当前阅读",
            value: activeArticle ? "已展开" : "未选择",
            detail: activeArticle ? activeArticle.title : "从左侧选一篇展开",
            tone: activeArticle ? "accent" : "neutral",
          },
          {
            label: "最近同步",
            value: lastUpdatedLabel,
            detail: backendReachable ? "文章列表来自后端" : "当前使用兜底数据",
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
                onClick={() => onNavigate(`/stories/${encodeURIComponent(article.id)}`)}
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
          <PaginationBar pager={articlePager} onPageChange={onArticlePageChange} emptyText="暂无文章。" />
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
            <form className="space-form" onSubmit={(event) => void onArticleSubmit(event)}>
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
                <span>正文</span>
                <textarea
                  name="content"
                  rows={6}
                  value={articleForm.content}
                  onChange={onArticleFieldChange}
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
                  onChange={onArticleFieldChange}
                  placeholder="用逗号分隔，例如：站台，慢热，短札"
                />
              </label>
              <label>
                <span>可见范围</span>
                <select name="visibility" value={articleForm.visibility} onChange={onArticleFieldChange}>
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
