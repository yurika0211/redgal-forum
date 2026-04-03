# Rubedo React 二次元化改造报告

## 1. 现状判断

当前前端基础非常轻：

- `frontend/` 使用 Vite + React 19。
- 目前只有 `react`、`react-dom` 两个运行时依赖。
- 页面仍是启动模板，入口集中在 `frontend/src/App.jsx`、`frontend/src/App.css`、`frontend/src/index.css`。
- `docs/requirement.md` 已经明确了论坛的业务核心：公开感悟区、论坛讨论版、匿名版、展示墙、个人主页、Bangumi 导入、管理员审核。

这意味着你现在非常适合做“风格先行、架构同步升级”的改造。因为还没有形成复杂历史包袱，可以直接把“二次元化”做成产品层面的 UI 语言，而不是事后往普通论坛上贴几张动漫背景图。

## 2. 什么叫“更加二次元化”

真正的“二次元化”不是单纯把颜色换成粉蓝紫，而是让用户感觉自己进入了一个有世界观、有角色气质、有情绪氛围的社区。对这个论坛来说，建议从下面四个维度实现：

- 视觉叙事：页面像 Galgame 菜单、角色档案、社团活动记录册，而不是通用博客。
- 角色感：论坛有自己的看板娘、身份徽章、称号、章节标签、心情标签。
- 情绪化内容展示：展示墙、个人主页、游戏感悟区应该有“记忆相册”和“回忆录”的味道。
- 节奏感交互：切页、卡片 hover、筛选切换、章节展开都要有轻量但明确的动画语言。

## 3. 对当前项目最合适的 React 技术路线

### 3.1 先把前端从“启动页”升级成“可扩展应用骨架”

建议先做这几件基础设施升级：

1. 将 `frontend/src/*.jsx` 逐步迁移到 TypeScript。
2. 引入路由层，至少拆出：
   - `/`
   - `/forum`
   - `/thread/:id`
   - `/memories`
   - `/profile/:id`
   - `/admin`
3. 建立统一的主题 token，而不是把颜色散落在各个 CSS 文件里。
4. 把页面拆成 `layout`、`feature`、`shared/ui` 三层组件。

原因很直接：二次元风格最怕“每个页面像不同人拼出来的”，而 React 最适合用组件和主题系统把视觉语言稳定下来。

### 3.2 推荐的依赖分工

建议采用下面这条组合，而不是一开始就上很重的 UI 全家桶：

- 路由：React Router
- 服务端状态：TanStack Query
- 轻量客户端状态：Zustand
- 动画：Motion
- 样式策略：CSS Variables + 模块化样式文件，主站避免重 UI 框架污染

这样做的好处：

- 主站可以保留鲜明视觉风格，不会被通用后台组件库带偏。
- 管理后台如果后期要追求效率，可以单独在 `admin` 路由下接入 Ant Design 或 Arco Design。
- 数据请求、主题状态、动效层分别解耦，后期维护成本更低。

## 4. React 架构应该怎么组织

建议目录结构：

```text
frontend/src/
  app/
    router.tsx
    providers.tsx
  pages/
    home/
    forum/
    thread/
    memories/
    profile/
    admin/
  features/
    auth/
    forum/
    memories/
    profile/
    bangumi/
    anonymous-board/
  shared/
    ui/
    theme/
    hooks/
    lib/
    assets/
```

建议职责划分：

- `pages/` 只负责页面拼装。
- `features/` 负责业务模块，例如帖子列表、楼中楼回复、Bangumi 书架、展示墙审核流。
- `shared/ui/` 放复用组件，例如按钮、徽章、卡片、页签、对话气泡、灯箱。
- `shared/theme/` 放颜色、字体、圆角、阴影、背景纹理、主题切换逻辑。

## 5. 二次元风格在 React 中怎么落地

### 5.1 主题系统要先做

建议不要直接写死一种风格，而是做成主题包。比如：

- `sakura-dawn`：樱色、奶油白、浅金、柔和发光，适合首页和展示墙。
- `after-school-neon`：夜蓝、霓虹青、橙红、玻璃质感，适合论坛讨论区。
- `memory-archive`：米白、褐金、旧纸纹理，适合展示墙和个人感悟页。

React 实现重点：

- 用 `data-theme` + CSS variables 管理主题。
- 用 Zustand 或 Context 管理当前主题。
- 主题只暴露 token，不让业务组件直接写死颜色。

示例：

```tsx
import { create } from "zustand";

type ThemeName = "sakura-dawn" | "after-school-neon" | "memory-archive";

type ThemeState = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "sakura-dawn",
  setTheme: (theme) => set({ theme }),
}));
```

```css
:root[data-theme="sakura-dawn"] {
  --bg: #fff7f8;
  --panel: rgba(255, 255, 255, 0.74);
  --text: #2f2232;
  --accent: #ff7ea8;
  --accent-strong: #ff5f92;
  --line: rgba(74, 38, 67, 0.14);
}

:root[data-theme="after-school-neon"] {
  --bg: #0c1020;
  --panel: rgba(19, 26, 43, 0.72);
  --text: #f6f1ff;
  --accent: #7ee7ff;
  --accent-strong: #ff9f6e;
  --line: rgba(255, 255, 255, 0.12);
}
```

### 5.2 页面背景要“有场景”，不要只是纯色

二次元感很大一部分来自分层背景：

- 顶层是内容卡片。
- 中层是柔和发光、花瓣、胶片噪点、纸张纹理。
- 底层是渐变天空、校园窗景、夜色、陈列柜、旧相册。

React 中的建议做法：

- 用 `ForumFrame` 统一承载页面背景层。
- 用独立的 `BackgroundLayer` 组件接收场景配置。
- 背景图和纹理做成按页面懒加载资源，避免首屏过重。

### 5.3 组件风格要统一成“角色档案 + 章节卡片”

建议优先做这些核心组件：

- `HeroBanner`：首页主视觉，带标题、副标题、角色立绘位、主题切换。
- `SectionTitle`：像视觉小说章节标题。
- `PostCard`：帖子卡片，带封面、心情标签、版块标签、互动数。
- `ThreadBubble`：回帖像对话框或 ADV 文本窗。
- `EmotionBadge`：例如“通关后劲很大”“刀子预警”“糖度高”“校园系”。
- `BangumiShelf`：个人页的游戏收藏架。
- `MemoryCard`：展示墙卡片，像相册页或拍立得。
- `ChoiceTabs`：像“分支选项”的页签切换器。

这样你会得到一个“论坛内容系统”，而不是一堆孤立的页面。

## 6. 页面级实现建议

### 6.1 首页

首页应该承担“世界观入口”的职责，建议包含：

- 主视觉区域：社团主题、论坛口号、最近热帖、角色立绘占位。
- 今日氛围区：当前主题、站内活动、季节性 banner。
- 热门讨论区：带封面图和情绪标签的帖子流。
- 展示墙预览：精选回忆卡片。
- Luckybot 入口：做成看板娘对话窗，不要做成普通聊天框。

### 6.2 论坛列表页

建议做成“章节选择 + 卡片流”结构：

- 左侧或顶部是版块标签。
- 中间是帖子卡片流。
- 右侧可以放“今日话题”“热词”“最近收藏作品”。

视觉上可以借鉴：

- 版块像章节按钮。
- 帖子卡片像游戏 CG 缩略卡。
- 活跃状态像任务面板或公告板。

### 6.3 帖子详情页

普通论坛楼层容易太硬，建议做成“正文卡 + 回复气泡”的双层结构：

- 主楼保持阅读性，减少装饰。
- 回复楼层可以更有风格，比如头像边框、身份徽章、心情贴纸。
- 匿名版可以给临时马甲生成二次元风格称号，如“风纪委员A”“观测者07”。

### 6.4 展示墙

这是最适合做出二次元氛围的模块。

建议使用：

- Masonry 或瀑布流相册布局。
- 时间轴 + 相册混合视图。
- 点击后打开灯箱模式，配合故事文本、标签、图片组。
- 加入“记忆碎片”“那年今日”“社团相册卷”的表达方式。

React 组件可以拆成：

- `MemoryGrid`
- `MemoryLightbox`
- `TimelineRail`
- `MemoryStoryPanel`

### 6.5 个人主页

不要做成普通的“个人中心”，而是做成“角色档案页”：

- 头像区像角色卡。
- 签名和个人简介像设定档。
- Bangumi 收藏像作品柜。
- 发文列表像个人章节目录。
- 徽章系统像路线成就或社团头衔。

## 7. React 19 可以直接帮你的几个点

你当前正好已经在 React 19 上，可以直接利用一些更适合论坛交互的能力。

### 7.1 用 `startTransition` 处理非阻塞切换

适合场景：

- 切换论坛版块
- 展示墙筛选
- 搜索条件变化
- 个人作品柜排序切换

示例：

```tsx
import { startTransition, useState } from "react";

export function ForumTabs() {
  const [section, setSection] = useState("all");

  function handleChange(nextSection: string) {
    startTransition(() => {
      setSection(nextSection);
    });
  }

  return (
    <div>
      <button onClick={() => handleChange("all")}>全部</button>
      <button onClick={() => handleChange("anonymous")}>匿名版</button>
      <button onClick={() => handleChange("memories")}>展示墙</button>
    </div>
  );
}
```

### 7.2 用 `useDeferredValue` 让搜索和筛选更顺滑

适合场景：

- 帖子实时搜索
- Bangumi 条目筛选
- 展示墙标签过滤

示例：

```tsx
import { useDeferredValue, useMemo, useState } from "react";

export function ThreadSearch({ threads }: { threads: Array<{ title: string }> }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    if (!keyword) return threads;
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(keyword),
    );
  }, [deferredQuery, threads]);

  return (
    <>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
      <div>{filtered.length} results</div>
    </>
  );
}
```

### 7.3 用 `useEffectEvent` 管理视觉效果和全局监听

适合场景：

- 角色气泡提示
- 鼠标视差移动
- 背景动态粒子
- 轻量音效提示

如果你做全局事件监听，`useEffectEvent` 可以避免因为状态变化反复重绑事件。

## 8. 数据层怎么配合二次元 UI

二次元风格不是只靠 CSS，还要靠“数据结构支持丰富展示”。

建议帖子和展示墙对象在前端模型中至少包含：

- `coverImage`
- `mood`
- `tags`
- `spoilerLevel`
- `visibility`
- `authorBadge`
- `sceneTheme`
- `bangumiSubject`

这样 `PostCard` 才能真正渲染出“作品感”和“情绪感”。如果数据层只有标题和正文，UI 再花也会很空。

建议把服务端数据和前端展示模型分开：

- `api models` 对应后端返回
- `view models` 对应页面展示

这样可以在前端把普通帖子映射成更有表现力的卡片结构。

## 9. 动效设计建议

建议只做“少量但明确”的动画，不要全站飘花乱飞。

优先级从高到低：

1. 页面首屏淡入与分层上浮
2. 卡片 hover 的轻微位移与光泽
3. 章节切换的滑入滑出
4. 展示墙图片展开动画
5. 徽章和标签的微反馈

不建议：

- 全站自动播放 BGM
- 长时间大面积粒子特效
- 影响阅读的持续动态背景
- 手机端过度视差效果

二次元 UI 的核心不是“动画多”，而是“氛围稳定且不吵”。

## 10. 这个项目最值得先做的 4 个前端里程碑

### 第一阶段：骨架升级

- JSX 迁移到 TypeScript
- 引入 React Router
- 建立主题 token 系统
- 把首页改造成真正的论坛门面

### 第二阶段：论坛主站视觉成型

- 完成 `HeroBanner`、`PostCard`、`SectionTitle`、`ChoiceTabs`
- 完成论坛列表和帖子详情页
- 建立匿名版特殊样式

### 第三阶段：展示墙和个人页成型

- 完成 `MemoryCard`、`MemoryLightbox`、`BangumiShelf`
- 让个人页拥有角色档案感
- 让展示墙拥有相册与时间轴切换能力

### 第四阶段：后台与性能收尾

- 管理后台单独接实用组件库
- 图片懒加载、列表虚拟化、资源拆包
- 完成 `prefers-reduced-motion` 适配和移动端优化

## 11. 针对当前仓库的直接实施建议

基于你现在这个仓库状态，最现实的第一轮改造应该是：

1. 把 `frontend/src/App.jsx` 改成路由入口，而不是单页启动卡片。
2. 新增统一的 `ForumFrame`、`TopNav`、`ThemeSwitcher`、`HeroBanner`、`PostCard`。
3. 先用 mock data 做出首页、论坛列表、展示墙预览三个页面。
4. 把 `App.css` 里零散的样式升级成主题变量和可复用组件样式。
5. 第二轮再接真实 API、Bangumi 数据、权限逻辑和审核流。

这是因为“先把壳做对”比“先接满所有接口”更重要。你的论坛如果定位是情感社区和社团记忆载体，那前端氛围本身就是产品的一部分，不是后期装饰层。

## 12. 最终结论

如果你想让论坛“更加二次元化”，正确做法不是简单套一个动漫皮肤，而是用 React 把下面三件事同时做出来：

- 稳定的主题系统
- 有角色感的组件体系
- 为论坛、展示墙、个人页量身定做的页面叙事

对你这个项目来说，最优路径是：

- 先升级前端骨架
- 再做主题和核心组件
- 然后围绕论坛、展示墙、Bangumi 书架、个人主页做风格化页面
- 最后补后台和性能治理

这样做出来的东西，才会像“Rubedo 自己的论坛”，而不是“一个加了二次元贴纸的普通 React 网站”。

## 13. 参考资料

- React `startTransition`: https://react.dev/reference/react/startTransition
- React `useDeferredValue`: https://react.dev/reference/react/useDeferredValue
- React `useEffectEvent`: https://zh-hans.react.dev/reference/react/useEffectEvent
- React Router 概览: https://reactrouter.com/start/modes
- React Router 特性概览: https://reactrouter.com/v6/start/overview
- TanStack Query React 文档: https://tanstack.com/query/latest/docs/react/
- Motion React 动画文档: https://motion.dev/docs/react-animation
- Zustand 官方文档: https://zustand.docs.pmnd.rs/getting-started/introduction
