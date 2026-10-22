import { useMemo, useState } from "react";
import {
  computeSetStats,
  hardestWords,
  recentActivity,
} from "../../core/stats";
import { useActiveSet } from "../../hooks/useActiveSet";
import { useLibrary } from "../../hooks/useLibrary";
import { useI18n } from "../../i18n";
import { routeToHash } from "../../router";
import type { WordSet } from "../../types";
import "../common/common.css";
import { ActivityChart } from "./ActivityChart";
import "./stats.css";

function SetStatistics({ set }: { readonly set: WordSet }) {
  const { t, tp } = useI18n();
  const { pairs, progress, activity } = useLibrary();
  // Fixed at mount so rendering stays pure; leaving and returning refreshes it.
  const [now] = useState(() => Date.now());

  const view = useMemo(() => {
    const setPairs = pairs.filter((pair) => pair.setId === set.id);
    const setProgress = progress.filter((record) => record.setId === set.id);
    const setActivity = activity.filter((day) => day.setId === set.id);
    return {
      stats: computeSetStats(setPairs, setProgress, setActivity, now),
      hardest: hardestWords(setPairs, setProgress),
      days: recentActivity(setActivity, now),
    };
  }, [pairs, progress, activity, set.id, now]);
  const { stats, hardest, days } = view;

  const figures = [
    { emoji: "📚", label: t("stats.total"), value: String(stats.total) },
    { emoji: "🌱", label: t("stats.new"), value: String(stats.newWords) },
    { emoji: "🧠", label: t("stats.learning"), value: String(stats.learning) },
    { emoji: "⭐", label: t("stats.mastered"), value: String(stats.mastered) },
    { emoji: "⏰", label: t("stats.due"), value: String(stats.due) },
    {
      emoji: "🎯",
      label: t("stats.accuracy"),
      value:
        stats.accuracy === null
          ? t("stats.accuracy.none")
          : t("stats.accuracy.value", { value: stats.accuracy }),
    },
    {
      emoji: "🔥",
      label: t("stats.streak"),
      value: tp("stats.streak.value", stats.streak),
    },
  ];

  return (
    <>
      <p className="stats-set-name">{set.name}</p>
      <section aria-labelledby="stats-overview">
        <h2 id="stats-overview">
          <span className="stats-emoji" aria-hidden="true">
            📊
          </span>
          {t("stats.overview")}
        </h2>
        <dl className="stats-grid">
          {figures.map((figure) => (
            <div key={figure.label} className="stats-figure card">
              <dt>
                <span className="stats-emoji" aria-hidden="true">
                  {figure.emoji}
                </span>
                {figure.label}
              </dt>
              <dd>{figure.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="stats-hardest">
        <h2 id="stats-hardest">
          <span className="stats-emoji" aria-hidden="true">
            💪
          </span>
          {t("stats.hardest.heading")}
        </h2>
        {hardest.length === 0 ? (
          <p className="stats-empty">{t("stats.hardest.empty")}</p>
        ) : (
          <>
            <ol className="hard-list">
              {hardest.map((word) => (
                <li key={word.pair.id}>
                  <span>
                    {t("train.result.pair", {
                      a: word.pair.a,
                      b: word.pair.b,
                    })}
                  </span>
                  <span className="hard-score">
                    {t("stats.hardest.score", {
                      wrong: word.wrong,
                      total: word.wrong + word.correct,
                    })}
                  </span>
                </li>
              ))}
            </ol>
            <a
              className="button button-link"
              href={routeToHash({
                name: "trainMode",
                mode: "flashcards",
                focus: "hardest",
              })}
            >
              {t("stats.hardest.practise")}
            </a>
          </>
        )}
      </section>
      <section aria-labelledby="stats-chart">
        <h2 id="stats-chart">
          <span className="stats-emoji" aria-hidden="true">
            📈
          </span>
          {t("stats.chart.heading")}
        </h2>
        <ActivityChart days={days} />
      </section>
    </>
  );
}

/** `#/stats`: statistics of the active set (FR-ST-1 to FR-ST-3). */
export function StatsScreen() {
  const { t } = useI18n();
  const { activeSet } = useActiveSet();

  return (
    <div className="stats-screen">
      <h1 tabIndex={-1}>{t("nav.stats")}</h1>
      {activeSet === null ? (
        <p>{t("stats.noSet")}</p>
      ) : (
        <SetStatistics key={activeSet.id} set={activeSet} />
      )}
    </div>
  );
}
