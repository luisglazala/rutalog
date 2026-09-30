/* RUTALOG mejoras-correcciones.js v2
 * A) Escape HTML · B) Tabla sin coords · E) alias parcial con toast
 * NO reemplaza construirHoy (parches en app-core-construirHoy.js).
 */
(function () {
  "use strict";
  if (window.__rutalogCorreccionesV2) return;
  window.__rutalogCorreccionesV2 = true;

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  window.escHtml = escHtml;

  window._aliasLastMatch = window._aliasLastMatch || {};
  window._aliasPartial = window._aliasPartial || {};
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
      if (target.length < 3) continue;
      for (j = 0; j < ks.length; j++) {
        nk = norm(ks[j]);
        if (nk.length < 3) continue;
        if ((nk.indexOf(target) !== -1 || target.indexOf(nk) !== -1) && row[ks[j]] != null && row[ks[j]] !== "") {
          window._aliasLastMatch[fieldKey] = { column: ks[j], match: "partial", keyTried: keys[i] };
          window._aliasPartial[fieldKey] = ks[j];
          var warnKey = fieldKey + "|" + ks[j];
          if (!_aliasWarned[warnKey]) {
            _aliasWarned[warnKey] = true;
            try { console.warn("[RUTALOG] alias parcial: campo «" + fieldKey + "» → columna «" + ks[j] + "»"); } catch (e) {}
          }
          return row[ks[j]];
        }
      }
    }
    window._aliasLastMatch[fieldKey] = { column: null, match: "none", keyTried: null };
    return null;
  }
  if (typeof alias === "function") window.alias = aliasPatched;

  if (typeof construirHoy === "function") {
    var _origConstruirHoy = construirHoy;
    window.construirHoy = function () {
      window._aliasPartial = {};
      _aliasWarned = {};
      var ret = _origConstruirHoy.apply(this, arguments);
      try {
        var keys = Object.keys(window._aliasPartial || {});
        if (keys.length && typeof toast === "function") {
          var parts = keys.map(function (k) { return k + "→" + window._aliasPartial[k]; });
          toast("Columnas asignadas por coincidencia aproximada: " + parts.join(", "));
        }
      } catch (e) {}
      return ret;
    };
  }

  function popupHtmlSafe(cli) {
    var cita = estado.citas.get(cli.idCliente);
    var citaTxt = cita ? "Sí (" + escHtml(cita.fecha) + ")" : "No";
    var mixtas = (cli.ovs || []).filter(function (o) { return o && o.mixta; });
    var mixtasHtml = "";
    if (mixtas.length) {
      mixtasHtml = '<div class="popup-l">OV con estados mixtos: ' +
        escHtml(mixtas.map(function (o) { return o.ov; }).join(", ")) + "</div>";
    }
    return '<div class="popup-t">' + escHtml(cli.nombre) + "</div>" +
      '<div class="popup-l">ID: ' + escHtml(cli.idCliente) + "</div>" +
      '<div class="popup-l">OV: ' + escHtml(cli.ovTexto || "—") + "</div>" +
      '<div class="popup-l">Peso: ' + (cli.peso || 0).toFixed(1) + " kg · " + escHtml(cli.estadoDoc || "") + "</div>" +
      mixtasHtml +
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
      return '<tr><td class="mono">' + escHtml(r.idCliente) + "</td><td>" + escHtml(r.nombre) +
        "</td><td>" + escHtml(r.ovs) + '</td><td class="mono">' + (r.peso || 0).toFixed(1) +
        "</td><td>" + escHtml(r.estado) + '</td><td style="font-size:12px;color:var(--muted)">' +
        escHtml(r.motivo) + "</td></tr>";
    }).join("");
  }
  window.renderSinPunto = renderSinPunto;

  console.info("[RUTALOG] mejoras-correcciones v2 (sin override de construirHoy)");
})();
