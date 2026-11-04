import type { MascotId } from "../types";

/** Every selectable mascot in display order (NH-12). The art lives in `/docs/mascots`. */
export const MASCOT_IDS = [
  "volt",
  "pyro",
  "luna",
  "scout",
  "twinkle",
  "shadow",
  "sprout",
  "raptor",
  "jelly",
  "golem",
  "drake",
  "amber",
] as const satisfies readonly MascotId[];

/** Mascot used until the user chooses another one. */
export const DEFAULT_MASCOT: MascotId = "volt";

/** Type guard for {@link MascotId}. */
export function isMascotId(value: unknown): value is MascotId {
  return MASCOT_IDS.some((id) => id === value);
}
