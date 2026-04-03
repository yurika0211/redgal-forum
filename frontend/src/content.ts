export const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/portal", label: "站内入口" },
  { href: "/stories", label: "文章札记" },
  { href: "/forum", label: "论坛聊天室" },
  { href: "/space", label: "个人空间" },
  { href: "/gallery", label: "展示墙" },
] as const;

export const DEFAULT_PUBLIC_PROFILE_USERNAME = "rubedo_room";

export const SPACE_SHOWCASE_GROUPS = [
  {
    id: "anime",
    label: "动画",
    items: [
      {
        id: "anime-1",
        title: "夜色站台",
        subtitle: "情绪向作品集",
        note: "适合存放追番札记、角色印象和截图。",
        image: "/bg1.png",
      },
      {
        id: "anime-2",
        title: "雨幕回廊",
        subtitle: "慢热系收藏",
        note: "更适合偏气氛、偏留白的影像记录。",
        image: "/bg2.png",
      },
      {
        id: "anime-3",
        title: "回声教室",
        subtitle: "场景收藏",
        note: "按场景、对白、构图去分类归档。",
        image: "/bg1.png",
      },
    ],
  },
  {
    id: "books",
    label: "书籍",
    items: [
      {
        id: "book-1",
        title: "剧情拆解手册",
        subtitle: "读后笔记",
        note: "适合收纳分析型阅读记录和引用段落。",
        image: "/bg2.png",
      },
      {
        id: "book-2",
        title: "对白与停顿",
        subtitle: "写作摘录",
        note: "把最想留下的句子折成一排书脊。",
        image: "/bg1.png",
      },
      {
        id: "book-3",
        title: "夜航归档册",
        subtitle: "纸本摘抄",
        note: "和时间胶囊、旧纸模块相互呼应。",
        image: "/bg2.png",
      },
    ],
  },
  {
    id: "games",
    label: "游戏",
    items: [
      {
        id: "game-1",
        title: "绯月回廊",
        subtitle: "Galgame 收藏",
        note: "可和 Bangumi 导入结果一起整理。",
        image: "/bg1.png",
      },
      {
        id: "game-2",
        title: "站台尽头的风",
        subtitle: "已玩作品",
        note: "按已玩、想玩、搁置做分层归档。",
        image: "/bg2.png",
      },
      {
        id: "game-3",
        title: "玻璃雨与回声",
        subtitle: "愿望单",
        note: "适合做封面墙和状态标签混排。",
        image: "/bg1.png",
      },
    ],
  },
] as const;

export const SPACE_FRIENDS = [
  {
    id: "friend-1",
    name: "纸窗旅人",
    status: "在线",
    note: "常在剧情讨论区出没，偏爱慢热叙事。",
  },
  {
    id: "friend-2",
    name: "留白观察者",
    status: "离线",
    note: "喜欢整理收藏架和空间展示方式。",
  },
  {
    id: "friend-3",
    name: "夜航编辑部",
    status: "忙碌",
    note: "经常写札记，也会参与共赏会整理。",
  },
] as const;

export const SPACE_TIME_CAPSULES = [
  {
    id: "capsule-1",
    title: "大一跨年夜",
    time: "2024.12",
    body: "把那次深夜闪闪发光的截图、群像和留言封进一个时间胶囊里。",
  },
  {
    id: "capsule-2",
    title: "第一次共赏会",
    time: "2025.03",
    body: "从角色视角和对白拆解开始，第一次感觉社团真的有了自己的讨论节奏。",
  },
  {
    id: "capsule-3",
    title: "展墙初次成型",
    time: "2025.11",
    body: "把图片、旧纸、拍立得和音乐放到同一面墙上的那天，空间终于像空间了。",
  },
] as const;
