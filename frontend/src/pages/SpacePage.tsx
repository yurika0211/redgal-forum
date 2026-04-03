import type {
  ChangeEvent,
  FormEvent,
  ReactNode,
} from "react";
import type {
  Article as ApiArticle,
  BangumiImportJob,
  BangumiImportPayload,
  Profile as ApiProfile,
  Session,
} from "../api";
import StatusChip from "../components/StatusChip";
import {
  SPACE_FRIENDS,
  SPACE_SHOWCASE_GROUPS,
  SPACE_TIME_CAPSULES,
} from "../content";
import { excerpt, normalizeVisibilityLabel } from "../lib/text";
import type {
  ArticleFormState,
  FormActionState,
} from "../types/app";

type SpaceShelfTab = (typeof SPACE_SHOWCASE_GROUPS)[number]["id"];

interface SpacePageProps {
  articleActionState: FormActionState<ApiArticle>;
  articleForm: ArticleFormState;
  authPanel: ReactNode;
  bangumiActionState: FormActionState<BangumiImportJob>;
  bangumiForm: BangumiImportPayload & { subjectIdsText: string };
  collectionTotal: number;
  displayProfile: ApiProfile | null;
  hasVerifiedSpaceAccess: boolean;
  isAuthenticated: boolean;
  profileError: string;
  session: Session | null;
  spaceAccessBlocked: boolean;
  spaceLogEntries: ApiArticle[];
  spaceShelfTab: SpaceShelfTab;
  onArticleFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onArticleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBangumiFieldChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onBangumiImportSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onNavigate: (href: string) => void;
  onSpaceShelfTabChange: (tab: SpaceShelfTab) => void;
}

function getAvatarFallback(profile: Pick<ApiProfile, "nickname" | "username"> | null): string {
  if (!profile) {
    return "R";
  }

  return (profile.nickname || profile.username || "R").trim().charAt(0).toUpperCase() || "R";
}

export default function SpacePage({
  articleActionState,
  articleForm,
  authPanel,
  bangumiActionState,
  bangumiForm,
  collectionTotal,
  displayProfile,
  hasVerifiedSpaceAccess,
  isAuthenticated,
  profileError,
  session,
  spaceAccessBlocked,
  spaceLogEntries,
  spaceShelfTab,
  onArticleFieldChange,
  onArticleSubmit,
  onBangumiFieldChange,
  onBangumiImportSubmit,
  onNavigate,
  onSpaceShelfTabChange,
}: SpacePageProps) {
  const activeSpaceShelf =
    SPACE_SHOWCASE_GROUPS.find((group) => group.id === spaceShelfTab) ?? SPACE_SHOWCASE_GROUPS[0];

  return (
    <>
      <section className="panel space-master-panel">
        {displayProfile ? (
          <>
            <div className="space-master-panel__identity">
              {displayProfile.avatar_url ? (
                <img
                  alt={displayProfile.nickname}
                  className="profile-stage__avatar"
                  src={displayProfile.avatar_url}
                />
              ) : (
                <div className="profile-stage__avatar profile-stage__avatar--fallback">
                  {getAvatarFallback(displayProfile)}
                </div>
              )}
              <div className="space-master-panel__copy">
                <p className="panel-kicker">空间主卡</p>
                <h2 className="space-master-panel__title">{displayProfile.nickname}</h2>
                <p className="profile-meta">
                  @{displayProfile.username} · {displayProfile.signature}
                </p>
                <p className="profile-bio">{displayProfile.bio}</p>
                <div className="space-master-panel__status-row">
                  <StatusChip tone={hasVerifiedSpaceAccess ? "success" : isAuthenticated ? "warn" : "neutral"}>
                    {hasVerifiedSpaceAccess ? "已认证成员空间" : isAuthenticated ? "待认证空间" : "游客预览"}
                  </StatusChip>
                  <StatusChip tone="accent">{collectionTotal} 项收藏</StatusChip>
                </div>
              </div>
            </div>
            <div className="space-master-panel__stats">
              {Object.entries(displayProfile.collections).map(([label, count]) => (
                <div className="space-master-panel__stat" key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="panel-empty">{profileError || "空间资料加载中。"}</p>
        )}
      </section>

      <section className="space-layout-grid">
        <div className="space-layout-grid__main">
          <article className="panel space-showcase-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">作品展示</p>
                <h2>动画 / 书籍 / 游戏</h2>
              </div>
              <StatusChip tone="accent">{activeSpaceShelf.label}</StatusChip>
            </div>
            <div className="space-shelf-tabs">
              {SPACE_SHOWCASE_GROUPS.map((group) => (
                <button
                  className={`space-shelf-tab ${group.id === activeSpaceShelf.id ? "space-shelf-tab--active" : ""}`}
                  key={group.id}
                  type="button"
                  onClick={() => onSpaceShelfTabChange(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <div className="space-shelf-grid">
              {activeSpaceShelf.items.map((item, index) => (
                <article className="space-shelf-item" key={item.id}>
                  <div className="space-shelf-item__cover">
                    <img alt={item.title} src={item.image} />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="space-shelf-item__copy">
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                    <small>{item.note}</small>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">个人日志</p>
                <h2>Markdown 日志区</h2>
              </div>
              <StatusChip tone={hasVerifiedSpaceAccess ? "success" : "warn"}>
                {hasVerifiedSpaceAccess ? "POST /articles" : "需要已认证账号"}
              </StatusChip>
            </div>
            {!session ? (
              <p className="panel-empty">登录并通过认证后，可以在这里写个人日志。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="panel-empty">当前账号还没有日志发布权限，需要通过认证后才能写日志。</p>
            ) : (
              <form className="space-form" onSubmit={(event) => void onArticleSubmit(event)}>
                <label>
                  <span>日志标题</span>
                  <input
                    name="title"
                    type="text"
                    value={articleForm.title}
                    onChange={onArticleFieldChange}
                    placeholder="输入日志标题"
                    required
                  />
                </label>
                <label>
                  <span>可见范围</span>
                  <select name="visibility" value={articleForm.visibility} onChange={onArticleFieldChange}>
                    <option value="public">公开</option>
                    <option value="member">成员</option>
                    <option value="private">仅自己可见</option>
                  </select>
                </label>
                <label>
                  <span>摘要</span>
                  <input
                    name="summary"
                    type="text"
                    value={articleForm.summary}
                    onChange={onArticleFieldChange}
                    placeholder="一句话概括日志内容"
                  />
                </label>
                <label>
                  <span>Markdown 正文</span>
                  <textarea
                    name="content"
                    rows={8}
                    value={articleForm.content}
                    onChange={onArticleFieldChange}
                    placeholder={"支持 Markdown\n例如：\n![](https://example.com/image.png)"}
                    required
                  />
                </label>
                <label>
                  <span>标签</span>
                  <input
                    name="tagsText"
                    type="text"
                    value={articleForm.tagsText}
                    onChange={onArticleFieldChange}
                    placeholder="用逗号分隔，例如：日志，收藏，感想"
                  />
                </label>
                <p className="panel-empty">
                  当前后端还没有独立图片上传接口，所以日志里的图片先通过 Markdown 图片链接插入。
                </p>
                {articleActionState.error ? <p className="panel-error">{articleActionState.error}</p> : null}
                {articleActionState.success ? <p className="panel-empty">{articleActionState.success}</p> : null}
                <button className="primary-button" type="submit" disabled={articleActionState.pending}>
                  {articleActionState.pending ? "发布中..." : "发布日志"}
                </button>
              </form>
            )}
            <div className="space-log-list">
              <div className="space-log-list__header">
                <strong>最近日志</strong>
                <span>{spaceLogEntries.length} 篇</span>
              </div>
              <div className="stack-list">
                {spaceLogEntries.length ? (
                  spaceLogEntries.slice(0, 4).map((article) => (
                    <button
                      className="content-card thread-card-button"
                      key={article.id}
                      type="button"
                      onClick={() => onNavigate(`/stories/${encodeURIComponent(article.id)}`)}
                    >
                      <div className="content-card__header">
                        <h3>{article.title}</h3>
                        <StatusChip tone="accent">
                          {normalizeVisibilityLabel(article.visibility)}
                        </StatusChip>
                      </div>
                      <p>{excerpt(article.summary || article.content, 120)}</p>
                    </button>
                  ))
                ) : (
                  <p className="panel-empty">还没有匹配到这个空间的日志内容。</p>
                )}
              </div>
            </div>
          </article>
        </div>

        <aside className="space-layout-grid__side">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">身份联调</p>
                <h2>登录与空间同步</h2>
              </div>
              <StatusChip tone={isAuthenticated ? "success" : "neutral"}>
                {isAuthenticated ? "已连接" : "等待登录"}
              </StatusChip>
            </div>
            {authPanel}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Bangumi 导入</p>
                <h2>作品同步</h2>
              </div>
              <StatusChip tone={hasVerifiedSpaceAccess ? "accent" : "warn"}>
                {hasVerifiedSpaceAccess ? "POST /users/me/bangumi/import" : "需要已认证账号"}
              </StatusChip>
            </div>
            {spaceAccessBlocked ? (
              <p className="panel-error">
                当前账号已登录，但后端返回 `verified user required`。未认证用户还不能打开个人空间能力。
              </p>
            ) : null}
            {!session ? (
              <p className="panel-empty">登录后可按作品 ID 发起 Bangumi 导入任务。</p>
            ) : !hasVerifiedSpaceAccess ? (
              <p className="panel-empty">当前账号还没有导入权限，认证通过后才能调用该接口。</p>
            ) : (
              <form className="space-form" onSubmit={(event) => void onBangumiImportSubmit(event)}>
                <label>
                  <span>作品 ID</span>
                  <input
                    name="subjectIdsText"
                    type="text"
                    value={bangumiForm.subjectIdsText}
                    onChange={onBangumiFieldChange}
                    placeholder="例如：12345, 67890"
                  />
                </label>
                <label>
                  <span>收藏状态</span>
                  <select name="status" value={bangumiForm.status} onChange={onBangumiFieldChange}>
                    <option value="wish">wish</option>
                    <option value="doing">doing</option>
                    <option value="collect">collect</option>
                    <option value="on_hold">on_hold</option>
                    <option value="dropped">dropped</option>
                  </select>
                </label>
                <label>
                  <span>可见范围</span>
                  <select name="visibility" value={bangumiForm.visibility} onChange={onBangumiFieldChange}>
                    <option value="public">public</option>
                    <option value="members">members</option>
                    <option value="private">private</option>
                  </select>
                </label>
                {bangumiActionState.error ? <p className="panel-error">{bangumiActionState.error}</p> : null}
                {bangumiActionState.success ? <p className="panel-empty">{bangumiActionState.success}</p> : null}
                {bangumiActionState.data ? (
                  <div className="space-job-box">
                    <strong>任务已创建</strong>
                    <p>Job ID: {bangumiActionState.data.job_id}</p>
                    <p>Status: {bangumiActionState.data.status}</p>
                    <p>Channel: {bangumiActionState.data.channel}</p>
                  </div>
                ) : null}
                <button className="primary-button" type="submit" disabled={bangumiActionState.pending}>
                  {bangumiActionState.pending ? "提交中..." : "提交导入任务"}
                </button>
              </form>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">好友模块</p>
                <h2>空间好友</h2>
              </div>
            </div>
            <div className="space-side-list">
              {SPACE_FRIENDS.map((friend) => (
                <div className="space-side-card" key={friend.id}>
                  <div className="space-side-card__header">
                    <strong>{friend.name}</strong>
                    <StatusChip
                      tone={
                        friend.status === "在线"
                          ? "success"
                          : friend.status === "忙碌"
                            ? "accent"
                            : "neutral"
                      }
                    >
                      {friend.status}
                    </StatusChip>
                  </div>
                  <p>{friend.note}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">时间胶囊</p>
                <h2>记忆模块</h2>
              </div>
            </div>
            <div className="space-side-list">
              {SPACE_TIME_CAPSULES.map((capsule) => (
                <div className="space-side-card" key={capsule.id}>
                  <div className="space-side-card__header">
                    <strong>{capsule.title}</strong>
                    <span>{capsule.time}</span>
                  </div>
                  <p>{capsule.body}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
