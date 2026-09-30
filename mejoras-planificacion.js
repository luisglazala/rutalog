/* mejoras-planificacion.js — Generar viaje (centro, peso, topes SKU, max 10) + ruta OSRM por calles */
(function () {
  if (window.__rutalogPlanificacion) return;
  window.__rutalogPlanificacion = true;

  var MAX_CLIENTES = 10;
  var KG_G = 12000;
  var KG_P = 3800;
  var OSRM_BASE = "https://router.project-osrm.org/route/v1/driving/";
  var osrmLayer = null;
  var osrmSeq = 0;

  function toastSafe(msg) {
    try {
      if (typeof toast === "function") toast(msg);
      else console.info("[plan]", msg);
    } catch (e) {}
  }

  function plantillaActiva() {
    return (estado && estado.plantillaCamion) || "G";
  }

  function kgMax() {
    return plantillaActiva() === "P" ? KG_P : KG_G;
  }

  function distKmSafe(a, b) {
    if (typeof distKm === "function") return distKm(a, b);
    if (!a || !b || a.lat == null || b.lat == null) return 1e9;
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    var la1 = a.lat * toR, la2 = b.lat * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function bearingDeg(from, to) {
    if (!from || !to || from.lat == null || to.lat == null) return 0;
    var toR = Math.PI / 180;
    var lat1 = from.lat * toR, lat2 = to.lat * toR;
    var dLon = (to.lon - from.lon) * toR;
    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    var br = Math.atan2(y, x) * 180 / Math.PI;
    return (br + 360) % 360;
  }

  function pesoYSkusCliente(cli) {
    var id = cli.idCliente;
    var pend = (estado.lineasPendientes && estado.lineasPendientes.get(id)) || [];
    pend = pend.filter(function (l) {
      return !l.despachado && (l.aDespachar == null || Math.abs(l.aDespachar) > 0);
    });
    var peso = 0;
    var cajasPorSku = {};
    if (pend.length) {
      pend.forEach(function (l) {
        if (l.devolucion) return;
        var q = l.aDespachar != null ? Number(l.aDespachar) : Number(l.cantidad);
        if (!(q > 0)) return;
        var p = (l.pesoUnit != null ? Number(l.pesoUnit) : 0) * q;
        if (!(p > 0) && l.peso != null && Number(l.cantidad) > 0) {
          p = (Number(l.peso) / Number(l.cantidad)) * q;
        }
        if (p > 0) peso += p;
        var key = typeof normSkuKey === "function" ? normSkuKey(l.sku) : String(l.sku || "").trim();
        if (!key) return;
        var und = 1;
        try {
          if (typeof undPorCajaDeSku === "function") {
            var u = undPorCajaDeSku(l.sku);
            if (u && u > 0) und = u;
          }
        } catch (e) {}
        cajasPorSku[key] = (cajasPorSku[key] || 0) + q / und;
      });
    } else {
      peso = Number(cli.peso) || 0;
    }
    return { peso: peso, cajasPorSku: cajasPorSku };
  }

  function topeSkuLimite(key) {
    if (!estado.topesSku) return null;
    var tope = estado.topesSku.get(key);
    if (!tope) return null;
    var plant = plantillaActiva();
    var limite = null;
    if (plant === "P" && tope.topeP != null && Number(tope.topeP) > 0) limite = Number(tope.topeP);
    else if (plant === "G" && tope.topeG != null && Number(tope.topeG) > 0) limite = Number(tope.topeG);
    else if (tope.tope != null && Number(tope.tope) > 0) limite = Number(tope.tope);
    return limite;
  }

  function cabeCliente(cliData, accPeso, accSku, nParadas) {
    if (nParadas >= MAX_CLIENTES) return { ok: false, reason: "max_clientes" };
    if (accPeso + cliData.peso > kgMax() + 1e-6) return { ok: false, reason: "peso" };
    var keys = Object.keys(cliData.cajasPorSku);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var lim = topeSkuLimite(k);
      if (lim == null || !(lim > 0)) continue;
      var next = (accSku[k] || 0) + cliData.cajasPorSku[k];
      if (next > lim + 1e-9) return { ok: false, reason: "sku:" + k };
    }
    return { ok: true };
  }

  function clientesDisponibles() {
    var list = (estado.clientesHoy || []).slice();
    var enViaje = {};
    (estado.viajeActual || []).forEach(function (p) { enViaje[p.idCliente] = true; });
    (estado.viajesGuardados || []).forEach(function (v) {
      (v.paradas || []).forEach(function (p) { enViaje[p.idCliente] = true; });
    });
    return list.filter(function (c) {
      if (!c || c.lat == null || c.lon == null) return false;
      if (enViaje[c.idCliente]) return false;
      if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(c.idCliente)) return false;
      if (typeof clienteTieneLineasPendientes === "function" && !clienteTieneLineasPendientes(c.idCliente)) return false;
      var d = pesoYSkusCliente(c);
      if (!(d.peso > 0) && Object.keys(d.cajasPorSku).length === 0) {
        if (!(Number(c.peso) > 0)) return false;
      }
      return true;
    });
  }

  function ordenarLogico(cands, origen) {
    var scored = cands.map(function (c) {
      return {
        cli: c,
        br: bearingDeg(origen, c),
        d: distKmSafe(origen, c),
        sector: Math.floor(bearingDeg(origen, c) / 45)
      };
    });
    var sectorCount = {};
    scored.forEach(function (s) {
      sectorCount[s.sector] = (sectorCount[s.sector] || 0) + 1;
    });
    var bestSector = 0, bestN = -1;
    Object.keys(sectorCount).forEach(function (k) {
      if (sectorCount[k] > bestN) { bestN = sectorCount[k]; bestSector = Number(k); }
    });
    var pending = scored.map(function (s) { return s.cli; });
    var ordered = [];
    var cur = origen;
    while (pending.length) {
      var bestI = 0, bestD = 1e18;
      for (var i = 0; i < pending.length; i++) {
        var d = distKmSafe(cur, pending[i]);
        var br = bearingDeg(origen, pending[i]);
        var sec = Math.floor(br / 45);
        if (ordered.length < 4 && sec !== bestSector) d += 15;
        if (d < bestD) { bestD = d; bestI = i; }
      }
      var next = pending.splice(bestI, 1)[0];
      ordered.push(next);
      cur = next;
    }
    return ordered;
  }

  function aplicarClienteAlAcumulado(cliData, accPeso, accSku) {
    accPeso += cliData.peso;
    Object.keys(cliData.cajasPorSku).forEach(function (k) {
      accSku[k] = (accSku[k] || 0) + cliData.cajasPorSku[k];
    });
    return accPeso;
  }

  function mostrarRestantes(restantes, meta) {
    var box = document.getElementById("rutalogRestantesPlan");
    if (!box) {
      box = document.createElement("div");
      box.id = "rutalogRestantesPlan";
      box.style.cssText = "margin:10px 0;padding:10px 12px;border:1px solid var(--border,#1f1f1f);border-radius:10px;background:rgba(255,255,255,.03);font-size:12.5px;max-height:180px;overflow:auto;";
      var anchor = document.getElementById("listaViajeActual");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
      else {
        var side = document.querySelector(".side-panel");
        if (side) side.appendChild(box);
      }
    }
    if (!restantes.length) {
      box.innerHTML = '<div style="color:#a3a3a3">No quedan clientes disponibles para otro viaje.</div>';
      return;
    }
    var kg = kgMax();
    var plant = plantillaActiva() === "P" ? "Camión P (" + kg + " kg)" : "Camión G (" + kg + " kg)";
    var rows = restantes.slice(0, 40).map(function (c) {
      var d = pesoYSkusCliente(c);
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04)">' +
        '<span>' + (c.nombre || c.idCliente) + (c.ciudad ? ' · ' + c.ciudad : '') + '</span>' +
        '<span class="mono" style="opacity:.85">' + (d.peso || 0).toFixed(1) + ' kg</span></div>';
    }).join("");
    box.innerHTML =
      '<div style="font-weight:600;margin-bottom:6px">Restantes: ' + restantes.length +
      ' · ' + plant + (meta ? ' · ' + meta : '') + '</div>' + rows +
      (restantes.length > 40 ? '<div style="opacity:.7;margin-top:4px">… y ' + (restantes.length - 40) + ' más</div>' : '');
  }

  function ensureUI() {
    if (document.getElementById("btnGenerarViaje")) return;
    var style = document.createElement("style");
    style.id = "rutalog-plan-css";
    style.textContent =
      "#btnGenerarViaje{width:100%;margin-top:6px}" +
      "#rutalogPlanCamion{display:flex;gap:6px;margin-top:8px;align-items:center;font-size:12px}" +
      "#rutalogPlanCamion select{flex:1;padding:6px 8px;border-radius:8px;border:1px solid #1f1f1f;background:#0f0f0f;color:#fafafa}";
    document.head.appendChild(style);

    var host = null;
    var opt = document.getElementById("btnOptimizarRuta");
    if (opt && opt.parentNode) host = opt.parentNode;
    if (!host) {
      var g = document.getElementById("btnGuardarViaje");
      if (g && g.parentNode) host = g.parentNode;
    }
    if (!host) return;

    var row = document.createElement("div");
    row.id = "rutalogPlanCamion";
    row.innerHTML =
      '<label for="selPlanCamion">Camión</label>' +
      '<select id="selPlanCamion">' +
      '<option value="G">Grande · 12000 kg</option>' +
      '<option value="P">Pequeño · 3800 kg</option>' +
      "</select>";
    host.appendChild(row);

    var sel = document.getElementById("selPlanCamion");
    if (sel) {
      sel.value = plantillaActiva() === "P" ? "P" : "G";
      sel.onchange = function () {
        try { estado.plantillaCamion = sel.value; } catch (e) {}
      };
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btnGenerarViaje";
    btn.className = "btn btn-primary btn-sm";
    btn.textContent = "Generar viaje";
    btn.onclick = function () { generarViaje(); };
    host.appendChild(btn);
  }

  function generarViaje() {
    if (!estado) { toastSafe("App no lista"); return; }
    var sel = document.getElementById("selPlanCamion");
    if (sel) estado.plantillaCamion = sel.value;

    if (!estado.origenActual || estado.origenActual.lat == null) {
      toastSafe("Selecciona primero el centro (origen) del viaje");
      try {
        if (typeof abrirSelectorCentro === "function") abrirSelectorCentro({ forzar: true });
      } catch (e) {}
      return;
    }

    estado.viajeActual = [];

    var origen = estado.origenActual;
    var cands = clientesDisponibles();
    if (!cands.length) {
      mostrarRestantes([]);
      toastSafe("No hay clientes disponibles");
      return;
    }

    var ordered = ordenarLogico(cands, origen);
    var elegidos = [];
    var accPeso = 0;
    var accSku = {};

    for (var i = 0; i < ordered.length; i++) {
      var cli = ordered[i];
      var data = pesoYSkusCliente(cli);
      if (!(data.peso > 0) && Number(cli.peso) > 0) data.peso = Number(cli.peso);
      var check = cabeCliente(data, accPeso, accSku, elegidos.length);
      if (!check.ok) continue;
      elegidos.push(cli);
      accPeso = aplicarClienteAlAcumulado(data, accPeso, accSku);
      if (elegidos.length >= MAX_CLIENTES) break;
    }

    elegidos.forEach(function (cli) {
      try {
        if (typeof agregarParada === "function") agregarParada(cli);
        else {
          var copy = Object.assign({}, cli);
          var d = pesoYSkusCliente(cli);
          copy.peso = d.peso;
          estado.viajeActual.push(copy);
        }
      } catch (e) { console.warn("[plan] agregarParada", e); }
    });

    if (typeof refrescarRutaUI === "function") refrescarRutaUI();
    if (typeof renderMapas === "function") renderMapas();

    var restantes = clientesDisponibles();
    var meta = elegidos.length + " paradas · " + accPeso.toFixed(1) + " kg / " + kgMax() + " kg";
    mostrarRestantes(restantes, meta);

    if (!elegidos.length) {
      toastSafe("Ningún cliente cabe con las reglas actuales (peso / SKU / 10 máx.)");
    } else {
      toastSafe("Viaje generado: " + elegidos.length + " clientes · " + accPeso.toFixed(1) + " kg · Restan " + restantes.length);
      dibujarRutaOSRM();
    }
  }

  function puntosRutaActual() {
    var pts = [];
    if (estado.origenActual && estado.origenActual.lat != null) {
      pts.push([estado.origenActual.lat, estado.origenActual.lon]);
    }
    (estado.viajeActual || []).forEach(function (p) {
      if (p.lat != null && p.lon != null) pts.push([p.lat, p.lon]);
    });
    return pts;
  }

  function clearOsrmLayer() {
    try {
      if (osrmLayer && estado.mapRutas) estado.mapRutas.removeLayer(osrmLayer);
    } catch (e) {}
    osrmLayer = null;
  }

  function dibujarRutaOSRM() {
    var map = estado && estado.mapRutas;
    if (!map || typeof L === "undefined") return;
    var pts = puntosRutaActual();
    if (pts.length < 2) { clearOsrmLayer(); return; }

    var seq = ++osrmSeq;
    var coordStr = pts.map(function (p) { return p[1] + "," + p[0]; }).join(";");
    var url = OSRM_BASE + coordStr + "?overview=full&geometries=geojson";

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (seq !== osrmSeq) return;
        clearOsrmLayer();
        try {
          if (estado.polyActual && estado.mapRutas) {
            estado.mapRutas.removeLayer(estado.polyActual);
            estado.polyActual = null;
          }
        } catch (e) {}

        if (!data || data.code !== "Ok" || !data.routes || !data.routes[0]) {
          osrmLayer = L.polyline(pts, { color: "#f59e0b", weight: 3, dashArray: "6,6", opacity: 0.9 }).addTo(map);
          toastSafe("OSRM no disponible · mostrando línea recta");
          return;
        }
        var coords = data.routes[0].geometry.coordinates.map(function (c) {
          return [c[1], c[0]];
        });
        osrmLayer = L.polyline(coords, { color: "#38bdf8", weight: 4, opacity: 0.95 }).addTo(map);
        try { map.fitBounds(osrmLayer.getBounds(), { padding: [40, 40] }); } catch (e) {}
      })
      .catch(function () {
        if (seq !== osrmSeq) return;
        clearOsrmLayer();
        try {
          if (estado.polyActual && estado.mapRutas) {
            estado.mapRutas.removeLayer(estado.polyActual);
            estado.polyActual = null;
          }
        } catch (e) {}
        osrmLayer = L.polyline(pts, { color: "#f59e0b", weight: 3, dashArray: "6,6", opacity: 0.9 }).addTo(map);
      });
  }

  function hookRenderMapas() {
    if (typeof renderMapas !== "function" || renderMapas.__planHook) return;
    var prev = renderMapas;
    window.renderMapas = function () {
      var r = prev.apply(this, arguments);
      try {
        if (estado && estado.viajeActual && estado.viajeActual.length) {
          if (osrmLayer) dibujarRutaOSRM();
        } else clearOsrmLayer();
      } catch (e) {}
      return r;
    };
    window.renderMapas.__planHook = true;
  }

  function boot() {
    ensureUI();
    hookRenderMapas();
    var n = 0;
    var t = setInterval(function () {
      ensureUI();
      n++;
      if (n > 20 || document.getElementById("btnGenerarViaje")) clearInterval(t);
    }, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.rutalogGenerarViaje = generarViaje;
  window.rutalogDibujarOSRM = dibujarRutaOSRM;
  console.info("[RUTALOG] planificacion + OSRM listo");
})();
