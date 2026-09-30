/* RUTALOG centros CI en mapa v2 — solo origen seleccionado, icono sutil */
(function () {
  "use strict";
  if (window.__rutalogCentrosCI) return;
  window.__rutalogCentrosCI = true;

  var ALMACENES_MAPA = [
    { id: "almacen-spm", corto: "SPM", nombre: "Cesar Iglesias - San Pedro de Macoris (CEDI)", direccion: "C/ Cesar Iglesias No.1, Zona Industrial", lat: 18.46601, lon: -69.31717, color: "#dc2626" },
    { id: "almacen-sd",  corto: "SD", nombre: "Cesar Iglesias - Santo Domingo", direccion: "Av. Independencia No. 2403, Jardines del Caribe", lat: 18.4415, lon: -69.9420, color: "#2563eb" },
    { id: "almacen-lv",  corto: "La Vega", nombre: "Cesar Iglesias - La Vega", direccion: "Av. Pedro A. Rivera, Km 0", lat: 19.2250, lon: -70.5300, color: "#16a34a" }
  ];

  function iconoOrigenSutil(a) {
    /* Pin discreto: círculo pequeño + anillo suave, sin texto grande */
    var html =
      '<div style="position:relative;width:28px;height:28px;">' +
      '<div style="position:absolute;inset:0;border-radius:50%;background:' + a.color +
      ';opacity:.22;transform:scale(1.55)"></div>' +
      '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'width:14px;height:14px;border-radius:50%;background:' + a.color +
      ';border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>' +
      '</div>';
    return L.divIcon({
      className: "rutalog-origen-ico",
      html: html,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -12]
    });
  }

  function clearMarkers() {
    try {
      if (!window.estado || !estado.markersAlmacenes) return;
      estado.markersAlmacenes.forEach(function (m) {
        try {
          if (estado.mapPanel) estado.mapPanel.removeLayer(m);
          if (estado.mapRutas) estado.mapRutas.removeLayer(m);
        } catch (e) {}
      });
      estado.markersAlmacenes = [];
    } catch (e) {}
  }

  function getOrigenActivo() {
    try {
      if (!window.estado || !estado.origenActual) return null;
      var o = estado.origenActual;
      /* Preferir datos canónicos por id */
      if (o.id) {
        for (var i = 0; i < ALMACENES_MAPA.length; i++) {
          if (ALMACENES_MAPA[i].id === o.id) return ALMACENES_MAPA[i];
        }
      }
      if (o.lat != null && o.lon != null) {
        return {
          id: o.id || "origen",
          corto: o.corto || "Origen",
          nombre: o.nombre || o.corto || "Centro de trabajo",
          direccion: o.direccion || "",
          lat: o.lat,
          lon: o.lon,
          color: o.color || "#16a34a"
        };
      }
    } catch (e) {}
    return null;
  }

  function pintar() {
    try {
      if (typeof L === "undefined" || !window.estado) return;
      if (!estado.mapPanel && !estado.mapRutas) return;
      clearMarkers();
      if (!estado.markersAlmacenes) estado.markersAlmacenes = [];

      var a = getOrigenActivo();
      if (!a) return; /* Sin centro seleccionado → nada en el mapa */

      var popup =
        '<div style="min-width:170px">' +
        '<div style="font-size:11px;color:#888;margin-bottom:2px">Origen del viaje</div>' +
        '<strong style="font-size:13px">' + a.nombre + '</strong>' +
        (a.direccion ? '<div style="font-size:12px;color:#666;margin-top:4px">' + a.direccion + '</div>' : '') +
        '</div>';

      function addTo(map) {
        if (!map) return;
        var m = L.marker([a.lat, a.lon], {
          icon: iconoOrigenSutil(a),
          zIndexOffset: 4500,
          title: "Origen: " + a.corto
        });
        m.bindPopup(popup);
        m.addTo(map);
        estado.markersAlmacenes.push(m);
      }
      addTo(estado.mapPanel);
      addTo(estado.mapRutas);
    } catch (e) {
      console.warn("[RUTALOG] centros CI", e);
    }
  }

  function hook() {
    if (typeof window.renderMapas === "function" && !window.renderMapas._centrosCI) {
      var orig = window.renderMapas;
      window.renderMapas = function () {
        var r = orig.apply(this, arguments);
        setTimeout(pintar, 60);
        return r;
      };
      window.renderMapas._centrosCI = true;
    }
    if (typeof window.seleccionarOrigen === "function" && !window.seleccionarOrigen._centrosCI) {
      var so = window.seleccionarOrigen;
      window.seleccionarOrigen = function (a) {
        var r = so.apply(this, arguments);
        setTimeout(pintar, 40);
        return r;
      };
      window.seleccionarOrigen._centrosCI = true;
    }
  }

  function boot() {
    hook();
    pintar();
  }

  setTimeout(boot, 800);
  setTimeout(boot, 2000);
  setTimeout(boot, 4500);
  setInterval(function () { hook(); pintar(); }, 4000);
})();
