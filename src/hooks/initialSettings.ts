import { createDefaultSettings } from "../core/settings";
import { readPreferenceMirror } from "../storage/preferenceMirror";
import type { Settings } from "../types";

/**
 * Settings for a first visit: browser-language defaults overlaid with the
 * localStorage mirror, so the first paint already matches the stored choice.
 */
export function createInitialSettings(): Settings {
  return {
    ...createDefaultSettings(navigator.languages),
    ...readPreferenceMirror(),
  };
}
