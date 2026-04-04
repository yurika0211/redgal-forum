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
      <section className="gallery-outline__section">
        <div className="gallery-outline__head">
          <p className="panel-kicker">相册墙</p>
          <h2>相册</h2>
          <p className="gallery-outline__lede">把成组的图像、活动记录和同一时期的情绪集中排开，像一份可以往下翻的编目。</p>
        </div>
        <ol className="gallery-outline__list">
          {galleryAlbums.map((entry, index) => (
            <li className="gallery-outline__item" key={entry.id}>
              <div className="gallery-outline__meta">
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

      <section className="gallery-outline__section">
        <div className="gallery-outline__head">
          <p className="panel-kicker">拍立得板</p>
          <h2>拍立得</h2>
          <p className="gallery-outline__lede">更适合放短句、单张印象和一闪而过的心情，不需要为了它们再包一层很重的卡片。</p>
        </div>
        <ol className="gallery-outline__list">
          {galleryPolaroids.map((entry, index) => (
            <li className="gallery-outline__item" key={entry.id}>
              <div className="gallery-outline__meta">
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

      <section className="gallery-outline__section">
        <div className="gallery-outline__head">
          <p className="panel-kicker">旧纸页</p>
          <h2>旧纸</h2>
          <p className="gallery-outline__lede">这一栏更像边注和旧信，重点是文段本身，而不是一个个被抛光过的展示块。</p>
        </div>
        <ol className="gallery-outline__list">
          {galleryPapers.map((entry, index) => (
            <li className="gallery-outline__item" key={entry.id}>
              <div className="gallery-outline__meta">
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

      <section className="gallery-outline__section">
        <div className="gallery-outline__head">
          <p className="panel-kicker">时间线</p>
          <h2>时间轴</h2>
          <p className="gallery-outline__lede">时间线保留纵向阅读感，让事件自己排出顺序，不再额外拆成漂浮的模块。</p>
        </div>
        <ol className="gallery-outline__list gallery-outline__list--timeline">
          {galleryTimeline.map((entry) => (
            <li className="gallery-outline__item gallery-outline__item--timeline" key={entry.id}>
              <span className="gallery-outline__year">{entry.year}</span>
              <div className="gallery-outline__body">
                <strong>{entry.title}</strong>
                <p>{entry.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="gallery-outline__section">
        <div className="gallery-outline__head">
          <p className="panel-kicker">留声机</p>
          <h2>留声机</h2>
          <p className="gallery-outline__lede">声音区保留唱片目录的感觉，用曲目列表说明情绪、时长和片段含义。</p>
        </div>
        <ol className="gallery-outline__list">
          {galleryTracks.map((track, index) => (
            <li className="gallery-outline__item" key={track.id}>
              <div className="gallery-outline__meta">
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
