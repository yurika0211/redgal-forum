import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "页面渲染异常",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error("App crashed:", error, errorInfo);
  }

  private handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="grid min-h-[40vh] place-items-center p-4">
        <article className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-panel)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">页面异常</p>
              <h2>页面遇到异常，已自动拦截崩溃</h2>
            </div>
          </div>
          <p className="text-sm text-rose-500/90">{this.state.message || "未知错误"}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-transparent bg-[linear-gradient(135deg,var(--color-primary),var(--color-lilac))] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={this.handleReload}>
              刷新页面
            </button>
            <a className="inline-flex items-center justify-center gap-1 rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60" href="/">
              返回首页
            </a>
          </div>
        </article>
      </section>
    );
  }
}

export default AppErrorBoundary;
