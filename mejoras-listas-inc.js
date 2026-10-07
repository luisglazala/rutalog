/* RUTALOG listas-inc v1 — H11: debounce lista viaje + skip si no cambió */
(function () {
  "use strict";
  if (window.__rutalogListasIncV1) return;
  window.__rutalogListasIncV1 = true;

  var lastKey = "";
  var timer = null;
  var DEBOUNCE = 80;

  function viajeKey() {
    try {
      var va = (estado.viajeActual || []).map(function (p) {
        return p.idCliente + ":" + (p.peso || 0);
      }).join(",");
      var vg = (estado.viajesGuardados || []).length;
      return va + "|" + vg;
    } catch (e) {
      return String(Date.now());
    }
  }

  function install() {
    if (typeof window.refrescarRutaUI !== "function") return false;
    if (window.refrescarRutaUI._listasInc) return true;
    var orig = window.refrescarRutaUI;
    window.refrescarRutaUI = function () {
      var key = viajeKey();
      if (key === lastKey && !window.__rutalogForceLista) {
        return;
      }
      if (timer) clearTimeout(timer);
      var args = arguments;
      var self = this;
      timer = setTimeout(function () {
        timer = null;
        lastKey = viajeKey();
        try { return orig.apply(self, args); } catch (e) {
          console.warn("[listas-inc]", e);
        }
      }, DEBOUNCE);
    };
    window.refrescarRutaUI._listasInc = true;
    window.refrescarRutaUI.now = function () {
      lastKey = "";
      window.__rutalogForceLista = true;
      try { orig.apply(window, arguments); } finally {
        window.__rutalogForceLista = false;
        lastKey = viajeKey();
      }
    };
    return true;
  }

  var n = 0;
  function tick() {
    n++;
    install();
    if (n < 40) setTimeout(tick, n < 10 ? 200 : 1000);
  }
  tick();
  console.info("[RUTALOG] listas-inc v1 — debounce + skip lista sin cambios");
})();
