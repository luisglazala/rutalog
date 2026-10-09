/* RUTALOG sync-force v2 — manual con force + timeout 25s; no se queda en sincronizando… */
(function () {
  "use strict";
  if (window.__rutalogSyncForceV2) return;
  window.__rutalogSyncForceV2 = true;
  window.__rutalogSyncForceV1 = true;

  var TIMEOUT_MS = 25000;

  function withTimeout(p, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error(label || ("Timeout " + ms + "ms")));
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
    if (window.ghActualizar._syncForceV2) return true;
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
        if (manual) return await withTimeout(p, TIMEOUT_MS, "Sync: sin respuesta en 25 s (revisa token Cloudflare /api)");
        return await p;
      } finally {
        if (manual) window.__rutalogForceFetch = false;
      }
    };
    window.ghActualizar._syncForceV2 = true;
    window.ghActualizar._syncForce = true;
    console.info("[RUTALOG] sync-force v2 · force + timeout 25s");
    return true;
  }

  function onClick(ev) {
    var el = ev.target && ev.target.closest && ev.target.closest("#btnSyncActualizar");
    if (!el) return;
    try {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    } catch (e) {}
    console.info("[RUTALOG] sync-force · click Actualizar ahora");
    if (typeof window.ghActualizar !== "function") {
      console.warn("[RUTALOG] sync-force · ghActualizar ausente");
      return;
    }
    window
      .ghActualizar({ silent: false, force: true, manual: true })
      .then(function () {
        console.info("[RUTALOG] sync-force · ok");
        if (typeof aplicarGateLoginDesdeSync === "function") aplicarGateLoginDesdeSync();
      })
      .catch(function (e) {
        console.warn("[RUTALOG] sync-force error", e);
        if (typeof toast === "function") toast("Sync: " + ((e && e.message) || e));
      });
  }

  document.addEventListener("click", onClick, true);

  function install() {
    patchFetch();
    patchActualizar();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 60) clearInterval(t);
  }, 200);
})();
