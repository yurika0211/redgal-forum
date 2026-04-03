import type { Session } from "../api";

const SESSION_STORAGE_KEY = "rubedo.frontend.session";

export function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Session>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    typeof candidate.expiresIn === "number"
  );
}

export function readStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isSession(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed stored session and clear it below.
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  return null;
}

export function persistSession(session: Session | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}
