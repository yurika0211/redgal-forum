# Planner Spec

## Sprint ID
- `sprint_id`: `sprint-20260413-bg-opacity-scroll`
- `planner_agent_id`: `019d827f-f2e7-7542-a39e-ddeecd378447`

## Problem Expansion
- User request (raw): "用harness帮我把背景的透明度变成0.2,而且要增加上下滚动的效果"
- Clarified objective: 将全局背景层透明度调整为 `0.2`，并新增背景纵向上下滚动/漂移动效（非内容滚动）。
- Explicit assumptions:
  - 透明度 `0.2` 作用于全局背景视觉层。
  - 上下滚动效果采用 CSS 动画实现，不引入 JS 逻辑。
  - 不修改页面结构组件，仅在样式层变更。
- Non-goals:
  - 不改业务逻辑、接口或路由。
  - 不重做主题配色与卡片样式。
  - 不引入第三方动画库。

## Executable Scope
- Work items:
1. 在全局背景样式中实现透明度 = `0.2`。
2. 为背景增加纵向上下滚动动效，避免与现有 `background-crossfade` 冲突。
3. 增加 `prefers-reduced-motion` 降级处理，完成构建与截图验收。

## Risks
- Risk: 透明度过低造成背景信息不足。
- Impact: 视觉层次减弱。
- Mitigation: 仅调整背景层，不动内容层；通过桌面与移动截图验收可读性。

- Risk: 新动画覆盖原有动画导致 crossfade 失效。
- Impact: 背景切换或过渡异常。
- Mitigation: 使用多动画组合或拆分作用域，确保 `background-crossfade` 继续生效。

- Risk: 纵向位移幅度过大引发眩晕。
- Impact: 体验下降。
- Mitigation: 使用缓慢小幅漂移，并在 `prefers-reduced-motion` 下禁用。

## Proposed Validation Strategy
- Unit/integration/manual checks:
  - `cd frontend && npm run build`
  - 无头浏览器截图：桌面 `1440x900` 与移动 `390x844`
  - 目视确认背景存在纵向上下滚动效果
- Evidence expected:
  - 变更 diff
  - build 成功日志
  - 截图路径与简要观感结论

## Handoff to Sprint-Contractor
- Required contract fields:
  - 透明度作用选择器与最终值
  - 动画关键帧名称、时长、幅度、作用对象
  - 降级策略（reduced motion）
  - 可测试验收条件（构建+截图+动效存在）
- Ambiguities to resolve:
  - 透明度是作用在 `.background-stage` 还是子层
  - 上下滚动使用 `transform` 还是 `background-position`
