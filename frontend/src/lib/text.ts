import type { SiteGalleryEntry } from "../api";

export function excerpt(value: string, maxLength = 160): string {
  const normalized = value.trim();

  if (!normalized) {
    return "内容暂时为空。";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function createAnonymousThreadTitle(
  content: string,
  topic = "闲聊",
): string {
  const plain = content
    .replace(/!\[[^\]]*]\(([^)]+)\)/g, "[图片]")
    .replace(/[`#>*_[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) {
    return `${topic} · 新的匿名留言`;
  }

  const sliced =
    plain.length > 18 ? `${plain.slice(0, 18).trimEnd()}...` : plain;
  return `${topic} · ${sliced}`;
}

export function normalizeVisibilityLabel(value: string): string {
  switch (value) {
    case "public":
      return "公开";
    case "member":
    case "members":
      return "成员";
    case "private":
      return "私有";
    default:
      return value;
  }
}

export function galleryEntryTypeLabel(value: SiteGalleryEntry["entry_type"]): string {
  switch (value) {
    case "album":
      return "相册";
    case "polaroid":
      return "拍立得";
    case "paper":
      return "旧纸";
    case "timeline":
      return "时间轴";
    case "track":
      return "留声机";
    default:
      return value;
  }
}

export function formatUpdatedAt(value: string): string {
  if (!value) {
    return "尚未同步";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  if (!value) {
    return "时间待定";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function extractMarkdownPreviewImage(value: string): string | null {
  const markdownMatch = value.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  const htmlMatch = value.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  return htmlMatch?.[1] || null;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请求失败";
}

export function parseLines(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isAuthFailure(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("401")
  );
}
