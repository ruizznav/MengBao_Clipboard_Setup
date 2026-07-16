import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./assets/css/global.scss";
import "mac-scrollbar/dist/mac-scrollbar.css";

// 全局错误浮层：把任何未捕获错误打到页面上，避免白屏无声
function showErrorOverlay(msg: string) {
  let el = document.getElementById("error-overlay");

  if (!el) {
    el = document.createElement("div");
    el.id = "error-overlay";
    el.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:#fff;color:#c00;font:12px/1.5 monospace;padding:16px;white-space:pre-wrap;overflow:auto;";
    document.body.appendChild(el);
  }

  el.textContent += "\n" + msg;
}

window.addEventListener("error", (e) => {
  showErrorOverlay(
    "window.error: " + (e.message || e.error) + "\n" + (e.error?.stack || ""),
  );
});

window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason;

  showErrorOverlay(
    "unhandledrejection: " + (r?.message || r) + "\n" + (r?.stack || ""),
  );
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
