/**
 * Offers text as a file download.
 *
 * @param fileName Suggested name of the saved file.
 * @param content File content.
 * @param mimeType Media type, e.g. `application/json`.
 */
export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Reads a user-selected file as UTF-8 text.
 *
 * @throws If the file cannot be read.
 */
export async function readFileText(file: File): Promise<string> {
  return await file.text();
}
