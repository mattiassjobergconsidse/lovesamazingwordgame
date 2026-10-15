import { parseSettings } from "../core/settings";
import type { Settings } from "../types";
import { SETTINGS_KEY, type WordGameDatabase } from "./db";

/**
 * Reads the stored settings.
 *
 * @param db An open database connection.
 * @returns The settings, or `null` if none are stored or the record is invalid.
 */
export async function loadSettings(
  db: WordGameDatabase,
): Promise<Settings | null> {
  const stored: unknown = await db.get("settings", SETTINGS_KEY);
  return parseSettings(stored);
}

/**
 * Writes the settings record, replacing any previous one.
 *
 * @param db An open database connection.
 * @param settings The settings to store.
 */
export async function saveSettings(
  db: WordGameDatabase,
  settings: Settings,
): Promise<void> {
  await db.put("settings", settings, SETTINGS_KEY);
}
