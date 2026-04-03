const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginPayload {
  account: string;
  password: string;
}

export interface HealthData {
  app: string;
  env: string;
  services: Record<string, boolean>;
  service_details?: Record<
    string,
    {
      configured: boolean;
      reachable: boolean;
      error?: string;
    }
  >;
  modules: string[];
}

export interface Profile {
  user_id: string;
  username: string;
  nickname: string;
  signature: string;
  bio: string;
  avatar_url: string;
  status?: string;
  verified?: boolean;
  roles?: string[];
  collections: Record<string, number>;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  visibility: string;
  author: string;
  tags: string[];
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  board: string;
  anonymous: boolean;
  author: string;
  tags: string[];
  reply_count: number;
}

export interface SiteContentBlock {
  id: string;
  block_type:
    | "hero_object"
    | "portal_page"
    | "portal_highlight"
    | "portal_pillar"
    | "portal_activity"
    | "portal_join_step";
  slug: string;
  path?: string;
  kicker?: string;
  label?: string;
  title: string;
  description?: string;
  body?: string;
  sort_order: number;
  active: boolean;
}

export interface SiteGalleryEntry {
  id: string;
  entry_type: "album" | "polaroid" | "paper" | "timeline" | "track";
  slug: string;
  title: string;
  subtitle?: string;
  body?: string;
  extra_text?: string;
  sort_order: number;
  active: boolean;
}

export interface SiteContent {
  hero_objects: SiteContentBlock[];
  portal_pages: SiteContentBlock[];
  portal_highlights: SiteContentBlock[];
  portal_pillars: SiteContentBlock[];
  portal_activities: SiteContentBlock[];
  portal_join_steps: SiteContentBlock[];
  gallery_entries: SiteGalleryEntry[];
}

interface SessionResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface ApiEnvelope<T> {
  ok: boolean;
  request_id: string;
  data?: T;
  error?: string;
}

interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  token?: string;
  headers?: HeadersInit;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const requestHeaders = new Headers(headers || {});

  requestHeaders.set("Accept", "application/json");

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "data")) {
    throw new Error("Response payload missing data");
  }

  return payload.data as T;
}

export function fetchHealth(token?: string): Promise<HealthData> {
  return request<HealthData>("/health", { token });
}

export async function login(body: LoginPayload): Promise<Session> {
  const session = await request<SessionResponse>("/auth/login", {
    method: "POST",
    body,
  });

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  };
}

export function fetchMyProfile(token: string): Promise<Profile> {
  return request<Profile>("/users/me", { token });
}

export function fetchPublicProfile(username: string): Promise<Profile> {
  return request<Profile>(`/users/${encodeURIComponent(username)}`);
}

export function fetchArticles(token?: string): Promise<Article[]> {
  return request<Article[]>("/articles", { token });
}

export function fetchThreads(token?: string): Promise<ForumThread[]> {
  return request<ForumThread[]>("/forum/threads", { token });
}

export function fetchSiteContent(): Promise<SiteContent> {
  return request<SiteContent>("/site/content");
}
