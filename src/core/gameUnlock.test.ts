import { describe, expect, it } from "vitest";
import {
  MIN_WORDS_FOR_UNLOCK,
  earnsGameUnlock,
  grantUnlock,
  isGameId,
  parseGameUnlock,
  type UnlockInput,
} from "./gameUnlock";

const perfectSession: UnlockInput = {
  mode: "writing",
  perfect: true,
  overrides: 0,
  total: MIN_WORDS_FOR_UNLOCK,
};

describe("earnsGameUnlock", () => {
  it("NH-11: a perfect Writing session without overrides earns a play", () => {
    expect(earnsGameUnlock(perfectSession)).toBe(true);
  });

  it("NH-11: an imperfect Writing session earns nothing", () => {
    expect(earnsGameUnlock({ ...perfectSession, perfect: false })).toBe(false);
  });

  it("NH-11: an override disqualifies an otherwise perfect session", () => {
    expect(earnsGameUnlock({ ...perfectSession, overrides: 1 })).toBe(false);
  });

  it("NH-11: only Writing sessions count", () => {
    expect(earnsGameUnlock({ ...perfectSession, mode: "quiz" })).toBe(false);
  });

  it("NH-11: a session shorter than the minimum cannot be farmed", () => {
    expect(
      earnsGameUnlock({ ...perfectSession, total: MIN_WORDS_FOR_UNLOCK - 1 }),
    ).toBe(false);
    expect(earnsGameUnlock({ ...perfectSession, total: 1 })).toBe(false);
  });
});

describe("unlock record", () => {
  it("NH-11: a new grant replaces the old one instead of accumulating", () => {
    expect(grantUnlock(5)).toEqual({ earnedAt: 5 });
  });

  it("NH-11: parses valid values and rejects malformed ones", () => {
    expect(parseGameUnlock({ earnedAt: 12 })).toEqual({ earnedAt: 12 });
    expect(parseGameUnlock(null)).toBeNull();
    expect(parseGameUnlock("x")).toBeNull();
    expect(parseGameUnlock({ earnedAt: "12" })).toBeNull();
    expect(parseGameUnlock({ earnedAt: Number.NaN })).toBeNull();
  });

  it("NH-11: recognises game IDs", () => {
    expect(isGameId("memory")).toBe(true);
    expect(isGameId("bubble")).toBe(false);
  });
});
