import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// 全局错误边界：捕获渲染期异常并显示到页面，避免白屏无声
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      const { error } = this.state;

      return (
        <div
          style={{
            padding: 16,
            color: "#c00",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <h3 style={{ color: "#c00" }}>渲染崩溃（请把这段红字截图发给开发者）</h3>
          <div style={{ fontWeight: "bold" }}>{String(error.message)}</div>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(error.stack)}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
