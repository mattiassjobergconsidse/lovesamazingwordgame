import { useEffect } from "react";

/**
 * Runs `callback` every `intervalMs` while `active` is true.
 *
 * @param callback Called on every tick; pass a stable function to avoid resetting the timer.
 * @param intervalMs Time between ticks.
 * @param active Whether the timer runs.
 */
export function useInterval(
  callback: () => void,
  intervalMs: number,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = window.setInterval(callback, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [callback, intervalMs, active]);
}
