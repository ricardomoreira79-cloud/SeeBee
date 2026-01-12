const CACHE = "seebee-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.webmanifest",
  "./src/main.js",
  "./src/config.js",
  "./src/supabaseClient.js",
  "./src/state.js",
  "./src/ui.js",
  "./src/auth.js",
  "./src/map.js",
  "./src/routes.js",
  "./src/storage.js",
  "./src/nests.js"
];

self.addEventListener("install", (evt) => {
  evt.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((cached) => cached || fetch(evt.request))
  );
});
