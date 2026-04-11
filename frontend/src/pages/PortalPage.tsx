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
    <>
      <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm portal-manifesto">
        <div className="portal-manifesto__head">
          <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">社团介绍 / manifesto</p>
          <h1>从 2017 到现在，我们把热爱写进了持续发生的社团活动。</h1>
        </div>
        <div className="portal-manifesto__body portal-manifesto__body--single">
          <div className="portal-manifesto__copy">
            <p>
              百川乃大视觉小说研起源于川大校级 ACG 社团中的 Galgame 分群，2017 年开始聚拢同好，
              2024 年正式确立社团名称。一路从十几人的小群，慢慢扩展到今天的 300+ 社群规模。
            </p>
            <p>
              我们把“十二川器”年度评选、征文大赛、招新问答和“百川夜话”访谈做成固定活动，
              让作品推荐、创作表达和行业交流都能在站内留下可追溯的记录。
            </p>
            <p>
              如果你也会在深夜里冒出“我们来做一部视觉小说吧”的念头，
              这里会是你把热爱变成讨论、稿件、视频和合作的起点。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 portal-brief-grid">
        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">站内公告</p>
              <h2>最新公告栏</h2>
            </div>
          </div>
          <div className="portal-brief-list">
            {notices.map((notice) => (
              <div className="portal-brief-item" key={notice.id}>
                <span>{notice.kicker || "公告"}</span>
                <strong>{notice.title}</strong>
                <p>{notice.description || notice.body}</p>
              </div>
            ))}
            {!notices.length ? <p className="text-sm text-[color:var(--text-muted)]">当前还没有发布公告。</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">先从哪里看起</p>
              <h2>板块导航</h2>
            </div>
          </div>
          <div className="portal-route-list">
            {portalPages.map((page) => (
              <button
                className="portal-route-item"
                key={page.href}
                type="button"
                onClick={() => onNavigate(page.href)}
              >
                <span>{page.kicker}</span>
                <strong>{page.title}</strong>
                <p>{page.description}</p>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm portal-activity-panel">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">活动与聚会</p>
            <h2>最近会遇到的事情</h2>
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
        {canAdmin && activityActionState.error ? <p className="text-sm text-rose-500/90">{activityActionState.error}</p> : null}
        {canAdmin && activityActionState.success ? <p className="text-sm text-[color:var(--text-muted)]">{activityActionState.success}</p> : null}
        <div className="portal-timeline">
          <span className="portal-timeline__line" aria-hidden="true" />
          {societyActivities.map((activity, index) => (
            <article
              className="portal-timeline-item"
              key={activity.id}
            >
              <span className="portal-timeline-item__dot" aria-hidden="true" />
              <div className="portal-timeline-item__body">
                <div className="portal-timeline-item__head">
                  <span>{activity.label || `节点 ${String(index + 1).padStart(2, "0")}`}</span>
                  {canAdmin ? (
                    <div className="portal-timeline-item__actions">
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
                <strong>{activity.title}</strong>
                <p>{activity.description || "活动描述待补充。"}</p>
              </div>
            </article>
          ))}
          {!societyActivities.length ? <p className="text-sm text-[color:var(--text-muted)]">当前还没有活动安排。</p> : null}
        </div>
        {canAdmin && activityEditorMode ? (
          <form className="grid gap-3 portal-timeline-editor" onSubmit={(event) => void handleActivityEditorSubmit(event)}>
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
            <div className="portal-timeline-editor__actions">
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

      <section className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">一句实话</p>
            <h2>我们并不完美，但一直有人还想继续做下去</h2>
          </div>
        </div>
        <p className="text-sm text-[color:var(--text-muted)]">
          百川乃大未必已经完成过属于自己的视觉小说，站点也还在一点点长出来。
          但社团真正重要的并不是“已经做成了什么”，而是每一年总会有人重新把热情接过来。
        </p>
      </section>
    </>
  );
}
