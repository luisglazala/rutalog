/* RUTALOG sync-force v1 — Actualizar manual no se queda atrapado en inflight colgado */
(function () {
  "use strict";
  if (window.__rutalogSyncForceV1) return;
  window.__rutalogSyncForceV1 = true;

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
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._syncForce) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      var manual = !opts.silent;
      if (manual) window.__rutalogForceFetch = true;
      try {
        return await orig.call(this, opts);
      } finally {
        if (manual) window.__rutalogForceFetch = false;
      }
    };
    window.ghActualizar._syncForce = true;
    console.info("[RUTALOG] sync-force v1 · Actualizar manual con force");
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
      .ghActualizar({ silent: false })
      .then(function () {
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
    if (n > 50) clearInterval(t);
  }, 200);
})();
