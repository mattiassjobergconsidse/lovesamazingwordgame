import { createContext } from "react";
import type { WordGameDatabase } from "../storage/db";

/** Why saving or loading failed, for a translated message. */
export type StorageErrorKind = "unavailable" | "blocked" | "failed";

/** The shared database connection and the app-wide storage problem state. */
export interface DatabaseStore {
  /** The open connection, or `null` while opening or when storage is unavailable. */
  readonly db: WordGameDatabase | null;
  /** Latest storage problem, or `null` when storage works. */
  readonly storageError: StorageErrorKind | null;
  /** Lets repositories' callers surface a failed read or write. */
  readonly reportStorageError: (kind: StorageErrorKind) => void;
}

export const DatabaseContext = createContext<DatabaseStore | null>(null);
