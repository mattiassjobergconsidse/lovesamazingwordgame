import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  DailyActivity,
  Settings,
  WordPair,
  WordProgress,
  WordSet,
} from "../types";

export const DB_NAME = "lovesamazingwordgame";
export const DB_VERSION = 1;
/** Key of the single settings record. */
export const SETTINGS_KEY = "settings";

/** Typed schema of the IndexedDB database (version 1). */
export interface WordGameDB extends DBSchema {
  sets: { key: string; value: WordSet };
  pairs: {
    key: string;
    value: WordPair;
    indexes: { setId: string };
  };
  progress: {
    key: string;
    value: WordProgress;
    indexes: { setId: string };
  };
  activity: {
    key: string;
    value: DailyActivity;
    indexes: { setId: string };
  };
  settings: { key: string; value: Settings };
}

export type WordGameDatabase = IDBPDatabase<WordGameDB>;

/** Callbacks for database lifecycle events (FR-BP-4). */
export interface DbEventHandlers {
  /** Another tab holds an older version open and blocks an upgrade. */
  readonly onBlocked?: () => void;
  /** This connection blocks another tab's upgrade; it should be closed. */
  readonly onBlocking?: () => void;
  /** The browser closed the connection unexpectedly. */
  readonly onTerminated?: () => void;
}

/** Whether the browser exposes IndexedDB at all (false in some private modes). */
export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Opens the app database, creating all stores on first use.
 *
 * @param handlers Optional lifecycle callbacks.
 * @returns An open connection. The caller owns it and should close it when done.
 * @throws If IndexedDB is unavailable or the open request fails.
 */
export async function openAppDb(
  handlers: DbEventHandlers = {},
): Promise<WordGameDatabase> {
  return await openDB<WordGameDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("sets", { keyPath: "id" });
      db.createObjectStore("pairs", { keyPath: "id" }).createIndex(
        "setId",
        "setId",
      );
      db.createObjectStore("progress", { keyPath: "pairId" }).createIndex(
        "setId",
        "setId",
      );
      db.createObjectStore("activity", { keyPath: "id" }).createIndex(
        "setId",
        "setId",
      );
      db.createObjectStore("settings");
    },
    blocked: handlers.onBlocked,
    blocking: handlers.onBlocking,
    terminated: handlers.onTerminated,
  });
}
