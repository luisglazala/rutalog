/* RUTALOG mapa-incremental v1 — H4: reemplaza clearLayers por diff de pines */
(function () {
  "use strict";
  if (window.__rutalogMapaIncrementalV1) return;
  window.__rutalogMapaIncrementalV1 = true;

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

  function mkMarker(cli, st, clickable) {
    if (!cli || cli.lat == null || cli.lon == null) return null;
    var la = cli.lat, lo = cli.lon;
    if (typeof jitter === "function") {
      try { var j = jitter(cli.lat, cli.lon, cli.idCliente); la = j[0]; lo = j[1]; } catch (e) {}
    }
    var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
    var m = ico
      ? L.marker([la, lo], { icon: ico, zIndexOffset: st.z || 1000 })
      : L.marker([la, lo], { zIndexOffset: st.z || 1000 });
    if (typeof popupHtml === "function") {
      try { m.bindPopup(popupHtml(cli)); } catch (e) {}
    }
    if (clickable) {
      m.on("click", function () {
        try { if (typeof agregarParada === "function") agregarParada(cli); } catch (e) {}
      });
    }
    return m;
  }

  function fillIncremental(cluster, markersMap, allowClick) {
    if (!cluster) return markersMap || new Map();
    if (!markersMap) markersMap = new Map();

    var desired = new Map();
    function want(cli, st, click) {
      if (!cli || cli.lat == null) return;
      var id = String(cli.idCliente);
      if (desired.has(id)) return;
      var key = id + "|" + (st.color || "") + "|" + (st.texto || "") + "|" + (st.sz || "") + "|" + (click ? "1" : "0");
      desired.set(id, { cli: cli, st: st, click: click, key: key });
    }

    (estado.clientesHoy || []).forEach(function (cli) {
      if (inViajeActual(cli.idCliente)) return;
      if (isCompleto(cli.idCliente)) return;
      want(cli, { color: "#64748b", texto: "", sz: 22, z: 400 }, allowClick);
    });
    (estado.viajeActual || []).forEach(function (p, i) {
      var cli = Object.assign({}, p);
      var pos = resolvePos(p);
      if (pos) { cli.lat = pos[0]; cli.lon = pos[1]; }
      want(cli, { color: "#f59e0b", texto: String(i + 1), sz: 32, z: 3500 }, false);
    });

    var toRemove = [];
    markersMap.forEach(function (entry, id) {
      if (!desired.has(String(id))) toRemove.push(id);
    });
    toRemove.forEach(function (id) {
      var entry = markersMap.get(id);
      var m = entry && entry.marker ? entry.marker : entry;
      try { if (m) cluster.removeLayer(m); } catch (e) {}
      markersMap.delete(id);
    });

    desired.forEach(function (d, id) {
      var prev = markersMap.get(id);
      var prevKey = prev && prev.key ? prev.key : null;
      if (prev && prevKey === d.key) return;
      if (prev) {
        var oldM = prev.marker ? prev.marker : prev;
        try { cluster.removeLayer(oldM); } catch (e) {}
        markersMap.delete(id);
      }
      var m = mkMarker(d.cli, d.st, d.click);
      if (m) {
        try { cluster.addLayer(m); } catch (e) {}
        markersMap.set(id, { marker: m, key: d.key });
      }
    });
    return markersMap;
  }

  function patch() {
    if (!window.estado) return false;
    function guardCluster(c) {
      if (!c || c._incGuarded) return;
      c._incGuarded = true;
      var orig = c.clearLayers && c.clearLayers.bind(c);
      if (!orig) return;
      c.clearLayers = function () {
        return this;
      };
      c._clearLayersOrig = orig;
    }
    try {
      if (estado.clusterPanel) guardCluster(estado.clusterPanel);
      if (estado.clusterRutas) guardCluster(estado.clusterRutas);
    } catch (e) {}

    function renderInc() {
      if (!window.estado) return;
      try {
        if (!estado.markersPanel) estado.markersPanel = new Map();
        if (!estado.markersRutas) estado.markersRutas = new Map();
        if (estado.mapPanel && estado.clusterPanel) {
          guardCluster(estado.clusterPanel);
          estado.markersPanel = fillIncremental(estado.clusterPanel, estado.markersPanel, false);
        }
        if (estado.mapRutas && estado.clusterRutas) {
          guardCluster(estado.clusterRutas);
          estado.markersRutas = fillIncremental(estado.clusterRutas, estado.markersRutas, true);
        }
      } catch (e) {
        console.warn("[mapa-incremental]", e);
      }
    }

    window.rutalogMapaFix = renderInc;
    if (typeof window.renderMapas === "function") {
      window.renderMapas = function () { renderInc(); };
      window.renderMapas._mapaIncremental = true;
    }
    if (window.RUTALOG && RUTALOG.hooks && typeof RUTALOG.hooks.setCoreRenderMapas === "function") {
      try { RUTALOG.hooks.setCoreRenderMapas(renderInc); } catch (e) {}
    }
    return true;
  }

  var n = 0;
  function tick() {
    n++;
    patch();
    if (n > 60) return;
    setTimeout(tick, n < 10 ? 300 : 1500);
  }
  tick();
  console.info("[RUTALOG] mapa-incremental v1 — sin clearLayers");
})();
