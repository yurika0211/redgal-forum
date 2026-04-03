# 2026-04-03 接口与前端同步报告

## 目标

让前端页面优先读取真实后端数据，并在后端不可用时保留本地内容兜底。

## 新增或接入的接口

### 公共读取接口

- `GET /api/v1/site/content`
- `GET /api/v1/articles`
- `GET /api/v1/forum/threads`
- `GET /api/v1/users/:username`

### 站点内容管理接口

- `POST /api/v1/admin/site/content-blocks`
- `PATCH /api/v1/admin/site/content-blocks/:blockID`
- `DELETE /api/v1/admin/site/content-blocks/:blockID`
- `POST /api/v1/admin/site/gallery-entries`
- `PATCH /api/v1/admin/site/gallery-entries/:entryID`
- `DELETE /api/v1/admin/site/gallery-entries/:entryID`

## 前端同步方式

- 首页、社团介绍页、展示墙会优先读取 `/site/content`。
- 文章页优先读取 `/articles`。
- 论坛页优先读取 `/forum/threads`。
- 个人空间页优先读取 `/users/rubedo_room`。
- 若请求失败，则回退到 `frontend/src/content.ts` 中的本地内容。

## 关键文件

- `backend/internal/http/router/router.go`
- `backend/internal/modules/sitecontent/handler.go`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`

## 结果

- 前端已经能消费新增后端内容接口。
- 页面不会因为后端瞬时不可用而整体空白。
