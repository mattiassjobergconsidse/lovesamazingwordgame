import { useEffect } from "react";
import type { Settings } from "../types";
import { useResolvedTheme } from "./useResolvedTheme";

/**
 * Reflects theme and UI language on the `<html>` element (FR-THEME-1, FR-LANG-3).
 *
 * @param settings Settings to apply.
 */
export function useDocumentPreferences(
  settings: Pick<Settings, "theme" | "uiLanguage">,
): void {
  const resolvedTheme = useResolvedTheme(settings.theme);
  const { uiLanguage } = settings;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.lang = uiLanguage;
  }, [resolvedTheme, uiLanguage]);
}
