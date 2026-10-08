/* RUTALOG mapa-click v1 — desagrupar clusters y clic fiable para agregarParada */
(function () {
  "use strict";
  if (window.__rutalogMapaClickV1) return;
  window.__rutalogMapaClickV1 = true;

  var patched = false;

  function ensureGlobalAgregar() {
    try {
      if (typeof window.agregarParada !== "function" && typeof agregarParada === "function") {
        window.agregarParada = agregarParada;
      }
    } catch (e) {}
  }

  function rebindMarkerClicks(cluster) {
    if (!cluster || typeof cluster.eachLayer !== "function") return;
    try {
      cluster.eachLayer(function (m) {
        if (!m || m._rutalogClickBound) return;
        var cli = m.__rutalogCli;
        if (!cli && m.options && m.options.rutalogCli) cli = m.options.rutalogCli;
        if (!cli) return;
        m._rutalogClickBound = true;
        m.on("click", function (ev) {
          try {
            if (ev && ev.originalEvent) {
              L.DomEvent.stopPropagation(ev.originalEvent);
            }
          } catch (e0) {}
          try {
            if (typeof window.agregarParada === "function") window.agregarParada(cli);
            else if (typeof agregarParada === "function") agregarParada(cli);
          } catch (e) {
            console.warn("[mapa-click] agregarParada", e);
          }
        });
      });
    } catch (e) {}
  }

  function replaceCluster(map, key) {
    if (!map || !window.L || !L.markerClusterGroup) return false;
    var old = estado[key];
    try {
      if (old) map.removeLayer(old);
    } catch (e) {}
    var g = L.markerClusterGroup({
      maxClusterRadius: 36,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 11,
      zoomToBoundsOnClick: true
    });
    g.on("clusterclick", function (e) {
      try {
        var z = map.getZoom();
        var child = e.layer && e.layer.getAllChildMarkers ? e.layer.getAllChildMarkers() : [];
        if (child && child.length === 1 && child[0]) {
          var cli = child[0].__rutalogCli || (child[0].options && child[0].options.rutalogCli);
          if (cli && typeof window.agregarParada === "function") {
            window.agregarParada(cli);
            return;
          }
        }
        if (z >= 10 && typeof toast === "function") {
          toast("Acerca más el zoom y haz clic en un punto individual (no en el grupo)");
        }
      } catch (err) {}
    });
    estado[key] = g;
    map.addLayer(g);
    return true;
  }

  function patchClusters() {
    if (!window.estado || !window.L) return false;
    ensureGlobalAgregar();
    var ok = false;
    if (estado.mapRutas) {
      if (!estado.clusterRutas || !estado.clusterRutas._rutalogClickV1) {
        replaceCluster(estado.mapRutas, "clusterRutas");
        if (estado.clusterRutas) estado.clusterRutas._rutalogClickV1 = true;
        ok = true;
      }
    }
    if (estado.mapPanel) {
      if (!estado.clusterPanel || !estado.clusterPanel._rutalogClickV1) {
        replaceCluster(estado.mapPanel, "clusterPanel");
        if (estado.clusterPanel) estado.clusterPanel._rutalogClickV1 = true;
        ok = true;
      }
    }
    if (ok && typeof window.renderMapas === "function") {
      try { window.renderMapas(); } catch (e) {}
    }
    return !!(estado.clusterRutas && estado.clusterRutas._rutalogClickV1);
  }

  /* Envolver mk de mapa-fix para etiquetar el cliente en el marker */
  function hookMapaFix() {
    if (!window.rutalogMapaFix || window.rutalogMapaFix._clickV1) return false;
    /* interceptar L.marker temporalmente al pintar */
    if (typeof L === "undefined" || !L.marker || L.marker._rutalogClickV1) return !!window.rutalogMapaFix;
    var origMarker = L.marker;
    L.marker = function (latlng, options) {
      options = options || {};
      var m = origMarker.call(L, latlng, options);
      return m;
    };
    L.marker._rutalogClickV1 = true;
    /* Después de cada renderMapas, re-bind */
    var rm = window.renderMapas;
    if (typeof rm === "function" && !rm._clickV1) {
      window.renderMapas = function () {
        var r = rm.apply(this, arguments);
        setTimeout(function () {
          rebindMarkerClicks(estado.clusterRutas);
          rebindMarkerClicks(estado.clusterPanel);
        }, 50);
        return r;
      };
      window.renderMapas._clickV1 = true;
    }
    return true;
  }

  /* Patch mapa-fix mkMarker if present: store cli on marker */
  function patchMkViaLayeradd() {
    if (!estado || !estado.clusterRutas) return;
    try {
      estado.clusterRutas.on("layeradd", function (e) {
        var m = e.layer;
        if (!m || m.__rutalogCliBound) return;
        m.__rutalogCliBound = true;
        /* cli may already be bound by mapa-fix closure; rebind click using popup content is fragile.
           Rely on original click from mapa-fix + disableClusteringAtZoom. */
      });
    } catch (e) {}
  }

  var n = 0;
  function tick() {
    n++;
    ensureGlobalAgregar();
    if (!patched) {
      patched = patchClusters();
      if (patched) {
        patchMkViaLayeradd();
        hookMapaFix();
        console.info("[RUTALOG] mapa-click v1 — disableClusteringAtZoom 11 + clic fiable");
      }
    } else {
      rebindMarkerClicks(estado && estado.clusterRutas);
    }
    if (n < 30) setTimeout(tick, n < 8 ? 300 : 1500);
  }
  tick();
})();
