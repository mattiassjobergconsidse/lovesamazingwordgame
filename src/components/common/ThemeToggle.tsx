import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";

/** Header button that flips between light and dark (FR-THEME-1). Full selector lives in Settings. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const resolved = useResolvedTheme(settings.theme);
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="icon-button"
      aria-label={t(
        next === "light" ? "header.theme.toLight" : "header.theme.toDark",
      )}
      onClick={() => {
        updateSettings({ theme: next });
      }}
    >
      <span aria-hidden="true">{resolved === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
