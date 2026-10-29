import { describe, expect, it } from "vitest";
import { makePair } from "../../tests/factories";
import { answerCard, startSession } from "./session";
import {
  evaluateTrophies,
  isPerfectSession,
  mergeTrophies,
  type TrophyInput,
} from "./trophies";
import {
  isTrophyId,
  TROPHY_DEFINITIONS,
  type TrophyId,
} from "./trophyDefinitions";

const NOW = new Date(2026, 9, 29, 12).getTime();

function input(overrides: Partial<TrophyInput> = {}): TrophyInput {
  return {
    unlocked: new Set(),
    progress: [],
    activity: [],
    event: { mode: "flashcards", perfect: false },
    now: NOW,
    ...overrides,
  };
}

function days(...dates: string[]) {
  return dates.map((date) => ({ date, answered: 1, correct: 1 }));
}

describe("trophy definitions", () => {
  it("NH-10: ids are unique and recognised by isTrophyId", () => {
    const ids = TROPHY_DEFINITIONS.map((definition) => definition.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => isTrophyId(id))).toBe(true);
    expect(isTrophyId("fromTheFuture")).toBe(false);
  });
});

describe("evaluateTrophies", () => {
  it("NH-10: the first session unlocks the first-session trophy and its mode trophy", () => {
    const result = evaluateTrophies(input());

    expect(result).toEqual(["firstSession", "modeFlashcards"]);
  });

  it("NH-10: never reports a trophy that is already unlocked", () => {
    const unlocked = new Set<TrophyId>(["firstSession", "modeFlashcards"]);

    expect(evaluateTrophies(input({ unlocked }))).toEqual([]);
  });

  it("NH-10: each mode has its own trophy", () => {
    const modes = [
      ["flashcards", "modeFlashcards"],
      ["quiz", "modeQuiz"],
      ["matching", "modeMatching"],
      ["writing", "modeWriting"],
      ["hangman", "modeHangman"],
    ] as const;

    for (const [mode, trophy] of modes) {
      const result = evaluateTrophies(
        input({ event: { mode, perfect: false } }),
      );
      expect(result, mode).toContain(trophy);
      expect(result, mode).toHaveLength(2);
    }
  });

  it("NH-10: a perfect Writing session unlocks the perfect trophy, an imperfect one does not", () => {
    const perfect = evaluateTrophies(
      input({ event: { mode: "writing", perfect: true } }),
    );
    const imperfect = evaluateTrophies(
      input({ event: { mode: "writing", perfect: false } }),
    );
    const otherMode = evaluateTrophies(
      input({ event: { mode: "quiz", perfect: true } }),
    );

    expect(perfect).toContain("perfectWriting");
    expect(imperfect).not.toContain("perfectWriting");
    expect(otherMode).not.toContain("perfectWriting");
  });

  it("NH-10: streak trophies unlock at 3, 7 and 30 days", () => {
    const run = (length: number) =>
      evaluateTrophies(
        input({
          activity: days(
            ...Array.from({ length }, (_, index) => {
              const date = new Date(2026, 9, 29 - index);
              return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            }),
          ),
        }),
      );

    expect(run(2)).not.toContain("streak3");
    expect(run(3)).toContain("streak3");
    expect(run(3)).not.toContain("streak7");
    expect(run(7)).toContain("streak7");
    expect(run(29)).not.toContain("streak30");
    expect(run(30)).toContain("streak30");
  });

  it("NH-10: a gap in the days breaks the streak", () => {
    const result = evaluateTrophies(
      input({ activity: days("2026-10-29", "2026-10-28", "2026-10-26") }),
    );

    expect(result).not.toContain("streak3");
  });

  it("NH-10: mastered trophies count box 5 words only", () => {
    const mastered = (count: number, box: 4 | 5) =>
      Array.from({ length: count }, () => ({ box }));

    expect(evaluateTrophies(input({ progress: mastered(9, 5) }))).not.toContain(
      "mastered10",
    );
    expect(
      evaluateTrophies(input({ progress: mastered(10, 4) })),
    ).not.toContain("mastered10");
    const ten = evaluateTrophies(input({ progress: mastered(10, 5) }));
    expect(ten).toContain("mastered10");
    expect(ten).not.toContain("mastered50");
    const hundred = evaluateTrophies(input({ progress: mastered(100, 5) }));
    expect(hundred).toEqual(
      expect.arrayContaining(["mastered10", "mastered50", "mastered100"]),
    );
  });

  it("NH-10: 100 correct answers are summed over all days and sets", () => {
    const activity = [
      { date: "2026-10-01", answered: 60, correct: 60 },
      { date: "2026-10-02", answered: 50, correct: 39 },
      { date: "2026-10-03", answered: 5, correct: 1 },
    ];

    expect(evaluateTrophies(input({ activity }))).toContain("correct100");
    expect(
      evaluateTrophies(input({ activity: activity.slice(0, 2) })),
    ).not.toContain("correct100");
  });
});

describe("isPerfectSession", () => {
  const pairs = [
    makePair({ a: "hus", b: "house" }),
    makePair({ a: "bil", b: "car" }),
  ];

  it("NH-10: is true when every first answer was correct", () => {
    let session = startSession(pairs);
    session = answerCard(session, "correct");
    session = answerCard(session, "correct");

    expect(isPerfectSession(session)).toBe(true);
  });

  it("NH-10: is false after a wrong or assisted answer", () => {
    for (const result of ["wrong", "assisted"] as const) {
      let session = startSession(pairs);
      session = answerCard(session, "correct");
      session = answerCard(session, result);

      expect(isPerfectSession(session), result).toBe(false);
    }
  });

  it("NH-10: is false for a session without words", () => {
    expect(isPerfectSession(startSession([]))).toBe(false);
  });
});

describe("mergeTrophies", () => {
  it("NH-10: keeps the earliest unlock time and orders by display order", () => {
    const merged = mergeTrophies(
      [{ id: "streak3", unlockedAt: 500 }],
      [
        { id: "streak3", unlockedAt: 100 },
        { id: "firstSession", unlockedAt: 900 },
      ],
    );

    expect(merged).toEqual([
      { id: "firstSession", unlockedAt: 900 },
      { id: "streak3", unlockedAt: 100 },
    ]);
  });

  it("NH-10: merging nothing gives nothing", () => {
    expect(mergeTrophies([], [])).toEqual([]);
  });
});
