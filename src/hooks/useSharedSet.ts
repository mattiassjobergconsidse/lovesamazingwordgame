import { useEffect, useState } from "react";
import type { SetBundle } from "../core/exportFormat";
import { parseSharePayload } from "../core/shareFormat";
import { decodeSharePayload } from "../storage/shareLink";

/** Decoding state of a set received through a share link. */
export type SharedSetState =
  | { readonly status: "loading" }
  | { readonly status: "invalid" }
  | { readonly status: "ready"; readonly bundle: SetBundle };

const INVALID: SharedSetState = { status: "invalid" };

async function loadSharedSet(payload: string): Promise<SharedSetState> {
  let json: string;
  try {
    json = await decodeSharePayload(payload);
  } catch {
    // A damaged link is an expected outcome; the UI shows a translated message for it.
    return INVALID;
  }
  const parsed = parseSharePayload(json, Date.now());
  const bundle = parsed.ok ? parsed.bundles[0] : undefined;
  return bundle === undefined ? INVALID : { status: "ready", bundle };
}

/**
 * Decodes and validates a share-link payload. Bridges the UI to `storage/` (decoding)
 * and `core/` (parsing) so components never touch storage directly.
 *
 * @param payload The encoded text after `#/share/`.
 * @returns `loading` until decoding finishes, then `ready` with the set or `invalid`.
 */
export function useSharedSet(payload: string): SharedSetState {
  const [state, setState] = useState<SharedSetState>({ status: "loading" });

  useEffect(() => {
    let current = true;
    void loadSharedSet(payload).then((result) => {
      if (current) {
        setState(result);
      }
    });
    return () => {
      current = false;
    };
  }, [payload]);

  return state;
}
