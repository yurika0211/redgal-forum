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
import StatusChip from "../components/StatusChip";
import { formatForumFloor } from "../lib/forum";
import type { PagerState } from "../lib/pagination";
import {
  excerpt,
  extractMarkdownPreviewImage,
  formatDateTime,
  parseTags,
} from "../lib/text";
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
  onAnonymousReplyTargetChange: (threadID: string) => void;
  onAnonymousReplyTargetClear: () => void;
  onAnonymousReplySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAnonymousThreadFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onAnonymousThreadPageChange: (page: number) => void;
  onAnonymousTopicChange: (topic: string) => void;
  onAnonymousThreadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onNavigate: (href: string) => void;
}

const ANONYMOUS_TOPICS = [
  {
    id: "daily",
    label: "闲聊",
    description: "路过一句、碎碎念、今天的心情。",
  },
  {
    id: "intel",
    label: "情报",
    description: "活动更新、资源提醒、值得记下的信息。",
  },
  {
    id: "fun",
    label: "娱乐",
    description: "轻松话题、段子、梗和放松区。",
  },
] as const;

function resolveAnonymousTopic(thread: Pick<ApiForumThread, "tags">): string {
  const matchedTopic = ANONYMOUS_TOPICS.find((topic) =>
    thread.tags.some((tag) => tag === topic.label),
  );
  return matchedTopic?.label || "闲聊";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatAnonymousCardTitle(thread: Pick<ApiForumThread, "tags" | "title">): string {
  const topic = resolveAnonymousTopic(thread);
  const rawTitle = thread.title.trim();
  if (!rawTitle) {
    return topic;
  }

  const prefixPattern = new RegExp(
    `^${escapeRegExp(topic)}\\s*[·•|｜:：\\-]\\s*`,
  );
  const cleanedTitle = rawTitle.replace(prefixPattern, "").trim();

  return cleanedTitle ? `${topic} • ${cleanedTitle}` : topic;
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
  onAnonymousReplyTargetChange,
  onAnonymousReplyTargetClear,
  onAnonymousReplySubmit,
  onAnonymousThreadFieldChange,
  onAnonymousThreadPageChange,
  onAnonymousTopicChange,
  onAnonymousThreadSubmit,
  onNavigate,
}: AnonymousPageProps) {
  const selectedTopic =
    ANONYMOUS_TOPICS.find((topic) =>
      parseTags(anonymousThreadForm.tagsText).includes(topic.label),
    )?.label || "闲聊";
  const replyTargetThread =
    anonymousThreadFeed.find((thread) => thread.id === anonymousReplyForm.threadID) ||
    (activeAnonymousThread?.id === anonymousReplyForm.threadID ? activeAnonymousThread : null);

  if (selectedAnonymousThreadID) {
    const anonymousCover = activeAnonymousThread
      ? extractMarkdownPreviewImage(activeAnonymousThread.content)
      : null;

    return (
      <section className="detail-page detail-page--anonymous">
        <article className="panel detail-hero detail-hero--anonymous">
          <div className="detail-hero__top">
            <button className="ghost-button detail-back-link" type="button" onClick={() => onNavigate("/anonymous")}>
              返回匿名画板
            </button>
          </div>
          <p className="eyebrow">匿名串详情</p>
          <h1 className="detail-hero__title">{activeAnonymousThread?.title || "匿名主题详情"}</h1>
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

        <section className="panel detail-thread-replies">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">匿名楼层</p>
              <h2>本串回复</h2>
            </div>
            <StatusChip tone="accent">{anonymousThreadDetail?.replies.length || 0} 条</StatusChip>
          </div>
          <div className="anonymous-thread-chat">
            {(anonymousThreadDetail?.replies || []).map((reply) => (
              <article className="anonymous-thread-chat__message" key={reply.id}>
                <div className="anonymous-thread-chat__meta">
                  <strong>{formatForumFloor(reply.floor_no)}</strong>
                  <span>{reply.author}</span>
                  {reply.tripcode ? <span>{reply.tripcode}</span> : null}
                  <span>{formatDateTime(reply.created_at)}</span>
                  {reply.reply_to_author ? <span>@{reply.reply_to_author}</span> : null}
                </div>
                <div className="detail-body detail-body--reply anonymous-thread-chat__body">
                  <RichContent content={reply.content} />
                </div>
              </article>
            ))}
            {anonymousThreadDetail && anonymousThreadDetail.replies.length === 0 ? (
              <p className="panel-empty">这个匿名主题暂时还没有回复。</p>
            ) : null}
          </div>
        </section>

        <section className="panel anonymous-detail-reply">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">快速回复</p>
              <h2>回复本串</h2>
            </div>
            {activeAnonymousThread ? (
              <StatusChip tone={activeAnonymousThread.locked ? "warn" : "success"}>
                {activeAnonymousThread.locked ? "主题已锁定" : "可回复"}
              </StatusChip>
            ) : null}
          </div>
          {!session ? (
            <div className="anonymous-detail-reply__guest">
              <p className="panel-empty">登录后可直接回复本串。</p>
              <button className="primary-button" type="button" onClick={() => onNavigate("/space")}>
                去登录
              </button>
            </div>
          ) : activeAnonymousThread?.locked ? (
            <p className="panel-empty">主题已锁定，暂时不能回复。</p>
          ) : (
            <form className="anonymous-detail-reply__form" onSubmit={(event) => void onAnonymousReplySubmit(event)}>
              <textarea
                name="content"
                rows={4}
                value={anonymousReplyForm.content}
                onChange={onAnonymousReplyFieldChange}
                placeholder="写下你的匿名回复"
                required
              />
              <div className="anonymous-detail-reply__actions">
                <label className="gallery-admin__toggle">
                  <input
                    checked={anonymousReplyForm.sage}
                    name="sage"
                    type="checkbox"
                    onChange={onAnonymousReplyFieldChange}
                  />
                  <span>sage，不顶帖</span>
                </label>
                <button className="primary-button" type="submit" disabled={anonymousReplyActionState.pending}>
                  {anonymousReplyActionState.pending ? "提交中..." : "提交回复"}
                </button>
              </div>
              {anonymousReplyActionState.error ? <p className="panel-error">{anonymousReplyActionState.error}</p> : null}
              {anonymousReplyActionState.success ? <p className="panel-empty">{anonymousReplyActionState.success}</p> : null}
            </form>
          )}
        </section>
      </section>
    );
  }

  const topicColumns = ANONYMOUS_TOPICS.map((topic) => ({
    ...topic,
    items: anonymousThreadFeed.filter(
      (thread) => resolveAnonymousTopic(thread) === topic.label,
    ),
  }));
  const activeTopicColumn = topicColumns.find((topic) => topic.label === selectedTopic) || topicColumns[0];

  return (
    <section className="panel anonymous-wall anonymous-wall--board">
      {anonymousThreadsError ? <p className="panel-error">{anonymousThreadsError}</p> : null}

      <div className="anonymous-board">
        <aside className="anonymous-board__sidebar">
          <div className="anonymous-board__sidebar-head">
            <div>
              <p className="panel-kicker">匿名主题</p>
              <h2>Sidebar</h2>
            </div>
            <StatusChip tone="neutral">{anonymousThreadPager.total} 条</StatusChip>
          </div>
          <div className="anonymous-wall__topic-sidebar" role="tablist" aria-label="匿名主题标签">
            {topicColumns.map((topic) => (
              <button
                key={topic.id}
                className={`anonymous-wall__topic-button anonymous-wall__topic-button--tag ${
                  selectedTopic === topic.label ? "anonymous-wall__topic-button--active" : ""
                }`}
                type="button"
                onClick={() => onAnonymousTopicChange(topic.label)}
              >
                <span>{topic.label}</span>
                <span className="anonymous-wall__topic-count">{topic.items.length}</span>
              </button>
            ))}
          </div>
          {!session ? (
            <div className="anonymous-board__sidebar-login">
              <p>登录后可贴匿名留言。</p>
              <button className="primary-button" type="button" onClick={() => onNavigate("/space")}>
                去登录
              </button>
            </div>
          ) : (
            <form
              className="anonymous-board__quick-form"
              onSubmit={(event) =>
                void (replyTargetThread ? onAnonymousReplySubmit(event) : onAnonymousThreadSubmit(event))
              }
            >
              {replyTargetThread ? (
                <div className="anonymous-board__quick-target">
                  <strong>回应：{excerpt(replyTargetThread.content, 34)}</strong>
                  <button className="ghost-button" type="button" onClick={onAnonymousReplyTargetClear}>
                    取消
                  </button>
                </div>
              ) : null}
              <textarea
                name="content"
                rows={3}
                value={replyTargetThread ? anonymousReplyForm.content : anonymousThreadForm.content}
                onChange={replyTargetThread ? onAnonymousReplyFieldChange : onAnonymousThreadFieldChange}
                placeholder={replyTargetThread ? "写下你想回应的话" : `写在「${selectedTopic}」主题下`}
                required
              />
              <div className="anonymous-board__quick-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={replyTargetThread ? anonymousReplyActionState.pending : anonymousThreadActionState.pending}
                >
                  {replyTargetThread
                    ? anonymousReplyActionState.pending
                      ? "回应中..."
                      : "回应"
                    : anonymousThreadActionState.pending
                      ? "贴上中..."
                      : "贴上"}
                </button>
              </div>
              {replyTargetThread ? (
                <>
                  {anonymousReplyActionState.error ? <p className="panel-error">{anonymousReplyActionState.error}</p> : null}
                  {anonymousReplyActionState.success ? <p className="panel-empty">{anonymousReplyActionState.success}</p> : null}
                </>
              ) : (
                <>
                  {anonymousThreadActionState.error ? <p className="panel-error">{anonymousThreadActionState.error}</p> : null}
                  {anonymousThreadActionState.success ? <p className="panel-empty">{anonymousThreadActionState.success}</p> : null}
                </>
              )}
            </form>
          )}
        </aside>

        <section className="anonymous-board__feed">
          <p className="anonymous-board__hint">
            在「{activeTopicColumn.label}」主题下浏览匿名发言，可查看串页或直接回应此串。
          </p>
          <div className="anonymous-board__list">
            {activeTopicColumn.items.length ? (
              activeTopicColumn.items.map((thread) => (
                <article
                  className={`anonymous-board-card ${
                    anonymousReplyForm.threadID === thread.id ? "anonymous-board-card--targeted" : ""
                  }`}
                  key={thread.id}
                >
                  <div className="anonymous-board-card__head">
                    <strong>{formatAnonymousCardTitle(thread)}</strong>
                  </div>
                  <p className="anonymous-board-card__content">{excerpt(thread.content, 180)}</p>
                  <div className="anonymous-board-card__foot">
                    <p className="anonymous-board-card__meta">
                      {thread.author}
                      {thread.tripcode ? ` ${thread.tripcode}` : ""}
                      {" · "}
                      {formatDateTime(thread.last_post_at)}
                      {" · "}
                      {thread.reply_count} 条回应
                    </p>
                    <div className="anonymous-board-card__actions">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => onNavigate(`/anonymous/threads/${encodeURIComponent(thread.id)}`)}
                      >
                        查看串页
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() =>
                          anonymousReplyForm.threadID === thread.id
                            ? onAnonymousReplyTargetClear()
                            : onAnonymousReplyTargetChange(thread.id)
                        }
                      >
                        {anonymousReplyForm.threadID === thread.id ? "取消回应" : "回应此串"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="anonymous-wall__empty">
                <strong>这个主题下还没有留言</strong>
                <p>可以从左侧选择其他主题，或者先贴第一条。</p>
              </div>
            )}
          </div>

          <div className="anonymous-wall__pager">
            <PaginationBar
              pager={anonymousThreadPager}
              onPageChange={onAnonymousThreadPageChange}
              emptyText="暂无匿名主题。"
            />
          </div>
        </section>
      </div>
    </section>
  );
}
