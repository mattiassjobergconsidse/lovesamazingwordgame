import type { Settings } from "../src/types";

/**
 * Builds a complete settings record for tests.
 *
 * @param overrides Fields to change from the English-language defaults.
 */
export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    uiLanguage: "en",
    theme: "system",
    activeSetId: null,
    directionMode: "random",
    sessionSize: 20,
    ignoreAccents: false,
    speechEnabled: false,
    ...overrides,
  };
}

/** Deletes the app database so each test starts from a clean slate. */
export function deleteAppDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("lovesamazingwordgame");
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error("deleteDatabase failed"));
    };
  });
}
