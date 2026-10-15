import { createContext } from "react";
import type { Settings } from "../types";

/** Settings plus the means to change them. */
export interface SettingsStore {
  readonly settings: Settings;
  /** True once the stored settings have been applied (or storage is unavailable). */
  readonly ready: boolean;
  /** Applies a change immediately and persists it in the background. */
  readonly updateSettings: (patch: Partial<Settings>) => void;
}

export const SettingsContext = createContext<SettingsStore | null>(null);
