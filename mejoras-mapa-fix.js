/* RUTALOG mapa-fix v3 — al guardar, clientes despachados salen del mapa */
(function () {
  "use strict";
  if (window.__rutalogMapaFixV3) return;
  window.__rutalogMapaFixV3 = true;
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
    } catch (e) {
      return false;
    }
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
      var activos = (estado.clientesHoy || []).filter(function (c) {
        if (!c || c.lat == null) return false;
        if (inViajeActual(c.idCliente)) return false;
        if (isCompleto(c.idCliente)) return false;
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
      if (!force && lista.querySelectorAll(".chk-ciudad, .ciu-chip input").length > 0) return;
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
    } catch (e) {}
  }

  function clearOsrm() {
    try {
      if (osrmLayer && estado.mapRutas) estado.mapRutas.removeLayer(osrmLayer);
    } catch (e) {}
    osrmLayer = null;
  }

  function drawCurrentRoute() {
    if (!estado || !estado.mapRutas) return;
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

  function drawSavedRoutesFaint() {
    if (!estado || !estado.mapRutas) return;
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
            color: v.color || "#64748b", weight: 2, opacity: 0.35
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

  function paintCluster(cluster, markersMap, allowClick) {
    if (!cluster) return markersMap || new Map();
    if (!markersMap) markersMap = new Map();
    try {
      cluster.clearLayers();
      markersMap.clear();
    } catch (e) {}

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

  function paint(reason) {
    if (!window.estado || painting) return;
    if (!estado.mapRutas && !estado.mapPanel) return;
    painting = true;
    try {
      if (estado.mapRutas && estado.clusterRutas) {
        estado.markersRutas = paintCluster(estado.clusterRutas, estado.markersRutas || new Map(), true);
        drawSavedRoutesFaint();
        drawCurrentRoute();
        try { estado.mapRutas.invalidateSize(true); } catch (e) {}
      }
      if (estado.mapPanel && estado.clusterPanel) {
        estado.markersPanel = paintCluster(estado.clusterPanel, estado.markersPanel || new Map(), false);
        try { estado.mapPanel.invalidateSize(true); } catch (e) {}
      }
      updateBadges();
    } catch (e) {
      console.warn("[mapa-fix]", e);
    }
    painting = false;
    if (reason) console.info("[RUTALOG] mapa-fix paint:", reason);
  }

  window.rutalogMapaFix = paint;

  function hook(name, forceCities) {
    if (typeof window[name] !== "function") return false;
    if (window[name]._mf3) return true;
    var orig = window[name];
    window[name] = function () {
      var r = orig.apply(this, arguments);
      if (forceCities) setTimeout(function () { rebuildCiudades(true); }, 40);
      setTimeout(function () { paint(name); }, 20);
      setTimeout(function () { paint(name + "-2"); }, 200);
      setTimeout(function () { paint(name + "-3"); }, 500);
      return r;
    };
    window[name]._mf3 = true;
    return true;
  }

  function wireConfirmAudit() {
    var btn = document.getElementById("btnAuditConfirmar");
    if (btn && !btn._mf3) {
      btn._mf3 = true;
      btn.addEventListener("click", function () {
        setTimeout(function () { paint("audit-confirm"); }, 100);
        setTimeout(function () { paint("audit-confirm-2"); }, 400);
        setTimeout(function () { paint("audit-confirm-3"); }, 900);
      }, true);
    }
    if (typeof window.confirmarAuditoriaYDespachar === "function" &&
        !window.confirmarAuditoriaYDespachar._mf3) {
      var orig = window.confirmarAuditoriaYDespachar;
      window.confirmarAuditoriaYDespachar = async function () {
        var r = await orig.apply(this, arguments);
        setTimeout(function () { paint("confirmarAuditoria"); }, 50);
        setTimeout(function () { paint("confirmarAuditoria-2"); }, 300);
        setTimeout(function () { paint("confirmarAuditoria-3"); }, 800);
        return r;
      };
      window.confirmarAuditoriaYDespachar._mf3 = true;
    }
  }

  function wireBtns() {
    ["btnGuardarViaje", "btnDeshacer", "btnReiniciar"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b || b._mf3) return;
      b._mf3 = true;
      b.addEventListener("click", function () {
        setTimeout(function () { paint(id); }, 60);
        setTimeout(function () { paint(id + "-2"); }, 350);
      }, true);
    });
  }

  function renameInicio() {
    try {
      document.querySelectorAll('.nav button[data-page="panel"] .nav-label').forEach(function (n) {
        n.textContent = "Inicio";
      });
      var t = document.getElementById("pageTitle");
      var page = document.getElementById("page-panel");
      if (t && page && page.classList.contains("active")) t.textContent = "Inicio";
    } catch (e) {}
  }

  function wrapGo() {
    if (typeof window.go !== "function" || window.go._mf3) return;
    var orig = window.go;
    window.go = function (page) {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        renameInicio();
        if (page === "panel") {
          var t = document.getElementById("pageTitle");
          if (t) t.textContent = "Inicio";
        }
        paint("go-" + page);
      }, 50);
      return r;
    };
    window.go._mf3 = true;
  }

  function tick() {
    hook("refrescarRutaUI", false);
    hook("agregarParada", false);
    hook("renderMapas", false);
    hook("construirHoy", true);
    hook("guardarViaje", false);
    wireConfirmAudit();
    wireBtns();
    wrapGo();
    renameInicio();
  }

  tick();
  setTimeout(tick, 300);
  setTimeout(tick, 1000);
  setTimeout(tick, 2500);
  setTimeout(function () {
    rebuildCiudades(true);
    paint("boot");
    renameInicio();
  }, 1800);
  setInterval(tick, 4000);

  console.info("[RUTALOG] mapa-fix v3 — al guardar, clientes despachados salen del mapa");
})();
