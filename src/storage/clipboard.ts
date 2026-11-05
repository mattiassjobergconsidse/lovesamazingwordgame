/**
 * Copies text to the clipboard.
 *
 * @throws If the Clipboard API is missing (insecure context) or the browser denies the write.
 */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
