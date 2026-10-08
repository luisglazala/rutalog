const CACHE = "rutalog-v12-shell";
const ASSETS = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./manifest.webmanifest"
];

function isHtmlPath(pathname) {
  return pathname === "/" || pathname.endsWith("/") || /\.html$/i.test(pathname) || /shell-body/i.test(pathname);
}

function isBrokenShell(text) {
  if (!text || text.length < 5000) return true;
  if (text.indexOf("loginOverlay") < 0) return true;
  if (text.indexOf("RESTORE_MARKER") >= 0) return true;
  if (text.indexOf("content too large for single tool arg") >= 0) return true;
  return false;
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNav = req.mode === "navigate" || isHtmlPath(url.pathname);
  if (isNav || /shell-body/i.test(url.pathname)) {
    e.respondWith(
      fetch(req)
        .then(async (res) => {
          try {
            if (res && res.ok) {
              const clone = res.clone();
              const text = await clone.text();
              if (!isBrokenShell(text)) {
                const toCache = new Response(text, {
                  status: res.status,
                  statusText: res.statusText,
                  headers: res.headers
                });
                caches.open(CACHE).then((c) => c.put(req, toCache)).catch(() => {});
              }
              return new Response(text, {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers
              });
            }
          } catch (err) {}
          return res;
        })
        .catch(() =>
          caches.match(req).then(async (cached) => {
            if (!cached) return undefined;
            try {
              const t = await cached.clone().text();
              if (isBrokenShell(t)) return undefined;
            } catch (e) {
              return undefined;
            }
            return cached;
          })
        )
    );
    return;
  }

  if (/\.(js|css)$/i.test(url.pathname)) {
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
      const net = fetch(req)
        .then((res) => {
          try {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
            }
          } catch (err) {}
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
