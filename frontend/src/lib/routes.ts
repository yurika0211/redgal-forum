export type RoutePath =
  | "/"
  | "/stories"
  | "/forum"
  | "/anonymous"
  | "/admin"
  | "/space"
  | "/gallery";

export const TITLE_BY_ROUTE: Record<RoutePath, string> = {
  "/": "首页总览 | Rubedo Forum",
  "/stories": "专栏 | Rubedo Forum",
  "/forum": "讨论板 | Rubedo Forum",
  "/anonymous": "树洞 | Rubedo Forum",
  "/admin": "管理后台 | Rubedo Forum",
  "/space": "个人空间 | Rubedo Forum",
  "/gallery": "展示墙 | Rubedo Forum",
};

export const HEADER_SUMMARY_BY_ROUTE: Record<RoutePath, string> = {
  "/": "首页导览",
  "/stories": "专栏内容",
  "/forum": "讨论板",
  "/anonymous": "匿名频道",
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

  if (readForumEditorMode(normalized)) {
    return "/forum";
  }

  if (normalized.startsWith("/anonymous/threads/")) {
    return "/anonymous";
  }

  if (normalized.startsWith("/users/")) {
    return "/space";
  }

  switch (normalized) {
    case "/portal":
      return "/";
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
  if (readStoriesEditorMode(currentPathname)) {
    return null;
  }
  const match = currentPathname.match(/^\/stories\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readStoriesEditorMode(pathname?: string): boolean {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const normalized = currentPathname.replace(/\/+$/, "") || "/";
  return normalized === "/stories/editor";
}

export function readSelectedForumThreadID(pathname?: string, search?: string): string | null {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const currentSearch =
    search ??
    (typeof window !== "undefined" ? window.location.search : "");
  if (readForumEditorMode(currentPathname)) {
    return null;
  }

  const match = currentPathname.match(/^\/forum\/threads\/([^/]+)$/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  const searchParams = new URLSearchParams(currentSearch);
  const legacyThreadID = searchParams.get("thread");
  return legacyThreadID?.trim() || null;
}

export function readForumEditorMode(pathname?: string): boolean {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const normalized = currentPathname.replace(/\/+$/, "") || "/";
  return normalized === "/forum/editor";
}

export function readSelectedAnonymousThreadID(pathname?: string): string | null {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const match = currentPathname.match(/^\/anonymous\/threads\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readPublicProfileUsername(pathname?: string): string | null {
  const currentPathname =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  const match = currentPathname.match(/^\/users\/([^/]+)$/);
  if (!match?.[1]) {
    return null;
  }

  const username = decodeURIComponent(match[1]).trim();
  return username ? username : null;
}

export function readCurrentPath(): RoutePath {
  if (typeof window === "undefined") {
    return "/";
  }

  return normalizePath(window.location.pathname);
}
