import type {
  ChangeEvent,
  FormEvent,
  ReactNode,
  RefObject,
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
import {
  buildForumReplyTree,
  formatForumFloor,
  type ForumReplyNode,
} from "../lib/forum";
import type { PagerState } from "../lib/pagination";
import { excerpt, extractMarkdownPreviewImage, formatDateTime } from "../lib/text";
import type {
  FormActionState,
  ReplyFormState,
  ThreadFormState,
} from "../types/app";

interface ForumPageProps {
  activeForumThread: ApiForumThread | null;
  boardFilterOptions: string[];
  boardOptions: string[];
  expandedReplyID: string | null;
  featuredThread: ApiForumThread | null;
  forumProgressPanelCompact: ReactNode;
  forumProgressPanelFull: ReactNode;
  forumReplyTextareaRef: RefObject<HTMLTextAreaElement | null>;
  hasVerifiedSpaceAccess: boolean;
  isLoadingData: boolean;
  onlyShowThreadAuthor: boolean;
  replyActionState: FormActionState<ApiForumReply>;
  replyForm: ReplyFormState;
  selectedForumBoard: string;
  selectedForumThreadID: string | null;
  session: Session | null;
  threadActionState: FormActionState<ApiForumThread>;
  threadDetail: ApiForumThreadDetail | null;
  threadDetailError: string;
  threadForm: ThreadFormState;
  threadPager: PagerState;
  threadsError: string;
  filteredThreadFeed: ApiForumThread[];
  onClearReplyTarget: () => void;
  onCollapseNestedReplies: () => void;
  onExpandedReplyChange: (replyID: string | null) => void;
  onInsertReplySnippet: (snippet: string) => void;
  onNavigate: (href: string) => void;
  onReplyFieldChange: (
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>,
  ) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReplyToFloor: (reply: ApiForumReply) => void;
  onSelectedForumBoardChange: (board: string) => void;
  onShareThread: () => Promise<void>;
  onThreadFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onThreadPageChange: (page: number) => void;
  onThreadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleOnlyShowThreadAuthor: () => void;
}

export default function ForumPage({
  activeForumThread,
  boardFilterOptions,
  boardOptions,
  expandedReplyID,
  featuredThread,
  forumProgressPanelCompact,
  forumProgressPanelFull,
  forumReplyTextareaRef,
  hasVerifiedSpaceAccess,
  isLoadingData,
  onlyShowThreadAuthor,
  replyActionState,
  replyForm,
  selectedForumBoard,
  selectedForumThreadID,
  session,
  threadActionState,
  threadDetail,
  threadDetailError,
  threadForm,
  threadPager,
  threadsError,
  filteredThreadFeed,
  onClearReplyTarget,
  onCollapseNestedReplies,
  onExpandedReplyChange,
  onInsertReplySnippet,
  onNavigate,
  onReplyFieldChange,
  onReplySubmit,
  onReplyToFloor,
  onSelectedForumBoardChange,
  onShareThread,
  onThreadFieldChange,
  onThreadPageChange,
  onThreadSubmit,
  onToggleOnlyShowThreadAuthor,
}: ForumPageProps) {
  if (selectedForumThreadID) {
    const replies = threadDetail?.replies || [];
    const replyTarget = replies.find((reply) => reply.id === replyForm.parentID) || null;
    const opReplies = activeForumThread
      ? replies.filter((reply) => reply.author === activeForumThread.author)
      : [];
    const replyRoots = buildForumReplyTree(replies);
    const threadPreviewImage = activeForumThread
      ? extractMarkdownPreviewImage(activeForumThread.content)
      : null;

    function renderNestedReplies(nodes: ForumReplyNode[], depth = 1): ReactNode {
      if (!nodes.length) {
        return null;
      }

      return (
        <div className="forum-subreply-list">
          {nodes.map((node) => (
            <article
              className="content-card forum-subreply-card"
              key={node.reply.id}
              style={{ marginLeft: `${Math.min(depth, 4) * 14}px` }}
            >
              <div className="content-card__header">
                <div>
                  <h3>{formatForumFloor(node.reply.floor_no)}</h3>
                  <p className="forum-reply-meta">
                    <span>{node.reply.author}</span>
                    {node.reply.tripcode ? <span>{node.reply.tripcode}</span> : null}
                    <span>{formatDateTime(node.reply.created_at)}</span>
                    {node.reply.reply_to_author ? <span>@{node.reply.reply_to_author}</span> : null}
                  </p>
                </div>
                <div className="forum-reply-actions">
                  <button className="ghost-button" type="button" onClick={() => onReplyToFloor(node.reply)}>
                    回复
                  </button>
                </div>
              </div>
              <div className="detail-body detail-body--reply">
                <RichContent content={node.reply.content} />
              </div>
              {node.children.length ? renderNestedReplies(node.children, depth + 1) : null}
            </article>
          ))}
        </div>
      );
    }

    return (
      <>
        <section className="detail-page detail-page--forum">
          <article className="panel detail-hero detail-hero--forum">
            <div className="detail-hero__top">
              <button className="ghost-button detail-back-link" type="button" onClick={() => onNavigate("/forum")}>
                返回讨论板
              </button>
              <div className="forum-reply-actions">
                <button className="ghost-button" type="button" onClick={() => void onShareThread()}>
                  分享主题
                </button>
              </div>
            </div>
            <p className="eyebrow">主题详情</p>
            <h1 className="detail-hero__title">{activeForumThread?.title || "论坛主题详情"}</h1>
            <p className="detail-hero__lede">
              {activeForumThread
                ? "像单独帖子页一样阅读主楼、楼层和楼中楼，不再挤在列表旁边。"
                : "正在读取主题内容。"}
            </p>
            <div className="detail-hero__meta">
              <span>{activeForumThread?.author || "读取中"}</span>
              <span>{activeForumThread?.board || "分区读取中"}</span>
              <span>{activeForumThread ? `${activeForumThread.view_count} 浏览` : "浏览读取中"}</span>
              <span>{activeForumThread ? `${activeForumThread.reply_count} 回复` : "回复读取中"}</span>
            </div>
            <div className="forum-detail-status">
              {activeForumThread?.is_pinned ? <StatusChip tone="accent">置顶</StatusChip> : null}
              {activeForumThread?.locked ? <StatusChip tone="warn">已锁定</StatusChip> : null}
              {activeForumThread ? (
                <StatusChip tone={activeForumThread.anonymous ? "warn" : "neutral"}>
                  /{activeForumThread.board}
                </StatusChip>
              ) : null}
            </div>
            {activeForumThread?.tags.length ? (
              <div className="tag-row">
                {activeForumThread.tags.map((tag) => (
                  <span className="module-tag" key={`${activeForumThread.id}-hero-${tag}`}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>

          {threadPreviewImage ? (
            <section className="panel detail-cover">
              <img alt={activeForumThread?.title || "主题封面"} src={threadPreviewImage} />
            </section>
          ) : null}

          <section className="detail-layout">
            <article className="panel detail-main detail-main--thread">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">主楼</p>
                  <h2>{activeForumThread?.title || "讨论主题"}</h2>
                </div>
                {activeForumThread ? (
                  <StatusChip tone={activeForumThread.anonymous ? "warn" : "neutral"}>
                    {activeForumThread.author}
                  </StatusChip>
                ) : null}
              </div>
              {threadDetailError ? (
                <p className="panel-error">{threadDetailError}</p>
              ) : activeForumThread ? (
                <div className="detail-body">
                  <p className="detail-body__meta">
                    {formatDateTime(activeForumThread.created_at)} 发布 · {formatDateTime(activeForumThread.last_post_at)} 最后活跃
                  </p>
                  <RichContent content={activeForumThread.content} />
                </div>
              ) : (
                <p className="panel-empty">主题详情加载中。</p>
              )}
            </article>

            <aside className="panel detail-side">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">阅读辅助</p>
                  <h2>跟帖信息</h2>
                </div>
              </div>
              <div className="stack-list">
                <div className="content-card detail-side-card">
                  <div className="content-card__header">
                    <h3>阅读模式</h3>
                    <StatusChip tone={onlyShowThreadAuthor ? "accent" : "neutral"}>
                      {onlyShowThreadAuthor ? "只看楼主" : "全部楼层"}
                    </StatusChip>
                  </div>
                  <p>开启“只看楼主”后，会过滤掉所有非楼主楼层，更像长帖阅读模式。</p>
                </div>
                <div className="content-card detail-side-card">
                  <div className="content-card__header">
                    <h3>回复目标</h3>
                    <StatusChip tone={replyTarget ? "accent" : "neutral"}>
                      {replyTarget ? formatForumFloor(replyTarget.floor_no) : "主楼"}
                    </StatusChip>
                  </div>
                  <p>
                    {replyTarget
                      ? `当前准备回复 ${replyTarget.author} 的楼层。`
                      : "当前默认直接回复主楼。"}
                  </p>
                  {replyTarget ? (
                    <button className="ghost-button" type="button" onClick={onClearReplyTarget}>
                      改为回复主楼
                    </button>
                  ) : null}
                </div>
                {forumProgressPanelCompact}
              </div>
            </aside>
          </section>

          <section className="panel detail-thread-replies">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">回复区</p>
                <h2>楼层与楼中楼</h2>
              </div>
              <div className="forum-thread-toolbar">
                <button
                  className={`ghost-button ${onlyShowThreadAuthor ? "ghost-button--active" : ""}`}
                  type="button"
                  onClick={onToggleOnlyShowThreadAuthor}
                >
                  {onlyShowThreadAuthor ? "恢复全部楼层" : "只看楼主"}
                </button>
                <button className="ghost-button" type="button" onClick={onCollapseNestedReplies}>
                  收起楼中楼
                </button>
              </div>
            </div>
            <div className="thread-reply-list forum-floor-list">
              {onlyShowThreadAuthor ? (
                opReplies.length ? (
                  opReplies.map((reply) => (
                    <article className="content-card thread-reply-card forum-floor-card forum-floor-card--op" key={reply.id}>
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
                        <StatusChip tone="accent">楼主</StatusChip>
                      </div>
                      <div className="detail-body detail-body--reply">
                        <RichContent content={reply.content} />
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="panel-empty">楼主暂时还没有后续跟帖。</p>
                )
              ) : replyRoots.length ? (
                replyRoots.map((node) => (
                  <article className="content-card thread-reply-card forum-floor-card" key={node.reply.id}>
                    <div className="content-card__header">
                      <div>
                        <h3>{formatForumFloor(node.reply.floor_no)}</h3>
                        <p className="forum-reply-meta">
                          <span>{node.reply.author}</span>
                          {node.reply.tripcode ? <span>{node.reply.tripcode}</span> : null}
                          <span>{formatDateTime(node.reply.created_at)}</span>
                        </p>
                      </div>
                      <div className="forum-reply-actions">
                        {node.reply.author === activeForumThread?.author ? (
                          <StatusChip tone="accent">楼主</StatusChip>
                        ) : null}
                        <button className="ghost-button" type="button" onClick={() => onReplyToFloor(node.reply)}>
                          回复TA
                        </button>
                        {node.descendantCount ? (
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() =>
                              onExpandedReplyChange(expandedReplyID === node.reply.id ? null : node.reply.id)
                            }
                          >
                            {expandedReplyID === node.reply.id
                              ? "收起楼中楼"
                              : `展开楼中楼 (${node.descendantCount})`}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="detail-body detail-body--reply">
                      <RichContent content={node.reply.content} />
                    </div>
                    {expandedReplyID === node.reply.id && node.children.length
                      ? renderNestedReplies(node.children)
                      : null}
                  </article>
                ))
              ) : (
                <p className="panel-empty">这个主题暂时还没有回复。</p>
              )}
            </div>
          </section>
        </section>

        <section className="forum-sticky-reply">
          <div className="forum-sticky-reply__shell">
            <div className="forum-sticky-reply__header">
              <div>
                <p className="panel-kicker">底部互动区</p>
                <h2>{replyTarget ? `回复 ${formatForumFloor(replyTarget.floor_no)}` : "快速回复主楼"}</h2>
              </div>
              <div className="forum-reply-actions">
                <button className="ghost-button" type="button" onClick={() => onInsertReplySnippet("\n![](https://)")}>
                  图片
                </button>
                <button className="ghost-button" type="button" onClick={() => onInsertReplySnippet(" (´・ω・`) ")}>
                  表情
                </button>
                <button className="ghost-button" type="button" onClick={() => void onShareThread()}>
                  分享
                </button>
                <StatusChip tone="neutral">收藏待接入</StatusChip>
                <StatusChip tone="neutral">点赞待接入</StatusChip>
              </div>
            </div>

            {!session ? (
              <p className="panel-empty">登录并通过认证后，可以直接在详情页底部快速回复当前主题。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="panel-empty">当前账号还没有回复权限，需要通过认证后才能参与讨论。</p>
            ) : activeForumThread?.locked ? (
              <p className="panel-empty">当前主题已锁定，暂时不能继续回复。</p>
            ) : (
              <form className="forum-sticky-reply__form" onSubmit={(event) => void onReplySubmit(event)}>
                {replyTarget ? (
                  <div className="forum-reply-target-bar">
                    <span>
                      正在回复 {formatForumFloor(replyTarget.floor_no)} · {replyTarget.author}
                    </span>
                    <button className="ghost-button" type="button" onClick={onClearReplyTarget}>
                      取消
                    </button>
                  </div>
                ) : null}
                <textarea
                  ref={forumReplyTextareaRef}
                  name="content"
                  rows={4}
                  value={replyForm.content}
                  onChange={onReplyFieldChange}
                  placeholder={replyTarget ? "写下你的楼中楼回复" : "写下你对这个主题的看法"}
                  required
                />
                <div className="forum-sticky-reply__actions">
                  <label className="gallery-admin__toggle">
                    <input
                      checked={replyForm.anonymous}
                      name="anonymous"
                      type="checkbox"
                      onChange={onReplyFieldChange}
                    />
                    <span>匿名回复</span>
                  </label>
                  <label className="gallery-admin__toggle">
                    <input
                      checked={replyForm.sage}
                      name="sage"
                      type="checkbox"
                      onChange={onReplyFieldChange}
                    />
                    <span>sage，不顶帖</span>
                  </label>
                  <button className="primary-button" type="submit" disabled={replyActionState.pending}>
                    {replyActionState.pending ? "提交中..." : "提交回复"}
                  </button>
                </div>
                {replyActionState.error ? <p className="panel-error">{replyActionState.error}</p> : null}
                {replyActionState.success ? <p className="panel-empty">{replyActionState.success}</p> : null}
              </form>
            )}
          </div>
        </section>
      </>
    );
  }

  const featuredListThread = filteredThreadFeed[0] ?? featuredThread;
  const boardCount = new Set(filteredThreadFeed.map((thread) => thread.board)).size;

  return (
    <>
      <SectionHero
        kicker="论坛交流"
        title="讨论板与主题串"
        description="讨论板主页优先展示帖子流：标题、正文预览、作者、最后活跃时间和回复数量都压在一屏内，方便快速扫帖。"
        metrics={[
          {
            label: "可见主题",
            value: String(filteredThreadFeed.length),
            detail: threadsError || (boardCount ? `${boardCount} 个分区在持续活跃` : "分区整理中"),
            tone: threadsError ? "warn" : filteredThreadFeed.length ? "accent" : "warn",
          },
          {
            label: "默认排序",
            value: "顶帖优先",
            detail: "按最后回复时间上浮或下沉",
            tone: "success",
          },
          {
            label: "当前筛选",
            value: selectedForumBoard,
            detail: featuredListThread
              ? `最新活跃：${formatDateTime(featuredListThread.last_post_at)}`
              : "等待更多主题出现",
            tone: featuredListThread ? "neutral" : "warn",
          },
        ]}
      />

      <section className="page-split-grid">
        <article className="panel forum-feed-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">帖子流</p>
              <h2>讨论串列表</h2>
            </div>
            <StatusChip tone="accent">{threadPager.total} 条主题</StatusChip>
          </div>
          {threadsError ? <p className="panel-error">{threadsError}</p> : null}
          <div className="forum-board-filter-row">
            {boardFilterOptions.map((board) => (
              <button
                className={`ghost-button ${selectedForumBoard === board ? "ghost-button--active" : ""}`}
                key={board}
                type="button"
                onClick={() => onSelectedForumBoardChange(board)}
              >
                {board}
              </button>
            ))}
          </div>
          <div className="stack-list">
            {filteredThreadFeed.map((thread) => {
              const previewImage = extractMarkdownPreviewImage(thread.content);
              return (
                <button
                  className="content-card thread-card-button forum-thread-feed-card"
                  key={thread.id}
                  type="button"
                  onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(thread.id)}`)}
                >
                  <div className="forum-thread-feed-card__body">
                    <div className="content-card__header">
                      <div>
                        <h3>{thread.title}</h3>
                        <p className="forum-reply-meta">
                          <span>{thread.author}</span>
                          {thread.tripcode ? <span>{thread.tripcode}</span> : null}
                          <span>{formatDateTime(thread.last_post_at)} 最后回复</span>
                        </p>
                      </div>
                      <div className="forum-feed-card__status">
                        {thread.is_pinned ? <StatusChip tone="accent">置顶</StatusChip> : null}
                        {thread.locked ? <StatusChip tone="warn">锁定</StatusChip> : null}
                        <StatusChip tone={thread.anonymous ? "warn" : "neutral"}>/{thread.board}</StatusChip>
                      </div>
                    </div>
                    <p>{excerpt(thread.content, previewImage ? 120 : 180)}</p>
                    <div className="meta-row">
                      <span>{thread.reply_count} 条回复</span>
                      <span>{thread.view_count} 次浏览</span>
                      <span>{formatDateTime(thread.created_at)} 发帖</span>
                    </div>
                    <div className="tag-row">
                      {thread.tags.map((tag) => (
                        <span className="module-tag" key={`${thread.id}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {previewImage ? (
                    <div className="forum-thread-feed-card__preview">
                      <img alt={thread.title} src={previewImage} />
                    </div>
                  ) : null}
                </button>
              );
            })}
            {!filteredThreadFeed.length ? (
              <p className="panel-empty">
                {isLoadingData ? "讨论数据加载中。" : "当前筛选条件下没有可展示的讨论主题。"}
              </p>
            ) : null}
          </div>
          <PaginationBar pager={threadPager} onPageChange={onThreadPageChange} emptyText="暂无讨论主题。" />
        </article>

        <article className="panel forum-composer-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">发帖区</p>
              <h2>发布新主题</h2>
            </div>
            <StatusChip tone="neutral">Feed / Detail 双栏</StatusChip>
          </div>
          {!session ? (
            <p className="panel-empty">登录并通过认证后，可以在这里发主题；回复建议进入详情页底部互动区操作。</p>
          ) : !hasVerifiedSpaceAccess ? (
            <p className="panel-empty">当前账号还没有论坛写权限，需要通过认证后才能发帖和回复。</p>
          ) : (
            <div className="stack-list">
              <form className="space-form" onSubmit={(event) => void onThreadSubmit(event)}>
                <label>
                  <span>主题标题</span>
                  <input
                    name="title"
                    type="text"
                    value={threadForm.title}
                    onChange={onThreadFieldChange}
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
                    onChange={onThreadFieldChange}
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
                    onChange={onThreadFieldChange}
                    placeholder="用逗号分隔，例如：叙事，慢热"
                  />
                </label>
                <label>
                  <span>主题内容</span>
                  <textarea
                    name="content"
                    rows={5}
                    value={threadForm.content}
                    onChange={onThreadFieldChange}
                    placeholder="写下主题内容，支持 Markdown；图片可直接贴 Markdown 图片链接。"
                    required
                  />
                </label>
                <label className="gallery-admin__toggle">
                  <input
                    checked={threadForm.anonymous}
                    name="anonymous"
                    type="checkbox"
                    onChange={onThreadFieldChange}
                  />
                  <span>匿名发布</span>
                </label>
                {threadActionState.error ? <p className="panel-error">{threadActionState.error}</p> : null}
                {threadActionState.success ? <p className="panel-empty">{threadActionState.success}</p> : null}
                <button className="primary-button" type="submit" disabled={threadActionState.pending}>
                  {threadActionState.pending ? "发布中..." : "发布主题"}
                </button>
              </form>
            </div>
          )}
          <div className="stack-list">
            {featuredListThread ? (
              <button
                className="content-card content-card--story thread-card-button"
                type="button"
                onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(featuredListThread.id)}`)}
              >
                <div className="content-card__header">
                  <h3>最新活跃主题</h3>
                  <StatusChip tone="accent">{featuredListThread.reply_count} 回复</StatusChip>
                </div>
                <p>{featuredListThread.title}</p>
                <div className="meta-row">
                  <span>{featuredListThread.author}</span>
                  <span>{formatDateTime(featuredListThread.last_post_at)}</span>
                </div>
              </button>
            ) : null}
            <p className="panel-empty">
              列表页主打浏览和发主题；真正的回复、楼中楼和只看楼主都集中在详情页中完成。
            </p>
            {forumProgressPanelFull}
          </div>
        </article>
      </section>
    </>
  );
}
