import { useSyncExternalStore } from "react";
import { resolveTheme } from "../core/settings";
import type { Theme } from "../types";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * Resolves a theme choice to `light` or `dark`, reacting live to OS changes in system mode (FR-THEME-1).
 *
 * @param theme The user's choice.
 */
export function useResolvedTheme(theme: Theme): "light" | "dark" {
  const systemPrefersDark = useSyncExternalStore(
    subscribe,
    getSystemPrefersDark,
  );
  return resolveTheme(theme, systemPrefersDark);
}
