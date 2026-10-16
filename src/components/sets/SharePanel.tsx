import { useState } from "react";
import {
  SHARE_LONG_LINK_CHARS,
  buildSharePayload,
} from "../../core/shareFormat";
import { useToast } from "../../hooks/useToast";
import { useI18n } from "../../i18n";
import { buildShareLink, encodeSharePayload } from "../../storage/shareLink";
import type { WordPair, WordSet } from "../../types";
import "../common/common.css";
import "../data/data.css";

interface SharePanelProps {
  readonly set: WordSet;
  readonly pairs: readonly WordPair[];
}

/** Creates a link that contains the set's words so someone else can import it (NH-5). */
export function SharePanel({ set, pairs }: SharePanelProps) {
  const { t } = useI18n();
  const { showToast } = useToast();
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function create() {
    setFailed(false);
    try {
      const encoded = await encodeSharePayload(buildSharePayload(set, pairs));
      setLink(buildShareLink(encoded));
    } catch (error) {
      console.error("Failed to create the share link", error);
      setLink(null);
      setFailed(true);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: t("share.copied") });
    } catch {
      showToast({ message: t("share.copyFailed") });
    }
  }

  return (
    <section aria-labelledby="share-heading" className="data-panel">
      <h2 id="share-heading">{t("share.heading")}</h2>
      <p>{t("share.privacy")}</p>
      <div className="data-actions">
        <button
          type="button"
          className="button"
          disabled={pairs.length === 0}
          onClick={() => {
            void create();
          }}
        >
          {t("share.create")}
        </button>
      </div>
      {failed && (
        <p role="alert" className="field-error">
          {t("share.failed")}
        </p>
      )}
      {link !== null && (
        <>
          <div className="field">
            <label htmlFor="share-link" className="field-label">
              {t("share.link")}
            </label>
            <input
              id="share-link"
              type="text"
              readOnly
              className="text-input"
              value={link}
              onFocus={(event) => {
                event.currentTarget.select();
              }}
            />
          </div>
          {link.length > SHARE_LONG_LINK_CHARS && <p>{t("share.long")}</p>}
          <div className="data-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                void copy(link);
              }}
            >
              {t("share.copy")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
