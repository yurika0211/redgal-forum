# 2026-04-03 接口对齐报告

## 目标

把当前前端实际消费的接口和后端真实暴露的接口对齐，避免出现字段名不一致、默认账号不一致、权限语义不一致等问题。

## 本次对齐内容

### 账号与身份

- 前端默认公开资料用户名统一为 `rubedo_room`。
- 登录表单默认账号也改为 `rubedo_room`，避免继续使用 `rubedo-room` 这种旧值。
- 后端把旧角色码 `user` 映射为当前权限语义中的 `member`，避免登录后仍被判定为未认证。

### 页面消费的读接口

前端当前实际依赖的读取接口已统一为：

- `GET /api/v1/health`
- `GET /api/v1/site/content`
- `GET /api/v1/articles`
- `GET /api/v1/articles/:articleID`
- `GET /api/v1/forum/threads`
- `GET /api/v1/forum/threads/:threadID`
- `GET /api/v1/users/:username`
- `GET /api/v1/users/me`

### 页面消费的写接口

前端当前已经对接的写接口为：

- `POST /api/v1/auth/login`
- `PATCH /api/v1/users/me`
- `POST /api/v1/users/me/bangumi/import`
- `POST /api/v1/articles`
- `POST /api/v1/forum/threads`
- `POST /api/v1/forum/threads/:threadID/replies`
- `POST /api/v1/wall/submissions`

## 关键文件

- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `backend/internal/http/router/router.go`
- `backend/internal/modules/auth/repository.go`
- `backend/internal/modules/user/repository.go`

## 结果

- 当前页面读写路径已经和后端接口保持一致。
- 登录态、资料读取、文章与论坛写入都能沿用同一套会话和角色逻辑。
