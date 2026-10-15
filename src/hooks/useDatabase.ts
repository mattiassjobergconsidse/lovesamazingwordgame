import { useContext } from "react";
import { DatabaseContext, type DatabaseStore } from "./databaseContext";

/**
 * Access the shared database connection and storage error state.
 *
 * @throws If used outside a `DatabaseProvider`.
 */
export function useDatabase(): DatabaseStore {
  const store = useContext(DatabaseContext);
  if (store === null) {
    throw new Error("useDatabase must be used inside a DatabaseProvider");
  }
  return store;
}
