import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type {
  ForumThread as ApiForumThread,
  Session,
} from "../api";
import RichContent from "../components/RichContent";
import StatusChip from "../components/StatusChip";
import type { PagerState } from "../lib/pagination";
import { formatDateTime } from "../lib/text";
import type {
  FormActionState,
  ThreadFormState,
} from "../types/app";

interface AnonymousPageProps {
  anonymousLoadingMore: boolean;
  anonymousThreadActionState: FormActionState<ApiForumThread>;
  anonymousThreadFeed: ApiForumThread[];
  anonymousThreadForm: ThreadFormState;
  anonymousThreadPager: PagerState;
  anonymousThreadsError: string;
  hasMoreAnonymousMessages: boolean;
  isLoadingData: boolean;
  pendingAnonymousScrollMessageID: string | null;
  session: Session | null;
  onAnonymousLoadMore: () => Promise<void>;
  onAnonymousThreadFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onAnonymousScrollDone: () => void;
  onAnonymousThreadSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onNavigate: (href: string) => void;
}

const ANONYMOUS_MESSAGE_TONE_COUNT = 6;
const VISIBLE_ANONYMOUS_MESSAGE_COUNT = 10;

function normalizeTimestamp(thread: ApiForumThread): number {
  const created = Date.parse(thread.created_at || "");
  if (Number.isFinite(created) && created > 0) {
    return created;
  }

  const updated = Date.parse(thread.last_post_at || "");
  return Number.isFinite(updated) ? updated : 0;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function resolveMessageTone(thread: ApiForumThread): number {
  const key = `${thread.author || ""}#${thread.tripcode || ""}`.trim();
  if (!key) {
    return 0;
  }
  return hashString(key) % ANONYMOUS_MESSAGE_TONE_COUNT;
}

export default function AnonymousPage({
  anonymousLoadingMore,
  anonymousThreadActionState,
  anonymousThreadFeed,
  anonymousThreadForm,
  anonymousThreadPager,
  anonymousThreadsError,
  hasMoreAnonymousMessages,
  isLoadingData,
  pendingAnonymousScrollMessageID,
  session,
  onAnonymousLoadMore,
  onAnonymousThreadFieldChange,
  onAnonymousScrollDone,
  onAnonymousThreadSubmit,
  onNavigate,
}: AnonymousPageProps) {
  const streamRef = useRef<HTMLDivElement | null>(null);
  const messageRefMap = useRef<Record<string, HTMLElement | null>>({});
  const hasAutoScrolledLatestRef = useRef(false);
  const pendingLoadAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const [streamViewportHeight, setStreamViewportHeight] = useState<number | null>(null);
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
  const streamViewportStyle =
    streamViewportHeight === null
      ? undefined
      : {
          height: `${streamViewportHeight}px`,
          minHeight: `${streamViewportHeight}px`,
          maxHeight: `${streamViewportHeight}px`,
        };

  const measureStreamViewportHeight = useCallback((): void => {
    const stream = streamRef.current;
    if (!stream || !chatMessages.length || typeof window === "undefined") {
      setStreamViewportHeight(null);
      return;
    }

    const visibleMessages = chatMessages
      .slice(-VISIBLE_ANONYMOUS_MESSAGE_COUNT)
      .map((thread) => messageRefMap.current[thread.id])
      .filter((node): node is HTMLElement => Boolean(node));
    if (!visibleMessages.length) {
      setStreamViewportHeight(null);
      return;
    }

    const streamStyles = window.getComputedStyle(stream);
    const gap = Number.parseFloat(streamStyles.rowGap || streamStyles.gap || "0") || 0;
    const paddingTop = Number.parseFloat(streamStyles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(streamStyles.paddingBottom) || 0;
    const contentHeight = visibleMessages.reduce((total, messageNode) => total + messageNode.offsetHeight, 0);
    const nextHeight = Math.ceil(
      contentHeight +
        Math.max(visibleMessages.length - 1, 0) * gap +
        paddingTop +
        paddingBottom,
    );

    setStreamViewportHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
  }, [chatMessages]);

  useLayoutEffect(() => {
    measureStreamViewportHeight();
  }, [measureStreamViewportHeight]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function handleResize(): void {
      measureStreamViewportHeight();
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [measureStreamViewportHeight]);

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

  useEffect(() => {
    if (hasAutoScrolledLatestRef.current || pendingAnonymousScrollMessageID || !chatMessages.length) {
      return;
    }

    const stream = streamRef.current;
    if (!stream) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const currentStream = streamRef.current;
      if (!currentStream) {
        return;
      }
      currentStream.scrollTop = currentStream.scrollHeight;
      hasAutoScrolledLatestRef.current = true;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [chatMessages, pendingAnonymousScrollMessageID]);

  useEffect(() => {
    if (anonymousLoadingMore) {
      return;
    }

    const stream = streamRef.current;
    const anchor = pendingLoadAnchorRef.current;
    if (!stream || !anchor) {
      return;
    }

    const deltaHeight = stream.scrollHeight - anchor.scrollHeight;
    stream.scrollTop = anchor.scrollTop + deltaHeight;
    pendingLoadAnchorRef.current = null;
  }, [anonymousLoadingMore, chatMessages.length]);

  function handleStreamScroll(): void {
    const stream = streamRef.current;
    if (!stream || anonymousLoadingMore || !hasMoreAnonymousMessages || pendingLoadAnchorRef.current) {
      return;
    }

    if (stream.scrollTop > 120) {
      return;
    }

    pendingLoadAnchorRef.current = {
      scrollHeight: stream.scrollHeight,
      scrollTop: stream.scrollTop,
    };
    void onAnonymousLoadMore();
  }

  return (
    <section className="ui-card-panel rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm anonymous-chat-room">
      {anonymousThreadsError ? <p className="text-sm text-rose-500/90">{anonymousThreadsError}</p> : null}

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">聊天室</p>
          <h2>聊天室</h2>
        </div>
        <StatusChip tone="neutral">{anonymousThreadPager.total} 条消息</StatusChip>
      </div>

      <p className="anonymous-chat-room__hint">聊天室</p>

      <div
        className="anonymous-thread-chat anonymous-chat-room__stream"
        onScroll={handleStreamScroll}
        ref={streamRef}
        style={streamViewportStyle}
      >
        {chatMessages.map((thread) => {
          const tone = resolveMessageTone(thread);
          return (
            <article
              className={`anonymous-thread-chat__message anonymous-thread-chat__message--tone-${tone}`}
              key={thread.id}
              ref={(node) => {
                messageRefMap.current[thread.id] = node;
              }}
            >
              <div className="anonymous-thread-chat__meta">
                <span>{thread.author}</span>
                {thread.tripcode ? <span>{thread.tripcode}</span> : null}
                <span>{formatDateTime(thread.created_at || thread.last_post_at)}</span>
              </div>
              <div className="grid gap-3 text-sm leading-7 text-[color:var(--text-main)] anonymous-thread-chat__body">
                <RichContent content={thread.content} />
              </div>
            </article>
          );
        })}
        {!chatMessages.length && !isLoadingData ? (
          <p className="text-sm text-[color:var(--text-muted)]">聊天室还没有消息，发一条试试。</p>
        ) : null}
        {isLoadingData && !chatMessages.length ? <p className="text-sm text-[color:var(--text-muted)]">消息加载中...</p> : null}
        {anonymousLoadingMore ? <p className="text-sm text-[color:var(--text-muted)]">加载更早消息中...</p> : null}
        {!anonymousLoadingMore && hasMoreAnonymousMessages ? (
          <p className="text-sm text-[color:var(--text-muted)]">上滑可继续查看更早消息</p>
        ) : null}
      </div>

      {!session ? (
        <div className="anonymous-chat-room__guest">
          <p className="text-sm text-[color:var(--text-muted)]">登录后可发送聊天室消息。</p>
          <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => onNavigate("/space")}>
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
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={anonymousThreadActionState.pending}>
              {anonymousThreadActionState.pending ? "发送中..." : "发送消息"}
            </button>
          </div>
          {anonymousThreadActionState.error ? <p className="text-sm text-rose-500/90">{anonymousThreadActionState.error}</p> : null}
          {anonymousThreadActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{anonymousThreadActionState.success}</p> : null}
        </form>
      )}
    </section>
  );
}
