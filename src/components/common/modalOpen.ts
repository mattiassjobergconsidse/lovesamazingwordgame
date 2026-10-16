/** True while a modal dialog is open, so global shortcuts must stay quiet. */
export function isModalOpen(): boolean {
  return document.querySelector("dialog[open]") !== null;
}

/** True when the key press happens in a place where the user is typing text. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
