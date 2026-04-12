# Generator Output

## 改动摘要
- 全局背景层透明度降至 `0.2`，统一降低背景可见度。
- 为 `.background-slide` 叠加纵向滚动动效，同时保留 `background-crossfade`。
- 为 `.background-overlay` 添加独立纵向漂移动效。
- 在 `prefers-reduced-motion: reduce` 下禁用新增纵向动效。

## 返工修复
- 新增高特异性主题选择器，并加入 `!important`，确保 `html[data-theme="day"]` 与 `html[data-theme="night"]` 下 `.background-slide` 保留双动画（crossfade + vertical scroll）。
- `prefers-reduced-motion` 下对主题选择器同步降级（含 `!important`），避免纵向滚动在减弱动效时残留。

## 改动文件与行位
- [frontend/src/styles/base.css](/media/shiokou/DevRepo38/DevHub/Projects/2026-myapp/redgal_forum/frontend/src/styles/base.css#L420)
  - `.background-stage` `opacity: 0.2`（L420-L432）。
  - `.background-slide` 动画改为 `background-crossfade` + `background-vertical-scroll`（L440-L452）。
  - `html[data-theme="day/night"] .background-stage .background-slide` 双动画覆盖（含 `!important`，L454-L459）。
  - `.background-overlay` 新增 `background-overlay-drift`（L470-L484）。
  - 新增 `@keyframes background-vertical-scroll`（约 L486-L496）。
  - 新增 `@keyframes background-overlay-drift`（约 L498-L508）。
  - 新增 `prefers-reduced-motion: reduce` 降级（约 L510-L524）。

## 验证命令与结果
- `mkdir -p /tmp/sprint-20260413-bg-opacity-scroll`（完成）
- `cd frontend && npm run build > /tmp/sprint-20260413-bg-opacity-scroll/build.log 2>&1`（完成，退出码 0，已重跑）
- `git diff -- frontend/src/styles/base.css > /tmp/sprint-20260413-bg-opacity-scroll/diff.txt`（完成）
- 无头截图（`/usr/bin/google-chrome --headless ...`）
  - 桌面截图完成
  - 移动截图完成
- 动效检查
  - `node /tmp/sprint-20260413-bg-opacity-scroll/check-motion.mjs > /tmp/sprint-20260413-bg-opacity-scroll/motion-check.json`（完成）

## 证据文件路径
- `/tmp/sprint-20260413-bg-opacity-scroll/build.log`
- `/tmp/sprint-20260413-bg-opacity-scroll/diff.txt`
- `/tmp/sprint-20260413-bg-opacity-scroll/desktop-1440x900.png`
- `/tmp/sprint-20260413-bg-opacity-scroll/mobile-390x844.png`
- `/tmp/sprint-20260413-bg-opacity-scroll/motion-check.json`

## 风险说明
- 背景整体透明度降低到 0.2 后，层次感可能偏淡，需要确认视觉接受度。
- 纵向漂移动效与 crossfade 叠加可能在低性能设备上有轻微开销，已提供 reduced-motion 降级。
