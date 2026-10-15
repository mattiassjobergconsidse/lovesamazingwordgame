import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";

/** Header button that switches the UI language at runtime (FR-I18N-1). */
export function LanguageSwitch() {
  const { t, language } = useI18n();
  const { updateSettings } = useSettings();
  const next = language === "sv" ? "en" : "sv";

  return (
    <button
      type="button"
      className="icon-button"
      aria-label={t("header.switchLanguage")}
      onClick={() => {
        updateSettings({ uiLanguage: next });
      }}
    >
      {t("header.switchLanguage.target")}
    </button>
  );
}
