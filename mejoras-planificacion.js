/* mejoras-planificacion.js v3 — Generar viaje: zonas ligadas + peso/SKU/10 + OSRM al clic */
(function () {
  if (window.__rutalogPlanificacionV3) return;
  window.__rutalogPlanificacionV3 = true;

  var MAX_CLIENTES = 10;
  var KG_G = 12000;
  var KG_P = 3800;
  var OSRM_BASE = "https://router.project-osrm.org/route/v1/driving/";
  var osrmLayer = null;
  var osrmSeq = 0;

  var ZONAS_LIGADAS = [
    ["santiago", "tamboril", "valverde", "tavera", "mao", "esperanza"],
    ["puerto plata", "sosua", "cabarete"],
    ["espaillat", "moca", "gaspar hernandez", "jose contreras"],
    ["hermanas mirabal", "salcedo", "tenares", "villa tapia"],
    ["dajabon", "santiago rodriguez", "moncion"],
    ["montecristi", "dajabon"],
    ["san francisco de macoris", "san francisco", "cenovi", "villa arriba", "nagua", "arenoso"],
    ["maria trinidad sanchez", "samana", "las terrenas", "sanchez"],
    ["piedra blanca", "bonao", "maimon", "monsenor nouel", "monsenor"],
    ["monsenor nouel", "san jose de ocoa", "ocoa"],
    ["la vega", "vega", "jarabacoa", "constanza", "jatubey"],
    ["cotui", "sanchez ramirez", "fantino", "cevicos"],
    ["santo domingo", "distrito nacional", "santo domingo este", "santo domingo norte", "santo domingo oeste", "sdn", "sde", "sdo"],
    ["san cristobal", "bajos de haina", "haina", "villa altagracia"],
    ["yamasa", "monte plata", "bayaguana", "sabana grande de boya"],
    ["villa mella", "distrito nacional", "santo domingo este"],
    ["bani", "peravia", "san jose de ocoa", "ocoa"],
    ["azua", "padre las casas", "las yayas", "las charcas", "bani"],
    ["bahoruco", "independencia", "vicente noble", "duverge", "neiba"],
    ["elias pina", "san juan", "san juan de la maguana", "el cercado"],
    ["barahona", "pedernales", "enriquillo", "cabral"],
    ["comendador", "elias pina"],
    ["la romana", "higuey", "salvaleon de higuey"],
    ["higuey", "bavaro", "punta cana", "veron"],
    ["san pedro de macoris", "san pedro", "la romana"],
    ["san pedro de macoris", "hato mayor", "hato mayor del rey"],
    ["hato mayor", "miches", "el seibo", "santa cruz de el seibo"]
  ];

  function toastSafe(msg) {
    try {
      if (typeof toast === "function") toast(msg);
      else console.info("[plan]", msg);
    } catch (e) {}
  }

  function normCiudad(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function zonasDeCiudad(ciudad) {
    var n = normCiudad(ciudad);
    if (!n) return [];
    var out = [];
    for (var i = 0; i < ZONAS_LIGADAS.length; i++) {
      var g = ZONAS_LIGADAS[i];
      for (var j = 0; j < g.length; j++) {
        if (n === g[j] || n.indexOf(g[j]) >= 0 || g[j].indexOf(n) >= 0) {
          out.push(i);
          break;
        }
      }
    }
    return out;
  }

  function compartenZona(c1, c2) {
    var a = zonasDeCiudad(c1);
    var b = zonasDeCiudad(c2);
    if (!a.length || !b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) >= 0) return true;
    }
    return false;
  }

  function plantillaActiva() {
    try {
      return (typeof estado !== "undefined" && estado && estado.plantillaCamion) || "G";
    } catch (e) {
      return "G";
    }
  }

  function kgMax() {
    return plantillaActiva() === "P" ? KG_P : KG_G;
  }

  function distKmSafe(a, b) {
    try {
      if (typeof distKm === "function") return distKm(a, b);
    } catch (e) {}
    if (!a || !b || a.lat == null || b.lat == null) return 1e9;
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    var la1 = a.lat * toR, la2 = b.lat * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function pesoYSkusCliente(cli) {
    var id = cli.idCliente;
    var pend = [];
    try {
      pend = (estado.lineasPendientes && estado.lineasPendientes.get(id)) || [];
    } catch (e) {}
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
        } catch (e2) {}
        cajasPorSku[key] = (cajasPorSku[key] || 0) + q / und;
      });
    } else {
      peso = Number(cli.peso) || 0;
    }
    return { peso: peso, cajasPorSku: cajasPorSku };
  }

  function topeSkuLimite(key) {
    try {
      if (!estado.topesSku) return null;
      var tope = estado.topesSku.get(key);
      if (!tope) return null;
      var plant = plantillaActiva();
      if (plant === "P" && tope.topeP != null && Number(tope.topeP) > 0) return Number(tope.topeP);
      if (plant === "G" && tope.topeG != null && Number(tope.topeG) > 0) return Number(tope.topeG);
      if (tope.tope != null && Number(tope.tope) > 0) return Number(tope.tope);
    } catch (e) {}
    return null;
  }

  function cabeCliente(cliData, accPeso, accSku, nParadas) {
    if (nParadas >= MAX_CLIENTES) return { ok: false, reason: "max_clientes" };
    if (accPeso + cliData.peso > kgMax() + 1e-6) return { ok: false, reason: "peso" };
    var keys = Object.keys(cliData.cajasPorSku);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var lim = topeSkuLimite(k);
      if (lim == null || !(lim > 0)) continue;
      if ((accSku[k] || 0) + cliData.cajasPorSku[k] > lim + 1e-9) return { ok: false, reason: "sku:" + k };
    }
    return { ok: true };
  }

  function clientesDisponibles() {
    if (typeof estado === "undefined" || !estado) return [];
    var list = (estado.clientesHoy || []).slice();
    var enViaje = {};
    (estado.viajeActual || []).forEach(function (p) { enViaje[p.idCliente] = true; });
    (estado.viajesGuardados || []).forEach(function (v) {
      (v.paradas || []).forEach(function (p) { enViaje[p.idCliente] = true; });
    });
    return list.filter(function (c) {
      if (!c || c.lat == null || c.lon == null) return false;
      if (enViaje[c.idCliente]) return false;
      try {
        if (typeof clienteCompletamenteAsignado === "function" && clienteCompletamenteAsignado(c.idCliente)) return false;
        if (typeof clienteTieneLineasPendientes === "function" && !clienteTieneLineasPendientes(c.idCliente)) return false;
      } catch (e) {}
      var d = pesoYSkusCliente(c);
      if (!(d.peso > 0) && Object.keys(d.cajasPorSku).length === 0 && !(Number(c.peso) > 0)) return false;
      return true;
    });
  }

  function ordenarLogico(cands, origen) {
    if (!cands.length) return [];
    var ordered = [];
    var pending = cands.slice();
    var bestI = 0, bestD = 1e18, i;
    for (i = 0; i < pending.length; i++) {
      var d0 = distKmSafe(origen, pending[i]);
      if (d0 < bestD) { bestD = d0; bestI = i; }
    }
    var first = pending.splice(bestI, 1)[0];
    ordered.push(first);
    var zonaAncla = first.ciudad || "";
    var cur = first;
    while (pending.length) {
      bestI = 0;
      bestD = 1e18;
      for (i = 0; i < pending.length; i++) {
        var d = distKmSafe(cur, pending[i]);
        if (compartenZona(zonaAncla, pending[i].ciudad)) d *= 0.35;
        else if (ordered.length >= 2) {
          if (compartenZona(cur.ciudad, pending[i].ciudad)) d *= 0.55;
          else d += 8;
        }
        if (d < bestD) { bestD = d; bestI = i; }
      }
      var next = pending.splice(bestI, 1)[0];
      ordered.push(next);
      cur = next;
      if (!zonasDeCiudad(zonaAncla).length && next.ciudad) zonaAncla = next.ciudad;
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
        "<span>" + (c.nombre || c.idCliente) + (c.ciudad ? " · " + c.ciudad : "") + "</span>" +
        '<span class="mono" style="opacity:.85">' + (d.peso || 0).toFixed(1) + " kg</span></div>";
    }).join("");
    box.innerHTML =
      '<div style="font-weight:600;margin-bottom:6px">Restantes: ' + restantes.length +
      " · " + plant + (meta ? " · " + meta : "") + "</div>" + rows +
      (restantes.length > 40 ? '<div style="opacity:.7;margin-top:4px">… y ' + (restantes.length - 40) + " más</div>" : "");
  }

  function clearOsrmLayer() {
    try {
      if (osrmLayer && estado && estado.mapRutas) estado.mapRutas.removeLayer(osrmLayer);
    } catch (e) {}
    osrmLayer = null;
  }

  function reiniciarViajePlan() {
    try {
      if (typeof estado !== "undefined" && estado) estado.viajeActual = [];
      clearOsrmLayer();
      try {
        if (estado && estado.polyActual && estado.mapRutas) {
          estado.mapRutas.removeLayer(estado.polyActual);
          estado.polyActual = null;
        }
      } catch (e) {}
      var box = document.getElementById("rutalogRestantesPlan");
      if (box) box.innerHTML = "";
      if (typeof refrescarRutaUI === "function") refrescarRutaUI();
      if (typeof renderMapas === "function") renderMapas();
      toastSafe("Viaje reiniciado");
    } catch (e) {
      console.warn("[plan] reiniciar", e);
    }
  }

  function ensureUI() {
    try {
      if (document.getElementById("btnGenerarViaje")) {
        hookReiniciar();
        return true;
      }
      if (!document.getElementById("rutalog-plan-css")) {
        var style = document.createElement("style");
        style.id = "rutalog-plan-css";
        style.textContent =
          "#btnGenerarViaje{width:100%;margin:6px 0 8px;}" +
          "#rutalogPlanCamion{display:flex;gap:6px;margin:8px 0 4px;align-items:center;font-size:12px;}" +
          "#rutalogPlanCamion select{flex:1;padding:6px 8px;border-radius:8px;border:1px solid #1f1f1f;background:#0f0f0f;color:#fafafa;}";
        (document.head || document.documentElement).appendChild(style);
      }
      var opt = document.getElementById("btnOptimizarRuta");
      var guardar = document.getElementById("btnGuardarViaje");
      if (!opt && !guardar) return false;
      var row = document.createElement("div");
      row.id = "rutalogPlanCamion";
      row.innerHTML =
        '<label for="selPlanCamion">Camión</label>' +
        '<select id="selPlanCamion">' +
        '<option value="G">Grande · 12000 kg</option>' +
        '<option value="P">Pequeño · 3800 kg</option>' +
        "</select>";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.id = "btnGenerarViaje";
      btn.className = "btn btn-primary";
      btn.textContent = "Generar viaje";
      btn.onclick = function (ev) {
        if (ev) ev.preventDefault();
        generarViaje();
      };
      if (opt) {
        opt.insertAdjacentElement("afterend", row);
        row.insertAdjacentElement("afterend", btn);
      } else {
        guardar.insertAdjacentElement("beforebegin", row);
        row.insertAdjacentElement("afterend", btn);
      }
      var sel = document.getElementById("selPlanCamion");
      if (sel) {
        sel.value = plantillaActiva() === "P" ? "P" : "G";
        sel.onchange = function () {
          try {
            if (typeof estado !== "undefined" && estado) estado.plantillaCamion = sel.value;
          } catch (e) {}
        };
      }
      hookReiniciar();
      console.info("[RUTALOG] Generar viaje v3 (zonas) listo");
      return true;
    } catch (err) {
      console.warn("[RUTALOG] ensureUI plan", err);
      return false;
    }
  }

  function hookReiniciar() {
    var btn = document.getElementById("btnReiniciar");
    if (!btn || btn.__planReinicio) return;
    btn.__planReinicio = true;
    btn.addEventListener("click", function () {
      setTimeout(function () {
        clearOsrmLayer();
        var box = document.getElementById("rutalogRestantesPlan");
        if (box) box.innerHTML = "";
      }, 50);
    });
  }

  function generarViaje() {
    try {
      if (typeof estado === "undefined" || !estado) {
        toastSafe("App no lista");
        return;
      }
      var sel = document.getElementById("selPlanCamion");
      if (sel) estado.plantillaCamion = sel.value;
      if (!estado.origenActual || estado.origenActual.lat == null) {
        toastSafe("Selecciona primero el centro (origen) del viaje");
        try {
          if (typeof abrirSelectorCentro === "function") abrirSelectorCentro({ forzar: true });
        } catch (e) {}
        return;
      }
      if (!(estado.clientesHoy && estado.clientesHoy.length)) {
        toastSafe("No hay clientes en el mapa. Carga el Excel del día primero.");
        return;
      }
      clearOsrmLayer();
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
      var zonaRef = "";
      for (var i = 0; i < ordered.length; i++) {
        var cli = ordered[i];
        var data = pesoYSkusCliente(cli);
        if (!(data.peso > 0) && Number(cli.peso) > 0) data.peso = Number(cli.peso);
        var check = cabeCliente(data, accPeso, accSku, elegidos.length);
        if (!check.ok) continue;
        if (!zonaRef && cli.ciudad) zonaRef = cli.ciudad;
        elegidos.push(cli);
        accPeso = aplicarClienteAlAcumulado(data, accPeso, accSku);
        if (elegidos.length >= MAX_CLIENTES) break;
      }
      elegidos.forEach(function (cli) {
        try {
          if (typeof agregarParada === "function") agregarParada(cli);
          else {
            var copy = Object.assign({}, cli);
            copy.peso = pesoYSkusCliente(cli).peso;
            estado.viajeActual.push(copy);
          }
        } catch (e) {
          console.warn("[plan] agregarParada", e);
        }
      });
      if (typeof refrescarRutaUI === "function") refrescarRutaUI();
      if (typeof renderMapas === "function") renderMapas();
      var restantes = clientesDisponibles();
      var meta = elegidos.length + " paradas · " + accPeso.toFixed(1) + " kg / " + kgMax() + " kg";
      if (zonaRef) meta += " · zona ~ " + zonaRef;
      mostrarRestantes(restantes, meta);
      if (!elegidos.length) {
        toastSafe("Ningún cliente cabe (peso / SKU / máx. 10)");
      } else {
        toastSafe("Viaje generado: " + elegidos.length + " · " + accPeso.toFixed(1) + " kg · Restan " + restantes.length);
        dibujarRutaOSRM();
      }
    } catch (err) {
      console.error("[plan] generarViaje", err);
      toastSafe("Error al generar viaje");
    }
  }

  function puntosRutaActual() {
    var pts = [];
    try {
      if (estado.origenActual && estado.origenActual.lat != null) {
        pts.push([estado.origenActual.lat, estado.origenActual.lon]);
      }
      (estado.viajeActual || []).forEach(function (p) {
        if (p.lat != null && p.lon != null) pts.push([p.lat, p.lon]);
      });
    } catch (e) {}
    return pts;
  }

  function dibujarRutaOSRM() {
    try {
      var map = estado && estado.mapRutas;
      if (!map || typeof L === "undefined") return;
      var pts = puntosRutaActual();
      if (pts.length < 2) {
        clearOsrmLayer();
        return;
      }
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
            return;
          }
          var coords = data.routes[0].geometry.coordinates.map(function (c) {
            return [c[1], c[0]];
          });
          osrmLayer = L.polyline(coords, { color: "#38bdf8", weight: 4, opacity: 0.95 }).addTo(map);
          try { map.fitBounds(osrmLayer.getBounds(), { padding: [40, 40] }); } catch (e2) {}
        })
        .catch(function () {
          if (seq !== osrmSeq) return;
          clearOsrmLayer();
          osrmLayer = L.polyline(pts, { color: "#f59e0b", weight: 3, dashArray: "6,6", opacity: 0.9 }).addTo(map);
        });
    } catch (err) {
      console.warn("[plan] OSRM", err);
    }
  }

  function boot() {
    try { ensureUI(); } catch (e) {}
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (ensureUI() || n > 60) clearInterval(t);
    }, 500);
    try {
      if (typeof MutationObserver !== "undefined") {
        var mo = new MutationObserver(function () {
          if (ensureUI()) mo.disconnect();
        });
        mo.observe(document.body, { childList: true, subtree: true });
        setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 30000);
      }
    } catch (e2) {}
  }

  window.rutalogGenerarViaje = generarViaje;
  window.rutalogReiniciarViaje = reiniciarViajePlan;
  window.rutalogDibujarOSRM = dibujarRutaOSRM;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  console.info("[RUTALOG] planificacion v3 zonas + reinicio");
})();
