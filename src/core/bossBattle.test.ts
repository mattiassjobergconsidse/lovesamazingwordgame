import { describe, expect, it } from "vitest";
import { makeRng } from "../../tests/factories";
import type { AnswerResult } from "../types";
import {
  applyBossAnswer,
  bossAfterAnswers,
  bossQuestionKind,
  HEAL_ON_WRONG,
  HP_PER_WORD,
  isBossDefeated,
  MIN_BOSS_WORDS,
  pickBossMascot,
  resolveBossPool,
  startBoss,
} from "./bossBattle";
import { MASCOT_IDS } from "./mascots";

describe("resolveBossPool", () => {
  it("NH-15: needs at least 3 words in the requested pool", () => {
    expect(resolveBossPool({ mistakes: 2, hardest: 9 }, "mistakes")).toBeNull();
    expect(resolveBossPool({ mistakes: 3, hardest: 0 }, "mistakes")).toBe(
      "mistakes",
    );
    expect(resolveBossPool({ mistakes: 0, hardest: 3 }, "hardest")).toBe(
      "hardest",
    );
    expect(MIN_BOSS_WORDS).toBe(3);
  });

  it("NH-15: without a request the last session's mistakes win, then the hardest words", () => {
    expect(resolveBossPool({ mistakes: 3, hardest: 8 })).toBe("mistakes");
    expect(resolveBossPool({ mistakes: 2, hardest: 3 })).toBe("hardest");
  });

  it("NH-15: is unavailable when neither pool has 3 words", () => {
    expect(resolveBossPool({ mistakes: 2, hardest: 2 })).toBeNull();
    expect(resolveBossPool({ mistakes: 0, hardest: 0 })).toBeNull();
  });
});

describe("boss health", () => {
  it("NH-15: starts at full health, 10 per word", () => {
    expect(startBoss(4)).toEqual({
      hp: 4 * HP_PER_WORD,
      maxHp: 4 * HP_PER_WORD,
      remaining: 4,
    });
  });

  it("NH-15: a correct answer damages the boss and solves a word", () => {
    const next = applyBossAnswer(startBoss(3), "correct");

    expect(next).toEqual({ hp: 20, maxHp: 30, remaining: 2 });
  });

  it("NH-15: an assisted answer also solves the word", () => {
    const next = applyBossAnswer(startBoss(3), "assisted");

    expect(next.remaining).toBe(2);
    expect(next.hp).toBeLessThan(30);
  });

  it("NH-15: a wrong answer heals a little but never above full health", () => {
    const hurt = applyBossAnswer(startBoss(3), "correct");

    const healed = applyBossAnswer(hurt, "wrong");
    const atFull = applyBossAnswer(startBoss(3), "wrong");

    expect(healed.hp).toBe(hurt.hp + HEAL_ON_WRONG);
    expect(healed.remaining).toBe(hurt.remaining);
    expect(atFull).toEqual(startBoss(3));
  });

  it("NH-15: the boss is defeated exactly when the last word is answered correctly", () => {
    let boss = startBoss(3);
    boss = applyBossAnswer(boss, "wrong");
    boss = applyBossAnswer(boss, "correct");
    boss = applyBossAnswer(boss, "wrong");
    boss = applyBossAnswer(boss, "wrong");
    boss = applyBossAnswer(boss, "correct");
    expect(isBossDefeated(boss)).toBe(false);
    expect(boss.hp).toBeGreaterThan(0);

    boss = applyBossAnswer(boss, "correct");

    expect(isBossDefeated(boss)).toBe(true);
    expect(boss.hp).toBe(0);
  });

  it("NH-15: health never reaches zero before the last word, whatever the answers", () => {
    const patterns: AnswerResult[][] = [
      ["correct", "correct", "correct", "correct"],
      ["wrong", "wrong", "wrong", "correct", "correct", "correct", "correct"],
      ["correct", "wrong", "assisted", "wrong", "wrong", "correct", "correct"],
    ];

    for (const answers of patterns) {
      let boss = startBoss(4);
      for (const answer of answers) {
        boss = applyBossAnswer(boss, answer);
        expect(boss.hp === 0, answers.join()).toBe(boss.remaining === 0);
        expect(boss.hp).toBeLessThanOrEqual(boss.maxHp);
      }
    }
  });

  it("NH-15: a defeated boss ignores further answers", () => {
    const defeated = bossAfterAnswers(1, ["correct"]);

    expect(applyBossAnswer(defeated, "wrong")).toBe(defeated);
  });

  it("NH-15: replaying the answers gives the same state as applying them one by one", () => {
    const answers: AnswerResult[] = ["correct", "wrong", "correct"];

    expect(bossAfterAnswers(3, answers)).toEqual(
      answers.reduce(applyBossAnswer, startBoss(3)),
    );
    expect(bossAfterAnswers(3, [])).toEqual(startBoss(3));
  });
});

describe("bossQuestionKind", () => {
  it("NH-15: first tries are Quiz questions and re-queued words are Writing questions", () => {
    expect(bossQuestionKind(false)).toBe("quiz");
    expect(bossQuestionKind(true)).toBe("writing");
  });
});

describe("pickBossMascot", () => {
  it("NH-15: never picks the user's own mascot", () => {
    const rng = makeRng(7);

    for (const player of MASCOT_IDS) {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        expect(pickBossMascot(player, rng)).not.toBe(player);
      }
    }
  });

  it("NH-15: can pick every other mascot", () => {
    const picked = new Set(
      [0, 0.2, 0.4, 0.6, 0.99].map((value) =>
        pickBossMascot("volt", () => value),
      ),
    );

    expect(picked).toEqual(new Set(MASCOT_IDS.filter((id) => id !== "volt")));
  });
});
