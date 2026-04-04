begin;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'site_block_type') then
        create type site_block_type as enum (
            'hero_object',
            'portal_page',
            'portal_highlight',
            'portal_pillar',
            'portal_notice',
            'portal_activity',
            'portal_join_step'
        );
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'gallery_entry_type') then
        create type gallery_entry_type as enum (
            'album',
            'polaroid',
            'paper',
            'timeline',
            'track'
        );
    end if;
end $$;

alter table forum_threads
    add column if not exists is_anonymous boolean not null default false;

alter table forum_posts
    add column if not exists is_anonymous boolean not null default false;

create table if not exists forum_tags (
    id bigserial primary key,
    name varchar(32) not null,
    slug varchar(32) not null,
    created_at timestamptz not null default now()
);

create unique index if not exists ux_forum_tags_name
    on forum_tags (lower(name));

create unique index if not exists ux_forum_tags_slug
    on forum_tags (lower(slug));

create table if not exists forum_thread_tag_relations (
    thread_id bigint not null references forum_threads(id) on delete cascade,
    tag_id bigint not null references forum_tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (thread_id, tag_id)
);

create table if not exists site_content_blocks (
    id bigserial primary key,
    block_type site_block_type not null,
    slug varchar(120) not null,
    path varchar(200),
    kicker varchar(120),
    label varchar(120),
    title varchar(200) not null,
    description text,
    body text,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (block_type, slug)
);

create index if not exists idx_site_content_blocks_type_order
    on site_content_blocks (block_type, sort_order, id)
    where is_active = true;

create table if not exists gallery_entries (
    id bigserial primary key,
    entry_type gallery_entry_type not null,
    slug varchar(120) not null,
    title varchar(200) not null,
    subtitle varchar(120),
    body text,
    extra_text varchar(120),
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (entry_type, slug)
);

create index if not exists idx_gallery_entries_type_order
    on gallery_entries (entry_type, sort_order, id)
    where is_active = true;

insert into roles (code, name, description) values
    ('moderator', 'Moderator', 'Content moderation and forum management')
on conflict (code) do nothing;

insert into users (
    username,
    password_hash,
    school_email,
    nickname,
    signature,
    bio,
    status,
    email_verified_at,
    profile_visibility
)
select
    seed.username,
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    seed.school_email,
    seed.nickname,
    seed.signature,
    seed.bio,
    'active'::user_status,
    now(),
    'public'::visibility_level
from (
    values
        ('rubedo_room', 'rubedo_room@example.local', '夜色收藏室', '把喜欢的句子、图像和夜晚都慢慢归档。', '个人空间更像一间安静的小房间，不急着展示全部内容，只把真正舍不得丢掉的片段留下来。'),
        ('night_editor', 'night_editor@example.local', '夜航编辑部', '把一段轻声慢语写成可回看的札记。', '习惯把人物说不出口的话、站台风声和夜色都整理成短札。'),
        ('archive_keeper', 'archive_keeper@example.local', '归档室', '把值得留下的内容放进长期档案。', '更在意作品里的回声、停顿和那些不需要被说得太满的场景。'),
        ('observer_zero', 'observer_zero@example.local', '观测者', '喜欢安静地记录人物靠近又退开的瞬间。', '擅长从对白、视线和留白里找出故事真正发力的地方。'),
        ('paper_window', 'paper_window@example.local', '纸窗旅人', '在讨论里慢慢搭起作品的结构。', '常在论坛里整理慢热叙事、角色节奏和场景构图相关的话题。'),
        ('blank_observer', 'blank_observer@example.local', '留白观察者', '偏爱讨论个人空间、展示方式和内容陈列。', '会关注站点结构怎样影响浏览情绪，也会把喜欢的内容收进自己的档案柜。')
) as seed(username, school_email, nickname, signature, bio)
where not exists (
    select 1
    from users
    where lower(users.username) = lower(seed.username)
      and users.deleted_at is null
);

insert into user_roles (user_id, role_id)
select u.id, r.id
from users u
join roles r on r.code in ('member', 'user')
where u.username in ('rubedo_room', 'night_editor', 'archive_keeper', 'observer_zero', 'paper_window', 'blank_observer')
on conflict do nothing;

insert into forum_boards (
    name,
    slug,
    description,
    board_mode,
    read_visibility,
    write_visibility,
    sort_order,
    is_active,
    created_by
)
select
    seed.name,
    seed.slug,
    seed.description,
    'normal'::forum_board_mode,
    'public'::visibility_level,
    'members'::visibility_level,
    seed.sort_order,
    true,
    (select id from users where username = 'rubedo_room')
from (
    values
        ('剧情讨论', 'plot-talk', '围绕剧情推进、角色关系和叙事节奏展开讨论。', 10),
        ('美术交流', 'visual-talk', '集中展示场景构图、截图收藏和美术风格相关话题。', 20),
        ('站内想法', 'site-thoughts', '讨论站点结构、个人空间和展示墙的内容安排。', 30)
) as seed(name, slug, description, sort_order)
where not exists (
    select 1
    from forum_boards
    where lower(forum_boards.slug) = lower(seed.slug)
);

insert into articles (
    author_id,
    title,
    slug,
    summary,
    content_md,
    visibility,
    status,
    allow_comments,
    published_at
)
select
    (select id from users where username = seed.author_username),
    seed.title,
    seed.slug,
    seed.summary,
    seed.content_md,
    'public'::visibility_level,
    'published'::article_status,
    true,
    now() - seed.published_offset
from (
    values
        (
            'night_editor',
            '夏夜电车与站台尽头的风',
            'summer-platform-wind',
            '把一段轻声慢语的故事写成短札，保留人物靠近又退开的气味。',
            '有些作品最动人的地方，不在高潮，而在人物走到站台边缘时那一点点犹豫。风吹过来，话没有说满，读者却已经听懂了。',
            interval '3 days'
        ),
        (
            'archive_keeper',
            '旧校舍里的回声',
            'echoes-in-old-campus',
            '回忆型叙事更适合留出空白，让场景和声音先落在读者心里。',
            '木地板的回音、风吹窗框的细碎声、走廊尽头忽然亮起的灯，这些都比直白解释更能让一部作品长久停留。',
            interval '2 days'
        ),
        (
            'observer_zero',
            '角色真正开口之前',
            'before-the-dialogue-begins',
            '一篇关于对白节奏的随想，讨论沉默在故事里到底能留下什么。',
            '不是每段关系都靠台词推进。真正有效的句子往往很短，甚至只是一句没有说完的话，让读者自己补上呼吸和目光。',
            interval '1 day'
        )
) as seed(author_username, title, slug, summary, content_md, published_offset)
where not exists (
    select 1 from articles where lower(slug) = lower(seed.slug) and deleted_at is null
);

insert into article_tags (name, slug) values
    ('站台', 'station'),
    ('慢热', 'slow-burn'),
    ('短札', 'notes'),
    ('校园', 'campus'),
    ('回忆', 'memory'),
    ('氛围', 'atmosphere'),
    ('对白', 'dialogue'),
    ('角色', 'character'),
    ('节奏', 'rhythm')
on conflict do nothing;

insert into article_tag_relations (article_id, tag_id)
select a.id, t.id
from (
    values
        ('summer-platform-wind', '站台'),
        ('summer-platform-wind', '慢热'),
        ('summer-platform-wind', '短札'),
        ('echoes-in-old-campus', '校园'),
        ('echoes-in-old-campus', '回忆'),
        ('echoes-in-old-campus', '氛围'),
        ('before-the-dialogue-begins', '对白'),
        ('before-the-dialogue-begins', '角色'),
        ('before-the-dialogue-begins', '节奏')
) as seed(article_slug, tag_name)
join articles a on lower(a.slug) = lower(seed.article_slug)
join article_tags t on lower(t.name) = lower(seed.tag_name)
on conflict do nothing;

insert into forum_threads (
    board_id,
    author_id,
    title,
    content_md,
    is_anonymous,
    status,
    reply_count,
    last_post_at
)
select
    (select id from forum_boards where lower(slug) = lower(seed.board_slug)),
    (select id from users where username = seed.author_username),
    seed.title,
    seed.content_md,
    seed.is_anonymous,
    'active'::thread_status,
    seed.reply_count,
    now() - seed.offset_time
from (
    values
        ('plot-talk', 'paper_window', '慢热作品到底该怎样开场才不劝退？', '最近重看几部前期信息密度很低的作品，反而发现真正抓人的不是反转，而是气氛和人物关系的先后铺垫。', false, 2, interval '8 hours'),
        ('visual-talk', 'paper_window', '有没有那种一看就想截图收藏的场景构图？', '不是纯壁纸向，而是那种一眼就能感到故事情绪压过来的画面。想整理一串适合做展示墙灵感的场景。', true, 1, interval '6 hours'),
        ('site-thoughts', 'blank_observer', '你最喜欢哪种个人空间陈列方式？', '是按时间线排开，还是按主题做成抽屉式收藏？最近在想论坛里的个人空间应该更像房间还是更像档案柜。', false, 1, interval '3 hours')
) as seed(board_slug, author_username, title, content_md, is_anonymous, reply_count, offset_time)
where not exists (
    select 1 from forum_threads where title = seed.title and deleted_at is null
);

insert into forum_posts (
    thread_id,
    author_id,
    floor_no,
    content_md,
    is_anonymous,
    status
)
select
    ft.id,
    u.id,
    seed.floor_no,
    seed.content_md,
    seed.is_anonymous,
    'visible'::post_status
from (
    values
        ('慢热作品到底该怎样开场才不劝退？', 'archive_keeper', 1, '我会先看人物之间有没有真实张力。开场只要先把关系放稳，后面的慢热就不会显得拖。', false),
        ('慢热作品到底该怎样开场才不劝退？', 'observer_zero', 2, '赞同。真正抓人的通常不是信息量，而是第一场戏里有没有留下继续往下看的情绪钩子。', false),
        ('有没有那种一看就想截图收藏的场景构图？', 'blank_observer', 1, '我偏爱那些留白很多、但一看就知道人物关系已经被场景安排好的画面。', true),
        ('你最喜欢哪种个人空间陈列方式？', 'night_editor', 1, '我喜欢半房间半档案柜的做法，既能看到情绪，也能看见长期积累。', false)
) as seed(thread_title, author_username, floor_no, content_md, is_anonymous)
join forum_threads ft on ft.title = seed.thread_title
join users u on u.username = seed.author_username
where not exists (
    select 1 from forum_posts fp where fp.thread_id = ft.id and fp.floor_no = seed.floor_no and fp.deleted_at is null
);

insert into forum_tags (name, slug) values
    ('开场', 'opening'),
    ('叙事', 'narrative'),
    ('慢热', 'slow-burn'),
    ('构图', 'composition'),
    ('截图', 'screenshot'),
    ('美术', 'visual-art'),
    ('空间', 'space'),
    ('收藏', 'collection'),
    ('设计', 'design')
on conflict do nothing;

insert into forum_thread_tag_relations (thread_id, tag_id)
select ft.id, tg.id
from (
    values
        ('慢热作品到底该怎样开场才不劝退？', '开场'),
        ('慢热作品到底该怎样开场才不劝退？', '叙事'),
        ('慢热作品到底该怎样开场才不劝退？', '慢热'),
        ('有没有那种一看就想截图收藏的场景构图？', '构图'),
        ('有没有那种一看就想截图收藏的场景构图？', '截图'),
        ('有没有那种一看就想截图收藏的场景构图？', '美术'),
        ('你最喜欢哪种个人空间陈列方式？', '空间'),
        ('你最喜欢哪种个人空间陈列方式？', '收藏'),
        ('你最喜欢哪种个人空间陈列方式？', '设计')
) as seed(thread_title, tag_name)
join forum_threads ft on ft.title = seed.thread_title
join forum_tags tg on lower(tg.name) = lower(seed.tag_name)
on conflict do nothing;

insert into site_content_blocks (
    block_type, slug, path, kicker, label, title, description, body, sort_order
) values
    ('hero_object', 'record', null, null, '留声', '留声机', null, '把氛围和声音感先挂在首页。', 10),
    ('hero_object', 'letter', null, null, '信笺', '旧信封', null, '给感悟区和回信感留一个入口。', 20),
    ('hero_object', 'polaroid', null, null, '拍立得', '拍立得', null, '把碎片式图像和短句收进同一张纸片。', 30),
    ('hero_object', 'clock', null, null, '时间', '时间轴', null, '让旧作、新帖和记忆节点排成线。', 40),
    ('portal_page', 'stories', '/stories', '文章札记', null, '公开文章与随想', '把前台文章、专题标签和短篇感悟收束到一条更适合浏览的内容流里。', null, 10),
    ('portal_page', 'forum', '/forum', '论坛交流', null, '论坛讨论与匿名聊天室', '保留讨论串结构，同时给匿名即时聊天一个更轻、更松弛的入口。', null, 20),
    ('portal_page', 'space', '/space', '个人空间', null, '用户个人空间', '把个人资料、收藏统计和带情绪的空间陈列集中到一个独立页。', null, 30),
    ('portal_page', 'gallery', '/gallery', '展示陈列', null, '相册与留声机展示墙', '相册、拍立得、旧纸、时间轴和留声机以策展式布局并列展开。', null, 40),
    ('portal_highlight', 'positioning', null, '社团定位', null, '以 Galgame、叙事与视觉表达为核心的同好社团。', null, '我们把文字、音乐、美术、配音、讨论和策展放在同一条线上，让喜欢故事的人能在同一个地方相遇。', 10),
    ('portal_highlight', 'daily-vibe', null, '日常氛围', null, '不是只聊作品，也一起做展示、写札记、办分享。', null, '首页承担社团门面，站内的文章区、论坛区、展示墙和个人空间则是社团活动的延展场景。', 20),
    ('portal_highlight', 'members', null, '成员构成', null, '欢迎写手、画手、配音、剪辑、策展和单纯热爱剧情的人。', null, '不要求每个人都产出内容，但希望每个人都能带来自己最真切的兴趣方向。', 30),
    ('portal_pillar', 'reading', null, null, null, '作品赏析', '围绕 Galgame、AVG 和相关叙事作品做主题讨论、慢热作品导读与角色分析。', null, 10),
    ('portal_pillar', 'co-create', null, null, null, '内容共创', '支持成员写短札、做展板、整理专题页，把零散灵感做成能被看见的社团成果。', null, 20),
    ('portal_pillar', 'showcase', null, null, null, '活动陈列', '把相册、拍立得、旧纸、时间轴和留声机这类展示方式融入社团活动发布与归档。', null, 30),
    ('portal_notice', 'welcome-announcement', null, '公告', '置顶', '站点公告与活动提醒开始接入后台发布', '管理员可在管理界面直接发布公告，前台会按公告流展示。', '后续会继续补充置顶、定时与归档规则。', 10),
    ('portal_activity', 'night-reading', null, null, '每周', '夜读与共赏会', '围绕某一部作品的章节、路线或主题做小范围共读，再把讨论整理成社团札记。', null, 10),
    ('portal_activity', 'workshop', null, null, '专题', '剧情拆解工作坊', '从开场、冲突、转折和结尾几条线去拆一部作品，看它如何建立情绪和节奏。', null, 20),
    ('portal_activity', 'gallery-show', null, null, '展示', '展墙与图像策展', '把截图、封面、短句、场景构图和音乐卡片排成一面真正有叙述感的展示墙。', null, 30),
    ('portal_activity', 'social', null, null, '社交', '匿名聊天室与主题串', '给轻量讨论留出口，也给深度帖子留位置，让成员可以按自己舒服的方式参与。', null, 40),
    ('portal_join_step', 'join-1', null, null, '01', '先逛一圈社团页面', '从首页、文章札记、论坛聊天室和展示墙里感受社团目前的内容方向。', null, 10),
    ('portal_join_step', 'join-2', null, null, '02', '带着兴趣点进组', '你可以偏剧情、偏美术、偏配音，也可以只是想找一群愿意认真聊作品的人。', null, 20),
    ('portal_join_step', 'join-3', null, null, '03', '参加一次共赏或共创', '从最轻的一次参与开始，让社团先认识你的节奏，再慢慢展开更多合作。', null, 30)
on conflict do nothing;

insert into gallery_entries (
    entry_type, slug, title, subtitle, body, extra_text, sort_order
) values
    ('album', 'summer-park', '夏夜公园', '橙灯', '适合挂长图、封面和同主题多图编排。', null, 10),
    ('album', 'before-last-train', '终电之前', '蓝站台', '一组图可以像章节卡片一样依次展开，而不是孤立平铺。', null, 20),
    ('album', 'after-rain-window', '雨后的窗边', '灰银', '相册区更适合做整套视觉叙述，保留同一时期的情绪密度。', null, 30),
    ('polaroid', 'polaroid-01', '拍立得 01', 'Sat 23:14', '给瞬时心情留一个更轻的展示方式，像贴在墙上的即时便签。', null, 10),
    ('polaroid', 'polaroid-02', '拍立得 02', 'Sun 10:08', '适合角色台词、通关感想和单张插画，不需要完整长文承接。', null, 20),
    ('polaroid', 'polaroid-03', '拍立得 03', 'Tue 18:42', '可以混排手写感、日期戳和简短说明，强化收藏物件的质感。', null, 30),
    ('paper', 'paper-note', '旧纸札记', '编辑台旁注', '把长评论里舍不得删的边角话放到旧纸区，像夹在档案盒里的补充说明。', null, 10),
    ('paper', 'paper-letter', '未寄出的信', '无投递地址', '适合写给角色、写给过去的自己，或者写给某个已经散场的讨论夜晚。', null, 20),
    ('paper', 'paper-fold', '折角页', '纸张微黄', '视觉上偏暖、偏旧，可以承接有年代感的文本和带折痕的回忆。', null, 30),
    ('timeline', 'timeline-2023', '最初的文章流', '2023', '从单纯的文章列表开始，先把内容生产入口搭起来。', null, 10),
    ('timeline', 'timeline-2024', '论坛讨论加入主站', '2024', '讨论串成为作品周边交流的主阵地，用户开始沉淀标签化话题。', null, 20),
    ('timeline', 'timeline-2025', '个人收藏意识增强', '2025', '用户不再只看内容，也希望把喜欢的图、句子和帖子带回自己的空间。', null, 30),
    ('timeline', 'timeline-2026', '展示墙独立成页', '2026', '从功能性列表转向展示性策展，页面开始承担氛围和叙述职责。', null, 40),
    ('track', 'track-side-a', 'A 面 / 开场曲', '雾气', '适合放 BGM、印象曲和和页面主题绑定的声音索引。', '03:24', 10),
    ('track', 'track-side-b', 'B 面 / 雨声循环', '低回', '留声机区域可以强调正在播放、收藏顺序和带情绪的标题设计。', '04:11', 20),
    ('track', 'track-needle-drop', '落针 / 归档', '颗粒', '声音内容即使暂时没有真实播放能力，也能先形成视觉记忆点。', '02:52', 30)
on conflict do nothing;

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'trg_site_content_blocks_set_updated_at') then
        create trigger trg_site_content_blocks_set_updated_at
        before update on site_content_blocks
        for each row execute function set_updated_at();
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'trg_gallery_entries_set_updated_at') then
        create trigger trg_gallery_entries_set_updated_at
        before update on gallery_entries
        for each row execute function set_updated_at();
    end if;
end $$;

commit;
