/** The part of an `idb` transaction that {@link runTransaction} needs. */
export interface AbortableTransaction {
  readonly done: Promise<void>;
  abort: () => void;
}
/**
 * Registers a request of the transaction so that its rejection is handled
 * when the transaction is rolled back. Returns the request for awaiting.
 */
export type TrackRequest = <R>(request: Promise<R>) => Promise<R>;
/**
 * Runs the work of one transaction and rolls everything back if it fails.
 *
 * Without the explicit abort, a synchronous error thrown after some requests
 * were queued would let the transaction auto-commit a partial write.
 *
 * @param tx The transaction the work runs in.
 * @param work Queues requests on `tx`, passing each through `track`; may await them.
 * @returns The value from `work`, once the transaction has committed.
 * @throws The original error if the work or the commit fails.
 */
export async function runTransaction<T>(
  tx: AbortableTransaction,
  work: (track: TrackRequest) => Promise<T>,
): Promise<T> {
  // Aborting rejects every queued request; the ones nobody awaits would otherwise be unhandled.
  const track: TrackRequest = (request) => {
    request.catch(() => undefined);
    return request;
  };
  try {
    const [result] = await Promise.all([work(track), tx.done]);
    return result;
  } catch (error) {
    // `done` rejects on abort; it is already reported through `error`.
    tx.done.catch(() => undefined);
    try {
      tx.abort();
    } catch {
      // The transaction already finished or aborted itself after a failed request.
    }
    throw error;
  }
}
