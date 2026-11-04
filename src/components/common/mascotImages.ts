import amberUrl from "../../../docs/mascots/amber.png";
import drakeUrl from "../../../docs/mascots/drake.png";
import golemUrl from "../../../docs/mascots/golem.png";
import jellyUrl from "../../../docs/mascots/jelly.png";
import lunaUrl from "../../../docs/mascots/luna.png";
import pyroUrl from "../../../docs/mascots/pyro.png";
import raptorUrl from "../../../docs/mascots/raptor.png";
import scoutUrl from "../../../docs/mascots/scout.png";
import shadowUrl from "../../../docs/mascots/shadow.png";
import sproutUrl from "../../../docs/mascots/sprout.png";
import twinkleUrl from "../../../docs/mascots/twinkle.png";
import voltUrl from "../../../docs/mascots/volt.png";
import type { MascotId } from "../../types";

/** Artwork of each mascot, imported as modules so Vite fingerprints and bundles it (FR-BP-3). */
export const MASCOT_IMAGES: Readonly<Record<MascotId, string>> = {
  volt: voltUrl,
  pyro: pyroUrl,
  luna: lunaUrl,
  scout: scoutUrl,
  twinkle: twinkleUrl,
  shadow: shadowUrl,
  sprout: sproutUrl,
  raptor: raptorUrl,
  jelly: jellyUrl,
  golem: golemUrl,
  drake: drakeUrl,
  amber: amberUrl,
};
