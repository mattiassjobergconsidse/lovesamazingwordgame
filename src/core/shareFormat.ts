import type { WordPair, WordSet } from "../types";
import { FORMAT_VERSION, parseExport, type ParseOutcome } from "./exportFormat";

/** Version of the compact share payload (NH-5). */
export const SHARE_VERSION = 1;

/** Largest payload text accepted when opening a link, so a crafted link cannot exhaust memory. */
export const SHARE_MAX_CHARS = 2_000_000;

/** Link length above which some browsers and chat apps may cut the link. */
export const SHARE_LONG_LINK_CHARS = 8000;

/**
 * Compact JSON of a set for sharing: only name, languages, speech codes and
 * words. Progress, ids and timestamps stay private.
 *
 * @param set The set to share.
 * @param pairs The set's word pairs, in order.
 */
export function buildSharePayload(
  set: WordSet,
  pairs: readonly WordPair[],
): string {
  return JSON.stringify({
    v: SHARE_VERSION,
    n: set.name,
    a: set.langA,
    b: set.langB,
    ...(set.langACode === undefined ? {} : { ac: set.langACode }),
    ...(set.langBCode === undefined ? {} : { bc: set.langBCode }),
    p: pairs.map((pair) => [
      pair.a,
      pair.b,
      ...(pair.altA === undefined && pair.altB === undefined
        ? []
        : [pair.altA ?? [], pair.altB ?? []]),
    ]),
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asList(value: unknown): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items: unknown[] = value;
  return items;
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Reads a share payload into a set bundle. The data is rebuilt as a regular
 * export and run through the strict import validation (FR-IO-2).
 *
 * @param text Payload JSON produced by {@link buildSharePayload}.
 * @param now Epoch ms used for the created and updated timestamps.
 * @returns The set, or the problems found; never partial data.
 */
export function parseSharePayload(text: string, now: number): ParseOutcome {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return { ok: false, problems: [{ path: "", reason: "invalidJson" }] };
  }
  if (!isRecord(root)) {
    return { ok: false, problems: [{ path: "", reason: "notAnObject" }] };
  }
  if (root.v !== SHARE_VERSION) {
    return {
      ok: false,
      problems: [{ path: "v", reason: "unsupportedVersion" }],
    };
  }
  const rows = asList(root.p);
  if (rows === undefined) {
    return { ok: false, problems: [{ path: "p", reason: "wrongType" }] };
  }

  const setId = "shared";
  const pairs = rows.map((row, index) => {
    const cells = asList(row) ?? [];
    return {
      id: `p${String(index)}`,
      setId,
      a: cells[0],
      b: cells[1],
      ...(hasItems(cells[2]) ? { altA: cells[2] } : {}),
      ...(hasItems(cells[3]) ? { altB: cells[3] } : {}),
      createdAt: now,
      updatedAt: now,
    };
  });
  return parseExport(
    JSON.stringify({
      formatVersion: FORMAT_VERSION,
      exportedAt: now,
      sets: [
        {
          id: setId,
          name: root.n,
          langA: root.a,
          langB: root.b,
          ...(root.ac === undefined ? {} : { langACode: root.ac }),
          ...(root.bc === undefined ? {} : { langBCode: root.bc }),
          createdAt: now,
          updatedAt: now,
        },
      ],
      pairs,
    }),
  );
}
