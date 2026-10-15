import type { WordPair } from "../types";

/** A term with optional alternatives accepted as correct answers (FR-SET-7). */
export interface Terms {
  readonly main: string;
  readonly alternatives: readonly string[];
}

/**
 * Parses user input such as `big; large` into a main term and alternatives.
 *
 * @param text Raw text; values are separated by `;`, trimmed, and empty values dropped.
 * @returns The terms; `main` is empty when the input holds no term.
 */
export function parseTerms(text: string): Terms {
  const [main = "", ...alternatives] = text
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  return { main, alternatives };
}

/** Inverse of {@link parseTerms}: joins the main term and alternatives with `; `. */
export function formatTerms(
  main: string,
  alternatives: readonly string[] | undefined,
): string {
  return [main, ...(alternatives ?? [])].join("; ");
}

function pairKey(pair: Pick<WordPair, "a" | "b">): string {
  return `${pair.a.trim().toLowerCase()}\u0000${pair.b.trim().toLowerCase()}`;
}

/**
 * Finds pairs that repeat an earlier pair with the same `a` and `b` (FR-SET-6).
 *
 * @param pairs Pairs of one set in display order.
 * @returns IDs of the later occurrences; the first occurrence is never reported.
 */
export function findDuplicatePairIds(
  pairs: readonly Pick<WordPair, "id" | "a" | "b">[],
): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const pair of pairs) {
    const key = pairKey(pair);
    if (seen.has(key)) {
      duplicates.add(pair.id);
    } else {
      seen.add(key);
    }
  }
  return duplicates;
}
