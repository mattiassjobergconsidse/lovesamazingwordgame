import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  BASKET_WIDTH,
  BASKET_Y,
  FIELD_SIZE,
  GENTLE_CATCH,
  KEY_STEP,
  NORMAL_CATCH,
  createCatchGame,
  moveBasket,
  setBasketX,
  tickCatch,
} from "../../core/catchGame";
import { useInterval } from "../../hooks/useInterval";
import { useI18n } from "../../i18n";
import { GameResult } from "./GameResult";
import type { GameProps } from "./gameProps";

const TICK_MS = 50;

const rng = () => Math.random();

/** Catch the falling items: move the basket with arrow keys or by dragging (NH-11). */
export function CatchGame({ reducedMotion }: GameProps) {
  const { t } = useI18n();
  const config = reducedMotion ? GENTLE_CATCH : NORMAL_CATCH;
  const [state, setState] = useState(createCatchGame);
  const areaRef = useRef<HTMLDivElement>(null);
  const playing = state.status === "playing";

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  const tick = useCallback(() => {
    setState((current) => tickCatch(current, TICK_MS, rng, config));
  }, [config]);
  useInterval(tick, TICK_MS, playing);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -KEY_STEP : KEY_STEP;
      setState((current) => moveBasket(current, step));
    }
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && (event.type === "pointerdown" || event.buttons > 0)) {
      const x = ((event.clientX - rect.left) / rect.width) * FIELD_SIZE;
      setState((current) => setBasketX(current, x));
    }
  };

  if (!playing) {
    return (
      <GameResult
        emoji="🧺"
        message={t("game.catch.done", { score: state.score })}
      />
    );
  }

  const secondsLeft = Math.ceil((config.durationMs - state.elapsedMs) / 1000);
  return (
    <div className="game-play">
      <p className="game-status">
        {t("game.catch.score", { score: state.score })} ·{" "}
        {t("game.catch.lives", { lives: "❤️".repeat(state.lives) })} ·{" "}
        {t("game.catch.time", { seconds: secondsLeft })}
      </p>
      <div
        ref={areaRef}
        className="catch-area"
        role="application"
        tabIndex={0}
        aria-label={t("game.catch.area")}
        aria-describedby="catch-help"
        onKeyDown={onKeyDown}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
      >
        {state.items.map((item) => (
          <span
            key={item.id}
            className="catch-item"
            aria-hidden="true"
            style={{ left: `${String(item.x)}%`, top: `${String(item.y)}%` }}
          >
            {item.kind === "good" ? "🍎" : "💣"}
          </span>
        ))}
        <span
          className="catch-basket"
          aria-hidden="true"
          style={{
            left: `${String(state.basketX)}%`,
            top: `${String(BASKET_Y)}%`,
            width: `${String(BASKET_WIDTH)}%`,
          }}
        >
          🧺
        </span>
      </div>
      <p id="catch-help" className="game-hint">
        {t("game.catch.help")}
      </p>
    </div>
  );
}
