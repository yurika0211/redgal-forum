# Planner Spec

## Sprint ID
- `sprint_id`: `20260412-bg2-palette`
- `planner_agent_id`: `019d81e0-aee1-7cb0-9ddf-e48c6ac22d26`

## Problem Expansion
- User request (raw): 用harness帮我优化整个前端的配色，参考bg2.png的配色。
- Clarified objective: 用 `bg2.png` 的暖灯橙/深绯红/炭黑/浅粉/象牙色调，统一前端 day/night 视觉语义并保持可读性。
- Explicit assumptions:
1. 主题切换使用 `html[data-theme="day"|"night"]`。
2. 通过新增 override 文件可在不改动大量脏文件的情况下完成全局配色覆盖。
3. 仅做配色和视觉层，不改业务行为。
- Non-goals:
1. 不改 TSX 逻辑、路由、接口。
2. 不做布局重构。
3. 不替换图片素材。

## Executable Scope
- Work items:
1. 新增 `frontend/src/styles/themes/bg2-harmony-override.css`，定义 day/night token。
2. 在入口样式 `frontend/src/index.css` 导入 override。
3. 覆盖背景氛围、共享面板/卡片、sidebar、form/button、关键页面组件。
4. 生成验证证据并执行 `npm run build`。

## Risks
- Risk: 旧主题高特异性和 `!important` 抢占。
- Impact: 局部覆盖不生效。
- Mitigation: 在 override 文件中使用更明确选择器并对冲突点做受控 `!important`。

- Risk: 现有工作区已脏，范围容易越界。
- Impact: 影响用户在做的其他改动。
- Mitigation: 冻结只改 `index.css` + 新增 override 文件。

## Proposed Validation Strategy
- Unit/integration/manual checks:
1. 导入命中检查。
2. token 命中检查。
3. 背景/容器/sidebar/form/button 覆盖命中检查。
4. `App.css` 哈希前后一致。
5. `cd frontend && npm run build`。
- Evidence expected:
1. `workspace/sprints/20260412-bg2-palette/` 下检查日志和快照。

## Handoff to Sprint-Contractor
- Required contract fields:
1. 写入范围冻结。
2. 可测试验收标准。
3. 风险与回滚。
- Ambiguities to resolve:
1. 入口导入位置（最终冻结为 `index.css`）。
