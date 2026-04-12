import type {
  ChangeEvent,
  FormEvent,
} from "react";
import type { Session } from "../api";
import type { AuthFormState, LoginState } from "../types/app";

interface AuthPanelProps {
  authForm: AuthFormState;
  isAuthenticated: boolean;
  loginState: LoginState;
  profileError: string;
  session: Session | null;
  onAuthFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogout: () => void;
}

export default function AuthPanel({
  authForm,
  isAuthenticated,
  loginState,
  profileError,
  session,
  onAuthFieldChange,
  onLoginSubmit,
  onLogout,
}: AuthPanelProps) {
  const inputClassName =
    "w-full rounded-lg border border-[color:var(--line-soft)] bg-white/75 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--surface-tint-blue)]";

  if (isAuthenticated && session) {
    return (
      <div className="ui-card-sub grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4">
        <p className="text-sm text-[color:var(--text-muted)]">当前会话已建立，个人空间会自动同步账号信息。</p>
        <span className="block max-w-full overflow-x-auto rounded-md border border-dashed border-[color:var(--line-soft)] bg-white/45 px-2 py-1.5 font-mono text-xs text-[color:var(--text-muted)]">
          {session.accessToken}
        </span>
        {profileError ? <p className="text-sm text-rose-500/90">{profileError}</p> : null}
        <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={onLogout}>
          退出当前会话
        </button>
      </div>
    );
  }

  return (
    <form className="ui-card-sub grid gap-3 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4" onSubmit={(event) => void onLoginSubmit(event)}>
      <p className="text-sm text-[color:var(--text-muted)]">登录后将同步当前账号会话。</p>
      <label className="grid gap-1.5">
        <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">账号</span>
        <input
          autoComplete="username"
          className={inputClassName}
          name="account"
          onChange={onAuthFieldChange}
          placeholder="例如：rubedo_room"
          value={authForm.account}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">密码</span>
        <input
          autoComplete="current-password"
          className={inputClassName}
          name="password"
          onChange={onAuthFieldChange}
          placeholder="输入账号密码"
          type="password"
          value={authForm.password}
        />
      </label>
      {loginState.error ? <p className="text-sm text-rose-500/90">{loginState.error}</p> : null}
      <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={loginState.pending}>
        {loginState.pending ? "登录中..." : "登录并同步空间"}
      </button>
    </form>
  );
}
