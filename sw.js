const CACHE_NAME = "seebee-cache-v5"; // bump para forçar atualização no navegador

const ASSETS = [
  "./",
  "./index.html",
  "./css/main.css",
  "./js/app.js",
  "./js/config.js",
  "./js/state.js",
  "./js/storage.js",
  "./js/ui.js",
  "./js/auth.js",
  "./js/map.js",
  "./js/routes.js",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Não cacheia chamadas do Supabase
  if (req.url.includes("supabase.co")) return;

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return resp;
          })
          .catch(() => cached)
    )
  );
});
