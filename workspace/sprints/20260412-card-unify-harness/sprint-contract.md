# Sprint Contract

## Sprint ID
- `sprint_id`: `20260412-card-unify-harness`
- `date`: `2026-04-13`
- `owner`: `main-agent`
- `contractor_agent_id`: `generator-rework-artifact-restoration`

## Goal
- One-sentence outcome: 统一前端卡片基线样式与关键页面/组件卡片类，并以可追溯证据验证构建与响应式稳定性。

## Scope
- In scope:
1. `frontend/src/styles/base.css` 中卡片基线类（`ui-card-panel` / `ui-card-sub` / `ui-card-interactive`）定义与断点覆盖。
2. 目标页面与共享组件使用统一卡片类的覆盖率核验。
3. 构建日志、覆盖率日志、截图清单与手工检查清单的证据链。
- Out of scope:
1. 认证态 `/space` 高级编辑/多栏业务流程联调。
2. 后端 API、数据模型与非卡片主题重构。

## Deliverables
- File/artifact outputs:
1. `workspace/sprints/20260412-card-unify-harness/sprint-contract.md`
2. `workspace/sprints/20260412-card-unify-harness/generator-output.md`
3. `workspace/sprints/20260412-card-unify-harness/evidence/ac-traceability.md`
- Interface/API/schema changes:
1. None.

## Acceptance Criteria (must be testable)
1. AC1: 构建门禁通过。`npm run build` 需执行 `npm run typecheck && vite build`，并出现 `tsc --noEmit` 与 `✓ built in ...` 成功标记。
2. AC2: 卡片基线类冻结。`base.css` 必须定义并保留 `.ui-card-panel`、`.ui-card-sub`、`.ui-card-interactive` 三类及其 hover/断点规则。
3. AC3: 页面覆盖率达标。目标页面 `Home/Stories/Forum/Anonymous/Space/Gallery/Login/Portal` 在卡片类覆盖统计中均出现且计数 `>=1`。
4. AC4: 共享组件覆盖率达标。目标组件 `AuthPanel/ForumProgressPanel/GalleryShowcase/PaginationBar` 在卡片类覆盖统计中均出现且计数 `>=1`。
5. AC5: 视口矩阵手工检查通过。`/, /stories, /forum, /anonymous, /space, /gallery, /login, /admin` 在 `375/640/768/980/1280` 下 `overflow` 与 `overlap` 均为 `PASS`。
6. AC6: 证据完整且限制显式记录。手工清单每个 route x viewport 行都绑定截图文件名，并显式记录 `/space` 认证高级态未覆盖的边界说明。

## Validation Plan
- Automated checks:
1. 构建证据：`workspace/sprints/20260412-card-unify-harness/evidence/build.log`
2. 卡片基线/类落点证据：`workspace/sprints/20260412-card-unify-harness/evidence/card-baseline-css.log`、`workspace/sprints/20260412-card-unify-harness/evidence/card-class-after.log`
3. 页面/组件覆盖证据：`workspace/sprints/20260412-card-unify-harness/evidence/page-card-coverage.log`、`workspace/sprints/20260412-card-unify-harness/evidence/component-card-coverage.log`
- Manual checks:
1. `workspace/sprints/20260412-card-unify-harness/evidence/manual-checklist.md`
2. `workspace/sprints/20260412-card-unify-harness/evidence/screens/*.png`
- Evidence paths:
1. `workspace/sprints/20260412-card-unify-harness/evidence/ac-traceability.md`

## Risks and Rollback
- Known risks:
1. 仅凭静态预览无法覆盖认证态高级业务分支。
2. 视觉通过不代表动态交互全部无回归。
- Rollback trigger:
1. 任一 AC 缺失证据或证据与 AC 不一致。
- Rollback action:
1. 保留失败证据并进入下一轮 generator 修复，不回滚他人改动。

## Done Definition
- Mark `PASS` only if AC1-AC6 are all satisfied with exact evidence references.
- Main agent keeps final acceptance authority.
