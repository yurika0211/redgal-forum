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
      <section className="app-error-boundary">
        <article className="panel app-error-boundary__panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">页面异常</p>
              <h2>页面遇到异常，已自动拦截崩溃</h2>
            </div>
          </div>
          <p className="panel-error">{this.state.message || "未知错误"}</p>
          <div className="gallery-admin__actions">
            <button className="primary-button" type="button" onClick={this.handleReload}>
              刷新页面
            </button>
            <a className="ghost-button" href="/">
              返回首页
            </a>
          </div>
        </article>
      </section>
    );
  }
}

export default AppErrorBoundary;
