import type { DayActivity } from "../../core/stats";
import { useI18n } from "../../i18n";

const BAR_WIDTH = 14;
const BAR_GAP = 6;
const CHART_HEIGHT = 80;
/** Smallest visible height for a non-empty bar, so days with little practice still show. */
const MIN_BAR_HEIGHT = 6;

function barHeight(value: number, max: number): number {
  if (value <= 0) return 0;
  return Math.max(MIN_BAR_HEIGHT, (value / max) * CHART_HEIGHT);
}

interface ActivityChartProps {
  readonly days: readonly DayActivity[];
}

function formatDay(language: string, date: string): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

/** Plain SVG bar chart of answers per day; the correct share is drawn inside each bar (FR-ST-3). */
export function ActivityChart({ days }: ActivityChartProps) {
  const { t, language } = useI18n();
  const maxAnswered = Math.max(1, ...days.map((day) => day.answered));
  const width = days.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <figure className="activity-chart">
      <div className="chart-plot">
        {/* Visible counts right above each bar, readable without hovering (touch screens). */}
        <div
          className="chart-counts"
          aria-hidden="true"
          style={{
            gridTemplateColumns: `repeat(${String(days.length)}, 1fr)`,
            columnGap: `${String((BAR_GAP / width) * 100)}%`,
          }}
        >
          {days.map((day) => (
            <div key={day.date} className="chart-count-cell">
              <span
                style={{
                  bottom: `${String((barHeight(day.answered, maxAnswered) / CHART_HEIGHT) * 100)}%`,
                }}
              >
                {day.answered > 0 ? String(day.answered) : ""}
              </span>
            </div>
          ))}
        </div>
        <svg
          role="img"
          aria-label={t("stats.chart.label")}
          viewBox={`0 0 ${String(width)} ${String(CHART_HEIGHT)}`}
          preserveAspectRatio="none"
        >
          {days.map((day, index) => {
            const x = index * (BAR_WIDTH + BAR_GAP);
            const answeredHeight = barHeight(day.answered, maxAnswered);
            const correctHeight = Math.min(
              answeredHeight,
              barHeight(day.correct, maxAnswered),
            );
            return (
              <g key={day.date}>
                <title>
                  {t("stats.chart.day", {
                    date: formatDay(language, day.date),
                    correct: day.correct,
                    answered: day.answered,
                  })}
                </title>
                <rect
                  className="chart-bar-answered"
                  x={x}
                  y={CHART_HEIGHT - answeredHeight}
                  width={BAR_WIDTH}
                  height={answeredHeight}
                />
                <rect
                  className="chart-bar-correct"
                  x={x}
                  y={CHART_HEIGHT - correctHeight}
                  width={BAR_WIDTH}
                  height={correctHeight}
                />
              </g>
            );
          })}
        </svg>
      </div>
      {/* Day of month under every bar, so each bar can be tied to a date. */}
      <div
        className="chart-days"
        aria-hidden="true"
        style={{
          gridTemplateColumns: `repeat(${String(days.length)}, 1fr)`,
          columnGap: `${String((BAR_GAP / width) * 100)}%`,
        }}
      >
        {days.map((day) => (
          <span key={day.date}>{Number(day.date.slice(8, 10))}</span>
        ))}
      </div>
      {first !== undefined && last !== undefined && (
        <figcaption className="chart-axis">
          <span>{formatDay(language, first.date)}</span>
          <span className="chart-legend">
            <span className="chart-swatch chart-swatch-answered" />
            {t("stats.chart.legendAnswered")}
            <span className="chart-swatch chart-swatch-correct" />
            {t("stats.chart.legendCorrect")}
          </span>
          <span>{formatDay(language, last.date)}</span>
        </figcaption>
      )}
    </figure>
  );
}
