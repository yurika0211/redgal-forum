import type {
  ChangeEvent,
  FormEvent,
} from "react";
import type {
  Profile as ApiProfile,
  Session,
  SiteGalleryEntry,
  WallEntry as ApiWallEntry,
} from "../api";
import PaginationBar from "../components/PaginationBar";
import SectionHero from "../components/SectionHero";
import StatusChip from "../components/StatusChip";
import { galleryEntryTypeLabel, excerpt } from "../lib/text";
import type { PagerState } from "../lib/pagination";
import type {
  DisplayAlbum,
  DisplayPaper,
  DisplayPolaroid,
  DisplayTimeline,
  DisplayTrack,
  FormActionState,
  GalleryFormState,
  WallSubmissionFormState,
} from "../types/app";

interface GalleryPageProps {
  adminGalleryEntries: SiteGalleryEntry[];
  adminGalleryPager: PagerState;
  canManageGallery: boolean;
  editingGalleryEntryID: string | null;
  galleryActionState: FormActionState<SiteGalleryEntry>;
  galleryAlbums: DisplayAlbum[];
  galleryForm: GalleryFormState;
  galleryPapers: DisplayPaper[];
  galleryPolaroids: DisplayPolaroid[];
  galleryTimeline: DisplayTimeline[];
  galleryTracks: DisplayTrack[];
  hasVerifiedSpaceAccess: boolean;
  isAuthenticated: boolean;
  profile: ApiProfile | null;
  session: Session | null;
  wallActionState: FormActionState<ApiWallEntry>;
  wallEntries: ApiWallEntry[];
  wallError: string;
  wallForm: WallSubmissionFormState;
  wallPager: PagerState;
  onAdminGalleryPageChange: (page: number) => void;
  onGalleryDelete: (entry: SiteGalleryEntry) => Promise<void>;
  onGalleryEditStart: (entry: SiteGalleryEntry) => void;
  onGalleryFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onGallerySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onResetGalleryEditor: () => void;
  onWallFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onWallPageChange: (page: number) => void;
  onWallSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export default function GalleryPage({
  adminGalleryEntries,
  adminGalleryPager,
  canManageGallery,
  editingGalleryEntryID,
  galleryActionState,
  galleryAlbums,
  galleryForm,
  galleryPapers,
  galleryPolaroids,
  galleryTimeline,
  galleryTracks,
  hasVerifiedSpaceAccess,
  isAuthenticated,
  profile,
  session,
  wallActionState,
  wallEntries,
  wallError,
  wallForm,
  wallPager,
  onAdminGalleryPageChange,
  onGalleryDelete,
  onGalleryEditStart,
  onGalleryFieldChange,
  onGallerySubmit,
  onResetGalleryEditor,
  onWallFieldChange,
  onWallPageChange,
  onWallSubmit,
}: GalleryPageProps) {
  return (
    <>
      <SectionHero
        kicker="展示陈列"
        title="相册、拍立得、旧纸、时间轴与留声机的展示墙"
        description="这里不急着解释功能，只把照片、旧纸、拍立得和时间线摆出来。"
        metrics={[
          {
            label: "图像",
            value: String(galleryAlbums.length + galleryPolaroids.length),
            detail: "相册和拍立得",
            tone: "accent",
          },
          {
            label: "纸面",
            value: String(galleryPapers.length),
            detail: "旧纸和手记",
            tone: "warn",
          },
          {
            label: "时间 / 声音",
            value: String(galleryTimeline.length + galleryTracks.length),
            detail: "时间轴和留声机",
            tone: "neutral",
          },
        ]}
      />

      {canManageGallery ? (
        <section className="page-split-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">展示墙管理</p>
                <h2>{editingGalleryEntryID ? "编辑展示条目" : "新建展示条目"}</h2>
              </div>
              <StatusChip tone="accent">
                {editingGalleryEntryID ? "编辑模式" : "创建模式"}
              </StatusChip>
            </div>
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
                <input
                  name="title"
                  onChange={onGalleryFieldChange}
                  placeholder="例如：社团春季共赏记录"
                  value={galleryForm.title}
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  name="slug"
                  onChange={onGalleryFieldChange}
                  placeholder="留空则按标题自动生成"
                  value={galleryForm.slug}
                />
              </label>
              <label>
                <span>副标题</span>
                <input
                  name="subtitle"
                  onChange={onGalleryFieldChange}
                  placeholder="相册可写强调词，时间轴可写年份"
                  value={galleryForm.subtitle}
                />
              </label>
              <label>
                <span>正文 / 描述</span>
                <textarea
                  name="body"
                  onChange={onGalleryFieldChange}
                  placeholder="输入展示条目的说明文案"
                  rows={5}
                  value={galleryForm.body}
                />
              </label>
              <label>
                <span>额外文本</span>
                <input
                  name="extra_text"
                  onChange={onGalleryFieldChange}
                  placeholder="例如：03:24 或其他辅助文本"
                  value={galleryForm.extra_text}
                />
              </label>
              <label>
                <span>排序</span>
                <input
                  name="sort_order"
                  onChange={onGalleryFieldChange}
                  placeholder="0"
                  value={galleryForm.sort_order}
                />
              </label>
              <label className="gallery-admin__toggle">
                <input
                  checked={galleryForm.active}
                  name="active"
                  onChange={onGalleryFieldChange}
                  type="checkbox"
                />
                <span>设为公开展示</span>
              </label>
              {galleryActionState.error ? (
                <p className="panel-error">{galleryActionState.error}</p>
              ) : null}
              {galleryActionState.success ? (
                <p className="panel-empty">{galleryActionState.success}</p>
              ) : null}
              <div className="gallery-admin__actions">
                <button
                  className="primary-button"
                  disabled={galleryActionState.pending}
                  type="submit"
                >
                  {galleryActionState.pending
                    ? "保存中..."
                    : editingGalleryEntryID
                      ? "更新展示条目"
                      : "创建展示条目"}
                </button>
                <button
                  className="ghost-button"
                  onClick={onResetGalleryEditor}
                  type="button"
                >
                  清空表单
                </button>
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">当前条目</p>
                <h2>管理列表</h2>
              </div>
              <StatusChip tone="neutral">{adminGalleryPager.total} 条</StatusChip>
            </div>
            <div className="stack-list">
              {adminGalleryEntries.map((entry) => (
                <div className="content-card" key={entry.id}>
                  <div className="content-card__header">
                    <h3>{entry.title}</h3>
                    <StatusChip tone={entry.active ? "success" : "warn"}>
                      {entry.active ? "active" : "inactive"}
                    </StatusChip>
                  </div>
                  <p>{entry.body || "暂无描述。"}</p>
                  <div className="meta-row">
                    <span>{galleryEntryTypeLabel(entry.entry_type)}</span>
                    <span>slug: {entry.slug}</span>
                  </div>
                  <div className="meta-row">
                    <span>排序 {entry.sort_order}</span>
                    <span>{entry.subtitle || entry.extra_text || "无附加文本"}</span>
                  </div>
                  <div className="gallery-admin__actions">
                    <button
                      className="ghost-button"
                      onClick={() => onGalleryEditStart(entry)}
                      type="button"
                    >
                      编辑
                    </button>
                    <button
                      className="ghost-button gallery-admin__danger"
                      onClick={() => void onGalleryDelete(entry)}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {!adminGalleryEntries.length ? (
                <p className="panel-empty">当前还没有可管理的 gallery 条目。</p>
              ) : null}
            </div>
            <PaginationBar
              pager={adminGalleryPager}
              onPageChange={onAdminGalleryPageChange}
              emptyText="暂无可管理条目。"
            />
          </article>
        </section>
      ) : isAuthenticated ? (
        <section className="panel-grid preview-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">管理权限</p>
                <h2>当前账号不能维护展示墙</h2>
              </div>
              <StatusChip tone="warn">只读模式</StatusChip>
            </div>
            <p className="panel-empty">
              `/gallery` 的增删查改只对 `admin` 和 `super_admin` 开放。当前角色：
              {profile?.roles?.join(", ") || "未返回角色信息"}。
            </p>
          </article>
        </section>
      ) : null}

      <section className="showcase-grid">
        <article className="panel showcase-panel showcase-panel--wide">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">相册墙</p>
              <h2>相册</h2>
            </div>
          </div>
          <div className="album-grid">
            {galleryAlbums.map((entry) => (
              <div className="album-card" key={entry.id}>
                <span>{entry.accent}</span>
                <strong>{entry.title}</strong>
                <p>{entry.caption}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel showcase-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">拍立得板</p>
              <h2>拍立得</h2>
            </div>
          </div>
          <div className="polaroid-grid">
            {galleryPolaroids.map((entry) => (
              <div className="polaroid-card" key={entry.id}>
                <strong>{entry.title}</strong>
                <p>{entry.note}</p>
                <span>{entry.stamp}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel showcase-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">旧纸页</p>
              <h2>旧纸</h2>
            </div>
          </div>
          <div className="paper-stack">
            {galleryPapers.map((entry) => (
              <div className="paper-note" key={entry.id}>
                <strong>{entry.title}</strong>
                <p>{entry.body}</p>
                <span>{entry.signature}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel showcase-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">时间线</p>
              <h2>时间轴</h2>
            </div>
          </div>
          <div className="timeline-list">
            {galleryTimeline.map((entry) => (
              <div className="timeline-item" key={entry.id}>
                <span className="timeline-item__year">{entry.year}</span>
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel showcase-panel showcase-panel--wide">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">留声机</p>
              <h2>留声机</h2>
            </div>
            <StatusChip tone="neutral">正在旋转</StatusChip>
          </div>
          <div className="track-list">
            {galleryTracks.map((track) => (
              <div className="track-card" key={track.id}>
                <div className="track-card__meta">
                  <span>{track.mood}</span>
                  <span>{track.length}</span>
                </div>
                <strong>{track.title}</strong>
                <p>{track.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel-grid preview-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">展示墙投稿</p>
              <h2>提交新的展墙内容</h2>
            </div>
            <StatusChip tone={hasVerifiedSpaceAccess ? "accent" : "warn"}>
              {hasVerifiedSpaceAccess ? "POST /wall/submissions" : "需要已认证账号"}
            </StatusChip>
          </div>
          {!session ? (
            <p className="panel-empty">登录并通过认证后，可以向展示墙提交新的图文内容。</p>
          ) : !hasVerifiedSpaceAccess ? (
            <p className="panel-empty">当前账号还没有投稿权限，需要通过认证后才能提交展示墙内容。</p>
          ) : (
            <form className="space-form" onSubmit={(event) => void onWallSubmit(event)}>
              <label>
                <span>标题</span>
                <input
                  name="title"
                  type="text"
                  value={wallForm.title}
                  onChange={onWallFieldChange}
                  placeholder="输入投稿标题"
                  required
                />
              </label>
              <label>
                <span>内容</span>
                <textarea
                  name="content"
                  rows={5}
                  value={wallForm.content}
                  onChange={onWallFieldChange}
                  placeholder="写下展示内容说明"
                  required
                />
              </label>
              <label>
                <span>图片地址</span>
                <textarea
                  name="imagesText"
                  rows={4}
                  value={wallForm.imagesText}
                  onChange={onWallFieldChange}
                  placeholder={"每行一个图片 URL\nhttps://example.com/cover.png"}
                />
              </label>
              {wallActionState.error ? <p className="panel-error">{wallActionState.error}</p> : null}
              {wallActionState.success ? <p className="panel-empty">{wallActionState.success}</p> : null}
              <button className="primary-button" type="submit" disabled={wallActionState.pending}>
                {wallActionState.pending ? "投稿中..." : "提交投稿"}
              </button>
            </form>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">展示墙动态</p>
              <h2>已发布内容</h2>
            </div>
            <StatusChip tone="neutral">{wallPager.total} 条</StatusChip>
          </div>
          {wallError ? <p className="panel-error">{wallError}</p> : null}
          <div className="stack-list">
            {wallEntries.map((entry) => (
              <div className="content-card" key={entry.id}>
                <div className="content-card__header">
                  <h3>{entry.title}</h3>
                  <StatusChip tone={entry.approved ? "success" : "warn"}>
                    {entry.approved ? "已发布" : "待审核"}
                  </StatusChip>
                </div>
                <p>{excerpt(entry.content, 180)}</p>
                <div className="meta-row">
                  <span>{entry.contributor}</span>
                  <span>{entry.images.length} 张图片</span>
                </div>
              </div>
            ))}
            {!wallEntries.length ? <p className="panel-empty">当前还没有公开展示的投稿。</p> : null}
          </div>
          <PaginationBar pager={wallPager} onPageChange={onWallPageChange} emptyText="暂无公开展示内容。" />
        </article>
      </section>
    </>
  );
}
