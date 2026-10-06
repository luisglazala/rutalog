/* RUTALOG rutas-mapa.js — dueño de invalidateSize debounced del mapa de rutas */
(function () {
  "use strict";
  if (window.__rutalogRutasMapaV1) return;
  window.__rutalogRutasMapaV1 = true;

  var ro = null;
  var invTimer = null;

  function mapEl() {
    return document.getElementById("mapRutas");
  }

  function invalidate() {
    try {
      if (!window.estado || !estado.mapRutas || !estado.mapRutas.invalidateSize) return;
      if (invTimer) clearTimeout(invTimer);
      invTimer = setTimeout(function () {
        invTimer = null;
        try { estado.mapRutas.invalidateSize(false); } catch (e) {}
      }, 120);
    } catch (e) {}
  }

  function ensureRO() {
    var el = mapEl();
    if (!el || typeof ResizeObserver === "undefined") return;
    if (ro) return;
    ro = new ResizeObserver(function () { invalidate(); });
    ro.observe(el);
  }

  function boot() {
    ensureRO();
    if (window.RUTALOG && RUTALOG.hooks) {
      RUTALOG.hooks.on("despues:go", function (page) {
        if (page === "rutas") setTimeout(invalidate, 80);
      });
      RUTALOG.hooks.on("despues:renderMapas", function () {
        setTimeout(invalidate, 80);
      });
    }
  }

  boot();
  setTimeout(boot, 500);
  setTimeout(boot, 2000);
  if (window.RUTALOG && RUTALOG.tick) {
    RUTALOG.tick.registrar("rutas-mapa:ro", ensureRO, { cada: 5000, vista: "rutas" });
  }
  console.info("[RUTALOG] rutas-mapa v1 — ResizeObserver único");
})();
