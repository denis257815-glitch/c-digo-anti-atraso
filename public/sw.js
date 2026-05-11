// Service worker — modo offline leve.
// Estratégia:
//  - Navegação (HTML): network-first com fallback para o último HTML cacheado.
//  - Assets estáticos (JS/CSS/imagens/fontes): stale-while-revalidate.
//  - Nunca cacheia POST nem chamadas para Supabase / APIs externas.

const VERSION = "v2";
const RUNTIME_CACHE = `aa-runtime-${VERSION}`;
const HTML_CACHE = `aa-html-${VERSION}`;

self.addEventListener("install", (event) => {
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

const isStaticAsset = (url) =>
  /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|webp|svg|gif|ico)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Só lida com requisições do mesmo origin.
  if (url.origin !== self.location.origin) return;

  // Nunca cacheia rotas de API/auth.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // HTML / navegação → network-first
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
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

  // Assets estáticos → stale-while-revalidate
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
