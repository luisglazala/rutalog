/* RUTALOG mejoras-citas v5 — pegar tabla + listado (sin exigir maestro) */
(function () {
  "use strict";
  if (window.__rutalogCitasV5) return;
  window.__rutalogCitasV5 = true;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }
  function toastSafe(msg) {
    try { if (typeof toast === "function") { toast(msg); return; } } catch (e) {}
    try {
      var t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#262626;color:#fff;padding:10px 16px;border-radius:8px;z-index:99999;font-size:13px;";
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2500);
    } catch (e2) { console.log("[citas]", msg); }
  }
  function normName(s) {
    return String(s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function isoDate(d) {
    if (!d || isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parseCitaFecha(raw, ref) {
    var t = String(raw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!t) return null;
    if (/ENTREGA\s*INMEDIATA|INMEDIATA|\bHOY\b/.test(t)) return isoDate(ref || new Date());
    var m = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      var yy = +m[3]; if (yy < 100) yy += 2000;
      return isoDate(new Date(yy, +m[2] - 1, +m[1]));
    }
    m = t.match(/(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\s*(\d{1,2})(?:[\/\-](\d{1,2}))?/i);
    if (m) {
      var day = +m[2], month = m[3] ? +m[3] : null;
      var base = ref || new Date();
      var mo = month != null ? month - 1 : base.getMonth();
      var cand = new Date(base.getFullYear(), mo, day);
      if (month == null && day < base.getDate() - 5) cand = new Date(base.getFullYear(), mo + 1, day);
      return isoDate(cand);
    }
    return null;
  }
  function findIdByName(nombre) {
    try {
      if (!window.estado) return null;
      var q = normName(nombre);
      if (!q) return null;
      var best = null, sc = 0;
      function score(n) {
        n = normName(n);
        if (!n) return 0;
        if (n === q) return 100;
        if (n.indexOf(q) >= 0 || q.indexOf(n) >= 0) return 80;
        return 0;
      }
      if (estado.maestro) estado.maestro.forEach(function (c) {
        var s = score(c.nombre);
        if (s > sc) { sc = s; best = c.id; }
      });
      if (sc < 80 && estado.clientesHoy) estado.clientesHoy.forEach(function (c) {
        var s = score(c.nombre);
        if (s > sc) { sc = s; best = c.idCliente; }
      });
      if (sc >= 50 && best != null) {
        var s = String(best).replace(/\D/g, "");
        while (s.length < 9) s = "0" + s;
        return s.slice(-9);
      }
    } catch (e) {}
    return null;
  }

  function splitLine(l) {
    if (l.indexOf("\t") >= 0) return l.split("\t").map(function (x) { return x.trim(); });
    if (l.indexOf("|") >= 0) return l.split("|").map(function (x) { return x.trim(); });
    if (/\s{2,}/.test(l)) return l.split(/\s{2,}/).map(function (x) { return x.trim(); });
    return [l.trim()];
  }

  function parsePasteTable(text) {
    var lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
      .map(function (l) { return l.replace(/\u00a0/g, " ").trim(); }).filter(Boolean);
    if (!lines.length) return [];
    var header = splitLine(lines[0]).map(normName);
    var hasHeader = header.some(function (h) { return /ZONA|CITA|CLIENTE|ORDEN|VENTA|NOTA|^OV$/.test(h); });
    var idx = { zona: 0, cita: 1, cliente: 2, ov: 3, nota: 4 };
    if (hasHeader) {
      idx = { zona: -1, cita: -1, cliente: -1, ov: -1, nota: -1 };
      header.forEach(function (h, i) {
        if (/ZONA/.test(h)) idx.zona = i;
        else if (/^CITA$|FECHA/.test(h)) idx.cita = i;
        else if (/CLIENTE|NOMBRE/.test(h)) idx.cliente = i;
        else if (/ORDEN|VENTA|^OV$/.test(h)) idx.ov = i;
        else if (/NOTA|OBS|COMENT/.test(h)) idx.nota = i;
      });
    }
    var start = hasHeader ? 1 : 0;
    var rows = [];
    var ref = new Date();
    for (var li = start; li < lines.length; li++) {
      var cols = splitLine(lines[li]);
      if (!cols.length) continue;
      var zona = idx.zona >= 0 ? (cols[idx.zona] || "") : "";
      var citaRaw = idx.cita >= 0 ? (cols[idx.cita] || "") : "";
      var cliente = idx.cliente >= 0 ? (cols[idx.cliente] || "") : "";
      var ov = idx.ov >= 0 ? (cols[idx.ov] || "") : "";
      var nota = idx.nota >= 0 ? (cols[idx.nota] || "") : "";
      if (!ov) {
        for (var ci = 0; ci < cols.length; ci++) {
          if (/^OV[- ]?\d+/i.test(cols[ci])) { ov = cols[ci]; break; }
        }
      }
      cliente = String(cliente || "").replace(/\s+Z\/\d+\s*$/i, "").trim();
      if (cols.length === 1 && !cliente) {
        nota = cols[0];
        cliente = "Sin nombre";
      }
      if (!cliente && !ov && !nota) continue;
      if (!cliente) cliente = ov || ("Fila " + (li + 1));
      var fecha = parseCitaFecha(citaRaw, ref);
      if (!fecha) fecha = parseCitaFecha(nota, ref);
      if (!fecha) fecha = isoDate(ref);
      rows.push({
        zona: String(zona || "").trim(),
        citaRaw: String(citaRaw || "").trim(),
        clienteNombre: cliente,
        ov: String(ov || "").trim(),
        nota: String(nota || "").trim(),
        fecha: fecha,
        idCliente: findIdByName(cliente)
      });
    }
    return rows;
  }

  function makeKey(r) {
    if (r.idCliente) return r.idCliente;
    if (r.ov) return "OV:" + String(r.ov).replace(/\s+/g, "");
    return "N:" + normName(r.clienteNombre).replace(/\s+/g, "_").slice(0, 40);
  }

  function ensureEstado() {
    if (!window.estado) window.estado = { citas: new Map() };
    if (!estado.citas) estado.citas = new Map();
    return estado;
  }

  function applyRows(rows, replaceAll) {
    var st = ensureEstado();
    if (replaceAll) st.citas.clear();
    var ok = 0;
    rows.forEach(function (r) {
      var key = makeKey(r);
      var prev = st.citas.get(key);
      var ovs = (prev && prev.ovs) ? prev.ovs.slice() : [];
      ovs.push({
        ov: r.ov, fecha: r.fecha, nota: r.nota, zona: r.zona,
        citaRaw: r.citaRaw, nombre: r.clienteNombre
      });
      var seen = {};
      ovs = ovs.filter(function (o) {
        var k = (o.ov || "") + "|" + (o.fecha || "") + "|" + (o.nota || "");
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      });
      ovs.sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
      st.citas.set(key, {
        fecha: ovs[0].fecha,
        ov: ovs[0].ov || null,
        nota: ovs[0].nota || null,
        zona: ovs[0].zona || null,
        nombre: r.clienteNombre,
        ovs: ovs,
        fuente: "pegar-tabla"
      });
      if (r.idCliente && key !== r.idCliente) {
        st.citas.set(r.idCliente, st.citas.get(key));
      }
      ok++;
    });
    try { if (typeof saveCitas === "function") saveCitas(); } catch (e) {
      try {
        var o = {};
        st.citas.forEach(function (v, k) { o[k] = v; });
        localStorage.setItem("rutalog_citas", JSON.stringify(o));
      } catch (e2) {}
    }
    renderList();
    try { if (typeof renderMapas === "function") renderMapas(); } catch (e) {}
    return ok;
  }

  function renderList() {
    var cont = el("listaCitas");
    if (!cont) return;
    var st = ensureEstado();
    if (!st.citas.size) {
      cont.innerHTML = '<div class="vacio">Sin fechas de cita todavía.</div>';
      return;
    }
    var items = [], seen = {};
    st.citas.forEach(function (v, id) {
      var ovs = (v.ovs && v.ovs.length) ? v.ovs : [{ ov: v.ov, fecha: v.fecha, nota: v.nota, zona: v.zona, nombre: v.nombre }];
      ovs.forEach(function (o) {
        var rk = (o.ov || id) + "|" + (o.fecha || "") + "|" + (o.nota || "");
        if (seen[rk]) return;
        seen[rk] = 1;
        items.push({
          id: id,
          nombre: o.nombre || v.nombre || id,
          fecha: o.fecha || v.fecha || "",
          ov: o.ov || "",
          nota: o.nota || "",
          zona: o.zona || ""
        });
      });
    });
    items.sort(function (a, b) {
      return String(a.fecha).localeCompare(String(b.fecha)) || String(a.nombre).localeCompare(String(b.nombre), "es");
    });
    cont.innerHTML = items.map(function (it) {
      return '<div class="cita-item"><div style="min-width:0;flex:1;">' +
        "<div><strong>" + esc(it.nombre) + "</strong>" +
        (it.ov ? ' <span class="mono" style="color:var(--muted);font-size:12px;">' + esc(it.ov) + "</span>" : "") +
        "</div>" +
        '<div style="font-size:12px;color:var(--muted);">' + esc(it.fecha) +
        (it.zona ? " · Zona " + esc(it.zona) : "") + "</div>" +
        (it.nota ? '<div style="font-size:12px;color:#e5e5e5;margin-top:4px;line-height:1.35;">' + esc(it.nota) + "</div>" : "") +
        '</div><button type="button" data-id="' + esc(it.id) + '" class="del-cita" title="Eliminar">✕</button></div>';
    }).join("");
    cont.querySelectorAll(".del-cita").forEach(function (b) {
      b.onclick = function () {
        ensureEstado().citas.delete(b.getAttribute("data-id"));
        try { if (typeof saveCitas === "function") saveCitas(); } catch (e) {}
        renderList();
        try { if (typeof renderMapas === "function") renderMapas(); } catch (e) {}
      };
    });
  }

  function ensureUI() {
    var page = el("page-citas");
    if (!page) return;
    if (el("citaPasteBox")) return;
    var card = page.querySelector(".card") || page;
    var box = document.createElement("div");
    box.id = "citaPasteBox";
    box.className = "cita-paste-box";
    box.innerHTML =
      '<h4 class="cita-paste-title">Pegar tabla de citas</h4>' +
      '<p class="cita-paste-hint">Copia desde Excel (ZONA, CITA, CLIENTE, ORDEN DE VENTA, NOTA) y pega aquí. Luego pulsa <strong>Procesar y agregar</strong>.</p>' +
      '<textarea id="citaPasteArea" rows="6" placeholder="Pega aquí la tabla completa (Ctrl+V)…"></textarea>' +
      '<div class="cita-paste-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" id="btnCitaPasteAplicar">Procesar y agregar</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnCitaPasteReemplazar">Reemplazar todas</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnCitaPasteLimpiar">Limpiar caja</button>' +
      '<span id="citaPasteStatus" class="cita-paste-status"></span></div>' +
      '<div id="citaPastePreview" class="cita-paste-preview" hidden></div>';
    var h3 = card.querySelector("h3");
    if (h3) card.insertBefore(box, h3.nextSibling);
    else card.insertBefore(box, card.firstChild);
  }

  function preview() {
    var ta = el("citaPasteArea");
    var prev = el("citaPastePreview");
    if (!ta || !prev) return;
    var rows = parsePasteTable(ta.value);
    if (!rows.length) {
      prev.hidden = true;
      prev.innerHTML = "";
      return;
    }
    prev.hidden = false;
    prev.innerHTML =
      '<div class="cita-paste-sum">' + rows.length + " filas listas</div>" +
      '<div class="cita-paste-table-wrap"><table class="cita-paste-table"><thead><tr>' +
      "<th>Cliente</th><th>OV</th><th>Fecha</th><th>Zona</th><th>Nota</th></tr></thead><tbody>" +
      rows.map(function (r) {
        return "<tr class=\"ok\"><td>" + esc(r.clienteNombre) + "</td><td class=\"mono\">" + esc(r.ov || "—") +
          "</td><td class=\"mono\">" + esc(r.fecha) + "</td><td>" + esc(r.zona) +
          "</td><td>" + esc(r.nota) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function doApply(replaceAll) {
    var ta = el("citaPasteArea");
    if (!ta) { toastSafe("No se encontró el cuadro de pegado"); return; }
    var text = ta.value || "";
    if (!String(text).trim()) {
      toastSafe("Pega primero la tabla en el cuadro");
      return;
    }
    var rows = parsePasteTable(text);
    preview();
    if (!rows.length) {
      toastSafe("No se pudo leer ninguna fila. Copia las 5 columnas desde Excel.");
      return;
    }
    var n = applyRows(rows, !!replaceAll);
    var st = el("citaPasteStatus");
    if (st) st.textContent = n + " citas agregadas";
    toastSafe(n + " cita(s) procesada(s)");
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    var btn = null;
    if (t.closest) btn = t.closest("#btnCitaPasteAplicar, #btnCitaPasteReemplazar, #btnCitaPasteLimpiar");
    if (!btn) {
      var id = t.id || (t.parentNode && t.parentNode.id);
      if (id === "btnCitaPasteAplicar" || id === "btnCitaPasteReemplazar" || id === "btnCitaPasteLimpiar")
        btn = t.id ? t : t.parentNode;
    }
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    if (btn.id === "btnCitaPasteAplicar") doApply(false);
    else if (btn.id === "btnCitaPasteReemplazar") doApply(true);
    else if (btn.id === "btnCitaPasteLimpiar") {
      var ta = el("citaPasteArea");
      if (ta) ta.value = "";
      var prev = el("citaPastePreview");
      if (prev) { prev.hidden = true; prev.innerHTML = ""; }
      var st = el("citaPasteStatus");
      if (st) st.textContent = "";
    }
  }, true);

  document.addEventListener("paste", function (e) {
    var t = e.target;
    if (t && t.id === "citaPasteArea") setTimeout(preview, 30);
  });

  function boot() {
    ensureUI();
    if (typeof window.renderCitas === "function" && !window.renderCitas._enhanced) {
      window.renderCitas = function () { renderList(); };
      window.renderCitas._enhanced = true;
    }
    try { renderList(); } catch (e) {}
  }

  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 3000);
  setInterval(ensureUI, 2500);
})();
