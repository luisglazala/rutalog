/* RUTALOG mapa-fix v1 — ÚNICO controlador de mapa */
(function () {
  "use strict";
  if (window.__rutalogMapaFixV1) return;
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

  function enViaje() {
    var s = new Set();
    try {
      (estado.viajeActual || []).forEach(function (p) { s.add(String(p.idCliente)); });
      (estado.viajesGuardados || []).forEach(function (v) {
        (v.paradas || []).forEach(function (p) { s.add(String(p.idCliente)); });
      });
    } catch (e) {}
    return s;
  }

  function activos() {
    var en = enViaje();
    return (estado.clientesHoy || []).filter(function (c) {
      if (!c || c.lat == null || c.lon == null) return false;
      if (en.has(String(c.idCliente))) return false;
      try {
        if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(c.idCliente)) return false;
      } catch (e) {}
      return true;
    });
  }

  function resolveLatLon(p) {
    if (!p) return null;
    var la = p.lat, lo = p.lon;
    if (la == null || lo == null) {
      var c = (estado.clientesHoy || []).find(function (x) {
        return String(x.idCliente) === String(p.idCliente);
      });
      if (c) { la = c.lat; lo = c.lon; }
    }
    if (la == null || lo == null) return null;
    return [la, lo];
  }

  function updateBadges() {
    try {
      var list = activos();
      var n = list.length;
      var peso = list.reduce(function (s, c) { return s + (Number(c.peso) || 0); }, 0);
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

  function rebuildCiudades() {
    try {
      var set = new Set();
      (estado.clientesHoy || []).forEach(function (c) {
        if (c.ciudad) set.add(String(c.ciudad).trim());
        if (c.localidad) set.add(String(c.localidad).trim());
        if (c.provincia) set.add(String(c.provincia).trim());
      });
      var ciudades = Array.from(set).filter(Boolean).sort(function (a, b) {
        return a.localeCompare(b, "es");
      });
      var lista = document.getElementById("listaCiudades");
      if (!lista) return;
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

  function drawRouteCurrent() {
    if (!estado.mapRutas) return;
    var map = estado.mapRutas;
    var pts = [];
    if (estado.origenActual && estado.origenActual.lat != null) {
      pts.push([estado.origenActual.lat, estado.origenActual.lon]);
    }
    (estado.viajeActual || []).forEach(function (p) {
      var pos = resolveLatLon(p);
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
        color: "#f59e0b", weight: 4, dashArray: "6,6", opacity: 0.9
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
          map.fitBounds(osrmLayer.getBounds(), { padding: [36, 36], maxZoom: 14 });
        } catch (e3) {}
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
      if (!v.paradas || !v.paradas.length) return;
      var line = [];
      if (v.origen && v.origen.lat != null) line.push([v.origen.lat, v.origen.lon]);
      else if (estado.origenActual && estado.origenActual.lat != null) {
        line.push([estado.origenActual.lat, estado.origenActual.lon]);
      }
      v.paradas.forEach(function (p) {
        var pos = resolveLatLon(p);
        if (pos) line.push(pos);
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

  function marker(cli, st, clickable) {
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
      : L.marker([la, lo]);
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

  function paint() {
    if (!window.estado || painting) return;
    if (!estado.mapRutas || !estado.clusterRutas) return;
    painting = true;
    try {
      if (!estado.markersRutas) estado.markersRutas = new Map();
      estado.clusterRutas.clearLayers();
      estado.markersRutas.clear();

      activos().forEach(function (cli) {
        var m = marker(cli, { color: "#64748b", texto: "", sz: 22, z: 400 }, true);
        if (m) {
          estado.clusterRutas.addLayer(m);
          estado.markersRutas.set(cli.idCliente, m);
        }
      });

      (estado.viajeActual || []).forEach(function (p, i) {
        var cli = Object.assign({}, p);
        var pos = resolveLatLon(p);
        if (pos) { cli.lat = pos[0]; cli.lon = pos[1]; }
        var m = marker(cli, { color: "#f59e0b", texto: String(i + 1), sz: 32, z: 3000 }, false);
        if (m) {
          estado.clusterRutas.addLayer(m);
          estado.markersRutas.set(cli.idCliente, m);
        }
      });

      (estado.viajesGuardados || []).forEach(function (v) {
        (v.paradas || []).forEach(function (p, i) {
          var cli = Object.assign({}, p);
          var pos = resolveLatLon(p);
          if (pos) { cli.lat = pos[0]; cli.lon = pos[1]; }
          var m = marker(cli, {
            color: v.color || "#22c55e",
            texto: String(i + 1),
            sz: 28,
            z: 2500
          }, false);
          if (m) {
            estado.clusterRutas.addLayer(m);
            estado.markersRutas.set(cli.idCliente, m);
          }
        });
      });

      if (estado.mapPanel && estado.clusterPanel) {
        if (!estado.markersPanel) estado.markersPanel = new Map();
        estado.clusterPanel.clearLayers();
        estado.markersPanel.clear();
        activos().forEach(function (cli) {
          var m = marker(cli, { color: "#64748b", texto: "", sz: 22, z: 400 }, false);
          if (m) {
            estado.clusterPanel.addLayer(m);
            estado.markersPanel.set(cli.idCliente, m);
          }
        });
        try { estado.mapPanel.invalidateSize(true); } catch (e) {}
      }

      drawRouteCurrent();
      drawSavedRoutes();
      updateBadges();
      rebuildCiudades();
      try { estado.mapRutas.invalidateSize(true); } catch (e) {}
    } catch (e) {
      console.warn("[mapa-fix] paint", e);
    }
    painting = false;
  }

  window.rutalogMapaFix = paint;

  function after(fnName) {
    if (typeof window[fnName] !== "function") return false;
    if (window[fnName]._mapaFix) return true;
    var orig = window[fnName];
    window[fnName] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(paint, 20);
      setTimeout(paint, 200);
      return r;
    };
    window[fnName]._mapaFix = true;
    return true;
  }

  function wireButtons() {
    ["btnGuardarViaje", "btnGuardar", "btnDeshacer", "btnReiniciar"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b || b._mapaFix) return;
      b._mapaFix = true;
      b.addEventListener("click", function () {
        setTimeout(paint, 50);
        setTimeout(paint, 300);
      }, true);
    });
  }

  function tick() {
    after("refrescarRutaUI");
    after("agregarParada");
    after("renderMapas");
    after("construirHoy");
    after("guardarViaje");
    wireButtons();
  }

  tick();
  setTimeout(tick, 300);
  setTimeout(tick, 1000);
  setTimeout(tick, 2500);
  setTimeout(paint, 1500);
  setInterval(tick, 4000);

  console.info("[RUTALOG] mapa-fix v1 — controlador único");
})();
