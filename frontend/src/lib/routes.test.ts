import { describe, expect, it } from "vitest";
import {
  normalizePath,
  readForumEditorMode,
  readPublicProfileUsername,
  readSelectedAnonymousThreadID,
  readSelectedArticleID,
  readSelectedForumThreadID,
  readStoriesEditorMode,
} from "./routes";

describe("routes helpers", () => {
  it("normalizes detail paths to list routes", () => {
    expect(normalizePath("/stories/123")).toBe("/stories");
    expect(normalizePath("/forum/threads/42")).toBe("/forum");
    expect(normalizePath("/forum/editor")).toBe("/forum");
    expect(normalizePath("/anonymous/threads/7")).toBe("/anonymous");
    expect(normalizePath("/users/rubedo_room")).toBe("/space");
    expect(normalizePath("/login")).toBe("/login");
    expect(normalizePath("/portal")).toBe("/");
  });

  it("extracts selected detail identifiers", () => {
    expect(readSelectedArticleID("/stories/123")).toBe("123");
    expect(readSelectedArticleID("/stories/editor")).toBeNull();
    expect(readSelectedForumThreadID("/forum/threads/42")).toBe("42");
    expect(readSelectedForumThreadID("/forum/editor")).toBeNull();
    expect(readSelectedAnonymousThreadID("/anonymous/threads/7")).toBe("7");
  });

  it("detects stories editor mode", () => {
    expect(readStoriesEditorMode("/stories/editor")).toBe(true);
    expect(readStoriesEditorMode("/stories/123")).toBe(false);
  });

  it("detects forum editor mode", () => {
    expect(readForumEditorMode("/forum/editor")).toBe(true);
    expect(readForumEditorMode("/forum/threads/42")).toBe(false);
  });

  it("supports legacy forum thread query parameter", () => {
    expect(readSelectedForumThreadID("/forum", "?thread=abc")).toBe("abc");
  });

  it("extracts public profile username from user paths", () => {
    expect(readPublicProfileUsername("/users/rubedo_room")).toBe("rubedo_room");
    expect(readPublicProfileUsername("/space")).toBeNull();
  });
});
