import { useSyncExternalStore } from "react";

export type TrainMode = "flashcards" | "quiz" | "matching" | "writing";

export const TRAIN_MODES: readonly TrainMode[] = [
  "flashcards",
  "quiz",
  "matching",
  "writing",
];

/** A screen the app can show. */
export type Route =
  | { readonly name: "home" }
  | { readonly name: "sets" }
  | { readonly name: "setEditor"; readonly id: string }
  | { readonly name: "train" }
  | { readonly name: "trainMode"; readonly mode: TrainMode }
  | { readonly name: "stats" }
  | { readonly name: "settings" };

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
  const [first, second, ...rest] = segments;

  if (rest.length > 0) {
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
      return isTrainMode(second) ? { name: "trainMode", mode: second } : HOME;
    case "stats":
      return second === undefined ? { name: "stats" } : HOME;
    case "settings":
      return second === undefined ? { name: "settings" } : HOME;
    default:
      return HOME;
  }
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
      return `#/train/${route.mode}`;
    case "stats":
      return "#/stats";
    case "settings":
      return "#/settings";
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
