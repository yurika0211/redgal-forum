import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchIncomingFriendRequests,
  fetchMyThreadReplySnapshots,
  type Session,
  type SiteContentBlock,
} from "../api";
import { excerpt } from "../lib/text";

const NOTIFICATION_STORE_KEY = "rubedo_notification_store_v1";
const NOTIFICATION_MAX_ITEMS = 48;

type NotificationKind = "forum_reply" | "friend_request" | "announcement";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  href?: string;
  createdAt: string;
  unread: boolean;
}

interface NotificationStore {
  friendBaselineReady: boolean;
  items: AppNotification[];
  noticeBaselineReady: boolean;
  seenNoticeIDs: string[];
  seenIncomingRequestIDs: string[];
  threadBaselineReady: boolean;
  threadReplySnapshot: Record<string, number>;
}

interface UseAppNotificationsOptions {
  session: Session | null;
  profileVerified: boolean;
  portalNotices: readonly SiteContentBlock[];
}

interface UseAppNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationRead: (notificationID: string) => void;
  markAllNotificationsRead: () => void;
}

function createEmptyNotificationStore(): NotificationStore {
  return {
    friendBaselineReady: false,
    items: [],
    noticeBaselineReady: false,
    seenNoticeIDs: [],
    seenIncomingRequestIDs: [],
    threadBaselineReady: false,
    threadReplySnapshot: {},
  };
}

function sortAndTrimNotifications(items: readonly AppNotification[]): AppNotification[] {
  const map = new Map<string, AppNotification>();
  items.forEach((item) => {
    if (typeof item.id !== "string" || !item.id.trim()) {
      return;
    }

    map.set(item.id, {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      unread: Boolean(item.unread),
    });
  });

  return Array.from(map.values())
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt) || 0;
      const rightTime = Date.parse(right.createdAt) || 0;
      return rightTime - leftTime;
    })
    .slice(0, NOTIFICATION_MAX_ITEMS);
}

function readStoredNotificationStore(): NotificationStore {
  if (typeof window === "undefined") {
    return createEmptyNotificationStore();
  }

  const raw = window.localStorage.getItem(NOTIFICATION_STORE_KEY);
  if (!raw) {
    return createEmptyNotificationStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationStore> | null;
    if (!parsed || typeof parsed !== "object") {
      return createEmptyNotificationStore();
    }

    const items = Array.isArray(parsed.items)
      ? sortAndTrimNotifications(parsed.items as AppNotification[])
      : [];
    const seenIncomingRequestIDs = Array.isArray(parsed.seenIncomingRequestIDs)
      ? parsed.seenIncomingRequestIDs.filter(
          (item): item is string => typeof item === "string" && Boolean(item.trim()),
        )
      : [];
    const seenNoticeIDs = Array.isArray(parsed.seenNoticeIDs)
      ? parsed.seenNoticeIDs.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      : [];
    const threadReplySnapshot =
      parsed.threadReplySnapshot && typeof parsed.threadReplySnapshot === "object"
        ? Object.entries(parsed.threadReplySnapshot).reduce<Record<string, number>>(
            (result, [threadID, count]) => {
              if (typeof count === "number" && Number.isFinite(count) && count >= 0) {
                result[threadID] = count;
              }
              return result;
            },
            {},
          )
        : {};

    return {
      friendBaselineReady: Boolean(parsed.friendBaselineReady),
      items,
      noticeBaselineReady: Boolean(parsed.noticeBaselineReady),
      seenNoticeIDs,
      seenIncomingRequestIDs,
      threadBaselineReady: Boolean(parsed.threadBaselineReady),
      threadReplySnapshot,
    };
  } catch {
    window.localStorage.removeItem(NOTIFICATION_STORE_KEY);
    return createEmptyNotificationStore();
  }
}

export function useAppNotifications({
  session,
  profileVerified,
  portalNotices,
}: UseAppNotificationsOptions): UseAppNotificationsResult {
  const [notificationStore, setNotificationStore] = useState<NotificationStore>(() =>
    readStoredNotificationStore(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(NOTIFICATION_STORE_KEY, JSON.stringify(notificationStore));
  }, [notificationStore]);

  useEffect(() => {
    if (session) {
      return;
    }

    setNotificationStore(createEmptyNotificationStore());
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(NOTIFICATION_STORE_KEY);
    }
  }, [session]);

  useEffect(() => {
    const noticeBlocks = portalNotices.filter((item) => item.active);
    if (!noticeBlocks.length) {
      return;
    }

    setNotificationStore((current) => {
      const next: NotificationStore = {
        ...current,
        items: [...current.items],
        seenNoticeIDs: [...current.seenNoticeIDs],
      };
      const seenNoticeIDs = new Set(next.seenNoticeIDs);
      const notificationIDs = new Set(next.items.map((item) => item.id));

      if (!next.noticeBaselineReady) {
        noticeBlocks.forEach((notice) => {
          const noticeKey = `${notice.id}:${notice.slug || notice.title}`;
          seenNoticeIDs.add(noticeKey);
        });
        next.noticeBaselineReady = true;
        next.seenNoticeIDs = Array.from(seenNoticeIDs).slice(-320);
        return next;
      }

      noticeBlocks.forEach((notice) => {
        const noticeKey = `${notice.id}:${notice.slug || notice.title}`;
        if (seenNoticeIDs.has(noticeKey)) {
          return;
        }

        const notificationID = `announcement:${noticeKey}`;
        if (!notificationIDs.has(notificationID)) {
          const summary = (notice.description || notice.body || "").trim();
          next.items.push({
            id: notificationID,
            kind: "announcement",
            title: `站内公告：${notice.title}`,
            description: summary ? excerpt(summary, 72) : "后台发布了新的站内公告。",
            href: "/",
            createdAt: new Date().toISOString(),
            unread: true,
          });
          notificationIDs.add(notificationID);
        }

        seenNoticeIDs.add(noticeKey);
      });

      next.items = sortAndTrimNotifications(next.items);
      next.seenNoticeIDs = Array.from(seenNoticeIDs).slice(-320);
      return next;
    });
  }, [portalNotices, session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!session?.accessToken || !profileVerified) {
      return;
    }

    let active = true;
    const accessToken = session.accessToken;

    async function pollNotificationEvents(): Promise<void> {
      const [incomingResult, threadsResult] = await Promise.allSettled([
        fetchIncomingFriendRequests(accessToken, { page: 1, pageSize: 60 }),
        fetchMyThreadReplySnapshots(accessToken, { page: 1, pageSize: 60 }),
      ]);
      if (!active) {
        return;
      }

      setNotificationStore((current) => {
        const next: NotificationStore = {
          ...current,
          items: [...current.items],
          seenIncomingRequestIDs: [...current.seenIncomingRequestIDs],
          threadReplySnapshot: { ...current.threadReplySnapshot },
        };
        const seenRequestIDs = new Set(next.seenIncomingRequestIDs);
        const notificationIDs = new Set(next.items.map((item) => item.id));

        if (incomingResult.status === "fulfilled") {
          const pendingIncoming = incomingResult.value.items.filter((request) => request.status === "pending");

          if (!next.friendBaselineReady) {
            pendingIncoming.forEach((request) => {
              seenRequestIDs.add(request.request_id);
            });
            next.friendBaselineReady = true;
          } else {
            pendingIncoming.forEach((request) => {
              if (seenRequestIDs.has(request.request_id)) {
                return;
              }

              const notificationID = `friend-request:${request.request_id}`;
              if (!notificationIDs.has(notificationID)) {
                next.items.push({
                  id: notificationID,
                  kind: "friend_request",
                  title: "收到新的好友申请",
                  description: `@${request.requester_username} 请求添加你为好友。`,
                  href: "/space",
                  createdAt: request.created_at || new Date().toISOString(),
                  unread: true,
                });
                notificationIDs.add(notificationID);
              }
              seenRequestIDs.add(request.request_id);
            });
          }
        }

        if (threadsResult.status === "fulfilled") {
          const ownThreads = threadsResult.value.items;

          if (!next.threadBaselineReady) {
            ownThreads.forEach((thread) => {
              next.threadReplySnapshot[thread.thread_id] = thread.reply_count;
            });
            next.threadBaselineReady = true;
          } else {
            ownThreads.forEach((thread) => {
              const previousReplyCount = next.threadReplySnapshot[thread.thread_id];
              if (typeof previousReplyCount === "number" && thread.reply_count > previousReplyCount) {
                const increasedCount = thread.reply_count - previousReplyCount;
                const notificationID = `forum-reply:${thread.thread_id}:${thread.reply_count}:${thread.last_post_at || ""}`;
                if (!notificationIDs.has(notificationID)) {
                  next.items.push({
                    id: notificationID,
                    kind: "forum_reply",
                    title: "您的帖子有新回复了喵QAQ",
                    description: `《${thread.title}》新增 ${increasedCount} 条回复。`,
                    href: `/forum/threads/${encodeURIComponent(thread.thread_id)}`,
                    createdAt: thread.last_post_at || new Date().toISOString(),
                    unread: true,
                  });
                  notificationIDs.add(notificationID);
                }
              }

              next.threadReplySnapshot[thread.thread_id] = thread.reply_count;
            });
          }
        }

        next.items = sortAndTrimNotifications(next.items);
        next.seenIncomingRequestIDs = Array.from(seenRequestIDs).slice(-240);
        return next;
      });
    }

    void pollNotificationEvents();
    const intervalID = window.setInterval(() => {
      void pollNotificationEvents();
    }, 45000);

    return () => {
      active = false;
      window.clearInterval(intervalID);
    };
  }, [profileVerified, session?.accessToken]);

  const notifications = useMemo(
    () =>
      [...notificationStore.items].sort((left, right) => {
        const leftTime = Date.parse(left.createdAt) || 0;
        const rightTime = Date.parse(right.createdAt) || 0;
        return rightTime - leftTime;
      }),
    [notificationStore.items],
  );

  const unreadCount = useMemo(
    () => notificationStore.items.reduce((count, item) => count + (item.unread ? 1 : 0), 0),
    [notificationStore.items],
  );

  const markNotificationRead = useCallback((notificationID: string) => {
    setNotificationStore((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === notificationID
          ? {
              ...item,
              unread: false,
            }
          : item,
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotificationStore((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.unread
          ? {
              ...item,
              unread: false,
            }
          : item,
      ),
    }));
  }, []);

  return {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  };
}
