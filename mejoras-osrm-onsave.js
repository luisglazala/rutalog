/* RUTALOG osrm-onsave v1 — H10: sin fetch OSRM al armar viaje; solo al Guardar */
(function () {
  "use strict";
  if (window.__rutalogOsrmOnsaveV1) return;
  window.__rutalogOsrmOnsaveV1 = true;

  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var lastKey = "";
  var lastLayer = null;
  var pendingSeq = 0;

  function resolvePos(p) {
    if (!p) return null;
    var la = p.lat, lo = p.lon;
    if ((la == null || lo == null) && window.estado) {
      var c = (estado.clientesHoy || []).find(function (x) {
        return String(x.idCliente) === String(p.idCliente);
      });
      if (c) { la = c.lat; lo = c.lon; }
    }
    if (la == null || lo == null) return null;
    if (typeof jitter === "function") {
      try { var j = jitter(la, lo, p.idCliente); return [j[0], j[1]]; } catch (e) {}
    }
    return [la, lo];
  }

  function ptsActual() {
    var pts = [];
    try {
      if (estado.origenActual && estado.origenActual.lat != null)
        pts.push([estado.origenActual.lat, estado.origenActual.lon]);
      (estado.viajeActual || []).forEach(function (p) {
        var pos = resolvePos(p);
        if (pos) pts.push(pos);
      });
    } catch (e) {}
    return pts;
  }

  function clearOsrmLayer() {
    try {
      if (lastLayer && estado.mapRutas) estado.mapRutas.removeLayer(lastLayer);
    } catch (e) {}
    lastLayer = null;
  }

  function drawDraftOnly() {
    if (!estado || !estado.mapRutas) return;
    clearOsrmLayer();
    try {
      if (estado.polyActual) {
        estado.mapRutas.removeLayer(estado.polyActual);
        estado.polyActual = null;
      }
    } catch (e) {}
    var pts = ptsActual();
    if (pts.length < 2) return;
    try {
      estado.polyActual = L.polyline(pts, {
        color: "#f59e0b", weight: 5, dashArray: "8,6", opacity: 0.9
      }).addTo(estado.mapRutas);
    } catch (e2) {}
  }

  function fetchOsrmOnce(force) {
    var pts = ptsActual();
    if (pts.length < 2) return Promise.resolve(null);
    var key = pts.map(function (p) { return p[0].toFixed(5) + "," + p[1].toFixed(5); }).join(";");
    if (!force && key === lastKey && lastLayer) return Promise.resolve(lastLayer);
    lastKey = key;
    var seq = ++pendingSeq;
    var coordStr = pts.map(function (p) { return p[1] + "," + p[0]; }).join(";");
    return fetch(OSRM + coordStr + "?overview=full&geometries=geojson")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (seq !== pendingSeq) return null;
        clearOsrmLayer();
        try {
          if (estado.polyActual) {
            estado.mapRutas.removeLayer(estado.polyActual);
            estado.polyActual = null;
          }
        } catch (e) {}
        if (!data || data.code !== "Ok" || !data.routes || !data.routes[0]) {
          drawDraftOnly();
          return null;
        }
        var coords = data.routes[0].geometry.coordinates.map(function (c) {
          return [c[1], c[0]];
        });
        try {
          lastLayer = L.polyline(coords, { color: "#f59e0b", weight: 6, opacity: 1 }).addTo(estado.mapRutas);
          if (window.estado) estado._osrmGeometry = coords;
        } catch (e2) {}
        return lastLayer;
      })
      .catch(function () {
        drawDraftOnly();
        return null;
      });
  }

  function muteAutoOsrm() {
    window.rutalogDibujarOSRM = function () { drawDraftOnly(); };
    if (window.__osrmFetchPatched) return;
    window.__osrmFetchPatched = true;
    var _fetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (url.indexOf("router.project-osrm.org") !== -1 && !window.__rutalogOsrmAllow) {
        return Promise.resolve(new Response(JSON.stringify({ code: "Muted" }), {
          status: 200, headers: { "Content-Type": "application/json" }
        }));
      }
      return _fetch.apply(this, arguments);
    };
  }

  function wireGuardar() {
    var btn = document.getElementById("btnGuardarViaje");
    if (!btn || btn._osrmOnsave) return;
    btn._osrmOnsave = true;
    btn.addEventListener("click", function () {
      window.__rutalogOsrmAllow = true;
      fetchOsrmOnce(true).finally(function () {
        setTimeout(function () { window.__rutalogOsrmAllow = false; }, 3000);
      });
    }, true);
  }

  var n = 0;
  function tick() {
    n++;
    muteAutoOsrm();
    wireGuardar();
    if (n < 50) setTimeout(tick, n < 10 ? 250 : 1200);
  }
  tick();
  console.info("[RUTALOG] osrm-onsave v1 — OSRM solo al Guardar viaje");
})();
