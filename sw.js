const CACHE = "rutalog-v6-citas-paste";
const ASSETS = [
  "./",
  "./index.html",
  "./RUTALOG%20GITHUB.html",
  "./styles.css",
  "./styles-part2.css",
  "./mejoras-esteticas.css",
  "./mejoras-v2.css",
  "./app.js",
  "./mejoras-v2.js",
  "./mejoras-citas.js",
  "./maestro-base.json",
  "./manifest.webmanifest"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (/\.(js|css)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          try {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
            }
          } catch (err) {}
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        try {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
        } catch (err) {}
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
