import { useState } from "react";
import { GAME_EMOJIS, type GameId } from "../../core/gameUnlock";
import { useGameUnlock } from "../../hooks/useGameUnlock";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import { AppErrorBoundary } from "../common/AppErrorBoundary";
import "../common/common.css";
import { CatchGame } from "./CatchGame";
import { MemoryGame } from "./MemoryGame";
import { SimonGame } from "./SimonGame";
import "./games.css";

interface GameScreenProps {
  readonly game: GameId;
}

function GameBody({
  game,
  reducedMotion,
}: GameScreenProps & { readonly reducedMotion: boolean }) {
  switch (game) {
    case "memory":
      return <MemoryGame reducedMotion={reducedMotion} />;
    case "catch":
      return <CatchGame reducedMotion={reducedMotion} />;
    case "simon":
      return <SimonGame reducedMotion={reducedMotion} />;
  }
}

/**
 * One mini-game. Pressing Start uses up the unlocked play, so a skipped unlock
 * survives until it is really played (NH-11).
 */
export function GameScreen({ game }: GameScreenProps) {
  const { t } = useI18n();
  const { unlock, consume } = useGameUnlock();
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);

  return (
    <div className="game-screen">
      <h1 tabIndex={-1}>
        <span className="mode-emoji" aria-hidden="true">
          {GAME_EMOJIS[game]}
        </span>
        {t(`game.${game}.name`)}
      </h1>
      {playing ? (
        <AppErrorBoundary>
          <GameBody game={game} reducedMotion={reducedMotion} />
        </AppErrorBoundary>
      ) : unlock === null ? (
        <>
          <p>{t("game.locked")}</p>
          <a
            className="button button-secondary"
            href={routeToHash({ name: "games" })}
          >
            {t("game.back")}
          </a>
        </>
      ) : (
        <>
          <p>{t(`game.${game}.desc`)}</p>
          <p className="game-hint">{t("game.start.once")}</p>
          <button
            type="button"
            className="button"
            onClick={() => {
              consume();
              setPlaying(true);
            }}
          >
            {t("game.start")}
          </button>
        </>
      )}
    </div>
  );
}
