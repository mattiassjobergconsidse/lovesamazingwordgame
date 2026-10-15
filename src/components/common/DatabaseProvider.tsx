import type { ReactNode } from "react";
import { DatabaseContext } from "../../hooks/databaseContext";
import { useDatabaseStore } from "../../hooks/useDatabaseStore";

/** Opens the database once and shares it with the whole app. */
export function DatabaseProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const store = useDatabaseStore();
  return <DatabaseContext value={store}>{children}</DatabaseContext>;
}
