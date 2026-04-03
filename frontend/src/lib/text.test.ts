import { describe, expect, it } from "vitest";
import {
  excerpt,
  extractMarkdownPreviewImage,
  galleryEntryTypeLabel,
  normalizeVisibilityLabel,
  parseLines,
  parseTags,
} from "./text";

describe("text helpers", () => {
  it("truncates long text with ellipsis", () => {
    expect(excerpt("1234567890", 5)).toBe("12345...");
  });

  it("parses lines and tags", () => {
    expect(parseLines("a\n\nb\n")).toEqual(["a", "b"]);
    expect(parseTags("站台, 慢热\n短札")).toEqual(["站台", "慢热", "短札"]);
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
    expect(normalizeVisibilityLabel("members")).toBe("成员");
    expect(galleryEntryTypeLabel("timeline")).toBe("时间轴");
  });
});
