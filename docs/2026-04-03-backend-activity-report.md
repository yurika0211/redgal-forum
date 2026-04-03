# 2026-04-03 后端活动系统与高权限接口报告

日期：2026-04-03

## 一、工作范围

本报告覆盖今天新增的活动系统与高权限接口，包括：

- 接龙系统
- 征文系统
- 超级管理员 dashboard 扩展

## 二、已完成事项

### 1. 接龙系统

新增了独立活动模块中的接龙能力：

- 查询接龙列表
- 查询单个接龙详情
- 管理员创建接龙
- 管理员修改接龙状态
- 已登录用户参与基础接龙

说明：

- 基础接龙允许未认证已登录用户参与
- 具体是否允许未认证参与，还可由接龙配置 `allow_unverified` 控制

### 2. 征文系统

新增了独立活动模块中的征文能力：

- 查询征文列表
- 查询征文详情
- 管理员创建征文
- 管理员修改征文状态
- 已认证用户投稿

投稿支持两种来源：

- 直接正文投稿
- 引用站内文章转投

### 3. 超级管理员 dashboard 扩展

在管理员 dashboard 基础上，超级管理员 dashboard 额外统计：

- 接龙数量
- 接龙条目数
- 征文数量
- 征文投稿数
- 未处理举报数
- 站点内容块数量
- 展示墙条目数量
- Luckybot 会话数量
- Luckybot 管理动作数量

### 4. 健康检查模块列表补充

健康检查返回的模块列表中已经包含：

- `activity`
- `sitecontent`

## 三、数据库结构

为活动系统新增了：

- `relay_events`
- `relay_entries`
- `writing_contests`
- `writing_submissions`

以及配套枚举：

- `relay_status`
- `contest_status`
- `contest_submission_status`
- `contest_submission_source`

还补了活动种子数据和触发器。

## 四、接口层

新增公开接口：

- `GET /api/v1/activities/relays`
- `GET /api/v1/activities/relays/:relayID`
- `GET /api/v1/activities/contests`
- `GET /api/v1/activities/contests/:contestID`

新增参与接口：

- `POST /api/v1/activities/relays/:relayID/entries`
- `POST /api/v1/activities/contests/:contestID/submissions`

新增管理接口：

- `POST /api/v1/admin/activities/relays`
- `PATCH /api/v1/admin/activities/relays/:relayID/status`
- `POST /api/v1/admin/activities/contests`
- `PATCH /api/v1/admin/activities/contests/:contestID/status`

新增超级管理员接口：

- `GET /api/v1/super-admin/dashboard`

## 五、涉及文件

- `DB/schema.sql`
- `backend/internal/modules/activity/*`
- `backend/internal/modules/user/types.go`
- `backend/internal/modules/user/repository.go`
- `backend/internal/http/router/router.go`
- `backend/internal/modules/health/handler.go`

## 六、验证

- 后端测试通过：`go test ./...`

## 七、结果

- 项目已经具备活动系统后端雏形。
- 接龙、征文和超级管理员全站视角能力均已进入可调用状态。
