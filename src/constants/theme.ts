import type { Theme } from "@/types/store";

export interface ThemeConfig {
  key: Theme;
  label: string;
  color: string;
  isDark: boolean;
  antdToken: {
    colorPrimary: string;
    colorBgContainer: string;
    colorBgLayout: string;
    colorBgElevated: string;
    colorBorder: string;
    colorBorderSecondary: string;
    borderRadius: number;
  };
}

export const THEME_CONFIGS: ThemeConfig[] = [
  {
    key: "clear-sky",
    label: "theme_clear_sky",
    color: "#6cb4ee",
    isDark: false,
    antdToken: {
      colorPrimary: "#6cb4ee",
      colorBgContainer: "#f0f8ff",
      colorBgLayout: "#e6f2ff",
      colorBgElevated: "#f5fbff",
      colorBorder: "#c8dff5",
      colorBorderSecondary: "#b8d5f0",
      borderRadius: 8,
    },
  },
  {
    key: "coral",
    label: "theme_coral",
    color: "#f07a7a",
    isDark: false,
    antdToken: {
      colorPrimary: "#f07a7a",
      colorBgContainer: "#fff5f5",
      colorBgLayout: "#ffeeee",
      colorBgElevated: "#fffafa",
      colorBorder: "#fcd5d5",
      colorBorderSecondary: "#f8c8c8",
      borderRadius: 8,
    },
  },
  {
    key: "matcha",
    label: "theme_matcha",
    color: "#7bc49a",
    isDark: false,
    antdToken: {
      colorPrimary: "#7bc49a",
      colorBgContainer: "#f2faf4",
      colorBgLayout: "#e8f5ec",
      colorBgElevated: "#f6fcf8",
      colorBorder: "#c8e8d0",
      colorBorderSecondary: "#b8e0c4",
      borderRadius: 8,
    },
  },
  {
    key: "peach",
    label: "theme_peach",
    color: "#f59d8a",
    isDark: false,
    antdToken: {
      colorPrimary: "#f59d8a",
      colorBgContainer: "#fff5f0",
      colorBgLayout: "#ffede5",
      colorBgElevated: "#fffaf5",
      colorBorder: "#fcd5b5",
      colorBorderSecondary: "#f8c8a8",
      borderRadius: 8,
    },
  },
  {
    key: "cream-cat",
    label: "theme_cream_cat",
    color: "#d4a373",
    isDark: false,
    antdToken: {
      colorPrimary: "#d4a373",
      colorBgContainer: "#fefae0",
      colorBgLayout: "#faf3d4",
      colorBgElevated: "#fffdf0",
      colorBorder: "#e8d4a8",
      colorBorderSecondary: "#dec898",
      borderRadius: 8,
    },
  },
  {
    key: "lavender",
    label: "theme_lavender",
    color: "#b39ddb",
    isDark: false,
    antdToken: {
      colorPrimary: "#b39ddb",
      colorBgContainer: "#f8f5ff",
      colorBgLayout: "#f0ebff",
      colorBgElevated: "#fcfaff",
      colorBorder: "#d5c8e8",
      colorBorderSecondary: "#c8b8e0",
      borderRadius: 8,
    },
  },
];

export const DEFAULT_THEME: Theme = "clear-sky";

export function getThemeConfig(theme: Theme): ThemeConfig {
  return THEME_CONFIGS.find((t) => t.key === theme) ?? THEME_CONFIGS[0];
}
