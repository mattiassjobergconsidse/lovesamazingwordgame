import type { ReactNode } from "react";
import { LibraryContext } from "../../hooks/libraryContext";
import { useLibraryStore } from "../../hooks/useLibraryStore";

/** Loads all sets and pairs once and shares them with the whole app. */
export function LibraryProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const library = useLibraryStore();
  return <LibraryContext value={library}>{children}</LibraryContext>;
}
