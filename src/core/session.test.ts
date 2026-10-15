import { describe, expect, it } from "vitest";
import { makePair, makeProgress, makeRng } from "../../tests/factories";
import type { WordPair, WordProgress } from "../types";
import {
  answerCard,
  buildSessionQueue,
  currentCard,
  isExtraPractice,
  isFinished,
  mistakePairs,
  sessionProgress,
  sessionScore,
  startSession,
} from "./session";

const NOW = 1_000_000;

function progressMap(...records: WordProgress[]): Map<string, WordProgress> {
  return new Map(records.map((record) => [record.pairId, record]));
}

function ids(pairs: readonly WordPair[]): string[] {
  return pairs.map((pair) => pair.id);
}

describe("buildSessionQueue", () => {
  it("FR-TRN-2: orders due (oldest first), then new, then lowest box", () => {
    const dueOld = makePair();
    const dueNew = makePair();
    const fresh = makePair();
    const lowBox = makePair();
    const highBox = makePair();
    const progress = progressMap(
      makeProgress({ pairId: dueNew.id, box: 2, dueAt: NOW - 10 }),
      makeProgress({ pairId: dueOld.id, box: 4, dueAt: NOW - 1000 }),
      makeProgress({ pairId: highBox.id, box: 5, dueAt: NOW + 5000 }),
      makeProgress({ pairId: lowBox.id, box: 1, dueAt: NOW + 5000 }),
    );

    const queue = buildSessionQueue(
      [highBox, lowBox, fresh, dueNew, dueOld],
      progress,
      { size: "all", now: NOW, rng: makeRng(1) },
    );

    expect(ids(queue)).toEqual(ids([dueOld, dueNew, fresh, lowBox, highBox]));
  });

  it("treats a box 0 record like a new word", () => {
    const fresh = makePair();
    const due = makePair();
    const progress = progressMap(
      makeProgress({ pairId: fresh.id, box: 0 }),
      makeProgress({ pairId: due.id, box: 2, dueAt: NOW - 1 }),
    );
    const queue = buildSessionQueue([fresh, due], progress, {
      size: "all",
      now: NOW,
      rng: makeRng(1),
    });
    expect(ids(queue)).toEqual(ids([due, fresh]));
  });

  it("FR-TRN-2: limits the queue to the session size", () => {
    const pairs = Array.from({ length: 30 }, () => makePair());
    const queue = buildSessionQueue(pairs, new Map(), {
      size: 10,
      now: NOW,
      rng: makeRng(3),
    });
    expect(queue).toHaveLength(10);
  });

  it("returns every word when the session size exceeds the set", () => {
    const pairs = [makePair(), makePair()];
    const queue = buildSessionQueue(pairs, new Map(), {
      size: 50,
      now: NOW,
      rng: makeRng(3),
    });
    expect(ids(queue).sort()).toEqual(ids(pairs).sort());
  });

  it("returns an empty queue for an empty set or non-positive size", () => {
    const options = { size: 20 as const, now: NOW, rng: makeRng(1) };
    expect(buildSessionQueue([], new Map(), options)).toEqual([]);
    expect(
      buildSessionQueue([makePair()], new Map(), { ...options, size: 0 }),
    ).toEqual([]);
  });

  it("is deterministic with a seeded rng and varies with the seed", () => {
    const pairs = Array.from({ length: 15 }, () => makePair());
    const build = (seed: number): string[] =>
      ids(
        buildSessionQueue(pairs, new Map(), {
          size: "all",
          now: NOW,
          rng: makeRng(seed),
        }),
      );
    expect(build(5)).toEqual(build(5));
    expect(build(5)).not.toEqual(build(6));
  });

  it("FR-TRN-2: breaks ties randomly", () => {
    const pairs = Array.from({ length: 12 }, () => makePair());
    const progress = progressMap(
      ...pairs.map((pair) =>
        makeProgress({ pairId: pair.id, box: 2, dueAt: NOW - 1 }),
      ),
    );
    const build = (seed: number): string[] =>
      ids(
        buildSessionQueue(pairs, progress, {
          size: "all",
          now: NOW,
          rng: makeRng(seed),
        }),
      );
    expect(build(1)).not.toEqual(build(2));
  });
});

describe("isExtraPractice", () => {
  it("FR-TRN-9: is true when all words are seen and not due", () => {
    const pair = makePair();
    const progress = progressMap(
      makeProgress({ pairId: pair.id, box: 3, dueAt: NOW + 1 }),
    );
    expect(isExtraPractice([pair], progress, NOW)).toBe(true);
  });

  it("is false with due words, new words or an empty set", () => {
    const seen = makePair();
    const fresh = makePair();
    const progress = progressMap(
      makeProgress({ pairId: seen.id, box: 3, dueAt: NOW }),
    );
    expect(isExtraPractice([seen], progress, NOW)).toBe(false);
    expect(
      isExtraPractice(
        [fresh],
        progressMap(makeProgress({ pairId: fresh.id, box: 0 })),
        NOW,
      ),
    ).toBe(false);
    expect(isExtraPractice([fresh], new Map(), NOW)).toBe(false);
    expect(isExtraPractice([], new Map(), NOW)).toBe(false);
  });
});

describe("session state", () => {
  const [first, second, third] = [makePair(), makePair(), makePair()];
  const pairs = [first, second, third];

  it("starts at the first card with nothing answered", () => {
    const state = startSession(pairs);
    expect(currentCard(state)).toEqual({ pair: first, isRepeat: false });
    expect(sessionProgress(state)).toEqual({ answered: 0, total: 3 });
    expect(isFinished(state)).toBe(false);
  });

  it("FR-TRN-8: tracks answered words against the total", () => {
    const state = answerCard(startSession(pairs), "correct");
    expect(sessionProgress(state)).toEqual({ answered: 1, total: 3 });
    expect(currentCard(state)?.pair).toBe(second);
  });

  it("FR-TRN-7: re-queues a wrong answer once at the end", () => {
    let state = startSession(pairs);
    state = answerCard(state, "wrong");
    state = answerCard(state, "correct");
    state = answerCard(state, "correct");
    expect(currentCard(state)).toEqual({ pair: first, isRepeat: true });
    expect(isFinished(state)).toBe(false);

    state = answerCard(state, "wrong");
    expect(isFinished(state)).toBe(true);
    expect(state.queue).toHaveLength(4);
  });

  it("FR-TRN-4: a repeat never changes the first result or the progress count", () => {
    let state = startSession([first]);
    state = answerCard(state, "wrong");
    state = answerCard(state, "correct");
    expect(state.firstResults.get(first.id)).toBe("wrong");
    expect(sessionProgress(state)).toEqual({ answered: 1, total: 1 });
  });

  it("does not re-queue assisted answers", () => {
    const state = answerCard(startSession([first]), "assisted");
    expect(isFinished(state)).toBe(true);
    expect(state.queue).toHaveLength(1);
  });

  it("ignores answers once finished", () => {
    const done = answerCard(startSession([first]), "correct");
    expect(answerCard(done, "wrong")).toBe(done);
    expect(currentCard(done)).toBeNull();
  });

  it("does not mutate the previous state", () => {
    const start = startSession(pairs);
    answerCard(start, "wrong");
    expect(start.position).toBe(0);
    expect(start.firstResults.size).toBe(0);
    expect(start.queue).toHaveLength(3);
  });

  it("FR-TRN-5: scores first answers and lists mistakes", () => {
    let state = startSession(pairs);
    state = answerCard(state, "wrong");
    state = answerCard(state, "assisted");
    state = answerCard(state, "correct");
    state = answerCard(state, "correct");
    expect(sessionScore(state)).toEqual({ correct: 1, wrong: 1, assisted: 1 });
    expect(mistakePairs(state)).toEqual([first]);
  });

  it("handles an empty session", () => {
    const state = startSession([]);
    expect(isFinished(state)).toBe(true);
    expect(currentCard(state)).toBeNull();
    expect(mistakePairs(state)).toEqual([]);
  });
});
