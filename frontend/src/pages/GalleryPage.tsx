import type { ChangeEvent, FormEvent } from "react";
import type {
  Session,
  WallEntry as ApiWallEntry,
} from "../api";
import StatusChip from "../components/StatusChip";
import type { PagerState } from "../lib/pagination";
import type {
  DisplayAlbum,
  DisplayPaper,
  DisplayPolaroid,
  DisplayTimeline,
  DisplayTrack,
  FormActionState,
  WallSubmissionFormState,
} from "../types/app";

interface GalleryPageProps {
  galleryAlbums: DisplayAlbum[];
  galleryPapers: DisplayPaper[];
  galleryPolaroids: DisplayPolaroid[];
  galleryTimeline: DisplayTimeline[];
  galleryTracks: DisplayTrack[];
  hasVerifiedSpaceAccess: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  wallActionState: FormActionState<ApiWallEntry>;
  wallEntries: ApiWallEntry[];
  wallError: string;
  wallForm: WallSubmissionFormState;
  wallPager: PagerState;
  onWallFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onWallPageChange: (page: number) => void;
  onWallSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
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

const FALLBACK_GALLERY_FILENAMES = [
  "9BB86079F4BF5EA87FACB01083DB1062.png",
  "ATRIcover.png",
  "Rewritecover.png",
  "WHITE ALBUM 2cover.png",
  "ex1.png",
  "ex2.png",
  "kirakira煌煌舞台.png",
  "rance 10 cover.png",
  "住在拔作岛上的贫乳应该如何是好？cover.png",
  "夏日口袋（summer pockets）cover.png",
  "想要传达给你的爱恋cover.png",
  "星之终途cover.png",
  "星光咖啡馆与死神之蝶cover.png",
  "樱之诗系列cover.png",
  "死月妖花~四月八日cover.png",
  "水仙narcissucover.png",
  "石头门cover.png",
  "美好的每一天～不连续的存在bg.png",
  "近月少女的礼仪cover.png",
  "魔法使之夜cover.png",
] as const;

export default function GalleryPage({
  galleryAlbums,
  galleryPapers,
  galleryPolaroids,
  galleryTimeline,
  galleryTracks,
  hasVerifiedSpaceAccess: _hasVerifiedSpaceAccess,
  isAuthenticated: _isAuthenticated,
  session: _session,
  wallActionState: _wallActionState,
  wallEntries: _wallEntries,
  wallError: _wallError,
  wallForm: _wallForm,
  wallPager: _wallPager,
  onWallFieldChange: _onWallFieldChange,
  onWallPageChange: _onWallPageChange,
  onWallSubmit: _onWallSubmit,
}: GalleryPageProps) {
  const fallbackPhotos: GalleryPhoto[] = FALLBACK_GALLERY_FILENAMES.map((filename) => ({
    id: `fallback-${filename}`,
    src: `/graphs/${encodeURIComponent(filename)}`,
    alt: filename.replace(/\.[a-z]+$/i, ""),
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
  const editorialNarratives =
    galleryNarratives.length > 0
      ? galleryNarratives
      : fallbackPhotos.map((photo, index) => ({
          id: `fallback-note-${photo.id}`,
          section: "展墙",
          title: photo.alt,
          body: `图片描述位 #${String(index + 1).padStart(2, "0")}`,
        }));
  const galleryPhotos = fallbackPhotos;

  return (
    <section className="gallery-photo-shell gallery-photo-shell--editorial">
      <div className="gallery-photo-shell__head">
        <div>
          <p className="panel-kicker">Gallery</p>
          <h2>艺术照展示墙</h2>
          <p className="gallery-photo-shell__lede">
            图片区与文字区拆开排版，给每张图保留说明位置，也方便把活动背景和记录语句并排放置。
          </p>
        </div>
        <StatusChip tone="accent">{galleryPhotos.length} 张照片</StatusChip>
      </div>

      <div className="gallery-photo-layout">
        <div className="gallery-photo-grid">
          {galleryPhotos.map((photo, index) => {
            const narrative = editorialNarratives[index % editorialNarratives.length];
            return (
              <figure className="gallery-photo-card" key={photo.id}>
                <div className="gallery-photo-card__media">
                  <img alt={photo.alt} loading="lazy" src={photo.src} />
                </div>
                <figcaption className="gallery-photo-card__caption">
                  <p className="gallery-photo-card__meta">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{narrative.section}</span>
                  </p>
                  <strong>{narrative.title}</strong>
                  <p>{narrative.body}</p>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <aside className="gallery-photo-notes">
          <div className="gallery-photo-notes__head">
            <p className="panel-kicker">Narrative</p>
            <h3>文字描述区</h3>
          </div>
          <ol className="gallery-photo-notes__list">
            {editorialNarratives.slice(0, 8).map((entry, index) => (
              <li className="gallery-photo-notes__item" key={entry.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
