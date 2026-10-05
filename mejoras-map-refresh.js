/* RUTALOG map-refresh v2 — repintado fiable tras Excel / limpiar / borrar viajes */
(function () {
  "use strict";
  if (window.__rutalogMapRefreshV2) return;
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
      if (estado.mapPanel && !estado.clusterPanel && typeof L !== "undefined" && L.markerClusterGroup) {
        estado.clusterPanel = L.markerClusterGroup({
          maxClusterRadius: 45,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true
        });
        estado.mapPanel.addLayer(estado.clusterPanel);
      }
      if (estado.mapRutas && !estado.clusterRutas && typeof L !== "undefined" && L.markerClusterGroup) {
        estado.clusterRutas = L.markerClusterGroup({
          maxClusterRadius: 45,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true
        });
        estado.mapRutas.addLayer(estado.clusterRutas);
      }
      return !!(estado.mapPanel && estado.clusterPanel);
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
        var la = cli.lat, lo = cli.lon;
        if (typeof jitter === "function") {
          var j = jitter(cli.lat, cli.lon, cli.idCliente);
          la = j[0]; lo = j[1];
        }
        pts.push([la, lo]);
        var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
        var m = ico ? L.marker([la, lo], { icon: ico, zIndexOffset: 1000 }) : L.marker([la, lo]);
        if (typeof popupHtml === "function") m.bindPopup(popupHtml(cli));
        m.on("click", function () {
          try { if (typeof agregarParada === "function") agregarParada(cli); } catch (e) {}
        });
        estado.clusterPanel.addLayer(m);
        estado.markersPanel.set(cli.idCliente, m);
        n++;
      } catch (eOne) {
        console.warn("[map-refresh] marker", eOne);
      }
    });
    try {
      estado.mapPanel.invalidateSize(true);
      if (pts.length) {
        estado.mapPanel.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: 12 });
      }
    } catch (e2) {}
    try {
      var badge = document.getElementById("badgeMapaPanel");
      if (badge) badge.textContent = (estado.clientesHoy || []).length + " puntos";
      var sMapa = document.getElementById("sMapa");
      if (sMapa) sMapa.textContent = String((estado.clientesHoy || []).length);
    } catch (e3) {}
    return n;
  }

  function forceMapRefresh(reason) {
    forceContainerSize();
    ensureMaps();
    var painted = 0;
    try {
      if (typeof renderMapas === "function") {
        try { renderMapas(); } catch (eR) { console.warn("[map-refresh] renderMapas error", eR); }
      }
      painted = paintPanelFromClientes();
    } catch (e) {
      console.warn("[map-refresh]", e);
    }
    console.info("[RUTALOG] map-refresh v2:", reason || "", "marcadores=", painted, "clientesHoy=", (window.estado && estado.clientesHoy && estado.clientesHoy.length) || 0);
    return painted;
  }

  window.rutalogForceMapRefresh = forceMapRefresh;

  function scheduleRefresh(reason) {
    [0, 100, 300, 600, 1000, 1800, 2800].forEach(function (ms) {
      setTimeout(function () { forceMapRefresh(reason + "@" + ms); }, ms);
    });
  }

  function wrapConstruirHoy() {
    if (typeof window.construirHoy !== "function") return;
    if (window.construirHoy._mapRefreshV2) return;
    var orig = window.construirHoy;
    window.construirHoy = function (filas) {
      var r = orig.apply(this, arguments);
      scheduleRefresh("construirHoy");
      return r;
    };
    window.construirHoy._mapRefreshV2 = true;
  }

  function wrapRenderMapas() {
    if (typeof window.renderMapas !== "function") return;
    if (window.renderMapas._mapRefreshV2) return;
    var orig = window.renderMapas;
    window.renderMapas = function () {
      var r;
      try {
        ensureMaps();
        r = orig.apply(this, arguments);
      } catch (e) {
        console.warn("[map-refresh] renderMapas falló, pintando a mano", e);
        paintPanelFromClientes();
      }
      setTimeout(function () {
        try {
          if (estado.mapPanel) estado.mapPanel.invalidateSize(true);
        } catch (e2) {}
      }, 60);
      return r;
    };
    window.renderMapas._mapRefreshV2 = true;
  }

  function wrapLimpiar() {
    var btn = document.getElementById("btnLimpiarDia");
    if (!btn || btn._mapRefreshV2) return;
    btn._mapRefreshV2 = true;
    var prev = btn.onclick;
    btn.onclick = async function (ev) {
      var result;
      if (typeof prev === "function") {
        result = await prev.call(this, ev);
      }
      scheduleRefresh("limpiar-dia");
      return result;
    };
  }

  function wrapBorrarViajes() {
    var btn = document.getElementById("btnBorrarViajesTop");
    if (!btn || btn._mapRefreshV2) return;
    btn._mapRefreshV2 = true;
    var prev = btn.onclick;
    btn.onclick = async function (ev) {
      var result;
      if (typeof prev === "function") {
        result = await prev.call(this, ev);
      }
      scheduleRefresh("borrar-viajes");
      return result;
    };
  }

  function wireFile() {
    var file = document.getElementById("fileDiario");
    if (file && !file._mapRefreshV2) {
      file._mapRefreshV2 = true;
      file.addEventListener("change", function () {
        scheduleRefresh("file-excel");
      });
    }
    var drop = document.getElementById("dropDiario");
    if (drop && !drop._mapRefreshV2) {
      drop._mapRefreshV2 = true;
      drop.addEventListener("drop", function () {
        scheduleRefresh("drop-excel");
      });
    }
  }

  function tick() {
    wrapConstruirHoy();
    wrapRenderMapas();
    wrapLimpiar();
    wrapBorrarViajes();
    wireFile();
  }

  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(tick, 2500);
  setTimeout(tick, 5000);
  setInterval(tick, 3000);

  console.info("[RUTALOG] map-refresh v2 activo");
})();
