/* RUTALOG mejoras-citas v8 — pegar tabla (escapeHtml arreglado) */
(function () {
  "use strict";
  if (window.__rutalogCitasV8 || window.__rutalogCitasV7) return;
  window.__rutalogCitasV8 = true;
  window.__rutalogCitasV7 = true;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    try {
      if (window.estado && estado.fechaHoy) ref = new Date(estado.fechaHoy + "T12:00:00");
    } catch (e) {}
    var fecha = parseCitaFecha(citaRaw, ref);
    var idCliente = findIdByName(cliente);

    return {
      zona: zona,
      citaRaw: citaRaw,
      fecha: fecha,
      cliente: cliente,
      idCliente: idCliente,
      ov: ov,
      nota: nota,
      raw: line
    };
  }

  function parsePasteTable(text) {
    return String(text || "").split(/\r?\n/).map(parseLine).filter(Boolean);
  }

  function makeKey(r) {
    return (r.idCliente || normName(r.cliente)) + "|" + (r.ov || "") + "|" + (r.fecha || r.citaRaw || "");
  }

  function getCitasMap() {
    if (!window.estado) window.estado = {};
    if (!(estado.citas instanceof Map)) {
      var map = new Map();
      try {
        var raw = localStorage.getItem("rutalog_citas");
        if (raw) {
          var obj = JSON.parse(raw);
          if (obj && typeof obj === "object") {
            Object.keys(obj).forEach(function (k) { map.set(k, obj[k]); });
          }
        }
      } catch (e) {}
      estado.citas = map;
    }
    return estado.citas;
  }

  function persistCitas() {
    try {
      var o = {};
      getCitasMap().forEach(function (v, k) { o[k] = v; });
      localStorage.setItem("rutalog_citas", JSON.stringify(o));
      if (typeof marcarDirty === "function") marcarDirty("citas");
      else try { localStorage.setItem("rutalog_gh_dirty", "1"); } catch (e) {}
    } catch (e) {}
  }

  function applyRows(rows, replaceAll) {
    var map = getCitasMap();
    if (replaceAll) map.clear();
    var n = 0;
    rows.forEach(function (r) {
      var id = r.idCliente || ("n:" + normName(r.cliente));
      var prev = map.get(id) || {
        idCliente: r.idCliente,
        nombre: r.cliente,
        ovs: [],
        fuente: "pegar-tabla"
      };
      var ovs = Array.isArray(prev.ovs) ? prev.ovs.slice() : [];
      ovs = ovs.filter(function (o) {
        return String(o.fecha || "") !== String(r.fecha || "") || String(o.ov || "") !== String(r.ov || "");
      });
      ovs.push({ fecha: r.fecha, ov: r.ov || "", nota: r.nota || "", citaRaw: r.citaRaw || "" });
      ovs.sort(function (a, b) { return String(a.fecha || "").localeCompare(String(b.fecha || "")); });
      map.set(id, {
        idCliente: r.idCliente || prev.idCliente,
        nombre: r.cliente || prev.nombre || "",
        fecha: r.fecha || prev.fecha,
        citaRaw: r.citaRaw || prev.citaRaw || "",
        ovs: ovs,
        fuente: "pegar-tabla"
      });
      n++;
    });
    persistCitas();
    return n;
  }

  function renderList() {
    var cont = el("citasListEnhanced") || el("citasList") || el("listaCitas") || document.querySelector("#page-citas .citas-list");
    if (!cont) return;
    var citas = getCitasMap();
    var items = [];
    citas.forEach(function (v, id) {
      var ovs = Array.isArray(v.ovs) ? v.ovs : [];
      if (!ovs.length && (v.fecha || v.citaRaw)) ovs = [{ fecha: v.fecha, citaRaw: v.citaRaw }];
      ovs.forEach(function (o) {
        items.push({ id: id, nombre: v.nombre || "", fecha: o.fecha || v.fecha || "", ov: o.ov || "" });
      });
    });
    items.sort(function (a, b) {
      return String(a.fecha).localeCompare(String(b.fecha)) || String(a.nombre).localeCompare(String(b.nombre));
    });
    cont.innerHTML = items.map(function (it) {
      return '<div class="cita-row" data-id="' + esc(it.id) + '">' +
        '<span class="mono">' + esc(it.id) + '</span> ' +
        '<span>' + esc(it.nombre) + '</span> ' +
        '<span class="mono">' + esc(it.fecha) + '</span> ' +
        (it.ov ? '<span class="mono">' + esc(it.ov) + '</span> ' : '') +
        '<button type="button" class="del-cita" data-id="' + esc(it.id) + '">×</button></div>';
    }).join("") || '<div class="muted">Sin citas</div>';
    cont.querySelectorAll(".del-cita").forEach(function (b) {
      b.onclick = function () {
        getCitasMap().delete(b.getAttribute("data-id"));
        persistCitas();
        renderList();
      };
    });
  }

  function wireButtons(root) {
    root = root || document;
    var ta = el("citasPasteArea") || el("citasPaste") || el("txtCitasPaste") || root.querySelector("#page-citas textarea");
    var a = el("citasBtnApply") || el("btnCitasAplicar") || root.querySelector("[data-citas-apply]");
    var r = el("citasBtnReplace") || el("btnCitasReemplazar") || root.querySelector("[data-citas-replace]");
    if (a && !a._citasWired) {
      a._citasWired = true;
      a.onclick = function (e) {
        e.preventDefault();
        doApply(false);
      };
    }
    if (r && !r._citasWired) {
      r._citasWired = true;
      r.onclick = function (e) {
        e.preventDefault();
        doApply(true);
      };
    }
    if (ta && !ta._citasWired) {
      ta._citasWired = true;
      ta.addEventListener("input", function () { preview(); });
      ta.addEventListener("paste", function () { setTimeout(preview, 40); });
    }
  }

  function ensureUI() {
    var page = el("page-citas");
    if (!page) return;
    if (!el("citasPasteArea") && !el("citasPaste")) {
      var box = document.createElement("div");
      box.id = "citasPasteBox";
      box.className = "citas-paste-box";
      box.innerHTML =
        '<label>Pegar tabla de citas</label>' +
        '<textarea id="citasPasteArea" rows="8" placeholder="Zona / Cita / Cliente / OV / Nota"></textarea>' +
        '<div id="citasPreview" class="muted" style="margin:8px 0;font-size:12px;"></div>' +
        '<div class="row gap">' +
        '<button type="button" id="citasBtnApply" class="btn">Aplicar</button>' +
        '<button type="button" id="citasBtnReplace" class="btn ghost">Reemplazar todo</button>' +
        '</div>' +
        '<div id="citasListEnhanced" class="citas-list" style="margin-top:12px;"></div>';
      page.insertBefore(box, page.firstChild);
    }
    wireButtons(page);
    renderList();
  }

  function preview() {
    var ta = el("citasPasteArea") || el("citasPaste");
    var prev = el("citasPreview");
    if (!ta || !prev) return;
    var rows = parsePasteTable(ta.value);
    prev.textContent = rows.length ? ("Detectadas: " + rows.length + " filas") : "Sin filas detectadas";
  }

  function doApply(replaceAll) {
    var ta = el("citasPasteArea") || el("citasPaste") || el("txtCitasPaste");
    var rows = parsePasteTable(ta ? ta.value : "");
    if (!rows.length) { toastSafe("No se detectaron filas de cita"); return; }
    var n = applyRows(rows, !!replaceAll);
    renderList();
    preview();
    toastSafe((replaceAll ? "Reemplazadas: " : "Aplicadas: ") + n);
  }

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
  console.info("[RUTALOG] citas v8");
})();
