import type { Settings, WordPair, WordProgress, WordSet } from "../src/types";

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
    soundEnabled: false,
    hapticsEnabled: false,
    dailyGoal: 10,
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
let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${String(counter)}`;
}
/** Builds a word set with unique defaults; override what the test cares about. */
export function makeSet(overrides: Partial<WordSet> = {}): WordSet {
  return {
    id: nextId("set"),
    name: `Set ${String(counter)}`,
    langA: "Svenska",
    langB: "English",
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}
/** Builds a word pair with unique defaults; override what the test cares about. */
export function makePair(overrides: Partial<WordPair> = {}): WordPair {
  const id = nextId("pair");
  return {
    id,
    setId: "set-1",
    a: `ord ${id}`,
    b: `word ${id}`,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}
/** Builds a progress record for a pair. */
export function makeProgress(
  overrides: Partial<WordProgress> = {},
): WordProgress {
  return {
    pairId: "pair-1",
    setId: "set-1",
    box: 1,
    dueAt: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    streak: 0,
    ...overrides,
  };
}

/**
 * Deterministic random source (mulberry32) so shuffles are reproducible.
 *
 * @param seed Any integer; the same seed gives the same sequence.
 */
export function makeRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
