/** Random number source returning a float in [0, 1), like `Math.random`. */
export type Rng = () => number;

/**
 * Returns a shuffled copy using the Fisher-Yates algorithm.
 *
 * @param items Items to shuffle; the input is never mutated.
 * @param rng Injected random source so results are reproducible in tests.
 * @returns A new array with the same items in random order.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    // Indices are in range, but noUncheckedIndexedAccess widens T to T | undefined.
    const atI = result[i] as T;
    result[i] = result[j] as T;
    result[j] = atI;
  }
  return result;
}
