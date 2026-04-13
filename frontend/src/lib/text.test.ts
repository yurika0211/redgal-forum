import { describe, expect, it } from "vitest";
import {
  createAnonymousThreadTitle,
  excerpt,
  extractMarkdownHeadings,
  extractMarkdownPreviewImage,
  formatPublishedAgo,
  galleryEntryTypeLabel,
  isStandardDateLabel,
  normalizeVisibilityLabel,
  parseLines,
  parseStandardDateLabel,
  parseTags,
  toErrorMessage,
} from "./text";

describe("text helpers", () => {
  it("truncates long text with ellipsis", () => {
    expect(excerpt("1234567890", 5)).toBe("12345...");
  });

  it("creates anonymous thread titles from content", () => {
    expect(createAnonymousThreadTitle("今天在食堂遇到了神奇剧情", "闲聊")).toBe(
      "闲聊 · 今天在食堂遇到了神奇剧情",
    );
    expect(createAnonymousThreadTitle("   ", "情报")).toBe("情报 · 新的匿名留言");
  });

  it("parses lines and tags", () => {
    expect(parseLines("a\n\nb\n")).toEqual(["a", "b"]);
    expect(parseTags("站台, 慢热\n短札")).toEqual(["站台", "慢热", "短札"]);
  });

  it("validates standard date labels", () => {
    expect(isStandardDateLabel("2026-04-06")).toBe(true);
    expect(isStandardDateLabel(" 2026-04-06 ")).toBe(true);
    expect(isStandardDateLabel("2026/04/06")).toBe(false);
    expect(isStandardDateLabel("2026-02-30")).toBe(false);
    expect(parseStandardDateLabel("2026-04-06")).not.toBeNull();
  });

  it("extracts markdown and html preview images", () => {
    expect(extractMarkdownPreviewImage("![](https://example.com/a.png)")).toBe(
      "https://example.com/a.png",
    );
    expect(extractMarkdownPreviewImage('<img src="https://example.com/b.png" />')).toBe(
      "https://example.com/b.png",
    );
  });

  it("localizes visibility and gallery labels", () => {
    expect(normalizeVisibilityLabel("members")).toBe("仅成员可见");
    expect(galleryEntryTypeLabel("timeline")).toBe("时间轴");
  });

  it("formats publish time as relative labels", () => {
    const nowTimeMs = Date.parse("2026-04-10T12:00:00Z");
    expect(formatPublishedAgo("2026-04-10T11:30:00Z", nowTimeMs)).toBe("30分钟前发布");
    expect(formatPublishedAgo("2026-04-09T12:00:00Z", nowTimeMs)).toBe("1天前发布");
    expect(formatPublishedAgo("2026-04-10T11:59:30Z", nowTimeMs)).toBe("刚刚发布");
    expect(formatPublishedAgo("2026-04-10T12:00:30Z", nowTimeMs)).toBe("即将发布");
    expect(formatPublishedAgo("", nowTimeMs)).toBe("发布时间未知");
  });

  it("extracts heading anchors with duplicate handling", () => {
    expect(
      extractMarkdownHeadings("# Main\n\n## Intro\n\n## Intro\n\n#### Deep", {
        maxCount: 10,
      }),
    ).toEqual([
      { level: 1, title: "Main", anchorID: "section-main" },
      { level: 2, title: "Intro", anchorID: "section-intro" },
      { level: 2, title: "Intro", anchorID: "section-intro-2" },
      { level: 4, title: "Deep", anchorID: "section-deep" },
    ]);
  });

  it("normalizes internal sql no rows errors to user-friendly text", () => {
    expect(toErrorMessage(new Error("sql: no rows in result set"))).toBe("未找到对应用户或公开数据");
  });
});
