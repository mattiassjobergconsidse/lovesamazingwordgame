import type { AnswerResult } from "../types";

/**
 * Normalises text for comparison (FR-WR-2): NFC, trimmed, collapsed whitespace, lower case,
 * surrounding punctuation removed.
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .toLowerCase()
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
}

/** Like {@link normalizeAnswer} but also removes accents/diacritics (`ä` becomes `a`). */
export function foldAccents(text: string): string {
  return normalizeAnswer(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .normalize("NFC");
}

/** Outcome of checking a typed answer. */
export interface AnswerCheck {
  readonly result: AnswerResult;
  /** The accepted answer that matched, or the most similar one when the answer is wrong. */
  readonly closest: string;
}

/**
 * Checks a typed answer against all accepted answers (FR-WR-2).
 *
 * Exact (normalised) match is `correct`. An accent-only difference is `assisted`
 * ("almost"), or `correct` when `ignoreAccents` is on. Anything else is `wrong`.
 *
 * @param input What the user typed.
 * @param accepted Main answer followed by alternatives.
 * @param options `ignoreAccents` mirrors the setting of the same name.
 */
export function checkAnswer(
  input: string,
  accepted: readonly string[],
  options: { readonly ignoreAccents: boolean },
): AnswerCheck {
  const typed = normalizeAnswer(input);
  const fallback = accepted[0] ?? "";
  if (typed === "") {
    return { result: "wrong", closest: fallback };
  }

  const exact = accepted.find((answer) => normalizeAnswer(answer) === typed);
  if (exact !== undefined) {
    return { result: "correct", closest: exact };
  }

  const typedFolded = foldAccents(input);
  const accentOnly = accepted.find(
    (answer) => foldAccents(answer) === typedFolded,
  );
  if (accentOnly !== undefined) {
    return {
      result: options.ignoreAccents ? "correct" : "assisted",
      closest: accentOnly,
    };
  }

  return { result: "wrong", closest: findClosest(typed, accepted) };
}

function findClosest(typed: string, accepted: readonly string[]): string {
  const typedChars = Array.from(typed);
  let best = accepted[0] ?? "";
  let bestScore = -1;
  for (const answer of accepted) {
    const score = lcsTable(Array.from(normalizeAnswer(answer)), typedChars);
    const length = score[0]?.[0] ?? 0;
    if (length > bestScore) {
      best = answer;
      bestScore = length;
    }
  }
  return best;
}

/** A run of the expected answer, flagged by whether the user typed it correctly. */
export interface DiffSegment {
  readonly text: string;
  readonly matches: boolean;
}

/**
 * Marks which parts of the expected answer the user got right (FR-WR-3), using a
 * longest-common-subsequence comparison (case-insensitive, accents count as differences).
 *
 * @param typed What the user typed.
 * @param expected The correct answer to display.
 * @returns Consecutive segments of `expected`; joining their text gives `expected`.
 */
export function diffAnswer(typed: string, expected: string): DiffSegment[] {
  const expectedChars = Array.from(expected);
  const expectedKeys = expectedChars.map((char) => char.toLowerCase());
  const typedKeys = Array.from(typed.normalize("NFC")).map((char) =>
    char.toLowerCase(),
  );
  const table = lcsTable(expectedKeys, typedKeys);
  const cell = (i: number, j: number): number => table[i]?.[j] ?? 0;

  const segments: DiffSegment[] = [];
  const push = (char: string, matches: boolean): void => {
    const last = segments.at(-1);
    if (last?.matches === matches) {
      segments[segments.length - 1] = { text: last.text + char, matches };
    } else {
      segments.push({ text: char, matches });
    }
  };

  let i = 0;
  let j = 0;
  while (i < expectedChars.length) {
    const char = expectedChars[i] ?? "";
    if (j < typedKeys.length && expectedKeys[i] === typedKeys[j]) {
      push(char, true);
      i += 1;
      j += 1;
    } else if (j >= typedKeys.length || cell(i + 1, j) >= cell(i, j + 1)) {
      push(char, false);
      i += 1;
    } else {
      j += 1;
    }
  }
  return segments;
}

/** Suffix LCS table: `table[i][j]` is the LCS length of `x[i..]` and `y[j..]`. */
function lcsTable(x: readonly string[], y: readonly string[]): number[][] {
  const table = Array.from({ length: x.length + 1 }, () =>
    new Array<number>(y.length + 1).fill(0),
  );
  for (let i = x.length - 1; i >= 0; i -= 1) {
    const row = table[i];
    const below = table[i + 1];
    if (row === undefined || below === undefined) {
      continue;
    }
    for (let j = y.length - 1; j >= 0; j -= 1) {
      row[j] =
        x[i] === y[j]
          ? (below[j + 1] ?? 0) + 1
          : Math.max(below[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  return table;
}

/**
 * The first `count` letters of the answer, used by the hint button (FR-WR-4).
 *
 * @param answer The answer to reveal from.
 * @param count Number of letters revealed so far; clamped to the answer length.
 */
export function hintPrefix(answer: string, count: number): string {
  return Array.from(answer).slice(0, Math.max(0, count)).join("");
}
