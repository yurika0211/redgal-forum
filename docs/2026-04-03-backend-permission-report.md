# 2026-04-03 后端用户分级与权限体系报告

日期：2026-04-03

## 一、工作范围

本报告覆盖今天对后端“用户分级、认证状态、权限判断、管理员能力”的真实实现工作。

## 二、已完成事项

### 1. 用户等级落地

已把用户分级从文档层落到后端数据与鉴权层，包含：

- `guest`
- `unverified_user`
- `member`
- `admin`
- `super_admin`

### 2. Principal 扩展

登录态上下文 `Principal` 已新增：

- `user_status`
- `verified`
- `roles`

### 3. Token 与登录行为

- 登录成功后签发的脚手架 token 已不再只携带用户名，而是携带完整 claims。
- 中间件已能从 token 中解析出角色与认证状态。
- 若数据库中存在真实账号，则优先从数据库读取用户状态、角色列表和密码。

### 4. 认证用户与未认证用户的权限边界

已新增 `RequireVerifiedUser()`，将“已登录”和“已认证”真正区分开。

要求已认证的接口包括：

- `/users/me`
- 文章创建/修改
- 发帖/回帖
- 展示墙投稿
- Bangumi 导入

### 5. 管理员能力

已补上管理员真实接口：

- 查看管理员 dashboard
- 查看用户列表
- 修改用户状态
- 审批认证状态
- 删文章
- 删帖
- 删回复

### 6. 超级管理员能力

已新增独立 `super-admin` dashboard 接口。

## 三、认证审批规则

已按需求落地：

- 一个用户通过认证，需要至少三个管理员审批通过
- 或由超级管理员直接通过

## 四、涉及文件

- `DB/schema.sql`
- `backend/internal/security/principal.go`
- `backend/internal/security/token.go`
- `backend/internal/middleware/auth.go`
- `backend/internal/modules/auth/*`
- `backend/internal/modules/user/*`
- `backend/internal/modules/article/*`
- `backend/internal/modules/forum/*`
- `backend/internal/http/router/router.go`

## 五、验证

- 后端测试通过：`go test ./...`

## 六、结果

- 权限系统已从“脚手架角色字符串”进入“可落库、可路由守卫、可接口管理”的阶段。
