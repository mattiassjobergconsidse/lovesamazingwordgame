import { createContext } from "react";
import type { Settings } from "../types";

/** Why saving or loading failed, for a translated message. */
export type StorageErrorKind = "unavailable" | "blocked" | "failed";

/** Settings plus the means to change them. */
export interface SettingsStore {
  readonly settings: Settings;
  /** Latest storage problem, or `null` when storage works. */
  readonly storageError: StorageErrorKind | null;
  /** Applies a change immediately and persists it in the background. */
  readonly updateSettings: (patch: Partial<Settings>) => void;
}

export const SettingsContext = createContext<SettingsStore | null>(null);
