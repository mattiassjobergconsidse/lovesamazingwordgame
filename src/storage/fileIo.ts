/** Largest import file accepted, in bytes (10 MB). */
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Time the object URL stays valid after the click. Revoking at once can cancel
 * the download in some browsers, which start it asynchronously.
 */
export const OBJECT_URL_REVOKE_DELAY_MS = 10_000;

/**
 * Offers text as a file download.
 *
 * @param fileName Suggested name of the saved file.
 * @param content File content.
 * @param mimeType Media type, e.g. `application/json`.
 * @throws If the browser refuses to create or click the link; the temporary link is removed first.
 */
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, OBJECT_URL_REVOKE_DELAY_MS);
  }
}

/**
 * Reads a user-selected file as UTF-8 text.
 *
 * @throws If the file is larger than {@link MAX_IMPORT_FILE_BYTES} or cannot be read.
 */
export async function readFileText(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error("File is too large to import.");
  }
  return await file.text();
}
