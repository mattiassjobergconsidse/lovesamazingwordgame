import { describe, expect, it } from "vitest";
import { makePair, makeProgress, makeSet } from "../../tests/factories";
import type { SetBundle } from "./exportFormat";
import { findConflicts, planImport, type ConflictChoice } from "./importPlan";

function idGenerator() {
  let counter = 0;
  return () => {
    counter += 1;
    return `new-${String(counter)}`;
  };
}

function bundle(name: string, setId = "file-set"): SetBundle {
  return {
    set: makeSet({ id: setId, name }),
    pairs: [makePair({ id: `${setId}-p1`, setId, a: "hus", b: "house" })],
    progress: [
      makeProgress({ pairId: `${setId}-p1`, setId, box: 3, correct: 2 }),
    ],
    activity: [
      {
        id: `${setId}:2026-10-16`,
        setId,
        date: "2026-10-16",
        answered: 2,
        correct: 1,
      },
    ],
  };
}

const existing = [makeSet({ id: "old", name: "Week 1" })];

describe("findConflicts", () => {
  it("FR-IO-2: finds sets with an existing name, ignoring case and spaces", () => {
    const conflicts = findConflicts(
      [bundle(" WEEK 1 ", "a"), bundle("Week 2", "b")],
      existing,
    );

    expect(conflicts).toEqual([
      { incomingId: "a", name: " WEEK 1 ", existingId: "old" },
    ]);
  });
});

describe("planImport", () => {
  it("FR-IO-2: imports a set without conflict under its own name with fresh ids", () => {
    const plan = planImport(
      [bundle("Week 2")],
      existing,
      new Map(),
      idGenerator(),
    );

    expect(plan.removeSetIds).toEqual([]);
    expect(plan.sets).toMatchObject([{ id: "new-1", name: "Week 2" }]);
    expect(plan.pairs).toMatchObject([
      { id: "new-2", setId: "new-1", a: "hus" },
    ]);
    expect(plan.progress).toMatchObject([
      { pairId: "new-2", setId: "new-1", box: 3, correct: 2 },
    ]);
    expect(plan.activity).toMatchObject([
      { id: "new-1:2026-10-16", setId: "new-1", answered: 2 },
    ]);
  });

  it("FR-IO-2: renames a conflicting set by default", () => {
    const plan = planImport(
      [bundle("Week 1")],
      existing,
      new Map(),
      idGenerator(),
    );

    expect(plan.sets[0]?.name).toBe("Week 1 (2)");
    expect(plan.removeSetIds).toEqual([]);
  });

  it("FR-IO-2: renames around names that are already taken", () => {
    const taken = [...existing, makeSet({ id: "x", name: "Week 1 (2)" })];
    const plan = planImport(
      [bundle("Week 1")],
      taken,
      new Map<string, ConflictChoice>([["file-set", "rename"]]),
      idGenerator(),
    );

    expect(plan.sets[0]?.name).toBe("Week 1 (3)");
  });

  it("FR-IO-2: replace removes the existing set and keeps the name", () => {
    const plan = planImport(
      [bundle("Week 1")],
      existing,
      new Map<string, ConflictChoice>([["file-set", "replace"]]),
      idGenerator(),
    );

    expect(plan.removeSetIds).toEqual(["old"]);
    expect(plan.sets[0]?.name).toBe("Week 1");
    expect(plan.replacements).toEqual(new Map([["old", "new-1"]]));
  });

  it("FR-IO-2: skip leaves the set out completely", () => {
    const plan = planImport(
      [bundle("Week 1", "a"), bundle("Week 2", "b")],
      existing,
      new Map<string, ConflictChoice>([["a", "skip"]]),
      idGenerator(),
    );

    expect(plan.sets.map((set) => set.name)).toEqual(["Week 2"]);
    expect(plan.pairs).toHaveLength(1);
    expect(plan.removeSetIds).toEqual([]);
  });

  it("FR-IO-2: importing the same file twice never reuses ids", () => {
    const next = idGenerator();
    const first = planImport([bundle("Fresh")], [], new Map(), next);
    const second = planImport([bundle("Fresh")], first.sets, new Map(), next);

    expect(second.sets[0]?.id).not.toBe(first.sets[0]?.id);
    expect(second.pairs[0]?.id).not.toBe(first.pairs[0]?.id);
    expect(second.sets[0]?.name).toBe("Fresh (2)");
  });

  it("FR-IO-2: handles a file without sets", () => {
    const plan = planImport([], existing, new Map(), idGenerator());

    expect(plan.sets).toEqual([]);
    expect(plan.removeSetIds).toEqual([]);
  });
});
