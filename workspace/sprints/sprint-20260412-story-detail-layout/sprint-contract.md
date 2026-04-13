# Sprint Contract

## Sprint ID
- `sprint_id`: `sprint-20260412-story-detail-layout`
- `date`: `2026-04-13`
- `owner`: `main-agent`
- `contractor_agent_id`: `019d81dc-f460-7321-9c16-baf05f373261`

## Goal
- One-sentence outcome: 文章详情页在桌面与移动端均实现阅读优先布局，且关键交互无回归。

## Scope
- In scope:
1. `frontend/src/pages/StoriesPage.tsx`（详情页 hero 和正文/侧栏结构）
2. `frontend/src/styles/pages/stories.css`（布局、sticky、TOC、响应式）
3. `frontend/src/App.css`（header offset 与 sticky/anchor 变量联动）
4. `workspace/sprints/sprint-20260412-story-detail-layout/*`（证据工件与日志）
- Out of scope:
1. 文章列表页、编辑器页和后端 API 逻辑
2. 新增 scroll-spy 或其它新交互
3. 全局品牌视觉重做

## Deliverables
- File/artifact outputs:
1. `workspace/sprints/sprint-20260412-story-detail-layout/planner-spec.md`
2. `workspace/sprints/sprint-20260412-story-detail-layout/sprint-contract.md`
3. `workspace/sprints/sprint-20260412-story-detail-layout/generator-output.md`
4. `workspace/sprints/sprint-20260412-story-detail-layout/evaluator-report.md`
5. `workspace/sprints/sprint-20260412-story-detail-layout/main-acceptance.md`
6. `workspace/sprints/sprint-20260412-story-detail-layout/final-report.md`
7. `workspace/sprints/sprint-20260412-story-detail-layout/typecheck.log`
8. `workspace/sprints/sprint-20260412-story-detail-layout/test.log`
9. `workspace/sprints/sprint-20260412-story-detail-layout/build.log`
- Interface/API/schema changes:
1. None.

## Acceptance Criteria (must be testable)
1. AC-01: Hero 信息层级重排完成，标题优先，返回/编辑/删除/作者跳转入口保留。
2. AC-02: 正文阅读宽度受控于 `68ch-74ch`，长词和媒体不溢出。
3. AC-03: 布局退化正确（有 TOC 三栏、无 TOC 双栏、`<=1120` 单栏）。
4. AC-04: 作者卡和 TOC 共用 sticky top 变量，侧栏高度上限基于 `100dvh`。
5. AC-05: `<=1120` 顺序为正文 -> TOC -> 作者卡；`<=640` 操作区可换行且触控高度 `>=44px`。
6. AC-06: TOC 提供层级缩进、长标题换行与 `:focus-visible` 可见反馈。
7. AC-07: 正文标题锚点具备 `scroll-margin-top`，与 header/sticky 变量联动。
8. AC-08: `typecheck/test/build` 全部通过。

## Validation Plan
- Automated checks:
1. `cd frontend && npm run typecheck`
2. `cd frontend && npm run test`
3. `cd frontend && npm run build`
- Manual checks:
1. EV-MAN-01 视口矩阵（`1440/1280/1120/1024/768/640/390`）
2. EV-MAN-02 场景矩阵（有/无 TOC、长文、超长 bio、无头像、多标签、iframe）
3. EV-MAN-03 sticky 与锚点联动检查
4. EV-MAN-04 移动端顺序与触控尺寸检查
- Evidence paths:
1. `workspace/sprints/sprint-20260412-story-detail-layout/generator-output.md`
2. `workspace/sprints/sprint-20260412-story-detail-layout/typecheck.log`
3. `workspace/sprints/sprint-20260412-story-detail-layout/test.log`
4. `workspace/sprints/sprint-20260412-story-detail-layout/build.log`

## Risks and Rollback
- Known risks:
1. 与主题覆盖层叠冲突。
2. sticky 在边界视口出现不一致。
3. 长标题/标签导致拥挤。
- Rollback trigger:
1. 自动化检查失败。
2. 关键交互回归。
3. 任一 AC 无法提供证据。
- Rollback action:
1. 仅回退本 sprint 目标文件（`StoriesPage.tsx`、`stories.css`、`App.css`）相关提交。
2. 保留失败证据并进入下一轮 generator 修复。

## Done Definition
- Mark `PASS` only if all acceptance checks pass with evidence.
- Main agent keeps final acceptance authority.
