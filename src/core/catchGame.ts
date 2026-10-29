import type { Rng } from "./shuffle";

/** The play field is 100 units wide and 100 units tall. */
export const FIELD_SIZE = 100;
export const BASKET_WIDTH = 24;
/** Items that reach this height are either caught or missed. */
export const BASKET_Y = 88;
export const START_LIVES = 3;
/** Share of items that cost a life when caught. */
const BAD_ITEM_CHANCE = 0.25;
/** Horizontal step of one arrow key press. */
export const KEY_STEP = 8;

export type ItemKind = "good" | "bad";

export interface FallingItem {
  readonly id: number;
  /** Horizontal centre in field units. */
  readonly x: number;
  /** Vertical position in field units; 0 is the top. */
  readonly y: number;
  readonly kind: ItemKind;
}

/** Speed and length of a round; the gentle variant is used with reduced motion. */
export interface CatchConfig {
  /** Fall speed in field units per second. */
  readonly speed: number;
  readonly spawnEveryMs: number;
  readonly durationMs: number;
}

export const NORMAL_CATCH: CatchConfig = {
  speed: 38,
  spawnEveryMs: 900,
  durationMs: 45_000,
};

export const GENTLE_CATCH: CatchConfig = {
  speed: 20,
  spawnEveryMs: 1500,
  durationMs: 45_000,
};

/** Immutable state of a catch game. */
export interface CatchState {
  readonly status: "playing" | "over";
  /** Horizontal centre of the basket in field units. */
  readonly basketX: number;
  readonly items: readonly FallingItem[];
  readonly score: number;
  readonly lives: number;
  readonly elapsedMs: number;
  readonly spawnInMs: number;
  readonly nextId: number;
}

/** A fresh game with the basket in the middle. */
export function createCatchGame(): CatchState {
  return {
    status: "playing",
    basketX: FIELD_SIZE / 2,
    items: [],
    score: 0,
    lives: START_LIVES,
    elapsedMs: 0,
    spawnInMs: 0,
    nextId: 0,
  };
}

/** Moves the basket to `x`, keeping it inside the field. */
export function setBasketX(state: CatchState, x: number): CatchState {
  const half = BASKET_WIDTH / 2;
  return { ...state, basketX: Math.min(FIELD_SIZE - half, Math.max(half, x)) };
}

/** Moves the basket by `delta` field units. */
export function moveBasket(state: CatchState, delta: number): CatchState {
  return setBasketX(state, state.basketX + delta);
}

function spawnItem(id: number, rng: Rng): FallingItem {
  const margin = 6;
  return {
    id,
    x: margin + rng() * (FIELD_SIZE - 2 * margin),
    y: 0,
    kind: rng() < BAD_ITEM_CHANCE ? "bad" : "good",
  };
}

/**
 * Advances the game by `dtMs`: spawns, moves and resolves items. Missed good
 * items cost nothing; catching a bad item costs a life. The round ends when
 * time runs out or the lives are gone.
 *
 * @param state Current state; a finished game is returned unchanged.
 * @param dtMs Elapsed time since the previous tick.
 * @param rng Injected random source for item positions and kinds.
 * @param config Speed and length of the round.
 */
export function tickCatch(
  state: CatchState,
  dtMs: number,
  rng: Rng,
  config: CatchConfig,
): CatchState {
  if (state.status === "over") {
    return state;
  }
  let nextId = state.nextId;
  let spawnInMs = state.spawnInMs - dtMs;
  const spawned: FallingItem[] = [];
  while (spawnInMs <= 0) {
    spawned.push(spawnItem(nextId, rng));
    nextId += 1;
    spawnInMs += config.spawnEveryMs;
  }

  let { score, lives } = state;
  const falling: FallingItem[] = [];
  const fall = (config.speed * dtMs) / 1000;
  for (const item of [...state.items, ...spawned]) {
    const moved = { ...item, y: item.y + fall };
    if (moved.y < BASKET_Y) {
      falling.push(moved);
    } else if (Math.abs(moved.x - state.basketX) <= BASKET_WIDTH / 2) {
      if (moved.kind === "good") {
        score += 1;
      } else {
        lives -= 1;
      }
    }
  }

  const elapsedMs = state.elapsedMs + dtMs;
  const over = lives <= 0 || elapsedMs >= config.durationMs;
  return {
    ...state,
    status: over ? "over" : "playing",
    items: falling,
    score,
    lives: Math.max(0, lives),
    elapsedMs,
    spawnInMs,
    nextId,
  };
}
