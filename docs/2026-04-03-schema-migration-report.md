# 2026-04-03 数据库结构与迁移报告

## 背景

在检查当前页面所需数据时，发现现有 schema 已覆盖 `users`、`articles`、`forum_boards`、`forum_threads`、`forum_posts`、`wall_entries` 等主体表，但缺少站点内容与展示墙内容的结构，同时论坛匿名与标签结构也不完整。

## 本次补充的结构

### 新增类型

- `site_block_type`
- `gallery_entry_type`

### 新增表

- `site_content_blocks`
- `gallery_entries`
- `forum_tags`
- `forum_thread_tag_relations`

### 现有表扩展

- `forum_threads.is_anonymous`
- `forum_posts.is_anonymous`

## 数据初始化

- 补充了一组页面所需的种子用户。
- 补充了论坛分区、文章、文章标签、讨论串、回帖、论坛标签。
- 补充了首页/社团介绍/展示墙对应的站点内容数据。

## 文件

- 总 schema：`DB/schema.sql`
- 增量迁移：`DB/migrations/20260403_content_and_forum_extensions.sql`

## 执行情况

- 项目自己的 `rubedo-postgres` 容器已启动。
- 增量迁移已成功执行到 `rubedo` 数据库。
