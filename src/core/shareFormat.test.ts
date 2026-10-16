import { describe, expect, it } from "vitest";
import { makePair, makeSet } from "../../tests/factories";
import { buildSharePayload, parseSharePayload } from "./shareFormat";

describe("share payload", () => {
  it("NH-5: round-trips a set with its words, alternatives and speech codes", () => {
    const set = makeSet({
      name: "Week 1",
      langA: "Svenska",
      langB: "English",
      langACode: "sv-SE",
      langBCode: "en-GB",
    });
    const pairs = [
      makePair({ setId: set.id, a: "hus", b: "house" }),
      makePair({
        setId: set.id,
        a: "bil",
        b: "car",
        altA: ["automobil"],
        altB: ["automobile", "vehicle"],
      }),
    ];

    const outcome = parseSharePayload(buildSharePayload(set, pairs), 5000);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    const [bundle] = outcome.bundles;
    expect(bundle?.set).toMatchObject({
      name: "Week 1",
      langA: "Svenska",
      langB: "English",
      langACode: "sv-SE",
      langBCode: "en-GB",
      createdAt: 5000,
    });
    expect(bundle?.pairs.map((pair) => [pair.a, pair.b])).toEqual([
      ["hus", "house"],
      ["bil", "car"],
    ]);
    expect(bundle?.pairs[1]?.altA).toEqual(["automobil"]);
    expect(bundle?.pairs[1]?.altB).toEqual(["automobile", "vehicle"]);
    expect(bundle?.pairs[0]?.altA).toBeUndefined();
    expect(bundle?.progress).toEqual([]);
  });

  it("NH-5: leaves ids, progress and timestamps out of the payload", () => {
    const set = makeSet({ id: "secret-set-id" });
    const pair = makePair({ id: "secret-pair-id", setId: set.id });

    const text = buildSharePayload(set, [pair]);

    expect(text).not.toContain("secret");
    expect(text).not.toContain("createdAt");
  });

  it.each([
    ["not json", "{"],
    ["not an object", "[]"],
    ["wrong version", JSON.stringify({ v: 2, n: "x", a: "a", b: "b", p: [] })],
    ["words missing", JSON.stringify({ v: 1, n: "x", a: "a", b: "b" })],
    [
      "an empty word",
      JSON.stringify({ v: 1, n: "x", a: "a", b: "b", p: [["hus", ""]] }),
    ],
    [
      "a missing name",
      JSON.stringify({ v: 1, a: "a", b: "b", p: [["hus", "house"]] }),
    ],
    [
      "a row that is not a list",
      JSON.stringify({ v: 1, n: "x", a: "a", b: "b", p: ["hus"] }),
    ],
  ])("NH-5: rejects a payload with %s", (_label, text) => {
    expect(parseSharePayload(text, 1).ok).toBe(false);
  });
});
