import { useContext } from "react";
import { LibraryContext, type Library } from "./libraryContext";

/**
 * Access the sets and pairs and the operations on them.
 *
 * @throws If used outside a `LibraryProvider`.
 */
export function useLibrary(): Library {
  const library = useContext(LibraryContext);
  if (library === null) {
    throw new Error("useLibrary must be used inside a LibraryProvider");
  }
  return library;
}
