import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Profile as ApiProfile } from "../api";
import GalleryShowcase from "../components/GalleryShowcase";
import StatusChip from "../components/StatusChip";
import {
  cloneHomeConfig,
  type HomeConfig,
} from "../lib/homeConfig";
import type { PagerState } from "../lib/pagination";
import type {
  DisplayAlbum,
  DisplayPaper,
  DisplayPolaroid,
  DisplayTimeline,
  DisplayTrack,
  StatusTone,
} from "../types/app";

interface HomePageProps {
  articlePager: PagerState;
  canAdmin: boolean;
  collectionTotal: number;
  displayProfile: ApiProfile | null;
  galleryAlbums: DisplayAlbum[];
  galleryPapers: DisplayPaper[];
  galleryPolaroids: DisplayPolaroid[];
  galleryTimeline: DisplayTimeline[];
  galleryTracks: DisplayTrack[];
  homeConfig: HomeConfig;
  threadPager: PagerState;
  wallPager: PagerState;
  onNavigate: (href: string) => void;
  onSaveHomeConfig: (config: HomeConfig) => Promise<void>;
}

interface HomeEditorState {
  pending: boolean;
  error: string;
  success: string;
}

interface CardEditorFieldOption {
  label: string;
  value: string;
}

interface CardEditorField {
  multiline?: boolean;
  name: string;
  label: string;
  options?: CardEditorFieldOption[];
}

type HistoryItemKey = "article" | "forum" | "space";

type CardEditorTarget =
  | { type: "hero_metric"; index: number }
  | { type: "history_item"; key: HistoryItemKey }
  | { type: "link"; index: number }
  | { type: "rule"; index: number };

interface CardEditorSession {
  fields: CardEditorField[];
  target: CardEditorTarget;
  title: string;
  values: Record<string, string>;
}

const EMPTY_EDITOR_STATE: HomeEditorState = {
  pending: false,
  error: "",
  success: "",
};

const TONE_OPTIONS: CardEditorFieldOption[] = [
  { label: "neutral", value: "neutral" },
  { label: "success", value: "success" },
  { label: "warn", value: "warn" },
  { label: "accent", value: "accent" },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "保存失败，请稍后重试。";
}

function parseTone(value: string): StatusTone {
  if (value === "success" || value === "warn" || value === "accent") {
    return value;
  }
  return "neutral";
}

function formatHomeLinkMeta(
  href: string,
  articleTotal: number,
  threadTotal: number,
  collectionTotal: number,
  wallTotal: number,
): string {
  if (href === "/stories") {
    return `${articleTotal} 篇内容`;
  }
  if (href === "/forum") {
    return `${threadTotal} 条主题`;
  }
  if (href === "/space") {
    return `${collectionTotal} 项个人收藏`;
  }
  if (href === "/gallery") {
    return `${wallTotal} 条公开展墙`;
  }
  return "查看分区";
}

function historyCardTitle(key: HistoryItemKey): string {
  if (key === "article") {
    return "专栏";
  }
  if (key === "forum") {
    return "讨论板";
  }
  return "个人空间";
}

export default function HomePage({
  articlePager,
  canAdmin,
  collectionTotal,
  displayProfile,
  galleryAlbums,
  galleryPapers,
  galleryPolaroids,
  galleryTimeline,
  galleryTracks,
  homeConfig,
  threadPager,
  wallPager,
  onNavigate,
  onSaveHomeConfig,
}: HomePageProps) {
  const [showExtendedSections, setShowExtendedSections] = useState(false);
  const [editorState, setEditorState] = useState<HomeEditorState>(EMPTY_EDITOR_STATE);
  const [cardEditor, setCardEditor] = useState<CardEditorSession | null>(null);

  const displayName = (displayProfile?.nickname || displayProfile?.username || "访客").trim() || "访客";
  const summaryFocus = homeConfig.history.sideTitle || homeConfig.hero.terminalStatus || "优先完成核心分区巡检。";
  const summaryOverview = `${articlePager.total} 篇专栏 · ${threadPager.total} 条主题 · ${wallPager.total} 条公开展墙`;
  const summaryCollection = `${displayName} 已整理 ${collectionTotal} 项收藏`;
  const summaryNavigationNote = showExtendedSections
    ? "扩展模块已展开，可继续查看规则区与展示墙。"
    : "建议先浏览沿革与入口卡片，再按需展开规则区与展示墙。";

  const historyCards = [
    {
      key: "article" as const,
      heading: homeConfig.history.articleHeading,
      value: `${articlePager.total} 篇`,
      description: homeConfig.history.articleDescription,
    },
    {
      key: "forum" as const,
      heading: homeConfig.history.forumHeading,
      value: `${threadPager.total} 条`,
      description: homeConfig.history.forumDescription,
    },
    {
      key: "space" as const,
      heading: homeConfig.history.spaceHeading,
      value: displayProfile?.nickname || "Space",
      description: homeConfig.history.spaceDescription,
    },
  ];

  function openHeroMetricEditor(index: number): void {
    const metric = homeConfig.heroMetrics[index];
    if (!metric) {
      return;
    }

    setEditorState(EMPTY_EDITOR_STATE);
    setCardEditor({
      title: `编辑指标卡：${metric.label || `#${index + 1}`}`,
      target: { type: "hero_metric", index },
      fields: [
        { name: "label", label: "标签" },
        { name: "value", label: "数值" },
        { name: "detail", label: "说明", multiline: true },
        { name: "tone", label: "色调", options: TONE_OPTIONS },
      ],
      values: {
        label: metric.label,
        value: metric.value,
        detail: metric.detail,
        tone: metric.tone,
      },
    });
  }

  function openHistoryItemEditor(key: HistoryItemKey): void {
    const heading =
      key === "article"
        ? homeConfig.history.articleHeading
        : key === "forum"
          ? homeConfig.history.forumHeading
          : homeConfig.history.spaceHeading;
    const description =
      key === "article"
        ? homeConfig.history.articleDescription
        : key === "forum"
          ? homeConfig.history.forumDescription
          : homeConfig.history.spaceDescription;

    setEditorState(EMPTY_EDITOR_STATE);
    setCardEditor({
      title: `编辑卡片：${historyCardTitle(key)}`,
      target: { type: "history_item", key },
      fields: [
        { name: "heading", label: "标题" },
        { name: "description", label: "说明", multiline: true },
      ],
      values: {
        heading,
        description,
      },
    });
  }

  function openLinkEditor(index: number): void {
    const item = homeConfig.links.items[index];
    if (!item) {
      return;
    }

    setEditorState(EMPTY_EDITOR_STATE);
    setCardEditor({
      title: `编辑入口：${item.title || `#${index + 1}`}`,
      target: { type: "link", index },
      fields: [
        { name: "href", label: "路径" },
        { name: "kicker", label: "Kicker" },
        { name: "title", label: "标题" },
        { name: "description", label: "说明", multiline: true },
      ],
      values: {
        href: item.href,
        kicker: item.kicker,
        title: item.title,
        description: item.description,
      },
    });
  }

  function openRuleEditor(index: number): void {
    const item = homeConfig.rules.items[index];
    if (!item) {
      return;
    }

    setEditorState(EMPTY_EDITOR_STATE);
    setCardEditor({
      title: `编辑规则：${item.title || `#${index + 1}`}`,
      target: { type: "rule", index },
      fields: [
        { name: "title", label: "标题" },
        { name: "body", label: "说明", multiline: true },
      ],
      values: {
        title: item.title,
        body: item.body,
      },
    });
  }

  function handleCardEditorFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    const { name, value } = event.target;
    setCardEditor((current) =>
      current
        ? {
            ...current,
            values: {
              ...current.values,
              [name]: value,
            },
          }
        : current,
    );
  }

  function buildNextConfigFromCardEditor(editor: CardEditorSession): HomeConfig {
    const next = cloneHomeConfig(homeConfig);
    const { target, values } = editor;

    switch (target.type) {
      case "hero_metric": {
        const metric = next.heroMetrics[target.index];
        if (!metric) {
          break;
        }
        next.heroMetrics[target.index] = {
          ...metric,
          label: values.label ?? metric.label,
          value: values.value ?? metric.value,
          detail: values.detail ?? metric.detail,
          tone: parseTone(values.tone ?? metric.tone),
        };
        break;
      }
      case "history_item": {
        if (target.key === "article") {
          next.history.articleHeading = values.heading ?? next.history.articleHeading;
          next.history.articleDescription = values.description ?? next.history.articleDescription;
        } else if (target.key === "forum") {
          next.history.forumHeading = values.heading ?? next.history.forumHeading;
          next.history.forumDescription = values.description ?? next.history.forumDescription;
        } else {
          next.history.spaceHeading = values.heading ?? next.history.spaceHeading;
          next.history.spaceDescription = values.description ?? next.history.spaceDescription;
        }
        break;
      }
      case "link": {
        const item = next.links.items[target.index];
        if (!item) {
          break;
        }
        next.links.items[target.index] = {
          ...item,
          href: values.href ?? item.href,
          kicker: values.kicker ?? item.kicker,
          title: values.title ?? item.title,
          description: values.description ?? item.description,
        };
        break;
      }
      case "rule": {
        const item = next.rules.items[target.index];
        if (!item) {
          break;
        }
        next.rules.items[target.index] = {
          ...item,
          title: values.title ?? item.title,
          body: values.body ?? item.body,
        };
        break;
      }
      default:
        break;
    }

    return next;
  }

  async function handleCardEditorSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!cardEditor) {
      return;
    }

    setEditorState({
      pending: true,
      error: "",
      success: "",
    });

    try {
      const nextConfig = buildNextConfigFromCardEditor(cardEditor);
      await onSaveHomeConfig(nextConfig);
      setEditorState({
        pending: false,
        error: "",
        success: "卡片内容已更新。",
      });
      setCardEditor(null);
    } catch (error) {
      setEditorState({
        pending: false,
        error: toErrorMessage(error),
        success: "",
      });
    }
  }

  function handleCloseCardEditor(): void {
    if (editorState.pending) {
      return;
    }
    setCardEditor(null);
  }

  return (
    <>
      {canAdmin ? (
        <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">前台编辑</p>
              <h2>点卡片右上角直接编辑</h2>
            </div>
            <StatusChip tone="accent">Inline Edit</StatusChip>
          </div>
          <p className="text-sm text-[color:var(--text-muted)]">首页每个卡片都支持右上角小按钮快速编辑并保存。</p>
          {editorState.error ? <p className="text-sm text-rose-500/90">{editorState.error}</p> : null}
          {editorState.success ? <p className="text-sm text-[color:var(--text-muted)]">{editorState.success}</p> : null}
        </section>
      ) : null}

      {canAdmin && cardEditor ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="home-card-editor-title">
          <button
            aria-label="关闭卡片编辑器"
            className="absolute inset-0 bg-black/45"
            type="button"
            onClick={handleCloseCardEditor}
          />
          <article className="relative z-10 w-full max-w-2xl rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel-strong)] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">卡片编辑</p>
                <h2 id="home-card-editor-title">{cardEditor.title}</h2>
              </div>
            </div>
            <form className="grid gap-3" onSubmit={(event) => void handleCardEditorSubmit(event)}>
              <div className="grid gap-3">
                {cardEditor.fields.map((field) => (
                  <label className="grid gap-1.5" key={field.name}>
                    <span>{field.label}</span>
                    {field.options ? (
                      <select
                        name={field.name}
                        value={cardEditor.values[field.name] ?? ""}
                        onChange={handleCardEditorFieldChange}
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.multiline ? (
                      <textarea
                        name={field.name}
                        rows={4}
                        value={cardEditor.values[field.name] ?? ""}
                        onChange={handleCardEditorFieldChange}
                      />
                    ) : (
                      <input
                        name={field.name}
                        value={cardEditor.values[field.name] ?? ""}
                        onChange={handleCardEditorFieldChange}
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={editorState.pending}>
                  {editorState.pending ? "保存中..." : "保存"}
                </button>
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleCloseCardEditor} disabled={editorState.pending}>
                  取消
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      <section className="hero-panel landing-hero home-hero">
        <div className="landing-hero__copy home-hero__copy">
          <div className="home-summary">
            <p className="home-summary__kicker">首页速览</p>
            <h2 className="home-summary__title">{homeConfig.history.title || "视觉小说研今日运营重点"}</h2>
            <p className="home-summary__description">
              {homeConfig.history.paragraphs[0] || "先查看站点重点与内容规模，再进入分区处理具体事务。"}
            </p>
            <dl className="home-summary__list">
              <div>
                <dt>当前重点</dt>
                <dd>{summaryFocus}</dd>
              </div>
              <div>
                <dt>内容规模</dt>
                <dd>{summaryOverview}</dd>
              </div>
              <div>
                <dt>我的进度</dt>
                <dd>{summaryCollection}</dd>
              </div>
            </dl>
            <p className="home-summary__note">{summaryNavigationNote}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => onNavigate("/forum")}>
              {homeConfig.hero.forumButtonLabel}
            </button>
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 min-w-[120px]" type="button" onClick={() => onNavigate("/gallery")}>
              {homeConfig.hero.galleryButtonLabel}
            </button>
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 min-w-[120px]"
              type="button"
              onClick={() => setShowExtendedSections((current) => !current)}
            >
              {showExtendedSections ? "收起扩展模块" : "展开扩展模块"}
            </button>
          </div>

          <div className="hero-metrics landing-hero__metrics home-hero__metrics">
            {homeConfig.heroMetrics.map((metric, index) => (
              <div className={`metric-card ${canAdmin ? "home-editable-card" : ""}`} key={metric.id}>
                {canAdmin ? (
                  <button className="inline-flex items-center justify-center rounded-md border border-[color:var(--line-soft)] bg-white/45 px-2 py-1 text-xs text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80" type="button" onClick={() => openHeroMetricEditor(index)}>
                    编辑
                  </button>
                ) : null}
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <StatusChip tone={metric.tone}>{metric.detail}</StatusChip>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero__visual home-hero__visual">
          <div className="landing-hero__glow landing-hero__glow--one" aria-hidden="true" />
          <div className="landing-hero__glow landing-hero__glow--two" aria-hidden="true" />
          <div className="landing-hero__glow landing-hero__glow--three" aria-hidden="true" />

          <div className="art-stage home-hero__art-stage">
            <div className="art-stage__standee home-hero__standee">
              <div className="art-stage__standee-frame" aria-hidden="true" />
              <img
                alt="百川乃大视觉小说研首页主视觉"
                className="art-stage__standee-image"
                src="/bg1.png"
              />
            </div>

            <div className="art-stage__postcard home-hero__postcard">
              <img alt="百川乃大视觉小说研辅助视觉" className="art-stage__postcard-image" src="/bg2.png" />
              <div className="art-stage__postcard-copy">
                <span>{homeConfig.hero.postcardKicker}</span>
                <strong>{homeConfig.hero.postcardTitle}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-[18px] rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">推荐浏览</p>
            <h2>首页先看核心，再展开扩展</h2>
          </div>
          <StatusChip tone="accent">{showExtendedSections ? "完整浏览" : "聚焦浏览"}</StatusChip>
        </div>
        <div className="grid gap-3 md:grid-cols-3 max-[900px]:grid-cols-1">
          <article className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">核心模块</p>
            <h3 className="mt-1.5 font-[var(--font-display)] text-[1.02rem] text-[color:var(--text-strong)]">沿革 + 入口卡片</h3>
            <p className="mt-2 text-[color:var(--text-soft)] leading-[1.65]">先完成站点定位与关键入口扫描，再决定是否进入规则与展示区。</p>
          </article>
          <article className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">扩展模块</p>
            <h3 className="mt-1.5 font-[var(--font-display)] text-[1.02rem] text-[color:var(--text-strong)]">规则 + 展示墙</h3>
            <p className="mt-2 text-[color:var(--text-soft)] leading-[1.65]">移动端默认折叠，减少首屏过长与信息拥挤。</p>
          </article>
          <article className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">当前状态</p>
            <h3 className="mt-1.5 font-[var(--font-display)] text-[1.02rem] text-[color:var(--text-strong)]">{showExtendedSections ? "扩展区已展开" : "扩展区已折叠"}</h3>
            <p className="mt-2 text-[color:var(--text-soft)] leading-[1.65]">{showExtendedSections ? "你正在浏览完整首页内容。" : "你正在按聚焦路径浏览首页。"}</p>
          </article>
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{homeConfig.history.kicker}</p>
              <h2>{homeConfig.history.title}</h2>
            </div>
          </div>
          <div className="grid gap-4">
            {homeConfig.history.paragraphs.map((paragraph, index) => (
              <p className="m-0 text-[color:var(--text-soft)] leading-[1.9]" key={`history-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{homeConfig.history.sideKicker}</p>
              <h2>{homeConfig.history.sideTitle}</h2>
            </div>
          </div>
          <ul className="grid gap-2">
            {historyCards.map((item) => (
              <li className={`grid gap-1 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-2 ${canAdmin ? "home-editable-card" : ""}`} key={item.key}>
                {canAdmin ? (
                  <button className="inline-flex items-center justify-center rounded-md border border-[color:var(--line-soft)] bg-white/45 px-2 py-1 text-xs text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80" type="button" onClick={() => openHistoryItemEditor(item.key)}>
                    编辑
                  </button>
                ) : null}
                <p className="flex items-center justify-between gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
                  <span>{item.heading}</span>
                  <span>{item.value}</span>
                </p>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{homeConfig.links.kicker}</p>
            <h2>{homeConfig.links.title}</h2>
          </div>
        </div>
        <ul className="m-0 grid list-none gap-0 p-0">
          {homeConfig.links.items.map((item, index) => (
            <li className={`relative ${canAdmin ? "home-editable-card" : ""}`} key={item.id}>
              {canAdmin ? (
                <button className="inline-flex items-center justify-center rounded-md border border-[color:var(--line-soft)] bg-white/45 px-2 py-1 text-xs text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 absolute right-2 top-2" type="button" onClick={() => openLinkEditor(index)}>
                  编辑
                </button>
              ) : null}
              <button className="w-full border-0 border-b border-dashed border-[color:var(--line-soft)] bg-transparent px-0 pb-3.5 pt-3 pr-[86px] text-left text-inherit transition-transform duration-100 ease-linear hover:translate-x-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--line-strong)] max-[900px]:pt-10 max-[900px]:pr-0" type="button" onClick={() => onNavigate(item.href)}>
                <p className="m-0 flex flex-wrap items-baseline justify-between gap-2.5 text-[0.84rem] text-[color:var(--text-muted)]">
                  <span>{item.kicker}</span>
                  <span>
                    {formatHomeLinkMeta(
                      item.href,
                      articlePager.total,
                      threadPager.total,
                      collectionTotal,
                      wallPager.total,
                    )}
                  </span>
                </p>
                <p className="mt-1.5 font-[var(--font-display)] text-[1.04rem] text-[color:var(--text-strong)]">{item.title}</p>
                <p className="mt-2 text-[color:var(--text-soft)] leading-[1.72]">{item.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {!showExtendedSections ? (
        <section className="mt-5 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">More Modules</p>
              <h2>还有 2 个扩展模块</h2>
            </div>
            <StatusChip tone="neutral">按需展开</StatusChip>
          </div>
          <p className="text-sm text-[color:var(--text-muted)]">规则区与展示墙已折叠，点击按钮展开完整首页。</p>
          <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => setShowExtendedSections(true)}>
            展开扩展模块
          </button>
        </section>
      ) : null}

      {showExtendedSections ? (
        <>
          <section className="mt-5 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{homeConfig.rules.kicker}</p>
                <h2>{homeConfig.rules.title}</h2>
              </div>
            </div>
            <ul className="grid gap-2 gap-3">
              {homeConfig.rules.items.map((card, index) => (
                <li className={`grid gap-1 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-2 ${canAdmin ? "home-editable-card" : ""}`} key={card.id}>
                  {canAdmin ? (
                    <button className="inline-flex items-center justify-center rounded-md border border-[color:var(--line-soft)] bg-white/45 px-2 py-1 text-xs text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80" type="button" onClick={() => openRuleEditor(index)}>
                      编辑
                    </button>
                  ) : null}
                  <p className="flex items-center justify-between gap-2 text-sm font-semibold text-[color:var(--text-strong)]">
                    <span>{card.title}</span>
                  </p>
                  <p>{card.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="home-gallery-bottom mt-5 grid gap-[18px] rounded-[28px] border border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(249,247,250,0.96),rgba(245,245,245,0.92)),rgba(255,255,255,0.72)] p-6 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{homeConfig.gallery.kicker}</p>
                <h2>{homeConfig.gallery.title}</h2>
              </div>
              <StatusChip tone="neutral">{wallPager.total} 条公开内容</StatusChip>
            </div>
            <GalleryShowcase
              className="gallery-outline mt-0.5"
              galleryAlbums={galleryAlbums}
              galleryPapers={galleryPapers}
              galleryPolaroids={galleryPolaroids}
              galleryTimeline={galleryTimeline}
              galleryTracks={galleryTracks}
            />
          </section>
        </>
      ) : null}
    </>
  );
}
