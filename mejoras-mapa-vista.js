/* RUTALOG mapa-vista v1 — recepción: Hispaniola/RD en todos los mapas */
(function () {
  "use strict";
  if (window.__rutalogMapaVistaV1) return;
  window.__rutalogMapaVistaV1 = true;

  /* Vista de la captura: isla completa (RD + contexto) */
  var RD_SW = [17.4, -72.1];
  var RD_NE = [20.05, -68.1];
  var RD_CENTER = [18.75, -70.35];
  var RD_ZOOM = 8;
  var _applied = { panel: false, rutas: false, cruzados: false };

  function bounds() {
    try {
      if (typeof L === "undefined" || !L.latLngBounds) return null;
      return L.latLngBounds(RD_SW, RD_NE);
    } catch (e) {
      return null;
    }
  }

  function applyReception(map, key, force) {
    if (!map) return;
    try {
      if (!force && _applied[key] && map.__rutalogReceptionOk) return;
      var b = bounds();
      if (b) {
        map.fitBounds(b, { padding: [12, 12], maxZoom: 9, animate: false });
      } else if (map.setView) {
        map.setView(RD_CENTER, RD_ZOOM, { animate: false });
      }
      map.__rutalogReceptionOk = true;
      _applied[key] = true;
    } catch (e) {
      try {
        map.setView(RD_CENTER, RD_ZOOM, { animate: false });
      } catch (e2) {}
    }
  }

  function allMaps(force) {
    try {
      if (!window.estado) return;
      applyReception(estado.mapPanel, "panel", force);
      applyReception(estado.mapRutas, "rutas", force);
      applyReception(estado.mapCruzados, "cruzados", force);
    } catch (e) {}
  }

  window.rutalogMapaRecepcion = function () {
    _applied = { panel: false, rutas: false, cruzados: false };
    allMaps(true);
  };

  /* Tras renderMapas: no dejar el zoom en un pin suelto; volver a recepción
     solo la primera vez o si el mapa quedó fuera de RD */
  function afterRender() {
    try {
      if (!window.estado) return;
      ["mapPanel", "mapRutas", "mapCruzados"].forEach(function (k) {
        var map = estado[k];
        if (!map) return;
        var key = k === "mapPanel" ? "panel" : k === "mapRutas" ? "rutas" : "cruzados";
        if (!_applied[key]) {
          applyReception(map, key, true);
          return;
        }
        /* Si el usuario hizo zoom muy lejos del país, no pelear; si quedó en océano vacío, reset */
        try {
          var c = map.getCenter();
          if (!c) return;
          if (c.lat < 16 || c.lat > 21 || c.lng < -73 || c.lng > -67) {
            applyReception(map, key, true);
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  function install() {
    if (window.RUTALOG && RUTALOG.hooks && typeof RUTALOG.hooks.on === "function") {
      if (!window.__mapaVistaHook) {
        window.__mapaVistaHook = true;
        RUTALOG.hooks.on("despues:renderMapas", function () {
          setTimeout(afterRender, 40);
        });
        RUTALOG.hooks.on("despues:go", function (page) {
          if (page === "panel" || page === "rutas" || page === "cruzados") {
            setTimeout(function () {
              allMaps(false);
              try {
                if (page === "panel" && estado.mapPanel) estado.mapPanel.invalidateSize(false);
                if (page === "rutas" && estado.mapRutas) estado.mapRutas.invalidateSize(false);
                if (page === "cruzados" && estado.mapCruzados) estado.mapCruzados.invalidateSize(false);
              } catch (e) {}
            }, 80);
          }
        });
      }
    }
    allMaps(false);
  }

  install();
  setTimeout(install, 600);
  setTimeout(install, 2000);
  setTimeout(function () {
    allMaps(true);
  }, 2500);

  console.info("[RUTALOG] mapa-vista v1 — recepción RD en panel/rutas/cruzados");
})();
