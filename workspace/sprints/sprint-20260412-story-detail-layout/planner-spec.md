# Planner Spec

## Sprint ID
- `sprint_id`: `sprint-20260412-story-detail-layout`
- `planner_agent_id`: `019d81d9-89da-70c0-986a-0072de4ba812`

## Problem Expansion
- User request (raw): 用 harness 精修文章详情页面，优化布局。
- Clarified objective: 在不改后端和交互入口的前提下，将文章详情页调整为阅读优先布局，强化信息层级、正文可读性和响应式稳定性。
- Explicit assumptions:
1. 仅处理文章详情页（`selectedArticleID` 分支）及其样式变量联动。
2. 不新增第三方 UI 库，不改 API 契约。
3. 保持返回、编辑、删除、作者跳转、目录锚点可用。
- Non-goals:
1. 不改文章列表页和编辑器业务逻辑。
2. 不做全站视觉重设计。
3. 不新增 scroll-spy 等新交互。

## Executable Scope
- Work items:
1. 在 `stories.css` 建立详情页布局变量（column/spacing/sticky/anchor）。
2. 在 `StoriesPage.tsx` 重排 hero 信息结构（标题、meta、标签、操作）。
3. 优化正文主列阅读宽度、媒体溢出和标题锚点偏移。
4. 完成三栏/双栏/单栏退化规则以及 `--no-toc` 分支。
5. 统一作者卡和目录 sticky 偏移与高度上限。
6. 在 `App.css` 对齐 header offset 与断点变量（1120/640）。

## Risks
- Risk: 样式层叠与主题覆盖冲突。
- Impact: 局部规则可能不生效或表现不一致。
- Mitigation: 以 CSS 变量联动为主，降低硬编码并保留兼容 fallback。

- Risk: sticky 在部分视口抖动或遮挡顶栏。
- Impact: 目录/作者卡可用性下降。
- Mitigation: 统一 `--story-detail-sticky-top`，用 `100dvh` 计算上限并在移动端降级为非 sticky。

- Risk: 长文本和媒体破版。
- Impact: 阅读体验退化。
- Mitigation: 加入 `overflow-wrap/word-break/max-width/aspect-ratio` 规则。

## Proposed Validation Strategy
- Unit/integration/manual checks:
1. `cd frontend && npm run typecheck`
2. `cd frontend && npm run test`
3. `cd frontend && npm run build`
4. 视口矩阵检查（`1440/1280/1120/1024/768/640/390`）按断点规则做结构化核对。
5. 场景矩阵检查（有/无 TOC、长文、超长 bio、无头像、多标签、含 iframe）按代码路径核对。
- Evidence expected:
1. `workspace/sprints/sprint-20260412-story-detail-layout/sprint-contract.md`
2. `workspace/sprints/sprint-20260412-story-detail-layout/generator-output.md`
3. `workspace/sprints/sprint-20260412-story-detail-layout/typecheck.log`
4. `workspace/sprints/sprint-20260412-story-detail-layout/test.log`
5. `workspace/sprints/sprint-20260412-story-detail-layout/build.log`

## Handoff to Sprint-Contractor
- Required contract fields:
1. 明确 AC-01..AC-08 可测试条目。
2. 明确 EV-CODE/EV-AUTO/EV-MAN 证据映射。
3. 明确 rollback 触发条件和动作。
- Ambiguities to resolve:
1. 无 TOC 场景在桌面端采用双栏，移动端统一单栏顺序。
2. sticky top 与 anchor offset 在 1120/640 断点是否需要不同常量。
