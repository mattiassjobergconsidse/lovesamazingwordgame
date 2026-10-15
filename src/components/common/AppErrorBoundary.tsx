import type { ReactNode } from "react";
import { useI18n } from "../../i18n";
import { ErrorBoundary } from "./ErrorBoundary";

function reloadPage(): void {
  window.location.reload();
}

/** Error boundary with translated texts and a page reload action. */
export function AppErrorBoundary({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <ErrorBoundary
      title={t("error.title")}
      message={t("error.message")}
      reloadLabel={t("error.reload")}
      onReload={reloadPage}
    >
      {children}
    </ErrorBoundary>
  );
}
