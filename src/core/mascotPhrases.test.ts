import { describe, expect, it } from "vitest";
import { makeRng } from "../../tests/factories";
import {
  MASCOT_EVENTS,
  STREAK_MILESTONES,
  isStreakMilestone,
  mascotMoodFor,
  mascotPhraseKey,
  pickMascotPhrase,
  reactToAnswer,
} from "./mascotPhrases";

describe("mascotPhraseKey", () => {
  it("NH-12: builds the dictionary key from mascot, event and index", () => {
    expect(mascotPhraseKey("foxel", "correct", 2)).toBe(
      "mascot.foxel.correct.2",
    );
  });
});

describe("pickMascotPhrase", () => {
  it("NH-12: maps the random value onto the pool of three", () => {
    expect(pickMascotPhrase("volt", "wrong", () => 0).index).toBe(1);
    expect(pickMascotPhrase("volt", "wrong", () => 0.5).index).toBe(2);
    expect(pickMascotPhrase("volt", "wrong", () => 0.99).index).toBe(3);
  });

  it("NH-12: clamps a random value of exactly 1", () => {
    expect(pickMascotPhrase("volt", "wrong", () => 1).index).toBe(3);
  });

  it("NH-12: is deterministic for the same rng seed", () => {
    const first = pickMascotPhrase("bubo", "greeting", makeRng(7));
    const second = pickMascotPhrase("bubo", "greeting", makeRng(7));
    expect(first).toEqual(second);
  });

  it("NH-12: never repeats the previous phrase", () => {
    for (const previous of [1, 2, 3] as const) {
      for (const value of [0, 0.3, 0.6, 0.99]) {
        const { index } = pickMascotPhrase(
          "glosa",
          "streak",
          () => value,
          previous,
        );
        expect(index).not.toBe(previous);
      }
    }
  });

  it("NH-12: returns the key matching the picked index", () => {
    const { key, index } = pickMascotPhrase("umbra", "trophy", () => 0.5);
    expect(key).toBe(`mascot.umbra.trophy.${String(index)}`);
  });

  it("NH-12: defines every event once", () => {
    expect(new Set(MASCOT_EVENTS).size).toBe(MASCOT_EVENTS.length);
  });
});

describe("isStreakMilestone", () => {
  it("NH-12: reacts only at the milestones", () => {
    for (const milestone of STREAK_MILESTONES) {
      expect(isStreakMilestone(milestone)).toBe(true);
    }
    expect(isStreakMilestone(1)).toBe(false);
    expect(isStreakMilestone(4)).toBe(false);
  });
});

describe("reactToAnswer", () => {
  it("NH-12: a correct answer extends the streak and says 'correct' between milestones", () => {
    expect(reactToAnswer(0, "correct")).toEqual({
      streak: 1,
      event: "correct",
    });
    expect(reactToAnswer(3, "correct")).toEqual({
      streak: 4,
      event: "correct",
    });
  });

  it("NH-12: the third correct answer in a row is a streak", () => {
    expect(reactToAnswer(2, "correct")).toEqual({
      streak: 3,
      event: "streak",
    });
  });

  it("NH-12: a wrong answer resets the streak and reacts", () => {
    expect(reactToAnswer(4, "wrong")).toEqual({ streak: 0, event: "wrong" });
  });

  it("NH-12: an assisted answer resets the streak and stays silent", () => {
    expect(reactToAnswer(4, "assisted")).toEqual({ streak: 0, event: null });
  });
});

describe("mascotMoodFor", () => {
  it("NH-12: cheers for good news, winces for mistakes and stays calm otherwise", () => {
    expect(mascotMoodFor("correct")).toBe("cheer");
    expect(mascotMoodFor("streak")).toBe("cheer");
    expect(mascotMoodFor("trophy")).toBe("cheer");
    expect(mascotMoodFor("sessionPerfect")).toBe("cheer");
    expect(mascotMoodFor("wrong")).toBe("oops");
    expect(mascotMoodFor("greeting")).toBe("idle");
    expect(mascotMoodFor("modeSelect")).toBe("idle");
    expect(mascotMoodFor("sessionDone")).toBe("idle");
  });
});
