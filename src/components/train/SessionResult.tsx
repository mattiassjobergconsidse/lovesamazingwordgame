import type { ReactNode } from "react";
import { formatDuration } from "../../core/activity";
import {
  mistakePairs,
  sessionScore,
  type SessionState,
} from "../../core/session";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import "../common/common.css";
import { Mascot } from "../common/Mascot";

interface SessionResultProps {
  readonly session: SessionState;
  readonly durationMs: number;
  readonly onPractiseMistakes: () => void;
  readonly onPractiseAgain: () => void;
  /** Extra content shown above the actions, e.g. the mini-game offer (NH-11). */
  readonly children?: ReactNode;
}

/** End screen of a session: score, time, words to review and next steps (FR-TRN-5). */
export function SessionResult({
  session,
  durationMs,
  onPractiseMistakes,
  onPractiseAgain,
  children,
}: SessionResultProps) {
  const { t } = useI18n();
  const score = sessionScore(session);
  const mistakes = mistakePairs(session);
  const perfect = mistakes.length === 0;

  return (
    <div className="session-result">
      <div className="session-result-hero">
        <Mascot cheer={perfect} />
        <span className="session-result-emoji" aria-hidden="true">
          {perfect ? "🎉" : "💪"}
        </span>
      </div>
      <h1 tabIndex={-1}>{t("train.result.title")}</h1>
      <p className="session-result-score">
        {t("train.result.score", {
          correct: score.correct,
          total: session.total,
        })}
      </p>
      <p>{t("train.result.time", { time: formatDuration(durationMs) })}</p>
      {mistakes.length === 0 ? (
        <p>{t("train.result.perfect")}</p>
      ) : (
        <section aria-labelledby="session-review-heading">
          <h2 id="session-review-heading">{t("train.result.review")}</h2>
          <ul className="session-review-list">
            {mistakes.map((pair) => (
              <li key={pair.id}>
                {t("train.result.pair", { a: pair.a, b: pair.b })}
              </li>
            ))}
          </ul>
        </section>
      )}
      {children}
      <div className="session-actions">
        {mistakes.length > 0 && (
          <button type="button" className="button" onClick={onPractiseMistakes}>
            {t("train.result.practiseMistakes")}
          </button>
        )}
        <button
          type="button"
          className={mistakes.length > 0 ? "button button-secondary" : "button"}
          onClick={onPractiseAgain}
        >
          {t("train.result.again")}
        </button>
        <a
          className="button button-secondary button-link"
          href={routeToHash({ name: "home" })}
        >
          {t("train.result.home")}
        </a>
      </div>
    </div>
  );
}
