import { useI18n, type MessageKey } from "../../i18n";

/** Temporary screen body until the real screen is built in a later phase. */
export function ScreenPlaceholder({ title }: { readonly title: MessageKey }) {
  const { t } = useI18n();
  return (
    <>
      <h1 tabIndex={-1}>{t(title)}</h1>
      <p>{t("screen.comingSoon")}</p>
    </>
  );
}
