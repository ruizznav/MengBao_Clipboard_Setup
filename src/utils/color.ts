import { theme } from "antd";
import { kebabCase } from "es-toolkit";
import { map } from "es-toolkit/compat";
import type { Theme } from "@/types/store";
import { getThemeConfig } from "@/constants/theme";

const { getDesignToken, defaultAlgorithm, darkAlgorithm } = theme;

let themeStyleElement: HTMLStyleElement | null = null;

/**
 * 根据主题生成 antd 的颜色 CSS 变量
 */
export const generateThemeVars = (activeTheme: Theme) => {
  const config = getThemeConfig(activeTheme);
  const algorithm = config.isDark ? darkAlgorithm : defaultAlgorithm;

  const tokens = getDesignToken({
    algorithm,
    token: config.antdToken,
  });

  const vars: Record<string, any> = {};

  for (const [key, value] of Object.entries(tokens)) {
    vars[`--ant-${kebabCase(key)}`] = value;
  }

  const values = map(vars, (value, key) => `${key}: ${value};`);

  // 移除之前的主题样式
  if (themeStyleElement) {
    themeStyleElement.remove();
  }

  const style = document.createElement("style");
  style.dataset.theme = activeTheme;
  style.innerHTML = `:root{\n${values.join("\n")}\n}`;

  document.head.appendChild(style);
  themeStyleElement = style;
};
