import blazeUrl from "../../../docs/mascots/blaze-drake.svg";
import buboUrl from "../../../docs/mascots/bubo-owl.svg";
import foxelUrl from "../../../docs/mascots/foxel-fox.svg";
import glosaUrl from "../../../docs/mascots/glosa-dragon.svg";
import umbraUrl from "../../../docs/mascots/umbra-wolf.svg";
import voltUrl from "../../../docs/mascots/volt-thunder.svg";
import type { MascotId } from "../../types";

/** Artwork of each mascot, imported as modules so Vite fingerprints and bundles it (FR-BP-3). */
export const MASCOT_IMAGES: Readonly<Record<MascotId, string>> = {
  volt: voltUrl,
  blaze: blazeUrl,
  foxel: foxelUrl,
  glosa: glosaUrl,
  bubo: buboUrl,
  umbra: umbraUrl,
};
