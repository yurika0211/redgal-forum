# Generator Output

## Sprint Metadata
- `sprint_id`: `sprint-20260412-story-detail-layout`
- `generator_agent_id`: `019d81e0-19ea-7c41-958e-32eabb4edc59`
- `rework_agent`: `main-agent (return-package fix)`
- `date`: `2026-04-13`

## Rework Scope
本次为 FAIL 回包修复，只补齐工件与证据链，不修改前端源码逻辑。

## Implementation Code Files (current sprint target)
以下是当前仓库中对应 sprint 的已实现代码文件（本次 rework 未改动）：
1. `frontend/src/pages/StoriesPage.tsx`
2. `frontend/src/styles/pages/stories.css`
3. `frontend/src/App.css`

## Code Evidence Snapshot
- Hero 分区与交互入口：
1. `frontend/src/pages/StoriesPage.tsx:391` (`story-article-hero`)
2. `frontend/src/pages/StoriesPage.tsx:412` (`story-article-hero__meta`)
3. `frontend/src/pages/StoriesPage.tsx:457` (`story-article-hero__actions`)
4. `frontend/src/pages/StoriesPage.tsx:405` (返回按钮)
5. `frontend/src/pages/StoriesPage.tsx:459` (编辑按钮)
6. `frontend/src/pages/StoriesPage.tsx:469` (删除按钮)
7. `frontend/src/pages/StoriesPage.tsx:434` (作者跳转)

- 三栏/双栏/单栏与顺序退化：
1. `frontend/src/pages/StoriesPage.tsx:490` (`--no-toc` class 分支)
2. `frontend/src/styles/pages/stories.css:155` (三栏)
3. `frontend/src/styles/pages/stories.css:160` (无 TOC 双栏)
4. `frontend/src/styles/pages/stories.css:338` (`<=1120` 单栏)
5. `frontend/src/styles/pages/stories.css:344`~`353` (正文->TOC->作者卡顺序)

- Sticky 与锚点联动：
1. `frontend/src/styles/pages/stories.css:9` (`--story-detail-sticky-top-safe`)
2. `frontend/src/styles/pages/stories.css:10` (`100dvh` 侧栏高度上限)
3. `frontend/src/styles/pages/stories.css:170`~`172` (作者卡/TOC sticky 统一)
4. `frontend/src/styles/pages/stories.css:281` (标题 `scroll-margin-top`)
5. `frontend/src/App.css:33`~`36` (header/sticky/anchor 变量)
6. `frontend/src/App.css:49`~`62` (1120/640 断点联动)

- 正文可读性与溢出策略：
1. `frontend/src/styles/pages/stories.css:3` (68ch-74ch)
2. `frontend/src/styles/pages/stories.css:261` (正文宽度约束)
3. `frontend/src/styles/pages/stories.css:296`~`316` (图片/视频/iframe)
4. `frontend/src/styles/pages/stories.css:318`~`325` (pre/table/长词换行)

## Diff Summary (target files)
`git diff --stat -- frontend/src/pages/StoriesPage.tsx frontend/src/styles/pages/stories.css frontend/src/App.css`

Result:
- `frontend/src/App.css` 48 lines changed
- `frontend/src/pages/StoriesPage.tsx` 233 lines changed
- `frontend/src/styles/pages/stories.css` 635 lines changed
- Total: `762 insertions(+), 154 deletions(-)`

## Automated Verification
Executed on `2026-04-13`:

1. `cd frontend && npm run typecheck`
- Exit code: `0`
- Evidence: `workspace/sprints/sprint-20260412-story-detail-layout/typecheck.log`
- Key output: `tsc --noEmit` completed without diagnostics.

2. `cd frontend && npm run test`
- Exit code: `0`
- Evidence: `workspace/sprints/sprint-20260412-story-detail-layout/test.log`
- Key output: `4 files / 21 tests passed`.

3. `cd frontend && npm run build`
- Exit code: `0`
- Evidence: `workspace/sprints/sprint-20260412-story-detail-layout/build.log`
- Key output: `vite build` success, finished with `built in 8.20s`.

## Manual Evidence (Verification-by-Inspection)
说明：以下 EV-MAN 证据为代码与断点规则静态核验记录，不是浏览器截图回放。

### EV-MAN-01 Viewport Matrix (layout by breakpoint rules)

| Viewport | Expected layout (inspection) | Evidence |
|---|---|---|
| 1440 | 有 TOC 三栏；无 TOC 双栏；侧栏 sticky | `stories.css:155`, `stories.css:160`, `stories.css:170` |
| 1280 | 同 1440，保持桌面多栏 | `stories.css:151`, `stories.css:155`, `stories.css:160` |
| 1120 | 触发单栏退化；顺序正文->TOC->作者卡；侧栏去 sticky | `stories.css:338`, `stories.css:344`, `stories.css:348`, `stories.css:352`, `stories.css:361` |
| 1024 | 单栏规则持续生效 | `stories.css:338`~`367` |
| 768 | 单栏，正文宽度取消上限 | `stories.css:356`~`359` |
| 640 | hero/meta/actions 压缩并保持触控尺寸；header/sticky 变量切到移动值 | `stories.css:919`~`955`, `App.css:56`~`62` |
| 390 | 延续 640 规则，主阅读区优先，无 sticky 侧栏干扰 | `stories.css:338`~`367`, `stories.css:919`~`985` |

结论：断点策略满足 contract 中视口矩阵要求（基于代码规则判定）。

### EV-MAN-02 Scenario Matrix (content-state inspection)

| Scenario | Inspection result | Evidence |
|---|---|---|
| 有 TOC | 渲染目录侧栏，layout 保持多栏/单栏分支 | `StoriesPage.tsx:537`, `stories.css:155`, `stories.css:338` |
| 无 TOC | 应用 `story-article-sheet__layout--no-toc` 双栏退化 | `StoriesPage.tsx:490`, `stories.css:160` |
| 长文多标题 | 标题可生成 TOC，正文 heading 具锚点偏移 | `StoriesPage.tsx:367`, `StoriesPage.tsx:541`, `stories.css:279`~`281` |
| 超长 bio | bio/name/username 启用断词策略，卡片留最小结构 | `StoriesPage.tsx:377`, `stories.css:208`~`229` |
| 无头像 | 头像区域回退为作者名首字母，占位尺寸固定 | `StoriesPage.tsx:486`~`497` |
| 多标签 | 标签区 `flex-wrap`，可多行展示 | `StoriesPage.tsx:445`, `stories.css:108`~`115` |
| 含 iframe | `iframe` 100% 宽 + 比例约束 + 移动端最小高度 | `stories.css:310`~`316`, `stories.css:972`~`974` |

结论：内容场景规则覆盖 contract 指定矩阵（基于代码路径判定）。

### EV-MAN-03 Sticky + Anchor Inspection

1. sticky top 来源统一：`App.css:33`~`36` -> `stories.css:9`。
2. 作者卡和 TOC 共同使用 sticky + max height：`stories.css:168`~`173`。
3. 侧栏高度上限基于 `100dvh`：`stories.css:10`。
4. 在 `<=1120` 下取消 sticky 以避免移动端抖动：`stories.css:361`~`367`。
5. 标题锚点偏移链路：`App.css:36/61` -> `stories.css:11`~`13` -> `stories.css:281`。
6. TOC 键盘焦点可见：`stories.css:433`~`437`。

结论：sticky 与 anchor 逻辑完整且变量联动闭环（基于代码链路判定）。

### EV-MAN-04 Mobile Touch and Reading Order Inspection

1. `<=1120` 阅读顺序：正文(`order:1`) -> TOC(`order:2`) -> 作者卡(`order:3`)。
   - Evidence: `stories.css:344`~`353`
2. 按钮触控最小高度 `>=44px`：
   - hero actions: `stories.css:136`~`137`, `stories.css:952`~`955`
   - hero nav: `stories.css:929`~`931`
   - 作者卡入口: `stories.css:231`~`233`
3. 移动端 actions 可换行并保持可点击面积：
   - `stories.css:127`~`133`, `stories.css:946`~`955`

结论：移动端阅读主线与触控可用性满足 AC-05（基于样式规则判定）。

## Rework Deliverable Status
1. `planner-spec.md`: created
2. `sprint-contract.md`: created
3. `generator-output.md`: created (this file)
4. `evaluator-report.md`: placeholder created for final evaluator overwrite
5. `main-acceptance.md`: placeholder created
6. `final-report.md`: placeholder created
7. `typecheck.log`/`test.log`/`build.log`: created with fresh run evidence
