import { describe, expect, it } from "vitest";
import {
  normalizePath,
  readSelectedAnonymousThreadID,
  readSelectedArticleID,
  readSelectedForumThreadID,
} from "./routes";

describe("routes helpers", () => {
  it("normalizes detail paths to list routes", () => {
    expect(normalizePath("/stories/123")).toBe("/stories");
    expect(normalizePath("/forum/threads/42")).toBe("/forum");
    expect(normalizePath("/anonymous/threads/7")).toBe("/anonymous");
  });

  it("extracts selected detail identifiers", () => {
    expect(readSelectedArticleID("/stories/123")).toBe("123");
    expect(readSelectedForumThreadID("/forum/threads/42")).toBe("42");
    expect(readSelectedAnonymousThreadID("/anonymous/threads/7")).toBe("7");
  });

  it("supports legacy forum thread query parameter", () => {
    expect(readSelectedForumThreadID("/forum", "?thread=abc")).toBe("abc");
  });
});
