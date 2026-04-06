import type { ForumProgress as ApiForumProgress, ForumSignInResult as ApiForumSignInResult, Session } from "../api";
import { forumActionLabel } from "../lib/forum";
import { formatDateTime } from "../lib/text";
import type { FormActionState } from "../types/app";
import StatusChip from "./StatusChip";

interface ForumProgressPanelProps {
  forumLevelPercent: number;
  forumProgress: ApiForumProgress | null;
  forumProgressError: string;
  forumSignInState: FormActionState<ApiForumSignInResult>;
  hasVerifiedSpaceAccess: boolean;
  mode?: "compact" | "full";
  session: Session | null;
  onForumSignIn: () => Promise<void>;
}

export default function ForumProgressPanel({
  forumLevelPercent,
  forumProgress,
  forumProgressError,
  forumSignInState,
  hasVerifiedSpaceAccess,
  mode = "full",
  session,
  onForumSignIn,
}: ForumProgressPanelProps) {
  const forumLevelSummary = forumProgress?.summary ?? null;

  return (
    <div className="stack-list">
      <div className="content-card forum-level-card">
        <div className="content-card__header">
          <div>
            <h3>等级与签到</h3>
            <p className="forum-reply-meta">
              <span>{forumLevelSummary ? `Lv.${forumLevelSummary.current_level}` : "未读取"}</span>
              <span>{forumLevelSummary?.title_name || "讨论区头衔"}</span>
            </p>
          </div>
          <StatusChip tone={forumLevelSummary?.signed_in_today ? "success" : "neutral"}>
            {forumLevelSummary?.signed_in_today ? "今日已签到" : "可签到"}
          </StatusChip>
        </div>
        {!session ? (
          <p className="panel-empty">登录并通过认证后，可以签到并累积讨论经验。</p>
        ) : !hasVerifiedSpaceAccess ? (
          <p className="panel-empty">当前账号还没有论坛等级权限，需要通过认证后才能签到和累积经验。</p>
        ) : forumProgressError ? (
          <p className="panel-error">{forumProgressError}</p>
        ) : forumLevelSummary ? (
          <>
            <div className="forum-level-progress">
              <div className="forum-level-progress__bar">
                <span style={{ width: `${forumLevelPercent}%` }} />
              </div>
              <div className="meta-row">
                <span>{forumLevelSummary.total_exp} EXP</span>
                <span>
                  距离 Lv.{forumLevelSummary.next_level} 还差 {forumLevelSummary.exp_to_next} EXP
                </span>
              </div>
            </div>
            <div className="forum-level-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => void onForumSignIn()}
                disabled={forumSignInState.pending || forumLevelSummary.signed_in_today}
              >
                {forumSignInState.pending
                  ? "签到中..."
                  : forumLevelSummary.signed_in_today
                    ? "今日已签到"
                    : "今日签到 +5 EXP"}
              </button>
              {forumLevelSummary.last_sign_in_at ? (
                <span className="panel-empty">上次签到：{formatDateTime(forumLevelSummary.last_sign_in_at)}</span>
              ) : null}
            </div>
            {forumSignInState.error ? <p className="panel-error">{forumSignInState.error}</p> : null}
            {forumSignInState.success ? <p className="panel-empty">{forumSignInState.success}</p> : null}
          </>
        ) : (
          <p className="panel-empty">等级数据读取中。</p>
        )}
      </div>

      {mode === "full" && forumProgress?.recent_logs?.length ? (
        <div className="content-card forum-level-log-card">
          <div className="content-card__header">
            <h3>经验值明细</h3>
            <StatusChip tone="neutral">{forumProgress.recent_logs.length} 条</StatusChip>
          </div>
          <div className="forum-level-log-list">
            {forumProgress.recent_logs.slice(0, 6).map((log) => (
              <div className="forum-level-log-item" key={log.log_id}>
                <div>
                  <strong>{forumActionLabel(log.action_type)}</strong>
                  <p className="forum-reply-meta">
                    <span>{formatDateTime(log.created_at)}</span>
                    {log.target_id ? <span>ID {log.target_id}</span> : null}
                  </p>
                </div>
                <StatusChip tone={log.exp_delta > 0 ? "success" : "warn"}>
                  {log.exp_delta > 0 ? `+${log.exp_delta}` : log.exp_delta} EXP
                </StatusChip>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
