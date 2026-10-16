import type { DayActivity } from "../../core/stats";
import { useI18n } from "../../i18n";

const BAR_WIDTH = 14;
const BAR_GAP = 6;
const CHART_HEIGHT = 80;

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
      <svg
        role="img"
        aria-label={t("stats.chart.label")}
        viewBox={`0 0 ${String(width)} ${String(CHART_HEIGHT)}`}
        preserveAspectRatio="none"
      >
        {days.map((day, index) => {
          const x = index * (BAR_WIDTH + BAR_GAP);
          const answeredHeight = (day.answered / maxAnswered) * CHART_HEIGHT;
          const correctHeight = (day.correct / maxAnswered) * CHART_HEIGHT;
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
