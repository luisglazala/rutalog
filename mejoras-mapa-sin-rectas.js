/* RUTALOG mapa-sin-rectas v2 — hooks, sin reasignar renderMapas */
(function () {
  "use strict";
  if (window.__rutalogMapaSinRectasV2) return;
  window.__rutalogMapaSinRectasV2 = true;

  function isStraightish(latlngs) {
    if (!latlngs || latlngs.length < 2) return true;
    return latlngs.length <= 12;
  }

  function strip() {
    try {
      if (!window.estado || !estado.mapRutas || !estado.mapRutas.eachLayer) return;
      if (typeof L === "undefined") return;
      var kill = [];
      estado.mapRutas.eachLayer(function (ly) {
        if (!ly || !(ly instanceof L.Polyline)) return;
        if (ly instanceof L.Polygon) return;
        var ll = null;
        try { ll = ly.getLatLngs(); } catch (e) { return; }
        if (ll && ll.length && Array.isArray(ll[0]) && ll[0].lat == null) {
          var flat = [];
          ll.forEach(function (seg) {
            if (Array.isArray(seg)) flat = flat.concat(seg);
          });
          ll = flat;
        }
        if (isStraightish(ll)) kill.push(ly);
      });
      kill.forEach(function (ly) {
        try { estado.mapRutas.removeLayer(ly); } catch (e) {}
      });
      try {
        if (estado.polyActual) {
          estado.mapRutas.removeLayer(estado.polyActual);
          estado.polyActual = null;
        }
      } catch (e) {}
      try {
        (estado.polysGuardadas || []).forEach(function (p) {
          try { estado.mapRutas.removeLayer(p); } catch (e2) {}
        });
        estado.polysGuardadas = [];
      } catch (e) {}
    } catch (e) {}
  }

  function afterPaint() {
    setTimeout(strip, 50);
    setTimeout(strip, 300);
    setTimeout(strip, 900);
  }

  function bind() {
    if (window.RUTALOG && RUTALOG.hooks) {
      RUTALOG.hooks.on("despues:renderMapas", afterPaint);
      RUTALOG.hooks.on("despues:refrescarRutaUI", afterPaint);
      return true;
    }
    return false;
  }

  if (!bind()) {
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (bind() || n > 30) clearInterval(t);
    }, 300);
  }

  if (window.RUTALOG && RUTALOG.tick) {
    RUTALOG.tick.registrar("mapa:sin-rectas", strip, { cada: 5000, vista: "rutas" });
  }
  console.info("[RUTALOG] mapa-sin-rectas v2 — hooks");
})();
