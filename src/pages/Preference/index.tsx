import { emit } from "@tauri-apps/api/event";
import { useMount } from "ahooks";
import { Flex } from "antd";
import clsx from "clsx";
import { MacScrollbar } from "mac-scrollbar";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import UnoIcon from "@/components/UnoIcon";
import { LISTEN_KEY } from "@/constants";
import { useRegister } from "@/hooks/useRegister";
import { useSubscribe } from "@/hooks/useSubscribe";
import { useTray } from "@/hooks/useTray";
import { isAutostart } from "@/plugins/autostart";
import { showWindow, hideWindow, toggleWindowVisible } from "@/plugins/window";
import { clipboardStore } from "@/stores/clipboard";
import { globalStore } from "@/stores/global";
import { raf } from "@/utils/bom";
import { saveStore } from "@/utils/store";
import About from "./components/About";
import Clipboard from "./components/Clipboard";
import General from "./components/General";
import Groups from "./components/Groups";
import History from "./components/History";
import Shortcut from "./components/Shortcut";

const menuConfig = [
  { key: "clipboard", icon: "i-lucide:clipboard-list", labelKey: "clipboard" },
  { key: "history", icon: "i-lucide:history", labelKey: "history" },
  { key: "groups", icon: "i-lucide:folder-tree", labelKey: "groups" },
  { key: "general", icon: "i-lucide:bolt", labelKey: "general" },
  { key: "shortcut", icon: "i-lucide:keyboard", labelKey: "shortcut" },
  { key: "about", icon: "i-lucide:info", labelKey: "about" },
];

const componentMap: Record<string, React.ReactNode> = {
  clipboard: <Clipboard />,
  history: <History />,
  groups: <Groups />,
  general: <General />,
  shortcut: <Shortcut />,
  about: <About />,
};

const Preference = () => {
  const { t } = useTranslation();
  const { app, shortcut, appearance } = useSnapshot(globalStore);
  const [activeKey, setActiveKey] = useState("clipboard");
  const contentRef = useRef<HTMLElement>(null);

  const { createTray } = useTray();

  useMount(async () => {
    createTray();

    const autostart = await isAutostart();

    if (!autostart && !app.silentStart) {
      showWindow();
    }
  });

  useSubscribe(globalStore, () => handleStoreChanged());
  useSubscribe(clipboardStore, () => handleStoreChanged());
  useRegister(toggleWindowVisible, [shortcut.preference]);

  const handleStoreChanged = () => {
    emit(LISTEN_KEY.STORE_CHANGED, { clipboardStore, globalStore });
    saveStore();
  };

  const handleMenuClick = (key: string) => {
    setActiveKey(key);
    raf(() => {
      contentRef.current?.scrollTo({ behavior: "smooth", top: 0 });
    });
  };

  return (
    <Flex className="h-screen" vertical style={{ backgroundColor: "var(--ant-color-bg-container)" }}>
      {/* 标题栏 */}
      <div className="cute-header" data-tauri-drag-region>
        <div className="cute-header-left">
          <UnoIcon
            name="i-lets-icons:clipboard"
            style={{ fontSize: 18, color: "var(--ant-color-primary)" }}
          />
          <span>萌宝剪贴板 v5 · {t("preference.title")}</span>
        </div>

        <div className="cute-header-right">
          <UnoIcon
            hoverable
            name="i-lucide:x"
            onClick={hideWindow}
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      {/* 顶部标签导航 */}
      <div className="cute-preference-tabs" data-tauri-drag-region>
        {menuConfig.map(({ key, icon, labelKey }) => (
          <button
            key={key}
            type="button"
            className={clsx("cute-preference-tab", {
              active: activeKey === key,
            })}
            onClick={() => handleMenuClick(key)}
          >
            <UnoIcon name={icon} size={16} />
            <span>{t(`preference.menu.title.${labelKey}`)}</span>
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <MacScrollbar
        className="flex-1"
        data-tauri-drag-region
        ref={contentRef}
        skin={appearance.isDark ? "dark" : "light"}
        style={{ backgroundColor: "var(--ant-color-bg-layout)", padding: 16 }}
      >
        {menuConfig.map(({ key }) => (
          <div hidden={key !== activeKey} key={key}>
            {componentMap[key]}
          </div>
        ))}
      </MacScrollbar>
    </Flex>
  );
};

export default Preference;
