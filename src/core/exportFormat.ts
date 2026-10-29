import type {
  Box,
  DailyActivity,
  WordPair,
  WordProgress,
  WordSet,
} from "../types";
import { LANGUAGE_LABEL_MAX, SET_NAME_MAX } from "./setValidation";
import { mergeTrophies } from "./trophies";
import { isTrophyId, type TrophyRecord } from "./trophyDefinitions";

/** Version written to and required from JSON files (FR-IO-1, FR-IO-2). */
export const FORMAT_VERSION = 1;
/** Upper bound of reported problems so a broken file cannot flood the screen. */
const MAX_PROBLEMS = 50;

/** One set with everything that belongs to it, as exported and imported. */
export interface SetBundle {
  readonly set: WordSet;
  readonly pairs: readonly WordPair[];
  readonly progress: readonly WordProgress[];
  readonly activity: readonly DailyActivity[];
}

/** Data the export can draw from; matches what the library keeps in memory. */
export interface ExportSource {
  readonly sets: readonly WordSet[];
  readonly pairs: readonly WordPair[];
  readonly progress: readonly WordProgress[];
  readonly activity: readonly DailyActivity[];
  /** Unlocked trophies (NH-10); they belong to the user, not to a set. */
  readonly trophies?: readonly TrophyRecord[];
}

/**
 * The JSON file format. `progress`, `activity` and `trophies` are left out when
 * not exported; files without `trophies` (older versions) stay valid.
 */
export interface ExportFile {
  readonly formatVersion: typeof FORMAT_VERSION;
  readonly exportedAt: number;
  readonly sets: readonly WordSet[];
  readonly pairs: readonly WordPair[];
  readonly progress?: readonly WordProgress[];
  readonly activity?: readonly DailyActivity[];
  readonly trophies?: readonly TrophyRecord[];
}

export type ProblemReason =
  | "invalidJson"
  | "notAnObject"
  | "unsupportedVersion"
  | "missing"
  | "wrongType"
  | "empty"
  | "tooLong"
  | "outOfRange"
  | "unknownReference"
  | "duplicateId"
  | "duplicateName"
  | "unreadable"
  | "tooLarge";

/** A validation problem; `path` locates it, e.g. `pairs[3].a`. */
export interface ImportProblem {
  readonly path: string;
  readonly reason: ProblemReason;
}

/** Outcome of reading a file: data, or every problem found (never a partial result). */
export type ParseOutcome =
  | {
      readonly ok: true;
      readonly bundles: readonly SetBundle[];
      /** Known trophies found in the file; absent when there are none. */
      readonly trophies?: readonly TrophyRecord[];
    }
  | { readonly ok: false; readonly problems: readonly ImportProblem[] };

/**
 * Builds the JSON export of some or all sets (FR-IO-1).
 *
 * @param source Sets, pairs, progress and activity to draw from.
 * @param setIds Sets to export, in this order; unknown ids are ignored.
 * @param includeProgress Whether progress and activity are included.
 * @param now Epoch ms stored as `exportedAt`.
 */
export function buildExport(
  source: ExportSource,
  setIds: readonly string[],
  includeProgress: boolean,
  now: number,
): ExportFile {
  const wanted = new Set(setIds);
  const sets = source.sets.filter((set) => wanted.has(set.id));
  const included = new Set(sets.map((set) => set.id));
  const base = {
    formatVersion: FORMAT_VERSION,
    exportedAt: now,
    sets,
    pairs: source.pairs.filter((pair) => included.has(pair.setId)),
  } as const;
  if (!includeProgress) {
    return base;
  }
  return {
    ...base,
    progress: source.progress.filter((record) => included.has(record.setId)),
    activity: source.activity.filter((day) => included.has(day.setId)),
    ...(source.trophies === undefined ? {} : { trophies: source.trophies }),
  };
}

/** Makes a set name safe for a file name: lower case, letters and digits joined by hyphens. */
export function fileSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "set" : slug;
}

type Report = (path: string, reason: ProblemReason) => void;
type Fields = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(
  fields: Fields,
  key: string,
  path: string,
  report: Report,
  max?: number,
): string | undefined {
  const where = `${path}.${key}`;
  const value = fields[key];
  if (value === undefined) {
    report(where, "missing");
    return undefined;
  }
  if (typeof value !== "string") {
    report(where, "wrongType");
    return undefined;
  }
  const text = value.trim();
  if (text === "") {
    report(where, "empty");
    return undefined;
  }
  if (max !== undefined && text.length > max) {
    report(where, "tooLong");
    return undefined;
  }
  return text;
}

function readOptionalText(
  fields: Fields,
  key: string,
  path: string,
  report: Report,
): { readonly value?: string; readonly valid: boolean } {
  if (fields[key] === undefined) {
    return { valid: true };
  }
  const value = readText(fields, key, path, report);
  return value === undefined ? { valid: false } : { value, valid: true };
}

function readNumber(
  fields: Fields,
  key: string,
  path: string,
  report: Report,
  options: { readonly min?: number; readonly max?: number } = {},
): number | undefined {
  const where = `${path}.${key}`;
  const value = fields[key];
  if (value === undefined) {
    report(where, "missing");
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    report(where, "wrongType");
    return undefined;
  }
  if (
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    report(where, "outOfRange");
    return undefined;
  }
  return value;
}

function readAlternatives(
  fields: Fields,
  key: string,
  path: string,
  report: Report,
): { readonly value?: readonly string[]; readonly valid: boolean } {
  const value = fields[key];
  const where = `${path}.${key}`;
  if (value === undefined) {
    return { valid: true };
  }
  if (!Array.isArray(value)) {
    report(where, "wrongType");
    return { valid: false };
  }
  const items: unknown[] = value;
  const texts: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") {
      report(where, "wrongType");
      return { valid: false };
    }
    if (item.trim() !== "") {
      texts.push(item.trim());
    }
  }
  return texts.length === 0 ? { valid: true } : { value: texts, valid: true };
}

function readList(
  fields: Fields,
  key: string,
  required: boolean,
  report: Report,
): readonly unknown[] | undefined {
  const value = fields[key];
  if (value === undefined) {
    if (required) {
      report(key, "missing");
    }
    return undefined;
  }
  if (!Array.isArray(value)) {
    report(key, "wrongType");
    return undefined;
  }
  const items: unknown[] = value;
  return items;
}

function readSet(raw: unknown, path: string, report: Report) {
  if (!isRecord(raw)) {
    report(path, "notAnObject");
    return undefined;
  }
  const id = readText(raw, "id", path, report);
  const name = readText(raw, "name", path, report, SET_NAME_MAX);
  const langA = readText(raw, "langA", path, report, LANGUAGE_LABEL_MAX);
  const langB = readText(raw, "langB", path, report, LANGUAGE_LABEL_MAX);
  const codeA = readOptionalText(raw, "langACode", path, report);
  const codeB = readOptionalText(raw, "langBCode", path, report);
  const createdAt = readNumber(raw, "createdAt", path, report);
  const updatedAt = readNumber(raw, "updatedAt", path, report);
  if (
    id === undefined ||
    name === undefined ||
    langA === undefined ||
    langB === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    !codeA.valid ||
    !codeB.valid
  ) {
    return undefined;
  }
  const set: WordSet = {
    id,
    name,
    langA,
    langB,
    ...(codeA.value === undefined ? {} : { langACode: codeA.value }),
    ...(codeB.value === undefined ? {} : { langBCode: codeB.value }),
    createdAt,
    updatedAt,
  };
  return set;
}

function readPair(raw: unknown, path: string, report: Report) {
  if (!isRecord(raw)) {
    report(path, "notAnObject");
    return undefined;
  }
  const id = readText(raw, "id", path, report);
  const setId = readText(raw, "setId", path, report);
  const a = readText(raw, "a", path, report);
  const b = readText(raw, "b", path, report);
  const altA = readAlternatives(raw, "altA", path, report);
  const altB = readAlternatives(raw, "altB", path, report);
  const createdAt = readNumber(raw, "createdAt", path, report);
  const updatedAt = readNumber(raw, "updatedAt", path, report);
  if (
    id === undefined ||
    setId === undefined ||
    a === undefined ||
    b === undefined ||
    createdAt === undefined ||
    updatedAt === undefined ||
    !altA.valid ||
    !altB.valid
  ) {
    return undefined;
  }
  const pair: WordPair = {
    id,
    setId,
    a,
    b,
    ...(altA.value === undefined ? {} : { altA: altA.value }),
    ...(altB.value === undefined ? {} : { altB: altB.value }),
    createdAt,
    updatedAt,
  };
  return pair;
}

function toBox(value: number): Box | undefined {
  switch (value) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return value;
    default:
      return undefined;
  }
}

function readProgress(raw: unknown, path: string, report: Report) {
  if (!isRecord(raw)) {
    report(path, "notAnObject");
    return undefined;
  }
  const pairId = readText(raw, "pairId", path, report);
  const setId = readText(raw, "setId", path, report);
  const boxNumber = readNumber(raw, "box", path, report);
  const dueAt = readNumber(raw, "dueAt", path, report);
  const correct = readNumber(raw, "correct", path, report, { min: 0 });
  const wrong = readNumber(raw, "wrong", path, report, { min: 0 });
  const streak = readNumber(raw, "streak", path, report, { min: 0 });
  const lastSeen = raw.lastSeenAt;
  let lastSeenAt: number | null | undefined;
  if (lastSeen === null) {
    lastSeenAt = null;
  } else {
    lastSeenAt = readNumber(raw, "lastSeenAt", path, report);
  }
  const box = boxNumber === undefined ? undefined : toBox(boxNumber);
  if (boxNumber !== undefined && box === undefined) {
    report(`${path}.box`, "outOfRange");
  }
  if (
    pairId === undefined ||
    setId === undefined ||
    box === undefined ||
    dueAt === undefined ||
    correct === undefined ||
    wrong === undefined ||
    streak === undefined ||
    lastSeenAt === undefined
  ) {
    return undefined;
  }
  const progress: WordProgress = {
    pairId,
    setId,
    box,
    dueAt,
    correct,
    wrong,
    lastSeenAt,
    streak,
  };
  return progress;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function readActivity(raw: unknown, path: string, report: Report) {
  if (!isRecord(raw)) {
    report(path, "notAnObject");
    return undefined;
  }
  const setId = readText(raw, "setId", path, report);
  const date = readText(raw, "date", path, report);
  const answered = readNumber(raw, "answered", path, report, { min: 0 });
  const correct = readNumber(raw, "correct", path, report, { min: 0 });
  if (date !== undefined && !DATE_KEY.test(date)) {
    report(`${path}.date`, "wrongType");
    return undefined;
  }
  if (answered !== undefined && correct !== undefined && correct > answered) {
    report(`${path}.correct`, "outOfRange");
    return undefined;
  }
  if (
    setId === undefined ||
    date === undefined ||
    answered === undefined ||
    correct === undefined
  ) {
    return undefined;
  }
  // The id is derived, so a hand-edited file cannot create an inconsistent key.
  const day: DailyActivity = {
    id: `${setId}:${date}`,
    setId,
    date,
    answered,
    correct,
  };
  return day;
}

function readTrophy(
  raw: unknown,
  path: string,
  report: Report,
): { readonly id: string; readonly unlockedAt: number } | undefined {
  if (!isRecord(raw)) {
    report(path, "notAnObject");
    return undefined;
  }
  const id = readText(raw, "id", path, report);
  const unlockedAt = readNumber(raw, "unlockedAt", path, report, { min: 0 });
  return id === undefined || unlockedAt === undefined
    ? undefined
    : { id, unlockedAt };
}

/** Keeps the trophies this version knows; ids from newer versions are skipped, not rejected. */
function readTrophies(
  items: readonly unknown[] | undefined,
  report: Report,
): readonly TrophyRecord[] {
  const known = readEach(items, "trophies", readTrophy, report).flatMap(
    ({ id, unlockedAt }) => (isTrophyId(id) ? [{ id, unlockedAt }] : []),
  );
  return mergeTrophies(known, []);
}

function readEach<T>(
  items: readonly unknown[] | undefined,
  name: string,
  read: (raw: unknown, path: string, report: Report) => T | undefined,
  report: Report,
): T[] {
  const result: T[] = [];
  (items ?? []).forEach((raw, index) => {
    const value = read(raw, `${name}[${String(index)}]`, report);
    if (value !== undefined) {
      result.push(value);
    }
  });
  return result;
}

function checkUnique<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  name: string,
  reason: ProblemReason,
  report: Report,
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const key = keyOf(item);
    if (seen.has(key)) {
      report(`${name}[${String(index)}]`, reason);
    }
    seen.add(key);
  });
}

function bundleSets(
  sets: readonly WordSet[],
  pairs: readonly WordPair[],
  progress: readonly WordProgress[],
  activity: readonly DailyActivity[],
  report: Report,
): readonly SetBundle[] {
  const setIds = new Set(sets.map((set) => set.id));
  const pairSet = new Map(pairs.map((pair) => [pair.id, pair.setId]));
  pairs.forEach((pair, index) => {
    if (!setIds.has(pair.setId)) {
      report(`pairs[${String(index)}].setId`, "unknownReference");
    }
  });
  progress.forEach((record, index) => {
    if (pairSet.get(record.pairId) !== record.setId) {
      report(`progress[${String(index)}].pairId`, "unknownReference");
    }
  });
  activity.forEach((day, index) => {
    if (!setIds.has(day.setId)) {
      report(`activity[${String(index)}].setId`, "unknownReference");
    }
  });
  return sets.map((set) => ({
    set,
    pairs: pairs.filter((pair) => pair.setId === set.id),
    progress: progress.filter((record) => record.setId === set.id),
    activity: activity.filter((day) => day.setId === set.id),
  }));
}

/**
 * Reads and strictly validates a JSON export (FR-IO-2).
 *
 * @param text File content.
 * @returns The sets with their data, or all problems found; a file with any
 *   problem yields no data at all, so nothing is imported partially.
 */
export function parseExport(text: string): ParseOutcome {
  const problems: ImportProblem[] = [];
  const report: Report = (path, reason) => {
    if (problems.length < MAX_PROBLEMS) {
      problems.push({ path, reason });
    }
  };

  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return { ok: false, problems: [{ path: "", reason: "invalidJson" }] };
  }
  if (!isRecord(root)) {
    return { ok: false, problems: [{ path: "", reason: "notAnObject" }] };
  }
  if (root.formatVersion === undefined) {
    return {
      ok: false,
      problems: [{ path: "formatVersion", reason: "missing" }],
    };
  }
  if (root.formatVersion !== FORMAT_VERSION) {
    return {
      ok: false,
      problems: [{ path: "formatVersion", reason: "unsupportedVersion" }],
    };
  }

  const sets = readEach(
    readList(root, "sets", true, report),
    "sets",
    readSet,
    report,
  );
  const pairs = readEach(
    readList(root, "pairs", true, report),
    "pairs",
    readPair,
    report,
  );
  const progress = readEach(
    readList(root, "progress", false, report),
    "progress",
    readProgress,
    report,
  );
  const activity = readEach(
    readList(root, "activity", false, report),
    "activity",
    readActivity,
    report,
  );
  const trophies = readTrophies(
    readList(root, "trophies", false, report),
    report,
  );
  checkUnique(sets, (set) => set.id, "sets", "duplicateId", report);
  if (sets.length === 0 && Array.isArray(root.sets) && root.sets.length === 0) {
    report("sets", "empty");
  }
  checkUnique(
    sets,
    (set) => set.name.toLowerCase(),
    "sets",
    "duplicateName",
    report,
  );
  checkUnique(pairs, (pair) => pair.id, "pairs", "duplicateId", report);
  checkUnique(
    progress,
    (record) => record.pairId,
    "progress",
    "duplicateId",
    report,
  );
  checkUnique(activity, (day) => day.id, "activity", "duplicateId", report);
  const bundles = bundleSets(sets, pairs, progress, activity, report);

  if (problems.length > 0) {
    return { ok: false, problems };
  }
  return trophies.length > 0
    ? { ok: true, bundles, trophies }
    : { ok: true, bundles };
}
