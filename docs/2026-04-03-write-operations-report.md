# 2026-04-03 写操作补全报告

## 目标

把原本只有展示功能的页面补成真正可操作的页面，让文章、论坛和展示墙不再只是“看得到”，而是“能提交”。

## 已补齐的前端操作

### 文章札记页

- 新增“发布文章”表单
- 对接 `POST /api/v1/articles`
- 支持：
  - 标题
  - 摘要
  - 正文
  - 标签
  - 可见范围

### 论坛页

- 新增“发布主题”表单
- 对接 `POST /api/v1/forum/threads`
- 新增“回复主题”表单
- 对接 `POST /api/v1/forum/threads/:threadID/replies`
- 详情页现在可展示真实回复列表

### 展示墙页

- 新增“提交投稿”表单
- 对接 `POST /api/v1/wall/submissions`
- 展示墙页面可显示已发布内容列表

## 已补齐的后端能力

- 开发态种子账号可直接使用脚手架密码登录。
- 展示墙投稿由 `NotImplemented` 改为真实落库。
- 论坛发帖流程修正了分区匹配逻辑。
- 文章和论坛写入路径已完成运行验证。

## 运行验证结果

以下动作已实际验证成功：

- 登录
- 发布文章
- 发布主题
- 回复主题
- 提交展示墙投稿

## 当前未完成部分

- 仍未实现真正的本地文件上传。
- 展示墙投稿目前提交的是图片 URL 列表，而不是上传文件。

## 关键文件

- `frontend/src/App.tsx`
- `frontend/src/api.ts`
- `backend/internal/modules/article/repository.go`
- `backend/internal/modules/forum/repository.go`
- `backend/internal/modules/wall/repository.go`
- `backend/internal/modules/auth/repository.go`
