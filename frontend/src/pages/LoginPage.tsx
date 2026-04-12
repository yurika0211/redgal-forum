import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Session } from "../api";

interface LoginPageProps {
  authForm: {
    account: string;
    password: string;
  };
  loginState: {
    pending: boolean;
    error: string;
  };
  registerForm: {
    student_id: string;
    username: string;
    password: string;
  };
  registerState: {
    pending: boolean;
    error: string;
    success: string;
  };
  session: Session | null;
  onAuthFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onLogout: () => void;
  onNavigate: (href: string) => void;
  onRegisterFieldChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRegisterSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export default function LoginPage({
  authForm,
  loginState,
  registerForm,
  registerState,
  session,
  onAuthFieldChange,
  onLoginSubmit,
  onLogout,
  onNavigate,
  onRegisterFieldChange,
  onRegisterSubmit,
}: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const isLoginMode = mode === "login";
  const fieldClassName =
    "mt-1 w-full rounded-lg border border-[color:var(--line-soft)] bg-white/70 px-3 py-2 text-sm text-[color:var(--text-main)] outline-none transition placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[color:var(--surface-tint-blue)]";
  const submitButtonClassName =
    "inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55";
  const ghostButtonClassName =
    "inline-flex items-center justify-center rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-2 text-sm text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/75";

  return (
    <section className="mx-auto grid w-full max-w-md px-4 py-8">
      <article className="grid gap-4 rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel-strong)]/90 p-5 shadow-[0_16px_36px_rgba(0,0,0,0.12)]">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)]" aria-hidden="true">
          <span className="h-5 w-5 rounded-full bg-[color:var(--color-lilac)]/70" />
        </div>
        <h1 className="text-center text-xl font-semibold tracking-wide text-[color:var(--text-strong)]">redgal forum</h1>
        <p className="text-center text-sm text-[color:var(--text-muted)]">
          {session
            ? "当前会话已建立"
            : isLoginMode
              ? "欢迎回来，请登录你的账号"
              : "创建账号，加入视觉小说研社群"}
        </p>

        {session ? (
          <div className="grid gap-3">
            <p className="rounded-lg border border-[color:var(--color-mint)]/35 bg-[color:var(--color-mint)]/16 px-3 py-2 text-sm text-[color:var(--text-main)]">
              已登录，可直接进入个人空间。
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className={submitButtonClassName} type="button" onClick={() => onNavigate("/space")}>
                进入个人空间
              </button>
              <button className={ghostButtonClassName} type="button" onClick={onLogout}>
                退出当前会话
              </button>
            </div>
          </div>
        ) : isLoginMode ? (
          <>
            <form className="grid gap-3" onSubmit={(event) => void onLoginSubmit(event)}>
              <label>
                <span className="text-xs text-[color:var(--text-muted)]">账号</span>
                <input
                  autoComplete="username"
                  className={fieldClassName}
                  name="account"
                  onChange={onAuthFieldChange}
                  placeholder="用户名 / 学号 / 邮箱"
                  value={authForm.account}
                />
              </label>
              <label>
                <span className="text-xs text-[color:var(--text-muted)]">密码</span>
                <input
                  autoComplete="current-password"
                  className={fieldClassName}
                  name="password"
                  onChange={onAuthFieldChange}
                  placeholder="输入账号密码"
                  type="password"
                  value={authForm.password}
                />
              </label>
              {loginState.error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/12 px-3 py-2 text-sm text-red-700">{loginState.error}</p>
              ) : null}
              {registerState.success ? (
                <p className="rounded-lg border border-[color:var(--color-mint)]/35 bg-[color:var(--color-mint)]/16 px-3 py-2 text-sm text-[color:var(--text-main)]">{registerState.success}</p>
              ) : null}
              <button className={submitButtonClassName} disabled={loginState.pending} type="submit">
                {loginState.pending ? "登录中..." : "登录"}
              </button>
            </form>
            <div
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-2 text-xs text-[color:var(--text-muted)]"
              aria-hidden="true"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)]" />
              <span>正在验证...</span>
              <strong className="font-semibold text-[color:var(--text-soft)]">Cloudflare</strong>
            </div>
            <button className={ghostButtonClassName} type="button" onClick={() => setMode("register")}>
              创建你的账号
            </button>
          </>
        ) : (
          <>
            <form className="grid gap-3" onSubmit={(event) => void onRegisterSubmit(event)}>
              <label>
                <span className="text-xs text-[color:var(--text-muted)]">学号</span>
                <input
                  autoComplete="off"
                  className={fieldClassName}
                  name="student_id"
                  onChange={onRegisterFieldChange}
                  placeholder="例如：20260001"
                  value={registerForm.student_id}
                />
              </label>
              <label>
                <span className="text-xs text-[color:var(--text-muted)]">用户名</span>
                <input
                  autoComplete="username"
                  className={fieldClassName}
                  name="username"
                  onChange={onRegisterFieldChange}
                  placeholder="3-32 位字母/数字/下划线"
                  value={registerForm.username}
                />
              </label>
              <label>
                <span className="text-xs text-[color:var(--text-muted)]">密码</span>
                <input
                  autoComplete="new-password"
                  className={fieldClassName}
                  name="password"
                  onChange={onRegisterFieldChange}
                  placeholder="设置登录密码"
                  type="password"
                  value={registerForm.password}
                />
              </label>
              {registerState.error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/12 px-3 py-2 text-sm text-red-700">{registerState.error}</p>
              ) : null}
              {registerState.success ? (
                <p className="rounded-lg border border-[color:var(--color-mint)]/35 bg-[color:var(--color-mint)]/16 px-3 py-2 text-sm text-[color:var(--text-main)]">{registerState.success}</p>
              ) : null}
              <button className={submitButtonClassName} disabled={registerState.pending} type="submit">
                {registerState.pending ? "注册中..." : "注册"}
              </button>
            </form>
            <button className={ghostButtonClassName} type="button" onClick={() => setMode("login")}>
              返回登录
            </button>
          </>
        )}
      </article>
    </section>
  );
}
