/* RUTALOG map-despachados v1 — mostrar ruta + clientes ya en viaje en mapa de rutas */
(function () {
  "use strict";
  if (window.__rutalogMapDespachadosV1) return;
  window.__rutalogMapDespachadosV1 = true;

  function isAsignado(id) {
    try {
      if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(id)) return true;
      if (!window.estado) return false;
      if ((estado.viajeActual || []).some(function (p) { return p.idCliente === id; })) return true;
      return (estado.viajesGuardados || []).some(function (v) {
        return (v.paradas || []).some(function (p) { return p.idCliente === id; });
      });
    } catch (e) {
      return false;
    }
  }

  function posDe(p) {
    if (!p) return null;
    var la = p.lat, lo = p.lon;
    if (la == null || lo == null) {
      try {
        var cli = (estado.clientesHoy || []).find(function (c) { return c.idCliente === p.idCliente; });
        if (cli) { la = cli.lat; lo = cli.lon; }
      } catch (e) {}
    }
    if (la == null || lo == null) return null;
    if (typeof jitter === "function") {
      var j = jitter(la, lo, p.idCliente);
      return [j[0], j[1]];
    }
    return [la, lo];
  }

  function drawTripPolylines() {
    if (!window.estado || !estado.mapRutas) return;
    try {
      if (estado.polyActual) {
        try { estado.mapRutas.removeLayer(estado.polyActual); } catch (e) {}
        estado.polyActual = null;
      }
      if (!estado.polysGuardadas) estado.polysGuardadas = [];
      estado.polysGuardadas.forEach(function (pl) {
        try { estado.mapRutas.removeLayer(pl); } catch (e) {}
      });
      estado.polysGuardadas = [];

      if (estado.viajeActual && estado.viajeActual.length) {
        var line = [];
        if (estado.origenActual && estado.origenActual.lat != null) {
          line.push([estado.origenActual.lat, estado.origenActual.lon]);
        }
        estado.viajeActual.forEach(function (p) {
          var pos = posDe(p);
          if (pos) line.push(pos);
        });
        if (line.length > 1) {
          estado.polyActual = L.polyline(line, {
            color: "#f59e0b",
            weight: 4,
            dashArray: "6,6",
            opacity: 0.95
          }).addTo(estado.mapRutas);
        }
      }

      (estado.viajesGuardados || []).forEach(function (v) {
        if (!v.paradas || !v.paradas.length) return;
        var line2 = [];
        if (v.origen && v.origen.lat != null) {
          line2.push([v.origen.lat, v.origen.lon]);
        } else if (estado.origenActual && estado.origenActual.lat != null) {
          line2.push([estado.origenActual.lat, estado.origenActual.lon]);
        }
        v.paradas.forEach(function (p) {
          var pos = posDe(p);
          if (pos) line2.push(pos);
        });
        if (line2.length > 1) {
          var pl = L.polyline(line2, {
            color: v.color || "#38bdf8",
            weight: 4,
            opacity: 0.9
          }).addTo(estado.mapRutas);
          estado.polysGuardadas.push(pl);
        }
      });
    } catch (e) {
      console.warn("[map-despachados] poly", e);
    }
  }

  function paintAssignedMarkers() {
    if (!window.estado || !estado.mapRutas || !estado.clusterRutas) return 0;
    if (!estado.markersRutas) estado.markersRutas = new Map();
    var n = 0;
    var seen = new Set();

    function addCli(cli, forceStyle) {
      if (!cli || cli.lat == null || cli.lon == null) return;
      if (seen.has(cli.idCliente)) return;
      seen.add(cli.idCliente);
      try {
        var st = forceStyle || (typeof estiloCli === "function" ? estiloCli(cli) : { color: "#22c55e", texto: "✓", sz: 26 });
        var la = cli.lat, lo = cli.lon;
        if (typeof jitter === "function") {
          var j = jitter(cli.lat, cli.lon, cli.idCliente);
          la = j[0]; lo = j[1];
        }
        var ico = typeof icono === "function" ? icono(st.color, st.texto, st.sz) : undefined;
        var m = ico ? L.marker([la, lo], { icon: ico, zIndexOffset: 2000 }) : L.marker([la, lo]);
        if (typeof popupHtml === "function") m.bindPopup(popupHtml(cli));
        estado.clusterRutas.addLayer(m);
        estado.markersRutas.set(cli.idCliente, m);
        n++;
      } catch (e) {}
    }

    (estado.clientesHoy || []).forEach(function (cli) {
      if (isAsignado(cli.idCliente)) addCli(cli);
    });

    function fromParada(p, vColor, idx) {
      if (!p) return;
      var cli = {
        idCliente: p.idCliente,
        nombre: p.nombre,
        lat: p.lat,
        lon: p.lon,
        peso: p.peso,
        ovTexto: p.ovTexto,
        ovs: p.ovs,
        estadoDoc: p.estadoDoc || "",
        localidad: p.localidad || "",
        ciudad: p.ciudad || "",
        condicion: p.condicion || ""
      };
      if (cli.lat == null) {
        var found = (estado.clientesHoy || []).find(function (c) { return c.idCliente === p.idCliente; });
        if (found) {
          cli.lat = found.lat;
          cli.lon = found.lon;
          cli.nombre = cli.nombre || found.nombre;
        }
      }
      addCli(cli, { color: vColor || "#22c55e", texto: String(idx + 1), sz: 26 });
    }

    (estado.viajeActual || []).forEach(function (p, i) {
      fromParada(p, "#f59e0b", i);
    });
    (estado.viajesGuardados || []).forEach(function (v) {
      (v.paradas || []).forEach(function (p, i) {
        fromParada(p, v.color || "#38bdf8", i);
      });
    });

    return n;
  }

  function refreshDespachados(reason) {
    try {
      drawTripPolylines();
      var n = paintAssignedMarkers();
      if (estado.mapRutas) {
        try { estado.mapRutas.invalidateSize(true); } catch (e) {}
      }
      if (reason) console.info("[RUTALOG] map-despachados:", reason, "marcadores asignados≈", n);
    } catch (e) {
      console.warn("[map-despachados]", e);
    }
  }

  window.rutalogRefreshDespachados = refreshDespachados;

  function wrapRenderMapas() {
    if (typeof window.renderMapas !== "function") return;
    if (window.renderMapas._despachadosHook) return;
    var orig = window.renderMapas;
    window.renderMapas = function () {
      var r = orig.apply(this, arguments);
      setTimeout(function () { refreshDespachados("after-renderMapas"); }, 30);
      setTimeout(function () { refreshDespachados("after-renderMapas-2"); }, 250);
      return r;
    };
    window.renderMapas._despachadosHook = true;
  }

  function wrapGuardar() {
    ["btnGuardarViaje", "btnGuardar"].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b || b._despachadosHook) return;
      b._despachadosHook = true;
      b.addEventListener("click", function () {
        setTimeout(function () { refreshDespachados("guardar"); }, 200);
        setTimeout(function () { refreshDespachados("guardar-2"); }, 600);
      }, true);
    });
    if (typeof window.guardarViaje === "function" && !window.guardarViaje._despachadosHook) {
      var g = window.guardarViaje;
      window.guardarViaje = function () {
        var r = g.apply(this, arguments);
        setTimeout(function () { refreshDespachados("guardarViaje"); }, 150);
        setTimeout(function () { refreshDespachados("guardarViaje-2"); }, 500);
        return r;
      };
      window.guardarViaje._despachadosHook = true;
    }
  }

  function wrapGo() {
    if (typeof window.go !== "function" || window.go._despachadosHook) return;
    var orig = window.go;
    window.go = function (page) {
      var r = orig.apply(this, arguments);
      if (page === "rutas" || page === "panel") {
        setTimeout(function () { refreshDespachados("go-" + page); }, 200);
        setTimeout(function () { refreshDespachados("go-" + page + "-2"); }, 600);
      }
      return r;
    };
    window.go._despachadosHook = true;
  }

  function tick() {
    wrapRenderMapas();
    wrapGuardar();
    wrapGo();
  }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  setTimeout(function () { refreshDespachados("boot"); }, 2000);
  setInterval(tick, 4000);

  console.info("[RUTALOG] map-despachados v1 — rutas y clientes en viaje visibles");
})();
