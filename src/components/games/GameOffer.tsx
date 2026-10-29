import { GAME_EMOJIS, GAME_IDS } from "../../core/gameUnlock";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import "./games.css";

/** Shown on the end screen of a perfect Writing session: pick a mini-game or skip (NH-11). */
export function GameOffer() {
  const { t } = useI18n();
  return (
    <section className="game-offer card" aria-labelledby="game-offer-heading">
      <h2 id="game-offer-heading">
        <span aria-hidden="true">🎮 </span>
        {t("game.offer.title")}
      </h2>
      <p>{t("game.offer.text")}</p>
      <ul className="game-offer-list">
        {GAME_IDS.map((game) => (
          <li key={game}>
            <a className="button" href={routeToHash({ name: "game", game })}>
              <span aria-hidden="true">{GAME_EMOJIS[game]} </span>
              {t(`game.${game}.name`)}
            </a>
          </li>
        ))}
      </ul>
      <p className="game-hint">{t("game.offer.skip")}</p>
    </section>
  );
}
