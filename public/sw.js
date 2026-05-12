// Service worker — modo offline leve com auto-update.
// - skipWaiting + clients.claim: novo SW assume imediatamente.
// - HTML: network-first (sempre busca a versão nova quando online).
// - Assets hashed (JS/CSS/img): stale-while-revalidate.
// - Nunca cacheia POST nem chamadas de API/auth.
// IMPORTANTE: o BUILD_ID abaixo é regravado a cada deploy para forçar
// o navegador a baixar um novo SW e disparar o fluxo de update.

const BUILD_ID = "__BUILD_ID__";
const RUNTIME_CACHE = `aa-runtime-${BUILD_ID}`;
const HTML_CACHE = `aa-html-${BUILD_ID}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== RUNTIME_CACHE && k !== HTML_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const isStaticAsset = (url) =>
  /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(HTML_CACHE);
          cache.put("/", fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(HTML_CACHE);
          const cached = (await cache.match(req)) || (await cache.match("/"));
          if (cached) return cached;
          return new Response(
            "<h1>Sem conexão</h1><p>Tente novamente quando estiver online.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          );
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response("", { status: 504 });
      })(),
    );
  }
});
