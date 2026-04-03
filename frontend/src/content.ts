export const NAV_ITEMS = [
  { href: "/", label: "入口" },
  { href: "/stories", label: "文章感悟" },
  { href: "/forum", label: "论坛聊天室" },
  { href: "/space", label: "个人空间" },
  { href: "/gallery", label: "展示墙" },
] as const;

export const PORTAL_PAGES = [
  {
    href: "/stories",
    kicker: "Public stories",
    title: "公开文章与感悟区",
    description: "把前台文章、专题标签和短篇感悟收束到一条更适合浏览的内容流里。",
  },
  {
    href: "/forum",
    kicker: "Live talk",
    title: "论坛讨论与匿名聊天室",
    description: "保留讨论串结构，同时给匿名即时聊天一个更轻、更松弛的入口。",
  },
  {
    href: "/space",
    kicker: "Private room",
    title: "用户个人空间",
    description: "把个人资料、收藏统计和带情绪的空间陈列集中到一个独立页。",
  },
  {
    href: "/gallery",
    kicker: "Showcase wall",
    title: "相册与留声机展示墙",
    description: "相册、拍立得、旧纸、时间轴和留声机以策展式布局并列展开。",
  },
] as const;

export const HERO_OBJECTS = [
  {
    id: "record",
    label: "Record",
    title: "留声机",
    note: "把氛围和声音感先挂在首页。",
  },
  {
    id: "letter",
    label: "Letter",
    title: "旧信封",
    note: "给感悟区和回信感留一个入口。",
  },
  {
    id: "polaroid",
    label: "Polaroid",
    title: "拍立得",
    note: "把碎片式图像和短句收进同一张纸片。",
  },
  {
    id: "clock",
    label: "Clock",
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
    title: "Side A / Opening Theme",
    length: "03:24",
    mood: "雾气",
    detail: "适合放 BGM、印象曲和和页面主题绑定的声音索引。",
  },
  {
    id: "track-2",
    title: "Side B / Rain Loop",
    length: "04:11",
    mood: "低回",
    detail: "留声机区域可以强调正在播放、收藏顺序和带情绪的标题设计。",
  },
  {
    id: "track-3",
    title: "Needle Drop / Archive",
    length: "02:52",
    mood: "颗粒",
    detail: "声音内容即使暂时没有真实播放能力，也能先形成视觉记忆点。",
  },
] as const;
