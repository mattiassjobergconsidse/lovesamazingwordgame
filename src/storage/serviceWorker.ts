/** Outcome of {@link registerServiceWorker}; offline support is optional, so failures are reported, not thrown. */
export type ServiceWorkerStatus = "registered" | "unsupported" | "failed";

function getContainer(): ServiceWorkerContainer | null {
  return "serviceWorker" in navigator ? navigator.serviceWorker : null;
}

/**
 * Registers the offline service worker (NH-1).
 *
 * @param scriptUrl URL of `sw.js`, derived from the Vite base path by the caller.
 * @param container Service worker container; `null` where the browser has none.
 */
export async function registerServiceWorker(
  scriptUrl: string,
  container: ServiceWorkerContainer | null = getContainer(),
): Promise<ServiceWorkerStatus> {
  if (container === null) {
    return "unsupported";
  }
  try {
    await container.register(scriptUrl, { scope: "./" });
    return "registered";
  } catch {
    // The app works fully online without it, so a failed registration must not block startup.
    return "failed";
  }
}
