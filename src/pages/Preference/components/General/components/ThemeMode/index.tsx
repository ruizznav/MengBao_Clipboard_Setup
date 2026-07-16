import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import ProListItem from "@/components/ProListItem";
import { THEME_CONFIGS } from "@/constants/theme";
import { globalStore } from "@/stores/global";

const DOT_SIZE = 28;
const DOT_GAP = 8;

const ThemeMode = () => {
  const { appearance } = useSnapshot(globalStore);
  const { t } = useTranslation();

  return (
    <ProListItem title={t("preference.settings.appearance_settings.label.theme")}>
      <div
        style={{
          display: "flex",
          gap: DOT_GAP,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {THEME_CONFIGS.map((theme) => {
          const isActive = appearance.theme === theme.key;

          return (
            <button
              key={theme.key}
              type="button"
              title={t(`preference.settings.appearance_settings.label.${theme.label}`)}
              onClick={() => {
                globalStore.appearance.theme = theme.key;
              }}
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: "50%",
                border: isActive ? `3px solid ${theme.color}` : "3px solid transparent",
                outline: isActive ? `2px solid ${theme.color}88` : "none",
                backgroundColor: theme.color,
                cursor: "pointer",
                padding: 0,
                position: "relative",
                transition: "all 0.2s ease",
                boxShadow: isActive
                  ? `0 0 8px ${theme.color}66`
                  : "0 1px 3px rgba(0,0,0,0.15)",
                flexShrink: 0,
              }}
            >
              {isActive && (
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 14,
                    height: 14,
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    fill="#fff"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </ProListItem>
  );
};

export default ThemeMode;
