import type { WordPair } from "../types";

function fold(text: string): string {
  return text.normalize("NFC").toLowerCase();
}

/**
 * Filters pairs by a search query (FR-SET-9). Matches the main terms and the
 * alternatives of both languages, case-insensitively. Accents are significant.
 *
 * @param pairs Pairs to search.
 * @param query Text typed by the user; blank returns all pairs.
 * @returns The matching pairs in their original order.
 */
export function filterPairs(
  pairs: readonly WordPair[],
  query: string,
): readonly WordPair[] {
  const needle = fold(query.trim());
  if (needle === "") {
    return pairs;
  }
  return pairs.filter((pair) =>
    [pair.a, pair.b, ...(pair.altA ?? []), ...(pair.altB ?? [])].some((term) =>
      fold(term).includes(needle),
    ),
  );
}
