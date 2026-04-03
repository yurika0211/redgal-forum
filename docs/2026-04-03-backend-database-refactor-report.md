# 2026-04-03 数据库与后端改造报告

## 目标

把当前页面直接依赖的后端数据，从脚手架硬编码返回改成数据库优先读取。

## 已完成事项

- 将 PostgreSQL 客户端从“仅保存 DSN”改成真正的 `database/sql` 连接。
- 新增数据库辅助方法，用于补建用户和统一生成 slug。
- 将以下模块改成“数据库优先，缺库时兜底”：
  - 文章模块
  - 论坛模块
  - 用户资料模块
- 新增 `sitecontent` 模块，用于承接首页、社团介绍页、展示墙等站点内容。

## 当前已数据库化的页面数据

- 文章列表与文章详情
- 论坛主题列表与主题详情
- 用户公开资料
- 首页/社团介绍/展示墙内容

## 关键文件

- `backend/internal/platform/database/postgres.go`
- `backend/internal/platform/database/helpers.go`
- `backend/internal/modules/article/repository.go`
- `backend/internal/modules/forum/repository.go`
- `backend/internal/modules/user/repository.go`
- `backend/internal/modules/sitecontent/repository.go`

## 结果

- 当前页面主要内容已具备真实数据库支撑。
- 后端不再只依赖脚手架假数据。
