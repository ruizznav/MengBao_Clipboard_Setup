import type { Locale as AntdLocale } from "antd/es/locale";
import antdEnUS from "antd/locale/en_US";
import antdJaJP from "antd/locale/ja_JP";
import antdZhCN from "antd/locale/zh_CN";
import antdZhTW from "antd/locale/zh_TW";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGE } from "@/constants";
import type { Language } from "@/types/store";
import enUS from "./en-US.json";
import jaJP from "./ja-JP.json";
import zhCN from "./zh-CN.json";
import zhTW from "./zh-TW.json";

i18n.use(initReactI18next).init({
  debug: false,
  fallbackLng: LANGUAGE.ZH_CN,
  interpolation: {
    escapeValue: false,
  },
  lng: LANGUAGE.ZH_CN,
  resources: {
    [LANGUAGE.ZH_CN]: {
      translation: zhCN,
    },
    [LANGUAGE.ZH_TW]: {
      translation: zhTW,
    },
    [LANGUAGE.EN_US]: {
      translation: enUS,
    },
    [LANGUAGE.JA_JP]: {
      translation: jaJP,
    },
  },
});

// 全局防御：monkey-patch t() 函数，防止任何翻译调用因插值异常导致整棵 React 树崩溃
const originalT = i18n.t.bind(i18n);
(i18n as any).t = function (key: string, options?: any): string {
  try {
    const result = originalT(key, options);
    // 如果返回 undefined/null（key 不存在或插值失败），回退到 key 本身
    if (result == null) return String(key);
    return result;
  } catch {
    // 翻译调用任何异常都安全降级
    return String(key);
  }
};

export { i18n };

export const getAntdLocale = (language: Language = LANGUAGE.ZH_CN) => {
  const antdLanguage: Record<Language, AntdLocale> = {
    [LANGUAGE.ZH_CN]: antdZhCN,
    [LANGUAGE.ZH_TW]: antdZhTW,
    [LANGUAGE.EN_US]: antdEnUS,
    [LANGUAGE.JA_JP]: antdJaJP,
  };

  return antdLanguage[language];
};
