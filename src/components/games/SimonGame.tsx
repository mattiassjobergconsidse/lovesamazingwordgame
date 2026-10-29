import { useEffect, useState } from "react";
import {
  PADS,
  finishShowing,
  pressPad,
  roundsCompleted,
  startSimon,
  type Pad,
} from "../../core/simonGame";
import { useI18n, type MessageKey } from "../../i18n";
import { GameResult } from "./GameResult";
import type { GameProps } from "./gameProps";

const PAD_SYMBOLS: Readonly<Record<Pad, string>> = {
  0: "🔵",
  1: "🟢",
  2: "🔴",
  3: "🟡",
};

const PAD_LABELS: Readonly<Record<Pad, MessageKey>> = {
  0: "game.simon.pad.0",
  1: "game.simon.pad.1",
  2: "game.simon.pad.2",
  3: "game.simon.pad.3",
};

/** Time before the pattern starts, and per pad; slower with reduced motion. */
const LEAD_IN_MS = 700;
const STEP_MS = 700;
const SLOW_STEP_MS = 1200;

const rng = () => Math.random();

/** Simon pattern memory: repeat the growing pattern of four pads (NH-11). */
export function SimonGame({ reducedMotion }: GameProps) {
  const { t } = useI18n();
  const [state, setState] = useState(() => startSimon(rng));
  const [lit, setLit] = useState<Pad | null>(null);
  const showing = state.phase === "showing";
  const stepMs = reducedMotion ? SLOW_STEP_MS : STEP_MS;

  useEffect(() => {
    if (!showing) {
      return;
    }
    const timers: number[] = [];
    state.sequence.forEach((pad, index) => {
      const start = LEAD_IN_MS + index * stepMs;
      timers.push(
        window.setTimeout(() => {
          setLit(pad);
        }, start),
        window.setTimeout(
          () => {
            setLit(null);
          },
          start + stepMs * 0.6,
        ),
      );
    });
    timers.push(
      window.setTimeout(
        () => {
          setState(finishShowing);
        },
        LEAD_IN_MS + state.sequence.length * stepMs,
      ),
    );
    return () => {
      timers.forEach((id) => {
        window.clearTimeout(id);
      });
    };
  }, [showing, state.sequence, stepMs]);

  useEffect(() => {
    // Keys 1-4 play the pads for keyboard users.
    const onKeyDown = (event: KeyboardEvent) => {
      const pad = PADS.find((candidate) => String(candidate + 1) === event.key);
      if (pad !== undefined) {
        setState((current) => pressPad(current, pad, rng));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (state.phase === "over" || state.phase === "won") {
    const rounds = roundsCompleted(state);
    return (
      <GameResult
        emoji={state.phase === "won" ? "🏆" : "🎵"}
        message={t(
          state.phase === "won" ? "game.simon.won" : "game.simon.over",
          { rounds },
        )}
      />
    );
  }

  return (
    <div className="game-play">
      <p className="game-status">
        {t("game.simon.round", { round: state.sequence.length })}
      </p>
      <p className="game-hint" role="status">
        {showing ? t("game.simon.watch") : t("game.simon.repeat")}
      </p>
      <div
        className="simon-pads"
        role="group"
        aria-label={t("game.simon.pads")}
      >
        {PADS.map((pad) => (
          <button
            key={pad}
            type="button"
            className={lit === pad ? "simon-pad simon-pad-lit" : "simon-pad"}
            data-pad={pad}
            aria-disabled={showing}
            onClick={() => {
              setState((current) => pressPad(current, pad, rng));
            }}
          >
            <span aria-hidden="true">{PAD_SYMBOLS[pad]}</span>
            <span>{t(PAD_LABELS[pad], { key: pad + 1 })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
