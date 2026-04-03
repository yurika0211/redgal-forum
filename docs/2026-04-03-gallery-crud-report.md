# 2026-04-03 展示墙 CRUD 报告

## 目标

为 `/gallery` 页面补齐可操作的增删查改能力，而不是只保留静态展示。

## 已完成事项

- 后端补充管理员列表接口：
  - `GET /api/v1/admin/site/gallery-entries`
- 复用并打通已有接口：
  - `POST /api/v1/admin/site/gallery-entries`
  - `PATCH /api/v1/admin/site/gallery-entries/:entryID`
  - `DELETE /api/v1/admin/site/gallery-entries/:entryID`
- 前端 `/gallery` 页面新增管理区：
  - 创建条目
  - 编辑条目
  - 删除条目
  - 查看全部 gallery 条目
  - 控制 `active` 状态
- 管理区按角色控制：
  - `admin`
  - `super_admin`

## 前端表现

- 普通访客仍然只看到展示墙内容。
- 管理员登录后，会在 `/gallery` 页面直接看到管理表单和管理列表。
- 这样不需要额外再跳一个后台页面，就能直接维护 gallery 条目。

## 关键文件

- `backend/internal/http/router/router.go`
- `backend/internal/modules/sitecontent/handler.go`
- `backend/internal/modules/sitecontent/service.go`
- `backend/internal/modules/sitecontent/repository.go`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.css`

## 验证结果

- `backend`: `go test ./...` 通过
- `frontend`: `npm run build` 通过

## 备注

- 当前这套 CRUD 依赖的是 `gallery_entries` 表，更偏“策展配置”而不是“完整投稿系统”。
- 若后续要做真正的用户照片墙投稿、审核和多媒体管理，应逐步迁到 `wall_entries` / `wall_entry_media` 这套模型。
