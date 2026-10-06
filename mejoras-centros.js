/* RUTALOG centros CI en mapa v3 — solo origen seleccionado, icono sutil */
(function () {
  "use strict";
  if (window.__rutalogCentrosCIv3) return;
  window.__rutalogCentrosCIv3 = true;

  function injectMapIconCSS() {
    if (document.getElementById("rutalog-map-icon-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-map-icon-css";
    st.textContent = [
      ".leaflet-div-icon{",
      "  background:transparent!important;",
      "  border:none!important;",
      "  box-shadow:none!important;",
      "}",
      ".leaflet-marker-icon.leaflet-div-icon{",
      "  background:transparent!important;",
      "  border:none!important;",
      "}",
      ".rutalog-origen-ico{",
      "  background:transparent!important;",
      "  border:none!important;",
      "}",
      ".leaflet-div-icon .marcador{",
      "  border-radius:50%!important;",
      "  display:flex!important;align-items:center!important;justify-content:center!important;",
      "  color:#fff!important;font-weight:700!important;",
      "  box-shadow:0 1px 4px rgba(0,0,0,.35)!important;",
      "}"
    ].join("");
    document.head.appendChild(st);
  }

  var ALMACENES_MAPA = [
    { id: "almacen-spm", corto: "SPM", nombre: "Cesar Iglesias - San Pedro de Macoris (CEDI)", direccion: "C/ Cesar Iglesias No.1, Zona Industrial", lat: 18.46601, lon: -69.31717, color: "#dc2626" },
    { id: "almacen-sd",  corto: "SD", nombre: "Cesar Iglesias - Santo Domingo", direccion: "Av. Independencia No. 2403, Jardines del Caribe", lat: 18.4415, lon: -69.9420, color: "#2563eb" },
    { id: "almacen-lv",  corto: "La Vega", nombre: "Cesar Iglesias - La Vega", direccion: "Av. Pedro A. Rivera, Km 0", lat: 19.2250, lon: -70.5300, color: "#16a34a" }
  ];

  function iconoOrigenSutil(a) {
    var html =
      '<div style="position:relative;width:28px;height:28px;">' +
      '<div style="position:absolute;inset:0;border-radius:50%;background:' + a.color +
      ';opacity:.22;transform:scale(1.55)"></div>' +
      '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'width:14px;height:14px;border-radius:50%;background:' + a.color +
      ';border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>' +
      '</div>';
    return L.divIcon({
      className: "rutalog-origen-ico leaflet-div-icon-clean",
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
          lat: Number(o.lat),
          lon: Number(o.lon),
          color: o.color || "#64748b"
        };
      }
    } catch (e) {}
    return null;
  }

  function pintar() {
    try {
      if (typeof L === "undefined") return;
      clearMarkers();
      if (!window.estado) return;
      if (!estado.markersAlmacenes) estado.markersAlmacenes = [];
      var a = getOrigenActivo();
      if (!a) return;
      var maps = [];
      if (estado.mapPanel) maps.push(estado.mapPanel);
      if (estado.mapRutas) maps.push(estado.mapRutas);
      maps.forEach(function (map) {
        if (!map) return;
        var m = L.marker([a.lat, a.lon], {
          icon: iconoOrigenSutil(a),
          zIndexOffset: 500,
          interactive: true
        });
        m.bindPopup("<strong>" + (a.corto || "Origen") + "</strong><br>" + (a.nombre || "") + (a.direccion ? "<br><small>" + a.direccion + "</small>" : ""));
        m.addTo(map);
        estado.markersAlmacenes.push(m);
      });
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
    injectMapIconCSS();
    hook();
    pintar();
  }

  injectMapIconCSS();
  setTimeout(boot, 800);
  setTimeout(boot, 2000);
  setTimeout(boot, 4500);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('centros:pintar', function () { hook(); pintar(); }, { cada: 4000, vista: 'siempre' }); else setInterval(function () { hook(); pintar(); }, 4000);
})();
