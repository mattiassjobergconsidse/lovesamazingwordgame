import { useEffect, useRef } from "react";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";

interface GameResultProps {
  readonly emoji: string;
  readonly message: string;
}

/** End panel shared by all mini-games: result text and the way back (NH-11). */
export function GameResult({ emoji, message }: GameResultProps) {
  const { t } = useI18n();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="game-result card" role="status">
      <span className="game-result-emoji" aria-hidden="true">
        {emoji}
      </span>
      <h2 ref={headingRef} tabIndex={-1}>
        {message}
      </h2>
      <p>{t("game.result.again")}</p>
      <a className="button" href={routeToHash({ name: "games" })}>
        {t("game.back")}
      </a>
    </div>
  );
}
