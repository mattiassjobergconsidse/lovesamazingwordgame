/** Random number source returning a float in [0, 1), like `Math.random`. */
export type Rng = () => number;

/**
 * Swaps two elements without index reads that `noUncheckedIndexedAccess` would widen to `T | undefined`:
 * `splice` always returns `T[]`, so no type assertion is needed.
 */
function swap(list: unknown[], first: number, second: number): void {
  list.splice(
    first,
    1,
    ...list.splice(second, 1, ...list.slice(first, first + 1)),
  );
}

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
    swap(result, i, Math.floor(rng() * (i + 1)));
  }
  return result;
}
