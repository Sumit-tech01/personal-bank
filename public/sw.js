const CACHE_NAME = "personal-bank-v1";
const STATIC_ASSETS = [
  "/",
  "/guidebook",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon-32x32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Failed to precache some assets during install", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Do not intercept non-GET or API routes (like /api/sync)
  if (request.method !== "GET" || request.url.includes("/api/")) {
    return;
  }

  // Handle navigation requests (HTML pages) - Network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        const rootResponse = await caches.match("/");
        if (rootResponse) return rootResponse;
        return new Response("Personal Bank is currently offline.", {
          headers: { "Content-Type": "text/html" },
        });
      })
    );
    return;
  }

  // Handle static assets (_next/static, fonts, icons) - Cache-first with network fallback
  if (
    request.url.includes("/_next/static/") ||
    request.url.includes("/fonts/") ||
    request.url.endsWith(".svg") ||
    request.url.endsWith(".png") ||
    request.url.endsWith(".ico") ||
    request.url.endsWith(".woff") ||
    request.url.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
