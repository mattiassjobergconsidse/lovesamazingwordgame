import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Whether the user asks the system for less motion. Games use it to pick their
 * slower or timer-free variant (NH-11).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
