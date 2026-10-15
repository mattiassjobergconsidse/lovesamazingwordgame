import { openAppDb } from "../src/storage/db";
import { saveSettings } from "../src/storage/settingsRepo";
import { loadLibrary } from "../src/storage/setsRepo";
import type { Settings, WordPair, WordProgress, WordSet } from "../src/types";
import { makePair, makeSet, makeSettings } from "./factories";

/** Data to put into IndexedDB before the app starts. */
export interface StoredData {
  readonly sets?: readonly WordSet[];
  readonly pairs?: readonly WordPair[];
  readonly progress?: readonly WordProgress[];
  readonly settings?: Settings;
}

/**
 * Writes data before the app starts. Stored settings mean "not a first visit",
 * so the example set is not seeded.
 */
export async function seedDatabase(data: StoredData): Promise<void> {
  const db = await openAppDb();
  await saveSettings(db, data.settings ?? makeSettings());
  for (const set of data.sets ?? []) {
    await db.put("sets", set);
  }
  for (const pair of data.pairs ?? []) {
    await db.put("pairs", pair);
  }
  for (const record of data.progress ?? []) {
    await db.put("progress", record);
  }
  db.close();
}

/** Reads all sets, pairs and progress straight from IndexedDB. */
export async function readLibrary() {
  const db = await openAppDb();
  try {
    return await loadLibrary(db);
  } finally {
    db.close();
  }
}

/** Builds a set with pairs in the given order from `[a, b]` tuples. */
export function setWithPairs(
  name: string,
  terms: readonly (readonly [string, string])[],
) {
  const set = makeSet({ name, createdAt: 1000 });
  const pairs = terms.map(([a, b], index) =>
    makePair({ setId: set.id, a, b, createdAt: 1000 + index }),
  );
  return { set, pairs };
}
