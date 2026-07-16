import { HappyProvider } from "@ant-design/happy-work-theme";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { error } from "@tauri-apps/plugin-log";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useBoolean, useEventListener, useKeyPress, useMount } from "ahooks";
import { ConfigProvider, theme } from "antd";
import { isString } from "es-toolkit";
import { RouterProvider } from "react-router-dom";
import { useSnapshot } from "valtio";
import { getThemeConfig } from "./constants/theme";
import { LISTEN_KEY, PRESET_SHORTCUT } from "./constants";
import { destroyDatabase } from "./database";
import { useImmediateKey } from "./hooks/useImmediateKey";
import { useTauriListen } from "./hooks/useTauriListen";
import { useWindowState } from "./hooks/useWindowState";
import { getAntdLocale, i18n } from "./locales";
import { hideWindow, showWindow } from "./plugins/window";
import { router } from "./router";
import { globalStore } from "./stores/global";
import { generateThemeVars } from "./utils/color";
import { isURL } from "./utils/is";
import { restoreStore } from "./utils/store";

const { defaultAlgorithm, darkAlgorithm } = theme;

const App = () => {
  const { appearance } = useSnapshot(globalStore);
  const { restoreState } = useWindowState();
  const [ready] = useBoolean(true);

  useMount(async () => {
    await restoreState();

    await restoreStore();

    // 从 proxy 读取最新值（restoreStore 可能修改了主题）
    const currentTheme = globalStore.appearance.theme;
    const config = getThemeConfig(currentTheme);
    generateThemeVars(currentTheme);
    document.documentElement.dataset.theme = currentTheme;
    if (config.isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  // 监听语言的变化
  useImmediateKey(globalStore.appearance, "language", i18n.changeLanguage);

  // 监听主题的变化
  useImmediateKey(globalStore.appearance, "theme", (value) => {
    const config = getThemeConfig(value);

    // 更新 isDark
    globalStore.appearance.isDark = config.isDark;

    // 重新生成 CSS 变量
    generateThemeVars(value);

    // 更新 html 标记
    document.documentElement.dataset.theme = value;
    if (config.isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  // 监听显示窗口的事件
  useTauriListen(LISTEN_KEY.SHOW_WINDOW, ({ payload }) => {
    const appWindow = getCurrentWebviewWindow();

    if (appWindow.label !== payload) return;

    showWindow();
  });

  // 监听关闭数据库的事件
  useTauriListen(LISTEN_KEY.CLOSE_DATABASE, destroyDatabase);

  // 链接跳转到系统浏览器
  useEventListener("click", (event) => {
    const link = (event.target as HTMLElement).closest("a");

    if (!link) return;

    const { href, target } = link;

    if (target === "_blank") return;

    event.preventDefault();

    if (!isURL(href)) return;

    openUrl(href);
  });

  // 隐藏窗口
  useKeyPress(["esc", PRESET_SHORTCUT.HIDE_WINDOW], hideWindow);

  // 监听 promise 的错误，输出到日志
  useEventListener("unhandledrejection", ({ reason }) => {
    const message = isString(reason) ? reason : JSON.stringify(reason);

    error(message);
  });

  const activeThemeConfig = getThemeConfig(appearance.theme);

  return (
    <ConfigProvider
      locale={getAntdLocale(appearance.language)}
      theme={{
        algorithm: activeThemeConfig.isDark ? darkAlgorithm : defaultAlgorithm,
        token: activeThemeConfig.antdToken,
      }}
    >
      <HappyProvider>
        {ready && <RouterProvider router={router} />}
      </HappyProvider>
    </ConfigProvider>
  );
};

export default App;
