import type { SiteGalleryEntry } from "../api";

const STANDARD_DATE_LABEL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MARKDOWN_HEADING_PATTERN = /^(#{1,4})\s+(.+)$/;

export interface MarkdownHeading {
  level: number;
  title: string;
  anchorID: string;
}

interface ExtractMarkdownHeadingsOptions {
  maxCount?: number;
  maxLevel?: number;
}

function createHeadingSlug(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "section";
}

export function extractMarkdownHeadings(
  content: string,
  options: ExtractMarkdownHeadingsOptions = {},
): MarkdownHeading[] {
  const normalized = content.replace(/\r/g, "").trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const slugCounter = new Map<string, number>();
  const maxCount = options.maxCount ?? Number.POSITIVE_INFINITY;
  const maxLevel = options.maxLevel ?? 4;
  const headings: MarkdownHeading[] = [];

  for (const block of blocks) {
    if (headings.length >= maxCount) {
      break;
    }

    const headingMatch = block.match(MARKDOWN_HEADING_PATTERN);
    if (!headingMatch) {
      continue;
    }

    const level = headingMatch[1].length;
    if (level > maxLevel) {
      continue;
    }

    const title = headingMatch[2].trim();
    if (!title) {
      continue;
    }

    const baseSlug = createHeadingSlug(title);
    const currentCount = slugCounter.get(baseSlug) ?? 0;
    slugCounter.set(baseSlug, currentCount + 1);
    const suffix = currentCount > 0 ? `-${String(currentCount + 1)}` : "";

    headings.push({
      level,
      title,
      anchorID: `section-${baseSlug}${suffix}`,
    });
  }

  return headings;
}

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
      return "仅成员可见";
    case "private":
      return "仅自己可见";
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

export function formatPublishedAgo(value: unknown, nowTimeMs = Date.now()): string {
  if (typeof value !== "string" || !value.trim()) {
    return "发布时间未知";
  }

  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) {
    return "发布时间未知";
  }

  const diffMs = nowTimeMs - publishedAt.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isPast = diffMs >= 0;

  if (absDiffMs < 60_000) {
    return isPast ? "刚刚发布" : "即将发布";
  }

  const units = [
    { limit: 3_600_000, size: 60_000, label: "分钟" },
    { limit: 86_400_000, size: 3_600_000, label: "小时" },
    { limit: 604_800_000, size: 86_400_000, label: "天" },
    { limit: 2_592_000_000, size: 604_800_000, label: "周" },
    { limit: 31_536_000_000, size: 2_592_000_000, label: "个月" },
    { limit: Number.POSITIVE_INFINITY, size: 31_536_000_000, label: "年" },
  ];

  const target = units.find((unit) => absDiffMs < unit.limit) || units[units.length - 1];
  const amount = Math.max(1, Math.floor(absDiffMs / target.size));
  return isPast ? `${amount}${target.label}前发布` : `${amount}${target.label}后发布`;
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
    const normalized = error.message.trim();
    const lowercase = normalized.toLowerCase();

    if (
      lowercase.includes("sql: no rows in result set") ||
      lowercase.includes("no rows in result set")
    ) {
      return "未找到对应用户或公开数据";
    }

    return normalized;
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

export function parseStandardDateLabel(value: string): number | null {
  const normalized = value.trim();
  const match = normalized.match(STANDARD_DATE_LABEL_PATTERN);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed.getTime();
}

export function isStandardDateLabel(value: string): boolean {
  return parseStandardDateLabel(value) !== null;
}

export function isAuthFailure(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("401")
  );
}
