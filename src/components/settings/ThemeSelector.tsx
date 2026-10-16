import { THEMES } from "../../core/settings";
import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";

/** Radio group for choosing the theme: system, light, dark or a fun theme (FR-THEME-1, P7). */
export function ThemeSelector() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();

  return (
    <fieldset className="theme-selector">
      <legend>{t("settings.theme.heading")}</legend>
      {THEMES.map((theme) => (
        <label key={theme} className="check-field">
          <input
            type="radio"
            name="theme"
            value={theme}
            checked={settings.theme === theme}
            onChange={() => {
              updateSettings({ theme });
            }}
          />
          {t(`settings.theme.${theme}`)}
        </label>
      ))}
    </fieldset>
  );
}
