import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import type { SiteGalleryEntry } from "../api";
import StatusChip from "../components/StatusChip";
import type { PagerState } from "../lib/pagination";
import { galleryEntryTypeLabel } from "../lib/text";
import type {
  DisplayAlbum,
  GalleryFormState,
  DisplayPaper,
  DisplayPolaroid,
  DisplayTimeline,
  DisplayTrack,
  FormActionState,
} from "../types/app";

interface GalleryPageProps {
  adminGalleryEntries: SiteGalleryEntry[];
  adminGalleryPager: PagerState;
  canManageGallery: boolean;
  editingGalleryEntryID: string | null;
  galleryActionState: FormActionState<SiteGalleryEntry>;
  galleryAlbums: DisplayAlbum[];
  galleryEntriesRaw: SiteGalleryEntry[];
  galleryForm: GalleryFormState;
  galleryPapers: DisplayPaper[];
  galleryPolaroids: DisplayPolaroid[];
  galleryTimeline: DisplayTimeline[];
  galleryTracks: DisplayTrack[];
  onGalleryBulkDelete: (entryIDs: readonly string[]) => Promise<void>;
  onGalleryBulkSetActive: (entryIDs: readonly string[], active: boolean) => Promise<void>;
  onGalleryDelete: (entry: SiteGalleryEntry) => Promise<void>;
  onGalleryEditStart: (entry: SiteGalleryEntry) => void;
  onGalleryEditorReset: () => void;
  onGalleryFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onGalleryPageChange: (page: number) => void;
  onGalleryReorder: (orderedEntryIDs: readonly string[]) => Promise<void>;
  onGallerySortNudge: (entry: SiteGalleryEntry, delta: -1 | 1) => Promise<void>;
  onGallerySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

interface GalleryPhoto {
  alt: string;
  id: string;
  src: string;
}

interface GalleryNarrative {
  id: string;
  section: string;
  title: string;
  body: string;
}

type GallerySectionType = SiteGalleryEntry["entry_type"] | "mixed";

interface GallerySectionPhoto {
  id: string;
  src: string;
  alt: string;
  title: string;
}

interface GalleryCurationSection {
  id: string;
  type: GallerySectionType;
  kicker: string;
  title: string;
  summary: string;
  photos: GallerySectionPhoto[];
  notes: GalleryNarrative[];
}

type GalleryNotesPosition = "side" | "bottom" | "hidden";
type GalleryCardAspect = "wide" | "square" | "portrait";

interface GalleryLayoutState {
  cardAspect: GalleryCardAspect;
  columns: 1 | 2 | 3;
  notesCount: number;
  notesPosition: GalleryNotesPosition;
}

const GALLERY_LAYOUT_STORAGE_KEY = "rubedo_gallery_layout_v1";
const DEFAULT_GALLERY_LAYOUT: GalleryLayoutState = {
  cardAspect: "wide",
  columns: 2,
  notesCount: 8,
  notesPosition: "side",
};

const GALLERY_SECTION_ORDER: SiteGalleryEntry["entry_type"][] = [
  "album",
  "polaroid",
  "paper",
  "timeline",
  "track",
];

const GALLERY_SECTION_META: Record<
  SiteGalleryEntry["entry_type"],
  { kicker: string; title: string; summary: string }
> = {
  album: {
    kicker: "相册",
    title: "章节相册",
    summary: "把同一段故事的画面放进一个章节，不再拆散成单张卡片。",
  },
  polaroid: {
    kicker: "拍立得",
    title: "瞬时片段",
    summary: "适合放细碎瞬间与灵感截图，形成轻量但连续的视觉节奏。",
  },
  paper: {
    kicker: "旧纸",
    title: "纸页叙事",
    summary: "用旧纸质感承接图像与短句，让正文从“横排说明”变成“章内注记”。",
  },
  timeline: {
    kicker: "时间轴",
    title: "时间分镜",
    summary: "按时间顺序收纳多图，便于回看活动演进与阶段变化。",
  },
  track: {
    kicker: "留声机",
    title: "声音镜面",
    summary: "声音条目可与图片混排，形成一组有氛围的视听章节。",
  },
};

function readStoredGalleryLayout(): GalleryLayoutState {
  if (typeof window === "undefined") {
    return DEFAULT_GALLERY_LAYOUT;
  }

  const raw = window.localStorage.getItem(GALLERY_LAYOUT_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_GALLERY_LAYOUT;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GalleryLayoutState>;
    const columns = [1, 2, 3].includes(Number(parsed.columns))
      ? (Number(parsed.columns) as 1 | 2 | 3)
      : DEFAULT_GALLERY_LAYOUT.columns;
    const notesPosition =
      parsed.notesPosition === "bottom" || parsed.notesPosition === "hidden" || parsed.notesPosition === "side"
        ? parsed.notesPosition
        : DEFAULT_GALLERY_LAYOUT.notesPosition;
    const cardAspect =
      parsed.cardAspect === "square" || parsed.cardAspect === "portrait" || parsed.cardAspect === "wide"
        ? parsed.cardAspect
        : DEFAULT_GALLERY_LAYOUT.cardAspect;
    const notesCountRaw = Number.parseInt(String(parsed.notesCount ?? ""), 10);
    const notesCount = Number.isFinite(notesCountRaw)
      ? Math.min(Math.max(notesCountRaw, 1), 24)
      : DEFAULT_GALLERY_LAYOUT.notesCount;

    return {
      cardAspect,
      columns,
      notesCount,
      notesPosition,
    };
  } catch {
    return DEFAULT_GALLERY_LAYOUT;
  }
}

function isLikelyImageSource(value: string): boolean {
  const source = value.trim();
  if (!source) {
    return false;
  }

  if (/^https?:\/\//i.test(source) || source.startsWith("/")) {
    return true;
  }

  return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(source);
}

function normalizeImageSource(value: string): string {
  const source = value.trim();
  if (!source) {
    return "";
  }

  if (/^https?:\/\//i.test(source) || source.startsWith("/")) {
    return source;
  }

  return `/graphs/${encodeURIComponent(source)}`;
}

function moveEntryByID(
  entries: readonly SiteGalleryEntry[],
  draggingID: string,
  targetID: string,
): SiteGalleryEntry[] {
  if (!draggingID || !targetID || draggingID === targetID) {
    return [...entries];
  }

  const dragIndex = entries.findIndex((entry) => entry.id === draggingID);
  const targetIndex = entries.findIndex((entry) => entry.id === targetID);
  if (dragIndex < 0 || targetIndex < 0) {
    return [...entries];
  }

  const next = [...entries];
  const [dragging] = next.splice(dragIndex, 1);
  next.splice(targetIndex, 0, dragging);
  return next;
}

export default function GalleryPage({
  adminGalleryEntries,
  adminGalleryPager,
  canManageGallery,
  editingGalleryEntryID,
  galleryActionState,
  galleryAlbums,
  galleryEntriesRaw,
  galleryForm,
  galleryPapers,
  galleryPolaroids,
  galleryTimeline,
  galleryTracks,
  onGalleryBulkDelete,
  onGalleryBulkSetActive,
  onGalleryDelete,
  onGalleryEditStart,
  onGalleryEditorReset,
  onGalleryFieldChange,
  onGalleryPageChange,
  onGalleryReorder,
  onGallerySortNudge,
  onGallerySubmit,
}: GalleryPageProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [layoutState, setLayoutState] = useState<GalleryLayoutState>(() => readStoredGalleryLayout());
  const [draggingEntryID, setDraggingEntryID] = useState<string>("");
  const [selectedEntryIDs, setSelectedEntryIDs] = useState<string[]>([]);
  const [localAdminEntries, setLocalAdminEntries] = useState<SiteGalleryEntry[]>(adminGalleryEntries);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(GALLERY_LAYOUT_STORAGE_KEY, JSON.stringify(layoutState));
  }, [layoutState]);

  useEffect(() => {
    setLocalAdminEntries(adminGalleryEntries);
  }, [adminGalleryEntries]);

  useEffect(() => {
    setSelectedEntryIDs((current) => current.filter((entryID) => adminGalleryEntries.some((entry) => entry.id === entryID)));
  }, [adminGalleryEntries]);

  const dynamicPhotos: GalleryPhoto[] = galleryEntriesRaw
    .filter((entry) => entry.active && isLikelyImageSource(entry.extra_text || ""))
    .slice(0, 48)
    .map((entry) => ({
      id: `entry-photo-${entry.id}`,
      src: normalizeImageSource(entry.extra_text || ""),
      alt: entry.title,
    }));
  const galleryNarratives: GalleryNarrative[] = [
    ...galleryAlbums.map((entry) => ({
      id: `album-${entry.id}`,
      section: "相册",
      title: entry.title,
      body: entry.caption || "相册编目",
    })),
    ...galleryPolaroids.map((entry) => ({
      id: `polaroid-${entry.id}`,
      section: "拍立得",
      title: entry.title,
      body: entry.note || "单帧印象",
    })),
    ...galleryPapers.map((entry) => ({
      id: `paper-${entry.id}`,
      section: "旧纸",
      title: entry.title,
      body: entry.body || "文字片段",
    })),
    ...galleryTracks.map((entry) => ({
      id: `track-${entry.id}`,
      section: "留声机",
      title: entry.title,
      body: entry.detail || "声音线索",
    })),
    ...galleryTimeline.map((entry) => ({
      id: `timeline-${entry.id}`,
      section: "时间轴",
      title: `${entry.year} · ${entry.title}`,
      body: entry.summary || "节点记录",
    })),
  ];
  const editorialNarratives: GalleryNarrative[] =
    galleryNarratives.length > 0
      ? galleryNarratives
      : dynamicPhotos.map((photo, index) => ({
          id: `photo-note-${photo.id}`,
          section: "展墙",
          title: photo.alt,
          body: `图片说明待补充 #${String(index + 1).padStart(2, "0")}`,
        }));

  const sectionSummaryByType: Record<SiteGalleryEntry["entry_type"], string> = {
    album: galleryAlbums[0]?.caption || GALLERY_SECTION_META.album.summary,
    polaroid: galleryPolaroids[0]?.note || GALLERY_SECTION_META.polaroid.summary,
    paper: galleryPapers[0]?.body || GALLERY_SECTION_META.paper.summary,
    timeline: galleryTimeline[0]?.summary || GALLERY_SECTION_META.timeline.summary,
    track: galleryTracks[0]?.detail || GALLERY_SECTION_META.track.summary,
  };

  const activeImageEntries = galleryEntriesRaw
    .filter((entry) => entry.active && isLikelyImageSource(entry.extra_text || ""))
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));

  const typedSections = GALLERY_SECTION_ORDER
    .map<GalleryCurationSection | null>((type) => {
      const entries = activeImageEntries.filter((entry) => entry.entry_type === type);
      if (!entries.length) {
        return null;
      }

      const meta = GALLERY_SECTION_META[type];
      return {
        id: `section-${type}`,
        type,
        kicker: meta.kicker,
        title: meta.title,
        summary: sectionSummaryByType[type] || meta.summary,
        photos: entries.map((entry) => ({
          id: `section-photo-${entry.id}`,
          src: normalizeImageSource(entry.extra_text || ""),
          alt: entry.title,
          title: entry.title,
        })),
        notes: entries.map((entry) => ({
          id: `section-note-${entry.id}`,
          section: galleryEntryTypeLabel(type),
          title: entry.subtitle?.trim() || entry.title,
          body: entry.body?.trim() || entry.subtitle?.trim() || `${galleryEntryTypeLabel(type)}图像记录`,
        })),
      };
    })
    .filter((section): section is GalleryCurationSection => section !== null);

  const curationSections: GalleryCurationSection[] =
    typedSections.length > 0
      ? typedSections
      : dynamicPhotos.length > 0
        ? [
            {
              id: "section-mixed",
              type: "mixed",
              kicker: "展墙",
              title: "综合画廊",
              summary: "按画面节奏重新编排，支持在同一栏目中连续展示多张图片。",
              photos: dynamicPhotos.map((photo) => ({
                id: `mixed-${photo.id}`,
                src: photo.src,
                alt: photo.alt,
                title: photo.alt,
              })),
              notes: editorialNarratives,
            },
          ]
        : [];

  const curationNotes = curationSections.flatMap((section) =>
    section.notes.map((note) => ({
      ...note,
      section: section.title,
    })),
  );
  const totalCurationPhotos = curationSections.reduce((sum, section) => sum + section.photos.length, 0);

  const layoutStyle = useMemo(
    () =>
      ({
        "--gallery-editor-columns": String(layoutState.columns),
        "--gallery-curation-columns": String(layoutState.columns),
        "--gallery-editor-media-aspect":
          layoutState.cardAspect === "square" ? "1 / 1" : layoutState.cardAspect === "portrait" ? "4 / 5" : "16 / 10",
      }) as CSSProperties,
    [layoutState.cardAspect, layoutState.columns],
  );
  const notesLimit = Math.min(Math.max(layoutState.notesCount, 1), curationNotes.length);
  const visibleNarratives = curationNotes.slice(0, notesLimit);
  const extraTextLabel = galleryForm.entry_type === "track" ? "曲目时长 / 额外文本" : "图片 URL / 额外文本";
  const editorPreviewImage =
    galleryForm.entry_type !== "track" && isLikelyImageSource(galleryForm.extra_text)
      ? normalizeImageSource(galleryForm.extra_text)
      : dynamicPhotos[0]?.src || "";
  const allCurrentPageSelected =
    localAdminEntries.length > 0 && selectedEntryIDs.length === localAdminEntries.length;

  return (
    <section className="gallery-photo-shell gallery-photo-shell--editorial" style={layoutStyle}>
      <div className="gallery-photo-shell__head">
        <div>
          <p className="panel-kicker">展示墙</p>
          <h2>艺术照展示墙</h2>
          <p className="gallery-photo-shell__lede">
            按栏目分组展陈，同一栏目可连续放多张图片，文字改为章节注记，整体更像策展墙而不是图文横排。
          </p>
        </div>
        <div className="gallery-photo-shell__head-actions">
          <StatusChip tone="accent">{totalCurationPhotos} 张照片</StatusChip>
          {canManageGallery ? (
            <button className="ghost-button" onClick={() => setIsEditorOpen((current) => !current)} type="button">
              {isEditorOpen ? "收起前台编辑" : "前台编辑"}
            </button>
          ) : null}
        </div>
      </div>

      {canManageGallery && isEditorOpen ? (
        <section className="gallery-inline-admin">
          <article className="content-card gallery-inline-admin__card">
            <div className="content-card__header">
              <h3>{editingGalleryEntryID ? "编辑展示条目" : "新建展示条目"}</h3>
              <StatusChip tone="accent">{editingGalleryEntryID ? "编辑模式" : "创建模式"}</StatusChip>
            </div>
            {galleryActionState.error ? <p className="panel-error">{galleryActionState.error}</p> : null}
            {galleryActionState.success ? <p className="panel-empty">{galleryActionState.success}</p> : null}
            <form className="space-form" onSubmit={(event) => void onGallerySubmit(event)}>
              <label>
                <span>条目类型</span>
                <select
                  disabled={Boolean(editingGalleryEntryID)}
                  name="entry_type"
                  onChange={onGalleryFieldChange}
                  value={galleryForm.entry_type}
                >
                  <option value="album">相册</option>
                  <option value="polaroid">拍立得</option>
                  <option value="paper">旧纸</option>
                  <option value="timeline">时间轴</option>
                  <option value="track">留声机</option>
                </select>
              </label>
              <label>
                <span>标题</span>
                <input name="title" onChange={onGalleryFieldChange} value={galleryForm.title} required />
              </label>
              <label>
                <span>别名</span>
                <input name="slug" onChange={onGalleryFieldChange} value={galleryForm.slug} />
              </label>
              <label>
                <span>副标题</span>
                <input name="subtitle" onChange={onGalleryFieldChange} value={galleryForm.subtitle} />
              </label>
              <label>
                <span>正文 / 描述</span>
                <textarea name="body" onChange={onGalleryFieldChange} rows={4} value={galleryForm.body} />
              </label>
              <label>
                <span>{extraTextLabel}</span>
                <input
                  name="extra_text"
                  onChange={onGalleryFieldChange}
                  placeholder={galleryForm.entry_type === "track" ? "例如 03:24" : "可填写图片链接"}
                  value={galleryForm.extra_text}
                />
              </label>
              <label>
                <span>排序</span>
                <input name="sort_order" onChange={onGalleryFieldChange} value={galleryForm.sort_order} />
              </label>
              <label className="gallery-admin__toggle">
                <input checked={galleryForm.active} name="active" onChange={onGalleryFieldChange} type="checkbox" />
                <span>设为公开展示</span>
              </label>
              <div className="gallery-admin__actions">
                <button className="primary-button" disabled={galleryActionState.pending} type="submit">
                  {galleryActionState.pending ? "保存中..." : editingGalleryEntryID ? "更新展示条目" : "创建展示条目"}
                </button>
                <button className="ghost-button" onClick={onGalleryEditorReset} type="button">
                  清空表单
                </button>
              </div>
            </form>
            <div className="gallery-inline-admin__preview">
              <p className="panel-kicker">实时预览</p>
              <figure className="gallery-photo-card">
                <div className="gallery-photo-card__media">
                  {editorPreviewImage ? (
                    <img alt={galleryForm.title || "未命名条目"} src={editorPreviewImage} />
                  ) : (
                    <p className="panel-empty">暂无图片预览</p>
                  )}
                </div>
                <figcaption className="gallery-photo-card__caption">
                  <p className="gallery-photo-card__meta">
                    <span>{galleryEntryTypeLabel(galleryForm.entry_type)}</span>
                    <span>排序 {galleryForm.sort_order || "0"}</span>
                  </p>
                  <strong>{galleryForm.title || "未命名条目"}</strong>
                  <p>{galleryForm.body || "这里会显示正文描述预览。"}</p>
                </figcaption>
              </figure>
            </div>
          </article>

          <article className="content-card gallery-inline-admin__card">
            <div className="content-card__header">
              <h3>布局与条目列表</h3>
              <StatusChip tone="neutral">{adminGalleryPager.total} 条</StatusChip>
            </div>
            <p className="gallery-inline-admin__hint">布局设置保存到当前浏览器，条目编辑会直接写入站点数据。</p>
            <form
              className="space-form gallery-inline-admin__layout"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <label>
                <span>图片列数</span>
                <select
                  value={layoutState.columns}
                  onChange={(event) =>
                    setLayoutState((current) => ({
                      ...current,
                      columns: Number.parseInt(event.target.value, 10) === 1 ? 1 : Number.parseInt(event.target.value, 10) === 3 ? 3 : 2,
                    }))
                  }
                >
                  <option value="1">1 列</option>
                  <option value="2">2 列</option>
                  <option value="3">3 列</option>
                </select>
              </label>
              <label>
                <span>描述区位置</span>
                <select
                  value={layoutState.notesPosition}
                  onChange={(event) =>
                    setLayoutState((current) => ({
                      ...current,
                      notesPosition:
                        event.target.value === "bottom" || event.target.value === "hidden" ? event.target.value : "side",
                    }))
                  }
                >
                  <option value="side">右侧</option>
                  <option value="bottom">底部</option>
                  <option value="hidden">隐藏</option>
                </select>
              </label>
              <label>
                <span>图片比例</span>
                <select
                  value={layoutState.cardAspect}
                  onChange={(event) =>
                    setLayoutState((current) => ({
                      ...current,
                      cardAspect:
                        event.target.value === "square" || event.target.value === "portrait" ? event.target.value : "wide",
                    }))
                  }
                >
                  <option value="wide">横向</option>
                  <option value="square">方形</option>
                  <option value="portrait">竖向</option>
                </select>
              </label>
              <label>
                <span>描述条数</span>
                <input
                  max={24}
                  min={1}
                  type="number"
                  value={layoutState.notesCount}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    setLayoutState((current) => ({
                      ...current,
                      notesCount: Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 24) : current.notesCount,
                    }));
                  }}
                />
              </label>
              <div className="gallery-admin__actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setLayoutState(DEFAULT_GALLERY_LAYOUT)}
                >
                  重置布局
                </button>
              </div>
            </form>

            <div className="gallery-admin__actions gallery-inline-admin__bulk-actions">
              <label className="gallery-admin__toggle">
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={(event) =>
                    setSelectedEntryIDs(event.target.checked ? localAdminEntries.map((entry) => entry.id) : [])
                  }
                />
                <span>本页全选（{selectedEntryIDs.length}/{localAdminEntries.length}）</span>
              </label>
              <button
                className="ghost-button"
                type="button"
                disabled={!selectedEntryIDs.length}
                onClick={() => void onGalleryBulkSetActive(selectedEntryIDs, true)}
              >
                批量公开
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!selectedEntryIDs.length}
                onClick={() => void onGalleryBulkSetActive(selectedEntryIDs, false)}
              >
                批量隐藏
              </button>
              <button
                className="ghost-button gallery-admin__danger"
                type="button"
                disabled={!selectedEntryIDs.length}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    const confirmed = window.confirm(`确定批量删除 ${selectedEntryIDs.length} 条展示条目吗？`);
                    if (!confirmed) {
                      return;
                    }
                  }
                  void onGalleryBulkDelete(selectedEntryIDs);
                }}
              >
                批量删除
              </button>
            </div>

            <div className="stack-list gallery-entry-inline-list">
              {localAdminEntries.map((entry) => (
                <div
                  className={`content-card gallery-entry-inline-item ${
                    selectedEntryIDs.includes(entry.id) ? "gallery-entry-inline-item--selected" : ""
                  }`}
                  key={entry.id}
                  draggable
                  onDragStart={() => setDraggingEntryID(entry.id)}
                  onDragEnd={() => setDraggingEntryID("")}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggingEntryID || draggingEntryID === entry.id) {
                      return;
                    }
                    const nextEntries = moveEntryByID(localAdminEntries, draggingEntryID, entry.id);
                    setDraggingEntryID("");
                    setLocalAdminEntries(nextEntries);
                    void onGalleryReorder(nextEntries.map((item) => item.id));
                  }}
                >
                  <div className="content-card__header">
                    <h3>
                      <label className="gallery-entry-inline-item__check">
                        <input
                          type="checkbox"
                          checked={selectedEntryIDs.includes(entry.id)}
                          onChange={(event) =>
                            setSelectedEntryIDs((current) =>
                              event.target.checked
                                ? Array.from(new Set([...current, entry.id]))
                                : current.filter((entryID) => entryID !== entry.id),
                            )
                          }
                        />
                        <span>{entry.title}</span>
                      </label>
                    </h3>
                    <StatusChip tone={entry.active ? "success" : "warn"}>
                      {entry.active ? "已启用" : "已隐藏"}
                    </StatusChip>
                  </div>
                  <p>{entry.body || "暂无描述。"}</p>
                  <div className="meta-row">
                    <span>{galleryEntryTypeLabel(entry.entry_type)}</span>
                    <span>排序: {entry.sort_order}</span>
                    <span>别名: {entry.slug}</span>
                  </div>
                  <div className="gallery-admin__actions">
                    <button className="ghost-button" onClick={() => void onGallerySortNudge(entry, -1)} type="button">
                      上移
                    </button>
                    <button className="ghost-button" onClick={() => void onGallerySortNudge(entry, 1)} type="button">
                      下移
                    </button>
                    <button className="ghost-button" onClick={() => onGalleryEditStart(entry)} type="button">
                      编辑
                    </button>
                    <button className="ghost-button gallery-admin__danger" onClick={() => void onGalleryDelete(entry)} type="button">
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {!localAdminEntries.length ? <p className="panel-empty">当前还没有可管理的展示条目。</p> : null}
            </div>
            {adminGalleryPager.total <= 0 ? (
              <p className="panel-empty">暂无可管理条目。</p>
            ) : (
              <div className="pagination-bar gallery-inline-admin__pager">
                <span className="pagination-bar__meta">
                  第 {adminGalleryPager.page} / {Math.max(adminGalleryPager.totalPages, 1)} 页，共 {adminGalleryPager.total} 条
                </span>
                <div className="pagination-bar__actions">
                  <button
                    className="ghost-button"
                    disabled={adminGalleryPager.page <= 1}
                    onClick={() => onGalleryPageChange(adminGalleryPager.page - 1)}
                    type="button"
                  >
                    上一页
                  </button>
                  <button
                    className="ghost-button"
                    disabled={adminGalleryPager.totalPages === 0 || adminGalleryPager.page >= adminGalleryPager.totalPages}
                    onClick={() => onGalleryPageChange(adminGalleryPager.page + 1)}
                    type="button"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </article>
        </section>
      ) : null}

      <div
        className={`gallery-curation-layout ${
          layoutState.notesPosition === "bottom"
            ? "gallery-curation-layout--notes-bottom"
            : layoutState.notesPosition === "hidden"
              ? "gallery-curation-layout--notes-hidden"
              : "gallery-curation-layout--notes-side"
        }`}
      >
        <div className="gallery-curation-stack">
          {curationSections.map((section, sectionIndex) => (
            <article
              className={`gallery-curation-section gallery-curation-section--${section.type}`}
              key={section.id}
            >
              <div className="gallery-curation-section__head">
                <div>
                  <p className="panel-kicker">{section.kicker}</p>
                  <h3>{section.title}</h3>
                </div>
                <StatusChip tone="neutral">{section.photos.length} 张</StatusChip>
              </div>
              <p className="gallery-curation-section__summary">{section.summary}</p>
              <div className="gallery-curation-grid">
                {section.photos.map((photo, index) => (
                  <figure
                    className={`gallery-curation-card ${
                      index % 7 === 0
                        ? "gallery-curation-card--featured"
                        : index % 5 === 0
                          ? "gallery-curation-card--tall"
                          : ""
                    }`}
                    key={photo.id}
                  >
                    <div className="gallery-curation-card__media">
                      <img alt={photo.alt} loading="lazy" src={photo.src} />
                    </div>
                    <figcaption className="gallery-curation-card__caption">
                      <span className="gallery-curation-card__index">
                        {String(sectionIndex + 1).padStart(2, "0")}-{String(index + 1).padStart(2, "0")}
                      </span>
                      <strong>{photo.title}</strong>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </article>
          ))}
          {!curationSections.length ? (
            <p className="panel-empty">当前还没有展示图片，管理员可在上方直编中创建条目并填写图片链接。</p>
          ) : null}
        </div>

        {layoutState.notesPosition === "side" ? (
          <aside className="gallery-curation-notes">
            <div className="gallery-curation-notes__head">
              <p className="panel-kicker">章节注记</p>
              <h3>文字索引</h3>
            </div>
            <ol className="gallery-curation-notes__list">
              {visibleNarratives.map((entry, index) => (
                <li className="gallery-curation-notes__item" key={entry.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{entry.title}</strong>
                    <small>{entry.section}</small>
                    <p>{entry.body}</p>
                  </div>
                </li>
              ))}
              {!visibleNarratives.length ? <p className="panel-empty">暂无可展示的文字描述。</p> : null}
            </ol>
          </aside>
        ) : null}
      </div>

      {layoutState.notesPosition === "bottom" ? (
        <section className="gallery-curation-notes gallery-curation-notes--bottom">
          <div className="gallery-curation-notes__head">
            <p className="panel-kicker">章节注记</p>
            <h3>文字索引</h3>
          </div>
          <ol className="gallery-curation-notes__list">
            {visibleNarratives.map((entry, index) => (
              <li className="gallery-curation-notes__item" key={entry.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{entry.title}</strong>
                  <small>{entry.section}</small>
                  <p>{entry.body}</p>
                </div>
              </li>
            ))}
            {!visibleNarratives.length ? <p className="panel-empty">暂无可展示的文字描述。</p> : null}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
