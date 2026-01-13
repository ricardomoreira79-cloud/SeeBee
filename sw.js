// ARQUIVO: sw.js
const CACHE_NAME = "seebee-cache-v2"; // <--- Mudei de v1 para v2
const ASSETS = [
  "./",
  "./index.html",
  "./css/main.css",
  "./js/main.js", // <--- Garanta que main.js está aqui (e não app.js se tiver renomeado)
  "./js/ui.js",
  "./js/state.js",
  "./js/config.js",
  "./js/auth.js",
  "./js/map.js",
  "./js/routes.js",
  "./js/nests.js",
  "./js/meliponario.js", // <--- Adicione os novos arquivos na lista!
  "./js/profile.js",     // <--- Adicione os novos arquivos na lista!
  "./js/supabaseClient.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // <--- Força a atualização imediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim()) // <--- Controla a página imediatamente
  );
});

// Fetch mantido igual (pode copiar do anterior se quiser, mas o importante é o install/activate acima)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.url.includes("supabase.co")) return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});