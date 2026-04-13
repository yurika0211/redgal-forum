begin;

insert into site_content_blocks (
    block_type,
    slug,
    path,
    kicker,
    label,
    title,
    description,
    body,
    sort_order
)
values
    ('portal_page', 'stories', '/stories', '活动札记', null, '活动纪要与征文', '收录川器评选、征文投稿与访谈整理的文字记录。', null, 10),
    ('portal_page', 'forum', '/forum', '讨论广场', null, '论坛与主题串', '围绕作品、制作流程与市场观察展开长期讨论，也保留轻量匿名交流。', null, 20),
    ('portal_page', 'space', '/space', '成员空间', null, '个人收藏与成长页', '记录成员的收藏、日志和参与痕迹，形成可追溯的社团记忆。', null, 30),
    ('portal_page', 'gallery', '/gallery', '历史归档', null, '海报与活动展墙', '把川器海报、活动照片、问答题面与视频截图做成策展式归档。', null, 40),
    ('portal_highlight', 'positioning', null, '社团定位', null, '2017 起步，2024 正式定名，社群已扩展至 300+。', null, '社团起源于川大校级 ACG 社团的 Galgame 分群，经过多年积累，于 2024 年确立“百川乃大视觉小说研”名称。', 10),
    ('portal_highlight', 'daily-vibe', null, '日常氛围', null, '年度活动由“十二川器、征文、招新问答、百川夜话”构成。', null, '我们既做作品推荐与票选，也做写作与二创征集，并邀请从业者访谈，让兴趣、表达与方法论在同一条线上发生。', 20),
    ('portal_highlight', 'members', null, '成员构成', null, '成员既有玩家，也有写手、剪辑、配音与开发者。', null, '从“想认真聊视觉小说”的新同学，到持续参与创作与组织的老成员，社团尊重差异化参与路径。', 30),
    ('portal_pillar', 'reading', null, null, null, '川器评选与作品鉴赏', '“十二川器”年度评选沉淀出高质量推荐名单和真爱短文，兼顾热门与冷门作品。', null, 10),
    ('portal_pillar', 'co-create', null, null, null, '征文与共创', '征文大赛设置文艺评论与同人创作赛道，鼓励把观后感、二创和原创企划转成可公开展示的作品。', null, 20),
    ('portal_pillar', 'showcase', null, null, null, '访谈与媒介归档', '通过 Bilibili、Bangumi 等平台归档社团成果，并以访谈与视频内容连接站内外讨论。', null, 30),
    ('portal_notice', 'welcome-announcement', null, '公告', '置顶', 'VNFest（SCU 部分）内容已同步到站内主页', '首页活动时间轴、公告和板块导语已按《VNFest中文版_V3》更新。', '本轮更新重点覆盖：社团发展史、十二川器、征文大赛、招新问答、国产视觉小说访谈。后续会继续补充图片与视频素材。', 10),
    ('portal_activity', 'night-reading', null, null, '2023-11-01', '第一届十二川器', '完成 180+ 作品提名与多轮票选，最终产出上榜海报与作品别称，成为社团年度传统。', null, 10),
    ('portal_activity', 'workshop', null, null, '2024-12-01', '第一届征文大赛与官方账号建设', '设置文艺评论/同人创作赛道，同时在 Bilibili 与 Bangumi 持续发布社团稿件与视频。', null, 20),
    ('portal_activity', 'gallery-show', null, null, '2024-10-15', '招新问答活动（A/B 双难度 50 题）', '题目融入梗与知识点，并增设专题卷；线上线下合计收获 600+ 份答卷。', null, 30),
    ('portal_activity', 'social', null, null, '2025-03-01', '百川夜话：国产视觉小说制作与市场访谈', '邀请从业者围绕开发流程、演出工具链、市场差异与未来趋势进行系统分享。', null, 40),
    ('portal_join_step', 'join-1', null, null, '01', '先读社团发展史', '从“零、一切的起点”到近年活动脉络，先了解社团为什么存在、如何发展。', null, 10),
    ('portal_join_step', 'join-2', null, null, '02', '参与一次公开活动', '可从川器票选、问答活动、共赏讨论或访谈留言开始，用最低门槛加入交流。', null, 20),
    ('portal_join_step', 'join-3', null, null, '03', '提交你的第一份内容', '欢迎投稿评论、二创、活动记录或视频脚本，让你的视角进入社团长期档案。', null, 30)
on conflict (block_type, slug) do update
set
    path = excluded.path,
    kicker = excluded.kicker,
    label = excluded.label,
    title = excluded.title,
    description = excluded.description,
    body = excluded.body,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

commit;
