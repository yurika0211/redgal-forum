import {
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type {
  ForumThread as ApiForumThread,
  Session,
} from "../api";
import PaginationBar from "../components/PaginationBar";
import RichContent from "../components/RichContent";
import StatusChip from "../components/StatusChip";
import { formatForumFloor } from "../lib/forum";
import type { PagerState } from "../lib/pagination";
import { formatDateTime } from "../lib/text";
import type {
  FormActionState,
  ThreadFormState,
} from "../types/app";

interface AnonymousPageProps {
  anonymousThreadActionState: FormActionState<ApiForumThread>;
  anonymousThreadFeed: ApiForumThread[];
  anonymousThreadForm: ThreadFormState;
  anonymousThreadPager: PagerState;
  anonymousThreadsError: string;
  isLoadingData: boolean;
  pendingAnonymousScrollMessageID: string | null;
  session: Session | null;
  onAnonymousThreadFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onAnonymousScrollDone: () => void;
  onAnonymousThreadPageChange: (page: number) => void;
  onAnonymousThreadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onNavigate: (href: string) => void;
}

function normalizeTimestamp(thread: ApiForumThread): number {
  const created = Date.parse(thread.created_at || "");
  if (Number.isFinite(created) && created > 0) {
    return created;
  }

  const updated = Date.parse(thread.last_post_at || "");
  return Number.isFinite(updated) ? updated : 0;
}

export default function AnonymousPage({
  anonymousThreadActionState,
  anonymousThreadFeed,
  anonymousThreadForm,
  anonymousThreadPager,
  anonymousThreadsError,
  isLoadingData,
  pendingAnonymousScrollMessageID,
  session,
  onAnonymousThreadFieldChange,
  onAnonymousScrollDone,
  onAnonymousThreadPageChange,
  onAnonymousThreadSubmit,
  onNavigate,
}: AnonymousPageProps) {
  const messageRefMap = useRef<Record<string, HTMLElement | null>>({});
  const pagedMessagesDesc = [...anonymousThreadFeed].sort((left, right) => {
    const leftTime = normalizeTimestamp(left);
    const rightTime = normalizeTimestamp(right);
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return right.id.localeCompare(left.id);
  });
  const chatMessages = [...pagedMessagesDesc].sort((left, right) => {
    const leftTime = normalizeTimestamp(left);
    const rightTime = normalizeTimestamp(right);
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  });

  function resolveGlobalFloor(localIndex: number): number {
    const positionInPageDesc = pagedMessagesDesc.length - localIndex;
    const globalRankDesc =
      (Math.max(anonymousThreadPager.page, 1) - 1) * anonymousThreadPager.pageSize + positionInPageDesc;
    const computed = anonymousThreadPager.total - globalRankDesc + 1;
    return Number.isFinite(computed) && computed > 0 ? computed : localIndex + 1;
  }

  useEffect(() => {
    if (!pendingAnonymousScrollMessageID) {
      return;
    }

    const target = messageRefMap.current[pendingAnonymousScrollMessageID];
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    onAnonymousScrollDone();
  }, [chatMessages, onAnonymousScrollDone, pendingAnonymousScrollMessageID]);

  return (
    <section className="panel anonymous-chat-room">
      {anonymousThreadsError ? <p className="panel-error">{anonymousThreadsError}</p> : null}

      <div className="panel-heading">
        <div>
          <p className="panel-kicker">聊天室</p>
          <h2>聊天室</h2>
        </div>
        <StatusChip tone="neutral">{anonymousThreadPager.total} 条消息</StatusChip>
      </div>

      <p className="anonymous-chat-room__hint">聊天室</p>

      <div className="anonymous-thread-chat anonymous-chat-room__stream">
        {chatMessages.map((thread, index) => (
          <article
            className="anonymous-thread-chat__message"
            key={thread.id}
            ref={(node) => {
              messageRefMap.current[thread.id] = node;
            }}
          >
            <div className="anonymous-thread-chat__meta">
              <strong>{formatForumFloor(resolveGlobalFloor(index))}</strong>
              <span>{thread.author}</span>
              {thread.tripcode ? <span>{thread.tripcode}</span> : null}
              <span>{formatDateTime(thread.created_at || thread.last_post_at)}</span>
            </div>
            <div className="detail-body detail-body--reply anonymous-thread-chat__body">
              <RichContent content={thread.content} />
            </div>
          </article>
        ))}
        {!chatMessages.length && !isLoadingData ? (
          <p className="panel-empty">聊天室还没有消息，发一条试试。</p>
        ) : null}
        {isLoadingData && !chatMessages.length ? <p className="panel-empty">消息加载中...</p> : null}
      </div>

      <div className="anonymous-wall__pager">
        <PaginationBar
          pager={anonymousThreadPager}
          onPageChange={onAnonymousThreadPageChange}
          emptyText="暂无聊天室消息。"
        />
      </div>

      {!session ? (
        <div className="anonymous-chat-room__guest">
          <p className="panel-empty">登录后可发送聊天室消息。</p>
          <button className="primary-button" type="button" onClick={() => onNavigate("/space")}>
            去登录
          </button>
        </div>
      ) : (
        <form className="anonymous-chat-room__composer" onSubmit={(event) => void onAnonymousThreadSubmit(event)}>
          <textarea
            name="content"
            rows={3}
            value={anonymousThreadForm.content}
            onChange={onAnonymousThreadFieldChange}
            placeholder="在这里输入聊天室消息，回车发送前可多行编辑。"
            required
          />
          <div className="anonymous-chat-room__composer-row">
            <p className="anonymous-chat-room__composer-tip">聊天室</p>
            <button className="primary-button" type="submit" disabled={anonymousThreadActionState.pending}>
              {anonymousThreadActionState.pending ? "发送中..." : "发送消息"}
            </button>
          </div>
          {anonymousThreadActionState.error ? <p className="panel-error">{anonymousThreadActionState.error}</p> : null}
          {anonymousThreadActionState.success ? <p className="panel-empty">{anonymousThreadActionState.success}</p> : null}
        </form>
      )}
    </section>
  );
}
