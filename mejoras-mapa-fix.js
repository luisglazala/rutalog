/* RUTALOG mapa-fix v5 — REEMPLAZA renderMapas */
(function () {
  "use strict";
  if (window.__rutalogMapaFixV5) return;
  window.__rutalogMapaFixV5 = true;
  window.__rutalogMapaFixV4 = true;
  window.__rutalogMapaFixV3 = true;
  window.__rutalogMapRefreshV3 = true;
  window.__rutalogMapDespachadosV1 = true;

  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var osrmLayer = null;
  var osrmSeq = 0;

  function isCompleto(id) {
    try {
      if (typeof clienteCompletamenteAsignado === "function") return !!clienteCompletamenteAsignado(id);
    } catch (e) {}
    return false;
  }

  function inViajeActual(id) {
    try {
      return (estado.viajeActual || []).some(function (p) {
        return String(p.idCliente) === String(id);
      });
    } catch (e) { return false; }
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
    if (typeof jitter === "function") {
      try { var j = jitter(la, lo, p.idCliente); return [j[0], j[1]]; } catch (e) {}
    }
    return [la, lo];
  }

  function updateBadges() {
    try {
      var n = 0, peso = 0;
      (estado.clientesHoy || []).forEach(function (c) {
        if (!c || c.lat == null) return;
        if (inViajeActual(c.idCliente)) return;
        if (isCompleto(c.idCliente)) return;
        n++;
        peso += Number(c.peso) || 0;
      });
      var el;
      el = document.getElementById("badgeActivos"); if (el) el.textContent = n + " puntos activos";
      el = document.getElementById("badgeMapaPanel"); if (el) el.textContent = n + " puntos";
      el = document.getElementById("sMapa"); if (el) el.textContent = String(n);
      el = document.getElementById("sPeso"); if (el) el.textContent = peso.toFixed(2) + " kg";
    } catch (e) {}
  }

  function rebuildCiudades(force) {
    try {
      if (typeof window.rutalogRebuildCiudades === "function") {
        window.rutalogRebuildCiudades();
        return;
      }
    } catch (e) {}
  }

  function clearOsrm() {
    try { if (osrmLayer && estado.mapRutas) estado.mapRutas.removeLayer(osrmLayer); } catch (e) {}
    osrmLayer = null;
  }

  function clearPolys() {
    clearOsrm();
    try { if (estado.polyActual && estado.mapRutas) estado.mapRutas.removeLayer(estado.polyActual); } catch (e) {}
    estado.polyActual = null;
    if (!estado.polysGuardadas) estado.polysGuardadas = [];
    estado.polysGuardadas.forEach(function (pl) { try { estado.mapRutas.removeLayer(pl); } catch (e) {} });
    estado.polysGuardadas = [];
  }

  function drawCurrentRoute() {
    if (!estado.mapRutas) return;
    var pts = [];
    if (estado.origenActual && estado.origenActual.lat != null) pts.push([estado.origenActual.lat, estado.origenActual.lon]);
    (estado.viajeActual || []).forEach(function (p) {
      var pos = resolvePos(p); if (pos) pts.push(pos);
    });
    if (pts.length < 2) return;
    try {
      estado.polyActual = L.polyline(pts, { color: "#f59e0b", weight: 5, dashArray: "8,6", opacity: 0.95 }).addTo(estado.mapRutas);
    } catch (e) {}
    var seq = ++osrmSeq;
    var coordStr = pts.map(function (p) { return p[1] + "," + p[0]; }).join(";");
    fetch(OSRM + coordStr + "?overview=full&geometries=geojson")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (seq !== osrmSeq) return;
        clearOsrm();
        try { if (estado.polyActual) { estado.mapRutas.removeLayer(estado.polyActual); estado.polyActual = null; } } catch (e) {}
        if (!data || data.code !== "Ok" || !data.routes || !data.routes[0]) {
          try { estado.polyActual = L.polyline(pts, { color: "#f59e0b", weight: 5, dashArray: "8,6", opacity: 0.95 }).addTo(estado.mapRutas); } catch (e2) {}
          return;
        }
        var coords = data.routes[0].geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
        osrmLayer = L.polyline(coords, { color: "#f59e0b", weight: 6, opacity: 1 }).addTo(estado.mapRutas);
      }).catch(function () {});
  }

  function drawSavedFaint() {
    if (!estado.mapRutas) return;
    (estado.viajesGuardados || []).forEach(function (v) {
      if (!v.paradas || !v.paradas.length) return;
      var line = [];
      if (v.origen && v.origen.lat != null) line.push([v.origen.lat, v.origen.lon]);
      else if (estado.origenActual && estado.origenActual.lat != null) line.push([estado.origenActual.lat, estado.origenActual.lon]);
      v.paradas.forEach(function (p) { var pos = resolvePos(p); if (pos) line.push(pos); });
      if (line.length > 1) {
        try {
          var pl = L.polyline(line, { color: v.color || "#64748b", weight: 2, opacity: 0.35 }).addTo(estado.mapRutas);
          estado.polysGuardadas.push(pl);
        } catch (e) {}
      }
    });
  }

  function mkMarker(cli, st, clickable) {
    if (!cli || cli.lat == null || cli.lon == null) return null;
    var la = cli.lat, lo = cli.lon;
    if (typeof jitter === "function") {
      try { var j = jitter(cli.lat, cli.lon, cli.idCliente); la = j[0]; lo = j[1]; } catch (e) {}
    }
    var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
    var m = ico ? L.marker([la, lo], { icon: ico, zIndexOffset: st.z || 1000 }) : L.marker([la, lo], { zIndexOffset: st.z || 1000 });
    if (typeof popupHtml === "function") { try { m.bindPopup(popupHtml(cli)); } catch (e) {} }
    if (clickable) {
      m.on("click", function () {
        try { if (typeof agregarParada === "function") agregarParada(cli); } catch (e) {}
      });
    }
    return m;
  }

  function fillCluster(cluster, markersMap, allowClick) {
    if (!cluster) return markersMap || new Map();
    if (!markersMap) markersMap = new Map();
    try { cluster.clearLayers(); markersMap.clear(); } catch (e) {}
    var painted = new Set();
    function add(cli, st, click) {
      if (!cli || cli.lat == null) return;
      var id = String(cli.idCliente);
      if (painted.has(id)) return;
      painted.add(id);
      var m = mkMarker(cli, st, click);
      if (m) { cluster.addLayer(m); markersMap.set(cli.idCliente, m); }
    }
    (estado.clientesHoy || []).forEach(function (cli) {
      if (inViajeActual(cli.idCliente)) return;
      if (isCompleto(cli.idCliente)) return;
      add(cli, { color: "#64748b", texto: "", sz: 22, z: 400 }, allowClick);
    });
    (estado.viajeActual || []).forEach(function (p, i) {
      var cli = Object.assign({}, p);
      var pos = resolvePos(p);
      if (pos) { cli.lat = pos[0]; cli.lon = pos[1]; }
      add(cli, { color: "#f59e0b", texto: String(i + 1), sz: 32, z: 3500 }, false);
    });
    return markersMap;
  }

  function renderMapasFixed() {
    if (!window.estado) return;
    try {
      if (!estado.markersPanel) estado.markersPanel = new Map();
      if (!estado.markersRutas) estado.markersRutas = new Map();
      if (!estado.polysGuardadas) estado.polysGuardadas = [];
      if (estado.mapPanel && estado.clusterPanel) {
        estado.markersPanel = fillCluster(estado.clusterPanel, estado.markersPanel, false);
        try { estado.mapPanel.invalidateSize(true); } catch (e) {}
      }
      if (estado.mapRutas && estado.clusterRutas) {
        clearPolys();
        estado.markersRutas = fillCluster(estado.clusterRutas, estado.markersRutas, true);
        drawSavedFaint();
        drawCurrentRoute();
        try { estado.mapRutas.invalidateSize(true); } catch (e) {}
      }
      updateBadges();
    } catch (e) { console.warn("[mapa-fix v5]", e); }
  }

  window.rutalogMapaFix = renderMapasFixed;

    function install() {
    if (typeof renderMapasFixed !== "function") return false;
    if (window.__mapaFixHooksV6) return true;
    if (window.RUTALOG && RUTALOG.hooks) {
      window.__mapaFixHooksV6 = true;
      if (typeof RUTALOG.hooks.setCoreRenderMapas === "function") {
        RUTALOG.hooks.setCoreRenderMapas(renderMapasFixed);
      }
      RUTALOG.hooks.on("despues:refrescarRutaUI", function () {
        if (window.__rutalogNavSilent) return;
        setTimeout(function () {
          try { renderMapasFixed(); } catch (e) {}
        }, 40);
      });
      return true;
    }
    if (typeof window.renderMapas !== "function") return false;
    window.renderMapas = function () { renderMapasFixed(); };
    window.renderMapas._mapaFixV5 = true;
    if (typeof window.refrescarRutaUI === "function" && !window.refrescarRutaUI._mf5) {
      var origR = window.refrescarRutaUI;
      window.refrescarRutaUI = function () {
        var r = origR.apply(this, arguments);
        setTimeout(renderMapasFixed, 30);
        setTimeout(renderMapasFixed, 200);
        return r;
      };
      window.refrescarRutaUI._mf5 = true;
    }
    return true;
  }

  function renameInicio() {
    try {
      document.querySelectorAll('.nav button[data-page="panel"] .nav-label').forEach(function (n) { n.textContent = "Inicio"; });
      var t = document.getElementById("pageTitle");
      var page = document.getElementById("page-panel");
      if (t && page && page.classList.contains("active")) t.textContent = "Inicio";
    } catch (e) {}
  }

  function tick() { install(); renameInicio(); }
  tick();
  setTimeout(tick, 200);
  setTimeout(tick, 800);
  setTimeout(tick, 2000);
  setTimeout(function () { rebuildCiudades(true); renderMapasFixed(); }, 1500);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('mapa:fix', tick, { cada: 3000, vista: 'rutas' }); else setInterval(tick, 3000);

  console.info("[RUTALOG] mapa-fix v5 — renderMapas REEMPLAZADO");
})();
