import { proxy } from "valtio";
import type { GlobalStore } from "@/types/store";
import { DEFAULT_THEME, getThemeConfig } from "@/constants/theme";

export const globalStore = proxy<GlobalStore>({
  app: {
    autoStart: false,
    showMenubarIcon: true,
    showTaskbarIcon: false,
    silentStart: false,
  },

  appearance: {
    isDark: getThemeConfig(DEFAULT_THEME).isDark,
    theme: DEFAULT_THEME,
  },

  env: {
    saveDataDir: "",
  },

  shortcut: {
    clipboard: "Alt+Z",
    pastePlain: "",
    preference: "Alt+X",
    screenshot: "Control+Alt+Z",
    quickPaste: {
      enable: false,
      value: "Command+Shift",
    },
  },

  update: {
    auto: false,
    beta: false,
  },
});
