import { useSyncExternalStore } from "react";
import { isGameId, type GameId } from "./core/gameUnlock";

export type TrainMode =
  "flashcards" | "quiz" | "matching" | "writing" | "hangman";

export const TRAIN_MODES: readonly TrainMode[] = [
  "flashcards",
  "quiz",
  "matching",
  "writing",
  "hangman",
];

/** A screen the app can show. */
export type Route =
  | { readonly name: "home" }
  | { readonly name: "sets" }
  | { readonly name: "setEditor"; readonly id: string }
  | { readonly name: "train" }
  | {
      readonly name: "trainMode";
      readonly mode: TrainMode;
      /** Practise only the hardest words of the set (FR-ST-2). */
      readonly focus?: "hardest";
    }
  | { readonly name: "stats" }
  | { readonly name: "trophies" }
  /** The mini-game hub and one game (NH-11). */
  | { readonly name: "games" }
  | { readonly name: "game"; readonly game: GameId }
  | { readonly name: "settings" }
  /** A set shared via link; `payload` is the encoded set (NH-5). */
  | { readonly name: "share"; readonly payload: string };

const HOME: Route = { name: "home" };

function isTrainMode(value: string | undefined): value is TrainMode {
  return TRAIN_MODES.some((mode) => mode === value);
}

/**
 * Turns a location hash such as `#/sets/abc` into a route.
 *
 * @param hash The value of `location.hash`.
 * @returns The matching route; unknown or malformed hashes give the home route.
 */
export function parseRoute(hash: string): Route {
  const segments = hash
    .replace(/^#\/?/, "")
    .split("/")
    .filter((segment) => segment !== "");
  const [first, second, third, ...rest] = segments;

  if (rest.length > 0 || (third !== undefined && first !== "train")) {
    return HOME;
  }
  switch (first) {
    case undefined:
      return HOME;
    case "sets":
      return second === undefined ? { name: "sets" } : parseSetEditor(second);
    case "train":
      if (second === undefined) {
        return { name: "train" };
      }
      return parseTrainMode(second, third);
    case "stats":
      return second === undefined ? { name: "stats" } : HOME;
    case "trophies":
      return second === undefined ? { name: "trophies" } : HOME;
    case "games":
      if (second === undefined) {
        return { name: "games" };
      }
      return isGameId(second) ? { name: "game", game: second } : HOME;
    case "settings":
      return second === undefined ? { name: "settings" } : HOME;
    case "share":
      return second === undefined ? HOME : { name: "share", payload: second };
    default:
      return HOME;
  }
}

function parseTrainMode(
  mode: string | undefined,
  focus: string | undefined,
): Route {
  if (!isTrainMode(mode) || (focus !== undefined && focus !== "hardest")) {
    return HOME;
  }
  return focus === undefined
    ? { name: "trainMode", mode }
    : { name: "trainMode", mode, focus };
}

function parseSetEditor(encodedId: string): Route {
  try {
    return { name: "setEditor", id: decodeURIComponent(encodedId) };
  } catch {
    // A malformed percent-escape in a hand-edited URL is treated as an unknown route.
    return HOME;
  }
}

/**
 * Builds the location hash for a route; the inverse of {@link parseRoute}.
 *
 * @param route The route to link to.
 */
export function routeToHash(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "sets":
      return "#/sets";
    case "setEditor":
      return `#/sets/${encodeURIComponent(route.id)}`;
    case "train":
      return "#/train";
    case "trainMode":
      return route.focus === undefined
        ? `#/train/${route.mode}`
        : `#/train/${route.mode}/${route.focus}`;
    case "stats":
      return "#/stats";
    case "trophies":
      return "#/trophies";
    case "games":
      return "#/games";
    case "game":
      return `#/games/${route.game}`;
    case "settings":
      return "#/settings";
    case "share":
      return `#/share/${route.payload}`;
  }
}

/**
 * Navigates by changing the location hash.
 *
 * @param route The destination.
 */
export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

function getHash(): string {
  return window.location.hash;
}

/**
 * Subscribes a component to the current route.
 *
 * @returns The route for the current hash; re-renders the component when the hash changes.
 */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return parseRoute(hash);
}
