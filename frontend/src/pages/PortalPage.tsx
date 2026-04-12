import { useState, type ChangeEvent, type FormEvent } from "react";
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

  return (
    <div className="grid gap-[clamp(16px,2.6vw,30px)]">
      <section className="portal-home__section mt-2 grid gap-[26px] rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="grid max-w-[76ch] gap-3">
          <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">社团介绍 / manifesto</p>
          <h1 className="m-0 font-[var(--font-display)] text-[clamp(2.05rem,3.7vw,3.3rem)] leading-[1.08] text-[color:var(--text-strong)]">从 2017 到现在，我们把热爱写进了持续发生的社团活动。</h1>
          <p className="m-0 max-w-[64ch] text-[color:var(--text-main)] leading-[1.82]">
            在这里，站点记录的不只是活动信息，更是每一届成员把兴趣转成作品、对话和协作的过程。
          </p>
        </div>
        <div className="grid items-stretch gap-[18px] [grid-template-columns:minmax(0,1.12fr)_minmax(260px,0.88fr)] max-[1040px]:[grid-template-columns:minmax(0,1fr)]">
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
          <aside className="rounded-[20px] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-[clamp(14px,1.9vw,20px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" aria-label="社团关键节点">
            <ul className="m-0 grid list-none gap-2.5 p-0 max-[1040px]:grid-cols-3 max-[760px]:grid-cols-1">
              {manifestoHighlights.map((item) => (
                <li className="grid gap-[5px] rounded-[14px] border border-[color:var(--line-soft)] bg-white/60 px-3 py-[11px]" key={item.label}>
                  <span className="text-[0.75rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{item.label}</span>
                  <strong className="font-[var(--font-display)] text-[1.26rem] text-[color:var(--text-strong)]">{item.value}</strong>
                  <p className="m-0 text-[0.86rem] text-[color:var(--text-soft)] leading-[1.65]">{item.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <article className="portal-home__section rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">站内公告</p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">最新公告栏</h2>
              <p className="mt-2.5 max-w-[56ch] text-[0.95rem] leading-[1.76] text-[color:var(--text-soft)] max-[760px]:text-[0.9rem] max-[760px]:leading-[1.7]">集中查看站内公告与活动通知，快速了解近期更新。</p>
            </div>
          </div>
          <div className="grid gap-3.5">
            {notices.map((notice) => (
              <div className="rounded-[18px] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(245,248,252,0.78)),rgba(255,255,255,0.64)] p-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_16px_rgba(46,73,112,0.06)] max-[760px]:rounded-[14px]" key={notice.id}>
                <span className="inline-block text-[0.74rem] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">{notice.kicker || "公告"}</span>
                <strong className="mt-2 block">{notice.title}</strong>
                <p className="mt-2.5 text-[color:var(--text-soft)] leading-[1.8]">{notice.description || notice.body}</p>
              </div>
            ))}
            {!notices.length ? <p className="mt-1 rounded-xl border border-dashed border-[color:var(--line-soft)] bg-white/40 px-3 py-2 text-sm text-[color:var(--text-muted)]">当前还没有发布公告。</p> : null}
          </div>
        </article>

        <article className="portal-home__section rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">先从哪里看起</p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">板块导航</h2>
              <p className="mt-2.5 max-w-[56ch] text-[0.95rem] leading-[1.76] text-[color:var(--text-soft)] max-[760px]:text-[0.9rem] max-[760px]:leading-[1.7]">按内容类型挑选入口，减少首次浏览时的信息负担。</p>
            </div>
          </div>
          <div className="grid gap-3.5">
            {portalPages.map((page) => (
              <button
                className="rounded-[18px] border border-[color:var(--line-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(245,248,252,0.78)),rgba(255,255,255,0.64)] p-[18px] text-left text-inherit shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_16px_rgba(46,73,112,0.06)] transition-[transform,border-color,background-color,box-shadow] duration-180 ease-linear hover:-translate-y-[3px] hover:border-[rgba(79,139,174,0.3)] hover:bg-[rgba(255,255,255,0.86)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_12px_24px_rgba(46,73,112,0.1)] max-[760px]:rounded-[14px]"
                key={page.href}
                type="button"
                onClick={() => onNavigate(page.href)}
              >
                <span className="inline-block text-[0.74rem] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">{page.kicker}</span>
                <strong className="mt-2 block">{page.title}</strong>
                <p className="mt-2.5 text-[color:var(--text-soft)] leading-[1.8]">{page.description}</p>
              </button>
            ))}
            {!portalPages.length ? <p className="mt-1 rounded-xl border border-dashed border-[color:var(--line-soft)] bg-white/40 px-3 py-2 text-sm text-[color:var(--text-muted)]">当前还没有配置导航入口。</p> : null}
          </div>
        </article>
      </section>

      <section className="my-1 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm portal-home__section">
        <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">活动与聚会</p>
            <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">最近会遇到的事情</h2>
            <p className="mt-2.5 max-w-[56ch] text-[0.95rem] leading-[1.76] text-[color:var(--text-soft)] max-[760px]:text-[0.9rem] max-[760px]:leading-[1.7]">以时间顺序整理社团活动，便于提前安排参与计划。</p>
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
            <article
              className="relative mt-1.5 pl-[30px] first:mt-0 max-[980px]:mt-1 max-[980px]:pl-6"
              key={activity.id}
            >
              <span className="absolute left-[5px] top-[22px] h-[14px] w-[14px] rounded-full border-[3px] border-[rgba(102,167,213,0.86)] bg-[#f8fbff] shadow-[0_0_0_2px_rgba(255,255,255,0.9),0_0_0_5px_rgba(102,167,213,0.12)] max-[980px]:left-[3px] max-[980px]:top-[18px] max-[980px]:h-3 max-[980px]:w-3" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[14px] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-4 py-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_10px_22px_rgba(37,60,42,0.08)] max-[760px]:px-[13px] max-[760px]:py-3">
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
            </article>
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
      </section>

      <section className="portal-home__section rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="mb-[14px] flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-[7px] text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">一句实话</p>
            <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.28rem,2.1vw,1.8rem)] leading-[1.2] text-[color:var(--text-strong)]">我们并不完美，但一直有人还想继续做下去</h2>
          </div>
        </div>
        <p className="m-0 max-w-[74ch] text-sm text-[color:var(--text-muted)] leading-[1.86]">
          百川乃大未必已经完成过属于自己的视觉小说，站点也还在一点点长出来。
          但社团真正重要的并不是“已经做成了什么”，而是每一年总会有人重新把热情接过来。
        </p>
      </section>
    </div>
  );
}
