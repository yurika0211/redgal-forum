import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { Badge, Button, Group, Paper } from "@mantine/core";
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
  galleryUploadState: FormActionState<SiteGalleryEntry[]>;
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
  onGalleryAnnotate: (entryID: string, annotation: string) => Promise<void>;
  onGalleryEditorReset: () => void;
  onGalleryFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onGalleryPageChange: (page: number) => void;
  onGalleryReorder: (orderedEntryIDs: readonly string[]) => Promise<void>;
  onGallerySortNudge: (entry: SiteGalleryEntry, delta: -1 | 1) => Promise<void>;
  onGallerySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onGalleryUploadFiles: (files: readonly File[]) => Promise<void>;
}

interface GalleryPhoto {
  alt: string;
  annotation: string;
  entryID: string;
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
  annotation: string;
  id: string;
  entryID: string;
  src: string;
  alt: string;
  title: string;
}

interface GalleryCurationSection {
  id: string;
  type: GallerySectionType;
  kicker: string;
  typeLabel: string;
  title: string;
  summary: string;
  photos: GallerySectionPhoto[];
  notes: GalleryNarrative[];
}

interface GalleryLightboxPhoto extends GallerySectionPhoto {
  marker: string;
  sectionKicker: string;
  sectionTitle: string;
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
const GALLERY_SECTION_INDEX = new Map(GALLERY_SECTION_ORDER.map((type, index) => [type, index] as const));

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

const UNSAFE_ACTIVITY_TAG_PATTERN = /鸡巴|鸡8|jiba/iu;

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

function deriveActivityTag(entry: SiteGalleryEntry): string {
  const subtitle = sanitizeActivityTag(entry.subtitle || "");
  if (subtitle) {
    return subtitle;
  }

  const normalizedTitle = sanitizeActivityTag(
    entry.title.trim().replace(/(?:\s*[-_/]?\s*)?#?\d{1,3}$/u, "").trim(),
  );
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const slugBase = sanitizeActivityTag(
    entry.slug
      .trim()
      .replace(/-[a-z0-9]{6,}-\d+$/i, "")
      .replace(/-\d+$/i, "")
      .replace(/[-_]+/g, " ")
      .trim(),
  );
  if (slugBase) {
    return slugBase;
  }

  return galleryEntryTypeLabel(entry.entry_type);
}

function sanitizeActivityTag(value: string): string {
  const normalized = value.replace(/#/g, "").replace(/\s+/g, " ").trim();
  if (!normalized || UNSAFE_ACTIVITY_TAG_PATTERN.test(normalized)) {
    return "";
  }
  return normalized.slice(0, 24);
}

function normalizeActivityKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export default function GalleryPage({
  adminGalleryEntries,
  adminGalleryPager,
  canManageGallery,
  editingGalleryEntryID,
  galleryActionState,
  galleryUploadState,
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
  onGalleryAnnotate,
  onGalleryEditorReset,
  onGalleryFieldChange,
  onGalleryPageChange,
  onGalleryReorder,
  onGallerySortNudge,
  onGallerySubmit,
  onGalleryUploadFiles,
}: GalleryPageProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [layoutState, setLayoutState] = useState<GalleryLayoutState>(() => readStoredGalleryLayout());
  const [draggingEntryID, setDraggingEntryID] = useState<string>("");
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [isAnnotationSaving, setIsAnnotationSaving] = useState(false);
  const [lightboxAnnotationDraft, setLightboxAnnotationDraft] = useState("");
  const [lightboxAnnotationFeedback, setLightboxAnnotationFeedback] = useState("");
  const [selectedEntryIDs, setSelectedEntryIDs] = useState<string[]>([]);
  const [localAdminEntries, setLocalAdminEntries] = useState<SiteGalleryEntry[]>(adminGalleryEntries);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);

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

  useEffect(() => {
    if (!galleryUploadState.pending && (galleryUploadState.success || galleryUploadState.error)) {
      setPendingUploadFiles([]);
    }
  }, [galleryUploadState.error, galleryUploadState.pending, galleryUploadState.success]);

  const dynamicPhotos: GalleryPhoto[] = galleryEntriesRaw
    .filter((entry) => entry.active && isLikelyImageSource(entry.extra_text || ""))
    .slice(0, 48)
    .map((entry) => ({
      annotation: entry.body?.trim() || entry.subtitle?.trim() || "",
      entryID: entry.id,
      id: `entry-photo-${entry.id}`,
      src: normalizeImageSource(entry.extra_text || ""),
      alt: entry.title,
    }));
  const activeImageEntries = galleryEntriesRaw
    .filter((entry) => entry.active && isLikelyImageSource(entry.extra_text || ""))
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
  const activeEntriesCount = galleryEntriesRaw.filter((entry) => entry.active).length;

  const activitySectionMap = new Map<
    string,
    {
      id: string;
      type: SiteGalleryEntry["entry_type"];
      kicker: string;
      photos: GallerySectionPhoto[];
    }
  >();
  activeImageEntries.forEach((entry) => {
    const activityTag = deriveActivityTag(entry);
    const activityKey = normalizeActivityKey(activityTag) || `activity-${entry.id}`;
    const existing = activitySectionMap.get(activityKey);

    const photo: GallerySectionPhoto = {
      annotation: entry.body?.trim() || entry.subtitle?.trim() || "",
      entryID: entry.id,
      id: `section-photo-${entry.id}`,
      src: normalizeImageSource(entry.extra_text || ""),
      alt: entry.title,
      title: entry.title,
    };

    if (!existing) {
      activitySectionMap.set(activityKey, {
        id: `section-activity-${entry.id}`,
        type: entry.entry_type,
        kicker: activityTag,
        photos: [photo],
      });
      return;
    }

    existing.photos.push(photo);
  });

  const curationSections: GalleryCurationSection[] = Array.from(activitySectionMap.values())
    .sort((left, right) => {
      const leftIndex = GALLERY_SECTION_INDEX.get(left.type) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = GALLERY_SECTION_INDEX.get(right.type) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return left.kicker.localeCompare(right.kicker, "zh-CN");
    })
    .map((section) => {
      const meta = GALLERY_SECTION_META[section.type];
      return {
        id: section.id,
        type: section.type,
        kicker: section.kicker,
        typeLabel: meta.kicker,
        title: section.kicker,
        summary: `${meta.summary} 本组共 ${section.photos.length} 张图。`,
        photos: section.photos,
        notes: [],
      };
    });

  const lightboxPhotos = curationSections.flatMap((section, sectionIndex) =>
    section.photos.map<GalleryLightboxPhoto>((photo, photoIndex) => ({
      ...photo,
      marker: `${String(sectionIndex + 1).padStart(2, "0")}-${String(photoIndex + 1).padStart(2, "0")}`,
      sectionKicker: section.kicker,
      sectionTitle: section.title,
    })),
  );
  const lightboxIndexByPhotoID = new Map(lightboxPhotos.map((photo, index) => [photo.id, index] as const));
  const activeLightboxPhoto =
    lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length ? lightboxPhotos[lightboxIndex] : null;
  const isLightboxOpen = lightboxIndex >= 0 && lightboxIndex < lightboxPhotos.length;
  const activeLightboxAnnotation = activeLightboxPhoto?.annotation?.trim() || "";
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
  const extraTextLabel = galleryForm.entry_type === "track" ? "曲目时长 / 额外文本" : "图片 URL / 额外文本";
  const editorPreviewImage =
    galleryForm.entry_type !== "track" && isLikelyImageSource(galleryForm.extra_text)
      ? normalizeImageSource(galleryForm.extra_text)
      : dynamicPhotos[0]?.src || "";
  const allCurrentPageSelected =
    localAdminEntries.length > 0 && selectedEntryIDs.length === localAdminEntries.length;
  const uploadFileCount = pendingUploadFiles.length;
  const uploadFileNamesPreview =
    uploadFileCount <= 3
      ? pendingUploadFiles.map((file) => file.name).join("，")
      : `${pendingUploadFiles.slice(0, 3).map((file) => file.name).join("，")} 等`;
  const curationStats = [
    { id: "total", label: "总条目", value: galleryEntriesRaw.length },
    { id: "active", label: "公开条目", value: activeEntriesCount },
    { id: "images", label: "图片卡片", value: activeImageEntries.length },
    { id: "sections", label: "章节分组", value: curationSections.length },
  ];
  const galleryTypeDistribution = [
    { id: "album", label: "相册", value: galleryAlbums.length },
    { id: "polaroid", label: "拍立得", value: galleryPolaroids.length },
    { id: "paper", label: "旧纸", value: galleryPapers.length },
    { id: "timeline", label: "时间轴", value: galleryTimeline.length },
    { id: "track", label: "留声机", value: galleryTracks.length },
  ].filter((item) => item.value > 0);

  useEffect(() => {
    if (!lightboxPhotos.length) {
      setLightboxIndex(-1);
      return;
    }

    setLightboxIndex((current) => (current >= lightboxPhotos.length ? lightboxPhotos.length - 1 : current));
  }, [lightboxPhotos.length]);

  useEffect(() => {
    if (!isLightboxOpen || typeof window === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(-1);
        return;
      }

      if (lightboxPhotos.length <= 1) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setLightboxIndex((current) => (current + 1 + lightboxPhotos.length) % lightboxPhotos.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLightboxIndex((current) => (current - 1 + lightboxPhotos.length) % lightboxPhotos.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, lightboxPhotos.length]);

  useEffect(() => {
    if (!activeLightboxPhoto) {
      setLightboxAnnotationDraft("");
      setLightboxAnnotationFeedback("");
      setIsAnnotationSaving(false);
      return;
    }

    setLightboxAnnotationDraft(activeLightboxPhoto.annotation || "");
    setLightboxAnnotationFeedback("");
  }, [activeLightboxPhoto?.id, activeLightboxPhoto?.annotation]);

  async function handleLightboxAnnotationSave(): Promise<void> {
    if (!activeLightboxPhoto?.entryID) {
      return;
    }

    setIsAnnotationSaving(true);
    setLightboxAnnotationFeedback("");

    try {
      await onGalleryAnnotate(activeLightboxPhoto.entryID, lightboxAnnotationDraft);
      setLightboxAnnotationFeedback("注释已保存。");
    } catch {
      setLightboxAnnotationFeedback("注释保存失败，请稍后重试。");
    } finally {
      setIsAnnotationSaving(false);
    }
  }

  function openLightboxByPhotoID(photoID: string): void {
    const targetIndex = lightboxIndexByPhotoID.get(photoID);
    if (typeof targetIndex === "number") {
      setLightboxIndex(targetIndex);
    }
  }

  function scrollToSection(sectionID: string): void {
    if (typeof document === "undefined") {
      return;
    }

    const section = document.getElementById(`gallery-curation-section-${sectionID}`);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="gallery-photo-shell gallery-photo-shell--editorial" style={layoutStyle}>
      <Paper className="gallery-photo-shell__head gallery-photo-shell__head--art gallery-mantine-hero" p="md" radius="lg" withBorder>
        <div className="gallery-photo-shell__head-copy">
          <p className="gallery-photo-shell__head-kicker">Gallery Curation</p>
          <h2 className="gallery-photo-shell__art-title">光影艺术墙</h2>
          <p className="gallery-photo-shell__head-note">按活动章节浏览图片，点击任意卡片可查看大图与注释。</p>
          <div className="gallery-photo-shell__hero-metrics">
            {curationStats.map((item) => (
              <div className="gallery-photo-shell__hero-stat" key={item.id}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          {galleryTypeDistribution.length ? (
            <div className="gallery-photo-shell__hero-type-row" aria-label="内容构成">
              <span className="gallery-photo-shell__hero-type-label">内容构成</span>
              <div className="gallery-photo-shell__hero-type-chips">
                {galleryTypeDistribution.map((item) => (
                  <StatusChip key={item.id} tone="neutral">
                    {item.label} {item.value}
                  </StatusChip>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {canManageGallery ? (
          <div className="gallery-photo-shell__head-actions">
            <Button
              className="gallery-photo-shell__hero-cta"
              variant="outline"
              radius="md"
              onClick={() => setIsEditorOpen((current) => !current)}
              type="button"
            >
              {isEditorOpen ? "收起前台编辑" : "前台编辑"}
            </Button>
          </div>
        ) : null}
      </Paper>

      {canManageGallery && isEditorOpen ? (
        <section className="gallery-inline-admin">
          <article className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <h3>{editingGalleryEntryID ? "编辑展示条目" : "新建展示条目"}</h3>
              <StatusChip tone="accent">{editingGalleryEntryID ? "编辑模式" : "创建模式"}</StatusChip>
            </div>
            <p className="gallery-inline-admin__hint">优先填写标题和图片信息，再补充描述与排序，保存后即可在前台展示。</p>
            {galleryActionState.error ? <p className="text-sm text-rose-500/90">{galleryActionState.error}</p> : null}
            {galleryActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{galleryActionState.success}</p> : null}
            <form className="form-layout gallery-inline-admin__form" onSubmit={(event) => void onGallerySubmit(event)}>
              <section className="form-section gallery-inline-admin__group">
                <p className="form-section__kicker">基础信息</p>
                <h4 className="form-section__title">展示条目元数据</h4>
                <div className="form-grid-2">
                  <label className="form-field">
                    <span>条目类型</span>
                    <select
                      className="form-control"
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
                  <label className="form-field">
                    <span>标题</span>
                    <input className="form-control" name="title" onChange={onGalleryFieldChange} value={galleryForm.title} required />
                  </label>
                  <label className="form-field">
                    <span>别名（slug）</span>
                    <input className="form-control" name="slug" onChange={onGalleryFieldChange} value={galleryForm.slug} />
                  </label>
                  <label className="form-field">
                    <span>副标题</span>
                    <input className="form-control" name="subtitle" onChange={onGalleryFieldChange} value={galleryForm.subtitle} />
                  </label>
                </div>
              </section>

              <section className="form-section gallery-inline-admin__group">
                <p className="form-section__kicker">媒体资源</p>
                <h4 className="form-section__title">图文与素材</h4>
                <label className="form-field">
                  <span>正文 / 描述</span>
                  <textarea className="form-control" name="body" onChange={onGalleryFieldChange} rows={4} value={galleryForm.body} />
                </label>
                <label className="form-field">
                  <span>{extraTextLabel}</span>
                  <input
                    className="form-control"
                    name="extra_text"
                    onChange={onGalleryFieldChange}
                    placeholder={galleryForm.entry_type === "track" ? "例如 03:24" : "可填写图片链接"}
                    value={galleryForm.extra_text}
                  />
                </label>
              {galleryForm.entry_type !== "track" ? (
                <>
                  <label className="gallery-inline-admin__upload-field form-field">
                    <span>多图片上传（可一次选择多张）</span>
                    <input
                      className="form-control"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        setPendingUploadFiles(files);
                      }}
                      type="file"
                    />
                  </label>
                  {uploadFileCount > 0 ? (
                    <p className="text-xs text-[color:var(--text-muted)]">
                      已选择 {uploadFileCount} 张：{uploadFileNamesPreview}
                    </p>
                  ) : null}
                  {uploadFileCount > 1 && !editingGalleryEntryID ? (
                    <p className="text-xs text-[color:var(--text-muted)]">
                      多图上传会自动按当前类型与排序批量创建条目。
                    </p>
                  ) : null}
                  {galleryUploadState.error ? <p className="text-sm text-rose-500/90">{galleryUploadState.error}</p> : null}
                  {galleryUploadState.success ? <p className="text-sm text-[color:var(--text-muted)]">{galleryUploadState.success}</p> : null}
                  <div className="form-actions gallery-inline-admin__upload-actions">
                    <button
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={galleryUploadState.pending || uploadFileCount <= 0}
                      onClick={() => void onGalleryUploadFiles(pendingUploadFiles)}
                      type="button"
                    >
                      {galleryUploadState.pending ? "上传中..." : "上传图片"}
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={galleryUploadState.pending || uploadFileCount <= 0}
                      onClick={() => setPendingUploadFiles([])}
                      type="button"
                    >
                      清空选择
                    </button>
                  </div>
                </>
              ) : null}
              </section>

              <section className="form-section gallery-inline-admin__group">
                <p className="form-section__kicker">发布设置</p>
                <h4 className="form-section__title">排序与可见性</h4>
                <label className="form-field">
                  <span>排序权重</span>
                  <input className="form-control" name="sort_order" onChange={onGalleryFieldChange} value={galleryForm.sort_order} />
                </label>
                <label className="form-check">
                  <input checked={galleryForm.active} name="active" onChange={onGalleryFieldChange} type="checkbox" />
                  <span>保存后立即公开展示</span>
                </label>
              </section>

              <div className="form-actions">
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" disabled={galleryActionState.pending} type="submit">
                  {galleryActionState.pending ? "保存中..." : editingGalleryEntryID ? "更新展示条目" : "创建展示条目"}
                </button>
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" onClick={onGalleryEditorReset} type="button">
                  清空表单
                </button>
              </div>
            </form>
            <div className="gallery-inline-admin__preview">
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">实时预览</p>
              <figure className="gallery-photo-card">
                <div className="gallery-photo-card__media">
                  {editorPreviewImage ? (
                    <img alt={galleryForm.title || "未命名条目"} src={editorPreviewImage} />
                  ) : (
                    <p className="text-sm text-[color:var(--text-muted)]">暂无图片预览</p>
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

          <article className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <h3>布局与条目列表</h3>
              <StatusChip tone="neutral">{adminGalleryPager.total} 条</StatusChip>
            </div>
            <p className="gallery-inline-admin__hint">布局设置仅保存在当前浏览器，条目编辑会直接写入站点数据。</p>
            <form
              className="form-layout gallery-inline-admin__layout"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <label className="form-field">
                <span>图片列数</span>
                <select
                  className="form-control"
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
              <label className="form-field">
                <span>图片比例</span>
                <select
                  className="form-control"
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
              <div className="form-actions">
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => setLayoutState(DEFAULT_GALLERY_LAYOUT)}
                >
                  重置布局
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-2 gallery-inline-admin__bulk-actions">
              <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
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
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!selectedEntryIDs.length}
                onClick={() => void onGalleryBulkSetActive(selectedEntryIDs, true)}
              >
                批量公开
              </button>
              <button
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={!selectedEntryIDs.length}
                onClick={() => void onGalleryBulkSetActive(selectedEntryIDs, false)}
              >
                批量隐藏
              </button>
              <button
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30"
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

            <div className="grid gap-3 gallery-entry-inline-list">
              {localAdminEntries.map((entry) => (
                <div
                  className={`rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 gallery-entry-inline-item ${
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
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                    <span>{galleryEntryTypeLabel(entry.entry_type)}</span>
                    <span>排序: {entry.sort_order}</span>
                    <span>别名: {entry.slug}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void onGallerySortNudge(entry, -1)} type="button">
                      上移
                    </button>
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void onGallerySortNudge(entry, 1)} type="button">
                      下移
                    </button>
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => onGalleryEditStart(entry)} type="button">
                      编辑
                    </button>
                    <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30" onClick={() => void onGalleryDelete(entry)} type="button">
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {!localAdminEntries.length ? <p className="text-sm text-[color:var(--text-muted)]">当前还没有可管理的展示条目。</p> : null}
            </div>
            {adminGalleryPager.total <= 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">暂无可管理条目。</p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-2">
                <span className="text-xs text-[color:var(--text-muted)]">
                  第 {adminGalleryPager.page} / {Math.max(adminGalleryPager.totalPages, 1)} 页，共 {adminGalleryPager.total} 条
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex min-h-8 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-white/60 px-3 py-1 text-xs font-semibold text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={adminGalleryPager.page <= 1}
                    onClick={() => onGalleryPageChange(adminGalleryPager.page - 1)}
                    type="button"
                  >
                    上一页
                  </button>
                  <button
                    className="inline-flex min-h-8 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-white/60 px-3 py-1 text-xs font-semibold text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
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

      {curationSections.length > 1 ? (
        <nav className="gallery-topic-nav" aria-label="展示墙章节导航">
          <div className="gallery-topic-nav__head">
            <span className="gallery-topic-nav__label">快速跳转</span>
            <p className="gallery-topic-nav__hint">按章节定位图片区块，避免长列表来回滚动。</p>
          </div>
          <div className="gallery-topic-nav__items">
            {curationSections.map((section) => (
              <button
                className="gallery-topic-nav__button"
                key={`nav-${section.id}`}
                onClick={() => scrollToSection(section.id)}
                type="button"
              >
                #{section.kicker} ({section.photos.length})
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      <div className="gallery-curation-layout gallery-curation-layout--notes-hidden">
        <div className="gallery-curation-stack">
          {curationSections.map((section) => (
            <article
              className={`ui-card-panel gallery-curation-section gallery-curation-section--${section.type}`}
              id={`gallery-curation-section-${section.id}`}
              key={section.id}
            >
              <div className="gallery-curation-section__head">
                <div className="gallery-curation-section__intro">
                  <span className="gallery-topic-tag">#{section.kicker}</span>
                  <h3>{section.title}</h3>
                  <p className="gallery-curation-section__summary">{section.summary}</p>
                </div>
                <div className="gallery-curation-section__meta">
                  <StatusChip tone="neutral">{section.typeLabel}</StatusChip>
                  <StatusChip tone="accent">{section.photos.length} 张</StatusChip>
                </div>
              </div>
              <div className="gallery-wall-carousel">
                <div className="gallery-curation-grid gallery-curation-grid--wall">
                  {section.photos.map((photo, photoIndex) => (
                    <Paper
                      component="figure"
                      withBorder
                      radius="xs"
                      shadow="sm"
                      className={`gallery-curation-card gallery-wall-frame gallery-wall-frame--${(photoIndex % 5) + 1}`}
                      key={photo.id}
                    >
                      <span aria-hidden="true" className="gallery-wall-frame__pin" />
                      <div
                        aria-label={`查看大图：${photo.title}`}
                        className="gallery-curation-card__media gallery-curation-card__media--clickable"
                        onClick={() => openLightboxByPhotoID(photo.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openLightboxByPhotoID(photo.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <img alt={photo.alt} loading="lazy" src={photo.src} />
                      </div>
                    </Paper>
                  ))}
                </div>
              </div>
            </article>
          ))}
          {!curationSections.length ? (
            <p className="gallery-empty-state text-sm text-[color:var(--text-muted)]">
              {canManageGallery
                ? "当前还没有展示图片，可展开“前台编辑”创建条目并填写图片链接。"
                : "展示墙正在准备中，稍后会陆续更新新的图像章节。"}
            </p>
          ) : null}
        </div>
      </div>

      {activeLightboxPhoto ? (
        <div className="gallery-lightbox" role="dialog" aria-label="展示墙大图预览" aria-modal="true">
          <button
            aria-label="关闭大图预览"
            className="gallery-lightbox__backdrop"
            onClick={() => setLightboxIndex(-1)}
            type="button"
          />
          <article className="gallery-lightbox__panel">
            <div className="gallery-lightbox__head">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{activeLightboxPhoto.sectionKicker}</p>
                <h3>{activeLightboxPhoto.title}</h3>
              </div>
              <Button variant="default" radius="md" onClick={() => setLightboxIndex(-1)} type="button">
                关闭
              </Button>
            </div>
            <div className="gallery-lightbox__media">
              <img alt={activeLightboxPhoto.alt} src={activeLightboxPhoto.src} />
            </div>
            <div className="gallery-lightbox__foot">
              <div className="gallery-lightbox__annotation">
                <p className="gallery-lightbox__annotation-label">图片注释</p>
                {canManageGallery && activeLightboxPhoto.entryID ? (
                  <label className="gallery-lightbox__annotation-editor">
                    <textarea
                      rows={3}
                      value={lightboxAnnotationDraft}
                      onChange={(event) => setLightboxAnnotationDraft(event.target.value)}
                      placeholder="给这张图片写注释..."
                    />
                  </label>
                ) : (
                  <p className="gallery-lightbox__annotation-body">
                    {activeLightboxAnnotation || "暂无注释。"}
                  </p>
                )}
                {canManageGallery && activeLightboxPhoto.entryID ? (
                  <div className="gallery-lightbox__annotation-actions">
                    <Button variant="light" color="teal" radius="md" disabled={isAnnotationSaving} onClick={() => void handleLightboxAnnotationSave()} type="button">
                      {isAnnotationSaving ? "保存中..." : "保存注释"}
                    </Button>
                  </div>
                ) : null}
                {lightboxAnnotationFeedback ? <p className="text-sm text-[color:var(--text-muted)]">{lightboxAnnotationFeedback}</p> : null}
              </div>
              <Group className="gallery-lightbox__meta" gap="xs">
                <Badge variant="light" color="teal">
                  {activeLightboxPhoto.sectionTitle}
                </Badge>
                <Badge variant="outline" color="gray">
                  {activeLightboxPhoto.marker}
                </Badge>
                <Badge variant="default">{lightboxIndex + 1} / {lightboxPhotos.length}</Badge>
              </Group>
              <p className="gallery-lightbox__hint">支持键盘 ← / → 切换，Esc 关闭预览。</p>
              <div className="gallery-lightbox__actions">
                <Button
                  variant="default"
                  radius="md"
                  disabled={lightboxPhotos.length <= 1}
                  onClick={() =>
                    setLightboxIndex((current) => (current - 1 + lightboxPhotos.length) % lightboxPhotos.length)
                  }
                  type="button"
                >
                  上一张
                </Button>
                <Button
                  variant="filled"
                  color="teal"
                  radius="md"
                  disabled={lightboxPhotos.length <= 1}
                  onClick={() =>
                    setLightboxIndex((current) => (current + 1 + lightboxPhotos.length) % lightboxPhotos.length)
                  }
                  type="button"
                >
                  下一张
                </Button>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
