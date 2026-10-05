/* RUTALOG mapa-sin-rectas v1 — elimina polilíneas rectas; solo deja OSRM */
(function () {
  "use strict";
  if (window.__rutalogMapaSinRectasV1) return;
  window.__rutalogMapaSinRectasV1 = true;

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
        try {
          ll = ly.getLatLngs();
        } catch (e) {
          return;
        }
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
        try {
          estado.mapRutas.removeLayer(ly);
        } catch (e) {}
      });
      try {
        if (estado.polyActual) {
          estado.mapRutas.removeLayer(estado.polyActual);
          estado.polyActual = null;
        }
      } catch (e) {}
      try {
        (estado.polysGuardadas || []).forEach(function (p) {
          try {
            estado.mapRutas.removeLayer(p);
          } catch (e2) {}
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

  function install() {
    if (typeof window.renderMapas === "function" && !window.renderMapas._sinRectas) {
      var prev = window.renderMapas;
      window.renderMapas = function () {
        var r = prev.apply(this, arguments);
        afterPaint();
        return r;
      };
      window.renderMapas._sinRectas = true;
    }
    if (typeof window.refrescarRutaUI === "function" && !window.refrescarRutaUI._sinRectas) {
      var pr = window.refrescarRutaUI;
      window.refrescarRutaUI = function () {
        var r = pr.apply(this, arguments);
        afterPaint();
        return r;
      };
      window.refrescarRutaUI._sinRectas = true;
    }
  }

  install();
  setTimeout(install, 500);
  setTimeout(install, 1500);
  setTimeout(strip, 2000);
  setInterval(function () {
    install();
    strip();
  }, 5000);
  console.info("[RUTALOG] mapa-sin-rectas v1 — oculta trazos rectos");
})();
