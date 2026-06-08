// Service Worker — Só Garagens PWA
// Estratégia: network-first p/ navegação (pega atualizações; offline cai no cache do app shell),
// stale-while-revalidate p/ assets estáticos (/assets/*), passthrough p/ APIs (Supabase/fontes).
const VERSION = "sg-v1";
const APP_SHELL = "sg-shell-" + VERSION;
const ASSETS = "sg-assets-" + VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL).then((c) => c.addAll(["/", "/index.html"])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Só intercepta same-origin. Supabase, fontes, Bedrock etc. vão direto pra rede.
  if (url.origin !== self.location.origin) return;

  // Navegação (SPA): network-first, fallback p/ index.html cacheado (offline).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_SHELL).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // Assets estáticos: stale-while-revalidate.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") ||
      /\.(png|svg|ico|woff2?|css|js)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
