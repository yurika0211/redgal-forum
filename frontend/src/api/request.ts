import type { ListParams } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isApiEnvelopeValue<T>(value: unknown): value is ApiEnvelope<T> {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.ok !== "boolean") {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(value, "data") ||
    Object.prototype.hasOwnProperty.call(value, "error") ||
    Object.prototype.hasOwnProperty.call(value, "request_id")
  );
}

function parseJSONLoose(text: string): unknown {
  const normalized = text.trim().replace(/^\uFEFF/, "");
  if (!normalized) {
    return null;
  }

  const candidates = [normalized];

  const withoutNullPrefix = normalized.replace(/^null\s*(?=[{\[])/i, "");
  if (withoutNullPrefix !== normalized) {
    candidates.push(withoutNullPrefix);
  }

  const firstObjectStart = withoutNullPrefix.indexOf("{");
  const lastObjectEnd = withoutNullPrefix.lastIndexOf("}");
  if (firstObjectStart >= 0 && lastObjectEnd > firstObjectStart) {
    candidates.push(withoutNullPrefix.slice(firstObjectStart, lastObjectEnd + 1));
  }

  const firstArrayStart = withoutNullPrefix.indexOf("[");
  const lastArrayEnd = withoutNullPrefix.lastIndexOf("]");
  if (firstArrayStart >= 0 && lastArrayEnd > firstArrayStart) {
    candidates.push(withoutNullPrefix.slice(firstArrayStart, lastArrayEnd + 1));
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("invalid JSON response");
}

export function withListQuery(path: string, params?: ListParams): string {
  if (!params) {
    return path;
  }

  const searchParams = new URLSearchParams();
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.pageSize) {
    searchParams.set("page_size", String(params.pageSize));
  }
  if (typeof params.q === "string" && params.q.trim()) {
    searchParams.set("q", params.q.trim());
  }

  const suffix = searchParams.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = parseJSONLoose(text);
    } catch (error) {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      throw new Error(
        `Response is not valid JSON: ${error instanceof Error ? error.message : "unknown parse error"}`,
      );
    }
  }

  const envelope = isApiEnvelopeValue<T>(parsed) ? parsed : null;

  if (!response.ok || envelope?.ok === false) {
    if (envelope?.error) {
      throw new Error(envelope.error);
    }

    const compact = text.replace(/\s+/g, " ").trim();
    throw new Error(compact || `Request failed with status ${response.status}`);
  }

  if (envelope) {
    if (!Object.prototype.hasOwnProperty.call(envelope, "data")) {
      throw new Error("Response payload missing data");
    }

    return envelope.data as T;
  }

  if (parsed !== null) {
    return parsed as T;
  }

  throw new Error("Response payload missing data");
}
