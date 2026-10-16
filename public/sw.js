/* Offline support (NH-1). The placeholders below are replaced at build time by the precache plugin in vite.config.ts. */
const CACHE_PREFIX = "lovesamazingwordgame-";
const CACHE_NAME = CACHE_PREFIX + "__BUILD_VERSION__";
// Relative to this file, so the Pages base path is never hard-coded here.
const PRECACHE_URLS = "__PRECACHE_URLS__";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }
  // The hash router means every navigation is the single app shell.
  const lookup =
    request.mode === "navigate"
      ? new Request(new URL("./", self.location.href))
      : request;
  event.respondWith(
    caches
      .match(lookup, { ignoreSearch: true })
      .then((cached) => cached ?? fetch(request)),
  );
});
