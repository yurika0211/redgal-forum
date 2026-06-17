import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from "react";
import type {
  DeleteForumThreadResult,
  ForumReply as ApiForumReply,
  ThreadEngagement as ApiThreadEngagement,
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
import { buildPublicProfileHref } from "../lib/profile";
import {
  extractMarkdownPreviewImage,
  formatDateTime,
  formatPublishedAgo,
} from "../lib/text";
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
  threadEngagementActionState: FormActionState<ApiThreadEngagement>;
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
  onToggleThreadLike: () => void;
  onToggleThreadFavorite: () => void;
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
  threadEngagementActionState,
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
  onToggleThreadLike,
  onToggleThreadFavorite,
  onThreadDelete,
  onThreadFieldChange,
  onThreadPageChange,
  onThreadSearchKeywordChange,
  onThreadSubmit,
  onToggleOnlyShowThreadAuthor,
}: ForumPageProps) {
  function navigateToAuthorSpace(name: string): void {
    const href = buildPublicProfileHref(name);
    if (!href) {
      return;
    }
    onNavigate(href);
  }

  function handleAuthorClick(event: MouseEvent<HTMLElement>, name: string): void {
    event.preventDefault();
    event.stopPropagation();
    navigateToAuthorSpace(name);
  }

  function handleAuthorKeyDown(event: KeyboardEvent<HTMLSpanElement>, name: string): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    navigateToAuthorSpace(name);
  }

  function renderAuthorName(
    name: string,
    options: { nestedInClickable?: boolean; withAtPrefix?: boolean } = {},
  ): ReactNode {
    const label = `${options.withAtPrefix ? "@" : ""}${name}`;
    const href = buildPublicProfileHref(name);
    if (!href) {
      return <span>{label}</span>;
    }

    if (options.nestedInClickable) {
      return (
        <span
          className="inline-flex items-center text-[color:var(--color-primary)] underline decoration-dotted underline-offset-2 transition hover:text-[color:var(--text-strong)] font-medium"
          role="link"
          tabIndex={0}
          onClick={(event) => handleAuthorClick(event, name)}
          onKeyDown={(event) => handleAuthorKeyDown(event, name)}
        >
          {label}
        </span>
      );
    }

    return (
      <button
        className="inline-flex items-center text-[color:var(--color-primary)] underline decoration-dotted underline-offset-2 transition hover:text-[color:var(--text-strong)] font-medium"
        type="button"
        onClick={(event) => handleAuthorClick(event, name)}
      >
        {label}
      </button>
    );
  }

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
            <div className="forum-reply-target-bar flex flex-col items-stretch justify-between gap-2 rounded-2xl border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-tint-blue)]/65 px-3 py-2.5 text-[0.92rem] text-[color:var(--text-soft)] sm:flex-row sm:items-center">
              <span>
                正在回复 {formatForumFloor(replyTarget.floor_no)} · {replyTarget.author}
              </span>
              <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={onClearReplyTarget}>
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
          <div className="forum-sticky-reply__actions flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
            <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <input
                checked={replyForm.sage}
                name="sage"
                type="checkbox"
                onChange={onReplyFieldChange}
              />
              <span>不顶帖 (Sage)</span>
            </label>
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--color-primary)]/44 bg-[color:var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={replyActionState.pending}>
              {replyActionState.pending ? "提交中..." : "提交回复"}
            </button>
          </div>
          {replyActionState.error ? <p className="text-sm text-rose-500/90">{replyActionState.error}</p> : null}
          {replyActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{replyActionState.success}</p> : null}
        </form>
      );
    }

    function renderInlineReplyComposer(currentReply: ApiForumReply): ReactNode {
      if (!replyTarget || replyTarget.id !== currentReply.id) {
        return null;
      }

      if (!session) {
        return <p className="text-sm text-[color:var(--text-muted)]">登录并通过认证后可在此楼层直接回复。</p>;
      }
      if (!hasVerifiedSpaceAccess) {
        return <p className="text-sm text-[color:var(--text-muted)]">当前账号还没有回复权限，需要通过认证后才能参与讨论。</p>;
      }
      if (activeForumThread?.locked) {
        return <p className="text-sm text-[color:var(--text-muted)]">当前主题已锁定，暂时不能继续回复。</p>;
      }

      return (
        <div className="forum-inline-reply mt-3 grid gap-2 rounded-xl border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-tint-blue)]/55 p-3">
          {renderReplyComposer("forum-sticky-reply__form forum-sticky-reply__form--inline")}
        </div>
      );
    }

    function renderNestedReplies(nodes: ForumReplyNode[], depth = 1): ReactNode {
      if (!nodes.length) {
        return null;
      }

      return (
        <div className="forum-nested-reply-list mt-1.5 grid gap-2">
          {nodes.map((node) => (
            <article
              className="forum-nested-reply grid gap-2 rounded-xl bg-[color:var(--surface-card)]/76 p-3 ml-4"
              key={node.reply.id}
              style={{ marginLeft: `${Math.min(depth, 4) * 14}px` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[color:var(--text-strong)]">{formatForumFloor(node.reply.floor_no)}</h3>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                    {renderAuthorName(node.reply.author)}
                    {node.reply.tripcode ? <span>{node.reply.tripcode}</span> : null}
                    <span>{formatDateTime(node.reply.created_at)}</span>
                    {node.reply.reply_to_author ? renderAuthorName(node.reply.reply_to_author, { withAtPrefix: true }) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={(event) => handleReplyButtonClick(event, node.reply)}
                  >
                    回复
                  </button>
                </div>
              </div>
              <div className="grid gap-2 gap-3 text-sm leading-7 text-[color:var(--text-main)]">
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
        <section className="grid gap-4">
          <article className="forum-thread-master ui-card-panel rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5" type="button" onClick={() => onNavigate("/forum")}>
                返回讨论板
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void onShareThread()}>
                  分享主题
                </button>
                {canDeleteThread ? (
                  <button
                    className="forum-thread-danger-link inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-sm font-medium text-rose-500 transition hover:border-rose-200 hover:bg-rose-50/30 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    onClick={() => void handleDeleteThread()}
                    disabled={threadManageActionState.pending}
                  >
                    {threadManageActionState.pending ? "删除中..." : "删除帖子"}
                  </button>
                ) : null}
              </div>
            </div>
            {threadManageActionState.error ? <p className="text-sm text-rose-500/90">{threadManageActionState.error}</p> : null}
            {threadManageActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{threadManageActionState.success}</p> : null}
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">主题详情</p>
            <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">{activeForumThread?.title || "论坛主题详情"}</h1>
            <p className="text-sm leading-7 text-[color:var(--text-soft)]">
              {activeForumThread
                ? "像单独帖子页一样阅读主楼、楼层和楼中楼，不再挤在列表旁边。"
                : "正在读取主题内容。"}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
              {activeForumThread ? renderAuthorName(activeForumThread.author) : <span>读取中</span>}
              <span>{activeForumThread ? `${formatPublishedAgo(activeForumThread.created_at)} 发布` : "发布时间读取中"}</span>
              <span>{activeForumThread ? `${formatDateTime(activeForumThread.last_post_at)} 最后活跃` : "活跃时间读取中"}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
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
                  <span className="inline-flex items-center rounded-full border border-[color:var(--line-soft)] bg-white/45 px-2 py-0.5 text-xs text-[color:var(--text-muted)]" key={`${activeForumThread.id}-hero-${tag}`}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="forum-thread-master__body rounded-xl border border-[color:var(--line-soft)]/75 bg-[color:var(--surface-card)]/72 px-3.5 py-3">
              {threadDetailError ? (
                <p className="text-sm text-rose-500/90">{threadDetailError}</p>
              ) : activeForumThread ? (
                <div className="grid gap-3 text-sm leading-7 text-[color:var(--text-main)]">
                  <RichContent content={activeForumThread.content} />
                </div>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">主题详情加载中。</p>
              )}
            </div>
            <div className="forum-thread-master__stats flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
              <span className="forum-thread-master__stat">{activeForumThread ? `${activeForumThread.view_count} 浏览` : "浏览读取中"}</span>
              <span className="forum-thread-master__stat">{activeForumThread ? `${activeForumThread.reply_count} 回复` : "回复读取中"}</span>
              <span className="forum-thread-master__stat">{activeForumThread ? `${activeForumThread.like_count} 点赞` : "点赞读取中"}</span>
              <span className="forum-thread-master__stat">{activeForumThread ? `${activeForumThread.favorite_count} 收藏` : "收藏读取中"}</span>
            </div>
          </article>

          {threadPreviewImage ? (
            <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm detail-cover">
              <img alt={activeForumThread?.title || "主题封面"} src={threadPreviewImage} />
            </section>
          ) : null}

          <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm detail-thread-replies">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">回复区</p>
                <h2>正文评论列表</h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 ${onlyShowThreadAuthor ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)] text-[color:var(--text-strong)]" : ""}`}
                  type="button"
                  onClick={onToggleOnlyShowThreadAuthor}
                >
                  {onlyShowThreadAuthor ? "恢复全部楼层" : "只看楼主"}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleCollapseButtonClick}
                >
                  收起楼中楼
                </button>
              </div>
            </div>
            <div className="mb-3 grid gap-1">
              <p className="text-sm text-[color:var(--text-muted)]">
                阅读模式：{onlyShowThreadAuthor ? "只看楼主" : "全部楼层"}。
              </p>
              <p className="text-sm text-[color:var(--text-muted)]">
                回复目标：{replyTarget ? `${formatForumFloor(replyTarget.floor_no)} · ${replyTarget.author}` : "主楼"}。
                {replyTarget ? (
                  <>
                    {" "}
                    <button className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-2 py-1 text-xs text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80" type="button" onClick={onClearReplyTarget}>
                      改为回复主楼
                    </button>
                  </>
                ) : null}
              </p>
            </div>
            <div className="m-0 grid gap-0">
              {onlyShowThreadAuthor ? (
                opReplies.length ? (
                opReplies.map((reply) => (
                  <article className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)]" key={reply.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-[color:var(--text-strong)]">{formatForumFloor(reply.floor_no)}</h3>
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                            {renderAuthorName(reply.author)}
                            {reply.tripcode ? <span>{reply.tripcode}</span> : null}
                            <span>{formatDateTime(reply.created_at)}</span>
                            {reply.reply_to_author ? renderAuthorName(reply.reply_to_author, { withAtPrefix: true }) : null}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip tone="accent">楼主</StatusChip>
                          <button
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
                            onClick={(event) => handleReplyButtonClick(event, reply)}
                          >
                            回复TA
                          </button>
                        </div>
                      </div>
                    <div className="grid gap-2 gap-3 text-sm leading-7 text-[color:var(--text-main)]">
                      <RichContent content={reply.content} />
                    </div>
                    {renderInlineReplyComposer(reply)}
                  </article>
                ))
                ) : (
                  <p className="text-sm text-[color:var(--text-muted)]">楼主暂时还没有后续跟帖。</p>
                )
              ) : replyRoots.length ? (
                replyRoots.map((node) => (
                  <article className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3" key={node.reply.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-[color:var(--text-strong)]">{formatForumFloor(node.reply.floor_no)}</h3>
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                          {renderAuthorName(node.reply.author)}
                          {node.reply.tripcode ? <span>{node.reply.tripcode}</span> : null}
                          <span>{formatDateTime(node.reply.created_at)}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {node.reply.author === activeForumThread?.author ? (
                          <StatusChip tone="accent">楼主</StatusChip>
                        ) : null}
                        <button
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={(event) => handleReplyButtonClick(event, node.reply)}
                        >
                          回复TA
                        </button>
                        {node.descendantCount ? (
                          <button
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <div className="grid gap-2 gap-3 text-sm leading-7 text-[color:var(--text-main)]">
                      <RichContent content={node.reply.content} />
                    </div>
                    {renderInlineReplyComposer(node.reply)}
                    {expandedReplyIDs.includes(node.reply.id) && node.children.length
                      ? renderNestedReplies(node.children)
                      : null}
                  </article>
                ))
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">这个主题暂时还没有回复。</p>
              )}
            </div>
          </section>

          <section className="forum-sticky-reply mt-4 rounded-2xl border border-[color:var(--line-soft)] border-t-[color:var(--line-strong)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="forum-sticky-reply__header mb-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">底部互动区</p>
                <h2>{replyTarget ? `回复 ${formatForumFloor(replyTarget.floor_no)}` : "快捷回复"}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => onInsertReplySnippet("\n![](https://)")}>
                  图片
                </button>
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => onInsertReplySnippet(" (´・ω・`) ")}>
                  表情
                </button>
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void onShareThread()}>
                  分享
                </button>
                <button
                  className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 ${activeForumThread?.favorited ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)] text-[color:var(--text-strong)]" : ""}`}
                  type="button"
                  onClick={onToggleThreadFavorite}
                  disabled={!session || !hasVerifiedSpaceAccess || threadEngagementActionState.pending}
                >
                  {activeForumThread?.favorited ? "取消收藏" : "收藏"} · {activeForumThread?.favorite_count ?? 0}
                </button>
                <button
                  className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 ${activeForumThread?.liked ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)] text-[color:var(--text-strong)]" : ""}`}
                  type="button"
                  onClick={onToggleThreadLike}
                  disabled={!session || !hasVerifiedSpaceAccess || threadEngagementActionState.pending}
                >
                  {activeForumThread?.liked ? "取消点赞" : "点赞"} · {activeForumThread?.like_count ?? 0}
                </button>
              </div>
            </div>
            {threadEngagementActionState.error ? <p className="text-sm text-rose-500/90">{threadEngagementActionState.error}</p> : null}
            {threadEngagementActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{threadEngagementActionState.success}</p> : null}

            {!session ? (
              <p className="text-sm text-[color:var(--text-muted)]">登录并通过认证后，可以直接在详情页底部快速回复当前主题。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="text-sm text-[color:var(--text-muted)]">当前账号还没有回复权限，需要通过认证后才能参与讨论。</p>
            ) : activeForumThread?.locked ? (
              <p className="text-sm text-[color:var(--text-muted)]">当前主题已锁定，暂时不能继续回复。</p>
            ) : replyTarget ? (
              <p className="text-sm text-[color:var(--text-muted)]">
                正在回复 {formatForumFloor(replyTarget.floor_no)} · {replyTarget.author}，输入框已在对应楼层展开。
                <button className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-2 py-1 text-xs text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80" type="button" onClick={onClearReplyTarget}>
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

  const boardCount = new Set(filteredThreadFeed.map((thread) => thread.board)).size;
  const canCompose = Boolean(session && hasVerifiedSpaceAccess);

  if (isForumEditorMode) {
    return (
      <section className="grid gap-4">
        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm grid gap-2 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5" type="button" onClick={() => onNavigate("/forum")}>
              返回讨论列表
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)] gap-x-2">
            <span>/ 主题编辑</span>
            <span>{session ? "已登录" : "游客模式"}</span>
            <span>{boardCount} 个分区</span>
          </div>
          <h1 className="text-2xl font-semibold text-[color:var(--text-strong)] text-xl">发布主题</h1>
          <p className="text-sm leading-7 text-[color:var(--text-soft)]">
            在这里独立编辑标题、分区、标签与正文。发布后会自动跳到主题详情页继续互动。
          </p>
        </article>

        {!session ? (
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <p className="text-sm text-[color:var(--text-muted)]">登录并通过认证后，这里可以直接发布新的讨论主题。</p>
          </article>
        ) : !hasVerifiedSpaceAccess ? (
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <p className="text-sm text-[color:var(--text-muted)]">当前账号还没有论坛写权限，需要通过认证后才能发帖。</p>
          </article>
        ) : (
          <form className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm form-layout forum-editor-form" onSubmit={(event) => void onThreadSubmit(event)}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">编辑器</p>
                <h2>主题编辑器</h2>
                <p className="form-help">先确定分区与标签，再发布正文，便于后续检索与互动。</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {threadActionState.success ? <span className="text-sm text-[color:var(--text-muted)]">{threadActionState.success}</span> : null}
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={threadActionState.pending}>
                  {threadActionState.pending ? "发布中..." : "发布主题"}
                </button>
              </div>
            </div>

            <label className="form-field">
              <span>主题标题</span>
              <input
                className="form-control"
                name="title"
                type="text"
                value={threadForm.title}
                onChange={onThreadFieldChange}
                placeholder="例如：关于《XXX》最新一章剧情走向的深度探讨与伏笔分析（内含剧透）"
                required
              />
            </label>

            <div className="form-grid-2">
              <label className="form-field">
                <span>所属分区</span>
                <input
                  className="form-control"
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
              <label className="form-field">
                <span>标签</span>
                <input
                  className="form-control"
                  name="tagsText"
                  type="text"
                  value={threadForm.tagsText}
                  onChange={onThreadFieldChange}
                  placeholder="用逗号分隔，例如：叙事，慢热"
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-white/35 p-3">
                <div className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Markdown 源文本</div>
                <textarea
                  className="form-control"
                  name="content"
                  rows={14}
                  value={threadForm.content}
                  onChange={onThreadFieldChange}
                  placeholder="写下主题内容，支持 Markdown；图片可直接贴 Markdown 图片链接。"
                  required
                />
              </section>
              <section className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-white/35 p-3 bg-[color:var(--surface-card)]">
                <div className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">实时预览</div>
                <div className="min-h-[220px] overflow-auto rounded-lg border border-[color:var(--line-soft)] bg-white/55 p-3">
                  {threadForm.content.trim() ? (
                    <RichContent content={threadForm.content} />
                  ) : (
                    <p className="text-sm text-[color:var(--text-muted)]">预览区：输入主题内容后会实时显示。</p>
                  )}
                </div>
              </section>
            </div>

            {threadActionState.error ? <p className="text-sm text-rose-500/90">{threadActionState.error}</p> : null}

          </form>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="forum-list-page mx-auto grid w-full min-w-0 grid-cols-1 gap-4">
        <article className="forum-feed-panel mx-auto w-full min-w-0 rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-3 shadow-sm sm:p-4">
          <div className="forum-feed-panel__hero forum-feed-panel__section grid gap-3">
            <div className="forum-feed-panel__hero-grid grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="forum-feed-panel__hero-copy grid min-w-0 gap-2">
                <p className="forum-feed-panel__kicker">帖子流</p>
                <h2 className="text-[1.55rem] font-semibold leading-tight text-[color:var(--text-strong)]">帖子列表</h2>
                <p className="text-sm leading-6 text-[color:var(--text-soft)]">浏览活跃主题并按分区快速筛选。</p>
              </div>
              <div className="forum-feed-panel__hero-actions flex w-full min-w-0 flex-col items-stretch gap-2 lg:w-auto lg:items-end">
                <StatusChip tone="accent">{threadPager.total} 条主题</StatusChip>
                <button
                  className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    canCompose
                      ? "forum-compose-button px-5"
                      : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[color:var(--text-main)] hover:border-[color:var(--line-strong)] hover:bg-white"
                  }`}
                  type="button"
                  onClick={() => onNavigate("/forum/editor")}
                >
                  发帖
                </button>
              </div>
            </div>
            {threadsError ? <p className="text-sm text-rose-500/90">{threadsError}</p> : null}
          </div>

          <div className="forum-feed-panel__filters forum-feed-panel__section grid min-w-0 gap-3">
            <div className="forum-feed-panel__filters-head">
              <p className="forum-feed-panel__filters-kicker">筛选器</p>
              <p className="forum-feed-panel__filters-note">先输入关键词，再按分区收窄结果，列表会实时更新。</p>
            </div>
            <div className="forum-feed-panel__filters-body">
              <label className="form-field forum-feed-panel__search" htmlFor="forum-thread-search">
                <span className="forum-feed-panel__search-label">关键词搜索</span>
                <input
                  id="forum-thread-search"
                  className="form-control forum-thread-search-input"
                  type="search"
                  value={threadSearchKeyword}
                  onChange={onThreadSearchKeywordChange}
                  placeholder="搜索标题/作者/标签"
                />
              </label>
              <div className="forum-feed-panel__board-group">
                <p className="forum-feed-panel__board-title">分区筛选</p>
                <div className="forum-board-scroller min-w-0">
                  <div className="forum-board-scroller__inner">
                    {boardFilterOptions.map((board) => (
                      <button
                        className={`forum-board-filter-button inline-flex shrink-0 items-center rounded-lg border px-3 py-1.5 text-sm transition ${
                          selectedForumBoard === board ? "forum-board-filter-button--active" : ""
                        }`}
                        key={board}
                        type="button"
                        aria-pressed={selectedForumBoard === board}
                        onClick={() => onSelectedForumBoardChange(board)}
                      >
                        {board}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="forum-feed-panel__section forum-feed-panel__section--list">
            <div className="forum-feed-panel__list-head mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="forum-feed-panel__list-kicker">主题列表</p>
              <span className="forum-feed-panel__result-pill inline-flex items-center rounded-full border px-2 py-0.5 text-[0.72rem] text-[color:var(--text-muted)]">
                {filteredThreadFeed.length} 条结果
              </span>
            </div>

            <div className="forum-thread-text-list mt-2 grid min-w-0 gap-2">
              {filteredThreadFeed.map((thread) => {
                return (
                  <button
                    className="forum-thread-text-item group relative grid w-full min-w-0 gap-2.5 overflow-hidden rounded-xl px-3 py-3 text-left transition duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--line-strong)] focus-visible:ring-offset-1"
                    key={thread.id}
                    type="button"
                    title={thread.title}
                    onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(thread.id)}`)}
                  >
                    <div className="forum-thread-text-item__head grid min-w-0 gap-2">
                      <strong className="forum-thread-text-item__title">
                        {thread.title}
                      </strong>
                      <div className="forum-thread-text-item__head-tags flex max-w-full shrink-0 flex-wrap items-center gap-1.5">
                        <span className="forum-thread-text-item__board forum-board-badge" data-board={thread.board.toLowerCase()}>
                          /{thread.board}
                        </span>
                        {thread.is_pinned ? <StatusChip tone="accent">置顶</StatusChip> : null}
                        {thread.locked ? <StatusChip tone="warn">锁定</StatusChip> : null}
                      </div>
                    </div>
                    <div className="forum-thread-text-item__meta flex min-w-0 flex-col gap-1.5 text-[0.82rem] text-[color:var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
                      <div className="forum-thread-text-item__author-line flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="forum-thread-text-item__author-label">作者：</span>
                        {renderAuthorName(thread.author, { nestedInClickable: true })}
                        {thread.tripcode ? <span className="font-mono text-[0.74rem] text-[color:var(--text-faint)]">{thread.tripcode}</span> : null}
                        <span aria-hidden="true" className="forum-thread-text-item__meta-sep">•</span>
                        <span className="text-[0.76rem] text-[color:var(--text-faint)]">发布于 {formatDateTime(thread.created_at)}</span>
                        <span aria-hidden="true" className="forum-thread-text-item__meta-sep">•</span>
                        <span className="text-[0.76rem] text-[color:var(--text-faint)]">最后回复 {formatDateTime(thread.last_post_at)}</span>
                      </div>
                      <div className="forum-thread-text-item__metrics flex flex-wrap items-center gap-1.5 sm:ml-auto sm:justify-end">
                        <span className="forum-thread-metric">回复 {thread.reply_count ?? 0}</span>
                        <span className="forum-thread-metric">浏览 {thread.view_count ?? 0}</span>
                        <span className="forum-thread-metric">点赞 {thread.like_count ?? 0}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!filteredThreadFeed.length ? (
                <p className="rounded-xl border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3.5 py-4 text-sm text-[color:var(--text-muted)]">
                  {isLoadingData ? "讨论数据加载中。" : "当前筛选条件下没有可展示的讨论主题。"}
                </p>
              ) : null}
            </div>
            <div className="forum-pagination-shell mt-4 rounded-xl p-3 sm:p-3">
              <PaginationBar pager={threadPager} onPageChange={onThreadPageChange} emptyText="暂无讨论主题。" />
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
