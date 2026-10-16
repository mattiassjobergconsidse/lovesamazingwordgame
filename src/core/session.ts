import type { AnswerResult, WordPair, WordProgress } from "../types";
import { shuffle, type Rng } from "./shuffle";

/** Options for {@link buildSessionQueue}. */
export interface SessionQueueOptions {
  readonly size: number | "all";
  readonly now: number;
  readonly rng: Rng;
}

/** Stable sort by a numeric key; callers shuffle first so ties end up in random order. */
function sortedBy<T>(items: readonly T[], key: (item: T) => number): T[] {
  return [...items].sort((left, right) => key(left) - key(right));
}

/**
 * Chooses and orders the words of one session (FR-TRN-1, FR-TRN-2, FR-TRN-9).
 *
 * Order: due words (oldest due first), then new words (random order), then the
 * not-yet-due words with the lowest box. Ties are broken randomly.
 *
 * @param pairs All pairs of the active set.
 * @param progress Progress by pair ID; pairs without a record count as new.
 * @param options Session size, current time and random source.
 */
export function buildSessionQueue(
  pairs: readonly WordPair[],
  progress: ReadonlyMap<string, WordProgress>,
  options: SessionQueueOptions,
): WordPair[] {
  const due: { pair: WordPair; record: WordProgress }[] = [];
  const fresh: WordPair[] = [];
  const rest: { pair: WordPair; record: WordProgress }[] = [];

  for (const pair of shuffle(pairs, options.rng)) {
    const record = progress.get(pair.id);
    if (record === undefined || record.box === 0) {
      fresh.push(pair);
    } else if (record.dueAt <= options.now) {
      due.push({ pair, record });
    } else {
      rest.push({ pair, record });
    }
  }

  const ordered = [
    ...sortedBy(due, ({ record }) => record.dueAt).map(({ pair }) => pair),
    ...fresh,
    ...sortedBy(rest, ({ record }) => record.box).map(({ pair }) => pair),
  ];
  return options.size === "all"
    ? ordered
    : ordered.slice(0, Math.max(0, options.size));
}

/**
 * Whether a session would only contain "practise anyway" words (FR-TRN-9).
 *
 * @returns True when the set has words but none is due or new.
 */
export function isExtraPractice(
  pairs: readonly WordPair[],
  progress: ReadonlyMap<string, WordProgress>,
  now: number,
): boolean {
  return (
    pairs.length > 0 &&
    pairs.every((pair) => {
      const record = progress.get(pair.id);
      return record !== undefined && record.box > 0 && record.dueAt > now;
    })
  );
}

/** One card in a session; repeats are the re-queued wrong answers (FR-TRN-7). */
export interface SessionCard {
  readonly pair: WordPair;
  readonly isRepeat: boolean;
}

/** Immutable state of a running session. */
export interface SessionState {
  readonly queue: readonly SessionCard[];
  readonly position: number;
  /** Number of distinct words in the session (repeats not counted). */
  readonly total: number;
  /** First answer per pair ID; only these change progress (FR-TRN-4). */
  readonly firstResults: ReadonlyMap<string, AnswerResult>;
}

/** Starts a session that presents `pairs` in the given order. */
export function startSession(pairs: readonly WordPair[]): SessionState {
  return {
    queue: pairs.map((pair) => ({ pair, isRepeat: false })),
    position: 0,
    total: pairs.length,
    firstResults: new Map(),
  };
}

/** The card to show now, or `null` when the session is finished. */
export function currentCard(state: SessionState): SessionCard | null {
  return state.queue[state.position] ?? null;
}

/** Whether every card, including re-queued ones, has been answered. */
export function isFinished(state: SessionState): boolean {
  return state.position >= state.queue.length;
}

/**
 * Records the answer to the current card and advances.
 *
 * A wrong first answer re-queues the word once at the end. Repeats never replace
 * the first result, so callers update progress only when `currentCard(state).isRepeat` is false.
 *
 * @returns The next state; the same state when the session is already finished.
 */
export function answerCard(
  state: SessionState,
  result: AnswerResult,
): SessionState {
  const card = currentCard(state);
  if (card === null) {
    return state;
  }
  if (card.isRepeat) {
    return { ...state, position: state.position + 1 };
  }
  return {
    ...state,
    queue:
      result === "wrong"
        ? [...state.queue, { pair: card.pair, isRepeat: true }]
        : state.queue,
    position: state.position + 1,
    firstResults: new Map(state.firstResults).set(card.pair.id, result),
  };
}

/** Number of words answered for the first time and the session total ("7 / 20", FR-TRN-8). */
export function sessionProgress(state: SessionState): {
  readonly answered: number;
  readonly total: number;
} {
  return { answered: state.firstResults.size, total: state.total };
}

/** Counts of first answers by result, for the end screen (FR-TRN-5). */
export function sessionScore(
  state: SessionState,
): Readonly<Record<AnswerResult, number>> {
  const score = { correct: 0, wrong: 0, assisted: 0 };
  for (const result of state.firstResults.values()) {
    score[result] += 1;
  }
  return score;
}

/** Pairs answered wrongly on their first attempt, in session order ("Practise mistakes"). */
export function mistakePairs(state: SessionState): WordPair[] {
  return state.queue
    .filter(
      (card) =>
        !card.isRepeat && state.firstResults.get(card.pair.id) === "wrong",
    )
    .map((card) => card.pair);
} /** A card answered as part of a batch, with its result. */
export interface AnsweredCard {
  readonly card: SessionCard;
  readonly result: AnswerResult;
}
/**
 * Answers several consecutive cards at once, for modes where one screen covers
 * a whole round of words (Matching, FR-MT-3).
 *
 * Starting at the current card, every card whose pair has a result is answered in
 * queue order; the batch stops at the first card without one. Wrong results are NOT
 * re-queued: the user already had to find the right match before the round ended.
 *
 * @param state The running session.
 * @param results Result per pair ID.
 * @returns The next state and the cards that were answered, in order.
 */
export function answerRound(
  state: SessionState,
  results: ReadonlyMap<string, AnswerResult>,
): { readonly state: SessionState; readonly answered: AnsweredCard[] } {
  const answered: AnsweredCard[] = [];
  const firstResults = new Map(state.firstResults);
  let position = state.position;
  for (;;) {
    const card = state.queue[position];
    const result = card === undefined ? undefined : results.get(card.pair.id);
    if (card === undefined || result === undefined) {
      break;
    }
    answered.push({ card, result });
    if (!card.isRepeat) {
      firstResults.set(card.pair.id, result);
    }
    position += 1;
  }
  return { state: { ...state, position, firstResults }, answered };
}
