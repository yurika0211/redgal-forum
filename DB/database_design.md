# Rubedo 数据库表设计

## 设计目标

基于 `docs/requirement.md`，这版数据库设计优先解决以下问题：

- 只允许校内成员注册，并保留审核/校验能力。
- 支持个人主页、个人文章和三层可见度：`public`、`members`、`private`。
- 支持普通论坛版块和匿名讨论版。
- 支持展示墙投稿、媒体图集和管理员审核。
- 支持 Bangumi 条目缓存、用户游戏状态同步和异步导入任务。
- 为 Luckybot 预留最小可用的数据结构，满足普通用户对话和超级管理员扩展。

## 设计假设

- 账号注册以校验校内身份为前提，校验方式可能是校邮、学号、邀请码或人工审核，因此单独设计了校验申请表。
- 登录态的热点校验会落在 Redis，但数据库仍保留会话和登录审计，便于风控和强制下线。
- 文章和展示墙正文以 Markdown 为主，因此核心字段使用 `content_md`。
- 匿名版不会真的抹掉作者身份，数据库仍保留真实 `user_id`，只是在展示层通过线程内匿名马甲做映射。
- Bangumi 的复杂返回直接保留 `jsonb` 原始数据，避免一开始就把外部字段拆得过细。
- Luckybot 的需求还未写完，因此这里只保留会话、消息和管理员动作三张基础表。

## 模块拆分

### 1. 账号与权限

| 表名 | 作用 | 关键字段 |
| --- | --- | --- |
| `users` | 用户主表，承载登录与个人主页信息 | `username`、`school_email`、`nickname`、`profile_visibility`、`status` |
| `roles` | 角色字典 | `code`、`name` |
| `user_roles` | 用户与角色的多对多关系 | `user_id`、`role_id`、`granted_by` |
| `user_verification_requests` | 校内身份校验申请 | `method`、`proof_payload`、`status`、`reviewer_id` |
| `auth_sessions` | 刷新令牌/设备会话 | `refresh_token_hash`、`ip_address`、`expires_at` |
| `login_audit_logs` | 登录日志与失败审计 | `login_identifier`、`success`、`failure_reason` |
| `user_external_accounts` | 外部账号绑定，当前用于 Bangumi | `provider`、`external_uid`、`credential_payload` |

### 2. 个人文章系统

| 表名 | 作用 | 关键字段 |
| --- | --- | --- |
| `articles` | 用户文章/感想主表 | `author_id`、`slug`、`visibility`、`status`、`published_at` |
| `article_tags` | 文章标签字典 | `name`、`slug` |
| `article_tag_relations` | 文章与标签映射 | `article_id`、`tag_id` |
| `article_comments` | 文章评论，支持楼中楼 | `article_id`、`parent_id`、`reply_to_user_id`、`status` |

### 3. 论坛讨论版

| 表名 | 作用 | 关键字段 |
| --- | --- | --- |
| `forum_boards` | 论坛版块配置 | `slug`、`board_mode`、`read_visibility`、`write_visibility` |
| `forum_threads` | 主题帖主表 | `board_id`、`author_id`、`status`、`is_pinned`、`last_post_at` |
| `forum_posts` | 帖子回复表，支持树状回复 | `thread_id`、`parent_id`、`floor_no`、`status` |
| `forum_anonymous_identities` | 匿名版线程内马甲映射 | `thread_id`、`user_id`、`alias_name` |

### 4. 展示墙

| 表名 | 作用 | 关键字段 |
| --- | --- | --- |
| `wall_entries` | 展示墙投稿主表 | `submitter_id`、`slug`、`status`、`visibility`、`approved_by` |
| `wall_entry_media` | 展示墙图集/媒体列表 | `entry_id`、`media_type`、`media_url`、`sort_order` |
| `wall_entry_reviews` | 审核流水 | `entry_id`、`reviewer_id`、`decision` |

### 5. 内容治理与风控

| 表名 | 作用 | 关键字段 |
| --- | --- | --- |
| `content_reports` | 举报与处理流程 | `target_type`、`target_id`、`status`、`handler_id` |

### 6. Bangumi 集成

| 表名 | 作用 | 关键字段 |
| --- | --- | --- |
| `bangumi_subjects` | Bangumi 条目缓存 | `bgm_subject_id`、`name`、`tags`、`raw_payload` |
| `user_bangumi_collections` | 用户游戏状态/收藏映射 | `user_id`、`subject_id`、`collection_status`、`score` |
| `bangumi_sync_jobs` | 异步导入任务 | `user_id`、`external_account_id`、`job_type`、`status` |

### 7. Luckybot

| 表名 | 作用 | 关键字段 |
| --- | --- | --- |
| `luckybot_sessions` | 对话会话 | `owner_user_id`、`session_type`、`status` |
| `luckybot_messages` | 消息明细 | `session_id`、`sender_type`、`message_type` |
| `luckybot_admin_actions` | 超级管理员动作日志 | `actor_user_id`、`action_name`、`action_payload` |

## 关键关系

- `users` 1:N `articles`
- `users` 1:N `article_comments`
- `articles` N:N `article_tags`，通过 `article_tag_relations`
- `forum_boards` 1:N `forum_threads`
- `forum_threads` 1:N `forum_posts`
- `forum_threads` 1:N `forum_anonymous_identities`
- `users` 1:N `wall_entries`
- `wall_entries` 1:N `wall_entry_media`
- `wall_entries` 1:N `wall_entry_reviews`
- `users` 1:N `user_bangumi_collections`
- `bangumi_subjects` 1:N `user_bangumi_collections`
- `users` 1:N `luckybot_sessions`
- `luckybot_sessions` 1:N `luckybot_messages`

## 重点设计决策

### 三层可见度统一建模

文章、个人主页、展示墙都使用统一枚举 `visibility_level`：

- `public`：游客可见
- `members`：登录成员可见
- `private`：仅本人和管理员可见

这样前后端的权限判断逻辑可以统一，不会出现一套内容一个判断方式。

### 匿名版采用“线程内匿名”

匿名版最怕两种问题：

- 完全不留痕，出现违规内容后无法追责
- 匿名身份在全站复用，用户很容易被反向识别

因此这里采用折中方案：

- `forum_threads` / `forum_posts` 始终保存真实 `author_id`
- `forum_anonymous_identities` 只在单个线程里给用户分配一个匿名马甲

这样既能审核，也能尽量保证匿名体验。

### 展示墙走独立审核流

展示墙的价值更接近社团史料，不适合把审核逻辑和普通帖子混在一起，所以单独设计：

- `wall_entries`：主记录和当前状态
- `wall_entry_reviews`：审核流水
- `wall_entry_media`：图集/视频

这样后续做“待审核列表”“审核历史”“驳回后二次提交”都比较自然。

### Bangumi 采取“结构化字段 + JSONB 原始数据”

Bangumi 导入的数据结构波动比较大，所以拆成两层：

- 高频展示字段直接结构化，如 `name`、`cover_image_url`、`rank_no`
- 原始响应落 `raw_payload jsonb`

这样既方便展示，也不会因为外部字段变化频繁改表。

## 推荐的首批默认角色

- `user`：普通注册用户
- `moderator`：内容审核/版务
- `admin`：站点管理
- `super_admin`：系统级管理与 Luckybot 高权限操作

## 输出文件

- `schema.sql`：可直接作为 PostgreSQL 初版建表脚本
- `database_design.md`：表设计说明，方便后续继续细化需求
