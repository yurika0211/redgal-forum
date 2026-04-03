import type { ForumExpActionLog, ForumReply } from "../api";

export interface ForumReplyNode {
  reply: ForumReply;
  children: ForumReplyNode[];
  descendantCount: number;
}

export function formatForumFloor(floorNo: number): string {
  return `${floorNo + 1}楼`;
}

export function buildForumReplyTree(replies: ForumReply[]): ForumReplyNode[] {
  const nodes = new Map<string, ForumReplyNode>();
  const roots: ForumReplyNode[] = [];

  [...replies]
    .sort((left, right) => left.floor_no - right.floor_no)
    .forEach((reply) => {
      nodes.set(reply.id, {
        reply,
        children: [],
        descendantCount: 0,
      });
    });

  nodes.forEach((node) => {
    const parentID = node.reply.parent_id;
    if (parentID && nodes.has(parentID)) {
      nodes.get(parentID)?.children.push(node);
      return;
    }
    roots.push(node);
  });

  function attachCounts(node: ForumReplyNode): number {
    let total = node.children.length;
    node.children.forEach((child) => {
      total += attachCounts(child);
    });
    node.descendantCount = total;
    return total;
  }

  roots.forEach((node) => {
    attachCounts(node);
  });

  return roots;
}

export function forumActionLabel(actionType: ForumExpActionLog["action_type"]): string {
  switch (actionType) {
    case "SIGN_IN":
      return "每日签到";
    case "POST_THREAD":
      return "发布主题";
    case "REPLY":
      return "回复主题";
    default:
      return actionType;
  }
}
