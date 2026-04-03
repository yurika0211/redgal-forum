export type RoutePath =
  | "/"
  | "/portal"
  | "/stories"
  | "/forum"
  | "/anonymous"
  | "/admin"
  | "/space"
  | "/gallery";

export const TITLE_BY_ROUTE: Record<RoutePath, string> = {
  "/": "首页总览 | Rubedo Forum",
  "/portal": "社团介绍 | Rubedo Forum",
  "/stories": "文章札记 | Rubedo Forum",
  "/forum": "论坛聊天室 | Rubedo Forum",
  "/anonymous": "匿名板 | Rubedo Forum",
  "/admin": "管理界面 | Rubedo Forum",
  "/space": "个人空间 | Rubedo Forum",
  "/gallery": "展示墙 | Rubedo Forum",
};

export const HEADER_SUMMARY_BY_ROUTE: Record<RoutePath, string> = {
  "/": "首页导览",
  "/portal": "社团介绍",
  "/stories": "文章与随想",
  "/forum": "讨论与留言",
  "/anonymous": "匿名版",
  "/admin": "后台管理",
  "/space": "收藏与空间",
  "/gallery": "展示与归档",
};

export function normalizePath(pathname: string): RoutePath {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (normalized.startsWith("/stories/")) {
    return "/stories";
  }

  if (normalized.startsWith("/forum/threads/")) {
    return "/forum";
  }

  if (normalized.startsWith("/anonymous/threads/")) {
    return "/anonymous";
  }

  switch (normalized) {
    case "/portal":
      return "/portal";
    case "/stories":
      return "/stories";
    case "/forum":
      return "/forum";
    case "/anonymous":
      return "/anonymous";
    case "/admin":
      return "/admin";
    case "/space":
      return "/space";
    case "/gallery":
      return "/gallery";
    default:
      return "/";
  }
}

export function readSelectedArticleID(pathname?: string): string | null {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const match = currentPathname.match(/^\/stories\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readSelectedForumThreadID(pathname?: string, search?: string): string | null {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const currentSearch =
    search ??
    (typeof window !== "undefined" ? window.location.search : "");
  const match = currentPathname.match(/^\/forum\/threads\/([^/]+)$/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  const searchParams = new URLSearchParams(currentSearch);
  const legacyThreadID = searchParams.get("thread");
  return legacyThreadID?.trim() || null;
}

export function readSelectedAnonymousThreadID(pathname?: string): string | null {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const match = currentPathname.match(/^\/anonymous\/threads\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readCurrentPath(): RoutePath {
  if (typeof window === "undefined") {
    return "/";
  }

  return normalizePath(window.location.pathname);
}
