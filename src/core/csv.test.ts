import { describe, expect, it } from "vitest";
import { csvToBundle, nameFromFileName, parseCsv, toCsv } from "./csv";
import { MAX_IMPORT_PAIRS } from "./importLimits";

describe("toCsv", () => {
  it("FR-IO-3: writes a BOM, a header with the language labels and one row per pair", () => {
    const text = toCsv({ langA: "Svenska", langB: "English" }, [
      { a: "hus", b: "house" },
      { a: "stor", b: "big", altB: ["large"] },
    ]);

    expect(text).toBe(
      "\uFEFFSvenska,English\r\nhus,house\r\nstor,big; large\r\n",
    );
  });

  it("FR-IO-3: quotes cells with commas, quotes and line breaks", () => {
    const text = toCsv({ langA: "A", langB: "B" }, [
      { a: 'say "hi", please', b: "line\nbreak" },
    ]);

    expect(text).toBe('\uFEFFA,B\r\n"say ""hi"", please","line\nbreak"\r\n');
  });

  it("FR-IO-3: round-trips through parseCsv, including å, ä, ö and emoji", () => {
    const text = toCsv({ langA: "Svenska", langB: "English" }, [
      { a: 'blå, "grön"', b: "blue 🎉", altA: ["blått"] },
      { a: "öl", b: "beer" },
    ]);

    expect(parseCsv(text)).toEqual({
      ok: true,
      langA: "Svenska",
      langB: "English",
      rows: [
        { a: 'blå, "grön"', b: "blue 🎉", altA: ["blått"], altB: [] },
        { a: "öl", b: "beer", altA: [], altB: [] },
      ],
    });
  });

  it.each(["=SUM(A1)", "+1", "-2+3", "@cmd", "\tx", "\rx"])(
    "FR-IO-3: neutralises the formula trigger in %j on export",
    (value) => {
      const text = toCsv({ langA: "A", langB: "B" }, [{ a: value, b: "ok" }]);

      expect(text).toContain(`'${value}`);
      expect(text.startsWith("\uFEFFA,B\r\n")).toBe(true);
    },
  );

  it("FR-IO-3: neutralises a formula in a language label", () => {
    const text = toCsv({ langA: "=1+1", langB: "B" }, [{ a: "a", b: "b" }]);

    expect(text.startsWith("\uFEFF'=1+1,B")).toBe(true);
  });

  it("FR-IO-3: leaves ordinary text and inner trigger characters alone", () => {
    const text = toCsv({ langA: "A", langB: "B" }, [
      { a: "well-known", b: "a=b" },
    ]);

    expect(text).toBe("\uFEFFA,B\r\nwell-known,a=b\r\n");
  });

  it("FR-IO-3: round-trips words that start with a trigger character", () => {
    const text = toCsv({ langA: "A", langB: "B" }, [
      { a: "-ing", b: "=suffix" },
      { a: "@home", b: "+plus" },
    ]);

    expect(parseCsv(text)).toMatchObject({
      ok: true,
      rows: [
        { a: "-ing", b: "=suffix" },
        { a: "@home", b: "+plus" },
      ],
    });
  });
});

describe("parseCsv", () => {
  it.each([
    ["comma", "Sv,En\nhus,house\nbil,car"],
    ["semicolon", "Sv;En\nhus;house\nbil;car"],
    ["tab", "Sv\tEn\nhus\thouse\nbil\tcar"],
    ["CRLF and BOM", "\uFEFFSv,En\r\nhus,house\r\nbil,car\r\n"],
  ])("FR-IO-3: accepts %s as separator", (_label, text) => {
    const result = parseCsv(text);

    expect(result).toMatchObject({ ok: true, langA: "Sv", langB: "En" });
    expect(result.ok && result.rows.map((row) => row.a)).toEqual([
      "hus",
      "bil",
    ]);
  });

  it("FR-IO-3: keeps line breaks inside quoted cells and skips blank lines", () => {
    const result = parseCsv('A,B\n\n"one\ntwo",x\n\n');

    expect(result.ok && result.rows).toEqual([
      { a: "one\ntwo", b: "x", altA: [], altB: [] },
    ]);
  });

  it("FR-IO-3: splits alternatives on semicolons within a quoted cell", () => {
    const result = parseCsv('A;B\n"big; large";stor');

    expect(result.ok && result.rows[0]).toEqual({
      a: "big",
      b: "stor",
      altA: ["large"],
      altB: [],
    });
  });

  it("FR-IO-3: reports bad rows by line number and imports nothing", () => {
    const result = parseCsv('A,B\nok,fine\nonlyone\n,empty\n"a\nb",ok\nbad');

    expect(result).toEqual({
      ok: false,
      problems: [
        { path: "line 3", reason: "missing" },
        { path: "line 4", reason: "empty" },
        { path: "line 7", reason: "missing" },
      ],
    });
  });

  it("FR-IO-3: rejects an empty file and a file with only a header", () => {
    expect(parseCsv("")).toEqual({
      ok: false,
      problems: [{ path: "", reason: "empty" }],
    });
    expect(parseCsv("\uFEFFA,B\r\n")).toEqual({
      ok: false,
      problems: [{ path: "", reason: "empty" }],
    });
  });

  it("FR-IO-3: rejects missing or too long language labels", () => {
    const result = parseCsv(`,${"x".repeat(31)}\na,b`);

    expect(result).toEqual({
      ok: false,
      problems: [
        { path: "line 1 A", reason: "empty" },
        { path: "line 1 B", reason: "tooLong" },
      ],
    });
  });

  it("FR-IO-3: keeps an apostrophe that does not guard a formula", () => {
    const result = parseCsv("A,B\n'hello,'=x'");

    expect(result.ok && result.rows[0]).toMatchObject({ a: "'hello" });
  });

  it("FR-IO-3: rejects a file with more rows than the limit", () => {
    const rows = Array.from({ length: MAX_IMPORT_PAIRS + 1 }, () => "a,b");

    expect(parseCsv(["A,B", ...rows].join("\n"))).toEqual({
      ok: false,
      problems: [{ path: "", reason: "tooLarge" }],
    });
  });
});

describe("csvToBundle", () => {
  it("FR-IO-3: builds a set without progress and keeps the row order", () => {
    const parsed = parseCsv("Sv,En\nhus,house\nbil,car; auto");
    if (!parsed.ok) {
      throw new Error("expected a valid CSV");
    }
    let counter = 0;
    const bundle = csvToBundle(parsed, "  Week 1  ", 1000, () => {
      counter += 1;
      return `id-${String(counter)}`;
    });

    expect(bundle.set).toEqual({
      id: "id-1",
      name: "Week 1",
      langA: "Sv",
      langB: "En",
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(bundle.pairs.map((pair) => [pair.a, pair.createdAt])).toEqual([
      ["hus", 1000],
      ["bil", 1001],
    ]);
    expect(bundle.pairs[1]).toMatchObject({ setId: "id-1", altB: ["auto"] });
    expect(bundle.progress).toEqual([]);
  });
});

describe("nameFromFileName", () => {
  it.each([
    ["week1.csv", "week1"],
    ["my.words.csv", "my.words"],
    ["noextension", "noextension"],
    [".csv", "Import"],
    ["", "Import"],
  ])("turns %j into %j", (fileName, expected) => {
    expect(nameFromFileName(fileName)).toBe(expected);
  });

  it("truncates to the name limit", () => {
    expect(nameFromFileName(`${"x".repeat(80)}.csv`)).toHaveLength(60);
  });
});