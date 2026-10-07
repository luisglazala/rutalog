/* RUTALOG mapa-incremental v1
 * Pines: solo crear / quitar / actualizar los que cambian de estado.
 */
(function () {
  "use strict";
  if (window.__rutalogMapaIncrementalV1) return;
  window.__rutalogMapaIncrementalV1 = true;

  var pinPanel = new Map();
  var pinRutas = new Map();
  var lastFiltroKey = "";

  function cityKey(s) {
    if (typeof window.rutalogCityKey === "function") return window.rutalogCityKey(s);
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function filtroActivo() {
    try {
      if (typeof getCiudadesSeleccionadas !== "function") return null;
      var sel = getCiudadesSeleccionadas();
      if (!sel || !sel.length || sel.indexOf("__TODAS__") >= 0) return null;
      return sel.map(cityKey).filter(Boolean);
    } catch (e) { return null; }
  }

  function ciudadPasa(ciudad) {
    if (typeof window.rutalogCiudadPasaFiltro === "function") {
      try { return window.rutalogCiudadPasaFiltro(ciudad); } catch (e) {}
    }
    var f = filtroActivo();
    if (!f) return true;
    var k = cityKey(ciudad);
    return !!k && f.indexOf(k) >= 0;
  }

  function inActual(id) {
    try {
      return (estado.viajeActual || []).some(function (p) {
        return String(p.idCliente) === String(id);
      });
    } catch (e) { return false; }
  }

  function orderInActual(id) {
    try {
      var i = (estado.viajeActual || []).findIndex(function (p) {
        return String(p.idCliente) === String(id);
      });
      return i >= 0 ? i + 1 : 0;
    } catch (e) { return 0; }
  }

  function debeOcultar(id) {
    try {
      if (typeof clienteCompletamenteAsignado === "function") {
        if (clienteCompletamenteAsignado(id) || clienteCompletamenteAsignado(String(id))) return true;
      }
    } catch (e) {}
    try {
      var inG = (estado.viajesGuardados || []).some(function (v) {
        return (v.paradas || []).some(function (p) {
          return String(p.idCliente) === String(id);
        });
      });
      if (!inG) return false;
      var pend = (estado.lineasPendientes && (estado.lineasPendientes.get(id) || estado.lineasPendientes.get(String(id)))) || [];
      if (!pend.length) return true;
      return !pend.some(function (l) {
        return !l.despachado && (l.aDespachar == null || Math.abs(Number(l.aDespachar)) > 1e-9);
      });
    } catch (e) { return false; }
  }

  function latLon(cli) {
    if (!cli || cli.lat == null || cli.lon == null) return null;
    if (typeof jitter === "function") {
      try {
        var j = jitter(cli.lat, cli.lon, cli.idCliente);
        return [j[0], j[1]];
      } catch (e) {}
    }
    return [cli.lat, cli.lon];
  }

  function makeMarker(cli, st, clickable) {
    var pos = latLon(cli);
    if (!pos) return null;
    var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
    var m = ico ? L.marker(pos, { icon: ico, zIndexOffset: st.z || 1000 }) : L.marker(pos, { zIndexOffset: st.z || 1000 });
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

  function desiredState(cli) {
    var id = String(cli.idCliente);
    if (inActual(id)) {
      return { kind: "actual", order: orderInActual(id), color: "#f59e0b", texto: String(orderInActual(id)), sz: 32, z: 3500, clickable: false };
    }
    if (debeOcultar(id)) return null;
    if (!ciudadPasa(cli.ciudad)) return null;
    if (cli.lat == null || cli.lon == null) return null;
    return { kind: "avail", order: 0, color: "#64748b", texto: "", sz: 22, z: 400, clickable: true };
  }

  function syncCluster(cluster, pinMap, includeActual) {
    if (!cluster || !window.estado) return;
    var desired = new Map();
    (estado.clientesHoy || []).forEach(function (cli) {
      if (!cli) return;
      var st = desiredState(cli);
      if (!st) return;
      if (st.kind === "actual" && !includeActual) return;
      desired.set(String(cli.idCliente), { cli: cli, st: st });
    });
    if (includeActual) {
      (estado.viajeActual || []).forEach(function (p) {
        var id = String(p.idCliente);
        if (desired.has(id)) return;
        var cli = Object.assign({}, p);
        var base = (estado.clientesHoy || []).find(function (c) { return String(c.idCliente) === id; });
        if (base) {
          if (cli.lat == null) cli.lat = base.lat;
          if (cli.lon == null) cli.lon = base.lon;
          cli.nombre = cli.nombre || base.nombre;
        }
        var st = desiredState(cli);
        if (st) desired.set(id, { cli: cli, st: st });
      });
    }
    Array.from(pinMap.keys()).forEach(function (id) {
      if (desired.has(id)) return;
      var entry = pinMap.get(id);
      try { if (entry && entry.marker) cluster.removeLayer(entry.marker); } catch (e) {}
      pinMap.delete(id);
    });
    desired.forEach(function (d, id) {
      var prev = pinMap.get(id);
      var needNew = !prev || !prev.marker || prev.kind !== d.st.kind || prev.order !== d.st.order || prev.color !== d.st.color;
      if (!needNew) return;
      if (prev && prev.marker) {
        try { cluster.removeLayer(prev.marker); } catch (e) {}
      }
      var m = makeMarker(d.cli, d.st, d.st.clickable && includeActual);
      if (!m) return;
      try { cluster.addLayer(m); } catch (e) {}
      pinMap.set(id, { marker: m, kind: d.st.kind, order: d.st.order, color: d.st.color });
    });
  }

  function syncAll() {
    if (!window.estado) return;
    try {
      if (estado.clusterPanel) syncCluster(estado.clusterPanel, pinPanel, false);
      if (estado.clusterRutas) syncCluster(estado.clusterRutas, pinRutas, true);
    } catch (e) {
      console.warn("[mapa-incremental]", e);
    }
    try {
      var n = 0, peso = 0;
      (estado.clientesHoy || []).forEach(function (c) {
        if (!c || inActual(c.idCliente) || debeOcultar(c.idCliente) || !ciudadPasa(c.ciudad) || c.lat == null) return;
        n++;
        peso += Number(c.peso) || 0;
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

  var t = null;
  function schedule(force) {
    if (t) clearTimeout(t);
    t = setTimeout(function () { t = null; syncAll(); }, force ? 40 : 90);
  }

  function install() {
    if (typeof window.renderMapas === "function" && !window.renderMapas._incrPins) {
      var prev = window.renderMapas;
      window.renderMapas = function () {
        try { prev.apply(this, arguments); } catch (e) {}
        schedule(false);
      };
      window.renderMapas._incrPins = true;
    }
    if (typeof window.refrescarRutaUI === "function" && !window.refrescarRutaUI._incrPins) {
      var pr = window.refrescarRutaUI;
      window.refrescarRutaUI = function () {
        var r = pr.apply(this, arguments);
        schedule(false);
        return r;
      };
      window.refrescarRutaUI._incrPins = true;
    }
    if (typeof window.agregarParada === "function" && !window.agregarParada._incrPins) {
      var ap = window.agregarParada;
      window.agregarParada = function () {
        var r = ap.apply(this, arguments);
        schedule(false);
        return r;
      };
      window.agregarParada._incrPins = true;
    }
  }

  window.rutalogSyncPinsIncremental = function () { schedule(true); };

  function tick() { install(); }
  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(function () { schedule(true); }, 1800);
  setInterval(tick, 6000);
  console.info("[RUTALOG] mapa-incremental v1 — pines create/update/remove");
})();
