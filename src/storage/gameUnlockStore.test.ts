import { beforeEach, describe, expect, it } from "vitest";
import {
  GAME_UNLOCK_KEY,
  loadGameUnlock,
  saveGameUnlock,
} from "./gameUnlockStore";

beforeEach(() => {
  localStorage.clear();
});

describe("gameUnlockStore", () => {
  it("NH-11: returns null when nothing is stored", () => {
    expect(loadGameUnlock()).toBeNull();
  });

  it("NH-11: round-trips an unlock and clears it", () => {
    expect(saveGameUnlock({ earnedAt: 7 })).toBe(true);
    expect(loadGameUnlock()).toEqual({ earnedAt: 7 });
    expect(saveGameUnlock(null)).toBe(true);
    expect(loadGameUnlock()).toBeNull();
  });

  it("NH-11: treats corrupt values as no unlock", () => {
    localStorage.setItem(GAME_UNLOCK_KEY, "{not json");
    expect(loadGameUnlock()).toBeNull();
    localStorage.setItem(GAME_UNLOCK_KEY, '{"earnedAt":"x"}');
    expect(loadGameUnlock()).toBeNull();
  });

  it("NH-11: reports blocked storage instead of throwing", () => {
    expect(loadGameUnlock(null)).toBeNull();
    expect(saveGameUnlock({ earnedAt: 1 }, null)).toBe(false);
  });
});
