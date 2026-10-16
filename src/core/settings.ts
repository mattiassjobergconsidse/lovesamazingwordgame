import type { ResolvedTheme, Settings, Theme, UiLanguage } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every selectable theme in display order. Keep in sync with the inline script in `index.html`. */
export const THEMES = [
  "system",
  "light",
  "dark",
  "christmas",
  "halloween",
  "blocks",
  "battle",
  "ocean",
  "sunset",
] as const satisfies readonly Theme[];

/** Type guard for {@link Theme}. */
export function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/**
 * Tells whether a theme uses a dark colour scheme, so the header toggle knows which way to flip.
 *
 * @param theme A resolved theme.
 */
export function isDarkTheme(theme: ResolvedTheme): boolean {
  return theme !== "light" && theme !== "christmas" && theme !== "ocean";
}

/** Type guard for {@link UiLanguage}. */
export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === "sv" || value === "en";
}

/**
 * Chooses the UI language for a first visit (FR-I18N-1).
 *
 * @param browserLanguages BCP-47 tags in order of preference, e.g. `navigator.languages`.
 * @returns The primary browser language if it is `sv` or `en`, otherwise `sv`.
 */
export function pickUiLanguage(
  browserLanguages: readonly string[],
): UiLanguage {
  const primary = browserLanguages[0]?.toLowerCase().split("-")[0];
  return isUiLanguage(primary) ? primary : "sv";
}

/**
 * Builds the settings used before the user changes anything.
 *
 * @param browserLanguages BCP-47 tags in order of preference.
 */
export function createDefaultSettings(
  browserLanguages: readonly string[],
): Settings {
  return {
    uiLanguage: pickUiLanguage(browserLanguages),
    theme: "system",
    activeSetId: null,
    directionMode: "random",
    sessionSize: 20,
    ignoreAccents: false,
    speechEnabled: false,
  };
}

/**
 * Strictly validates a value read from storage.
 *
 * @param value Untrusted data.
 * @returns The settings, or `null` if the value is not a complete, valid settings record.
 */
export function parseSettings(value: unknown): Settings | null {
  if (!isRecord(value)) {
    return null;
  }
  const {
    uiLanguage,
    theme,
    activeSetId,
    directionMode,
    sessionSize,
    ignoreAccents,
    speechEnabled,
  } = value;
  if (
    !isUiLanguage(uiLanguage) ||
    !isTheme(theme) ||
    (activeSetId !== null && typeof activeSetId !== "string") ||
    (directionMode !== "random" &&
      directionMode !== "AtoB" &&
      directionMode !== "BtoA") ||
    (sessionSize !== 10 &&
      sessionSize !== 20 &&
      sessionSize !== 50 &&
      sessionSize !== "all") ||
    typeof ignoreAccents !== "boolean" ||
    typeof speechEnabled !== "boolean"
  ) {
    return null;
  }
  return {
    uiLanguage,
    theme,
    activeSetId,
    directionMode,
    sessionSize,
    ignoreAccents,
    speechEnabled,
  };
}

/**
 * Resolves the user's theme choice to a concrete theme.
 *
 * @param theme The stored choice.
 * @param systemPrefersDark Whether the OS prefers a dark colour scheme.
 */
export function resolveTheme(
  theme: Theme,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (theme === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return theme;
}
