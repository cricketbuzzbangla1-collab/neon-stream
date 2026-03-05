const CACHE_NAME = "abctv-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache images (logos, thumbnails)
  if (
    request.destination === "image" ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached || new Response("", { status: 404 }));
        })
      )
    );
    return;
  }

  // Cache JS/CSS assets
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    url.pathname.match(/\.(js|css)$/i)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Network first for everything else
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
