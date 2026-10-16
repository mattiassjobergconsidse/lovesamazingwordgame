import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DatabaseProvider } from "../components/common/DatabaseProvider";
import { LibraryProvider } from "../components/common/LibraryProvider";
import { SettingsProvider } from "../components/common/SettingsProvider";
import { deleteAppDatabase, makeSettings } from "../../tests/factories";
import { seedDatabase, setWithPairs } from "../../tests/seed";
import type { AnswerResult } from "../types";
import { useLibrary } from "./useLibrary";
import { useSettings } from "./useSettings";
import {
  useTrainingSession,
  type TrainingEnvironment,
} from "./useTrainingSession";

function Wrapper({ children }: { readonly children: ReactNode }) {
  return (
    <DatabaseProvider>
      <SettingsProvider>
        <LibraryProvider>{children}</LibraryProvider>
      </SettingsProvider>
    </DatabaseProvider>
  );
}

const environment: TrainingEnvironment = { now: () => 1000, rng: () => 0.5 };

async function renderSession(
  setId: string,
  env?: TrainingEnvironment,
  focus?: "all" | "hardest",
) {
  const view = renderHook(
    () => ({
      session: useTrainingSession(setId, env, focus),
      library: useLibrary(),
      settings: useSettings(),
    }),
    { wrapper: Wrapper },
  );
  await waitFor(() => {
    expect(view.result.current.library.status).toBe("ready");
    expect(view.result.current.settings.ready).toBe(true);
  });
  return view;
}

afterEach(async () => {
  localStorage.clear();
  await deleteAppDatabase();
});

describe("useTrainingSession", () => {
  it("FR-TRN-4: ignores answers while no session is running", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({ sets: [set], pairs });
    const { result } = await renderSession(set.id, environment);

    act(() => {
      result.current.session.answer("correct");
      result.current.session.answerRound(
        new Map([[pairs[0]?.id ?? "", "correct"]]),
      );
      result.current.session.practiseMistakes();
    });

    expect(result.current.session.view).toEqual({ status: "idle" });
    expect(result.current.session.card).toBeNull();
  });

  it("FR-TRN-4: ignores an answer when the session has no card", async () => {
    const { set } = setWithPairs("Empty", []);
    await seedDatabase({ sets: [set] });
    const { result } = await renderSession(set.id, environment);

    act(() => {
      result.current.session.start();
    });
    act(() => {
      result.current.session.answer("correct");
    });

    expect(result.current.session.view.status).toBe("running");
    expect(result.current.session.card).toBeNull();
  });

  it("FR-TRN-5: re-queues a wrong word, finishes and practises mistakes", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ sessionSize: 10 }),
    });
    const { result } = await renderSession(set.id, environment);
    expect(result.current.session.plannedCount).toBe(2);

    act(() => {
      result.current.session.start();
    });
    for (const answer of [
      "wrong",
      "correct",
      "correct",
    ] satisfies AnswerResult[]) {
      act(() => {
        result.current.session.answer(answer);
      });
    }

    expect(result.current.session.view).toMatchObject({
      status: "finished",
      durationMs: 0,
    });

    act(() => {
      result.current.session.practiseMistakes();
    });
    expect(result.current.session.view.status).toBe("running");
    expect(result.current.session.card).not.toBeNull();
  });

  it("FR-MT-3: answers a round at once, partly and then completely", async () => {
    const { set, pairs } = setWithPairs("Week 1", [
      ["hus", "house"],
      ["bil", "car"],
    ]);
    await seedDatabase({
      sets: [set],
      pairs,
      settings: makeSettings({ sessionSize: "all" }),
    });
    const { result } = await renderSession(set.id);
    expect(result.current.session.plannedCount).toBe(2);

    act(() => {
      result.current.session.start();
    });
    act(() => {
      result.current.session.answerRound(new Map());
    });
    expect(result.current.session.view.status).toBe("running");

    const first = result.current.session.card?.pair.id ?? "";
    act(() => {
      result.current.session.answerRound(new Map([[first, "assisted"]]));
    });
    expect(result.current.session.view.status).toBe("running");

    const second = result.current.session.card?.pair.id ?? "";
    act(() => {
      result.current.session.answerRound(new Map([[second, "correct"]]));
    });
    expect(result.current.session.view.status).toBe("finished");
  });

  it("FR-ST-2: plans a session from the hardest words only", async () => {
    const { set, pairs } = setWithPairs("Week 1", [["hus", "house"]]);
    await seedDatabase({ sets: [set], pairs });
    const { result } = await renderSession(set.id, environment, "hardest");

    expect(result.current.session.plannedCount).toBe(0);
    expect(result.current.session.extraPractice).toBe(false);
  });
});
