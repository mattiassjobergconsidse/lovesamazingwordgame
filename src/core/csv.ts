import { formatTerms, parseTerms } from "./pairText";
import type { ImportProblem, SetBundle } from "./exportFormat";
import { LANGUAGE_LABEL_MAX, SET_NAME_MAX } from "./setValidation";
import type { WordPair, WordSet } from "../types";

const BOM = "\uFEFF";
const DELIMITERS = [",", ";", "\t"] as const;
const MAX_PROBLEMS = 50;

/** One data row of a CSV file, split into main terms and alternatives. */
export interface CsvRow {
  readonly a: string;
  readonly b: string;
  readonly altA: readonly string[];
  readonly altB: readonly string[];
}

export type CsvOutcome =
  | {
      readonly ok: true;
      readonly langA: string;
      readonly langB: string;
      readonly rows: readonly CsvRow[];
    }
  | { readonly ok: false; readonly problems: readonly ImportProblem[] };

function quoteCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Exports one set as CSV (FR-IO-3): a header row with the language labels,
 * then one row per pair; alternatives follow the main term after `; `.
 *
 * @returns Text starting with a byte order mark so Excel reads UTF-8, rows separated by CRLF.
 */
export function toCsv(
  set: Pick<WordSet, "langA" | "langB">,
  pairs: readonly Pick<WordPair, "a" | "b" | "altA" | "altB">[],
): string {
  const rows = [
    [set.langA, set.langB],
    ...pairs.map((pair) => [
      formatTerms(pair.a, pair.altA),
      formatTerms(pair.b, pair.altB),
    ]),
  ];
  return (
    BOM + rows.map((row) => row.map(quoteCell).join(",")).join("\r\n") + "\r\n"
  );
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? "";
  let best = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

interface CsvRecord {
  readonly line: number;
  readonly cells: readonly string[];
}

/** Splits CSV text into records, honouring quoted cells with delimiters, quotes and line breaks. */
function tokenize(text: string, delimiter: string): readonly CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = () => {
    cells.push(cell);
    if (cells.some((value) => value.trim() !== "")) {
      records.push({ line: recordLine, cells });
    }
    cells = [];
    cell = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (inQuotes) {
      if (char === '"' && text.charAt(index + 1) === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        if (char === "\n") {
          line += 1;
        }
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text.charAt(index + 1) === "\n") {
        index += 1;
      }
      endRecord();
      line += 1;
      recordLine = line;
    } else {
      cell += char;
    }
  }
  endRecord();
  return records;
}

/**
 * Parses CSV text with a header row of language labels (FR-IO-3).
 * Accepts `,`, `;` and tab as separators (detected from the header), a leading
 * byte order mark, quoted cells and CRLF or LF line breaks.
 *
 * @returns The labels and rows, or every problem found; a file with any
 *   problem yields no rows at all.
 */
export function parseCsv(text: string): CsvOutcome {
  const content = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const records = tokenize(content, detectDelimiter(content));
  const [header, ...body] = records;
  const problems: ImportProblem[] = [];
  const report = (path: string, reason: ImportProblem["reason"]) => {
    if (problems.length < MAX_PROBLEMS) {
      problems.push({ path, reason });
    }
  };

  if (header === undefined) {
    return { ok: false, problems: [{ path: "", reason: "empty" }] };
  }
  const langA = header.cells[0]?.trim() ?? "";
  const langB = header.cells[1]?.trim() ?? "";
  for (const [label, column] of [
    [langA, "A"],
    [langB, "B"],
  ] as const) {
    const path = `line ${String(header.line)} ${column}`;
    if (label === "") {
      report(path, "empty");
    } else if (label.length > LANGUAGE_LABEL_MAX) {
      report(path, "tooLong");
    }
  }

  const rows: CsvRow[] = [];
  for (const record of body) {
    const termsA = parseTerms(record.cells[0] ?? "");
    const termsB = parseTerms(record.cells[1] ?? "");
    const path = `line ${String(record.line)}`;
    if (record.cells.length < 2) {
      report(path, "missing");
    } else if (termsA.main === "" || termsB.main === "") {
      report(path, "empty");
    } else {
      rows.push({
        a: termsA.main,
        b: termsB.main,
        altA: termsA.alternatives,
        altB: termsB.alternatives,
      });
    }
  }
  if (body.length === 0) {
    report("", "empty");
  }
  return problems.length > 0
    ? { ok: false, problems }
    : { ok: true, langA, langB, rows };
}

/** Name suggested for a set imported from a file: the file name without extension. */
export function nameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]*$/, "").trim();
  return base === "" ? "Import" : base.slice(0, SET_NAME_MAX).trim();
}

/**
 * Turns parsed CSV rows into a set bundle with fresh ids and no progress.
 *
 * @param outcome A successful parse.
 * @param name Set name; the import plan resolves clashes with existing sets.
 * @param now Epoch ms for the timestamps.
 * @param newId Id generator, injected for deterministic tests.
 */
export function csvToBundle(
  outcome: Extract<CsvOutcome, { readonly ok: true }>,
  name: string,
  now: number,
  newId: () => string,
): SetBundle {
  const set: WordSet = {
    id: newId(),
    name: name.trim().slice(0, SET_NAME_MAX).trim(),
    langA: outcome.langA,
    langB: outcome.langB,
    createdAt: now,
    updatedAt: now,
  };
  const pairs = outcome.rows.map((row, index): WordPair => ({
    id: newId(),
    setId: set.id,
    a: row.a,
    b: row.b,
    ...(row.altA.length > 0 ? { altA: row.altA } : {}),
    ...(row.altB.length > 0 ? { altB: row.altB } : {}),
    // Rows keep the file order in the editor, which sorts by creation time.
    createdAt: now + index,
    updatedAt: now,
  }));
  return { set, pairs, progress: [], activity: [] };
}
