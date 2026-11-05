/**
 * Most sets one import file may contain. Generous for a family or a class,
 * small enough that a crafted file cannot exhaust memory (NH-19 security review).
 */
export const MAX_IMPORT_SETS = 200;

/** Most word pairs, progress records or activity days one import file may contain per list. */
export const MAX_IMPORT_PAIRS = 20_000;
