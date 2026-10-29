import { describe, expect, it } from "vitest";
import {
  BASKET_WIDTH,
  BASKET_Y,
  FIELD_SIZE,
  GENTLE_CATCH,
  NORMAL_CATCH,
  START_LIVES,
  createCatchGame,
  moveBasket,
  setBasketX,
  tickCatch,
  type CatchState,
  type FallingItem,
} from "./catchGame";

const goodAt = (x: number, y: number): FallingItem => ({
  id: 1,
  x,
  y,
  kind: "good",
});

function withItems(items: FallingItem[], patch: Partial<CatchState> = {}) {
  // A long spawn delay keeps the test free of extra items.
  return { ...createCatchGame(), spawnInMs: 100_000, items, ...patch };
}

describe("catch game", () => {
  it("NH-11: keeps the basket inside the field", () => {
    const state = createCatchGame();
    expect(setBasketX(state, -50).basketX).toBe(BASKET_WIDTH / 2);
    expect(setBasketX(state, 500).basketX).toBe(FIELD_SIZE - BASKET_WIDTH / 2);
    expect(moveBasket(state, 10).basketX).toBe(state.basketX + 10);
  });

  it("NH-11: spawns an item on the first tick, deterministically", () => {
    const next = tickCatch(createCatchGame(), 50, () => 0.5, NORMAL_CATCH);
    expect(next.items).toHaveLength(1);
    expect(next.items[0]?.kind).toBe("good");
    expect(next.nextId).toBe(1);
  });

  it("NH-11: items fall at the configured speed", () => {
    const state = withItems([goodAt(10, 0)]);
    const next = tickCatch(state, 1000, () => 0.5, NORMAL_CATCH);
    expect(next.items[0]?.y).toBeCloseTo(NORMAL_CATCH.speed);
  });

  it("NH-11: the gentle variant falls slower than the normal one", () => {
    expect(GENTLE_CATCH.speed).toBeLessThan(NORMAL_CATCH.speed);
    expect(GENTLE_CATCH.spawnEveryMs).toBeGreaterThan(
      NORMAL_CATCH.spawnEveryMs,
    );
  });

  it("NH-11: catching a good item scores a point", () => {
    const state = withItems([goodAt(50, BASKET_Y - 1)]);
    const next = tickCatch(state, 1000, () => 0.5, NORMAL_CATCH);
    expect(next.score).toBe(1);
    expect(next.items).toHaveLength(0);
  });

  it("NH-11: missing a good item costs nothing", () => {
    const state = withItems([goodAt(5, BASKET_Y - 1)]);
    const next = tickCatch(state, 1000, () => 0.5, NORMAL_CATCH);
    expect(next.score).toBe(0);
    expect(next.lives).toBe(START_LIVES);
    expect(next.items).toHaveLength(0);
  });

  it("NH-11: catching a bad item costs a life and the game ends at zero lives", () => {
    const bad: FallingItem = { id: 1, x: 50, y: BASKET_Y - 1, kind: "bad" };
    const next = tickCatch(
      withItems([bad], { lives: 1 }),
      1000,
      () => 0.5,
      NORMAL_CATCH,
    );
    expect(next.lives).toBe(0);
    expect(next.status).toBe("over");
  });

  it("NH-11: the game ends when time runs out and then stays unchanged", () => {
    const over = tickCatch(
      withItems([], { elapsedMs: NORMAL_CATCH.durationMs - 10 }),
      50,
      () => 0.5,
      NORMAL_CATCH,
    );
    expect(over.status).toBe("over");
    expect(tickCatch(over, 50, () => 0.5, NORMAL_CATCH)).toBe(over);
  });
});
