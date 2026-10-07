/* RUTALOG osrm-on-save v1
 * Mientras armas el viaje: solo pines + lista (sin OSRM).
 * Al Guardar viaje (tras auditoría): una petición OSRM y se guarda la polilínea.
 */
(function () {
  "use strict";
  if (window.__rutalogOsrmOnSaveV1) return;
  window.__rutalogOsrmOnSaveV1 = true;
  window.__rutalogSkipLiveOsrm = true;

  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var layers = [];
  var seq = 0;

  function clearRouteLayers() {
    layers.forEach(function (ly) {
      try { if (estado.mapRutas) estado.mapRutas.removeLayer(ly); } catch (e) {}
    });
    layers = [];
    try {
      if (estado.polyActual && estado.mapRutas) {
        estado.mapRutas.removeLayer(estado.polyActual);
        estado.polyActual = null;
      }
    } catch (e) {}
    try {
      (estado.polysGuardadas || []).forEach(function (pl) {
        try { estado.mapRutas.removeLayer(pl); } catch (e2) {}
      });
      estado.polysGuardadas = [];
    } catch (e) {}
  }

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
    return [la, lo];
  }

  function ptsFromViaje(v) {
    var line = [];
    if (v.origen && v.origen.lat != null) line.push([v.origen.lat, v.origen.lon]);
    else if (estado.origenActual && estado.origenActual.lat != null) {
      line.push([estado.origenActual.lat, estado.origenActual.lon]);
    }
    (v.paradas || []).forEach(function (p) {
      var pos = resolvePos(p);
      if (pos) line.push(pos);
    });
    return line;
  }

  function fetchOsrm(pts) {
    if (!pts || pts.length < 2) return Promise.resolve(null);
    if (pts.length > 25) pts = [pts[0]].concat(pts.slice(-20));
    var coordStr = pts.map(function (p) { return p[1] + "," + p[0]; }).join(";");
    return fetch(OSRM + coordStr + "?overview=full&geometries=geojson", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("osrm " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || data.code !== "Ok" || !data.routes || !data.routes[0]) return null;
        return data.routes[0].geometry.coordinates.map(function (c) {
          return [c[1], c[0]];
        });
      })
      .catch(function () { return null; });
  }

  function drawLatLngs(latlngs, color, weight) {
    if (!latlngs || latlngs.length < 2 || !estado.mapRutas) return null;
    try {
      var pl = L.polyline(latlngs, {
        color: color || "#38bdf8",
        weight: weight || 4,
        opacity: 0.95
      }).addTo(estado.mapRutas);
      layers.push(pl);
      return pl;
    } catch (e) { return null; }
  }

  function paintSavedOnly() {
    var my = ++seq;
    clearRouteLayers();
    (estado.viajesGuardados || []).forEach(function (v) {
      if (!v.paradas || !v.paradas.length) return;
      if (v.osrmLatLngs && v.osrmLatLngs.length >= 2) {
        drawLatLngs(v.osrmLatLngs, v.color || "#38bdf8", 4);
        return;
      }
      var pts = ptsFromViaje(v);
      if (pts.length < 2) return;
      fetchOsrm(pts).then(function (coords) {
        if (my !== seq) return;
        if (coords) {
          v.osrmLatLngs = coords;
          drawLatLngs(coords, v.color || "#38bdf8", 4);
        } else {
          drawLatLngs(pts, v.color || "#38bdf8", 3);
        }
      });
    });
  }

  window.rutalogOsrmAttachToViaje = function (viaje) {
    if (!viaje) return Promise.resolve(null);
    var pts = ptsFromViaje(viaje);
    if (pts.length < 2) return Promise.resolve(null);
    return fetchOsrm(pts).then(function (coords) {
      if (coords) viaje.osrmLatLngs = coords;
      paintSavedOnly();
      return coords;
    });
  };

  function hookGuardar() {
    if (typeof window.confirmarAuditoriaYDespachar === "function" && !window.confirmarAuditoriaYDespachar._osrmSave) {
      var orig = window.confirmarAuditoriaYDespachar;
      window.confirmarAuditoriaYDespachar = async function () {
        var before = (estado.viajesGuardados || []).length;
        var r = await orig.apply(this, arguments);
        try {
          var after = estado.viajesGuardados || [];
          if (after.length > before) {
            await window.rutalogOsrmAttachToViaje(after[after.length - 1]);
          } else {
            paintSavedOnly();
          }
        } catch (e) {
          console.warn("[osrm-on-save]", e);
        }
        return r;
      };
      window.confirmarAuditoriaYDespachar._osrmSave = true;
    }
  }

  function installPaintHook() {
    if (typeof window.renderMapas === "function" && !window.renderMapas._osrmSave) {
      var prev = window.renderMapas;
      window.renderMapas = function () {
        try { prev.apply(this, arguments); } catch (e) {}
        setTimeout(paintSavedOnly, 150);
      };
      window.renderMapas._osrmSave = true;
    }
  }

  function tick() {
    window.__rutalogSkipLiveOsrm = true;
    hookGuardar();
    installPaintHook();
  }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  setTimeout(paintSavedOnly, 2200);
  setInterval(tick, 5000);
  console.info("[RUTALOG] osrm-on-save v1 — OSRM solo al guardar viaje");
})();
