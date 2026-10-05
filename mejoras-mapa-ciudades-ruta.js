/* RUTALOG mapa-ciudades-ruta v1
 * 1) Mapa solo muestra ciudades del filtro activo
 * 2) Todos los trazos (actual + guardados) por calles OSRM (estilo azul)
 * 3) Re-pinta al cambiar checkboxes de ciudad
 */
(function () {
  "use strict";
  if (window.__rutalogMapaCiudadesRutaV1) return;
  window.__rutalogMapaCiudadesRutaV1 = true;

  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var osrmLayers = [];
  var osrmSeq = 0;

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cityKey(s) {
    var n = norm(s);
    if (!n) return "";
    if (n.indexOf("santiago rodriguez") === 0 || n === "santiago rodriguez") return "santiago rodriguez";
    if (n === "santiago" || n.indexOf("santiago de los") === 0) return "santiago";
    if (n.indexOf("santo domingo") === 0 || n === "distrito nacional" || n === "sdn" || n === "sde" || n === "sdo")
      return "santo domingo";
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
    } catch (e) {
      return null;
    }
  }

  function ciudadPasaFiltro(ciudad) {
    var f = filtroActivo();
    if (!f) return true;
    var k = cityKey(ciudad);
    if (!k) return false;
    return f.indexOf(k) >= 0;
  }

  function clearOsrmAll() {
    osrmLayers.forEach(function (ly) {
      try {
        if (estado.mapRutas) estado.mapRutas.removeLayer(ly);
      } catch (e) {}
    });
    osrmLayers = [];
  }

  function fetchOsrm(pts, color, weight, seq) {
    if (!pts || pts.length < 2 || !estado.mapRutas) return;
    var coordStr = pts
      .map(function (p) {
        return p[1] + "," + p[0];
      })
      .join(";");
    fetch(OSRM + coordStr + "?overview=full&geometries=geojson")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (seq !== osrmSeq) return;
        if (!data || data.code !== "Ok" || !data.routes || !data.routes[0]) {
          var fb = L.polyline(pts, {
            color: color || "#38bdf8",
            weight: weight || 4,
            opacity: 0.85,
            dashArray: "6,6"
          }).addTo(estado.mapRutas);
          osrmLayers.push(fb);
          return;
        }
        var coords = data.routes[0].geometry.coordinates.map(function (c) {
          return [c[1], c[0]];
        });
        var pl = L.polyline(coords, {
          color: color || "#38bdf8",
          weight: weight || 4,
          opacity: 0.95
        }).addTo(estado.mapRutas);
        osrmLayers.push(pl);
      })
      .catch(function () {
        if (seq !== osrmSeq) return;
        try {
          var fb2 = L.polyline(pts, {
            color: color || "#38bdf8",
            weight: weight || 4,
            opacity: 0.85,
            dashArray: "6,6"
          }).addTo(estado.mapRutas);
          osrmLayers.push(fb2);
        } catch (e) {}
      });
  }

  function resolvePos(p) {
    if (!p) return null;
    var la = p.lat,
      lo = p.lon;
    if ((la == null || lo == null) && window.estado) {
      var c = (estado.clientesHoy || []).find(function (x) {
        return String(x.idCliente) === String(p.idCliente);
      });
      if (c) {
        la = c.lat;
        lo = c.lon;
      }
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

  function inActual(id) {
    try {
      return (estado.viajeActual || []).some(function (p) {
        return String(p.idCliente) === String(id);
      });
    } catch (e) {
      return false;
    }
  }

  function debeOcultarDespachado(id) {
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
      var pend =
        (estado.lineasPendientes &&
          (estado.lineasPendientes.get(id) ||
            estado.lineasPendientes.get(String(id)))) ||
        [];
      if (!pend.length) return true;
      var residual = pend.some(function (l) {
        return !l.despachado && (l.aDespachar == null || Math.abs(Number(l.aDespachar)) > 1e-9);
      });
      return !residual;
    } catch (e) {
      return false;
    }
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

  function paintFiltered() {
    if (!window.estado) return;
    var seq = ++osrmSeq;
    clearOsrmAll();
    try {
      if (estado.polyActual && estado.mapRutas) {
        estado.mapRutas.removeLayer(estado.polyActual);
        estado.polyActual = null;
      }
      (estado.polysGuardadas || []).forEach(function (pl) {
        try {
          estado.mapRutas.removeLayer(pl);
        } catch (e) {}
      });
      estado.polysGuardadas = [];
    } catch (e) {}

    var lista = filterClientesForMap();
    var painted = new Set();

    function addToCluster(cluster, markersMap, cli, st, clickable) {
      if (!cluster || !cli || cli.lat == null) return;
      var id = String(cli.idCliente);
      if (painted.has(id)) return;
      painted.add(id);
      var la = cli.lat,
        lo = cli.lon;
      if (typeof jitter === "function") {
        try {
          var j = jitter(cli.lat, cli.lon, cli.idCliente);
          la = j[0];
          lo = j[1];
        } catch (e) {}
      }
      var ico =
        typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
      var m = ico
        ? L.marker([la, lo], { icon: ico, zIndexOffset: st.z || 1000 })
        : L.marker([la, lo], { zIndexOffset: st.z || 1000 });
      if (typeof popupHtml === "function") {
        try {
          m.bindPopup(popupHtml(cli));
        } catch (e) {}
      }
      if (clickable) {
        m.on("click", function () {
          try {
            if (typeof agregarParada === "function") agregarParada(cli);
          } catch (e) {}
        });
      }
      cluster.addLayer(m);
      if (markersMap) markersMap.set(cli.idCliente, m);
    }

    if (estado.mapPanel && estado.clusterPanel) {
      try {
        estado.clusterPanel.clearLayers();
        if (estado.markersPanel) estado.markersPanel.clear();
        else estado.markersPanel = new Map();
      } catch (e) {}
      painted.clear();
      lista.forEach(function (cli) {
        if (inActual(cli.idCliente)) return;
        addToCluster(estado.clusterPanel, estado.markersPanel, cli, {
          color: "#64748b",
          texto: "",
          sz: 22,
          z: 400
        }, false);
      });
      try {
        estado.mapPanel.invalidateSize(true);
      } catch (e) {}
    }

    if (estado.mapRutas && estado.clusterRutas) {
      try {
        estado.clusterRutas.clearLayers();
        if (estado.markersRutas) estado.markersRutas.clear();
        else estado.markersRutas = new Map();
      } catch (e) {}
      painted.clear();
      lista.forEach(function (cli) {
        if (inActual(cli.idCliente)) return;
        addToCluster(estado.clusterRutas, estado.markersRutas, cli, {
          color: "#64748b",
          texto: "",
          sz: 22,
          z: 400
        }, true);
      });
      (estado.viajeActual || []).forEach(function (p, i) {
        var cli = Object.assign({}, p);
        var pos = resolvePos(p);
        if (pos) {
          cli.lat = pos[0];
          cli.lon = pos[1];
        }
        addToCluster(estado.clusterRutas, estado.markersRutas, cli, {
          color: "#f59e0b",
          texto: String(i + 1),
          sz: 32,
          z: 3500
        }, false);
      });

      var ptsAct = [];
      if (estado.origenActual && estado.origenActual.lat != null) {
        ptsAct.push([estado.origenActual.lat, estado.origenActual.lon]);
      }
      (estado.viajeActual || []).forEach(function (p) {
        var pos = resolvePos(p);
        if (pos) ptsAct.push(pos);
      });
      if (ptsAct.length >= 2) fetchOsrm(ptsAct, "#38bdf8", 5, seq);

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
        if (line.length >= 2) {
          fetchOsrm(line, v.color || "#38bdf8", 4, seq);
        }
      });

      try {
        estado.mapRutas.invalidateSize(true);
      } catch (e) {}
    }

    try {
      var n = lista.filter(function (c) {
        return !inActual(c.idCliente);
      }).length;
      var peso = 0;
      lista.forEach(function (c) {
        if (inActual(c.idCliente)) return;
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

  function install() {
    if (typeof window.renderMapas === "function" && !window.renderMapas._ciuRuta) {
      var prev = window.renderMapas;
      window.renderMapas = function () {
        try {
          prev.apply(this, arguments);
        } catch (e) {}
        paintFiltered();
      };
      window.renderMapas._ciuRuta = true;
    }
    if (typeof window.refrescarRutaUI === "function" && !window.refrescarRutaUI._ciuRuta) {
      var pr = window.refrescarRutaUI;
      window.refrescarRutaUI = function () {
        var r = pr.apply(this, arguments);
        setTimeout(paintFiltered, 40);
        setTimeout(paintFiltered, 300);
        return r;
      };
      window.refrescarRutaUI._ciuRuta = true;
    }
  }

  function hookCityChecks() {
    document.querySelectorAll(".chk-ciudad").forEach(function (chk) {
      if (chk._ciuRutaHook) return;
      chk._ciuRutaHook = true;
      chk.addEventListener("change", function () {
        setTimeout(paintFiltered, 50);
        setTimeout(function () {
          if (typeof renderMapas === "function") renderMapas();
        }, 80);
      });
    });
    var todas = document.getElementById("chkTodasCiudades");
    if (todas && !todas._ciuRutaHook) {
      todas._ciuRutaHook = true;
      todas.addEventListener("change", function () {
        setTimeout(paintFiltered, 50);
        setTimeout(function () {
          if (typeof renderMapas === "function") renderMapas();
        }, 80);
      });
    }
  }

  window.rutalogCityKey = cityKey;
  window.rutalogCiudadPasaFiltro = ciudadPasaFiltro;

  function tick() {
    install();
    hookCityChecks();
  }
  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(paintFiltered, 1800);
  setInterval(tick, 3500);
  console.info("[RUTALOG] mapa-ciudades-ruta v1 — filtro mapa + OSRM todos los trazos");
})();
