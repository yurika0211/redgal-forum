import { useState, type ChangeEvent, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type {
  DisplayActivity,
  DisplayNotice,
  DisplayPortalPage,
} from "../types/app";

interface ActivityEditorPayload {
  label: string;
  title: string;
  description: string;
}

interface ActivityActionState {
  pending: boolean;
  error: string;
  success: string;
}

interface PortalPageProps {
  activityActionState: ActivityActionState;
  canAdmin: boolean;
  notices: DisplayNotice[];
  portalPages: DisplayPortalPage[];
  societyActivities: DisplayActivity[];
  onActivityCreate: (payload: ActivityEditorPayload) => Promise<void>;
  onActivityDelete: (activity: DisplayActivity) => Promise<void>;
  onActivityUpdate: (activity: DisplayActivity, payload: ActivityEditorPayload) => Promise<void>;
  onNavigate: (href: string) => void;
}

const PORTAL_REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

function normalizeDateSegment(value: string): string {
  return value.padStart(2, "0");
}

function formatPortalNoticeStamp(value: string): string | null {
  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/\./g, "-").replace(/\//g, "-").replace("T", " ");
  const explicitMatch = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/,
  );
  if (explicitMatch) {
    const [, year, month, day, hour, minute] = explicitMatch;
    if (!hour || !minute) {
      return `${year}-${normalizeDateSegment(month)}-${normalizeDateSegment(day)}`;
    }
    return `${year}-${normalizeDateSegment(month)}-${normalizeDateSegment(day)} ${normalizeDateSegment(hour)}:${minute}`;
  }

  if (/^\d+$/.test(raw) && raw.length < 6) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw.length <= 24 ? raw : null;
  }

  const year = String(parsed.getFullYear());
  const month = normalizeDateSegment(String(parsed.getMonth() + 1));
  const day = normalizeDateSegment(String(parsed.getDate()));
  return `${year}-${month}-${day}`;
}

function resolveNoticeStamp(notice: DisplayNotice): string {
  return (
    formatPortalNoticeStamp(notice.label) ||
    formatPortalNoticeStamp(notice.kicker) ||
    "近期更新"
  );
}

function resolveNoticeTag(notice: DisplayNotice, stamp: string): string | null {
  const tag = notice.kicker.trim();
  if (!tag || tag === "公告" || tag === stamp) {
    return null;
  }
  return tag;
}

function resolvePortalNavGlyph(page: DisplayPortalPage): string {
  const text = `${page.kicker} ${page.title} ${page.description} ${page.href}`;
  if (/活动|征文|赛事|event/i.test(text)) {
    return "活";
  }
  if (/论坛|主题|讨论|thread|forum/i.test(text)) {
    return "论";
  }
  if (/收藏|成长|空间|日志|space/i.test(text)) {
    return "册";
  }
  if (/海报|展墙|图|gallery|photo/i.test(text)) {
    return "图";
  }
  if (/公告|通知|notice/i.test(text)) {
    return "讯";
  }
  return "导";
}

export default function PortalPage({
  activityActionState,
  canAdmin,
  notices,
  portalPages,
  societyActivities,
  onActivityCreate,
  onActivityDelete,
  onActivityUpdate,
  onNavigate,
}: PortalPageProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activityEditorMode, setActivityEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingActivityID, setEditingActivityID] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityEditorPayload>({
    label: "",
    title: "",
    description: "",
  });
  const manifestoHighlights = [
    {
      label: "起源",
      value: "2017",
      detail: "Galgame 分群开始聚拢同好",
    },
    {
      label: "命名",
      value: "2024",
      detail: "正式确立「百川乃大视觉小说研」",
    },
    {
      label: "规模",
      value: "300+",
      detail: "社群成员持续增长",
    },
  ];

  function startCreateActivity(): void {
    if (activityActionState.pending) {
      return;
    }

    setActivityEditorMode("create");
    setEditingActivityID(null);
    setActivityForm({
      label: "",
      title: "",
      description: "",
    });
  }

  function startEditActivity(activity: DisplayActivity): void {
    if (activityActionState.pending) {
      return;
    }

    setActivityEditorMode("edit");
    setEditingActivityID(activity.id);
    setActivityForm({
      label: activity.label || "",
      title: activity.title || "",
      description: activity.description || "",
    });
  }

  function closeActivityEditor(): void {
    if (activityActionState.pending) {
      return;
    }

    setActivityEditorMode(null);
    setEditingActivityID(null);
  }

  function handleActivityFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value } = event.target;
    setActivityForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleActivityEditorSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canAdmin) {
      return;
    }

    if (activityEditorMode === "create") {
      try {
        await onActivityCreate(activityForm);
        closeActivityEditor();
      } catch {
        // 错误状态由上层 action state 托管。
      }
      return;
    }

    if (activityEditorMode === "edit" && editingActivityID) {
      const target = societyActivities.find((item) => item.id === editingActivityID);
      if (!target) {
        return;
      }

      try {
        await onActivityUpdate(target, activityForm);
        closeActivityEditor();
      } catch {
        // 错误状态由上层 action state 托管。
      }
    }
  }

  async function handleDeleteActivity(activity: DisplayActivity): Promise<void> {
    if (!canAdmin || activityActionState.pending) {
      return;
    }

    try {
      await onActivityDelete(activity);
      if (editingActivityID === activity.id) {
        closeActivityEditor();
      }
    } catch {
      // 错误状态由上层 action state 托管。
    }
  }

  const revealViewport = { once: false, amount: 0.32 } as const;
  const sectionReveal = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 46, scale: 0.965, filter: "blur(12px)" },
        whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        viewport: revealViewport,
        transition: { duration: 0.58, ease: PORTAL_REVEAL_EASE },
      };
  const leftMergeReveal = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: -56, scale: 0.97, filter: "blur(10px)" },
        whileInView: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
        viewport: revealViewport,
        transition: { duration: 0.54, ease: PORTAL_REVEAL_EASE },
      };
  const rightMergeReveal = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 56, scale: 0.97, filter: "blur(10px)" },
        whileInView: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
        viewport: revealViewport,
        transition: { duration: 0.54, ease: PORTAL_REVEAL_EASE, delay: 0.06 },
      };

  return (
    <div className="grid gap-[clamp(16px,2.6vw,30px)]">
      <motion.section {...sectionReveal} className="ui-card-panel portal-home__section grid gap-[26px] rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="portal-home__intro grid max-w-[76ch] gap-3">
          <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">社团介绍 / manifesto</p>
          <h1 className="portal-home__title m-0 font-[var(--font-display)] text-[clamp(2.05rem,3.7vw,3.3rem)] leading-[1.08] text-[color:var(--text-strong)]">从 2017 到现在，我们把热爱写进了持续发生的社团活动。</h1>
          <p className="portal-home__lead m-0 max-w-[64ch] text-[color:var(--text-main)] leading-[1.82]">
            在这里，站点记录的不只是活动信息，更是每一届成员把兴趣转成作品、对话和协作的过程。
          </p>
        </div>
        <div className="portal-home__manifesto-grid grid items-stretch gap-[18px] [grid-template-columns:minmax(0,1.12fr)_minmax(260px,0.88fr)] max-[1040px]:[grid-template-columns:minmax(0,1fr)]">
          <div className="grid content-start gap-[14px] py-[2px]">
            <p className="m-0 text-[1rem] text-[color:var(--text-soft)] leading-[1.88]">
              百川乃大视觉小说研起源于川大校级 ACG 社团中的 Galgame 分群，2017 年开始聚拢同好，
              2024 年正式确立社团名称。一路从十几人的小群，慢慢扩展到今天的 300+ 社群规模。
            </p>
            <p className="m-0 text-[1rem] text-[color:var(--text-soft)] leading-[1.88]">
              我们把“十二川器”年度评选、征文大赛、招新问答和“百川夜话”访谈做成固定活动，
              让作品推荐、创作表达和行业交流都能在站内留下可追溯的记录。
            </p>
            <p className="m-0 text-[1rem] text-[color:var(--text-soft)] leading-[1.88]">
              如果你也会在深夜里冒出“我们来做一部视觉小说吧”的念头，
              这里会是你把热爱变成讨论、稿件、视频和合作的起点。
            </p>
          </div>
          <aside className="portal-manifesto-sidecard rounded-[20px] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-[clamp(14px,1.9vw,20px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" aria-label="社团关键节点">
            <ul className="m-0 grid list-none gap-2.5 p-0 max-[1040px]:grid-cols-3 max-[760px]:grid-cols-1">
              {manifestoHighlights.map((item) => (
                <li className="portal-manifesto-sideitem grid gap-[5px] rounded-[14px] border border-[color:var(--line-soft)] bg-white/60 px-3 py-[11px]" key={item.label}>
                  <span className="text-[0.75rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{item.label}</span>
                  <strong className="font-[var(--font-display)] text-[1.26rem] text-[color:var(--text-strong)]">{item.value}</strong>
                  <p className="m-0 text-[0.86rem] text-[color:var(--text-soft)] leading-[1.65]">{item.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </motion.section>

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <motion.article {...leftMergeReveal} className="portal-home__section rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">站内公告</p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">最新公告栏</h2>
              <p className="mt-2.5 max-w-[56ch] text-[0.95rem] leading-[1.76] text-[color:var(--text-soft)] max-[760px]:text-[0.9rem] max-[760px]:leading-[1.7]">集中查看站内公告与活动通知，快速了解近期更新。</p>
            </div>
          </div>
          <div className="portal-notice-list">
            {notices.map((notice) => {
              const stamp = resolveNoticeStamp(notice);
              const tag = resolveNoticeTag(notice, stamp);
              const content = notice.description || notice.body || "公告内容待补充。";

              return (
                <article className="portal-notice-card" key={notice.id}>
                  <div className="portal-notice-card__head">
                    {tag ? <span className="portal-notice-card__tag">{tag}</span> : null}
                    <time className="portal-notice-card__stamp">{stamp}</time>
                  </div>
                  <h3 className="portal-notice-card__title">{notice.title || "未命名公告"}</h3>
                  <p className="portal-notice-card__body">{content}</p>
                </article>
              );
            })}
            {!notices.length ? <p className="mt-1 rounded-xl border border-dashed border-[color:var(--line-soft)] bg-white/40 px-3 py-2 text-sm text-[color:var(--text-muted)]">当前还没有发布公告。</p> : null}
          </div>
        </motion.article>

        <motion.article {...rightMergeReveal} className="portal-home__section rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">先从哪里看起</p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">板块导航</h2>
              <p className="mt-2.5 max-w-[56ch] text-[0.95rem] leading-[1.76] text-[color:var(--text-soft)] max-[760px]:text-[0.9rem] max-[760px]:leading-[1.7]">按内容类型挑选入口，减少首次浏览时的信息负担。</p>
            </div>
          </div>
          <div className="portal-nav-list">
            {portalPages.map((page) => (
              <button className="portal-nav-card" key={page.href} type="button" onClick={() => onNavigate(page.href)}>
                <span aria-hidden="true" className="portal-nav-card__icon">
                  {resolvePortalNavGlyph(page)}
                </span>
                <span className="portal-nav-card__content">
                  <span className="portal-nav-card__kicker">{page.kicker || "导航入口"}</span>
                  <strong className="portal-nav-card__title">{page.title}</strong>
                  <span className="portal-nav-card__description">{page.description || "查看该板块的最新内容。"}</span>
                </span>
              </button>
            ))}
            {!portalPages.length ? <p className="mt-1 rounded-xl border border-dashed border-[color:var(--line-soft)] bg-white/40 px-3 py-2 text-sm text-[color:var(--text-muted)]">当前还没有配置导航入口。</p> : null}
          </div>
        </motion.article>
      </section>

      <motion.section {...sectionReveal} className="my-1 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm portal-home__section">
        <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">活动与聚会</p>
            <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">最近会遇到的事情</h2>
          </div>
          {canAdmin ? (
            <button
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5 py-1 text-xs"
              type="button"
              disabled={activityActionState.pending}
              onClick={startCreateActivity}
            >
              新增节点
            </button>
          ) : null}
        </div>
        {canAdmin && activityActionState.error ? <p className="mb-2 text-sm text-rose-500/90">{activityActionState.error}</p> : null}
        {canAdmin && activityActionState.success ? <p className="mb-2 text-sm text-[color:var(--text-muted)]">{activityActionState.success}</p> : null}
        <div className="relative grid gap-6 py-1.5 max-[980px]:gap-4 max-[980px]:py-0.5">
          <span className="absolute bottom-2.5 left-3 top-2.5 w-[3px] rounded-full bg-[linear-gradient(180deg,rgba(102,167,213,0.56),rgba(102,167,213,0.2))] max-[980px]:left-2.5" aria-hidden="true" />
          {societyActivities.map((activity, index) => (
            <motion.article
              initial={shouldReduceMotion ? false : { opacity: 0, x: index % 2 === 0 ? -38 : 38, scale: 0.97 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: false, amount: 0.42 }}
              transition={{ duration: 0.44, ease: PORTAL_REVEAL_EASE, delay: Math.min(index * 0.035, 0.16) }}
              className="relative mt-1.5 pl-[30px] first:mt-0 max-[980px]:mt-1 max-[980px]:pl-6"
              key={activity.id}
            >
              <span className="absolute left-[5px] top-[22px] h-[14px] w-[14px] rounded-full border-[3px] border-[rgba(102,167,213,0.86)] bg-[#f8fbff] shadow-[0_0_0_2px_rgba(255,255,255,0.9),0_0_0_5px_rgba(102,167,213,0.12)] max-[980px]:left-[3px] max-[980px]:top-[18px] max-[980px]:h-3 max-[980px]:w-3" aria-hidden="true" />
              <div className="portal-activity-card relative overflow-hidden rounded-[14px] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-4 py-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_10px_22px_rgba(37,60,42,0.08)] max-[760px]:px-[13px] max-[760px]:py-3">
                <div className="flex items-start justify-between gap-2.5">
                  <span className="inline-block text-[0.9rem] font-bold tracking-[0.01em] text-[rgba(66,102,130,0.9)]">{activity.label || `节点 ${String(index + 1).padStart(2, "0")}`}</span>
                  {canAdmin ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5 py-1 text-xs"
                        type="button"
                        disabled={activityActionState.pending}
                        onClick={() => startEditActivity(activity)}
                      >
                        编辑
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 px-2.5 py-1 text-xs border-rose-300 text-rose-500 hover:border-rose-400 hover:bg-rose-50/30"
                        type="button"
                        disabled={activityActionState.pending}
                        onClick={() => void handleDeleteActivity(activity)}
                      >
                        删除
                      </button>
                    </div>
                  ) : null}
                </div>
                <strong className="mt-2 block text-[1.08rem] leading-[1.5] text-[rgba(55,84,110,0.95)]">{activity.title}</strong>
                <p className="mt-2.5 inline-flex max-w-full rounded-lg border border-[color:var(--line-soft)] bg-white/35 px-2.5 py-[3px] text-[0.85rem] leading-[1.6] text-[color:var(--text-soft)]">{activity.description || "活动描述待补充。"}</p>
              </div>
            </motion.article>
          ))}
          {!societyActivities.length ? <p className="mt-1 rounded-xl border border-dashed border-[color:var(--line-soft)] bg-white/40 px-3 py-2 text-sm text-[color:var(--text-muted)]">当前还没有活动安排。</p> : null}
        </div>
        {canAdmin && activityEditorMode ? (
          <form className="mt-3.5 grid gap-3 rounded-[14px] border border-dashed border-[rgba(102,167,213,0.38)] bg-[rgba(236,244,251,0.54)] p-4" onSubmit={(event) => void handleActivityEditorSubmit(event)}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">时间轴编辑</p>
                <h3>{activityEditorMode === "create" ? "新增时间轴节点" : "编辑时间轴节点"}</h3>
              </div>
            </div>
            <label>
              <span>时间标签</span>
              <input
                name="label"
                value={activityForm.label}
                onChange={handleActivityFieldChange}
                placeholder="YYYY-MM-DD，例如 2026-04-06"
                pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                required
              />
            </label>
            <label>
              <span>标题</span>
              <input name="title" value={activityForm.title} onChange={handleActivityFieldChange} required />
            </label>
            <label>
              <span>描述</span>
              <textarea
                name="description"
                rows={3}
                value={activityForm.description}
                onChange={handleActivityFieldChange}
                placeholder="填写该时间轴节点的说明"
              />
            </label>
            <div className="flex flex-wrap gap-2.5">
              <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={activityActionState.pending}>
                {activityActionState.pending ? "保存中..." : "保存"}
              </button>
              <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={activityActionState.pending} onClick={closeActivityEditor}>
                取消
              </button>
            </div>
          </form>
        ) : null}
      </motion.section>

      <motion.section {...sectionReveal} className="portal-home__section rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">祝愿大家能够保持对galgame最开始的那一份热爱</h2>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
