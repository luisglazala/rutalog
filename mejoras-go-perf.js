/* RUTALOG — capa2b: solo debounce de renderMapas (no intercepta go — evita romper paneles) */
(function () {
  "use strict";
  if (window.__rutalogGoPerfV2) return;
  window.__rutalogGoPerfV2 = true;

  var _rmTimer = null;
  var _rmOrig = null;

  function wrapRenderMapas() {
    if (typeof window.renderMapas !== "function") return false;
    if (window.renderMapas._goPerfDebounceV2) return true;
    /* No re-envolver un debounce previo roto de v1: buscar original si existe */
    _rmOrig = window.renderMapas;
    if (typeof window.renderMapas.now === "function" && window.renderMapas._goPerfDebounce) {
      /* v1 left a debounced fn — try to keep calling through .now path after we replace */
    }
    window.renderMapas = function renderMapasDebounced() {
      if (_rmTimer) clearTimeout(_rmTimer);
      _rmTimer = setTimeout(function () {
        _rmTimer = null;
        try {
          if (typeof _rmOrig === "function") _rmOrig.call(window);
        } catch (e) {
          console.warn("[go-perf] renderMapas", e);
        }
      }, 60);
    };
    window.renderMapas._goPerfDebounceV2 = true;
    window.renderMapas.now = function () {
      if (_rmTimer) {
        clearTimeout(_rmTimer);
        _rmTimer = null;
      }
      try {
        if (typeof _rmOrig === "function") _rmOrig.call(window);
      } catch (e) {}
    };
    return true;
  }

  function boot() {
    wrapRenderMapas();
  }

  boot();
  setTimeout(boot, 300);
  setTimeout(boot, 1000);
  setTimeout(boot, 2500);
})();
