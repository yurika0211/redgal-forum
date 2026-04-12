# Sprint Contract

## Sprint ID
- `sprint_id`: `sprint-20260413-bg-opacity-scroll`
- `date`: `2026-04-13`
- `owner`: `main-agent`
- `contractor_agent_id`: `019d8284-2c59-7062-b150-be59b7434c9f`

## Goal
- One-sentence outcome: 在全局背景中将透明度调整为 `0.2`，并新增可感知的纵向上下滚动动效，同时保留现有 crossfade 背景切换。

## Scope
- In scope:
  - 仅修改 `frontend/src/styles/base.css`。
  - `.background-stage` 透明度固定为 `0.2`。
  - `.background-slide` 保留 `background-crossfade`，并叠加纵向滚动效果（使用 `background-position-y` 动画）。
  - `.background-overlay` 叠加纵向漂移动画（`translateY`）。
  - 增加 `prefers-reduced-motion: reduce` 降级，禁用新增滚动动效。
- Out of scope:
  - 不修改 React 结构和业务逻辑。
  - 不重做主题配色和页面组件样式。
  - 不新增 JS 动画逻辑与依赖。

## Deliverables
- File/artifact outputs:
  - 代码变更：`frontend/src/styles/base.css`
  - 工件：
    - `workspace/sprints/sprint-20260413-bg-opacity-scroll/generator-output.md`
    - `workspace/sprints/sprint-20260413-bg-opacity-scroll/evaluator-report.md`
    - `workspace/sprints/sprint-20260413-bg-opacity-scroll/main-acceptance.md`
    - `workspace/sprints/sprint-20260413-bg-opacity-scroll/final-report.md`
  - 证据：
    - `/tmp/sprint-20260413-bg-opacity-scroll/build.log`
    - `/tmp/sprint-20260413-bg-opacity-scroll/desktop-1440x900.png`
    - `/tmp/sprint-20260413-bg-opacity-scroll/mobile-390x844.png`
    - `/tmp/sprint-20260413-bg-opacity-scroll/diff.txt`
- Interface/API/schema changes:
  - 无。

## Acceptance Criteria (must be testable)
1. `frontend/src/styles/base.css` 中 `.background-stage` 含 `opacity: 0.2`。
2. `.background-slide` 的 `animation` 同时包含 `background-crossfade` 和新增纵向滚动 keyframe，且 `background-crossfade` 未被移除。
3. `.background-overlay` 启用新增纵向滚动 keyframe。
4. `@media (prefers-reduced-motion: reduce)` 中禁用新增纵向滚动效果（但不强制禁用 crossfade）。
5. `cd frontend && npm run build` 成功（exit code 0）。
6. 产出桌面与移动截图，目视可见背景更淡且无内容层透明度异常。

## Validation Plan
- Automated checks:
  - `cd frontend && npm run build > /tmp/sprint-20260413-bg-opacity-scroll/build.log 2>&1`
  - `rg -n "background-stage|background-slide|background-overlay|opacity: 0.2|prefers-reduced-motion|background-crossfade|background-vertical" frontend/src/styles/base.css`
- Manual checks:
  - 无头浏览器抓图：`1440x900` 和 `390x844`。
  - 目视确认背景纵向滚动存在且幅度温和。
- Evidence paths:
  - `/tmp/sprint-20260413-bg-opacity-scroll/build.log`
  - `/tmp/sprint-20260413-bg-opacity-scroll/desktop-1440x900.png`
  - `/tmp/sprint-20260413-bg-opacity-scroll/mobile-390x844.png`
  - `/tmp/sprint-20260413-bg-opacity-scroll/diff.txt`

## Risks and Rollback
- Known risks:
  - 背景过淡导致层次感下降。
  - 动效幅度过大影响阅读稳定性。
- Rollback trigger:
  - 背景几乎不可见、动效造成明显干扰、或构建失败。
- Rollback action:
  - 回退 `frontend/src/styles/base.css` 本次新增规则。

## Done Definition
- Mark `PASS` only if all acceptance checks pass with evidence.
- Main agent keeps final acceptance authority.
