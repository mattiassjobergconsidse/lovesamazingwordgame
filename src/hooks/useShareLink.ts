import { copyText } from "../storage/clipboard";
import { buildShareLink, encodeSharePayload } from "../storage/shareLink";

/** Creating and copying share links (NH-5). */
export interface ShareLinkApi {
  /**
   * Encodes share payload JSON into a full link to this page.
   *
   * @throws If encoding fails.
   */
  readonly createLink: (payloadJson: string) => Promise<string>;
  /**
   * Copies text to the clipboard.
   *
   * @throws If the clipboard is unavailable or denied.
   */
  readonly copy: (text: string) => Promise<void>;
}

async function createLink(payloadJson: string): Promise<string> {
  return buildShareLink(await encodeSharePayload(payloadJson));
}

/** Gives components share-link I/O without importing from `storage/`. The functions are stable between renders. */
export function useShareLink(): ShareLinkApi {
  return { createLink, copy: copyText };
}
