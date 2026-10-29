import { GAME_EMOJIS, GAME_IDS } from "../../core/gameUnlock";
import { useGameUnlock } from "../../hooks/useGameUnlock";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import "../common/common.css";
import "./games.css";

/** Hub of the three mini-games: locked until a perfect Writing session earns one play (NH-11). */
export function GamesScreen() {
  const { t } = useI18n();
  const { unlock } = useGameUnlock();
  const unlocked = unlock !== null;

  return (
    <div className="games-screen">
      <h1 tabIndex={-1}>{t("nav.games")}</h1>
      <p className="games-summary" role="status">
        {unlocked ? t("games.ready") : t("games.locked")}
      </p>
      <ul className="games-grid" aria-label={t("games.list")}>
        {GAME_IDS.map((game) => (
          <li
            key={game}
            className={
              unlocked ? "game-card card" : "game-card card game-card-locked"
            }
            data-testid={`game-${game}`}
          >
            <span className="game-card-emoji" aria-hidden="true">
              {unlocked ? GAME_EMOJIS[game] : "🔒"}
            </span>
            <h2>{t(`game.${game}.name`)}</h2>
            <p>{t(`game.${game}.desc`)}</p>
            {unlocked ? (
              <a className="button" href={routeToHash({ name: "game", game })}>
                {t("game.play")}
              </a>
            ) : (
              <p className="game-card-status">{t("games.status.locked")}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
