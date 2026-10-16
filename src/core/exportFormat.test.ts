import { describe, expect, it } from "vitest";
import { makePair, makeProgress, makeSet } from "../../tests/factories";
import type { DailyActivity } from "../types";
import {
  buildExport,
  fileSlug,
  parseExport,
  type ExportSource,
} from "./exportFormat";

function sourceWithTwoSets() {
  const week1 = makeSet({ id: "s1", name: "Week 1" });
  const week2 = makeSet({ id: "s2", name: "Week 2" });
  const pairs = [
    makePair({ id: "p1", setId: "s1", a: "hus", b: "house", altB: ["home"] }),
    makePair({ id: "p2", setId: "s2", a: "bil", b: "car" }),
  ];
  const activity: DailyActivity = {
    id: "s1:2026-10-16",
    setId: "s1",
    date: "2026-10-16",
    answered: 2,
    correct: 1,
  };
  const source: ExportSource = {
    sets: [week1, week2],
    pairs,
    progress: [
      makeProgress({ pairId: "p1", setId: "s1", box: 2 }),
      makeProgress({ pairId: "p2", setId: "s2" }),
    ],
    activity: [activity],
  };
  return source;
}

describe("buildExport", () => {
  it("FR-IO-1: exports only the chosen sets with their pairs", () => {
    const file = buildExport(sourceWithTwoSets(), ["s2"], false, 123);

    expect(file.formatVersion).toBe(1);
    expect(file.exportedAt).toBe(123);
    expect(file.sets.map((set) => set.id)).toEqual(["s2"]);
    expect(file.pairs.map((pair) => pair.id)).toEqual(["p2"]);
  });

  it("FR-IO-1: leaves progress and activity out unless asked for", () => {
    const without = buildExport(sourceWithTwoSets(), ["s1"], false, 0);
    const withProgress = buildExport(sourceWithTwoSets(), ["s1"], true, 0);

    expect(without).not.toHaveProperty("progress");
    expect(without).not.toHaveProperty("activity");
    expect(withProgress.progress?.map((record) => record.pairId)).toEqual([
      "p1",
    ]);
    expect(withProgress.activity).toHaveLength(1);
  });

  it("FR-IO-1: ignores unknown set ids", () => {
    expect(buildExport(sourceWithTwoSets(), ["nope"], true, 0).sets).toEqual(
      [],
    );
  });
});

describe("fileSlug", () => {
  it.each([
    ["Week 1", "week-1"],
    ["  Gloslista: på åäö!  ", "gloslista-pa-aao"],
    ["???", "set"],
  ])("turns %j into %j", (name, expected) => {
    expect(fileSlug(name)).toBe(expected);
  });
});

describe("parseExport", () => {
  it("FR-IO-1, FR-IO-2: round-trips an export including progress", () => {
    const source = sourceWithTwoSets();
    const text = JSON.stringify(buildExport(source, ["s1", "s2"], true, 5));

    const result = parseExport(text);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.bundles.map((bundle) => bundle.set)).toEqual(source.sets);
    expect(result.bundles[0]?.pairs).toEqual([source.pairs[0]]);
    expect(result.bundles[0]?.progress).toEqual([source.progress[0]]);
    expect(result.bundles[0]?.activity).toEqual(source.activity);
    expect(result.bundles[1]?.activity).toEqual([]);
  });

  it("FR-IO-2: accepts a file without progress", () => {
    const text = JSON.stringify(
      buildExport(sourceWithTwoSets(), ["s1"], false, 5),
    );
    const result = parseExport(text);

    expect(result.ok && result.bundles[0]?.progress).toEqual([]);
  });

  it("FR-IO-2: keeps å, ä, ö and emoji intact", () => {
    const set = makeSet({ id: "s1", name: "Gloslista åäö 🎉" });
    const pair = makePair({ id: "p1", setId: "s1", a: "ö", b: "🎉" });
    const text = JSON.stringify(
      buildExport(
        { sets: [set], pairs: [pair], progress: [], activity: [] },
        ["s1"],
        false,
        0,
      ),
    );

    const result = parseExport(text);

    expect(result.ok && result.bundles[0]?.set.name).toBe("Gloslista åäö 🎉");
    expect(result.ok && result.bundles[0]?.pairs[0]?.b).toBe("🎉");
  });

  it.each([
    ["not json", "{oops", "invalidJson"],
    ["an array", "[]", "notAnObject"],
    ["a string", '"hi"', "notAnObject"],
  ])("FR-IO-2: rejects %s", (_label, text, reason) => {
    expect(parseExport(text)).toEqual({
      ok: false,
      problems: [{ path: "", reason }],
    });
  });

  it("FR-IO-2: rejects a missing or unknown format version", () => {
    expect(parseExport('{"sets":[],"pairs":[]}')).toEqual({
      ok: false,
      problems: [{ path: "formatVersion", reason: "missing" }],
    });
    expect(parseExport('{"formatVersion":2,"sets":[],"pairs":[]}')).toEqual({
      ok: false,
      problems: [{ path: "formatVersion", reason: "unsupportedVersion" }],
    });
  });

  it("FR-IO-2: reports every problem with its location and imports nothing", () => {
    const file = {
      formatVersion: 1,
      sets: [
        {
          id: "s1",
          name: "",
          langA: "A",
          langB: "B",
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: "s2",
          name: "Ok",
          langA: "x".repeat(31),
          langB: "B",
          createdAt: "1",
          updatedAt: 1,
        },
      ],
      pairs: [{ id: "p1", setId: "s1", a: "hus", createdAt: 1, updatedAt: 1 }],
    };

    const result = parseExport(JSON.stringify(file));

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.problems).toEqual(
      expect.arrayContaining([
        { path: "sets[0].name", reason: "empty" },
        { path: "sets[1].langA", reason: "tooLong" },
        { path: "sets[1].createdAt", reason: "wrongType" },
        { path: "pairs[0].b", reason: "missing" },
      ]),
    );
  });

  it("FR-IO-2: rejects references to unknown sets and pairs and duplicates", () => {
    const set = {
      name: "A",
      langA: "a",
      langB: "b",
      createdAt: 1,
      updatedAt: 1,
    };
    const pair = { a: "x", b: "y", createdAt: 1, updatedAt: 1 };
    const file = {
      formatVersion: 1,
      sets: [
        { id: "s1", ...set },
        { id: "s2", ...set, name: "a" },
      ],
      pairs: [
        { id: "p1", setId: "ghost", ...pair },
        { id: "p1", setId: "s1", ...pair },
      ],
      progress: [
        {
          pairId: "ghost",
          setId: "s1",
          box: 9,
          dueAt: 0,
          correct: 0,
          wrong: 0,
          lastSeenAt: null,
          streak: 0,
        },
      ],
      activity: [{ setId: "ghost", date: "16 Oct", answered: 1, correct: 2 }],
    };

    const result = parseExport(JSON.stringify(file));

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    const found = result.problems.map(
      (problem) => `${problem.path}:${problem.reason}`,
    );
    expect(found).toEqual(
      expect.arrayContaining([
        "sets[1]:duplicateName",
        "pairs[0].setId:unknownReference",
        "pairs[1]:duplicateId",
        "progress[0].box:outOfRange",
        "activity[0].date:wrongType",
      ]),
    );
  });

  it("FR-IO-2: rejects a progress record pointing at an unknown pair", () => {
    const file = {
      formatVersion: 1,
      sets: [
        {
          id: "s1",
          name: "A",
          langA: "a",
          langB: "b",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      pairs: [],
      progress: [
        {
          pairId: "ghost",
          setId: "s1",
          box: 1,
          dueAt: 0,
          correct: 0,
          wrong: 0,
          lastSeenAt: null,
          streak: 0,
        },
      ],
    };

    expect(parseExport(JSON.stringify(file))).toEqual({
      ok: false,
      problems: [{ path: "progress[0].pairId", reason: "unknownReference" }],
    });
  });

  it("FR-IO-2: rejects a file without any set", () => {
    expect(parseExport('{"formatVersion":1,"sets":[],"pairs":[]}')).toEqual({
      ok: false,
      problems: [{ path: "sets", reason: "empty" }],
    });
  });

  it("FR-IO-2: caps the number of reported problems", () => {
    const pairs = Array.from({ length: 200 }, () => ({}));
    const result = parseExport(
      JSON.stringify({ formatVersion: 1, sets: [], pairs }),
    );

    expect(!result.ok && result.problems.length).toBe(50);
  });

  it("FR-IO-2: accepts optional language codes, alternatives and dates", () => {
    const file = {
      formatVersion: 1,
      sets: [
        {
          id: "s1",
          name: "A",
          langA: "a",
          langB: "b",
          langACode: "sv",
          langBCode: "en",
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      pairs: [
        {
          id: "p1",
          setId: "s1",
          a: "x",
          b: "y",
          altA: [" z ", "  "],
          altB: ["  "],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      progress: [
        {
          pairId: "p1",
          setId: "s1",
          box: 3,
          dueAt: 0,
          correct: 1,
          wrong: 0,
          lastSeenAt: 7,
          streak: 1,
        },
      ],
      activity: [{ setId: "s1", date: "2026-10-16", answered: 2, correct: 2 }],
    };

    const result = parseExport(JSON.stringify(file));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const bundle = result.bundles[0];
    expect(bundle?.set.langACode).toBe("sv");
    expect(bundle?.set.langBCode).toBe("en");
    expect(bundle?.pairs[0]?.altA).toEqual(["z"]);
    expect(bundle?.pairs[0]?.altB).toBeUndefined();
    expect(bundle?.progress[0]?.lastSeenAt).toBe(7);
  });

  it("FR-IO-2: reports malformed lists, records and fields", () => {
    const set = {
      id: "s1",
      name: "A",
      langA: "a",
      langB: "b",
      createdAt: 1,
      updatedAt: 1,
    };
    const pair = { id: "p1", setId: "s1", a: "x", b: "y", ...{ createdAt: 1 } };
    const progress = {
      pairId: "p1",
      setId: "s1",
      box: 1,
      dueAt: 0,
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      streak: 0,
    };
    const file = {
      formatVersion: 1,
      sets: [set, 5, { ...set, id: "s2", name: "B", langACode: 1 }],
      pairs: [
        7,
        { ...pair, updatedAt: 1, altA: "no" },
        { ...pair, id: "p2", updatedAt: 1, altB: [1] },
        { ...pair, id: "p3", updatedAt: Number.NaN },
      ],
      progress: [
        "x",
        { ...progress, lastSeenAt: "x" },
        { ...progress, correct: -1 },
      ],
      activity: [
        null,
        { setId: "s1", date: "2026-10-16", answered: 1, correct: 2 },
        { setId: "s1", answered: 1, correct: 1 },
      ],
    };

    const result = parseExport(JSON.stringify(file));

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    const found = result.problems.map(
      (problem) => `${problem.path}:${problem.reason}`,
    );
    expect(found).toEqual(
      expect.arrayContaining([
        "sets[1]:notAnObject",
        "sets[2].langACode:wrongType",
        "pairs[0]:notAnObject",
        "pairs[1].altA:wrongType",
        "pairs[2].altB:wrongType",
        "progress[0]:notAnObject",
        "progress[1].lastSeenAt:wrongType",
        "progress[2].correct:outOfRange",
        "activity[0]:notAnObject",
        "activity[1].correct:outOfRange",
        "activity[2].date:missing",
      ]),
    );
  });

  it("FR-IO-2: rejects lists of the wrong type or missing", () => {
    const result = parseExport(
      JSON.stringify({ formatVersion: 1, sets: "x", progress: {} }),
    );

    expect(result).toEqual({
      ok: false,
      problems: [
        { path: "sets", reason: "wrongType" },
        { path: "pairs", reason: "missing" },
        { path: "progress", reason: "wrongType" },
      ],
    });
  });
});
