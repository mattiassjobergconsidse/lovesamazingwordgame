import { useEffect, useRef } from "react";
import { routeToHash, useRoute, type Route } from "../../router";
import type { MessageKey } from "../../i18n";
import { ScreenPlaceholder } from "./ScreenPlaceholder";

function titleFor(route: Route): MessageKey {
  switch (route.name) {
    case "home":
      return "nav.home";
    case "sets":
      return "nav.sets";
    case "setEditor":
      return "route.setEditor";
    case "train":
      return "nav.train";
    case "trainMode":
      return `route.train.${route.mode}`;
    case "stats":
      return "nav.stats";
    case "settings":
      return "nav.settings";
  }
}

/** Renders the screen for the current route and moves focus to its heading on navigation. */
export function RouteOutlet() {
  const route = useRoute();
  const routeKey = routeToHash(route);
  const mainRef = useRef<HTMLElement>(null);
  const previousKey = useRef<string | null>(null);

  useEffect(() => {
    // Skip the initial render so the page does not steal focus on load.
    if (previousKey.current !== null && previousKey.current !== routeKey) {
      mainRef.current?.querySelector("h1")?.focus();
    }
    previousKey.current = routeKey;
  }, [routeKey]);

  return (
    <main id="main" ref={mainRef} tabIndex={-1} className="app-main">
      <ScreenPlaceholder title={titleFor(route)} />
    </main>
  );
}
