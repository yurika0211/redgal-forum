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
  if (isAuthenticated && session) {
    return (
      <div className="session-box">
        <p className="panel-empty">当前已连上后端会话，个人空间将直接读取 `/users/me`。</p>
        <span className="token-preview">{session.accessToken}</span>
        {profileError ? <p className="panel-error">{profileError}</p> : null}
        <button className="ghost-button" type="button" onClick={onLogout}>
          退出当前会话
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={(event) => void onLoginSubmit(event)}>
      <p className="panel-empty">
        登录会直接走后端 `/auth/login`。当前脚手架登录只在开发环境且
        `AUTH_ALLOW_SCAFFOLD_LOGIN=true` 时可用。
      </p>
      <label>
        <span>账号</span>
        <input
          autoComplete="username"
          name="account"
          onChange={onAuthFieldChange}
          placeholder="例如：rubedo_room"
          value={authForm.account}
        />
      </label>
      <label>
        <span>密码</span>
        <input
          autoComplete="current-password"
          name="password"
          onChange={onAuthFieldChange}
          placeholder="输入脚手架登录密码"
          type="password"
          value={authForm.password}
        />
      </label>
      {loginState.error ? <p className="panel-error">{loginState.error}</p> : null}
      <button className="primary-button" type="submit" disabled={loginState.pending}>
        {loginState.pending ? "登录中..." : "登录并同步空间"}
      </button>
    </form>
  );
}
