/* RUTALOG mapa-viaje v1
 * - Traza ruta (OSRM o línea) al agregar/generar paradas
 * - Clientes en viaje: icono distinto (número + color)
 * - Puntos activos / peso del panel se reducen al seleccionar
 * - Mantiene lista de ciudades
 */
(function () {
  "use strict";
  if (window.__rutalogMapaViajeV1) return;
  window.__rutalogMapaViajeV1 = true;

  var OSRM_BASE = "https://router.project-osrm.org/route/v1/driving/";
  var osrmLayer = null;
  var osrmSeq = 0;

  function idsEnViaje() {
    var s = new Set();
    try {
      (estado.viajeActual || []).forEach(function (p) { s.add(p.idCliente); });
      (estado.viajesGuardados || []).forEach(function (v) {
        (v.paradas || []).forEach(function (p) { s.add(p.idCliente); });
      });
    } catch (e) {}
    return s;
  }

  function clientesActivos() {
    var en = idsEnViaje();
    return (estado.clientesHoy || []).filter(function (c) {
      if (!c || c.lat == null) return false;
      if (en.has(c.idCliente)) return false;
      try {
        if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(c.idCliente)) return false;
      } catch (e) {}
      return true;
    });
  }

  function updateBadges() {
    try {
      var activos = clientesActivos();
      var n = activos.length;
      var pesoRest = activos.reduce(function (s, c) { return s + (Number(c.peso) || 0); }, 0);
      var badgeA = document.getElementById("badgeActivos");
      if (badgeA) badgeA.textContent = n + " puntos activos";
      var badgeP = document.getElementById("badgeMapaPanel");
      if (badgeP) badgeP.textContent = n + " puntos";
      var sMapa = document.getElementById("sMapa");
      if (sMapa) sMapa.textContent = String(n);
      var sPeso = document.getElementById("sPeso");
      if (sPeso) sPeso.textContent = pesoRest.toFixed(2) + " kg";
    } catch (e) {}
  }

  function clearOsrm() {
    try {
      if (osrmLayer && estado.mapRutas) estado.mapRutas.removeLayer(osrmLayer);
    } catch (e) {}
    osrmLayer = null;
  }

  function ptsViajeActual() {
    var pts = [];
    try {
      if (estado.origenActual && estado.origenActual.lat != null) {
        pts.push([estado.origenActual.lat, estado.origenActual.lon]);
      }
      (estado.viajeActual || []).forEach(function (p) {
        var la = p.lat, lo = p.lon;
        if (la == null || lo == null) {
          var c = (estado.clientesHoy || []).find(function (x) { return x.idCliente === p.idCliente; });
          if (c) { la = c.lat; lo = c.lon; }
        }
        if (la != null && lo != null) pts.push([la, lo]);
      });
    } catch (e) {}
    return pts;
  }

  function dibujarRuta() {
    if (!estado || !estado.mapRutas) return;
    var map = estado.mapRutas;
    var pts = ptsViajeActual();
    clearOsrm();
    try {
      if (estado.polyActual) {
        map.removeLayer(estado.polyActual);
        estado.polyActual = null;
      }
    } catch (e) {}

    if (pts.length < 2) return;

    try {
      estado.polyActual = L.polyline(pts, {
        color: "#f59e0b", weight: 4, dashArray: "6,6", opacity: 0.85
      }).addTo(map);
    } catch (e) {}

    var seq = ++osrmSeq;
    var coordStr = pts.map(function (p) { return p[1] + "," + p[0]; }).join(";");
    fetch(OSRM_BASE + coordStr + "?overview=full&geometries=geojson")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (seq !== osrmSeq) return;
        clearOsrm();
        try {
          if (estado.polyActual) {
            map.removeLayer(estado.polyActual);
            estado.polyActual = null;
          }
        } catch (e) {}
        if (!data || data.code !== "Ok" || !data.routes || !data.routes[0]) {
          try {
            estado.polyActual = L.polyline(pts, {
              color: "#f59e0b", weight: 4, dashArray: "6,6", opacity: 0.9
            }).addTo(map);
          } catch (e2) {}
          return;
        }
        var coords = data.routes[0].geometry.coordinates.map(function (c) {
          return [c[1], c[0]];
        });
        osrmLayer = L.polyline(coords, {
          color: "#38bdf8", weight: 5, opacity: 0.95
        }).addTo(map);
        try {
          map.fitBounds(osrmLayer.getBounds(), { padding: [40, 40], maxZoom: 14 });
        } catch (e3) {}
      })
      .catch(function () {});
  }

  function dibujarViajesGuardados() {
    if (!estado || !estado.mapRutas) return;
    if (!estado.polysGuardadas) estado.polysGuardadas = [];
    estado.polysGuardadas.forEach(function (pl) {
      try { estado.mapRutas.removeLayer(pl); } catch (e) {}
    });
    estado.polysGuardadas = [];
    (estado.viajesGuardados || []).forEach(function (v) {
      if (!v.paradas || !v.paradas.length) return;
      var line = [];
      if (v.origen && v.origen.lat != null) line.push([v.origen.lat, v.origen.lon]);
      else if (estado.origenActual && estado.origenActual.lat != null) {
        line.push([estado.origenActual.lat, estado.origenActual.lon]);
      }
      v.paradas.forEach(function (p) {
        var la = p.lat, lo = p.lon;
        if (la == null) {
          var c = (estado.clientesHoy || []).find(function (x) { return x.idCliente === p.idCliente; });
          if (c) { la = c.lat; lo = c.lon; }
        }
        if (la != null && lo != null) line.push([la, lo]);
      });
      if (line.length > 1) {
        try {
          var pl = L.polyline(line, {
            color: v.color || "#22c55e", weight: 4, opacity: 0.85
          }).addTo(estado.mapRutas);
          estado.polysGuardadas.push(pl);
        } catch (e) {}
      }
    });
  }

  function paintMapaRutas() {
    if (!estado || !estado.mapRutas || !estado.clusterRutas) return;
    if (!estado.markersRutas) estado.markersRutas = new Map();
    try {
      estado.clusterRutas.clearLayers();
      estado.markersRutas.clear();
    } catch (e) {}

    var en = idsEnViaje();

    function addMarker(cli, st) {
      if (!cli || cli.lat == null || cli.lon == null) return;
      var la = cli.lat, lo = cli.lon;
      if (typeof jitter === "function") {
        var j = jitter(cli.lat, cli.lon, cli.idCliente);
        la = j[0]; lo = j[1];
      }
      var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
      var m = ico ? L.marker([la, lo], { icon: ico, zIndexOffset: st.z || 1000 }) : L.marker([la, lo]);
      if (typeof popupHtml === "function") m.bindPopup(popupHtml(cli));
      if (!en.has(cli.idCliente)) {
        m.on("click", function () {
          try { if (typeof agregarParada === "function") agregarParada(cli); } catch (e) {}
        });
      }
      estado.clusterRutas.addLayer(m);
      estado.markersRutas.set(cli.idCliente, m);
    }

    clientesActivos().forEach(function (cli) {
      addMarker(cli, { color: "#64748b", texto: "", sz: 22, z: 500 });
    });

    (estado.viajeActual || []).forEach(function (p, i) {
      var cli = Object.assign({}, p);
      if (cli.lat == null) {
        var f = (estado.clientesHoy || []).find(function (c) { return c.idCliente === p.idCliente; });
        if (f) { cli.lat = f.lat; cli.lon = f.lon; cli.nombre = cli.nombre || f.nombre; }
      }
      addMarker(cli, { color: "#f59e0b", texto: String(i + 1), sz: 30, z: 2500 });
    });

    (estado.viajesGuardados || []).forEach(function (v) {
      (v.paradas || []).forEach(function (p, i) {
        var cli = Object.assign({}, p);
        if (cli.lat == null) {
          var f = (estado.clientesHoy || []).find(function (c) { return c.idCliente === p.idCliente; });
          if (f) { cli.lat = f.lat; cli.lon = f.lon; cli.nombre = cli.nombre || f.nombre; }
        }
        addMarker(cli, { color: v.color || "#22c55e", texto: String(i + 1), sz: 26, z: 2000 });
      });
    });

    if (estado.mapPanel && estado.clusterPanel) {
      if (!estado.markersPanel) estado.markersPanel = new Map();
      try {
        estado.clusterPanel.clearLayers();
        estado.markersPanel.clear();
      } catch (e) {}
      clientesActivos().forEach(function (cli) {
        var st = { color: "#64748b", texto: "", sz: 22 };
        var la = cli.lat, lo = cli.lon;
        if (typeof jitter === "function") {
          var j = jitter(cli.lat, cli.lon, cli.idCliente);
          la = j[0]; lo = j[1];
        }
        var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
        var m = ico ? L.marker([la, lo], { icon: ico }) : L.marker([la, lo]);
        if (typeof popupHtml === "function") m.bindPopup(popupHtml(cli));
        estado.clusterPanel.addLayer(m);
        estado.markersPanel.set(cli.idCliente, m);
      });
      try { estado.mapPanel.invalidateSize(true); } catch (e) {}
    }

    dibujarRuta();
    dibujarViajesGuardados();
    updateBadges();
    try { estado.mapRutas.invalidateSize(true); } catch (e) {}
  }

  function rebuildCiudades() {
    try {
      if (typeof window.rutalogRebuildCiudades === "function") {
        window.rutalogRebuildCiudades();
        return;
      }
      var set = new Set();
      (estado.clientesHoy || []).forEach(function (c) {
        if (c.ciudad) set.add(String(c.ciudad).trim());
        if (c.localidad) set.add(String(c.localidad).trim());
      });
      var lista = document.getElementById("listaCiudades");
      if (!lista) return;
      var ciudades = Array.from(set).filter(Boolean).sort(function (a, b) {
        return a.localeCompare(b, "es");
      });
      lista.innerHTML = ciudades.map(function (c) {
        var safe = String(c).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
        return '<label class="ciu-chip"><input type="checkbox" class="chk-ciudad" value="' + safe + '"> ' + safe + "</label>";
      }).join("");
      var chkTodas = document.getElementById("chkTodasCiudades");
      if (chkTodas) chkTodas.checked = true;
      if (typeof bindCiudadChecks === "function") bindCiudadChecks();
    } catch (e) {}
  }

  function refreshAll(reason) {
    paintMapaRutas();
    rebuildCiudades();
    if (reason) console.info("[RUTALOG] mapa-viaje:", reason);
  }

  window.rutalogMapaViajeRefresh = refreshAll;

  function wrapRefrescar() {
    if (typeof window.refrescarRutaUI !== "function") return;
    if (window.refrescarRutaUI._mapaViaje) return;
    var orig = window.refrescarRutaUI;
    window.refrescarRutaUI = function () {
      var r = orig.apply(this, arguments);
      setTimeout(function () { refreshAll("refrescarRutaUI"); }, 40);
      setTimeout(function () { dibujarRuta(); }, 120);
      return r;
    };
    window.refrescarRutaUI._mapaViaje = true;
  }

  function wrapAgregar() {
    if (typeof window.agregarParada !== "function") return;
    if (window.agregarParada._mapaViaje) return;
    var orig = window.agregarParada;
    window.agregarParada = function (cli) {
      var r = orig.apply(this, arguments);
      setTimeout(function () { refreshAll("agregarParada"); }, 30);
      return r;
    };
    window.agregarParada._mapaViaje = true;
  }

  function wrapRenderMapas() {
    if (typeof window.renderMapas !== "function") return;
    if (window.renderMapas._mapaViaje) return;
    var orig = window.renderMapas;
    window.renderMapas = function () {
      var r = orig.apply(this, arguments);
      setTimeout(function () { refreshAll("renderMapas"); }, 50);
      return r;
    };
    window.renderMapas._mapaViaje = true;
  }

  function tick() {
    wrapRefrescar();
    wrapAgregar();
    wrapRenderMapas();
  }
  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(function () { refreshAll("boot"); }, 1800);
  setInterval(tick, 5000);

  console.info("[RUTALOG] mapa-viaje v1 — ruta OSRM + iconos + puntos activos");
})();
