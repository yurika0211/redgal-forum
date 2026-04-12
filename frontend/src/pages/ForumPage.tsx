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
            <div className="forum-reply-target-bar">
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
          <div className="forum-sticky-reply__actions">
            <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <input
                checked={replyForm.sage}
                name="sage"
                type="checkbox"
                onChange={onReplyFieldChange}
              />
              <span>不顶帖 (Sage)</span>
            </label>
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={replyActionState.pending}>
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
        <div className="mt-1.5 grid gap-2">
          {nodes.map((node) => (
            <article
              className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 ml-4"
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
          <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm grid gap-2">
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
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 story-reading-delete-button"
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
              <span>{activeForumThread?.board || "分区读取中"}</span>
              <span>{activeForumThread ? `${activeForumThread.view_count} 浏览` : "浏览读取中"}</span>
              <span>{activeForumThread ? `${activeForumThread.reply_count} 回复` : "回复读取中"}</span>
              <span>{activeForumThread ? `${activeForumThread.like_count} 点赞` : "点赞读取中"}</span>
              <span>{activeForumThread ? `${activeForumThread.favorite_count} 收藏` : "收藏读取中"}</span>
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
          </article>

          {threadPreviewImage ? (
            <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm detail-cover">
              <img alt={activeForumThread?.title || "主题封面"} src={threadPreviewImage} />
            </section>
          ) : null}

          <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm detail-main detail-main--thread forum-thread-reading">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">正文</p>
                <h2>{activeForumThread?.title || "讨论主题"}</h2>
              </div>
              {activeForumThread ? (
                <StatusChip tone={activeForumThread.anonymous ? "warn" : "neutral"}>
                  {activeForumThread.author}
                </StatusChip>
              ) : null}
            </div>
            {threadDetailError ? (
              <p className="text-sm text-rose-500/90">{threadDetailError}</p>
            ) : activeForumThread ? (
              <div className="grid gap-3 text-sm leading-7 text-[color:var(--text-main)]">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                  {formatPublishedAgo(activeForumThread.created_at)} ·{" "}
                  {formatDateTime(activeForumThread.last_post_at)} 最后活跃
                </p>
                <RichContent content={activeForumThread.content} />
              </div>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">主题详情加载中。</p>
            )}
          </section>

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

          <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm forum-sticky-reply forum-sticky-reply--plain">
            <div className="forum-sticky-reply__header">
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

  const featuredListThread = filteredThreadFeed[0] ?? featuredThread;
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
          <form className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm grid gap-3" onSubmit={(event) => void onThreadSubmit(event)}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">编辑器</p>
                <h2>主题编辑器</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {threadActionState.success ? <span className="text-sm text-[color:var(--text-muted)]">{threadActionState.success}</span> : null}
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={threadActionState.pending}>
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

            <div className="grid gap-3 md:grid-cols-2">
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

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="grid gap-2 rounded-xl border border-[color:var(--line-soft)] bg-white/35 p-3">
                <div className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Markdown 源文本</div>
                <textarea
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

            {featuredListThread ? (
              <button
                className="grid gap-1 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3"
                type="button"
                onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(featuredListThread.id)}`)}
              >
                <span className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">最新活跃主题</span>
                <strong>{featuredListThread.title}</strong>
                <span>
                  {renderAuthorName(featuredListThread.author, { nestedInClickable: true })} · {featuredListThread.reply_count} 回复 ·{" "}
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
      <section className="forum-list-page grid grid-cols-1 gap-4">
        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm forum-feed-panel">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3 forum-feed-panel__head">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)] text-xs tracking-[0.14em] text-[color:var(--text-faint)]">帖子流</p>
              <h2 className="text-xl font-semibold text-[color:var(--text-strong)]">讨论串列表</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 forum-feed-panel__head-actions">
              <StatusChip tone="accent">{threadPager.total} 条主题</StatusChip>
              <button
                className={`px-2.5 py-1 text-xs inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition ${ canCompose ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)] text-[color:var(--text-strong)] hover:bg-[color:var(--surface-card)]" : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[color:var(--text-main)] hover:border-[color:var(--line-strong)]" }`}
                type="button"
                onClick={() => onNavigate("/forum/editor")}
              >
                发帖
              </button>
            </div>
          </div>
          {threadsError ? <p className="text-sm text-rose-500/90">{threadsError}</p> : null}
          <div className="mb-4 flex flex-wrap items-center gap-2 forum-feed-panel__filters">
            <label className="grid gap-1 min-w-[220px] flex-1" htmlFor="forum-thread-search">
              <span className="text-xs text-[color:var(--text-muted)]">关键词搜索</span>
              <input
                id="forum-thread-search"
                className="w-full rounded-lg border border-[color:var(--line-soft)] bg-white/70 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)]"
                type="search"
                value={threadSearchKeyword}
                onChange={onThreadSearchKeywordChange}
                placeholder="按标题、正文、版块、作者、标签搜索帖子"
              />
            </label>
            {boardFilterOptions.map((board) => (
              <button
                className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm transition ${
                  selectedForumBoard === board
                    ? "border-[color:var(--line-strong)] bg-[color:var(--surface-tint-blue)] text-[color:var(--text-strong)]"
                    : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] text-[color:var(--text-main)] hover:border-[color:var(--line-strong)]"
                }`}
                key={board}
                type="button"
                onClick={() => onSelectedForumBoardChange(board)}
              >
                {board}
              </button>
            ))}
          </div>
          <div className="forum-thread-text-list mt-2 grid gap-0 border-t border-dashed border-[color:var(--line-soft)]">
            {filteredThreadFeed.map((thread) => {
              return (
                <button
                  className="forum-thread-text-item grid w-full border-b border-dashed border-[color:var(--line-soft)] bg-transparent px-0 pb-3.5 pt-3 text-left transition hover:translate-x-0.5"
                  key={thread.id}
                  type="button"
                  onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(thread.id)}`)}
                >
                  <div className="forum-thread-text-item__head flex flex-wrap items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-start">
                    <strong className="text-[1.04rem] font-semibold text-[color:var(--text-strong)]">{thread.title}</strong>
                    <span className="forum-thread-text-item__board whitespace-nowrap text-[0.82rem] text-[color:var(--text-muted)]">/{thread.board}</span>
                  </div>
                  <p className="forum-thread-text-item__meta mt-2 flex flex-wrap items-center gap-[10px] text-[0.84rem] text-[color:var(--text-muted)]">
                    {renderAuthorName(thread.author, { nestedInClickable: true })}
                    {thread.tripcode ? <span>{thread.tripcode}</span> : null}
                    {thread.is_pinned ? <span>置顶</span> : null}
                    {thread.locked ? <span>锁定</span> : null}
                    <span>{formatDateTime(thread.last_post_at)} 最后回复</span>
                  </p>
                </button>
              );
            })}
            {!filteredThreadFeed.length ? (
              <p className="text-sm text-[color:var(--text-muted)]">
                {isLoadingData ? "讨论数据加载中。" : "当前筛选条件下没有可展示的讨论主题。"}
              </p>
            ) : null}
          </div>
          {featuredListThread ? (
            <button
              className="grid gap-1 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3"
              type="button"
              onClick={() => onNavigate(`/forum/threads/${encodeURIComponent(featuredListThread.id)}`)}
            >
              <span className="text-xs uppercase tracking-[0.08em] text-[color:var(--text-muted)]">最新活跃主题</span>
              <strong>{featuredListThread.title}</strong>
              <span>
                {renderAuthorName(featuredListThread.author, { nestedInClickable: true })} · {featuredListThread.reply_count} 回复 ·{" "}
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
