// Minimal service worker for PWA installability (Android one-click install).
// Intentionally does NOT cache responses to avoid serving stale content.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch handler — required by some browsers for install criteria.
self.addEventListener("fetch", (event) => {
  // No-op: let the network handle it.
});
