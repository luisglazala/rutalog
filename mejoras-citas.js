/* RUTALOG mejoras-citas v9 — panel legible: pegar + lista en tarjetas */
(function () {
  "use strict";
  if (window.__rutalogCitasV9) return;
  window.__rutalogCitasV9 = true;
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
      t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#166534;color:#fff;padding:12px 18px;border-radius:10px;z-index:999999;font-size:14px;font-weight:600;";
      document.body.appendChild(t);
      setTimeout(function () { try { t.remove(); } catch (e) {} }, 3000);
    } catch (e2) {}
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
      if (!q || q.length < 3) return null;
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
      if (sc >= 70 && best != null) {
        var s = String(best).replace(/\D/g, "");
        while (s.length < 9) s = "0" + s;
        return s.slice(-9);
      }
    } catch (e) {}
    return null;
  }

  function looksLikeNote(s) {
    var t = String(s || "").toUpperCase();
    return /ENTREGAR|COMPLETO|PARCIAL|FACTURA|PEDIDO|LLEGAR|NO\s+PARCIAL|REALIZAR\s+\d+\s+FACT/.test(t) &&
      !/\bOV[- ]?\d{5,}/i.test(t) &&
      t.length > 25;
  }

  function parseLine(line) {
    line = String(line || "").replace(/\u00a0/g, " ").trim();
    if (!line) return null;
    var up = normName(line);
    if (/^(ZONA|CITA|CLIENTE|ORDEN|NOTA|ID)\b/.test(up) && up.split(" ").length <= 6) return null;
    if (looksLikeNote(line) && !/\bOV[- ]?\d{5,}/i.test(line) && !/^\d{6,}/.test(line)) return null;

    var ov = "", ovIdx = -1;
    var ovMatch = line.match(/\b(OV[- ]?\d{6,})\b/i);
    if (ovMatch) {
      ov = ovMatch[1].replace(/\s+/g, "").replace(/OV\s+/i, "OV-");
      if (!/^OV-/i.test(ov)) ov = ov.replace(/^OV/i, "OV-");
      ovIdx = ovMatch.index;
    }

    var before = ovIdx >= 0 ? line.slice(0, ovIdx).trim() : line;
    var after = ovIdx >= 0 ? line.slice(ovIdx + ovMatch[0].length).trim() : "";
    before = before.replace(/\s+Z\s*\/\s*\d+\s*$/i, "").trim();

    var zona = "", citaRaw = "", cliente = "";
    var idFromLine = null;
    var idm = before.match(/^(\d{6,9})\b\s*(.*)$/);
    if (idm) {
      idFromLine = idm[1];
      while (idFromLine.length < 9) idFromLine = "0" + idFromLine;
      before = idm[2].trim();
    }

    var zm = before.match(/^(\d{1,4})\b\s+(.*)$/);
    if (zm && !idFromLine) {
      zona = zm[1];
      before = zm[2].trim();
    }

    var cm = before.match(/^((?:LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)\s*\d{0,2}(?:\s*[\/\-]\s*\d{1,2})?|ENTREGA\s*INMEDIATA|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.*)$/i);
    if (cm) {
      citaRaw = cm[1].replace(/\s+/g, " ").trim();
      cliente = cm[2].trim();
    } else {
      cliente = before;
    }

    var nota = after;
    if (line.indexOf("\t") >= 0) {
      var cols = line.split("\t").map(function (x) { return x.trim(); });
      if (cols.length >= 3) {
        if (/^\d{6,9}$/.test(cols[0])) idFromLine = cols[0];
        if (cols.length >= 5) {
          zona = cols[0] || zona;
          citaRaw = cols[1] || citaRaw;
          cliente = cols[2] || cliente;
          if (/^OV/i.test(cols[3])) ov = cols[3].replace(/\s+/g, "");
          nota = cols.slice(4).join(" ") || nota;
        } else {
          cliente = cols[0] || cliente;
          citaRaw = cols[1] || citaRaw;
          ov = cols[2] || ov;
        }
      }
    }

    cliente = String(cliente || "").replace(/\s+Z\s*\/\s*\d+\s*$/i, "").trim();
    if (looksLikeNote(cliente) && !ov && !idFromLine) return null;
    if (!cliente && !ov && !idFromLine) return null;
    if (!cliente) cliente = ov || "Sin nombre";

    var ref = new Date();
    try {
      if (window.estado && estado.fechaHoy) ref = new Date(estado.fechaHoy + "T12:00:00");
    } catch (e) {}
    var fecha = parseCitaFecha(citaRaw, ref);
    var idCliente = idFromLine || findIdByName(cliente);

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
      try { localStorage.setItem("rutalog_gh_dirty", "1"); } catch (e) {}
    } catch (e) {}
  }

  function applyRows(rows, replaceAll) {
    var map = getCitasMap();
    if (replaceAll) map.clear();
    var n = 0;
    rows.forEach(function (r) {
      var id = r.idCliente ? String(r.idCliente) : ("x:" + normName(r.cliente).slice(0, 40));
      var prev = map.get(id) || {
        idCliente: r.idCliente || null,
        nombre: r.cliente,
        ovs: [],
        fuente: "pegar-tabla"
      };
      var ovs = Array.isArray(prev.ovs) ? prev.ovs.slice() : [];
      ovs = ovs.filter(function (o) {
        return String(o.fecha || "") !== String(r.fecha || "") || String(o.ov || "") !== String(r.ov || "");
      });
      ovs.push({
        fecha: r.fecha || "",
        ov: r.ov || "",
        nota: r.nota || "",
        citaRaw: r.citaRaw || ""
      });
      ovs.sort(function (a, b) { return String(a.fecha || "").localeCompare(String(b.fecha || "")); });
      map.set(id, {
        idCliente: r.idCliente || prev.idCliente || null,
        nombre: r.cliente || prev.nombre || "",
        fecha: r.fecha || prev.fecha || "",
        citaRaw: r.citaRaw || prev.citaRaw || "",
        ovs: ovs,
        fuente: "pegar-tabla"
      });
      n++;
    });
    persistCitas();
    return n;
  }

  function injectCSS() {
    if (el("rutalog-citas-v9-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-citas-v9-css";
    st.textContent = [
      "#page-citas{display:flex;flex-direction:column;gap:16px;overflow:auto;padding-bottom:24px;}",
      "#citasPasteBox.cita-paste-box{margin:0;padding:16px;border:1px dashed #333;border-radius:12px;background:#121212;flex-shrink:0;}",
      "#page-citas .cita-paste-title{margin:0 0 6px;font-size:14px;font-weight:600;color:#fafafa;}",
      "#page-citas .cita-paste-hint{margin:0 0 10px;font-size:12.5px;color:#a3a3a3;line-height:1.45;}",
      "#citaPasteArea{width:100%;box-sizing:border-box;min-height:120px;max-height:220px;padding:10px 12px;border-radius:10px;border:1px solid #2a2a2a;background:#0f0f0f;color:#fafafa;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.4;resize:vertical;}",
      "#page-citas .cita-paste-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;}",
      "#citasPreview{font-size:12.5px;color:#a3a3a3;margin:0 0 0 4px;}",
      "#citasPreviewTableWrap{margin-top:12px;border:1px solid #1f1f1f;border-radius:10px;overflow:auto;max-height:200px;}",
      "#citasPreviewTable{width:100%;border-collapse:collapse;font-size:12px;}",
      "#citasPreviewTable th{position:sticky;top:0;background:#1a1a1a;text-align:left;padding:8px 10px;color:#a3a3a3;white-space:nowrap;}",
      "#citasPreviewTable td{padding:7px 10px;border-top:1px solid #1f1f1f;color:#e5e5e5;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      "#citasPreviewTable tr.fail td{color:#fbbf24;}",
      "#citasListEnhanced{display:flex;flex-direction:column;gap:8px;margin-top:8px;max-height:min(40vh,360px);overflow:auto;}",
      "#citasListEnhanced .cita-card{display:grid;grid-template-columns:110px 1fr auto;gap:6px 12px;align-items:start;padding:12px 14px;border-radius:10px;background:#161616;border:1px solid #2a2a2a;}",
      "#citasListEnhanced .cita-card .cid{font-family:ui-monospace,monospace;font-size:12px;color:#86efac;}",
      "#citasListEnhanced .cita-card .cname{font-weight:600;font-size:13.5px;color:#fafafa;word-break:break-word;}",
      "#citasListEnhanced .cita-card .cmeta{font-size:12px;color:#a3a3a3;grid-column:1/-2;}",
      "#citasListEnhanced .cita-card .cmeta span{margin-right:10px;}",
      "#citasListEnhanced .cita-card .del-cita{grid-row:1/3;grid-column:3;align-self:center;background:transparent;border:1px solid #333;color:#f87171;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;line-height:1;}",
      "#citasListEnhanced .cita-card .del-cita:hover{background:#3f1d1d;}",
      "#citasListEnhanced .cita-empty{padding:16px;color:#737373;font-size:13px;}",
      "#page-citas #listaCitas{max-height:min(36vh,320px);overflow:auto;}",
      "#page-citas h3{margin:0 0 8px;font-size:15px;}"
    ].join("");
    document.head.appendChild(st);
  }

  function renderList() {
    var cont = el("citasListEnhanced");
    if (!cont) return;
    var citas = getCitasMap();
    var items = [];
    citas.forEach(function (v, id) {
      if (String(id).indexOf("n:") === 0) return;
      var ovs = Array.isArray(v.ovs) ? v.ovs : [];
      if (!ovs.length) ovs = [{ fecha: v.fecha || "", ov: "", citaRaw: v.citaRaw || "" }];
      ovs.forEach(function (o) {
        items.push({
          key: id,
          idShow: v.idCliente || (String(id).indexOf("x:") === 0 ? "sin ID" : id),
          nombre: v.nombre || "",
          fecha: o.fecha || v.fecha || o.citaRaw || "—",
          ov: o.ov || "",
          nota: o.nota || ""
        });
      });
    });
    items.sort(function (a, b) {
      return String(a.fecha).localeCompare(String(b.fecha)) || String(a.nombre).localeCompare(String(b.nombre));
    });
    if (!items.length) {
      cont.innerHTML = '<div class="cita-empty">Sin citas pegadas todavía. Pega la tabla arriba y pulsa Aplicar.</div>';
      return;
    }
    cont.innerHTML = items.map(function (it) {
      return (
        '<div class="cita-card" data-id="' + esc(it.key) + '">' +
          '<div class="cid">' + esc(it.idShow) + '</div>' +
          '<div class="cname">' + esc(it.nombre) + '</div>' +
          '<button type="button" class="del-cita" data-id="' + esc(it.key) + '" title="Eliminar">×</button>' +
          '<div class="cmeta">' +
            '<span>📅 ' + esc(it.fecha) + '</span>' +
            (it.ov ? '<span>🧾 ' + esc(it.ov) + '</span>' : '') +
            (it.nota ? '<span title="' + esc(it.nota) + '">📝 ' + esc(it.nota.length > 40 ? it.nota.slice(0, 40) + "…" : it.nota) + '</span>' : '') +
          '</div>' +
        '</div>'
      );
    }).join("");
    cont.querySelectorAll(".del-cita").forEach(function (b) {
      b.onclick = function () {
        getCitasMap().delete(b.getAttribute("data-id"));
        persistCitas();
        renderList();
      };
    });
  }

  function preview() {
    var ta = el("citaPasteArea") || el("citasPasteArea");
    var status = el("citasPreview");
    var wrap = el("citasPreviewTableWrap");
    if (!ta) return;
    var rows = parsePasteTable(ta.value);
    if (status) {
      status.innerHTML = rows.length
        ? ('Detectadas: <strong style="color:#86efac">' + rows.length + '</strong> filas válidas')
        : "Sin filas detectadas — revisa el formato";
    }
    if (!wrap) return;
    if (!rows.length) {
      wrap.innerHTML = "";
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    var ok = rows.filter(function (r) { return r.idCliente || r.ov; }).length;
    wrap.innerHTML =
      '<div style="padding:8px 12px;font-size:12.5px;background:#1a1a1a;">' +
      '<span style="color:#34d399">' + ok + ' con ID/OV</span> · ' +
      '<span style="color:' + (rows.length - ok ? '#fbbf24' : '#34d399') + '">' + (rows.length - ok) + ' solo nombre</span></div>' +
      '<table id="citasPreviewTable"><thead><tr>' +
      '<th>ID</th><th>Cliente</th><th>Fecha</th><th>OV</th><th>Nota</th></tr></thead><tbody>' +
      rows.slice(0, 40).map(function (r) {
        var fail = !r.idCliente;
        return '<tr class="' + (fail ? 'fail' : '') + '">' +
          '<td class="mono">' + esc(r.idCliente || '—') + '</td>' +
          '<td title="' + esc(r.cliente) + '">' + esc(r.cliente) + '</td>' +
          '<td class="mono">' + esc(r.fecha || r.citaRaw || '—') + '</td>' +
          '<td class="mono">' + esc(r.ov || '—') + '</td>' +
          '<td title="' + esc(r.nota) + '">' + esc(r.nota ? (r.nota.length > 28 ? r.nota.slice(0, 28) + '…' : r.nota) : '—') + '</td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  function ensureUI() {
    injectCSS();
    var page = el("page-citas");
    if (!page) return;
    var box = el("citasPasteBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "citasPasteBox";
      box.className = "cita-paste-box";
      box.innerHTML =
        '<p class="cita-paste-title">Pegar tabla de citas</p>' +
        '<p class="cita-paste-hint">Pega desde Excel o texto: ID / cliente / fecha / OV / nota (una fila por línea o columnas con tabulador).</p>' +
        '<textarea id="citaPasteArea" placeholder="005658382\tSMEILIN…\t05/10/2026\tOV-011458001\tEntregar completo"></textarea>' +
        '<div class="cita-paste-actions">' +
        '<button type="button" id="citasBtnApply" class="btn btn-primary btn-sm">Aplicar</button>' +
        '<button type="button" id="citasBtnReplace" class="btn btn-sm">Reemplazar todo</button>' +
        '<span id="citasPreview" class="cita-paste-status"></span>' +
        '</div>' +
        '<div id="citasPreviewTableWrap" hidden></div>' +
        '<p class="cita-paste-title" style="margin-top:16px;">Citas aplicadas (pegar)</p>' +
        '<div id="citasListEnhanced"></div>';
      var first = page.querySelector("h3, .panel, .card, #listaCitas");
      if (first && first.parentNode === page) page.insertBefore(box, first);
      else if (page.firstChild) page.insertBefore(box, page.firstChild);
      else page.appendChild(box);
    }
    wireButtons(page);
    renderList();
  }

  function wireButtons(root) {
    var ta = el("citaPasteArea") || el("citasPasteArea");
    var a = el("citasBtnApply");
    var r = el("citasBtnReplace");
    if (a && !a._citasV9) {
      a._citasV9 = true;
      a.onclick = function (e) { e.preventDefault(); doApply(false); };
    }
    if (r && !r._citasV9) {
      r._citasV9 = true;
      r.onclick = function (e) {
        e.preventDefault();
        if (!confirm("¿Reemplazar todas las citas pegadas?")) return;
        doApply(true);
      };
    }
    if (ta && !ta._citasV9) {
      ta._citasV9 = true;
      ta.addEventListener("input", function () { preview(); });
      ta.addEventListener("paste", function () { setTimeout(preview, 50); });
    }
  }

  function doApply(replaceAll) {
    var ta = el("citaPasteArea") || el("citasPasteArea");
    var rows = parsePasteTable(ta ? ta.value : "");
    if (!rows.length) { toastSafe("No se detectaron filas de cita"); return; }
    var n = applyRows(rows, !!replaceAll);
    renderList();
    preview();
    toastSafe((replaceAll ? "Reemplazadas: " : "Aplicadas: ") + n);
    try { if (typeof window.renderCitas === "function") window.renderCitas(); } catch (e) {}
  }

  function boot() {
    injectCSS();
    ensureUI();
    wireButtons(document);
    try { renderList(); } catch (e) {}
  }

  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 3000);
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('[data-page="citas"]')) setTimeout(boot, 80);
  });

  window.__citasParseTest = parsePasteTable;
  window.__citasApply = doApply;
  console.info("[RUTALOG] citas v9 — panel legible");
})();
