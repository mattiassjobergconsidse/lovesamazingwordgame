import type { Settings, WordPair, WordSet } from "../types";
import exampleData from "../data/example-sv-en.json";
import { SETTINGS_KEY, type WordGameDatabase } from "./db";
import { runTransaction } from "./transaction";
interface ExampleData {
  readonly name: string;
  readonly langA: string;
  readonly langB: string;
  readonly pairs: readonly {
    readonly a: string;
    readonly b: string;
    readonly altA?: readonly string[];
    readonly altB?: readonly string[];
  }[];
}
/** Injected time and id source so seeding is testable. */
export interface SeedEnvironment {
  readonly now: number;
  readonly newId: () => string;
}
/**
 * Creates the bundled example set on the very first visit and makes it active.
 *
 * A first visit is a database without a settings record and without sets; users
 * who later delete every set are therefore not given the example again.
 * Runs in one transaction so a failure leaves the database untouched.
 *
 * @param db Open database.
 * @param initialSettings Settings to store for the first visit (without an active set).
 * @param env Current time and id generator.
 * @returns `true` if the example set was created.
 */
export async function seedFirstVisit(
  db: WordGameDatabase,
  initialSettings: Settings,
  env: SeedEnvironment,
): Promise<boolean> {
  const tx = db.transaction(["settings", "sets", "pairs"], "readwrite");
  return await runTransaction(tx, async (track) => {
    const [existingSettings, setCount] = await Promise.all([
      track(tx.objectStore("settings").get(SETTINGS_KEY)),
      track(tx.objectStore("sets").count()),
    ]);
    if (existingSettings !== undefined || setCount > 0) {
      return false;
    }
    const example: ExampleData = exampleData;
    const set: WordSet = {
      id: env.newId(),
      name: example.name,
      langA: example.langA,
      langB: example.langB,
      createdAt: env.now,
      updatedAt: env.now,
    };
    // Offsetting createdAt by the index keeps the display order (pairs are sorted by it).
    const pairs = example.pairs.map((pair, index): WordPair => ({
      id: env.newId(),
      setId: set.id,
      a: pair.a,
      b: pair.b,
      ...(pair.altA === undefined ? {} : { altA: pair.altA }),
      ...(pair.altB === undefined ? {} : { altB: pair.altB }),
      createdAt: env.now + index,
      updatedAt: env.now,
    }));
    await Promise.all([
      track(tx.objectStore("sets").add(set)),
      ...pairs.map((pair) => track(tx.objectStore("pairs").add(pair))),
      track(
        tx
          .objectStore("settings")
          .put({ ...initialSettings, activeSetId: set.id }, SETTINGS_KEY),
      ),
    ]);
    return true;
  });
}
