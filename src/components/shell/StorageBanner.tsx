import { useI18n } from "../../i18n";
import type { StorageErrorKind } from "../../hooks/settingsContext";

/** Announces a storage problem with a translated message. */
export function StorageBanner({ error }: { readonly error: StorageErrorKind }) {
  const { t } = useI18n();
  return (
    <p role="alert" className="storage-banner">
      {t(`storage.error.${error}`)}
    </p>
  );
}
