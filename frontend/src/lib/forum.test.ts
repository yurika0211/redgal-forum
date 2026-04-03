import { describe, expect, it } from "vitest";
import { buildForumReplyTree, forumActionLabel, formatForumFloor } from "./forum";

describe("forum helpers", () => {
  it("formats floor labels", () => {
    expect(formatForumFloor(0)).toBe("1楼");
    expect(formatForumFloor(9)).toBe("10楼");
  });

  it("builds a nested reply tree and counts descendants", () => {
    const tree = buildForumReplyTree([
      {
        id: "1",
        thread_id: "t",
        floor_no: 1,
        content: "root",
        author: "a",
        anonymous: false,
        created_at: "2026-04-04T00:00:00Z",
      },
      {
        id: "2",
        thread_id: "t",
        floor_no: 2,
        parent_id: "1",
        content: "child",
        author: "b",
        anonymous: false,
        created_at: "2026-04-04T00:01:00Z",
      },
      {
        id: "3",
        thread_id: "t",
        floor_no: 3,
        parent_id: "2",
        content: "grandchild",
        author: "c",
        anonymous: false,
        created_at: "2026-04-04T00:02:00Z",
      },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].descendantCount).toBe(2);
  });

  it("maps forum action labels", () => {
    expect(forumActionLabel("SIGN_IN")).toBe("每日签到");
    expect(forumActionLabel("POST_THREAD")).toBe("发布主题");
    expect(forumActionLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});
