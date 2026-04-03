# 项目当前问题检查报告

日期：2026-04-03

## 检查范围

- 基于当前工作区检查，包含未提交的前端改动：
  - `frontend/src/App.tsx`
  - `frontend/src/App.css`
  - `frontend/src/components/Header.tsx`
  - `docs/TODO.md`
- 已执行验证：
  - `frontend`: `npm run build`，通过
  - `backend`: `go test ./...`，通过
- 运行态限制：
  - 沙箱环境禁止绑定 `0.0.0.0:8080`，因此 HTTP 端到端请求未在本报告内直接复现；以下问题来自源码路径核查。

## 结论概览

项目当前的主要问题不在“能不能编译”，而在“运行后会不会给出错误安全边界和错误产品信号”。

目前最严重的问题有两类：

1. 后端鉴权几乎等于未设防，默认配置下可以被请求头直接伪造身份，甚至任意 Bearer Token 都会被当成已登录用户。
2. 前端已经基本脱离后端，页面内容全部来自本地静态数据，导致 UI 看起来可用，但并没有真正验证登录、文章、论坛、个人信息等核心链路。

## 发现的问题

### P0 严重：默认开启调试请求头，可直接伪造管理员身份

- `backend/internal/config/config.go:64-67` 将 `AUTH_ALLOW_DEBUG_HEADERS` 的默认值设为 `true`。
- `backend/internal/middleware/auth.go:17-27` 在该开关开启时，直接信任 `X-Debug-User` 和 `X-Debug-Roles`。
- `backend/internal/middleware/auth.go:85-105` 对 `X-Debug-Roles` 没有白名单约束，请求方可自行传入 `super_admin` 等角色。

影响：

- 只要部署环境没有显式关闭这个开关，任意客户端都可以通过自定义请求头把自己伪装成普通用户、版主、管理员甚至超级管理员。
- 这会直接绕过 `RequireAuthenticated` 和 `RequireRoles` 所保护的写接口与管理接口。

### P0 严重：任意非空 Bearer Token 都会被识别为已登录会员

- `backend/internal/middleware/auth.go:29-33` 只要请求带了非空 Bearer Token，就进入 `principalFromToken`。
- `backend/internal/middleware/auth.go:108-132` 中 `principalFromToken` 即使拿到的是无效 token，也会默认生成 `username = "member"` 的已认证身份。
- 该返回值包含非空 `UserID`，因此 `backend/internal/security/principal.go:26-28` 的 `Authenticated()` 会返回 `true`。

影响：

- `Authorization: Bearer anything` 即可通过登录校验，获得 member 级权限。
- 这意味着所有仅靠 `RequireAuthenticated()` 保护的写接口，当前都可以被伪造访问。

### P1 高：登录接口没有校验密码，实际上对任意账号直接发放会话

- `backend/internal/modules/auth/service.go:21-22` 登录逻辑只把 `account` 传给仓储层，完全没有处理 `password`。
- `backend/internal/modules/auth/repository.go:34-46` 直接把账号名编码成 `scaffold-access.*` / `scaffold-refresh.*` token 返回。
- 空账号会被回退成 `"member"`，见 `backend/internal/modules/auth/repository.go:35-38`。

影响：

- `/api/v1/auth/login` 当前不是“弱校验”，而是“无校验”。
- 这和上面的 Bearer Token 问题叠加后，整个鉴权链路目前不能作为任何环境下的真实边界。

### P1 高：前端已完全脱离后端，核心页面使用本地常量渲染

- `frontend/src/App.tsx:11-31` 只从 `./content` 导入页面数据。
- `frontend/src/App.tsx:172-186` 直接把 `STORY_ENTRIES`、`THREAD_ENTRIES`、`SPACE_PROFILE_PREVIEW` 等本地常量作为页面数据源。
- `frontend/src/api.ts:105-131` 虽然定义了 `fetchHealth`、`login`、`fetchMyProfile`、`fetchArticles`、`fetchThreads`，但当前代码库里没有任何调用点。
- 代码搜索结果显示，`frontend/src/api.ts` 中这些函数只定义未使用。

影响：

- 当前页面能展示，不代表后端联通、鉴权链路、数据模型或接口契约可用。
- 登录、个人页、文章流、论坛流现在都不是“真实接线”，而是静态演示。
- 这会让联调和验收阶段产生明显错觉：UI 看起来完整，但真实业务路径没有被覆盖。

### P2 中：健康检查会把“配置存在”误报成“服务健康”

- `backend/internal/modules/health/handler.go:22-40` 用 `h.platform.Postgres != nil` 等条件判断外部依赖状态。
- `backend/internal/platform/platform.go:20-46` 只负责组装客户端对象。
- `backend/internal/platform/database/postgres.go:13-19` 和 `backend/internal/platform/cache/redis.go:14-22` 仅在配置非空时返回客户端结构体，并没有建立真实连接或做 ping。

影响：

- 只要填了 DSN / Redis 地址 / MQ URL / 搜索 URL，`/health` 就可能显示依赖“可用”。
- 实际上即使数据库、Redis、RabbitMQ、Meilisearch 不可达，当前健康检查也可能继续报绿。

### P2 中：多个写接口会返回成功，但数据并没有持久化

- 文章接口：
  - `backend/internal/modules/article/repository.go:25-50` 列表是硬编码样例。
  - `backend/internal/modules/article/repository.go:65-104` 创建和更新直接回显输入，不做持久化。
- 论坛接口：
  - `backend/internal/modules/forum/repository.go:25-58` 列表和详情都是硬编码。
  - `backend/internal/modules/forum/repository.go:61-91` 发帖和回帖只返回拼装结果。
- 用户接口：
  - `backend/internal/modules/user/repository.go:35-50` 修改资料只返回修改后的对象，不写入任何存储。
- 展示墙接口：
  - `backend/internal/modules/wall/repository.go:37-52` 投稿和审核只返回结果，不落库。

影响：

- API 会给前端或测试人员“操作成功”的信号，但刷新后状态不会保留。
- 如果前端开始真实接线，这类假成功会比直接报错更难排查。

## 建议处理顺序

1. 先修鉴权边界：
   - 默认关闭 `AUTH_ALLOW_DEBUG_HEADERS`
   - 无效 Bearer Token 必须返回 guest，而不是默认 member
   - 登录必须校验密码或明确限制为开发假登录
2. 再修“假成功”接口：
   - 未实现的写接口宁可返回 `501 Not Implemented`，也不要返回成功态假数据
3. 恢复前后端真实联调：
   - 让首页以外至少有一条完整链路真正走 `frontend/src/api.ts`
4. 最后补可观测性：
   - 健康检查拆成“配置已加载”和“依赖已连通”两个层次

## 本次验证结果

- `frontend`: `npm run build` 通过
- `backend`: `go test ./...` 通过

这说明当前代码“可以编译”，但不代表关键业务链路已经成立。当前项目更像是一个视觉和接口骨架，而不是可依赖的论坛 MVP。
