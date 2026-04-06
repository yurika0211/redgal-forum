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
  resolveHomePrompt,
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

  const terminalSpaceID = (displayProfile?.username || "guest").trim();
  const terminalPrompt = resolveHomePrompt(homeConfig.hero.terminalPromptTemplate, terminalSpaceID);

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
        <section className="panel home-admin-toolbar-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">前台编辑</p>
              <h2>点卡片右上角直接编辑</h2>
            </div>
            <StatusChip tone="accent">Inline Edit</StatusChip>
          </div>
          <p className="panel-empty">首页每个卡片都支持右上角小按钮快速编辑并保存。</p>
          {editorState.error ? <p className="panel-error">{editorState.error}</p> : null}
          {editorState.success ? <p className="panel-empty">{editorState.success}</p> : null}
        </section>
      ) : null}

      {canAdmin && cardEditor ? (
        <div className="home-card-editor-modal" role="dialog" aria-modal="true" aria-labelledby="home-card-editor-title">
          <button
            aria-label="关闭卡片编辑器"
            className="home-card-editor-modal__backdrop"
            type="button"
            onClick={handleCloseCardEditor}
          />
          <article className="home-card-editor-modal__panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">卡片编辑</p>
                <h2 id="home-card-editor-title">{cardEditor.title}</h2>
              </div>
            </div>
            <form className="home-card-editor-form" onSubmit={(event) => void handleCardEditorSubmit(event)}>
              <div className="home-card-editor-form__fields">
                {cardEditor.fields.map((field) => (
                  <label className="home-card-editor-form__field" key={field.name}>
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
              <div className="home-card-editor-form__actions">
                <button className="primary-button" type="submit" disabled={editorState.pending}>
                  {editorState.pending ? "保存中..." : "保存"}
                </button>
                <button className="ghost-button" type="button" onClick={handleCloseCardEditor} disabled={editorState.pending}>
                  取消
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      <section className="hero-panel landing-hero home-hero">
        <div className="landing-hero__copy home-hero__copy">
          <div className="home-terminal">
            <div className="home-terminal__bar">
              <div className="home-terminal__lights" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="home-terminal__body">
              <p className="home-terminal__command home-terminal__typing home-terminal__typing--command">
                {homeConfig.hero.terminalCommand}
              </p>
              <p className="home-terminal__status home-terminal__typing home-terminal__typing--status">
                {homeConfig.hero.terminalStatus}
              </p>
              <p className="home-terminal__prompt home-terminal__typing home-terminal__typing--body-1">
                {terminalPrompt}
              </p>
            </div>
          </div>

          <div className="hero-action-row">
            <button className="primary-button" type="button" onClick={() => onNavigate("/forum")}>
              {homeConfig.hero.forumButtonLabel}
            </button>
            <button className="ghost-button hero-action-button" type="button" onClick={() => onNavigate("/gallery")}>
              {homeConfig.hero.galleryButtonLabel}
            </button>
            <button
              className="ghost-button hero-action-button"
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
                  <button className="home-card-edit" type="button" onClick={() => openHeroMetricEditor(index)}>
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

      <section className="panel home-focus-strip">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">推荐浏览</p>
            <h2>首页先看核心，再展开扩展</h2>
          </div>
          <StatusChip tone="accent">{showExtendedSections ? "完整浏览" : "聚焦浏览"}</StatusChip>
        </div>
        <div className="home-focus-strip__grid">
          <article className="content-card">
            <p className="panel-kicker">核心模块</p>
            <h3>沿革 + 入口卡片</h3>
            <p>先完成站点定位与关键入口扫描，再决定是否进入规则与展示区。</p>
          </article>
          <article className="content-card">
            <p className="panel-kicker">扩展模块</p>
            <h3>规则 + 展示墙</h3>
            <p>移动端默认折叠，减少首屏过长与信息拥挤。</p>
          </article>
          <article className="content-card">
            <p className="panel-kicker">当前状态</p>
            <h3>{showExtendedSections ? "扩展区已展开" : "扩展区已折叠"}</h3>
            <p>{showExtendedSections ? "你正在浏览完整首页内容。" : "你正在按聚焦路径浏览首页。"}</p>
          </article>
        </div>
      </section>

      <section className="page-split-grid home-history-grid">
        <article className="panel home-history-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">{homeConfig.history.kicker}</p>
              <h2>{homeConfig.history.title}</h2>
            </div>
          </div>
          <div className="home-history-copy">
            {homeConfig.history.paragraphs.map((paragraph, index) => (
              <p key={`history-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>

        <article className="panel home-history-side">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">{homeConfig.history.sideKicker}</p>
              <h2>{homeConfig.history.sideTitle}</h2>
            </div>
          </div>
          <ul className="home-text-list">
            {historyCards.map((item) => (
              <li className={`home-text-list__item ${canAdmin ? "home-editable-card" : ""}`} key={item.key}>
                {canAdmin ? (
                  <button className="home-card-edit" type="button" onClick={() => openHistoryItemEditor(item.key)}>
                    编辑
                  </button>
                ) : null}
                <p className="home-text-list__heading">
                  <span>{item.heading}</span>
                  <span>{item.value}</span>
                </p>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel home-link-list-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">{homeConfig.links.kicker}</p>
            <h2>{homeConfig.links.title}</h2>
          </div>
        </div>
        <ul className="home-link-list">
          {homeConfig.links.items.map((item, index) => (
            <li className={`home-card-shell ${canAdmin ? "home-editable-card" : ""}`} key={item.id}>
              {canAdmin ? (
                <button className="home-card-edit home-card-edit--floating" type="button" onClick={() => openLinkEditor(index)}>
                  编辑
                </button>
              ) : null}
              <button className="home-link-list__item" type="button" onClick={() => onNavigate(item.href)}>
                <p className="home-link-list__heading">
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
                <p className="home-link-list__title">{item.title}</p>
                <p className="home-link-list__description">{item.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {!showExtendedSections ? (
        <section className="panel home-sections-gate">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">More Modules</p>
              <h2>还有 2 个扩展模块</h2>
            </div>
            <StatusChip tone="neutral">按需展开</StatusChip>
          </div>
          <p className="panel-empty">规则区与展示墙已折叠，点击按钮展开完整首页。</p>
          <button className="ghost-button" type="button" onClick={() => setShowExtendedSections(true)}>
            展开扩展模块
          </button>
        </section>
      ) : null}

      {showExtendedSections ? (
        <>
          <section className="panel home-rules-list-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">{homeConfig.rules.kicker}</p>
                <h2>{homeConfig.rules.title}</h2>
              </div>
            </div>
            <ul className="home-text-list home-text-list--rules">
              {homeConfig.rules.items.map((card, index) => (
                <li className={`home-text-list__item ${canAdmin ? "home-editable-card" : ""}`} key={card.id}>
                  {canAdmin ? (
                    <button className="home-card-edit" type="button" onClick={() => openRuleEditor(index)}>
                      编辑
                    </button>
                  ) : null}
                  <p className="home-text-list__heading">
                    <span>{card.title}</span>
                  </p>
                  <p>{card.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel home-gallery-bottom">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">{homeConfig.gallery.kicker}</p>
                <h2>{homeConfig.gallery.title}</h2>
              </div>
              <StatusChip tone="neutral">{wallPager.total} 条公开内容</StatusChip>
            </div>
            <GalleryShowcase
              className="gallery-outline home-gallery-showcase"
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
