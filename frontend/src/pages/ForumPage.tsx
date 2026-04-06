import type {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from "react";
import type {
  DeleteForumThreadResult,
  ForumReply as ApiForumReply,
  ForumThread as ApiForumThread,
  ForumThreadDetail as ApiForumThreadDetail,
  Session,
} from "../api";
import PaginationBar from "../components/PaginationBar";
import RichContent from "../components/RichContent";
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
  canDeleteThread: boolean;
  expandedReplyIDs: string[];
  featuredThread: ApiForumThread | null;
  forumReplyTextareaRef: RefObject<HTMLTextAreaElement | null>;
  hasVerifiedSpaceAccess: boolean;
  isForumEditorMode: boolean;
  isLoadingData: boolean;
  onlyShowThreadAuthor: boolean;
  replyActionState: FormActionState<ApiForumReply>;
  replyForm: ReplyFormState;
  selectedForumBoard: string;
  selectedForumThreadID: string | null;
  session: Session | null;
  threadActionState: FormActionState<ApiForumThread>;
  threadManageActionState: FormActionState<ApiForumThread | DeleteForumThreadResult>;
  threadDetail: ApiForumThreadDetail | null;
  threadDetailError: string;
  threadForm: ThreadFormState;
  threadPager: PagerState;
  threadSearchKeyword: string;
  threadsError: string;
  filteredThreadFeed: ApiForumThread[];
  onClearReplyTarget: () => void;
  onCollapseNestedReplies: () => void;
  onExpandedReplyToggle: (replyID: string) => void;
  onInsertReplySnippet: (snippet: string) => void;
  onNavigate: (href: string) => void;
  onReplyFieldChange: (
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement | HTMLInputElement>,
  ) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReplyToFloor: (reply: ApiForumReply) => void;
  onSelectedForumBoardChange: (board: string) => void;
  onShareThread: () => Promise<void>;
  onThreadDelete: (threadID: string) => Promise<boolean>;
  onThreadFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onThreadPageChange: (page: number) => void;
  onThreadSearchKeywordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onThreadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleOnlyShowThreadAuthor: () => void;
}

export default function ForumPage({
  activeForumThread,
  boardFilterOptions,
  boardOptions,
  canDeleteThread,
  expandedReplyIDs,
  featuredThread,
  forumReplyTextareaRef,
  hasVerifiedSpaceAccess,
  isForumEditorMode,
  isLoadingData,
  onlyShowThreadAuthor,
  replyActionState,
  replyForm,
  selectedForumBoard,
  selectedForumThreadID,
  session,
  threadActionState,
  threadManageActionState,
  threadDetail,
  threadDetailError,
  threadForm,
  threadPager,
  threadSearchKeyword,
  threadsError,
  filteredThreadFeed,
  onClearReplyTarget,
  onCollapseNestedReplies,
  onExpandedReplyToggle,
  onInsertReplySnippet,
  onNavigate,
  onReplyFieldChange,
  onReplySubmit,
  onReplyToFloor,
  onSelectedForumBoardChange,
  onShareThread,
  onThreadDelete,
  onThreadFieldChange,
  onThreadPageChange,
  onThreadSearchKeywordChange,
  onThreadSubmit,
  onToggleOnlyShowThreadAuthor,
}: ForumPageProps) {
  function handleReplyButtonClick(event: MouseEvent<HTMLButtonElement>, reply: ApiForumReply): void {
    event.preventDefault();
    event.stopPropagation();
    onReplyToFloor(reply);
  }

  function handleExpandButtonClick(event: MouseEvent<HTMLButtonElement>, replyID: string): void {
    event.preventDefault();
    event.stopPropagation();
    onExpandedReplyToggle(replyID);
  }

  function handleCollapseButtonClick(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();
    onCollapseNestedReplies();
  }

  async function handleDeleteThread(): Promise<void> {
    if (!activeForumThread) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`确认删除帖子《${activeForumThread.title}》？该操作不可撤销。`);
      if (!confirmed) {
        return;
      }
    }

    await onThreadDelete(activeForumThread.id);
  }

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

    function renderReplyComposer(formClassName: string): ReactNode {
      return (
        <form className={formClassName} onSubmit={(event) => void onReplySubmit(event)}>
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
                checked={replyForm.sage}
                name="sage"
                type="checkbox"
                onChange={onReplyFieldChange}
              />
              <span>不顶帖 (Sage)</span>
            </label>
            <button className="primary-button" type="submit" disabled={replyActionState.pending}>
              {replyActionState.pending ? "提交中..." : "提交回复"}
            </button>
          </div>
          {replyActionState.error ? <p className="panel-error">{replyActionState.error}</p> : null}
          {replyActionState.success ? <p className="panel-empty">{replyActionState.success}</p> : null}
        </form>
      );
    }

    function renderInlineReplyComposer(currentReply: ApiForumReply): ReactNode {
      if (!replyTarget || replyTarget.id !== currentReply.id) {
        return null;
      }

      if (!session) {
        return <p className="panel-empty">登录并通过认证后可在此楼层直接回复。</p>;
      }
      if (!hasVerifiedSpaceAccess) {
        return <p className="panel-empty">当前账号还没有回复权限，需要通过认证后才能参与讨论。</p>;
      }
      if (activeForumThread?.locked) {
        return <p className="panel-empty">当前主题已锁定，暂时不能继续回复。</p>;
      }

      return (
        <div className="forum-inline-reply">
          {renderReplyComposer("forum-sticky-reply__form forum-sticky-reply__form--inline")}
        </div>
      );
    }

    function renderNestedReplies(nodes: ForumReplyNode[], depth = 1): ReactNode {
      if (!nodes.length) {
        return null;
      }

      return (
        <div className="forum-comment-sublist">
          {nodes.map((node) => (
            <article
              className="forum-comment-item forum-comment-item--nested"
              key={node.reply.id}
              style={{ marginLeft: `${Math.min(depth, 4) * 14}px` }}
            >
              <div className="forum-comment-item__head">
                <div>
                  <h3 className="forum-comment-item__floor">{formatForumFloor(node.reply.floor_no)}</h3>
                  <p className="forum-reply-meta">
                    <span>{node.reply.author}</span>
                    {node.reply.tripcode ? <span>{node.reply.tripcode}</span> : null}
                    <span>{formatDateTime(node.reply.created_at)}</span>
                    {node.reply.reply_to_author ? <span>@{node.reply.reply_to_author}</span> : null}
                  </p>
                </div>
                <div className="forum-reply-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={(event) => handleReplyButtonClick(event, node.reply)}
                  >
                    回复
                  </button>
                </div>
              </div>
              <div className="forum-comment-item__body detail-body detail-body--reply">
                <RichContent content={node.reply.content} />
              </div>
              {renderInlineReplyComposer(node.reply)}
              {node.children.length ? renderNestedReplies(node.children, depth + 1) : null}
            </article>
          ))}
        </div>
      );
    }

    return (
      <>
        <section className="detail-page detail-page--forum detail-page--forum-compact">
          <article className="panel detail-hero detail-hero--forum">
            <div className="detail-hero__top">
              <button className="ghost-button detail-back-link" type="button" onClick={() => onNavigate("/forum")}>
                返回讨论板
              </button>
              <div className="forum-reply-actions">
                <button className="ghost-button" type="button" onClick={() => void onShareThread()}>
                  分享主题
                </button>
                {canDeleteThread ? (
                  <button
                    className="ghost-button story-reading-delete-button"
                    type="button"
                    onClick={() => void handleDeleteThread()}
                    disabled={threadManageActionState.pending}
                  >
                    {threadManageActionState.pending ? "删除中..." : "删除帖子"}
                  </button>
                ) : null}
              </div>
            </div>
            {threadManageActionState.error ? <p className="panel-error">{threadManageActionState.error}</p> : null}
            {threadManageActionState.success ? <p className="panel-empty">{threadManageActionState.success}</p> : null}
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

          <section className="panel detail-main detail-main--thread forum-thread-reading">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">正文</p>
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
          </section>

          <section className="panel detail-thread-replies">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">回复区</p>
                <h2>正文评论列表</h2>
              </div>
              <div className="forum-thread-toolbar">
                <button
                  className={`ghost-button ${onlyShowThreadAuthor ? "ghost-button--active" : ""}`}
                  type="button"
                  onClick={onToggleOnlyShowThreadAuthor}
                >
                  {onlyShowThreadAuthor ? "恢复全部楼层" : "只看楼主"}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={handleCollapseButtonClick}
                >
                  收起楼中楼
                </button>
              </div>
            </div>
            <div className="forum-thread-replies__helper">
              <p className="panel-empty">
                阅读模式：{onlyShowThreadAuthor ? "只看楼主" : "全部楼层"}。
              </p>
              <p className="panel-empty">
                回复目标：{replyTarget ? `${formatForumFloor(replyTarget.floor_no)} · ${replyTarget.author}` : "主楼"}。
                {replyTarget ? (
                  <>
                    {" "}
                    <button className="detail-inline-button" type="button" onClick={onClearReplyTarget}>
                      改为回复主楼
                    </button>
                  </>
                ) : null}
              </p>
            </div>
            <div className="forum-comment-list">
              {onlyShowThreadAuthor ? (
                opReplies.length ? (
                opReplies.map((reply) => (
                  <article className="forum-comment-item forum-comment-item--op" key={reply.id}>
                    <div className="forum-comment-item__head">
                      <div>
                        <h3 className="forum-comment-item__floor">{formatForumFloor(reply.floor_no)}</h3>
                          <p className="forum-reply-meta">
                            <span>{reply.author}</span>
                            {reply.tripcode ? <span>{reply.tripcode}</span> : null}
                            <span>{formatDateTime(reply.created_at)}</span>
                            {reply.reply_to_author ? <span>@{reply.reply_to_author}</span> : null}
                          </p>
                        </div>
                        <div className="forum-reply-actions">
                          <StatusChip tone="accent">楼主</StatusChip>
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={(event) => handleReplyButtonClick(event, reply)}
                          >
                            回复TA
                          </button>
                        </div>
                      </div>
                    <div className="forum-comment-item__body detail-body detail-body--reply">
                      <RichContent content={reply.content} />
                    </div>
                    {renderInlineReplyComposer(reply)}
                  </article>
                ))
                ) : (
                  <p className="panel-empty">楼主暂时还没有后续跟帖。</p>
                )
              ) : replyRoots.length ? (
                replyRoots.map((node) => (
                  <article className="forum-comment-item" key={node.reply.id}>
                    <div className="forum-comment-item__head">
                      <div>
                        <h3 className="forum-comment-item__floor">{formatForumFloor(node.reply.floor_no)}</h3>
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
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={(event) => handleReplyButtonClick(event, node.reply)}
                        >
                          回复TA
                        </button>
                        {node.descendantCount ? (
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={(event) => handleExpandButtonClick(event, node.reply.id)}
                          >
                            {expandedReplyIDs.includes(node.reply.id)
                              ? "收起楼中楼"
                              : `展开楼中楼 (${node.descendantCount})`}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="forum-comment-item__body detail-body detail-body--reply">
                      <RichContent content={node.reply.content} />
                    </div>
                    {renderInlineReplyComposer(node.reply)}
                    {expandedReplyIDs.includes(node.reply.id) && node.children.length
                      ? renderNestedReplies(node.children)
                      : null}
                  </article>
                ))
              ) : (
                <p className="panel-empty">这个主题暂时还没有回复。</p>
              )}
            </div>
          </section>

          <section className="panel forum-sticky-reply forum-sticky-reply--plain">
            <div className="forum-sticky-reply__header">
              <div>
                <p className="panel-kicker">底部互动区</p>
                <h2>{replyTarget ? `回复 ${formatForumFloor(replyTarget.floor_no)}` : "快捷回复"}</h2>
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
                <StatusChip tone="neutral">收藏</StatusChip>
                <StatusChip tone="neutral">点赞</StatusChip>
              </div>
            </div>

            {!session ? (
              <p className="panel-empty">登录并通过认证后，可以直接在详情页底部快速回复当前主题。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="panel-empty">当前账号还没有回复权限，需要通过认证后才能参与讨论。</p>
            ) : activeForumThread?.locked ? (
              <p className="panel-empty">当前主题已锁定，暂时不能继续回复。</p>
            ) : replyTarget ? (
              <p className="panel-empty">
                正在回复 {formatForumFloor(replyTarget.floor_no)} · {replyTarget.author}，输入框已在对应楼层展开。
                <button className="detail-inline-button" type="button" onClick={onClearReplyTarget}>
                  改为回复主楼
                </button>
              </p>
            ) : (
              renderReplyComposer("forum-sticky-reply__form")
            )}
          </section>
        </section>
      </>
    );
  }

  const featuredListThread = filteredThreadFeed[0] ?? featuredThread;
  const boardCount = new Set(filteredThreadFeed.map((thread) => thread.board)).size;
  const canCompose = Boolean(session && hasVerifiedSpaceAccess);

  if (isForumEditorMode) {
    return (
      <section className="detail-page">
        <article className="panel detail-hero detail-hero--forum detail-hero--compact">
          <div className="detail-hero__top">
            <button className="ghost-button detail-back-link" type="button" onClick={() => onNavigate("/forum")}>
              返回讨论列表
            </button>
          </div>
          <div className="detail-hero__meta detail-hero__meta--compact">
            <span>/ 主题编辑</span>
            <span>{session ? "已登录" : "游客模式"}</span>
            <span>{boardCount} 个分区</span>
          </div>
          <h1 className="detail-hero__title detail-hero__title--compact">发布主题</h1>
          <p className="detail-hero__lede detail-hero__lede--compact">
            在这里独立编辑标题、分区、标签与正文。发布后会自动跳到主题详情页继续互动。
          </p>
        </article>

        {!session ? (
          <article className="panel">
            <p className="panel-empty">登录并通过认证后，这里可以直接发布新的讨论主题。</p>
          </article>
        ) : !hasVerifiedSpaceAccess ? (
          <article className="panel">
            <p className="panel-empty">当前账号还没有论坛写权限，需要通过认证后才能发帖。</p>
          </article>
        ) : (
          <form className="panel stories-editor" onSubmit={(event) => void onThreadSubmit(event)}>
            <div className="stories-editor__toolbar">
              <div>
                <p className="panel-kicker">编辑器</p>
                <h2>主题编辑器</h2>
              </div>
              <div className="stories-editor__toolbar-actions">
                {threadActionState.success ? <span className="panel-empty">{threadActionState.success}</span> : null}
                <button className="primary-button" type="submit" disabled={threadActionState.pending}>
                  {threadActionState.pending ? "发布中..." : "发布主题"}
                </button>
              </div>
            </div>

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

            <div className="stories-editor__meta-grid">
              <label>
                <span>所属分区</span>
                <input
                  name="board"
                  type="text"
                  value={threadForm.board}
                  onChange={onThreadFieldChange}
                  list="forum-editor-board-options"
                  placeholder="例如：剧情讨论"
                  required
                />
                <datalist id="forum-editor-board-options">
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
            </div>

            <div className="stories-editor__split">
              <section className="stories-editor__pane">
                <div className="stories-editor__pane-head">Markdown 源文本</div>
                <textarea
                  name="content"
                  rows={14}
                  value={threadForm.content}
                  onChange={onThreadFieldChange}
                  placeholder="写下主题内容，支持 Markdown；图片可直接贴 Markdown 图片链接。"
                  required
                />
              </section>
              <section className="stories-editor__pane stories-editor__pane--preview">
                <div className="stories-editor__pane-head">实时预览</div>
                <div className="stories-editor__preview">
                  {threadForm.content.trim() ? (
                    <RichContent content={threadForm.content} />
                  ) : (
                    <p className="panel-empty">预览区：输入主题内容后会实时显示。</p>
                  )}
                </div>
              </section>
            </div>

            {threadActionState.error ? <p className="panel-error">{threadActionState.error}</p> : null}

            {featuredListThread ? (
              <button
                className="forum-featured-text-item"
                type="button"
                onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(featuredListThread.id)}`)}
              >
                <span className="forum-featured-text-item__kicker">最新活跃主题</span>
                <strong>{featuredListThread.title}</strong>
                <span>
                  {featuredListThread.author} · {featuredListThread.reply_count} 回复 ·{" "}
                  {formatDateTime(featuredListThread.last_post_at)}
                </span>
              </button>
            ) : null}
          </form>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="page-split-grid forum-list-page forum-list-page--compact">
        <article className="panel forum-feed-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">帖子流</p>
              <h2>讨论串列表</h2>
            </div>
            <div className="forum-list-page__toolbar">
              <StatusChip tone="accent">{threadPager.total} 条主题</StatusChip>
              <button
                className={`${canCompose ? "primary-button" : "ghost-button"} small-action-button`}
                type="button"
                onClick={() => onNavigate("/forum/editor")}
              >
                发帖
              </button>
            </div>
          </div>
          {threadsError ? <p className="panel-error">{threadsError}</p> : null}
          <div className="forum-board-filter-row">
            <label className="list-search-row" htmlFor="forum-thread-search">
              <span>关键词搜索</span>
              <input
                id="forum-thread-search"
                className="list-search-row__input"
                type="search"
                value={threadSearchKeyword}
                onChange={onThreadSearchKeywordChange}
                placeholder="按标题、正文、版块、作者、标签搜索帖子"
              />
            </label>
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
          <div className="forum-thread-text-list">
            {filteredThreadFeed.map((thread) => {
              return (
                <button
                  className="forum-thread-text-item"
                  key={thread.id}
                  type="button"
                  onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(thread.id)}`)}
                >
                  <div className="forum-thread-text-item__head">
                    <strong>{thread.title}</strong>
                    <span className="forum-thread-text-item__board">/{thread.board}</span>
                  </div>
                  <p className="forum-thread-text-item__meta">
                    <span>{thread.author}</span>
                    {thread.tripcode ? <span>{thread.tripcode}</span> : null}
                    {thread.is_pinned ? <span>置顶</span> : null}
                    {thread.locked ? <span>锁定</span> : null}
                    <span>{formatDateTime(thread.last_post_at)} 最后回复</span>
                  </p>
                  <p className="forum-thread-text-item__excerpt">{excerpt(thread.content, 150)}</p>
                  <p className="forum-thread-text-item__stats">
                    <span>{thread.reply_count} 条回复</span>
                    <span>{thread.view_count} 次浏览</span>
                    <span>{formatDateTime(thread.created_at)} 发帖</span>
                    {thread.tags.length ? <span>#{thread.tags.join(" #")}</span> : null}
                  </p>
                </button>
              );
            })}
            {!filteredThreadFeed.length ? (
              <p className="panel-empty">
                {isLoadingData ? "讨论数据加载中。" : "当前筛选条件下没有可展示的讨论主题。"}
              </p>
            ) : null}
          </div>
          {featuredListThread ? (
            <button
              className="forum-featured-text-item"
              type="button"
              onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(featuredListThread.id)}`)}
            >
              <span className="forum-featured-text-item__kicker">最新活跃主题</span>
              <strong>{featuredListThread.title}</strong>
              <span>
                {featuredListThread.author} · {featuredListThread.reply_count} 回复 ·{" "}
                {formatDateTime(featuredListThread.last_post_at)}
              </span>
            </button>
          ) : null}
          <PaginationBar pager={threadPager} onPageChange={onThreadPageChange} emptyText="暂无讨论主题。" />
        </article>
      </section>
    </>
  );
}
