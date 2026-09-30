/* RUTALOG mejoras-correcciones.js
 * A) Escape HTML en popups/tablas
 * B) Tabla fija de clientes/OV sin coordenadas
 * C) Peso/cantidad con signo (no Math.abs ciego)
 * D) Estado OV "Mixta" si las líneas difieren
 * E) alias() registra columna y avisa si no fue exacta
 * No toca localStorage ni payload de sync.
 */
(function () {
  "use strict";
  if (window.__rutalogCorrecciones) return;
  window.__rutalogCorrecciones = true;

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window._aliasLastMatch = window._aliasLastMatch || {};
  var _aliasWarned = {};

  function aliasPatched(row, keys) {
    var norm = function (s) {
      return String(s || "").trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
    };
    var ks = Object.keys(row || {});
    var fieldKey = Array.isArray(keys) ? keys[0] : String(keys);
    var i, j, target, nk;
    for (i = 0; i < keys.length; i++) {
      target = norm(keys[i]);
      for (j = 0; j < ks.length; j++) {
        if (norm(ks[j]) === target && row[ks[j]] != null && row[ks[j]] !== "") {
          window._aliasLastMatch[fieldKey] = { column: ks[j], match: "exact", keyTried: keys[i] };
          return row[ks[j]];
        }
      }
    }
    for (i = 0; i < keys.length; i++) {
      target = norm(keys[i]);
      for (j = 0; j < ks.length; j++) {
        nk = norm(ks[j]);
        if ((nk.indexOf(target) !== -1 || target.indexOf(nk) !== -1) && row[ks[j]] != null && row[ks[j]] !== "") {
          window._aliasLastMatch[fieldKey] = { column: ks[j], match: "partial", keyTried: keys[i] };
          var warnKey = fieldKey + "|" + ks[j];
          if (!_aliasWarned[warnKey]) {
            _aliasWarned[warnKey] = true;
            try {
              console.warn("[RUTALOG] alias parcial: campo «" + fieldKey + "» → columna «" + ks[j] + "» (buscaba «" + keys[i] + "»)");
            } catch (e) {}
          }
          return row[ks[j]];
        }
      }
    }
    window._aliasLastMatch[fieldKey] = { column: null, match: "none", keyTried: null };
    return null;
  }

  if (typeof alias === "function") window.alias = aliasPatched;

  function popupHtmlSafe(cli) {
    var cita = estado.citas.get(cli.idCliente);
    var citaTxt = cita ? "Sí (" + escHtml(cita.fecha) + ")" : "No";
    return '<div class="popup-t">' + escHtml(cli.nombre) + "</div>" +
      '<div class="popup-l">ID: ' + escHtml(cli.idCliente) + "</div>" +
      '<div class="popup-l">OV: ' + escHtml(cli.ovTexto || "—") + "</div>" +
      '<div class="popup-l">Peso: ' + (cli.peso || 0).toFixed(1) + " kg · " + escHtml(cli.estadoDoc || "") + "</div>" +
      '<div class="popup-l">Localidad: ' + escHtml(cli.localidad || "—") + "</div>" +
      '<div class="popup-l">Ciudad: ' + escHtml(cli.ciudad || "—") + "</div>" +
      (cli.condicion ? '<div class="popup-l">Condición: ' + escHtml(cli.condicion) + "</div>" : "") +
      '<div class="popup-l">Cita: ' + citaTxt + "</div>" +
      '<div class="popup-a">Clic para agregar al viaje actual</div>';
  }
  if (typeof popupHtml === "function") window.popupHtml = popupHtmlSafe;

  function renderDespachosSafe() {
    var tb = document.getElementById("tbodyDespachos");
    if (!tb) return;
    if (!estado.viajesGuardados || !estado.viajesGuardados.length) {
      tb.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--muted);padding:24px;">Guarda viajes desde el Mapa de rutas.</td></tr>';
      return;
    }
    var ovViajes = new Map();
    estado.viajesGuardados.forEach(function (v) {
      (v.paradas || []).forEach(function (p) {
        var listaOV = p.ovs && p.ovs.length ? p.ovs : (p.ovTexto || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).map(function (ov, i, arr) {
          return { ov: ov, peso: arr.length ? (p.peso || 0) / arr.length : p.peso || 0 };
        });
        listaOV.forEach(function (item) {
          var k = String(item.ov || "").trim();
          if (!k) return;
          if (!ovViajes.has(k)) ovViajes.set(k, new Set());
          ovViajes.get(k).add(v.nombre || v.num || "");
        });
      });
    });
    var html = "";
    estado.viajesGuardados.forEach(function (v) {
      var numParada = 0;
      (v.paradas || []).forEach(function (p) {
        numParada++;
        var cita = estado.citas.get(p.idCliente);
        var listaOV = p.ovs && p.ovs.length ? p.ovs : (p.ovTexto || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).map(function (ov, i, arr) {
          return { ov: ov, peso: arr.length ? (p.peso || 0) / arr.length : p.peso || 0 };
        });
        if (!listaOV.length) listaOV.push({ ov: "", peso: p.peso || 0 });
        listaOV.forEach(function (item) {
          var ovKey = String(item.ov || "").trim();
          var parcial = ovViajes.get(ovKey) && ovViajes.get(ovKey).size > 1;
          if (!parcial && p.lineas && p.lineas.length) {
            var delOV = p.lineas.filter(function (l) { return String(l.ov || "").trim() === ovKey; });
            parcial = delOV.some(function (l) {
              return l.cantidadOriginal != null && Number(l.cantidad) < Number(l.cantidadOriginal) - 1e-9;
            });
          }
          var badge = parcial ? ' <span class="badge" style="background:var(--warn-bg);color:var(--warn-text);">Parcial</span>' : "";
          var cam = v.camion || (v.plantilla ? "CAMION " + v.plantilla : "");
          html += '<tr style="border-left:3px solid ' + escHtml(v.color || "#888") + '">' +
            "<td>" + escHtml(v.nombre) + (cam ? '<div style="font-size:10px;color:var(--muted)">' + escHtml(cam) + "</div>" : "") +
            '</td><td class="mono">' + numParada +
            '</td><td class="mono">' + escHtml(p.idCliente) +
            '</td><td title="' + escHtml(p.nombre) + '">' + escHtml(p.nombre) +
            "</td><td>" + escHtml(item.ov || "") + badge +
            '</td><td class="mono">' + (item.peso || 0).toFixed(1) +
            '</td><td title="' + escHtml(p.condicion || "") + '">' + escHtml(p.condicion || "") +
            "</td><td>" + escHtml(p.localidad || "") +
            "</td><td>" + escHtml(p.ciudad || "") +
            "</td><td>" + (cita ? escHtml(cita.fecha) : "—") + "</td></tr>";
        });
      });
    });
    tb.innerHTML = html;
  }
  if (typeof renderDespachos === "function") window.renderDespachos = renderDespachosSafe;

  function renderCitasSafe() {
    var cont = document.getElementById("listaCitas");
    if (!cont) return;
    if (!estado.citas.size) {
      cont.innerHTML = '<div class="vacio">Sin fechas de cita todavía.</div>';
      return;
    }
    var html = "";
    estado.citas.forEach(function (v, id) {
      var m = estado.maestro.get(id);
      html += '<div class="cita-item"><div><strong class="mono">' + escHtml(id) + "</strong> " +
        escHtml(m ? m.nombre : "") +
        '<div style="font-size:12px;color:var(--muted);">' + escHtml(v.fecha) +
        (v.ov ? " · OV " + escHtml(v.ov) : "") +
        '</div></div><button data-id="' + escHtml(id) + '" class="del-cita">✕</button></div>';
    });
    cont.innerHTML = html;
    cont.querySelectorAll(".del-cita").forEach(function (b) {
      b.onclick = function () {
        estado.citas.delete(b.dataset.id);
        if (typeof saveCitas === "function") saveCitas();
        renderCitasSafe();
        if (typeof renderMapas === "function") renderMapas();
      };
    });
  }
  if (typeof renderCitas === "function") window.renderCitas = renderCitasSafe;

  function ensureSinPuntoPanel() {
    var panel = document.getElementById("panelSinPunto");
    if (panel) return panel;
    var page = document.getElementById("page-panel");
    if (!page) return null;
    panel = document.createElement("div");
    panel.id = "panelSinPunto";
    panel.className = "card";
    panel.style.cssText = "margin-top:12px;display:none;";
    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<h3 style="margin:0;font-size:14px;">Clientes / OV sin coordenadas o sin maestro</h3>' +
      '<span class="badge" id="badgeSinPunto">0</span></div>' +
      '<p style="font-size:12px;color:var(--muted);margin:0 0 8px;">No aparecen en el mapa. Revisa el maestro o las coordenadas.</p>' +
      '<div class="table-wrap"><table><thead><tr>' +
      "<th>Cliente</th><th>Nombre</th><th>OV</th><th>Peso</th><th>Estado</th><th>Motivo</th>" +
      '</tr></thead><tbody id="tbodySinPunto"></tbody></table></div>';
    var mapBox = page.querySelector(".map-box");
    if (mapBox && mapBox.parentNode) mapBox.parentNode.insertBefore(panel, mapBox.nextSibling);
    else page.appendChild(panel);
    return panel;
  }

  function renderSinPunto(rows) {
    var panel = ensureSinPuntoPanel();
    if (!panel) return;
    var tb = document.getElementById("tbodySinPunto");
    var badge = document.getElementById("badgeSinPunto");
    if (!rows || !rows.length) {
      panel.style.display = "none";
      if (tb) tb.innerHTML = "";
      if (badge) badge.textContent = "0";
      return;
    }
    panel.style.display = "";
    if (badge) badge.textContent = String(rows.length);
    if (!tb) return;
    tb.innerHTML = rows.map(function (r) {
      return "<tr><td class=\"mono\">" + escHtml(r.idCliente) + "</td><td>" + escHtml(r.nombre) +
        "</td><td>" + escHtml(r.ovs) + "</td><td class=\"mono\">" + (r.peso || 0).toFixed(1) +
        "</td><td>" + escHtml(r.estado) + "</td><td style=\"font-size:12px;color:var(--muted)\">" +
        escHtml(r.motivo) + "</td></tr>";
    }).join("");
  }

  function estadoDesdeLineas(estados) {
    var set = {};
    estados.forEach(function (e) { if (e) set[e] = true; });
    var keys = Object.keys(set);
    if (!keys.length) return "Ninguno";
    if (keys.length === 1) return keys[0];
    return "Mixta";
  }

  function construirHoyPatched(filas) {
    var lineas = [];
    var lineId = 0;
    var aliasFn = typeof alias === "function" ? alias : aliasPatched;
    var AD = typeof ALIAS_DIARIO !== "undefined" ? ALIAS_DIARIO : {};

    for (var fi = 0; fi < filas.length; fi++) {
      var f = filas[fi];
      var ov = String(aliasFn(f, AD.ov) || "").trim();
      if (!ov) continue;
      var id = typeof pad9 === "function" ? pad9(aliasFn(f, AD.cliente)) : String(aliasFn(f, AD.cliente) || "").trim();
      if (!id) continue;

      var pesoRaw = typeof num === "function" ? num(aliasFn(f, AD.peso)) : parseFloat(aliasFn(f, AD.peso));
      if (pesoRaw == null || !isFinite(pesoRaw)) pesoRaw = 0;
      var cantRaw = typeof num === "function" ? num(aliasFn(f, AD.cantidad)) : parseFloat(aliasFn(f, AD.cantidad));
      if (cantRaw != null && !isFinite(cantRaw)) cantRaw = null;

      var qty;
      if (cantRaw != null && cantRaw !== 0) qty = cantRaw;
      else qty = pesoRaw < 0 ? -1 : 1;

      lineas.push({
        lineId: "L" + (++lineId),
        ov: ov,
        idCliente: id,
        nombreRaw: aliasFn(f, AD.nombre) || "",
        sku: String(aliasFn(f, AD.sku) || "").trim(),
        producto: String(aliasFn(f, AD.producto) || "").trim(),
        cantidad: qty,
        cantidadSigned: cantRaw,
        unidad: String(aliasFn(f, AD.unidad) || "CJ").trim() || "CJ",
        peso: pesoRaw,
        pesoUnit: qty ? pesoRaw / qty : pesoRaw,
        estado: typeof normEstado === "function" ? normEstado(aliasFn(f, AD.estado)) : String(aliasFn(f, AD.estado) || ""),
        alma: String(aliasFn(f, AD.alma) || "").trim(),
        ciudadExcel: String(aliasFn(f, AD.ciudad) || "").trim(),
        provinciaExcel: String(aliasFn(f, AD.provincia) || "").trim()
      });
    }
    estado.lineasRaw = lineas;

    var porOV = {};
    for (var li = 0; li < lineas.length; li++) {
      var ln = lineas[li];
      if (porOV[ln.ov]) {
        porOV[ln.ov].peso += ln.peso;
        porOV[ln.ov]._estados.push(ln.estado);
      } else {
        porOV[ln.ov] = {
          ov: ln.ov, idCliente: ln.idCliente, nombreRaw: ln.nombreRaw,
          peso: ln.peso, _estados: [ln.estado]
        };
      }
    }
    Object.keys(porOV).forEach(function (k) {
      porOV[k].estado = estadoDesdeLineas(porOV[k]._estados);
      delete porOV[k]._estados;
    });

    var porCli = {};
    Object.keys(porOV).forEach(function (ok) {
      var r = porOV[ok];
      if (!r.idCliente) return;
      if (!porCli[r.idCliente]) {
        porCli[r.idCliente] = {
          idCliente: r.idCliente, peso: 0, ovs: [], nombreRaw: r.nombreRaw, _estados: []
        };
      }
      porCli[r.idCliente].peso += r.peso;
      porCli[r.idCliente].ovs.push({ ov: r.ov, peso: r.peso, estado: r.estado });
      porCli[r.idCliente]._estados.push(r.estado);
    });
    Object.keys(porCli).forEach(function (cid) {
      porCli[cid].estado = estadoDesdeLineas(porCli[cid]._estados);
      delete porCli[cid]._estados;
    });

    function resolverMaestro(id) {
      if (!id) return null;
      var m = estado.maestro.get(id);
      if (m) return m;
      var bare = String(id).replace(/^0+/, "") || "0";
      if (estado.maestro.has(bare)) return estado.maestro.get(bare);
      var pad = typeof pad9 === "function" ? pad9(bare) : bare;
      if (estado.maestro.has(pad)) return estado.maestro.get(pad);
      return null;
    }

    estado.clientesHoy = [];
    var sinPuntoRows = [];
    Object.keys(porCli).forEach(function (cid) {
      var g = porCli[cid];
      var m = resolverMaestro(cid);
      var nombre = (m && m.nombre) || g.nombreRaw || cid;
      var lat = m && m.lat != null ? m.lat : null;
      var lon = m && m.lon != null ? m.lon : null;
      var ovTexto = g.ovs.map(function (o) { return o.ov; }).join(", ");
      if (lat == null || lon == null) {
        sinPuntoRows.push({
          idCliente: cid, nombre: nombre, ovs: ovTexto, peso: g.peso, estado: g.estado,
          motivo: !m ? "Sin maestro" : "Sin lat/lon en maestro"
        });
        return;
      }
      estado.clientesHoy.push({
        idCliente: cid, nombre: nombre, lat: lat, lon: lon, peso: g.peso,
        ovs: g.ovs, ovTexto: ovTexto, estadoDoc: g.estado,
        localidad: (m && m.localidad) || "",
        ciudad: (m && (m.ciudad || m.municipio)) || "",
        condicion: (m && m.condicion) || "",
        provincia: (m && m.provincia) || ""
      });
    });

    var pesoT = 0, conf = 0, fact = 0, ovs = 0;
    Object.keys(porOV).forEach(function (k) {
      ovs++;
      pesoT += porOV[k].peso;
      if (porOV[k].estado === "Confirmación") conf++;
      if (porOV[k].estado === "Factura") fact++;
    });
    var sOV = document.getElementById("sOV");
    var sPeso = document.getElementById("sPeso");
    var sConf = document.getElementById("sConf");
    var sFact = document.getElementById("sFact");
    var sMapa = document.getElementById("sMapa");
    if (sOV) sOV.textContent = ovs;
    if (sPeso) sPeso.textContent = pesoT.toFixed(2) + " kg";
    if (sConf) sConf.textContent = conf;
    if (sFact) sFact.textContent = fact;
    if (sMapa) sMapa.textContent = estado.clientesHoy.length;
    var b1 = document.getElementById("badgeMapaPanel");
    var b2 = document.getElementById("badgeActivos");
    if (b1) b1.textContent = estado.clientesHoy.length + " puntos";
    if (b2) b2.textContent = estado.clientesHoy.length + " puntos activos";

    var ciudades = [], seenC = {};
    estado.clientesHoy.forEach(function (c) {
      if (c.ciudad && !seenC[c.ciudad]) { seenC[c.ciudad] = true; ciudades.push(c.ciudad); }
    });
    ciudades.sort();
    var lista = document.getElementById("listaCiudades");
    if (lista) {
      var keep = [];
      if (typeof getCiudadesSeleccionadas === "function") {
        keep = getCiudadesSeleccionadas().filter(function (x) { return x !== "__TODAS__"; });
      }
      lista.innerHTML = ciudades.map(function (c) {
        var ck = keep.length ? (keep.indexOf(c) >= 0 ? "checked" : "") : "";
        return '<label class="ciu-chip"><input type="checkbox" class="chk-ciudad" value="' +
          escHtml(c) + '" ' + ck + "> " + escHtml(c) + "</label>";
      }).join("");
      var chkTodas = document.getElementById("chkTodasCiudades");
      if (chkTodas) chkTodas.checked = !keep.length;
      if (typeof bindCiudadChecks === "function") bindCiudadChecks();
      if (typeof actualizarLabelCiudad === "function") actualizarLabelCiudad();
    }

    if (estado.controlOVs && estado.controlOVs.clear) {
      estado.controlOVs.clear();
      Object.keys(porCli).forEach(function (cid) {
        estado.controlOVs.set(cid, { totalOVs: porCli[cid].ovs.length, seleccionadasOVs: new Set() });
      });
    }

    if (typeof saveDiarioEstado === "function") saveDiarioEstado();
    if (typeof renderMapas === "function") renderMapas();
    setTimeout(function () {
      try {
        if (estado.mapPanel) estado.mapPanel.invalidateSize();
        if (estado.mapRutas) estado.mapRutas.invalidateSize();
        if (typeof renderMapas === "function") renderMapas();
      } catch (e) {}
    }, 200);

    renderSinPunto(sinPuntoRows);

    var msg = estado.clientesHoy.length + " clientes en mapa · " + lineas.length + " líneas";
    if (sinPuntoRows.length) msg += " · " + sinPuntoRows.length + " sin coordenadas/maestro";
    if (typeof toast === "function") toast(msg);

    if (typeof rellenarNombresTopesDesdeDiario === "function") {
      var nNom = rellenarNombresTopesDesdeDiario();
      if (nNom > 0 && typeof toast === "function") toast(nNom + " nombre(s) de SKU rellenados desde el Excel");
    }
    setTimeout(function () {
      if (typeof abrirSelectorCentro === "function" && !estado.origenActual) {
        abrirSelectorCentro({ forzar: false });
      }
    }, 350);
  }

  if (typeof construirHoy === "function") window.construirHoy = construirHoyPatched;

  window.escHtml = escHtml;
  console.info("[RUTALOG] mejoras-correcciones A–E activas");
})();
