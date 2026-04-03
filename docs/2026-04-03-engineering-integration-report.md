# 2026-04-03 工程联调报告

## 目标

把前后端基础结构跑通，并让前端页面不再停留在纯占位状态。

## 已完成事项

- 梳理了 `frontend` 与 `backend` 的目录、启动方式、代理关系和接口入口。
- 让前端通过统一 API 层访问后端，开发态由 Vite 代理转发到 Go 服务。
- 处理了前端开发期间反复请求接口的问题，避免了健康检查和内容接口刷屏。
- 调整了首页结构，让页面从“联调测试面板”逐步回到正常内容站入口。

## 影响范围

- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `frontend/vite.config.ts`
- `backend/cmd/api/main.go`
- `backend/internal/http/router/router.go`

## 当前状态

- 前端和后端可分别构建。
- 前端已经具备接口优先读取能力。
- 后端已能暴露站点内容、文章、论坛线程、用户资料等当前页面直接依赖的接口。
