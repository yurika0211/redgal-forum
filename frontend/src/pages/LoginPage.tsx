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

  return (
    <section className="login-layout">
      <article className="login-card">
        <div className="login-card__logo" aria-hidden="true">
          <span />
        </div>
        <h1 className="login-card__title">redgal forum</h1>
        <p className="login-card__subtitle">
          {session
            ? "当前会话已建立"
            : isLoginMode
              ? "欢迎回来，请登录你的账号"
              : "创建账号，加入视觉小说研社群"}
        </p>

        {session ? (
          <div className="login-card__session">
            <p className="login-card__message login-card__message--success">
              已登录，可直接进入个人空间。
            </p>
            <div className="login-card__actions">
              <button className="login-card__submit" type="button" onClick={() => onNavigate("/space")}>
                进入个人空间
              </button>
              <button className="login-card__switch" type="button" onClick={onLogout}>
                退出当前会话
              </button>
            </div>
          </div>
        ) : isLoginMode ? (
          <>
            <form className="login-card__form" onSubmit={(event) => void onLoginSubmit(event)}>
              <label>
                <span>账号</span>
                <input
                  autoComplete="username"
                  name="account"
                  onChange={onAuthFieldChange}
                  placeholder="用户名 / 学号 / 邮箱"
                  value={authForm.account}
                />
              </label>
              <label>
                <span>密码</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  onChange={onAuthFieldChange}
                  placeholder="输入账号密码"
                  type="password"
                  value={authForm.password}
                />
              </label>
              {loginState.error ? <p className="login-card__message login-card__message--error">{loginState.error}</p> : null}
              {registerState.success ? (
                <p className="login-card__message login-card__message--success">{registerState.success}</p>
              ) : null}
              <button className="login-card__submit" disabled={loginState.pending} type="submit">
                {loginState.pending ? "登录中..." : "登录"}
              </button>
            </form>
            <div className="login-card__captcha" aria-hidden="true">
              <span className="login-card__captcha-dot" />
              <span>正在验证...</span>
              <strong>Cloudflare</strong>
            </div>
            <button className="login-card__switch" type="button" onClick={() => setMode("register")}>
              创建你的账号
            </button>
          </>
        ) : (
          <>
            <form className="login-card__form" onSubmit={(event) => void onRegisterSubmit(event)}>
              <label>
                <span>学号</span>
                <input
                  autoComplete="off"
                  name="student_id"
                  onChange={onRegisterFieldChange}
                  placeholder="例如：20260001"
                  value={registerForm.student_id}
                />
              </label>
              <label>
                <span>用户名</span>
                <input
                  autoComplete="username"
                  name="username"
                  onChange={onRegisterFieldChange}
                  placeholder="3-32 位字母/数字/下划线"
                  value={registerForm.username}
                />
              </label>
              <label>
                <span>密码</span>
                <input
                  autoComplete="new-password"
                  name="password"
                  onChange={onRegisterFieldChange}
                  placeholder="设置登录密码"
                  type="password"
                  value={registerForm.password}
                />
              </label>
              {registerState.error ? (
                <p className="login-card__message login-card__message--error">{registerState.error}</p>
              ) : null}
              {registerState.success ? (
                <p className="login-card__message login-card__message--success">{registerState.success}</p>
              ) : null}
              <button className="login-card__submit" disabled={registerState.pending} type="submit">
                {registerState.pending ? "注册中..." : "注册"}
              </button>
            </form>
            <button className="login-card__switch" type="button" onClick={() => setMode("login")}>
              返回登录
            </button>
          </>
        )}
      </article>
    </section>
  );
}
