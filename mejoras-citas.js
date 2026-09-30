/* RUTALOG mejoras-citas v7 — pegar tabla (escapeHtml arreglado) */
(function () {
  "use strict";
  if (window.__rutalogCitasV7) return;
  window.__rutalogCitasV7 = true;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&"+"amp;")
      .replace(/</g, "&"+"lt;")
      .replace(/>/g, "&"+"gt;")
      .replace(/"/g, "&"+"quot;");
  }
  function toastSafe(msg) {
    try { if (typeof toast === "function") { toast(msg); return; } } catch (e) {}
    try {
      var t = document.createElement("div");
      t.textContent = msg;
      t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#166534;color:#fff;padding:12px 18px;border-radius:10px;z-index:999999;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.4);";
      document.body.appendChild(t);
      setTimeout(function () { try { t.remove(); } catch (e) {} }, 3000);
    } catch (e2) { try { alert(msg); } catch (e3) {} }
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

  function parseLine(line) {
    line = String(line || "").replace(/\u00a0/g, " ").trim();
    if (!line) return null;
    var up = normName(line);
    if (/^(ZONA|CITA|CLIENTE|ORDEN|NOTA)/.test(up) && /ZONA|CITA|CLIENTE/.test(up)) return null;

    var ov = "", ovIdx = -1;
    var ovMatch = line.match(/\b(OV[- ]?\d{6,})\b/i);
    if (ovMatch) {
      ov = ovMatch[1].replace(/\s+/g, "");
      ovIdx = ovMatch.index;
    }

    var before = ovIdx >= 0 ? line.slice(0, ovIdx).trim() : line;
    var after = ovIdx >= 0 ? line.slice(ovIdx + ovMatch[0].length).trim() : "";
    before = before.replace(/\s+Z\s*\/\s*\d+\s*$/i, "").trim();

    var zona = "", citaRaw = "", cliente = "";

    var zm = before.match(/^(\d{1,4})\b\s*(.*)$/);
    if (zm) {
      zona = zm[1];
      before = zm[2].trim();
    }

    var cm = before.match(/^((?:LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)\s*\d{0,2}(?:\s*[\/\-]\s*\d{1,2})?|ENTREGA\s*INMEDIATA)\s+(.*)$/i);
    if (cm) {
      citaRaw = cm[1].replace(/\s+/g, " ").trim();
      cliente = cm[2].trim();
    } else {
      cliente = before;
    }

    var nota = after;
    if (line.indexOf("\t") >= 0) {
      var cols = line.split("\t").map(function (x) { return x.trim(); });
      if (cols.length >= 5) {
        zona = cols[0] || zona;
        citaRaw = cols[1] || citaRaw;
        cliente = cols[2] || cliente;
        if (/^OV/i.test(cols[3])) ov = cols[3].replace(/\s+/g, "");
        nota = cols.slice(4).join(" ") || nota;
      }
    }

    cliente = String(cliente || "").replace(/\s+Z\s*\/\s*\d+\s*$/i, "").trim();
    if (!cliente && !ov) return null;
    if (!cliente) cliente = ov || "Sin nombre";

    var ref = new Date();
    var fecha = parseCitaFecha(citaRaw, ref);
    if (!fecha) fecha = parseCitaFecha(nota, ref);
    if (!fecha) fecha = isoDate(ref);

    return {
      zona: String(zona || "").trim(),
      citaRaw: String(citaRaw || "").trim(),
      clienteNombre: cliente,
      ov: String(ov || "").trim(),
      nota: String(nota || "").trim(),
      fecha: fecha,
      idCliente: findIdByName(cliente)
    };
  }

  function parsePasteTable(text) {
    var lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      var r = parseLine(lines[i]);
      if (r) rows.push(r);
    }
    return rows;
  }

  function makeKey(r) {
    if (r.idCliente) return r.idCliente;
    if (r.ov) return "OV:" + String(r.ov).replace(/\s+/g, "");
    return "N:" + normName(r.clienteNombre).replace(/\s+/g, "_").slice(0, 40);
  }

  function getCitasMap() {
    if (!window.estado) window.estado = {};
    if (!estado.citas || typeof estado.citas.set !== "function") {
      var map = new Map();
      try {
        var raw = localStorage.getItem("rutalog_citas");
        if (raw) {
          var obj = JSON.parse(raw);
          Object.keys(obj).forEach(function (k) { map.set(k, obj[k]); });
        }
      } catch (e) {}
      estado.citas = map;
    }
    return estado.citas;
  }

  function persistCitas() {
    try { if (typeof saveCitas === "function") { saveCitas(); return; } } catch (e) {}
    try {
      var o = {};
      getCitasMap().forEach(function (v, k) { o[k] = v; });
      localStorage.setItem("rutalog_citas", JSON.stringify(o));
    } catch (e2) {}
  }

  function applyRows(rows, replaceAll) {
    var citas = getCitasMap();
    if (replaceAll) citas.clear();
    var ok = 0;
    rows.forEach(function (r) {
      var key = makeKey(r);
      var prev = citas.get(key);
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
      var rec = {
        fecha: ovs[0].fecha,
        ov: ovs[0].ov || null,
        nota: ovs[0].nota || null,
        zona: ovs[0].zona || null,
        nombre: r.clienteNombre,
        ovs: ovs,
        fuente: "pegar-tabla"
      };
      citas.set(key, rec);
      if (r.idCliente && key !== r.idCliente) citas.set(r.idCliente, rec);
      ok++;
    });
    persistCitas();
    renderList();
    try { if (typeof renderMapas === "function") renderMapas(); } catch (e) {}
    return ok;
  }

  function renderList() {
    var cont = el("listaCitas");
    if (!cont) return;
    var citas = getCitasMap();
    if (!citas.size) {
      cont.innerHTML = '<div class="vacio">Sin fechas de cita todavía.</div>';
      return;
    }
    var items = [], seen = {};
    citas.forEach(function (v, id) {
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
        getCitasMap().delete(b.getAttribute("data-id"));
        persistCitas();
        renderList();
        try { if (typeof renderMapas === "function") renderMapas(); } catch (e) {}
      };
    });
  }

  function wireButtons(root) {
    var a = (root || document).querySelector("#btnCitaPasteAplicar");
    var r = (root || document).querySelector("#btnCitaPasteReemplazar");
    var c = (root || document).querySelector("#btnCitaPasteLimpiar");
    if (a && !a._wiredV7) {
      a._wiredV7 = true;
      a.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        doApply(false);
      };
    }
    if (r && !r._wiredV7) {
      r._wiredV7 = true;
      r.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        doApply(true);
      };
    }
    if (c && !c._wiredV7) {
      c._wiredV7 = true;
      c.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var ta = el("citaPasteArea");
        if (ta) ta.value = "";
        var prev = el("citaPastePreview");
        if (prev) { prev.hidden = true; prev.innerHTML = ""; }
        var st = el("citaPasteStatus");
        if (st) st.textContent = "";
      };
    }
  }

  function ensureUI() {
    var page = el("page-citas") || (el("listaCitas") && el("listaCitas").closest(".page")) || (el("btnAddCita") && el("btnAddCita").closest(".page"));
    if (!page) return;
    var existing = el("citaPasteBox");
    if (existing) {
      wireButtons(existing);
      return;
    }
    var card = page.querySelector(".card") || page;
    var box = document.createElement("div");
    box.id = "citaPasteBox";
    box.className = "cita-paste-box";
    box.innerHTML =
      '<h4 class="cita-paste-title">Pegar tabla de citas</h4>' +
      '<p class="cita-paste-hint">Pega las filas de Excel y pulsa <strong>Procesar y agregar</strong>. Se lee zona, cita, cliente, OV y nota.</p>' +
      '<textarea id="citaPasteArea" rows="6" placeholder="Pega aquí la tabla (Ctrl+V)…"></textarea>' +
      '<div class="cita-paste-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" id="btnCitaPasteAplicar">Procesar y agregar</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnCitaPasteReemplazar">Reemplazar todas</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnCitaPasteLimpiar">Limpiar caja</button>' +
      '<span id="citaPasteStatus" class="cita-paste-status"></span></div>' +
      '<div id="citaPastePreview" class="cita-paste-preview" hidden></div>';
    var h3 = card.querySelector("h3");
    if (h3) card.insertBefore(box, h3.nextSibling);
    else card.insertBefore(box, card.firstChild);
    wireButtons(box);
    var ta = el("citaPasteArea");
    if (ta && !ta._wiredPaste) {
      ta._wiredPaste = true;
      ta.addEventListener("input", function () { preview(); });
      ta.addEventListener("paste", function () { setTimeout(preview, 40); });
    }
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
      '<div class="cita-paste-sum">' + rows.length + " filas listas — pulsa Procesar y agregar</div>" +
      '<div class="cita-paste-table-wrap"><table class="cita-paste-table"><thead><tr>' +
      "<th>Cliente</th><th>OV</th><th>Fecha</th><th>Zona</th><th>Nota</th></tr></thead><tbody>" +
      rows.map(function (r) {
        return '<tr class="ok"><td>' + esc(r.clienteNombre) + '</td><td class="mono">' + esc(r.ov || "—") +
          '</td><td class="mono">' + esc(r.fecha) + '</td><td>' + esc(r.zona) +
          '</td><td>' + esc(r.nota) + '</td></tr>';
      }).join("") + "</tbody></table></div>";
  }

  function doApply(replaceAll) {
    var ta = el("citaPasteArea");
    if (!ta) { toastSafe("No se encontró el cuadro de pegado"); return; }
    var text = ta.value || "";
    if (!String(text).trim()) { toastSafe("Pega primero la tabla en el cuadro"); return; }
    var rows = parsePasteTable(text);
    preview();
    if (!rows.length) {
      toastSafe("No se pudo leer ninguna fila");
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
    var btn = t.id ? t : (t.closest ? t.closest("button") : t.parentNode);
    if (!btn || !btn.id) return;
    if (btn.id === "btnCitaPasteAplicar") {
      e.preventDefault(); e.stopPropagation();
      doApply(false);
    } else if (btn.id === "btnCitaPasteReemplazar") {
      e.preventDefault(); e.stopPropagation();
      doApply(true);
    }
  }, true);

  function boot() {
    ensureUI();
    wireButtons(document);
    if (typeof window.renderCitas === "function" && !window.renderCitas._enhanced) {
      var orig = window.renderCitas;
      window.renderCitas = function () {
        try { renderList(); } catch (e) { try { orig(); } catch (e2) {} }
      };
      window.renderCitas._enhanced = true;
    }
    try { renderList(); } catch (e) {}
  }

  setTimeout(boot, 300);
  setTimeout(boot, 1000);
  setTimeout(boot, 2500);
  setTimeout(boot, 5000);
  setInterval(function () {
    ensureUI();
    wireButtons(document);
  }, 2000);

  window.__citasParseTest = parsePasteTable;
  window.__citasApply = doApply;
})();
