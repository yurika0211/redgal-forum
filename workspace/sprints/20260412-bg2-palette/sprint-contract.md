# Sprint Contract

## Sprint ID
- `sprint_id`: `20260412-bg2-palette`
- `date`: `2026-04-13`
- `owner`: `main-agent`
- `contractor_agent_id`: `019d81e4-ba2f-73e2-b172-066c2c55e812`

## Goal
- One-sentence outcome: 以 `bg2.png` 配色统一前端 day/night 风格并保持构建通过。

## Scope
- In scope:
1. `frontend/src/index.css`（仅导入 override）。
2. `frontend/src/styles/themes/bg2-harmony-override.css`（新文件）。
3. `workspace/sprints/20260412-bg2-palette/*` 证据文件。
- Out of scope:
1. 不修改其他 CSS/TSX/业务代码。

## Deliverables
- File/artifact outputs:
1. `frontend/src/index.css`
2. `frontend/src/styles/themes/bg2-harmony-override.css`
3. `workspace/sprints/20260412-bg2-palette/` 下验证产物
- Interface/API/schema changes:
1. None.

## Acceptance Criteria (must be testable)
1. 仅新增本次允许路径变更。
2. `index.css` 恰好 1 处导入 `bg2-harmony-override.css`。
3. override 包含 day/night token 和关键变量：`--color-primary`、`--surface-base`、`--text-main`、`--line-soft`、`--workspace-sidebar-border`。
4. override 覆盖背景、共享容器、sidebar、form/button 状态。
5. `App.css` 哈希一致（未被修改）。
6. `cd frontend && npm run build` 成功。

## Validation Plan
- Automated checks:
1. `rg -n "bg2-harmony-override\\.css" frontend/src/index.css`
2. `rg -n -- 'data-theme="day"|data-theme="night"|--color-primary|--surface-base|--text-main|--workspace-sidebar-border|--line-soft' frontend/src/styles/themes/bg2-harmony-override.css`
3. `rg -n -- 'background-stage|background-slide|background-overlay|hero|panel|card|modal|sidebar|input|textarea|select|button' frontend/src/styles/themes/bg2-harmony-override.css`
4. `sha256sum frontend/src/App.css` 前后比较
5. `cd frontend && npm run build`
- Manual checks:
1. `/`, `/portal`, `/forum`, `/stories`, `/space`, `/gallery`, `/anonymous`, `/login` 的 day/night 可读性。
- Evidence paths:
1. `workspace/sprints/20260412-bg2-palette/*`

## Risks and Rollback
- Known risks:
1. 高特异性规则冲突。
2. 夜间对比不够。
- Rollback trigger:
1. 构建失败或视觉明显退化。
- Rollback action:
1. 回退 `frontend/src/index.css` 导入。
2. 删除 `frontend/src/styles/themes/bg2-harmony-override.css`。

## Done Definition
- Mark `PASS` only if all acceptance checks pass with evidence.
- Main agent keeps final acceptance authority.
