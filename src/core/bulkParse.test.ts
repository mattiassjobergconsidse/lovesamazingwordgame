import { describe, expect, it } from "vitest";
import { parseBulkText } from "./bulkParse";

describe("parseBulkText", () => {
  it("FR-SET-8: parses tab, semicolon and dash separated lines", () => {
    const result = parseBulkText("hund\tdog\nkatt;cat\r\nhäst - horse\n");

    expect(result.invalid).toEqual([]);
    expect(result.pairs.map(({ a, b }) => [a, b])).toEqual([
      ["hund", "dog"],
      ["katt", "cat"],
      ["häst", "horse"],
    ]);
  });

  it("FR-SET-8: skips blank lines but keeps original line numbers", () => {
    const result = parseBulkText("a;b\n\n   \nnonsense");

    expect(result.pairs).toHaveLength(1);
    expect(result.invalid).toEqual([
      { lineNumber: 4, text: "nonsense", problem: "missingSeparator" },
    ]);
  });

  it("FR-SET-8: lists lines with an empty side or too many separators", () => {
    const result = parseBulkText("a;\n;b\nx;y;z\na - b - c\n1\t2\t3");

    expect(result.pairs).toEqual([]);
    expect(result.invalid.map((line) => line.problem)).toEqual([
      "emptyTerm",
      "emptyTerm",
      "ambiguous",
      "ambiguous",
      "ambiguous",
    ]);
  });

  it("FR-SET-7: allows alternatives inside tab-separated columns", () => {
    const result = parseBulkText("stor\tbig; large");

    expect(result.pairs).toEqual([
      { a: "stor", b: "big", altA: [], altB: ["large"] },
    ]);
  });

  it("FR-SET-8: returns nothing for empty input", () => {
    expect(parseBulkText("")).toEqual({ pairs: [], invalid: [] });
  });
});
