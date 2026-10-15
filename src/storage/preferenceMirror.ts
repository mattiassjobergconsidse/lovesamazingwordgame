import { isTheme, isUiLanguage } from "../core/settings";
import type { Settings } from "../types";

/** Keys shared with the inline script in `index.html`; keep both in sync. */
export const THEME_MIRROR_KEY = "lovesamazingwordgame.theme";
export const LANGUAGE_MIRROR_KEY = "lovesamazingwordgame.uiLanguage";

/** The settings mirrored to localStorage so the page can paint correctly before IndexedDB loads. */
export type PreferenceMirror = Partial<Pick<Settings, "theme" | "uiLanguage">>;

/**
 * Returns `localStorage`, or `null` where access is denied (e.g. blocked cookies).
 */
export function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Browsers throw a SecurityError when storage is blocked; the mirror is optional.
    return null;
  }
}

/**
 * Reads the mirrored preferences, ignoring missing or invalid values.
 *
 * @param storage Storage to read from.
 */
export function readPreferenceMirror(
  storage: Storage | null = getLocalStorage(),
): PreferenceMirror {
  if (storage === null) {
    return {};
  }
  const theme = storage.getItem(THEME_MIRROR_KEY);
  const uiLanguage = storage.getItem(LANGUAGE_MIRROR_KEY);
  return {
    ...(isTheme(theme) ? { theme } : {}),
    ...(isUiLanguage(uiLanguage) ? { uiLanguage } : {}),
  };
}

/**
 * Writes theme and language to the mirror.
 *
 * @param settings Source of the values.
 * @param storage Storage to write to.
 * @returns `false` if the mirror could not be written (quota, blocked storage).
 */
export function writePreferenceMirror(
  settings: Pick<Settings, "theme" | "uiLanguage">,
  storage: Storage | null = getLocalStorage(),
): boolean {
  if (storage === null) {
    return false;
  }
  try {
    storage.setItem(THEME_MIRROR_KEY, settings.theme);
    storage.setItem(LANGUAGE_MIRROR_KEY, settings.uiLanguage);
    return true;
  } catch {
    // IndexedDB stays the source of truth, so a failed mirror only risks a theme flash.
    return false;
  }
}
