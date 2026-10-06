/* RUTALOG rutas-mapa v2 — coordinador del mapa de rutas (hooks + ResizeObserver) */
(function () {
  "use strict";
  if (window.__rutalogRutasMapaV2) return;
  window.__rutalogRutasMapaV2 = true;

  var ro = null;
  var invTimer = null;

  function invalidate() {
    try {
      if (!window.estado || !estado.mapRutas || !estado.mapRutas.invalidateSize) return;
      if (invTimer) clearTimeout(invTimer);
      invTimer = setTimeout(function () {
        invTimer = null;
        try { estado.mapRutas.invalidateSize(false); } catch (e) {}
      }, 100);
    } catch (e) {}
  }

  function ensureRO() {
    var el = document.getElementById("mapRutas");
    if (!el || typeof ResizeObserver === "undefined") return;
    if (ro) return;
    ro = new ResizeObserver(function () { invalidate(); });
    ro.observe(el);
  }

  function onView() {
    ensureRO();
    invalidate();
  }

  function boot() {
    ensureRO();
    if (window.RUTALOG && RUTALOG.hooks) {
      RUTALOG.hooks.on("despues:go", function (page) {
        if (page === "rutas") onView();
      });
      RUTALOG.hooks.on("despues:renderMapas", function () {
        if (window.estado && estado.page === "rutas") invalidate();
      });
    }
  }

  boot();
  setTimeout(boot, 600);
  setTimeout(boot, 2000);
  if (window.RUTALOG && RUTALOG.tick) {
    RUTALOG.tick.registrar("rutas-mapa:ro", ensureRO, { cada: 8000, vista: "rutas" });
  }
  console.info("[RUTALOG] rutas-mapa v2 — coordinador (hooks + RO)");
})();
