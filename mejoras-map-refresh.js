/* RUTALOG map-refresh v3 — panel + mapa de rutas tras Excel / limpiar / borrar */
(function () {
  "use strict";
  if (window.__rutalogMapRefreshV3) return;
  window.__rutalogMapRefreshV3 = true;
  window.__rutalogMapRefreshV2 = true;

  function ensureMaps() {
    try {
      if (!window.estado) return false;
      if (!estado.markersPanel || typeof estado.markersPanel.clear !== "function") {
        estado.markersPanel = new Map();
      }
      if (!estado.markersRutas || typeof estado.markersRutas.clear !== "function") {
        estado.markersRutas = new Map();
      }
      if (!estado.polysGuardadas) estado.polysGuardadas = [];
      if (estado.mapPanel && !estado.clusterPanel && typeof L !== "undefined" && L.markerClusterGroup) {
        estado.clusterPanel = L.markerClusterGroup({
          maxClusterRadius: 45, showCoverageOnHover: false, spiderfyOnMaxZoom: true
        });
        estado.mapPanel.addLayer(estado.clusterPanel);
      }
      if (estado.mapRutas && !estado.clusterRutas && typeof L !== "undefined" && L.markerClusterGroup) {
        estado.clusterRutas = L.markerClusterGroup({
          maxClusterRadius: 45, showCoverageOnHover: false, spiderfyOnMaxZoom: true
        });
        estado.mapRutas.addLayer(estado.clusterRutas);
      }
      return !!(estado.mapPanel || estado.mapRutas);
    } catch (e) {
      console.warn("[map-refresh] ensureMaps", e);
      return false;
    }
  }

  function forceContainerSize() {
    try {
      ["mapPanel", "mapRutas"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.offsetHeight < 100) {
          el.style.minHeight = "420px";
          el.style.height = "420px";
        }
      });
    } catch (e) {}
  }

  function makeMarker(cli, st) {
    var la = cli.lat, lo = cli.lon;
    if (typeof jitter === "function") {
      var j = jitter(cli.lat, cli.lon, cli.idCliente);
      la = j[0]; lo = j[1];
    }
    var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
    var m = ico ? L.marker([la, lo], { icon: ico, zIndexOffset: 1000 }) : L.marker([la, lo]);
    if (typeof popupHtml === "function") m.bindPopup(popupHtml(cli));
    m.on("click", function () {
      try { if (typeof agregarParada === "function") agregarParada(cli); } catch (e) {}
    });
    return { m: m, la: la, lo: lo };
  }

  function paintPanelFromClientes() {
    if (!window.estado || !estado.mapPanel || !estado.clusterPanel) return 0;
    if (!estado.markersPanel) estado.markersPanel = new Map();
    try {
      estado.clusterPanel.clearLayers();
      estado.markersPanel.clear();
    } catch (e) {}
    var n = 0;
    var pts = [];
    (estado.clientesHoy || []).forEach(function (cli) {
      try {
        if (!cli || cli.lat == null || cli.lon == null) return;
        if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(cli.idCliente)) return;
        var st = typeof estiloCli === "function" ? estiloCli(cli) : { color: "#64748b", texto: "", sz: 22 };
        var r = makeMarker(cli, st);
        pts.push([r.la, r.lo]);
        estado.clusterPanel.addLayer(r.m);
        estado.markersPanel.set(cli.idCliente, r.m);
        n++;
      } catch (eOne) {}
    });
    try {
      estado.mapPanel.invalidateSize(true);
      if (pts.length) estado.mapPanel.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 12 });
    } catch (e2) {}
    try {
      var badge = document.getElementById("badgeMapaPanel");
      if (badge) badge.textContent = (estado.clientesHoy || []).length + " puntos";
      var sMapa = document.getElementById("sMapa");
      if (sMapa) sMapa.textContent = String((estado.clientesHoy || []).length);
    } catch (e3) {}
    return n;
  }

  function listaRutasFiltrada() {
    var lista = (estado.clientesHoy || []).slice();
    try {
      var chkMaestro = document.getElementById("chkMaestroCompleto");
      var showAll = chkMaestro ? chkMaestro.checked : false;
      if (showAll && estado.maestro) {
        var byId = new Map(lista.map(function (c) { return [c.idCliente, c]; }));
        lista = [];
        estado.maestro.forEach(function (r) {
          if (r.lat == null || r.lon == null) return;
          var id = r.id || r.idCliente;
          if (byId.has(id)) lista.push(byId.get(id));
          else {
            lista.push({
              idCliente: id, nombre: r.nombre, lat: r.lat, lon: r.lon,
              condicion: r.condicion || "", localidad: r.localidad || "", ciudad: r.ciudad || "",
              provincia: r.provincia || "", peso: 0, ovTexto: "", estadoDoc: "", ovs: []
            });
          }
        });
      }
      var qEl = document.getElementById("qRutas");
      var q = (qEl && qEl.value || "").toLowerCase();
      var estEl = document.getElementById("filEstado");
      var estF = estEl ? estEl.value : "";
      var ciudadesSel = (typeof getCiudadesSeleccionadas === "function") ? getCiudadesSeleccionadas() : ["__TODAS__"];
      lista = lista.filter(function (c) {
        if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(c.idCliente)) return false;
        if (estF && c.estadoDoc !== estF) return false;
        if (ciudadesSel.length && !ciudadesSel.includes("__TODAS__") && !ciudadesSel.includes(c.ciudad)) return false;
        if (q) {
          var t = ((c.nombre || "") + " " + (c.idCliente || "") + " " + (c.ovTexto || "") + " " + (c.ciudad || "") + " " + (c.localidad || "")).toLowerCase();
          if (t.indexOf(q) < 0) return false;
        }
        return true;
      });
    } catch (e) {}
    return lista;
  }

  function paintRutasFromClientes() {
    if (!window.estado || !estado.mapRutas || !estado.clusterRutas) return 0;
    if (!estado.markersRutas) estado.markersRutas = new Map();
    if (!estado.polysGuardadas) estado.polysGuardadas = [];

    try {
      estado.clusterRutas.clearLayers();
      estado.markersRutas.clear();
      if (estado.polyActual) {
        try { estado.mapRutas.removeLayer(estado.polyActual); } catch (e) {}
        estado.polyActual = null;
      }
      estado.polysGuardadas.forEach(function (p) {
        try { estado.mapRutas.removeLayer(p); } catch (e) {}
      });
      estado.polysGuardadas = [];
    } catch (e) {}

    var lista = listaRutasFiltrada();
    var n = 0;
    var pts = [];
    var posById = new Map();

    lista.forEach(function (cli) {
      try {
        if (!cli || cli.lat == null || cli.lon == null) return;
        var st = typeof estiloCli === "function" ? estiloCli(cli) : { color: "#64748b", texto: "", sz: 22 };
        var r = makeMarker(cli, st);
        pts.push([r.la, r.lo]);
        posById.set(cli.idCliente, [r.la, r.lo]);
        estado.clusterRutas.addLayer(r.m);
        estado.markersRutas.set(cli.idCliente, r.m);
        n++;
      } catch (eOne) {}
    });

    try {
      if (estado.viajeActual && estado.viajeActual.length >= 1) {
        var line = estado.viajeActual.map(function (p) {
          return posById.get(p.idCliente) || (typeof jitter === "function" ? jitter(p.lat, p.lon, p.idCliente) : [p.lat, p.lon]);
        });
        if (estado.origenActual && estado.origenActual.lat != null) {
          line.unshift([estado.origenActual.lat, estado.origenActual.lon]);
        }
        if (line.length > 1) {
          estado.polyActual = L.polyline(line, { color: "#f59e0b", weight: 3, dashArray: "6,6" }).addTo(estado.mapRutas);
        }
      }
      (estado.viajesGuardados || []).forEach(function (v) {
        if (!v.paradas || v.paradas.length < 1) return;
        var line2 = v.paradas.map(function (p) {
          return posById.get(p.idCliente) || (typeof jitter === "function" ? jitter(p.lat, p.lon, p.idCliente) : [p.lat, p.lon]);
        });
        if (v.origen && v.origen.lat != null) line2.unshift([v.origen.lat, v.origen.lon]);
        if (line2.length > 1) {
          var pl = L.polyline(line2, { color: v.color || "#38bdf8", weight: 3 }).addTo(estado.mapRutas);
          estado.polysGuardadas.push(pl);
        }
      });
    } catch (ePoly) {}

    try {
      estado.mapRutas.invalidateSize(true);
      if (pts.length && !(estado.viajeActual && estado.viajeActual.length)) {
        estado.mapRutas.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 12 });
      }
    } catch (e2) {}

    try {
      var badge = document.getElementById("badgeActivos");
      if (badge) badge.textContent = n + " puntos activos";
    } catch (e3) {}

    return n;
  }

  function forceMapRefresh(reason) {
    forceContainerSize();
    ensureMaps();
    var nPanel = 0, nRutas = 0;
    try {
      if (typeof renderMapas === "function") {
        try { renderMapas(); } catch (eR) { console.warn("[map-refresh] renderMapas", eR); }
      }
      nPanel = paintPanelFromClientes();
      nRutas = paintRutasFromClientes();
    } catch (e) {
      console.warn("[map-refresh]", e);
    }
    console.info("[RUTALOG] map-refresh v3:", reason || "", "panel=", nPanel, "rutas=", nRutas, "clientesHoy=", (window.estado && estado.clientesHoy && estado.clientesHoy.length) || 0);
    return nPanel + nRutas;
  }

  window.rutalogForceMapRefresh = forceMapRefresh;

  function scheduleRefresh(reason) {
    [0, 100, 300, 600, 1000, 1800, 2800].forEach(function (ms) {
      setTimeout(function () { forceMapRefresh(reason + "@" + ms); }, ms);
    });
  }

  function wrapConstruirHoy() {
    if (typeof window.construirHoy !== "function") return;
    if (window.construirHoy._mapRefreshV3) return;
    var orig = window.construirHoy;
    window.construirHoy = function (filas) {
      var r = orig.apply(this, arguments);
      scheduleRefresh("construirHoy");
      return r;
    };
    window.construirHoy._mapRefreshV3 = true;
  }

  function wrapRenderMapas() {
    if (typeof window.renderMapas !== "function") return;
    if (window.renderMapas._mapRefreshV3) return;
    var orig = window.renderMapas;
    window.renderMapas = function () {
      var r;
      try {
        ensureMaps();
        r = orig.apply(this, arguments);
      } catch (e) {
        console.warn("[map-refresh] renderMapas falló", e);
        paintPanelFromClientes();
        paintRutasFromClientes();
      }
      setTimeout(function () {
        try {
          if (estado.mapPanel) estado.mapPanel.invalidateSize(true);
          if (estado.mapRutas) estado.mapRutas.invalidateSize(true);
        } catch (e2) {}
      }, 60);
      return r;
    };
    window.renderMapas._mapRefreshV3 = true;
  }

  function wrapLimpiar() {
    var btn = document.getElementById("btnLimpiarDia");
    if (!btn || btn._mapRefreshV3) return;
    btn._mapRefreshV3 = true;
    var prev = btn.onclick;
    btn.onclick = async function (ev) {
      var result;
      if (typeof prev === "function") result = await prev.call(this, ev);
      scheduleRefresh("limpiar-dia");
      return result;
    };
  }

  function wrapBorrarViajes() {
    var btn = document.getElementById("btnBorrarViajesTop");
    if (!btn || btn._mapRefreshV3) return;
    btn._mapRefreshV3 = true;
    var prev = btn.onclick;
    btn.onclick = async function (ev) {
      var result;
      if (typeof prev === "function") result = await prev.call(this, ev);
      scheduleRefresh("borrar-viajes");
      return result;
    };
  }

  function wireFile() {
    var file = document.getElementById("fileDiario");
    if (file && !file._mapRefreshV3) {
      file._mapRefreshV3 = true;
      file.addEventListener("change", function () { scheduleRefresh("file-excel"); });
    }
    var drop = document.getElementById("dropDiario");
    if (drop && !drop._mapRefreshV3) {
      drop._mapRefreshV3 = true;
      drop.addEventListener("drop", function () { scheduleRefresh("drop-excel"); });
    }
  }

  function wrapGo() {
    if (typeof window.go !== "function") return;
    if (window.go._mapRefreshV3) return;
    var orig = window.go;
    window.go = function (page) {
      var r = orig.apply(this, arguments);
      if (page === "panel" || page === "rutas") {
        setTimeout(function () { forceMapRefresh("go-" + page); }, 120);
        setTimeout(function () { forceMapRefresh("go-" + page + "-2"); }, 500);
      }
      return r;
    };
    window.go._mapRefreshV3 = true;
  }

  function wireRutasFilters() {
    ["qRutas", "filEstado", "chkMaestroCompleto"].forEach(function (id) {
      var n = document.getElementById(id);
      if (!n || n._mapRefreshV3) return;
      n._mapRefreshV3 = true;
      n.addEventListener("change", function () { scheduleRefresh("filtro-" + id); });
      n.addEventListener("input", function () {
        clearTimeout(n._mrT);
        n._mrT = setTimeout(function () { forceMapRefresh("filtro-" + id); }, 200);
      });
    });
  }

  function tick() {
    wrapConstruirHoy();
    wrapRenderMapas();
    wrapLimpiar();
    wrapBorrarViajes();
    wireFile();
    wrapGo();
    wireRutasFilters();
  }

  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(tick, 2500);
  setTimeout(tick, 5000);
  setInterval(tick, 3000);

  console.info("[RUTALOG] map-refresh v3 — panel + rutas");
})();
