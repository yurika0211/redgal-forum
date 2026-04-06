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
      <section className="panel portal-manifesto">
        <div className="portal-manifesto__head">
          <p className="eyebrow">社团介绍 / manifesto</p>
          <h1>这里聚着一群愿意认真聊视觉小说的人。</h1>
        </div>
        <div className="portal-manifesto__body portal-manifesto__body--single">
          <div className="portal-manifesto__copy">
            <p>
              百川乃大不是只用来“看作品”的地方。我们会拆剧情、聊角色、做共赏、
              也会把截图、札记、活动照片和那些一闪而过的灵感慢慢收起来。
            </p>
            <p>
              有人偏爱写长评，有人更在意场景和音乐，有人只是想在校园里找到可以认真聊 Galgame 的同类。
              这些差异不会被抹平，反而正是社团最重要的部分。
            </p>
            <p>
              如果你也会在深夜里突然冒出一句“我们来做一部视觉小说吧”，
              那你大概就能明白这个地方为什么会存在。
            </p>
          </div>
        </div>
      </section>

      <section className="page-split-grid portal-brief-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">站内公告</p>
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
            {!notices.length ? <p className="panel-empty">当前还没有发布公告。</p> : null}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">先从哪里看起</p>
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

      <section className="panel portal-activity-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">活动与聚会</p>
            <h2>最近会遇到的事情</h2>
          </div>
          {canAdmin ? (
            <button
              className="ghost-button small-action-button"
              type="button"
              disabled={activityActionState.pending}
              onClick={startCreateActivity}
            >
              新增节点
            </button>
          ) : null}
        </div>
        {canAdmin && activityActionState.error ? <p className="panel-error">{activityActionState.error}</p> : null}
        {canAdmin && activityActionState.success ? <p className="panel-empty">{activityActionState.success}</p> : null}
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
                        className="ghost-button small-action-button"
                        type="button"
                        disabled={activityActionState.pending}
                        onClick={() => startEditActivity(activity)}
                      >
                        编辑
                      </button>
                      <button
                        className="ghost-button small-action-button gallery-admin__danger"
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
          {!societyActivities.length ? <p className="panel-empty">当前还没有活动安排。</p> : null}
        </div>
        {canAdmin && activityEditorMode ? (
          <form className="space-form portal-timeline-editor" onSubmit={(event) => void handleActivityEditorSubmit(event)}>
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">时间轴编辑</p>
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
              <button className="primary-button" type="submit" disabled={activityActionState.pending}>
                {activityActionState.pending ? "保存中..." : "保存"}
              </button>
              <button className="ghost-button" type="button" disabled={activityActionState.pending} onClick={closeActivityEditor}>
                取消
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">一句实话</p>
            <h2>我们并不完美，但一直有人还想继续做下去</h2>
          </div>
        </div>
        <p className="panel-empty">
          百川乃大未必已经完成过属于自己的视觉小说，站点也还在一点点长出来。
          但社团真正重要的并不是“已经做成了什么”，而是每一年总会有人重新把热情接过来。
        </p>
      </section>
    </>
  );
}
