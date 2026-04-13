import type {
  DisplayAlbum,
  DisplayPaper,
  DisplayPolaroid,
  DisplayTimeline,
  DisplayTrack,
} from "../types/app";

interface GalleryShowcaseProps {
  className?: string;
  galleryAlbums: DisplayAlbum[];
  galleryPapers: DisplayPaper[];
  galleryPolaroids: DisplayPolaroid[];
  galleryTimeline: DisplayTimeline[];
  galleryTracks: DisplayTrack[];
}

export default function GalleryShowcase({
  className = "gallery-outline",
  galleryAlbums,
  galleryPapers,
  galleryPolaroids,
  galleryTimeline,
  galleryTracks,
}: GalleryShowcaseProps) {
  return (
    <section className={className}>
      <section className="ui-card-sub grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
        <div className="grid gap-1">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">相册墙</p>
          <h2>相册</h2>
          <p className="text-sm text-[color:var(--text-muted)]">把成组的图像、活动记录和同一时期的情绪集中排开，像一份可以往下翻的编目。</p>
        </div>
        <ol className="grid gap-2">
          {galleryAlbums.map((entry, index) => (
            <li className="grid gap-1 rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2" key={entry.id}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{entry.accent}</span>
                <span>相册条目</span>
              </div>
              <strong>{entry.title}</strong>
              <p>{entry.caption}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ui-card-sub grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
        <div className="grid gap-1">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">拍立得板</p>
          <h2>拍立得</h2>
          <p className="text-sm text-[color:var(--text-muted)]">更适合放短句、单张印象和一闪而过的心情，不需要为了它们再包一层很重的卡片。</p>
        </div>
        <ol className="grid gap-2">
          {galleryPolaroids.map((entry, index) => (
            <li className="grid gap-1 rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2" key={entry.id}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{entry.stamp}</span>
                <span>拍立得</span>
              </div>
              <strong>{entry.title}</strong>
              <p>{entry.note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ui-card-sub grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
        <div className="grid gap-1">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">旧纸页</p>
          <h2>旧纸</h2>
          <p className="text-sm text-[color:var(--text-muted)]">这一栏更像边注和旧信，重点是文段本身，而不是一个个被抛光过的展示块。</p>
        </div>
        <ol className="grid gap-2">
          {galleryPapers.map((entry, index) => (
            <li className="grid gap-1 rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2" key={entry.id}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{entry.signature}</span>
                <span>纸面片段</span>
              </div>
              <strong>{entry.title}</strong>
              <p>{entry.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ui-card-sub grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
        <div className="grid gap-1">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">时间线</p>
          <h2>时间轴</h2>
          <p className="text-sm text-[color:var(--text-muted)]">时间线保留纵向阅读感，让事件自己排出顺序，不再额外拆成漂浮的模块。</p>
        </div>
        <ol className="grid gap-2 gap-3">
          {galleryTimeline.map((entry) => (
            <li className="grid gap-1 rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2 grid-cols-[auto_1fr] items-start gap-3" key={entry.id}>
              <span className="text-xs font-semibold tracking-[0.08em] text-[color:var(--text-muted)]">{entry.year}</span>
              <div className="grid gap-1">
                <strong>{entry.title}</strong>
                <p>{entry.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ui-card-sub grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
        <div className="grid gap-1">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">留声机</p>
          <h2>留声机</h2>
          <p className="text-sm text-[color:var(--text-muted)]">声音区保留唱片目录的感觉，用曲目列表说明情绪、时长和片段含义。</p>
        </div>
        <ol className="grid gap-2">
          {galleryTracks.map((track, index) => (
            <li className="grid gap-1 rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2" key={track.id}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{track.mood}</span>
                <span>{track.length}</span>
              </div>
              <strong>{track.title}</strong>
              <p>{track.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
