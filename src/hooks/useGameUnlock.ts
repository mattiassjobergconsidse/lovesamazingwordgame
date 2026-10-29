import { useCallback, useState } from "react";
import type { GameUnlock } from "../core/gameUnlock";
import { loadGameUnlock, saveGameUnlock } from "../storage/gameUnlockStore";

/** The pending mini-game play and how to use it up. */
export interface GameUnlockState {
  /** `null` while the games are locked. */
  readonly unlock: GameUnlock | null;
  /** Uses up the play; the games lock again (NH-11). */
  readonly consume: () => void;
}

/** Reads the stored mini-game unlock once and lets a game consume it. */
export function useGameUnlock(): GameUnlockState {
  const [unlock, setUnlock] = useState(() => loadGameUnlock());
  const consume = useCallback(() => {
    saveGameUnlock(null);
    setUnlock(null);
  }, []);
  return { unlock, consume };
}
