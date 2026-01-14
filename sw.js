self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch mantido igual (pode copiar do anterior se quiser, mas o importante é o install/activate acima)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.url.includes("supabase.co")) return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});