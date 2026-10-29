import { useEffect, useRef } from "react";
import { routeToHash, useRoute, type Route } from "../../router";
import type { MessageKey } from "../../i18n";
import { AppErrorBoundary } from "../common/AppErrorBoundary";
import { HomeScreen } from "../home/HomeScreen";
import { ShareImportScreen } from "../data/ShareImportScreen";
import { GameScreen } from "../games/GameScreen";
import { GamesScreen } from "../games/GamesScreen";
import { SetEditorScreen } from "../sets/SetEditorScreen";
import { SetsScreen } from "../sets/SetsScreen";
import { SettingsScreen } from "../settings/SettingsScreen";
import { StatsScreen } from "../stats/StatsScreen";
import { TrophyScreen } from "../trophies/TrophyScreen";
import { TrainGate } from "../train/TrainGate";
import { TrainScreen } from "../train/TrainScreen";
import { TrainSession } from "../train/TrainSession";

/** Chooses the screen for a route; unfinished screens show a placeholder. */
function renderScreen(route: Route) {
  switch (route.name) {
    case "sets":
      return <SetsScreen />;
    case "setEditor":
      return <SetEditorScreen key={route.id} id={route.id} />;
    case "train":
      return (
        <TrainGate title={titleFor(route)}>
          <TrainScreen />
        </TrainGate>
      );
    case "trainMode":
      return (
        <TrainGate title={titleFor(route)} mode={route.mode}>
          <AppErrorBoundary key={routeToHash(route)}>
            <TrainSession
              title={titleFor(route)}
              mode={route.mode}
              focus={route.focus}
            />
          </AppErrorBoundary>
        </TrainGate>
      );
    case "stats":
      return <StatsScreen />;
    case "trophies":
      return <TrophyScreen />;
    case "games":
      return <GamesScreen />;
    case "game":
      return <GameScreen key={route.game} game={route.game} />;
    case "settings":
      return <SettingsScreen />;
    case "share":
      return <ShareImportScreen key={route.payload} payload={route.payload} />;
    case "home":
      return <HomeScreen />;
  }
}
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
    case "trophies":
      return "nav.trophies";
    case "games":
      return "nav.games";
    case "game":
      return `game.${route.game}.name`;
    case "settings":
      return "nav.settings";
    case "share":
      return "route.share";
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
      {renderScreen(route)}
    </main>
  );
}
