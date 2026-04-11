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
  const logItemClassName =
    "flex items-center justify-between gap-3 rounded-lg border border-[color:var(--line-soft)] bg-white/40 px-3 py-2.5";

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3>等级与签到</h3>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
              <span>{forumLevelSummary ? `Lv.${forumLevelSummary.current_level}` : "未读取"}</span>
              <span>{forumLevelSummary?.title_name || "讨论区头衔"}</span>
            </p>
          </div>
          <StatusChip tone={forumLevelSummary?.signed_in_today ? "success" : "neutral"}>
            {forumLevelSummary?.signed_in_today ? "今日已签到" : "可签到"}
          </StatusChip>
        </div>
        {!session ? (
          <p className="text-sm text-[color:var(--text-muted)]">登录并通过认证后，可以签到并累积讨论经验。</p>
        ) : !hasVerifiedSpaceAccess ? (
          <p className="text-sm text-[color:var(--text-muted)]">当前账号还没有论坛等级权限，需要通过认证后才能签到和累积经验。</p>
        ) : forumProgressError ? (
          <p className="text-sm text-rose-500/90">{forumProgressError}</p>
        ) : forumLevelSummary ? (
          <>
            <div className="grid gap-2">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-tint-blue)]">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-lilac))] transition-[width] duration-300"
                  style={{ width: `${forumLevelPercent}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
                <span>{forumLevelSummary.total_exp} EXP</span>
                <span>
                  距离 Lv.{forumLevelSummary.next_level} 还差 {forumLevelSummary.exp_to_next} EXP
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
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
                <span className="text-sm text-[color:var(--text-muted)]">上次签到：{formatDateTime(forumLevelSummary.last_sign_in_at)}</span>
              ) : null}
            </div>
            {forumSignInState.error ? <p className="text-sm text-rose-500/90">{forumSignInState.error}</p> : null}
            {forumSignInState.success ? <p className="text-sm text-[color:var(--text-muted)]">{forumSignInState.success}</p> : null}
          </>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">等级数据读取中。</p>
        )}
      </div>

      {mode === "full" && forumProgress?.recent_logs?.length ? (
        <div className="rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h3>经验值明细</h3>
            <StatusChip tone="neutral">{forumProgress.recent_logs.length} 条</StatusChip>
          </div>
          <div className="grid gap-2">
            {forumProgress.recent_logs.slice(0, 6).map((log) => (
              <div className={logItemClassName} key={log.log_id}>
                <div>
                  <strong className="text-sm font-semibold text-[color:var(--text-strong)]">{forumActionLabel(log.action_type)}</strong>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-muted)]">
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
