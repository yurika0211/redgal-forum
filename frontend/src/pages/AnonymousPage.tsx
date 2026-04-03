import type {
  ChangeEvent,
  FormEvent,
} from "react";
import type {
  ForumReply as ApiForumReply,
  ForumThread as ApiForumThread,
  ForumThreadDetail as ApiForumThreadDetail,
  Session,
} from "../api";
import PaginationBar from "../components/PaginationBar";
import RichContent from "../components/RichContent";
import SectionHero from "../components/SectionHero";
import StatusChip from "../components/StatusChip";
import { formatForumFloor } from "../lib/forum";
import type { PagerState } from "../lib/pagination";
import { excerpt, extractMarkdownPreviewImage, formatDateTime } from "../lib/text";
import type {
  FormActionState,
  ReplyFormState,
  ThreadFormState,
} from "../types/app";

interface AnonymousPageProps {
  activeAnonymousThread: ApiForumThread | null;
  anonymousReplyActionState: FormActionState<ApiForumReply>;
  anonymousReplyForm: ReplyFormState;
  anonymousThreadActionState: FormActionState<ApiForumThread>;
  anonymousThreadDetail: ApiForumThreadDetail | null;
  anonymousThreadDetailError: string;
  anonymousThreadFeed: ApiForumThread[];
  anonymousThreadForm: ThreadFormState;
  anonymousThreadPager: PagerState;
  anonymousThreadsError: string;
  isLoadingData: boolean;
  selectedAnonymousThreadID: string | null;
  session: Session | null;
  onAnonymousReplyFieldChange: (
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>,
  ) => void;
  onAnonymousReplySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAnonymousThreadFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onAnonymousThreadPageChange: (page: number) => void;
  onAnonymousThreadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onNavigate: (href: string) => void;
}

export default function AnonymousPage({
  activeAnonymousThread,
  anonymousReplyActionState,
  anonymousReplyForm,
  anonymousThreadActionState,
  anonymousThreadDetail,
  anonymousThreadDetailError,
  anonymousThreadFeed,
  anonymousThreadForm,
  anonymousThreadPager,
  anonymousThreadsError,
  isLoadingData,
  selectedAnonymousThreadID,
  session,
  onAnonymousReplyFieldChange,
  onAnonymousReplySubmit,
  onAnonymousThreadFieldChange,
  onAnonymousThreadPageChange,
  onAnonymousThreadSubmit,
  onNavigate,
}: AnonymousPageProps) {
  if (selectedAnonymousThreadID) {
    const anonymousCover = activeAnonymousThread
      ? extractMarkdownPreviewImage(activeAnonymousThread.content)
      : null;

    return (
      <section className="detail-page detail-page--anonymous">
        <article className="panel detail-hero detail-hero--anonymous">
          <div className="detail-hero__top">
            <button className="ghost-button detail-back-link" type="button" onClick={() => onNavigate("/anonymous")}>
              返回匿名板
            </button>
          </div>
          <p className="eyebrow">匿名串详情</p>
          <h1 className="detail-hero__title">{activeAnonymousThread?.title || "匿名主题详情"}</h1>
          <p className="detail-hero__lede">
            {activeAnonymousThread
              ? "这里按独立串页来阅读，Tripcode、锁帖状态和楼层都集中展示。"
              : "正在读取匿名主题详情。"}
          </p>
          <div className="detail-hero__meta">
            <span>{activeAnonymousThread?.tripcode || "◆……"}</span>
            <span>{activeAnonymousThread ? `${activeAnonymousThread.reply_count} / 1000` : "楼层读取中"}</span>
            <span>{activeAnonymousThread?.locked ? "主题已锁定" : "主题开放中"}</span>
          </div>
        </article>

        {anonymousCover ? (
          <section className="panel detail-cover">
            <img alt={activeAnonymousThread?.title || "匿名串封面"} src={anonymousCover} />
          </section>
        ) : null}

        <section className="detail-layout">
          <article className="panel detail-main detail-main--thread">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">匿名主楼</p>
                <h2>{activeAnonymousThread?.title || "匿名主题"}</h2>
              </div>
              {activeAnonymousThread ? (
                <StatusChip tone={activeAnonymousThread.locked ? "warn" : "neutral"}>
                  {activeAnonymousThread.locked ? "已锁定" : "讨论中"}
                </StatusChip>
              ) : null}
            </div>
            {anonymousThreadDetailError ? (
              <p className="panel-error">{anonymousThreadDetailError}</p>
            ) : activeAnonymousThread ? (
              <div className="detail-body">
                <p className="detail-body__meta">
                  {activeAnonymousThread.author} {activeAnonymousThread.tripcode || ""}
                </p>
                <RichContent content={activeAnonymousThread.content} />
                <div className="tag-row">
                  {activeAnonymousThread.tags.map((tag) => (
                    <span className="module-tag" key={`${activeAnonymousThread.id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="panel-empty">匿名主题详情加载中。</p>
            )}
          </article>

          <aside className="panel detail-side">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">匿名规则</p>
                <h2>参与说明</h2>
              </div>
            </div>
            <div className="stack-list">
              <div className="content-card detail-side-card">
                <div className="content-card__header">
                  <h3>Tripcode</h3>
                  <StatusChip tone="accent">◆匿名校验</StatusChip>
                </div>
                <p>系统会根据登录用户名生成稳定匿名标识，用来证明“还是同一个匿名发言者”。</p>
              </div>
              <div className="content-card detail-side-card">
                <div className="content-card__header">
                  <h3>sage</h3>
                  <StatusChip tone="neutral">不顶帖</StatusChip>
                </div>
                <p>勾选 sage 后，回复会成功提交，但不会把主题重新顶回串列表顶部。</p>
              </div>
              <div className="content-card detail-side-card">
                <div className="content-card__header">
                  <h3>回复本串</h3>
                  <StatusChip tone={session ? "success" : "warn"}>
                    {session ? "可参与" : "需登录"}
                  </StatusChip>
                </div>
                {!session ? (
                  <p>匿名板允许已登录用户参与，即使还没通过正式认证也能发言。</p>
                ) : (
                  <form className="space-form" onSubmit={(event) => void onAnonymousReplySubmit(event)}>
                    <label>
                      <span>当前主题</span>
                      <input type="text" value={activeAnonymousThread?.title || ""} disabled readOnly />
                    </label>
                    <label>
                      <span>回复内容</span>
                      <textarea
                        name="content"
                        rows={5}
                        value={anonymousReplyForm.content}
                        onChange={onAnonymousReplyFieldChange}
                        placeholder="写下你的匿名回复"
                        required
                      />
                    </label>
                    <label className="gallery-admin__toggle">
                      <input
                        checked={anonymousReplyForm.sage}
                        name="sage"
                        type="checkbox"
                        onChange={onAnonymousReplyFieldChange}
                      />
                      <span>sage 回复，不顶帖</span>
                    </label>
                    {anonymousReplyActionState.error ? <p className="panel-error">{anonymousReplyActionState.error}</p> : null}
                    {anonymousReplyActionState.success ? <p className="panel-empty">{anonymousReplyActionState.success}</p> : null}
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={anonymousReplyActionState.pending || activeAnonymousThread?.locked}
                    >
                      {activeAnonymousThread?.locked
                        ? "主题已锁定"
                        : anonymousReplyActionState.pending
                          ? "提交中..."
                          : "提交匿名回复"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="panel detail-thread-replies">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">匿名楼层</p>
              <h2>本串回复</h2>
            </div>
            <StatusChip tone="accent">{anonymousThreadDetail?.replies.length || 0} 条</StatusChip>
          </div>
          <div className="thread-reply-list forum-floor-list">
            {(anonymousThreadDetail?.replies || []).map((reply) => (
              <article className="content-card thread-reply-card forum-floor-card" key={reply.id}>
                <div className="content-card__header">
                  <div>
                    <h3>{formatForumFloor(reply.floor_no)}</h3>
                    <p className="forum-reply-meta">
                      <span>{reply.author}</span>
                      {reply.tripcode ? <span>{reply.tripcode}</span> : null}
                      <span>{formatDateTime(reply.created_at)}</span>
                      {reply.reply_to_author ? <span>@{reply.reply_to_author}</span> : null}
                    </p>
                  </div>
                </div>
                <div className="detail-body detail-body--reply">
                  <RichContent content={reply.content} />
                </div>
              </article>
            ))}
            {anonymousThreadDetail && anonymousThreadDetail.replies.length === 0 ? (
              <p className="panel-empty">这个匿名主题暂时还没有回复。</p>
            ) : null}
          </div>
        </section>
      </section>
    );
  }

  return (
    <>
      <SectionHero
        kicker="匿名板"
        title="独立匿名版面"
        description="这是单独的匿名板页面。默认按最后回复时间排序，支持 Tripcode、sage 回复以及 1000 楼封顶。"
        metrics={[
          {
            label: "当前主题",
            value: String(anonymousThreadPager.total),
            detail: anonymousThreadsError || "按最后回复时间浮沉",
            tone: anonymousThreadsError ? "warn" : "accent",
          },
          {
            label: "身份规则",
            value: session ? "已登录可发言" : "需登录",
            detail: "只要注册登录即可参与基础匿名讨论",
            tone: session ? "success" : "neutral",
          },
          {
            label: "串寿命",
            value: "1000",
            detail: "到达上限自动锁帖，需要开新串继续",
            tone: "warn",
          },
        ]}
      />

      <section className="page-split-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">串列表</p>
              <h2>匿名主题串</h2>
            </div>
            <StatusChip tone="accent">{anonymousThreadPager.total} 串</StatusChip>
          </div>
          {anonymousThreadsError ? <p className="panel-error">{anonymousThreadsError}</p> : null}
          <div className="stack-list">
            {anonymousThreadFeed.map((thread) => (
              <button
                className="content-card thread-card-button anonymous-thread-card"
                key={thread.id}
                type="button"
                onClick={() => onNavigate(`/anonymous/threads/${encodeURIComponent(thread.id)}`)}
              >
                <div className="content-card__header">
                  <h3>{thread.title}</h3>
                  <StatusChip tone={thread.locked ? "warn" : "neutral"}>
                    {thread.locked ? "已锁定" : "上浮中"}
                  </StatusChip>
                </div>
                <p>{excerpt(thread.content, 180)}</p>
                <div className="meta-row">
                  <span>
                    {thread.author} {thread.tripcode || ""}
                  </span>
                  <span>{thread.reply_count} / 1000</span>
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
            {!anonymousThreadFeed.length ? (
              <p className="panel-empty">
                {isLoadingData ? "匿名串数据加载中。" : "当前还没有匿名主题。"}
              </p>
            ) : null}
          </div>
          <PaginationBar pager={anonymousThreadPager} onPageChange={onAnonymousThreadPageChange} emptyText="暂无匿名主题。" />
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">发起匿名串</p>
              <h2>新串与使用说明</h2>
            </div>
            <StatusChip tone={session ? "success" : "warn"}>
              {session ? "已登录可发言" : "需登录"}
            </StatusChip>
          </div>
          <div className="stack-list">
            <div className="content-card">
              <div className="content-card__header">
                <h3>Tripcode</h3>
                <StatusChip tone="accent">◆匿名校验</StatusChip>
              </div>
              <p>系统会根据登录用户名和固定 key 生成稳定的匿名标识，用于在匿名环境中证明“还是同一个人”。</p>
            </div>
            <div className="content-card">
              <div className="content-card__header">
                <h3>sage 回复</h3>
                <StatusChip tone="neutral">不顶帖</StatusChip>
              </div>
              <p>回复时勾选 sage，就能完成回复而不把主题重新顶到首页。</p>
            </div>
            {!session ? (
              <p className="panel-empty">请先登录后再发起匿名主题。</p>
            ) : (
              <form className="space-form" onSubmit={(event) => void onAnonymousThreadSubmit(event)}>
                <label>
                  <span>主题标题</span>
                  <input
                    name="title"
                    type="text"
                    value={anonymousThreadForm.title}
                    onChange={onAnonymousThreadFieldChange}
                    placeholder="输入匿名串标题"
                    required
                  />
                </label>
                <label>
                  <span>标签</span>
                  <input
                    name="tagsText"
                    type="text"
                    value={anonymousThreadForm.tagsText}
                    onChange={onAnonymousThreadFieldChange}
                    placeholder="用逗号分隔，例如：树洞，闲聊"
                  />
                </label>
                <label>
                  <span>主题内容</span>
                  <textarea
                    name="content"
                    rows={6}
                    value={anonymousThreadForm.content}
                    onChange={onAnonymousThreadFieldChange}
                    placeholder="写下匿名串的开场内容"
                    required
                  />
                </label>
                {anonymousThreadActionState.error ? <p className="panel-error">{anonymousThreadActionState.error}</p> : null}
                {anonymousThreadActionState.success ? <p className="panel-empty">{anonymousThreadActionState.success}</p> : null}
                <button className="primary-button" type="submit" disabled={anonymousThreadActionState.pending}>
                  {anonymousThreadActionState.pending ? "发布中..." : "发起匿名串"}
                </button>
              </form>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
