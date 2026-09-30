/* RUTALOG mejoras-citas-core */
(function () {
  "use strict";
  function el(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }
  function pad9Local(id) {
    var s = String(id == null ? "" : id).replace(/\D/g, "");
    if (!s) return "";
    if (typeof pad9 === "function") return pad9(s);
    while (s.length < 9) s = "0" + s;
    return s.slice(-9);
  }
  function toastSafe(msg) {
    if (typeof toast === "function") toast(msg); else console.log("[RUTALOG]", msg);
  }
  function normName(s) {
    return String(s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function isoDate(d) {
    if (!d || isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parseCitaFecha(raw, refDate) {
    var t = String(raw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!t) return null;
    if (/ENTREGA\s*INMEDIATA|INMEDIATA|HOY/.test(t)) return isoDate(refDate || new Date());
    var mFull = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (mFull) {
      var yy = +mFull[3]; if (yy < 100) yy += 2000;
      return isoDate(new Date(yy, +mFull[2] - 1, +mFull[1]));
    }
    var mDayMonth = t.match(/(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\s*(\d{1,2})(?:[\/\-](\d{1,2}))?/i);
    if (mDayMonth) {
      var day = +mDayMonth[2], month = mDayMonth[3] ? +mDayMonth[3] : null;
      var base = refDate || new Date(), y = base.getFullYear(), mo = month != null ? month - 1 : base.getMonth();
      var candidate = new Date(y, mo, day);
      if (month == null && candidate < new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1)) {
        if (day < base.getDate() - 5) candidate = new Date(y, mo + 1, day);
      }
      return isoDate(candidate);
    }
    var mDay = t.match(/^(\d{1,2})$/);
    if (mDay) {
      var base2 = refDate || new Date();
      return isoDate(new Date(base2.getFullYear(), base2.getMonth(), +mDay[1]));
    }
    return null;
  }
  function findClienteByName(nombre) {
    var q = normName(nombre);
    if (!q || !window.estado) return null;
    var best = null, bestScore = 0;
    function scoreName(n) {
      if (!n) return 0;
      if (n === q) return 100;
      if (n.indexOf(q) >= 0 || q.indexOf(n) >= 0) return 80;
      var tq = q.split(" ").filter(function (x) { return x.length > 2; });
      var tn = n.split(" "), hit = 0;
      tq.forEach(function (tok) {
        if (tn.some(function (x) { return x.indexOf(tok) === 0 || tok.indexOf(x) === 0; })) hit++;
      });
      if (tq.length && hit / tq.length >= 0.6) return 50 + hit * 5;
      return 0;
    }
    if (estado.maestro) {
      estado.maestro.forEach(function (c) {
        var sc = scoreName(normName(c.nombre));
        if (sc > bestScore) { bestScore = sc; best = c; }
      });
    }
    if (bestScore < 80 && estado.clientesHoy) {
      estado.clientesHoy.forEach(function (c) {
        var sc = scoreName(normName(c.nombre));
        if (sc > bestScore) {
          bestScore = sc;
          best = { id: c.idCliente, nombre: c.nombre, ciudad: c.ciudad };
        }
      });
    }
    return bestScore >= 50 ? best : null;
  }
  function parsePasteTable(text) {
    var lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return { rows: [], errors: ["Vacío"] };
    function splitLine(l) {
      if (l.indexOf("\t") >= 0) return l.split("\t").map(function (x) { return x.trim(); });
      if (/\s{2,}/.test(l)) return l.split(/\s{2,}/).map(function (x) { return x.trim(); });
      return l.split("|").map(function (x) { return x.trim(); });
    }
    var header = splitLine(lines[0]).map(normName);
    var hasHeader = header.some(function (h) { return /ZONA|CITA|CLIENTE|ORDEN|VENTA|NOTA|OV/.test(h); });
    var idx = { zona: -1, cita: -1, cliente: -1, ov: -1, nota: -1 };
    if (hasHeader) {
      header.forEach(function (h, i) {
        if (/ZONA/.test(h)) idx.zona = i;
        else if (/^CITA$|FECHA/.test(h)) idx.cita = i;
        else if (/CLIENTE|NOMBRE/.test(h)) idx.cliente = i;
        else if (/ORDEN|VENTA|^OV$/.test(h)) idx.ov = i;
        else if (/NOTA|OBS|COMENT/.test(h)) idx.nota = i;
      });
    } else {
      idx = { zona: 0, cita: 1, cliente: 2, ov: 3, nota: 4 };
    }
    var start = hasHeader ? 1 : 0, rows = [], errors = [], ref = new Date();
    for (var li = start; li < lines.length; li++) {
      var cols = splitLine(lines[li]);
      if (cols.length < 2) continue;
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
      if (!cliente && cols.length >= 3) cliente = String(cols[2] || "").trim();
      if (!cliente) {
        if (ov) cliente = String(ov);
        else { errors.push("Línea " + (li + 1) + ": sin cliente"); continue; }
      }
      var fecha = parseCitaFecha(citaRaw, ref);
      if (!fecha && nota) {
        var mn = String(nota).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (mn) {
          var yy = +mn[3]; if (yy < 100) yy += 2000;
          fecha = isoDate(new Date(yy, +mn[2] - 1, +mn[1]));
        }
      }
      if (!fecha) fecha = isoDate(ref);
      var match = findClienteByName(cliente);
      rows.push({
        zona: String(zona || "").trim(),
        citaRaw: String(citaRaw || "").trim(),
        clienteNombre: cliente,
        ov: String(ov || "").trim(),
        nota: String(nota || "").trim(),
        fecha: fecha,
        idCliente: match ? pad9Local(match.id || match.idCliente) : null,
        matchNombre: match ? (match.nombre || "") : null,
        matched: !!match
      });
    }
    return { rows: rows, errors: errors };
  }
  function makeKey(r) {
    if (r.idCliente) return r.idCliente;
    if (r.ov) return "OV:" + String(r.ov).replace(/\s+/g, "");
    return "N:" + normName(r.clienteNombre).replace(/\s+/g, "_").slice(0, 40);
  }
  function applyCitaRows(rows, replaceAll) {
    if (!window.estado) { toastSafe("App aún no lista"); return { ok: 0, fail: 0 }; }
    if (!estado.citas) estado.citas = new Map();
    if (replaceAll) estado.citas.clear();
    var ok = 0;
    var byAlertId = {};
    rows.forEach(function (r) {
      if (!r.clienteNombre && !r.ov) return;
      var key = makeKey(r);
      var prev = estado.citas.get(key);
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
      var primary = ovs[0];
      estado.citas.set(key, {
        fecha: primary.fecha,
        ov: primary.ov || r.ov || null,
        nota: primary.nota || r.nota || null,
        zona: primary.zona || r.zona || null,
        nombre: r.clienteNombre || (prev && prev.nombre) || null,
        ovs: ovs,
        fuente: "pegar-tabla"
      });
      ok++;
      if (r.idCliente && key !== r.idCliente) {
        var list = byAlertId[r.idCliente] || [];
        list.push(r);
        byAlertId[r.idCliente] = list;
      } else if (r.idCliente) {
        byAlertId[r.idCliente] = byAlertId[r.idCliente] || [r];
      }
    });
    Object.keys(byAlertId).forEach(function (id) {
      var list = byAlertId[id];
      list.sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
      var p = list[0];
      var existing = estado.citas.get(id);
      var ovs = list.map(function (x) {
        return { ov: x.ov, fecha: x.fecha, nota: x.nota, zona: x.zona, citaRaw: x.citaRaw, nombre: x.clienteNombre };
      });
      if (existing && existing.ovs) {
        ovs = existing.ovs.concat(ovs);
        var seen2 = {};
        ovs = ovs.filter(function (o) {
          var k = (o.ov || "") + "|" + (o.fecha || "") + "|" + (o.nota || "");
          if (seen2[k]) return false;
          seen2[k] = 1;
          return true;
        });
        ovs.sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
      }
      estado.citas.set(id, {
        fecha: ovs[0].fecha,
        ov: ovs[0].ov || null,
        nota: ovs[0].nota || null,
        zona: ovs[0].zona || null,
        nombre: p.clienteNombre || null,
        ovs: ovs,
        fuente: "pegar-tabla"
      });
    });
    if (typeof saveCitas === "function") saveCitas();
    renderCitasEnhanced();
    if (typeof renderMapas === "function") renderMapas();
    return { ok: ok, fail: 0 };
  }
  function renderCitasEnhanced() {
    var cont = el("listaCitas");
    if (!cont || !window.estado || !estado.citas) return;
    if (!estado.citas.size) {
      cont.innerHTML = '<div class="vacio">Sin fechas de cita todavía.</div>';
      return;
    }
    var items = [];
    var seenRow = {};
    estado.citas.forEach(function (v, id) {
      var m = estado.maestro && estado.maestro.get(id);
      var nombre = v.nombre || (m ? m.nombre : "") || "";
      var ovs = (v.ovs && v.ovs.length) ? v.ovs : [{ ov: v.ov, fecha: v.fecha, nota: v.nota, zona: v.zona, nombre: nombre }];
      ovs.forEach(function (o) {
        var rk = (o.ov || id) + "|" + (o.fecha || "") + "|" + (o.nota || "");
        if (seenRow[rk]) return;
        seenRow[rk] = 1;
        items.push({
          id: id,
          nombre: o.nombre || nombre,
          fecha: o.fecha || v.fecha,
          ov: o.ov || "",
          nota: o.nota || "",
          zona: o.zona || ""
        });
      });
    });
    items.sort(function (a, b) {
      var c = String(a.fecha).localeCompare(String(b.fecha));
      return c || String(a.nombre).localeCompare(String(b.nombre), "es");
    });
    cont.innerHTML = items.map(function (it) {
      var title = it.nombre || it.id;
      return '<div class="cita-item"><div style="min-width:0;flex:1;">' +
        '<div><strong>' + escapeHtml(title) + '</strong>' +
        (it.ov ? ' <span class="mono" style="color:var(--muted);font-size:12px;">' + escapeHtml(it.ov) + "</span>" : "") +
        "</div>" +
        '<div style="font-size:12px;color:var(--muted);">' + escapeHtml(it.fecha || "") +
        (it.zona ? " · Zona " + escapeHtml(it.zona) : "") + "</div>" +
        (it.nota ? '<div style="font-size:12px;color:#e5e5e5;margin-top:4px;line-height:1.35;">' + escapeHtml(it.nota) + "</div>" : "") +
        '</div><button type="button" data-id="' + escapeHtml(it.id) + '" class="del-cita" title="Eliminar">✕</button></div>';
    }).join("");
    cont.querySelectorAll(".del-cita").forEach(function (b) {
      b.onclick = function () {
        estado.citas.delete(b.dataset.id);
        if (typeof saveCitas === "function") saveCitas();
        renderCitasEnhanced();
        if (typeof renderMapas === "function") renderMapas();
      };
    });
  }
  window.__rutalogCitas = {
    parsePasteTable: parsePasteTable,
    applyCitaRows: applyCitaRows,
    renderCitasEnhanced: renderCitasEnhanced,
    escapeHtml: escapeHtml,
    pad9Local: pad9Local,
    toastSafe: toastSafe
  };
  if (typeof window.renderCitas === "function" && !window.renderCitas._enhanced) {
    window.renderCitas = function () {
      try { renderCitasEnhanced(); } catch (e) {}
    };
    window.renderCitas._enhanced = true;
  }
})();
