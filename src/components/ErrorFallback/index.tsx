import type { ErrorInfo, FC, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends FC<Props> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);

    // 同时写到全局错误浮层（index.html 内联脚本创建的）
    const win = window as unknown as { __showError?: (msg: string) => void };
    if (win.__showError) {
      win.__showError(
        `[ErrorBoundary] ${error.message}\n${info.componentStack || ""}`
      );
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 20,
            color: "#c00",
            fontFamily: "monospace",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            background: "#fff",
            height: "100vh",
            overflow: "auto",
          }}
        >
          <strong>渲染崩溃（组件级别）</strong>
          {"\n\n"}
          {this.state.error.message}
          {"\n\n"}
          {this.state.error.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
