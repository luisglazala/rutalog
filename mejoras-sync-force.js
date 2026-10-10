/* RUTALOG sync-force v3 — manual con force + timeout 120s (catálogo ~1MB) */
(function () {
  "use strict";
  if (window.__rutalogSyncForceV3) return;
  window.__rutalogSyncForceV3 = true;
  window.__rutalogSyncForceV2 = true;
  window.__rutalogSyncForceV1 = true;

  var TIMEOUT_MS = 120000;

  function withTimeout(p, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error(label || ("Timeout " + Math.round(ms / 1000) + "s")));
      }, ms);
      Promise.resolve(p).then(
        function (v) {
          if (done) return;
          done = true;
          clearTimeout(t);
          resolve(v);
        },
        function (e) {
          if (done) return;
          done = true;
          clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  function patchFetch() {
    if (typeof window.ghFetchFile !== "function" || window.ghFetchFile._syncForce) return false;
    var orig = window.ghFetchFile;
    window.ghFetchFile = function (opts) {
      opts = opts || {};
      if (window.__rutalogForceFetch) opts.force = true;
      return orig.call(this, opts);
    };
    window.ghFetchFile._syncForce = true;
    return true;
  }

  function patchActualizar() {
    if (typeof window.ghActualizar !== "function") return false;
    if (window.ghActualizar._syncForceV3) return true;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      var manual = !opts.silent;
      if (manual) {
        opts.force = true;
        opts.manual = true;
        window.__rutalogForceFetch = true;
      }
      try {
        var p = orig.call(this, opts);
        if (manual)
          return await withTimeout(
            p,
            TIMEOUT_MS,
            "Sync: sin respuesta en 120 s (revisa token Cloudflare /api o red)"
          );
        return await p;
      } finally {
        if (manual) window.__rutalogForceFetch = false;
      }
    };
    window.ghActualizar._syncForceV3 = true;
    window.ghActualizar._syncForceV2 = true;
    window.ghActualizar._syncForce = true;
    console.info("[RUTALOG] sync-force v3 · force + timeout 120s");
    return true;
  }

  function onClick(ev) {
    var el = ev.target && ev.target.closest && ev.target.closest("#btnSyncAhora, #btnSyncActualizar, #badgeSync");
    if (!el) return;
    try {
      if (el.id === "btnSyncAhora" || el.id === "btnSyncActualizar") {
        ev.preventDefault();
      }
    } catch (e) {}
    console.info("[RUTALOG] sync-force · click Actualizar ahora");
    if (typeof window.ghActualizar !== "function") {
      console.warn("[RUTALOG] sync-force · ghActualizar no listo");
      return;
    }
    window
      .ghActualizar({ silent: false, force: true, manual: true })
      .then(function () {
        console.info("[RUTALOG] sync-force · ok");
      })
      .catch(function (e) {
        console.warn("[RUTALOG] sync-force · error", e);
      });
  }

  function install() {
    patchFetch();
    patchActualizar();
  }
  install();
  document.addEventListener("click", onClick, true);
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 30) clearInterval(t);
  }, 500);
})();
