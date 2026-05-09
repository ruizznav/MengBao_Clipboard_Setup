import { useReactive } from "ahooks";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { Spin } from "antd";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import ProList from "@/components/ProList";
import ProSwitch from "@/components/ProSwitch";
import { useImmediateKey } from "@/hooks/useImmediateKey";
import { globalStore } from "@/stores/global";
import { isMac } from "@/utils/is";
import Language from "./components/Language";
import MacosPermissions from "./components/MacosPermissions";
import Manual from "../Backup/components/Manual";
import SavePath from "../Backup/components/SavePath";
import ThemeMode from "./components/ThemeMode";

const General = () => {
  const { app } = useSnapshot(globalStore);
  const { t } = useTranslation();
  const state = useReactive({ spinning: false });

  // 监听自动启动变更
  useImmediateKey(globalStore.app, "autoStart", async (value) => {
    const enabled = await isEnabled();

    if (value && !enabled) {
      return enable();
    }

    if (!value && enabled) {
      disable();
    }
  });

  return (
    <>
      {isMac && <MacosPermissions />}

      <ProList header={t("preference.settings.app_settings.title")}>
        <ProSwitch
          onChange={(value) => {
            globalStore.app.autoStart = value;
          }}
          title={t("preference.settings.app_settings.label.auto_start")}
          value={app.autoStart}
        />

        <ProSwitch
          description={t("preference.settings.app_settings.hints.silent_start")}
          onChange={(value) => {
            globalStore.app.silentStart = value;
          }}
          title={t("preference.settings.app_settings.label.silent_start")}
          value={app.silentStart}
        />

        <ProSwitch
          onChange={(value) => {
            globalStore.app.showMenubarIcon = value;
          }}
          title={t("preference.settings.app_settings.label.show_menubar_icon")}
          value={app.showMenubarIcon}
        />

        <ProSwitch
          onChange={(value) => {
            globalStore.app.showTaskbarIcon = value;
          }}
          title={t("preference.settings.app_settings.label.show_taskbar_icon")}
          value={app.showTaskbarIcon}
        />
      </ProList>

      <ProList header={t("preference.settings.appearance_settings.title")}>
        <Language />

        <ThemeMode />
      </ProList>

      <Spin fullscreen percent="auto" spinning={state.spinning} />

      <SavePath state={state as any} />

      <Manual state={state as any} />
    </>
  );
};

export default General;
