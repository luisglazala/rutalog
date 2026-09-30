/* RUTALOG centros CI en mapa v1 */
(function () {
  "use strict";
  if (window.__rutalogCentrosCI) return;
  window.__rutalogCentrosCI = true;

  var ALMACENES_MAPA = [
    { id: "almacen-spm", corto: "SPM", nombre: "Cesar Iglesias - San Pedro de Macoris (CEDI)", direccion: "C/ Cesar Iglesias No.1, Zona Industrial", lat: 18.46601, lon: -69.31717, color: "#dc2626" },
    { id: "almacen-sd",  corto: "SD", nombre: "Cesar Iglesias - Santo Domingo", direccion: "Av. Independencia No. 2403, Jardines del Caribe", lat: 18.4415, lon: -69.9420, color: "#2563eb" },
    { id: "almacen-lv",  corto: "La Vega", nombre: "Cesar Iglesias - La Vega", direccion: "Av. Pedro A. Rivera, Km 0", lat: 19.2250, lon: -70.5300, color: "#16a34a" }
  ];

  function iconoAlmacen(a, esOrigen) {
    var ring = esOrigen ? "3px solid #fbbf24" : "2px solid #fff";
    var scale = esOrigen ? "1.15" : "1";
    var label = a.corto.length > 5 ? a.corto.slice(0, 3) : a.corto;
    var html = '<div style="transform:scale(' + scale + ');width:38px;height:38px;border-radius:10px;background:' + a.color +
      ';border:' + ring + ';box-shadow:0 4px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;' +
      'color:#fff;font-weight:800;font-size:11px;font-family:system-ui,sans-serif">' + label + '</div>';
    return L.divIcon({ className: "rutalog-almacen-ico", html: html, iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -20] });
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

  function pintar() {
    try {
      if (typeof L === "undefined" || !window.estado) return;
      if (!estado.mapPanel && !estado.mapRutas) return;
      clearMarkers();
      if (!estado.markersAlmacenes) estado.markersAlmacenes = [];
      var origenId = estado.origenActual && estado.origenActual.id;

      ALMACENES_MAPA.forEach(function (a) {
        var esOrigen = origenId === a.id;
        var popup =
          '<div style="min-width:190px"><strong style="font-size:13px">' + a.nombre + '</strong>' +
          (esOrigen ? ' <span style="color:#ca8a04;font-weight:700">· ORIGEN</span>' : '') +
          '<div style="font-size:12px;color:#666;margin-top:4px">' + a.direccion + '</div>' +
          '<div style="font-size:11px;color:#888;margin-top:4px">Lat ' + a.lat + ' · Lon ' + a.lon + '</div>' +
          (!esOrigen
            ? '<button type="button" class="btn btn-primary btn-sm" style="margin-top:8px;width:100%" data-alm="' + a.id + '">Usar como origen</button>'
            : '<div style="margin-top:6px;font-size:12px;color:#16a34a;font-weight:600">Centro de trabajo activo</div>') +
          '</div>';

        function addTo(map) {
          if (!map) return;
          var m = L.marker([a.lat, a.lon], {
            icon: iconoAlmacen(a, esOrigen),
            zIndexOffset: esOrigen ? 5000 : 3500,
            title: a.corto + " - " + a.nombre
          });
          m.bindPopup(popup);
          m.on("popupopen", function () {
            var btn = document.querySelector('.leaflet-popup-content button[data-alm="' + a.id + '"]');
            if (btn) {
              btn.onclick = function () {
                if (typeof seleccionarOrigen === "function") seleccionarOrigen(a);
                else {
                  estado.origenActual = a;
                  if (typeof toast === "function") toast("Origen: " + a.corto);
                  if (typeof refrescarRutaUI === "function") refrescarRutaUI();
                }
                pintar();
              };
            }
          });
          m.addTo(map);
          estado.markersAlmacenes.push(m);
        }
        addTo(estado.mapPanel);
        addTo(estado.mapRutas);
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
    hook();
    pintar();
  }

  setTimeout(boot, 800);
  setTimeout(boot, 2000);
  setTimeout(boot, 4500);
  setInterval(function () { hook(); pintar(); }, 4000);
})();
