import { parseTerms } from "./pairText";

/** Why a pasted line could not be turned into a pair. */
export type BulkLineProblem = "missingSeparator" | "ambiguous" | "emptyTerm";

export interface BulkParsedPair {
  readonly a: string;
  readonly b: string;
  readonly altA: readonly string[];
  readonly altB: readonly string[];
}

export interface BulkInvalidLine {
  /** 1-based line number in the pasted text. */
  readonly lineNumber: number;
  readonly text: string;
  readonly problem: BulkLineProblem;
}

export interface BulkParseResult {
  readonly pairs: readonly BulkParsedPair[];
  readonly invalid: readonly BulkInvalidLine[];
}

function splitLine(line: string): readonly string[] | BulkLineProblem {
  if (line.includes("\t")) {
    const columns = line.split("\t");
    return columns.length === 2 ? columns : "ambiguous";
  }
  if (line.includes(";")) {
    const columns = line.split(";");
    return columns.length === 2 ? columns : "ambiguous";
  }
  if (line.includes(" - ")) {
    const columns = line.split(" - ");
    return columns.length === 2 ? columns : "ambiguous";
  }
  return "missingSeparator";
}

/**
 * Parses pasted lines into pairs (FR-SET-8). Supported separators, checked in this order:
 * tab, `;`, and ` - `. Within a tab-separated column, `;` still separates alternatives.
 *
 * @param text Pasted text with one pair per line; blank lines are ignored.
 * @returns The valid pairs and the invalid lines with the reason.
 */
export function parseBulkText(text: string): BulkParseResult {
  const pairs: BulkParsedPair[] = [];
  const invalid: BulkInvalidLine[] = [];

  text.split(/\r\n|\r|\n/).forEach((rawLine, index) => {
    if (rawLine.trim() === "") {
      return;
    }
    const lineNumber = index + 1;
    const columns = splitLine(rawLine);
    if (typeof columns === "string") {
      invalid.push({ lineNumber, text: rawLine, problem: columns });
      return;
    }
    const [left = "", right = ""] = columns;
    const termsA = parseTerms(left);
    const termsB = parseTerms(right);
    if (termsA.main === "" || termsB.main === "") {
      invalid.push({ lineNumber, text: rawLine, problem: "emptyTerm" });
      return;
    }
    pairs.push({
      a: termsA.main,
      b: termsB.main,
      altA: termsA.alternatives,
      altB: termsB.alternatives,
    });
  });

  return { pairs, invalid };
}
