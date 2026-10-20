import { useMemo, useState, type CSSProperties } from "react";
import { dayPeriod, homeSummary } from "../../core/home";
import { hardestWords } from "../../core/stats";
import { MIN_WORDS } from "../../core/trainingEligibility";
import { useActiveSet } from "../../hooks/useActiveSet";
import { useLibrary } from "../../hooks/useLibrary";
import { useSettings } from "../../hooks/useSettings";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import type { WordSet } from "../../types";
import "../common/common.css";
import { SetPickerDialog } from "../sets/SetPickerDialog";
import { ModeCards } from "../train/ModeCards";
import "./home.css";

function SetHome({ set }: { readonly set: WordSet }) {
  const { t, tp } = useI18n();
  const { pairs, progress, activity } = useLibrary();
  const { settings } = useSettings();
  const dailyGoal = settings.dailyGoal;
  // Fixed at mount so rendering stays pure; navigating away and back refreshes it.
  const [now] = useState(() => Date.now());

  const view = useMemo(() => {
    const setPairs = pairs.filter((pair) => pair.setId === set.id);
    const setProgress = progress.filter((record) => record.setId === set.id);
    const setActivity = activity.filter((day) => day.setId === set.id);
    return {
      wordCount: setPairs.length,
      summary: homeSummary(setPairs, setProgress, setActivity, now, dailyGoal),
      hasHardWords: hardestWords(setPairs, setProgress, 1).length > 0,
    };
  }, [pairs, progress, activity, set.id, now, dailyGoal]);
  const { wordCount, summary, hasHardWords } = view;
  const { stats } = summary;

  if (wordCount === 0) {
    return (
      <>
        <p>{tp("train.needs", MIN_WORDS.flashcards)}</p>
        <a
          className="button button-link"
          href={routeToHash({ name: "setEditor", id: set.id })}
        >
          {t("train.addWords")}
        </a>
      </>
    );
  }

  const readyToPractise = stats.due + stats.newWords > 0;
  const goalReached = summary.answeredToday >= dailyGoal;
  const ringStyle = {
    "--progress": `${String(Math.round(summary.goalProgress * 360))}deg`,
  } as CSSProperties;

  return (
    <>
      <section aria-labelledby="home-due" className="home-section">
        <h2 id="home-due">{t("home.due.heading")}</h2>
        {readyToPractise ? (
          <>
            {stats.due > 0 && <p>{tp("home.due.some", stats.due)}</p>}
            {stats.newWords > 0 && <p>{tp("home.due.new", stats.newWords)}</p>}
          </>
        ) : (
          <p>{t("home.due.none")}</p>
        )}
        <div className="home-actions">
          <a
            className="button button-link home-primary"
            href={routeToHash({ name: "trainMode", mode: "flashcards" })}
          >
            {readyToPractise ? t("home.due.start") : t("home.due.anyway")}
          </a>
          {hasHardWords && (
            <a
              className="button button-secondary button-link"
              href={routeToHash({
                name: "trainMode",
                mode: "flashcards",
                focus: "hardest",
              })}
            >
              {t("home.hardest")}
            </a>
          )}
        </div>
      </section>

      <section aria-labelledby="home-modes" className="home-section">
        <h2 id="home-modes">{t("home.modes.heading")}</h2>
        <ModeCards wordCount={wordCount} labelledBy="home-modes" />
      </section>

      <div className="home-columns">
        <section aria-labelledby="home-goal" className="home-section">
          <h2 id="home-goal">{t("home.goal.heading")}</h2>
          <div className="home-goal">
            <span className="home-ring" style={ringStyle} aria-hidden="true">
              <span className="home-ring-inner">{summary.answeredToday}</span>
            </span>
            <p>
              {goalReached
                ? t("home.goal.reached")
                : t("home.goal.progress", {
                    done: summary.answeredToday,
                    goal: dailyGoal,
                  })}
            </p>
          </div>
        </section>

        <section aria-labelledby="home-snapshot" className="home-section">
          <h2 id="home-snapshot">{t("home.snapshot.heading")}</h2>
          <dl className="stats-grid">
            <div className="stats-figure">
              <dt>{t("stats.streak")}</dt>
              <dd>{tp("stats.streak.value", stats.streak)}</dd>
            </div>
            <div className="stats-figure">
              <dt>{t("home.snapshot.mastered")}</dt>
              <dd>
                {t("home.snapshot.masteredValue", {
                  mastered: stats.mastered,
                  total: stats.total,
                })}
              </dd>
            </div>
            <div className="stats-figure">
              <dt>{t("home.snapshot.accuracy")}</dt>
              <dd>
                {summary.weekAccuracy === null
                  ? t("stats.accuracy.none")
                  : t("stats.accuracy.value", { value: summary.weekAccuracy })}
              </dd>
            </div>
          </dl>
          <a href={routeToHash({ name: "stats" })}>{t("home.snapshot.more")}</a>
        </section>
      </div>
    </>
  );
}

/** `#/`: greeting, what to practise today, the four modes and a progress snapshot. */
export function HomeScreen() {
  const { t } = useI18n();
  const { activeSet, ready } = useActiveSet();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hour] = useState(() => new Date().getHours());

  return (
    <div className="home-screen">
      <h1 tabIndex={-1}>{t("nav.home")}</h1>
      <p className="home-greeting">{t(`home.greeting.${dayPeriod(hour)}`)}</p>
      {!ready ? null : activeSet === null ? (
        <>
          <p>{t("home.noSet")}</p>
          <div className="home-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                setPickerOpen(true);
              }}
            >
              {t("activeSet.choose")}
            </button>
            <a
              className="button button-secondary button-link"
              href={routeToHash({ name: "sets" })}
            >
              {t("home.noSet.create")}
            </a>
          </div>
          {pickerOpen && (
            <SetPickerDialog
              onClose={() => {
                setPickerOpen(false);
              }}
            />
          )}
        </>
      ) : (
        <SetHome key={activeSet.id} set={activeSet} />
      )}
    </div>
  );
}
