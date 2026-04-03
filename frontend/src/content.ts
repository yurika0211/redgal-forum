export const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/portal", label: "站内入口" },
  { href: "/stories", label: "文章札记" },
  { href: "/forum", label: "论坛聊天室" },
  { href: "/space", label: "个人空间" },
  { href: "/gallery", label: "展示墙" },
] as const;

export const SOCIETY_HIGHLIGHTS = [
  {
    id: "highlight-1",
    kicker: "社团定位",
    title: "以 Galgame、叙事与视觉表达为核心的同好社团。",
    body: "我们把文字、音乐、美术、配音、讨论和策展放在同一条线上，让喜欢故事的人能在同一个地方相遇。",
  },
  {
    id: "highlight-2",
    kicker: "日常氛围",
    title: "不是只聊作品，也一起做展示、写札记、办分享。",
    body: "首页承担社团门面，站内的文章区、论坛区、展示墙和个人空间则是社团活动的延展场景。",
  },
  {
    id: "highlight-3",
    kicker: "成员构成",
    title: "欢迎写手、画手、配音、剪辑、策展和单纯热爱剧情的人。",
    body: "不要求每个人都产出内容，但希望每个人都能带来自己最真切的兴趣方向。",
  },
] as const;

export const SOCIETY_PILLARS = [
  {
    id: "pillar-1",
    title: "作品赏析",
    description: "围绕 Galgame、AVG 和相关叙事作品做主题讨论、慢热作品导读与角色分析。",
  },
  {
    id: "pillar-2",
    title: "内容共创",
    description: "支持成员写短札、做展板、整理专题页，把零散灵感做成能被看见的社团成果。",
  },
  {
    id: "pillar-3",
    title: "活动陈列",
    description: "把相册、拍立得、旧纸、时间轴和留声机这类展示方式融入社团活动发布与归档。",
  },
] as const;

export const SOCIETY_ACTIVITIES = [
  {
    id: "activity-1",
    label: "每周",
    title: "夜读与共赏会",
    description: "围绕某一部作品的章节、路线或主题做小范围共读，再把讨论整理成社团札记。",
  },
  {
    id: "activity-2",
    label: "专题",
    title: "剧情拆解工作坊",
    description: "从开场、冲突、转折和结尾几条线去拆一部作品，看它如何建立情绪和节奏。",
  },
  {
    id: "activity-3",
    label: "展示",
    title: "展墙与图像策展",
    description: "把截图、封面、短句、场景构图和音乐卡片排成一面真正有叙述感的展示墙。",
  },
  {
    id: "activity-4",
    label: "社交",
    title: "匿名聊天室与主题串",
    description: "给轻量讨论留出口，也给深度帖子留位置，让成员可以按自己舒服的方式参与。",
  },
] as const;

export const SOCIETY_JOIN_STEPS = [
  {
    id: "join-1",
    step: "01",
    title: "先逛一圈社团页面",
    description: "从首页、文章札记、论坛聊天室和展示墙里感受社团目前的内容方向。",
  },
  {
    id: "join-2",
    step: "02",
    title: "带着兴趣点进组",
    description: "你可以偏剧情、偏美术、偏配音，也可以只是想找一群愿意认真聊作品的人。",
  },
  {
    id: "join-3",
    step: "03",
    title: "参加一次共赏或共创",
    description: "从最轻的一次参与开始，让社团先认识你的节奏，再慢慢展开更多合作。",
  },
] as const;

export interface StoryEntry {
  id: string;
  title: string;
  summary: string;
  content: string;
  visibility: string;
  author: string;
  tags: string[];
}

export interface DiscussionThreadEntry {
  id: string;
  title: string;
  content: string;
  board: string;
  anonymous: boolean;
  author: string;
  tags: string[];
  reply_count: number;
}

export interface SpaceProfilePreview {
  username: string;
  nickname: string;
  signature: string;
  bio: string;
  collections: Record<string, number>;
}

export const STORY_ENTRIES: StoryEntry[] = [
  {
    id: "story-1",
    title: "夏夜电车与站台尽头的风",
    summary: "把一段轻声慢语的故事写成短札，保留人物靠近又退开的气味。",
    content:
      "有些作品最动人的地方，不在高潮，而在人物走到站台边缘时那一点点犹豫。风吹过来，话没有说满，读者却已经听懂了。",
    visibility: "公开",
    author: "夜航编辑部",
    tags: ["站台", "慢热", "短札"],
  },
  {
    id: "story-2",
    title: "旧校舍里的回声",
    summary: "回忆型叙事更适合留出空白，让场景和声音先落在读者心里。",
    content:
      "木地板的回音、风吹窗框的细碎声、走廊尽头忽然亮起的灯，这些都比直白解释更能让一部作品长久停留。",
    visibility: "公开",
    author: "归档室",
    tags: ["校园", "回忆", "氛围"],
  },
  {
    id: "story-3",
    title: "角色真正开口之前",
    summary: "一篇关于对白节奏的随想，讨论沉默在故事里到底能留下什么。",
    content:
      "不是每段关系都靠台词推进。真正有效的句子往往很短，甚至只是一句没有说完的话，让读者自己补上呼吸和目光。",
    visibility: "公开",
    author: "观测者",
    tags: ["对白", "角色", "节奏"],
  },
];

export const THREAD_ENTRIES: DiscussionThreadEntry[] = [
  {
    id: "thread-1",
    title: "慢热作品到底该怎样开场才不劝退？",
    content:
      "最近重看几部前期信息密度很低的作品，反而发现真正抓人的不是反转，而是气氛和人物关系的先后铺垫。",
    board: "剧情讨论",
    anonymous: false,
    author: "纸窗旅人",
    tags: ["开场", "叙事", "慢热"],
    reply_count: 14,
  },
  {
    id: "thread-2",
    title: "有没有那种一看就想截图收藏的场景构图？",
    content:
      "不是纯壁纸向，而是那种一眼就能感到故事情绪压过来的画面。想整理一串适合做展示墙灵感的场景。",
    board: "美术交流",
    anonymous: true,
    author: "匿名旅人",
    tags: ["构图", "截图", "美术"],
    reply_count: 9,
  },
  {
    id: "thread-3",
    title: "你最喜欢哪种个人空间陈列方式？",
    content:
      "是按时间线排开，还是按主题做成抽屉式收藏？最近在想论坛里的个人空间应该更像房间还是更像档案柜。",
    board: "站内想法",
    anonymous: false,
    author: "留白观察者",
    tags: ["空间", "收藏", "设计"],
    reply_count: 6,
  },
];

export const SPACE_PROFILE_PREVIEW: SpaceProfilePreview = {
  username: "rubedo-room",
  nickname: "夜色收藏室",
  signature: "把喜欢的句子、图像和夜晚都慢慢归档。",
  bio: "个人空间更像一间安静的小房间，不急着展示全部内容，只把真正舍不得丢掉的片段留下来。",
  collections: {
    游戏: 12,
    文章: 18,
    图片: 27,
    札记: 9,
  },
};

export const PORTAL_PAGES = [
  {
    href: "/stories",
    kicker: "文章札记",
    title: "公开文章与随想",
    description: "把前台文章、专题标签和短篇感悟收束到一条更适合浏览的内容流里。",
  },
  {
    href: "/forum",
    kicker: "论坛交流",
    title: "论坛讨论与匿名聊天室",
    description: "保留讨论串结构，同时给匿名即时聊天一个更轻、更松弛的入口。",
  },
  {
    href: "/space",
    kicker: "个人空间",
    title: "用户个人空间",
    description: "把个人资料、收藏统计和带情绪的空间陈列集中到一个独立页。",
  },
  {
    href: "/gallery",
    kicker: "展示陈列",
    title: "相册与留声机展示墙",
    description: "相册、拍立得、旧纸、时间轴和留声机以策展式布局并列展开。",
  },
] as const;

export const HERO_OBJECTS = [
  {
    id: "record",
    label: "留声",
    title: "留声机",
    note: "把氛围和声音感先挂在首页。",
  },
  {
    id: "letter",
    label: "信笺",
    title: "旧信封",
    note: "给感悟区和回信感留一个入口。",
  },
  {
    id: "polaroid",
    label: "拍立得",
    title: "拍立得",
    note: "把碎片式图像和短句收进同一张纸片。",
  },
  {
    id: "clock",
    label: "时间",
    title: "时间轴",
    note: "让旧作、新帖和记忆节点排成线。",
  },
] as const;

export const REFLECTION_ENTRIES = [
  {
    id: "reflection-1",
    title: "风从站台吹回来了",
    mood: "夜读",
    stamp: "00:17",
    body: "把讨论串里最轻的一句话摘出来，像把票根夹进书页。第二天再翻开，人物的呼吸还在。",
    tags: ["短笺", "值夜"],
  },
  {
    id: "reflection-2",
    title: "关于慢热作品的耐心",
    mood: "观察",
    stamp: "08:42",
    body: "不是所有故事都需要立刻爆炸。有些线索像潮湿木头，必须等火真正吃进去，声音才会变深。",
    tags: ["连载感悟", "叙事"],
  },
  {
    id: "reflection-3",
    title: "角色说话的留白",
    mood: "旁白",
    stamp: "19:26",
    body: "真正难忘的对白不一定字多，往往是句末那半秒停顿，让读者自己把没说完的话补完。",
    tags: ["对白", "角色"],
  },
];

export const CHATROOM_SEED = [
  {
    id: "chat-1",
    alias: "匿名旅人 01",
    mood: "耳语",
    stamp: "21:08",
    body: "今晚谁在补慢热系推理作？想找一部前两章稳、后面突然收紧的。",
  },
  {
    id: "chat-2",
    alias: "匿名旅人 07",
    mood: "弹幕",
    stamp: "21:11",
    body: "我更想看感情线压得住的。最近好几部设定很猛，但人物开口像在背台本。",
  },
  {
    id: "chat-3",
    alias: "匿名旅人 12",
    mood: "回声",
    stamp: "21:16",
    body: "论坛那条剧情分析贴挺细的，建议和试玩版一起看，能感受到作者埋线的密度。",
  },
  {
    id: "chat-4",
    alias: "匿名旅人 03",
    mood: "留声",
    stamp: "21:22",
    body: "匿名聊天室先当深夜放映室也不错，大家扔一句感想，不需要整理成长评。",
  },
] as const;

export const SPACE_MEMORIES = [
  {
    id: "memory-1",
    title: "今日角落",
    description: "把刚读完的一句话、截图和标签暂时堆在同一个抽屉里，方便回看。",
  },
  {
    id: "memory-2",
    title: "收藏书架",
    description: "游戏、文章、帖子和图片都能回到个人空间，不再散落在不同入口。",
  },
  {
    id: "memory-3",
    title: "时间刻痕",
    description: "浏览记录和作品节点像胶片一样排开，让个人空间更像长期档案柜。",
  },
] as const;

export const ALBUM_ENTRIES = [
  {
    id: "album-1",
    title: "夏夜公园",
    caption: "适合挂长图、封面和同主题多图编排。",
    accent: "橙灯",
  },
  {
    id: "album-2",
    title: "终电之前",
    caption: "一组图可以像章节卡片一样依次展开，而不是孤立平铺。",
    accent: "蓝站台",
  },
  {
    id: "album-3",
    title: "雨后的窗边",
    caption: "相册区更适合做整套视觉叙述，保留同一时期的情绪密度。",
    accent: "灰银",
  },
] as const;

export const POLAROID_ENTRIES = [
  {
    id: "polaroid-1",
    title: "拍立得 01",
    note: "给瞬时心情留一个更轻的展示方式，像贴在墙上的即时便签。",
    stamp: "Sat 23:14",
  },
  {
    id: "polaroid-2",
    title: "拍立得 02",
    note: "适合角色台词、通关感想和单张插画，不需要完整长文承接。",
    stamp: "Sun 10:08",
  },
  {
    id: "polaroid-3",
    title: "拍立得 03",
    note: "可以混排手写感、日期戳和简短说明，强化收藏物件的质感。",
    stamp: "Tue 18:42",
  },
] as const;

export const PAPER_ENTRIES = [
  {
    id: "paper-1",
    title: "旧纸札记",
    body: "把长评论里舍不得删的边角话放到旧纸区，像夹在档案盒里的补充说明。",
    signature: "编辑台旁注",
  },
  {
    id: "paper-2",
    title: "未寄出的信",
    body: "适合写给角色、写给过去的自己，或者写给某个已经散场的讨论夜晚。",
    signature: "无投递地址",
  },
  {
    id: "paper-3",
    title: "折角页",
    body: "视觉上偏暖、偏旧，可以承接有年代感的文本和带折痕的回忆。",
    signature: "纸张微黄",
  },
] as const;

export const TIMELINE_ENTRIES = [
  {
    id: "timeline-1",
    year: "2023",
    title: "最初的文章流",
    summary: "从单纯的文章列表开始，先把内容生产入口搭起来。",
  },
  {
    id: "timeline-2",
    year: "2024",
    title: "论坛讨论加入主站",
    summary: "讨论串成为作品周边交流的主阵地，用户开始沉淀标签化话题。",
  },
  {
    id: "timeline-3",
    year: "2025",
    title: "个人收藏意识增强",
    summary: "用户不再只看内容，也希望把喜欢的图、句子和帖子带回自己的空间。",
  },
  {
    id: "timeline-4",
    year: "2026",
    title: "展示墙独立成页",
    summary: "从功能性列表转向展示性策展，页面开始承担氛围和叙述职责。",
  },
] as const;

export const GRAMOPHONE_TRACKS = [
  {
    id: "track-1",
    title: "A 面 / 开场曲",
    length: "03:24",
    mood: "雾气",
    detail: "适合放 BGM、印象曲和和页面主题绑定的声音索引。",
  },
  {
    id: "track-2",
    title: "B 面 / 雨声循环",
    length: "04:11",
    mood: "低回",
    detail: "留声机区域可以强调正在播放、收藏顺序和带情绪的标题设计。",
  },
  {
    id: "track-3",
    title: "落针 / 归档",
    length: "02:52",
    mood: "颗粒",
    detail: "声音内容即使暂时没有真实播放能力，也能先形成视觉记忆点。",
  },
] as const;
