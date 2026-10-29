import { parseGameUnlock, type GameUnlock } from "../core/gameUnlock";
import { getLocalStorage } from "./preferenceMirror";

export const GAME_UNLOCK_KEY = "lovesamazingwordgame.gameUnlock";

/**
 * Reads the pending mini-game play.
 *
 * @param storage Storage to read from.
 * @returns The unlock, or `null` if there is none or the value is invalid.
 */
export function loadGameUnlock(
  storage: Storage | null = getLocalStorage(),
): GameUnlock | null {
  const raw = storage?.getItem(GAME_UNLOCK_KEY) ?? null;
  if (raw === null) {
    return null;
  }
  try {
    return parseGameUnlock(JSON.parse(raw));
  } catch {
    // A hand-edited or corrupt value just means "no unlock".
    return null;
  }
}

/**
 * Stores the pending play, or removes it when `unlock` is `null`.
 *
 * @returns `false` if storage is blocked or full; the play is then lost, which is harmless.
 */
export function saveGameUnlock(
  unlock: GameUnlock | null,
  storage: Storage | null = getLocalStorage(),
): boolean {
  if (storage === null) {
    return false;
  }
  try {
    if (unlock === null) {
      storage.removeItem(GAME_UNLOCK_KEY);
    } else {
      storage.setItem(GAME_UNLOCK_KEY, JSON.stringify(unlock));
    }
    return true;
  } catch {
    return false;
  }
}
