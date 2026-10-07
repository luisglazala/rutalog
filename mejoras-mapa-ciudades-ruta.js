/* RUTALOG mapa-ciudades-ruta v3.1 — filtro + OSRM; skip live si __rutalogSkipLiveOsrm */
(function () {
  "use strict";
  if (window.__rutalogMapaCiudadesRutaV2) return;
  window.__rutalogMapaCiudadesRutaV2 = true;
  window.__rutalogMapaCiudadesRutaV1 = true;

  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var osrmLayers = [];
  var osrmSeq = 0;
  var osrmControllers = [];
  var paintTimer = null;
  var lastMarkerKey = "";
  var lastRouteKey = "";
  var painting = false;

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  function cityKey(s) {
    var n = norm(s);
    if (!n) return "";
    if (n.indexOf("santiago rodriguez") === 0) return "santiago rodriguez";
    if (n === "santiago" || n.indexOf("santiago de los") === 0) return "santiago";
    if (n.indexOf("santo domingo") === 0 || n === "distrito nacional" || n === "sdn" || n === "sde" || n === "sdo") return "santo domingo";
    if (n.indexOf("san pedro") === 0) return "san pedro de macoris";
    if (n.indexOf("san francisco") === 0) return "san francisco de macoris";
    return n;
  }
  function filtroActivo() {
    try {
      if (typeof getCiudadesSeleccionadas !== "function") return null;
      var sel = getCiudadesSeleccionadas();
      if (!sel || !sel.length || sel.indexOf("__TODAS__") >= 0) return null;
      return sel.map(cityKey).filter(Boolean);
    } catch (e) { return null; }
  }
  function ciudadPasaFiltro(ciudad) {
    var f = filtroActivo();
    if (!f) return true;
    var k = cityKey(ciudad);
    if (!k) return false;
    return f.indexOf(k) >= 0;
  }
  function abortOsrm() {
    osrmControllers.forEach(function (c) { try { c.abort(); } catch (e) {} });
    osrmControllers = [];
  }
  function clearOsrmLayersOnly() {
    abortOsrm();
    osrmLayers.forEach(function (ly) {
      try { if (estado.mapRutas) estado.mapRutas.removeLayer(ly); } catch (e) {}
    });
    osrmLayers = [];
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
  function fetchOsrmOnce(pts, signal) {
    var coordStr = pts.map(function (p) { return p[1] + "," + p[0]; }).join(";");
    return fetch(OSRM + coordStr + "?overview=full&geometries=geojson", { signal: signal, cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("osrm " + r.status);
      return r.json();
    });
  }
  function fetchOsrm(pts, color, weight, seq) {
    if (!pts || pts.length < 2 || !estado.mapRutas) return;
    if (pts.length > 25) pts = [pts[0]].concat(pts.slice(-20));
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (ctrl) osrmControllers.push(ctrl);
    var signal = ctrl ? ctrl.signal : undefined;
    function addFallback() {
      if (seq !== osrmSeq) return;
      try {
        var fb = L.polyline(pts, { color: color || "#38bdf8", weight: weight || 4, opacity: 0.75, dashArray: "8,6" }).addTo(estado.mapRutas);
        osrmLayers.push(fb);
      } catch (e) {}
    }
    function addGeo(data) {
      if (seq !== osrmSeq) return;
      if (!data || data.code !== "Ok" || !data.routes || !data.routes[0]) { addFallback(); return; }
      try {
        var coords = data.routes[0].geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
        var pl = L.polyline(coords, { color: color || "#38bdf8", weight: weight || 4, opacity: 0.95 }).addTo(estado.mapRutas);
        osrmLayers.push(pl);
      } catch (e) { addFallback(); }
    }
    fetchOsrmOnce(pts, signal).then(addGeo).catch(function (err) {
      if (err && err.name === "AbortError") return;
      if (seq !== osrmSeq) return;
      setTimeout(function () {
        if (seq !== osrmSeq) return;
        var ctrl2 = typeof AbortController !== "undefined" ? new AbortController() : null;
        if (ctrl2) osrmControllers.push(ctrl2);
        fetchOsrmOnce(pts, ctrl2 ? ctrl2.signal : undefined).then(addGeo).catch(function () {
          if (seq !== osrmSeq) return;
          addFallback();
        });
      }, 400);
    });
  }
  function resolvePos(p) {
    if (!p) return null;
    var la = p.lat, lo = p.lon;
    if ((la == null || lo == null) && window.estado) {
      var c = (estado.clientesHoy || []).find(function (x) { return String(x.idCliente) === String(p.idCliente); });
      if (c) { la = c.lat; lo = c.lon; }
    }
    if (la == null || lo == null) return null;
    if (typeof jitter === "function") {
      try { var j = jitter(la, lo, p.idCliente); return [j[0], j[1]]; } catch (e) {}
    }
    return [la, lo];
  }
  function inActual(id) {
    try {
      return (estado.viajeActual || []).some(function (p) { return String(p.idCliente) === String(id); });
    } catch (e) { return false; }
  }
  function debeOcultarDespachado(id) {
    try {
      if (typeof clienteCompletamenteAsignado === "function") {
        if (clienteCompletamenteAsignado(id) || clienteCompletamenteAsignado(String(id))) return true;
      }
    } catch (e) {}
    try {
      var inG = (estado.viajesGuardados || []).some(function (v) {
        return (v.paradas || []).some(function (p) { return String(p.idCliente) === String(id); });
      });
      if (!inG) return false;
      var pend = (estado.lineasPendientes && (estado.lineasPendientes.get(id) || estado.lineasPendientes.get(String(id)))) || [];
      if (!pend.length) return true;
      return !pend.some(function (l) {
        return !l.despachado && (l.aDespachar == null || Math.abs(Number(l.aDespachar)) > 1e-9);
      });
    } catch (e) { return false; }
  }
  function filterClientesForMap() {
    return (estado.clientesHoy || []).filter(function (c) {
      if (!c || c.lat == null || c.lon == null) return false;
      if (inActual(c.idCliente)) return true;
      if (debeOcultarDespachado(c.idCliente)) return false;
      if (!ciudadPasaFiltro(c.ciudad)) return false;
      return true;
    });
  }
  function markerSetKey(lista) {
    var ids = lista.map(function (c) { return String(c.idCliente); }).sort();
    var act = (estado.viajeActual || []).map(function (p, i) { return String(p.idCliente) + ":" + i; }).join(",");
    var f = filtroActivo();
    return ids.join(",") + "|" + act + "|" + (f ? f.join(",") : "*");
  }
  function routeSetKey() {
    var parts = [];
    if (estado.origenActual) parts.push("o:" + estado.origenActual.lat + "," + estado.origenActual.lon);
    (estado.viajeActual || []).forEach(function (p) { parts.push("a:" + p.idCliente); });
    (estado.viajesGuardados || []).forEach(function (v, i) {
      parts.push("g" + i + ":" + (v.paradas || []).map(function (p) { return p.idCliente; }).join("-"));
    });
    return parts.join("|");
  }
  function addMarker(cluster, markersMap, cli, st, clickable) {
    if (!cluster || !cli || cli.lat == null) return;
    var la = cli.lat, lo = cli.lon;
    if (typeof jitter === "function") {
      try { var j = jitter(cli.lat, cli.lon, cli.idCliente); la = j[0]; lo = j[1]; } catch (e) {}
    }
    var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
    var m = ico ? L.marker([la, lo], { icon: ico, zIndexOffset: st.z || 1000 }) : L.marker([la, lo], { zIndexOffset: st.z || 1000 });
    if (typeof popupHtml === "function") { try { m.bindPopup(popupHtml(cli)); } catch (e) {} }
    if (clickable) {
      m.on("click", function () { try { if (typeof agregarParada === "function") agregarParada(cli); } catch (e) {} });
    }
    cluster.addLayer(m);
    if (markersMap) markersMap.set(cli.idCliente, m);
  }
  function rebuildMarkers(lista) {
    function fill(cluster, markersMap, allowClick) {
      if (!cluster) return markersMap || new Map();
      try { cluster.clearLayers(); if (markersMap) markersMap.clear(); } catch (e) {}
      if (!markersMap) markersMap = new Map();
      lista.forEach(function (cli) {
        if (inActual(cli.idCliente)) return;
        addMarker(cluster, markersMap, cli, { color: "#64748b", texto: "", sz: 22, z: 400 }, allowClick);
      });
      return markersMap;
    }
    if (estado.mapPanel && estado.clusterPanel) {
      estado.markersPanel = fill(estado.clusterPanel, estado.markersPanel || new Map(), false);
      try { estado.mapPanel.invalidateSize(false); } catch (e) {}
    }
    if (estado.mapRutas && estado.clusterRutas) {
      estado.markersRutas = fill(estado.clusterRutas, estado.markersRutas || new Map(), true);
      (estado.viajeActual || []).forEach(function (p, i) {
        var cli = Object.assign({}, p);
        var pos = resolvePos(p);
        if (pos) { cli.lat = pos[0]; cli.lon = pos[1]; }
        addMarker(estado.clusterRutas, estado.markersRutas, cli, { color: "#f59e0b", texto: String(i + 1), sz: 32, z: 3500 }, false);
      });
      try { estado.mapRutas.invalidateSize(false); } catch (e) {}
    }
  }
  function rebuildRoutesOnly() {
    var seq = ++osrmSeq;
    clearOsrmLayersOnly();
    var ptsAct = [];
    if (estado.origenActual && estado.origenActual.lat != null) {
      ptsAct.push([estado.origenActual.lat, estado.origenActual.lon]);
    }
    (estado.viajeActual || []).forEach(function (p) {
      var pos = resolvePos(p);
      if (pos) ptsAct.push(pos);
    });
    if (!window.__rutalogSkipLiveOsrm && ptsAct.length >= 2) fetchOsrm(ptsAct, "#38bdf8", 5, seq);
    if (window.__rutalogSkipLiveOsrm) return;
    (estado.viajesGuardados || []).forEach(function (v) {
      if (!v.paradas || !v.paradas.length) return;
      var line = [];
      if (v.origen && v.origen.lat != null) line.push([v.origen.lat, v.origen.lon]);
      else if (estado.origenActual && estado.origenActual.lat != null) {
        line.push([estado.origenActual.lat, estado.origenActual.lon]);
      }
      v.paradas.forEach(function (p) {
        var pos = resolvePos(p);
        if (pos) line.push(pos);
      });
      if (line.length >= 2) fetchOsrm(line, v.color || "#38bdf8", 4, seq);
    });
  }
  function updateBadges(lista) {
    try {
      var n = 0, peso = 0;
      lista.forEach(function (c) {
        if (inActual(c.idCliente)) return;
        n++; peso += Number(c.peso) || 0;
      });
      var el = document.getElementById("badgeActivos");
      if (el) el.textContent = n + " puntos activos";
      el = document.getElementById("badgeMapaPanel");
      if (el) el.textContent = n + " puntos";
      el = document.getElementById("sMapa");
      if (el) el.textContent = String(n);
      el = document.getElementById("sPeso");
      if (el) el.textContent = peso.toFixed(2) + " kg";
    } catch (e) {}
  }
  function paintFiltered(force) {
    if (!window.estado || painting) return;
    painting = true;
    try {
      var lista = filterClientesForMap();
      var mk = markerSetKey(lista);
      var rk = routeSetKey();
      if (force || mk !== lastMarkerKey) { rebuildMarkers(lista); lastMarkerKey = mk; }
      if (force || rk !== lastRouteKey) { rebuildRoutesOnly(); lastRouteKey = rk; }
      updateBadges(lista);
    } catch (e) { console.warn("[mapa-ciudades-ruta]", e); }
    painting = false;
  }
  function schedulePaint(force) {
    if (paintTimer) clearTimeout(paintTimer);
    paintTimer = setTimeout(function () { paintTimer = null; paintFiltered(!!force); }, force ? 60 : 140);
  }
  function install() {
    if (typeof window.renderMapas === "function" && !window.renderMapas._ciuRutaV2) {
      var prev = window.renderMapas;
      window.renderMapas = function () { try { prev.apply(this, arguments); } catch (e) {} schedulePaint(false); };
      window.renderMapas._ciuRutaV2 = true;
      window.renderMapas._ciuRuta = true;
    }
    if (typeof window.refrescarRutaUI === "function" && !window.refrescarRutaUI._ciuRutaV2) {
      var pr = window.refrescarRutaUI;
      window.refrescarRutaUI = function () { var r = pr.apply(this, arguments); schedulePaint(false); return r; };
      window.refrescarRutaUI._ciuRutaV2 = true;
    }
  }
  function hookCityChecks() {
    document.querySelectorAll(".chk-ciudad").forEach(function (chk) {
      if (chk._ciuRutaHookV2) return;
      chk._ciuRutaHookV2 = true;
      chk.addEventListener("change", function () { lastMarkerKey = ""; schedulePaint(true); });
    });
    var todas = document.getElementById("chkTodasCiudades");
    if (todas && !todas._ciuRutaHookV2) {
      todas._ciuRutaHookV2 = true;
      todas.addEventListener("change", function () { lastMarkerKey = ""; schedulePaint(true); });
    }
  }
  window.rutalogCityKey = cityKey;
  window.rutalogCiudadPasaFiltro = ciudadPasaFiltro;
  function tick() { install(); hookCityChecks(); }
  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(function () { schedulePaint(true); }, 1600);
  setInterval(tick, 5000);
  console.info("[RUTALOG] mapa-ciudades-ruta v3.1 — skip live OSRM si flag");
})();
