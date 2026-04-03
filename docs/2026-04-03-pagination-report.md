# 2026-04-03 分页查询改造报告

## 目标

为项目中的主要列表接口补齐统一分页能力，避免一次性返回全量数据。

## 统一分页约定

### 查询参数

- `page`
- `page_size`

### 返回结构

- `items`
- `page`
- `page_size`
- `total`
- `total_pages`

## 已完成分页改造的接口

- `GET /api/v1/articles`
- `GET /api/v1/forum/threads`
- `GET /api/v1/activities/relays`
- `GET /api/v1/activities/contests`
- `GET /api/v1/wall`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/site/gallery-entries`

## 基础设施

- 新增通用分页模块：
  - `backend/internal/pagination/pagination.go`

该模块负责：

- 统一解析 `page` / `page_size`
- 生成 `offset`
- 构造分页响应
- 为本地 scaffold 数据提供切片能力

## 前端同步

前端已接入分页状态与翻页控件的页面：

- 文章列表
- 论坛主题列表
- 展示墙公开内容列表
- gallery 管理列表

当前交互形态：

- 上一页
- 下一页
- 当前页 / 总页数 / 总条数

## 关键文件

- `backend/internal/pagination/pagination.go`
- `backend/internal/modules/article/*`
- `backend/internal/modules/forum/*`
- `backend/internal/modules/activity/*`
- `backend/internal/modules/wall/*`
- `backend/internal/modules/user/*`
- `backend/internal/modules/sitecontent/*`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

## 验证结果

- `backend`: `go test ./...` 通过
- `frontend`: `npm run build` 通过

## 备注

- 详情接口没有做分页。
- `/api/v1/site/content` 当前仍保持聚合配置响应，不属于单一列表分页接口。
