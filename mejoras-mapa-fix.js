/* RUTALOG mapa-fix v2 — puntos trabajados visibles + ruta actual + Inicio */
(function () {
  "use strict";
  if (window.__rutalogMapaFixV2) return;
  window.__rutalogMapaFixV2 = true;
  window.__rutalogMapaFixV1 = true;
  window.__rutalogMapRefreshV3 = true;
  window.__rutalogMapRefreshV31 = true;
  window.__rutalogMapRefreshV2 = true;
  window.__rutalogMapDespachadosV1 = true;
  window.__rutalogMapaViajeV1 = true;

  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var osrmLayer = null;
  var osrmSeq = 0;
  var painting = false;

  function enViajeIds() {
    var s = new Set();
    try {
      (estado.viajeActual || []).forEach(function (p) { s.add(String(p.idCliente)); });
      (estado.viajesGuardados || []).forEach(function (v) {
        (v.paradas || []).forEach(function (p) { s.add(String(p.idCliente)); });
      });
    } catch (e) {}
    return s;
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
      try {
        var j = jitter(la, lo, p.idCliente);
        return [j[0], j[1]];
      } catch (e) {}
    }
    return [la, lo];
  }

  function updateBadges() {
    try {
      var en = enViajeIds();
      var activos = (estado.clientesHoy || []).filter(function (c) {
        if (!c || c.lat == null) return false;
        if (en.has(String(c.idCliente))) return false;
        try {
          if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(c.idCliente)) return false;
        } catch (e) {}
        return true;
      });
      var n = activos.length;
      var peso = activos.reduce(function (s, c) { return s + (Number(c.peso) || 0); }, 0);
      var el;
      el = document.getElementById("badgeActivos");
      if (el) el.textContent = n + " puntos activos";
      el = document.getElementById("badgeMapaPanel");
      if (el) el.textContent = n + " puntos";
      el = document.getElementById("sMapa");
      if (el) el.textContent = String(n);
      el = document.getElementById("sPeso");
      if (el) el.textContent = peso.toFixed(2) + " kg";
    } catch (e) {}
  }

  function rebuildCiudades(force) {
    try {
      var lista = document.getElementById("listaCiudades");
      if (!lista) return;
      if (!force && lista.querySelectorAll(".ciu-chip").length > 0) return;
      var set = new Set();
      (estado.clientesHoy || []).forEach(function (c) {
        if (c.ciudad) set.add(String(c.ciudad).trim());
        if (c.localidad) set.add(String(c.localidad).trim());
      });
      var ciudades = Array.from(set).filter(Boolean).sort(function (a, b) {
        return a.localeCompare(b, "es");
      });
      if (!ciudades.length) return;
      var prev = [];
      try {
        if (typeof getCiudadesSeleccionadas === "function") prev = getCiudadesSeleccionadas() || [];
      } catch (e) {}
      var keep = prev.filter(function (x) {
        return x !== "__TODAS__" && ciudades.indexOf(x) >= 0;
      });
      lista.innerHTML = ciudades.map(function (c) {
        var safe = String(c).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
        var ck = keep.length && keep.indexOf(c) >= 0 ? "checked" : "";
        return '<label class="ciu-chip"><input type="checkbox" class="chk-ciudad" value="' + safe + '" ' + ck + "> ' + safe + "</label>";
      }).join("");
      var chk = document.getElementById("chkTodasCiudades");
      if (chk) chk.checked = !keep.length;
      if (typeof bindCiudadChecks === "function") bindCiudadChecks();
      if (typeof actualizarLabelCiudad === "function") actualizarLabelCiudad();
    } catch (e) {
      console.warn("[mapa-fix] ciudades", e);
    }
  }

  function clearOsrm() {
    try {
      if (osrmLayer && estado.mapRutas) estado.mapRutas.removeLayer(osrmLayer);
    } catch (e) {}
    osrmLayer = null;
  }

  function drawCurrentRoute() {
    if (!estado.mapRutas) return;
    var map = estado.mapRutas;
    var pts = [];
    if (estado.origenActual && estado.origenActual.lat != null) {
      pts.push([estado.origenActual.lat, estado.origenActual.lon]);
    }
    (estado.viajeActual || []).forEach(function (p) {
      var pos = resolvePos(p);
      if (pos) pts.push(pos);
    });
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
        color: "#f59e0b", weight: 5, dashArray: "8,6", opacity: 0.95
      }).addTo(map);
    } catch (e) {}
    var seq = ++osrmSeq;
    var coordStr = pts.map(function (p) { return p[1] + "," + p[0]; }).join(";");
    fetch(OSRM + coordStr + "?overview=full&geometries=geojson")
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
              color: "#f59e0b", weight: 5, dashArray: "8,6", opacity: 0.95
            }).addTo(map);
          } catch (e2) {}
          return;
        }
        var coords = data.routes[0].geometry.coordinates.map(function (c) {
          return [c[1], c[0]];
        });
        osrmLayer = L.polyline(coords, {
          color: "#f59e0b", weight: 6, opacity: 1
        }).addTo(map);
      })
      .catch(function () {});
  }

  function drawSavedRoutes() {
    if (!estado.mapRutas) return;
    if (!estado.polysGuardadas) estado.polysGuardadas = [];
    estado.polysGuardadas.forEach(function (pl) {
      try { estado.mapRutas.removeLayer(pl); } catch (e) {}
    });
    estado.polysGuardadas = [];
    (estado.viajesGuardados || []).forEach(function (v) {
      if (!v.paradas || v.paradas.length < 1) return;
      var line = [];
      if (v.origen && v.origen.lat != null) line.push([v.origen.lat, v.origen.lon]);
      else if (estado.origenActual && estado.origenActual.lat != null) {
        line.push([estado.origenActual.lat, estado.origenActual.lon]);
      }
      v.paradas.forEach(function (p) {
        var pos = resolvePos(p);
        if (pos) line.push(pos);
      });
      if (line.length > 1) {
        try {
          var pl = L.polyline(line, {
            color: v.color || "#64748b", weight: 3, opacity: 0.45
          }).addTo(estado.mapRutas);
          estado.polysGuardadas.push(pl);
        } catch (e) {}
      }
    });
  }

  function mkMarker(cli, st, clickable) {
    if (!cli || cli.lat == null || cli.lon == null) return null;
    var la = cli.lat, lo = cli.lon;
    if (typeof jitter === "function") {
      try {
        var j = jitter(cli.lat, cli.lon, cli.idCliente);
        la = j[0]; lo = j[1];
      } catch (e) {}
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
        try {
          if (typeof agregarParada === "function") agregarParada(cli);
        } catch (e) {}
      });
    }
    return m;
  }

  function paintCluster(cluster, markersMap, includeClick) {
    if (!cluster) return markersMap;
    if (!markersMap) markersMap = new Map();
    try {
      cluster.clearLayers();
      markersMap.clear();
    } catch (e) {}

    var en = enViajeIds();
    var painted = new Set();

    function add(cli, st, click) {
      if (!cli || cli.lat == null) return;
      var id = String(cli.idCliente);
      if (painted.has(id)) return;
      painted.add(id);
      var m = mkMarker(cli, st, click);
      if (m) {
        cluster.addLayer(m);
        markersMap.set(cli.idCliente, m);
      }
    }

    (estado.clientesHoy || []).forEach(function (cli) {
      if (en.has(String(cli.idCliente))) return;
      try {
        if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(cli.idCliente)) return;
      } catch (e) {}
      add(cli, { color: "#64748b", texto: "", sz: 22, z: 400 }, includeClick);
    });

    (estado.viajeActual || []).forEach(function (p, i) {
      var cli = Object.assign({}, p);
      var pos = resolvePos(p);
      if (pos) { cli.lat = pos[0]; cli.lon = pos[1]; }
      add(cli, { color: "#f59e0b", texto: String(i + 1), sz: 32, z: 3500 }, false);
    });

    (estado.viajesGuardados || []).forEach(function (v) {
      (v.paradas || []).forEach(function (p, i) {
        var cli = Object.assign({}, p);
        var pos = resolvePos(p);
        if (pos) { cli.lat = pos[0]; cli.lon = pos[1]; }
        add(cli, {
          color: v.color || "#22c55e",
          texto: String(i + 1),
          sz: 28,
          z: 2800
        }, false);
      });
    });

    return markersMap;
  }

  function paint() {
    if (!window.estado || painting) return;
    painting = true;
    try {
      if (estado.mapRutas && estado.clusterRutas) {
        estado.markersRutas = paintCluster(estado.clusterRutas, estado.markersRutas || new Map(), true);
        drawSavedRoutes();
        drawCurrentRoute();
        try { estado.mapRutas.invalidateSize(true); } catch (e) {}
      }
      if (estado.mapPanel && estado.clusterPanel) {
        estado.markersPanel = paintCluster(estado.clusterPanel, estado.markersPanel || new Map(), false);
        try { estado.mapPanel.invalidateSize(true); } catch (e) {}
      }
      updateBadges();
      rebuildCiudades(false);
    } catch (e) {
      console.warn("[mapa-fix] paint", e);
    }
    painting = false;
  }

  window.rutalogMapaFix = paint;

  function after(fnName, forceCities) {
    if (typeof window[fnName] !== "function") return false;
    if (window[fnName]._mapaFixV2) return true;
    var orig = window[fnName];
    window[fnName] = function () {
      var r = orig.apply(this, arguments);
      if (forceCities) setTimeout(function () { rebuildCiudades(true); }, 30);
      setTimeout(paint, 30);
      setTimeout(paint, 250);
      return r;
    };
    window[fnName]._mapaFixV2 = true;
    return true;
  }

  function wireButtons() {
    ["btnGuardarViaje", "btnGuardar", "btnDeshacer", "btnReiniciar"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b || b._mapaFixV2) return;
      b._mapaFixV2 = true;
      b.addEventListener("click", function () {
        setTimeout(paint, 80);
        setTimeout(paint, 400);
      }, true);
    });
  }

  function renameInicio() {
    try {
      document.querySelectorAll('.nav button[data-page="panel"] .nav-label').forEach(function (n) {
        n.textContent = "Inicio";
      });
      var t = document.getElementById("pageTitle");
      if (t && document.getElementById("page-panel") &&
          document.getElementById("page-panel").classList.contains("active")) {
        if (/panel/i.test(t.textContent) || t.textContent === "Panel de despachos") {
          t.textContent = "Inicio";
        }
      }
    } catch (e) {}
  }

  function wrapGo() {
    if (typeof window.go !== "function") return;
    if (window.go._mapaFixInicio) return;
    var orig = window.go;
    window.go = function (page) {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        renameInicio();
        var t = document.getElementById("pageTitle");
        if (t && page === "panel") t.textContent = "Inicio";
        paint();
      }, 40);
      return r;
    };
    window.go._mapaFixInicio = true;
  }

  function tick() {
    after("refrescarRutaUI", false);
    after("agregarParada", false);
    after("renderMapas", false);
    after("construirHoy", true);
    after("guardarViaje", false);
    wireButtons();
    wrapGo();
    renameInicio();
  }

  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(function () {
    rebuildCiudades(true);
    paint();
    renameInicio();
  }, 1600);
  setInterval(tick, 5000);

  console.info("[RUTALOG] mapa-fix v2 — puntos trabajados visibles + ruta actual + Inicio");
})();
