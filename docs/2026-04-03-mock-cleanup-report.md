# 2026-04-03 Mock 清理报告

## 目标

移除当前页面链路中原本用于占位和展示的 mock / scaffold / fallback 内容，避免页面在数据库或接口异常时仍悄悄展示假数据。

## 已清理的前端 mock

### 已移除的静态内容依赖

前端页面不再依赖以下静态内容作为页面真实数据源：

- 社团介绍内容
- 首页卡片内容
- 假文章列表
- 假讨论串列表
- 假展示墙条目
- 假个人空间资料
- 本地聊天室 seed 消息
- “编辑台短札”这类假内容卡片

### `content.ts` 当前状态

`frontend/src/content.ts` 已收缩为只保留：

- 导航项
- 默认公开资料用户名常量

## 已清理的后端 mock

### 当前页面相关模块

以下模块在“数据库不可用”时，不再返回假数据：

- 文章列表与详情
- 论坛列表与详情
- 用户资料
- 展示墙列表

现在数据库不可用时会直接返回错误，而不是悄悄 fallback 到硬编码内容。

## 仍保留的 scaffold 范围

当前仓库中仍可能保留 scaffold / mock 逻辑的区域：

- 活动模块
- Luckybot
- 其它未接入当前页面主链路的模块

本次清理重点仅覆盖当前前端页面实际使用的主链路。

## 结果

- 页面不再暗中依赖旧静态假内容。
- 当前页面的数据来源已经尽量收敛到真实后端接口和数据库。

## 关键文件

- `frontend/src/content.ts`
- `frontend/src/App.tsx`
- `backend/internal/modules/article/repository.go`
- `backend/internal/modules/forum/repository.go`
- `backend/internal/modules/user/repository.go`
- `backend/internal/modules/wall/repository.go`
