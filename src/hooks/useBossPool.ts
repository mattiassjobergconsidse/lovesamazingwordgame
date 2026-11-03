import { useMemo, useState } from "react";
import {
  resolveBossPool,
  type BossPoolCounts,
  type BossPoolSource,
} from "../core/bossBattle";
import { hardestWords, lastSessionMistakes } from "../core/stats";
import { useLibrary } from "./useLibrary";

/**
 * How many words each Boss Battle pool offers for a set right now (NH-15).
 *
 * @param setId The set to look at.
 * @throws If used outside the library provider.
 */
export function useBossPoolCounts(setId: string): BossPoolCounts {
  const { pairs, progress } = useLibrary();
  return useMemo(() => {
    const setPairs = pairs.filter((pair) => pair.setId === setId);
    const setProgress = progress.filter((record) => record.setId === setId);
    return {
      mistakes: lastSessionMistakes(setPairs, setProgress).length,
      hardest: hardestWords(setPairs, setProgress).length,
    };
  }, [pairs, progress, setId]);
}

/**
 * The pool of a boss, decided once when the screen opens. Answering changes the
 * progress and with it the live counts, but a running fight must keep its pool.
 *
 * @param setId The set to fight with.
 * @param requested A pool asked for in the route, if any.
 * @returns The pool, or `null` when no pool has enough words.
 */
export function useBossPool(
  setId: string,
  requested: BossPoolSource | undefined,
): BossPoolSource | null {
  const counts = useBossPoolCounts(setId);
  const [pool] = useState(() => resolveBossPool(counts, requested));
  return pool;
}
