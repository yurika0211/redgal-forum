# Planner Spec

## Sprint ID
- `sprint_id`: `20260412-card-unify-harness`
- `planner_agent_id`: `019d81d7-982d-7c42-816e-228835c2b121`

## Problem Expansion
- User request (raw): 用harness帮我调整一下前端各个页面中各个界面的卡片，使得其整齐统一，没有重叠。
- Clarified objective:
  - 在不改变既有主题风格与信息架构的前提下，统一卡片基线样式。
  - 降低多断点下卡片重叠/挤压风险，覆盖 `/`、`/stories`、`/forum`、`/anonymous`、`/space`、`/gallery`、`/login`、`/admin`。
- Explicit assumptions:
  - 允许增加全局卡片类并以最小改动落地。
  - 可以通过构建日志 + 覆盖率日志 + 截图清单做验收证据。
- Non-goals:
  - 不改后端/API/DB。
  - 不做整站重设计与业务逻辑重构。

## Executable Scope
- Work items:
1. 在 `frontend/src/styles/base.css` 建立统一卡片类：`ui-card-panel`、`ui-card-sub`、`ui-card-interactive`。
2. 补齐关键页面/组件的卡片类覆盖并记录覆盖率证据。
3. 调整 `space.css`、`gallery.css` 的高风险布局点，降低重叠与挤压。
4. 生成构建、覆盖、截图与人工检查证据，并形成 AC 对应追溯矩阵。

## Risks
- Risk: 认证态页面无法在静态预览中完整覆盖。
- Impact: `/space` 高级编辑态只能标注边界限制。
- Mitigation: 在手工清单中显式记录限制，并继续覆盖可访问状态。

- Risk: 现有工作区存在大量脏改动。
- Impact: 版本管理阶段容易误纳入无关修改。
- Mitigation: 仅提交 sprint 工件，避免污染他人改动。

## Proposed Validation Strategy
- Unit/integration/manual checks:
  - `npm --prefix frontend run build`
  - `rg` 统计卡片类定义与落点覆盖
  - 路由 x 断点截图矩阵与人工清单
- Evidence expected:
  - `evidence/build.log`
  - `evidence/card-*.log`
  - `evidence/page-card-coverage.log`
  - `evidence/component-card-coverage.log`
  - `evidence/screens/*.png`
  - `evidence/manual-checklist.md`
  - `evidence/ac-traceability.md`

## Handoff to Sprint-Contractor
- Required contract fields:
  - 明确 AC1-AC6 与可追溯证据路径。
  - 明确 PASS/FAIL 的阈值和边界限制记录要求。
- Ambiguities to resolve:
  - 认证态不可达场景是否允许以限制说明替代完整覆盖（结论：允许但必须明示）。
