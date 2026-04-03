# 2026-04-03 登录与环境排障报告

日期：2026-04-03

## 一、问题背景

今天排查了一个实际联调问题：

- 文档中列出的 `demo_*` 测试账号在数据库中存在
- 但前端登录 `demo_admin` 时返回 `invalid credentials`

## 二、排查结论

问题不在账号本身，而在当前运行中的后端实例没有连上数据库。

直接访问本地后端健康检查后发现：

- `postgres.configured = false`
- `postgres.reachable = false`

因此当前 `8080` 上的后端并不会去数据库验证 `demo_admin`，而是退回到脚手架密码逻辑，所以输入数据库中的测试密码会被判定为无效。

## 三、已确认事实

### 1. 测试账号真实存在

已直接查询本地 PostgreSQL：

- `demo_unverified`
- `demo_member`
- `demo_admin`
- `demo_super_admin`
- `demo_moderator`

这些账号都在数据库里，且密码格式与当前后端逻辑兼容。

### 2. 当前后端不自动加载 `.env`

当前后端配置只读取进程环境变量，不会自动读取 `.env` 文件。

这意味着：

- 仅仅创建 `.env` 文件不够
- 必须在启动 `go run` 前把变量 `source` 进当前 shell

### 3. 示例配置已修正

已把：

- `backend/.env.example`

中的 `POSTGRES_DSN` 修正为本地容器映射端口 `5433`，避免继续误导开发环境配置。

## 四、修复建议

如果本地直接运行后端，应使用类似下面的方式启动：

```bash
cd backend
set -a
source ../.env
set +a
go run ./cmd/api/main.go
```

或显式传入：

```bash
POSTGRES_DSN='postgres://postgres:postgres@127.0.0.1:5433/rubedo?sslmode=disable' go run ./cmd/api/main.go
```

## 五、涉及文件

- `backend/.env.example`
- `backend/internal/config/config.go`
- `backend/internal/modules/auth/repository.go`
- `docs/seeded-user-accounts-report.md`

## 六、结果

- 已确认 `demo_*` 账号本身没有问题
- 已确认登录失败的原因是运行实例未连库，而不是账号错误
