import { useMemo } from "react";
import type { WordSet } from "../types";
import { useLibrary } from "./useLibrary";
import { useSettings } from "./useSettings";

/** The active set and how to change it (FR-ACT-1, FR-ACT-2). */
export interface ActiveSet {
  /** `null` while none is chosen, or when the stored id no longer exists. */
  readonly activeSet: WordSet | null;
  readonly wordCount: number;
  /** False until sets and settings are loaded; avoids prompting for a set too early. */
  readonly ready: boolean;
  readonly setActiveSetId: (id: string | null) => void;
}

/**
 * Resolves `Settings.activeSetId` against the loaded sets.
 *
 * @throws If used outside the settings and library providers.
 */
export function useActiveSet(): ActiveSet {
  const { settings, ready: settingsReady, updateSettings } = useSettings();
  const { sets, pairs, status } = useLibrary();

  return useMemo(() => {
    const activeSet =
      sets.find((candidate) => candidate.id === settings.activeSetId) ?? null;
    return {
      activeSet,
      wordCount:
        activeSet === null
          ? 0
          : pairs.filter((pair) => pair.setId === activeSet.id).length,
      ready: settingsReady && status === "ready",
      setActiveSetId: (id: string | null) => {
        updateSettings({ activeSetId: id });
      },
    };
  }, [
    sets,
    pairs,
    settings.activeSetId,
    settingsReady,
    status,
    updateSettings,
  ]);
}
