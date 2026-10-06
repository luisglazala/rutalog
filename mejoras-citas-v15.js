/* RUTALOG mejoras-citas v17 — parse columnas ZONA/CITA/CLIENTE/OV/NOTA
   Pegar tabla  ZONA · CITA · CLIENTE · ORDEN DE VENTA · NOTA  →  vista previa  →  Procesar y agregar.
   - Reporte de citas INDIVIDUAL (una fila por OV), con la NOTA.
   - El ID del cliente NO se muestra: se busca solo (por OV del programa o por nombre en el maestro)
     para que las alertas del core / auditoría / mapa encuentren al cliente.
   - Alertas contra la FECHA DEL PROGRAMA (por defecto la fecha del equipo; editable en el panel):
       · Planificación: aviso al agregar la parada + detalle en el popup del punto.
       · Auditoría de carga: columna Cita con color por línea (por OV) + resumen.
       · Mapa: anillo naranja + etiqueta con la fecha en clientes con cita posterior.
   Reemplaza a mejoras-citas v7/v9, mejoras-citas-futura y mejoras-citas-tabla (se desactivan por bandera). */
(function () {
  "use strict";
  if (window.__rutalogCitasV17) return;
  window.__rutalogCitasV17 = true;
  ["__rutalogCitasV13", "__rutalogCitasV12", "__rutalogCitasV11", "__rutalogCitasV10", "__rutalogCitasV9", "__rutalogCitasV8", "__rutalogCitasV7",
   "__rutalogCitasFuturaV1", "__rutalogCitasTablaV1", "__rutalogCitasTablaV2"
  ].forEach(function (f) { window[f] = true; });

  /* CSS inmediato: oculta alta manual aunque ensureUI tarde */
  (function () {
    if (document.getElementById("rutalog-citas-hide-manual")) return;
    var st = document.createElement("style");
    st.id = "rutalog-citas-hide-manual";
    st.textContent = [
      "#citaOV,#citaCliente,#citaFecha,#btnAddCita{display:none!important}",
      "#page-citas .form-row:has(#citaOV),#page-citas .form-row:has(#citaCliente),#page-citas .form-row:has(#btnAddCita){display:none!important}",
      "#page-citas .card > .form-row{display:none!important}"
    ].join("");
    (document.head || document.documentElement).appendChild(st);
  })();


  var LS_PROG = "rutalog_citas_prog";
  var DIAS = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
  var DIAS_C = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var MESES = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8,
    SEPTIEMBRE: 9, SETIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };

  /* ───────────── utilidades ───────────── */
  function E() {
    try { return typeof estado !== "undefined" ? estado : (window.estado || null); } catch (e) { return null; }
  }
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function stripAcc(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function norm(s) { return stripAcc(s).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
  function p2(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function parseISO(s) {
    var m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null;
  }
  function fmt(s) { var d = parseISO(s); return d ? p2(d.getDate()) + "/" + p2(d.getMonth() + 1) : String(s || "—"); }
  function fmtFull(s) {
    var d = parseISO(s);
    return d ? p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear() : String(s || "—");
  }
  function diffDias(a, b) { return Math.round((parseISO(a) - parseISO(b)) / 86400000); }
  function id9(x) {
    var s = String(x == null ? "" : x).replace(/\D/g, "");
    if (!s) return "";
    while (s.length < 9) s = "0" + s;
    return s.slice(-9);
  }
  function normOV(s) { var d = String(s || "").replace(/\D/g, ""); return d ? "OV-" + d : ""; }
  function ovDigits(s) { return String(s || "").replace(/\D/g, "").replace(/^0+/, ""); }
  function yearFix(y) { y = +y; return y < 100 ? 2000 + y : y; }

  function progISO() {
    try {
      var v = localStorage.getItem(LS_PROG);
      if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    } catch (e) {}
    return iso(new Date());
  }

  var avisoTimer = null;
  function avisar(msg, tipo) {
    try {
      var d = el("citasV10Aviso");
      if (!d) { d = document.createElement("div"); d.id = "citasV10Aviso"; document.body.appendChild(d); }
      d.className = "c10-aviso " + (tipo || "warn");
      d.textContent = msg;
      d.hidden = false;
      d.onclick = function () { d.hidden = true; };
      clearTimeout(avisoTimer);
      avisoTimer = setTimeout(function () { d.hidden = true; }, 9000);
    } catch (e) {}
  }
  function toastSafe(msg) {
    try { if (typeof toast === "function") { toast(msg); return; } } catch (e) {}
    avisar(msg, "ok");
  }

  /* ───────────── fechas ───────────── */
  function fechaDeNota(nota, ref) {
    var n = stripAcc(String(nota || "")).toUpperCase();
    var m = n.match(/ENTREGA(?:R|RSE)?[^0-9]{0,60}?(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{2,4})/);
    var d, mon;
    if (m) { mon = +m[2]; d = new Date(yearFix(m[3]), mon - 1, +m[1], 12); }
    else {
      m = n.match(/ENTREGA(?:R|RSE)?[^0-9]{0,60}?(?:LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\s+(\d{1,2})\s*[\/\-]\s*(\d{1,2})\b/);
      if (!m) return null;
      mon = +m[2]; d = new Date(ref.getFullYear(), mon - 1, +m[1], 12);
    }
    return d.getMonth() === mon - 1 ? iso(d) : null;
  }

  function fechaDeCita(cita, ref) {
    var c = norm(cita);
    if (!c) return { fecha: null };
    if (/INMEDIATA|URGENTE|\bHOY\b/.test(c)) return { fecha: iso(ref), inmediata: true };
    var wd = -1, i, k;
    for (i = 0; i < 7; i++) if (new RegExp("\\b" + DIAS[i] + "\\b").test(c)) { wd = i; break; }
    var raw = stripAcc(String(cita)).toUpperCase();
    var dm = raw.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{2,4}))?/);
    var cand, res;
    if (dm) {
      var day = +dm[1], mon = +dm[2];
      if (dm[3]) cand = new Date(yearFix(dm[3]), mon - 1, day, 12);
      else {
        cand = null;
        var tries = [0, 1, -1];
        for (k = 0; k < tries.length; k++) {
          var t = new Date(ref.getFullYear() + tries[k], mon - 1, day, 12);
          if (wd < 0 || t.getDay() === wd) { cand = t; break; }
        }
        if (!cand) cand = new Date(ref.getFullYear(), mon - 1, day, 12);
      }
      if (cand.getMonth() !== mon - 1) return { fecha: null };
      res = { fecha: iso(cand) };
      if (wd >= 0 && cand.getDay() !== wd) {
        res.aviso = "«" + String(cita).trim() + "»: " + DIAS_C[wd] + " no cae el " + fmtFull(res.fecha);
      }
      return res;
    }
    if (wd >= 0) {
      var dn = c.match(new RegExp("\\b" + DIAS[wd] + "\\s+(\\d{1,2})\\b"));
      if (dn) {
        var best = null, bd = 1e15;
        for (k = -1; k <= 1; k++) {
          var t2 = new Date(ref.getFullYear(), ref.getMonth() + k, +dn[1], 12);
          if (t2.getDate() !== +dn[1] || t2.getDay() !== wd) continue;
          var df = Math.abs(t2 - ref);
          if (df < bd) { bd = df; best = t2; }
        }
        if (best) return { fecha: iso(best) };
        return {
          fecha: iso(new Date(ref.getFullYear(), ref.getMonth(), +dn[1], 12)),
          aviso: "«" + String(cita).trim() + "»: el día no coincide con ese día de la semana"
        };
      }
      var add = (wd - ref.getDay() + 7) % 7;
      return { fecha: iso(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + add, 12)) };
    }
    return { fecha: null };
  }

  function resolverFecha(cita, nota, refISO) {
    var ref = parseISO(refISO) || new Date();
    var fc = fechaDeCita(cita, ref), fn = fechaDeNota(nota, ref);
    var out = { fecha: null, inmediata: !!fc.inmediata, aviso: fc.aviso || "" };
    if (fn) {
      out.fecha = fn;
      if (fc.fecha && fc.fecha !== fn && !out.aviso) {
        out.aviso = "La cita (" + fmt(fc.fecha) + ") no coincide con la nota (" + fmt(fn) + ")";
      }
    } else if (fc.fecha) out.fecha = fc.fecha;
    return out;
  }

  /* ───────────── nota y alertas ───────────── */
  function analizarNota(nota, refISO) {
    var n = stripAcc(String(nota || "")).toUpperCase();
    var out = {
      camionGrande: /CAMION(ES)?\s+GRANDE/.test(n),
      noParcial: /NO\s+PARCIAL/.test(n),
      completo: /\bCOMPLETO\b/.test(n) && !/NO\s+COMPLETO/.test(n),
      facturarLimite: null
    };
    var fm = n.match(/FACTURAR\s+(?:EN\s+)?ESTE\s+MES(?:\s*\(\s*([A-Z]+)\s+(\d{4})\s*\))?/);
    if (fm) {
      var ref = parseISO(refISO) || new Date();
      var mes = fm[1] && MESES[fm[1]] ? MESES[fm[1]] : ref.getMonth() + 1;
      var anio = fm[2] ? +fm[2] : ref.getFullYear();
      out.facturarLimite = iso(new Date(anio, mes, 0, 12)); // último día de ese mes
    }
    return out;
  }

  function evaluar(row, refISO) {
    var al = [], est, dias = 0;
    if (!row.fecha) est = "sinfecha";
    else if (row.fecha > refISO) est = "futura";
    else if (row.fecha === refISO) est = "hoy";
    else est = "vencida";
    if (row.fecha) dias = diffDias(row.fecha, refISO);
    if (est === "futura") al.push({ k: "futura", t: "Cita posterior: " + fmt(row.fecha) + " (+" + dias + " d)" });
    else if (est === "hoy") al.push({ k: "hoy", t: row.inmediata ? "Entrega inmediata" : "Entregar HOY" });
    else if (est === "vencida") al.push({ k: "vencida", t: "Cita vencida: " + fmt(row.fecha) });
    else al.push({ k: "sinfecha", t: "Sin fecha de cita" });
    var nt = analizarNota(row.nota, refISO);
    if (nt.facturarLimite) {
      if (nt.facturarLimite < refISO) al.push({ k: "vencida", t: "Plazo de facturar vencido (" + fmt(nt.facturarLimite) + ")" });
      else if (nt.facturarLimite === refISO) al.push({ k: "factura", t: "Facturar HOY (último día del mes)" });
      else al.push({ k: "factura", t: "Facturar antes del " + fmt(nt.facturarLimite) });
    }
    if (nt.camionGrande) al.push({ k: "info", t: "Camión grande" });
    if (nt.noParcial) al.push({ k: "info", t: "No parcial" });
    else if (nt.completo) al.push({ k: "info", t: "Completo" });
    if (row.aviso) al.push({ k: "aviso", t: row.aviso });
    return { estado: est, dias: dias, alertas: al };
  }

  /* ───────────── lectura de la tabla pegada ───────────── */
  var OV_RE = /\bOV[-\s]?\d{5,}\b/i;
  var CITA_ONLY_RE = /^(ENTREGA\s+INMEDIATA|(?:LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)(?:\s+\d{1,2}(?:\s*[\/\-]\s*\d{1,2}(?:\s*[\/\-]\s*\d{2,4})?)?)?|\d{1,2}\s*[\/\-]\s*\d{1,2}(?:\s*[\/\-]\s*\d{2,4})?)$/i;
  var CITA_HEAD_RE = /^(ENTREGA\s+INMEDIATA|(?:LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)(?:\s+\d{1,2}(?:\s*[\/\-]\s*\d{1,2}(?:\s*[\/\-]\s*\d{2,4})?)?)?|\d{1,2}\s*[\/\-]\s*\d{1,2}(?:\s*[\/\-]\s*\d{2,4})?)\s+(.+)$/i;
  var NOTA_HINT = /ENTREGA|COMPLETO|PARCIAL|FACTURA|PRODUCTO|LLEGAR|INMEDIATA|NO\s+PARCIAL|REALIZAR/i;

  function limpiarCliente(s) {
    return String(s || "").replace(/\s+Z\s*\/\s*\d+\s*$/i, "").replace(/\s{2,}/g, " ").trim();
  }
  function esOV(s) { return /^OV[-\s]?\d{5,}$/i.test(String(s || "").trim()); }
  function esZona(s) { return /^\d{1,4}$/.test(String(s || "").trim()); }
  function esCitaCelda(s) {
    var t = String(s || "").replace(/\s+/g, " ").trim();
    return !!(t && CITA_ONLY_RE.test(t));
  }
  function extraerOVDeCelda(s) {
    var m = String(s || "").match(OV_RE);
    return m ? normOV(m[0]) : "";
  }
  function esEncabezado(line) {
    var up = norm(line);
    return /^ZONA\b/.test(up) && /CITA/.test(up) && /(CLIENTE|ORDEN)/.test(up);
  }
  function filaFromParts(zona, cita, cliente, ov, nota, refISO) {
    cliente = limpiarCliente(cliente);
    if (cliente && (esOV(cliente) || /^\d{1,2}$/.test(cliente))) cliente = "";
    if (!ov && !cita && !cliente) return null;
    var fx = resolverFecha(cita, nota, refISO);
    return {
      zona: zona || "", citaRaw: cita || "", nombre: cliente || "", ov: ov || "", nota: nota || "",
      fecha: fx.fecha || "", inmediata: !!fx.inmediata, aviso: fx.aviso || ""
    };
  }

  function parseLine(line, refISO) {
    line = String(line || "").replace(/\u00a0/g, " ").replace(/\s+$/, "");
    if (!line.trim() || esEncabezado(line)) return null;
    var zona = "", cita = "", cliente = "", ov = "", nota = "", i;

    var cols = null;
    if (line.indexOf("\t") >= 0) {
      cols = line.split("\t").map(function (x) { return x.trim(); });
    } else if (/\s{2,}/.test(line)) {
      cols = line.split(/\s{2,}/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    if (cols) {
      while (cols.length && !cols[cols.length - 1]) cols.pop();
      var k = -1;
      for (i = 0; i < cols.length; i++) {
        if (esOV(cols[i]) || extraerOVDeCelda(cols[i])) { k = i; break; }
      }
      if (k >= 0) {
        ov = esOV(cols[k]) ? normOV(cols[k]) : extraerOVDeCelda(cols[k]);
        nota = cols.slice(k + 1).join(" ").trim();
        var left = cols.slice(0, k).filter(function (c) { return c !== ""; });
        if (left.length >= 3) {
          if (esZona(left[0])) { zona = left[0]; cita = left[1]; cliente = left.slice(2).join(" "); }
          else { cita = left[0]; cliente = left.slice(1).join(" "); }
        } else if (left.length === 2) {
          if (esZona(left[0]) && esCitaCelda(left[1])) { zona = left[0]; cita = left[1]; }
          else if (esZona(left[0])) { zona = left[0]; cliente = left[1]; }
          else if (esCitaCelda(left[0])) { cita = left[0]; cliente = left[1]; }
          else { cliente = left.join(" "); }
        } else if (left.length === 1) {
          if (esCitaCelda(left[0])) cita = left[0];
          else if (esZona(left[0])) zona = left[0];
          else cliente = left[0];
        }
        return filaFromParts(zona, cita, cliente, ov, nota, refISO);
      }
      if (cols.length >= 5) {
        return filaFromParts(cols[0], cols[1], cols[2], extraerOVDeCelda(cols[3]) || normOV(cols[3]), cols.slice(4).join(" "), refISO);
      }
    }

    var m = line.match(OV_RE), before = line, after = "";
    if (m) {
      ov = normOV(m[0]);
      before = line.slice(0, m.index).trim();
      after = line.slice(m.index + m[0].length).trim();
    }
    nota = after;
    if (before) {
      var zm = before.match(/^(\d{1,4})\s+(.*)$/);
      if (zm) { zona = zm[1]; before = zm[2].trim(); }
      var cm = before.match(CITA_HEAD_RE);
      if (cm) {
        cita = cm[1].replace(/\s+/g, " ").trim();
        cliente = cm[2].trim();
      } else if (CITA_ONLY_RE.test(before)) {
        cita = before.replace(/\s+/g, " ").trim();
      } else {
        cliente = before;
      }
    }
    return filaFromParts(zona, cita, cliente, ov, nota, refISO);
  }

  /** Pegado Excel con una celda por línea: ZONA / CITA / CLIENTE / OV / NOTA */
  function parseMultilineCells(lines, refISO) {
    var out = [], i = 0;
    while (i < lines.length) {
      if (esEncabezado(lines[i])) { i++; continue; }
      var zona = "", cita = "", cliente = "", ov = "", nota = "";

      if (esZona(lines[i])) { zona = lines[i]; i++; }
      if (i < lines.length && esCitaCelda(lines[i])) { cita = lines[i].replace(/\s+/g, " ").trim(); i++; }

      /* Cliente: líneas hasta el OV (suele ser 1) */
      while (i < lines.length && !esOV(lines[i]) && !extraerOVDeCelda(lines[i])) {
        if (esZona(lines[i]) && (cliente || cita || zona)) break;
        if (esCitaCelda(lines[i]) && cliente) break;
        if (NOTA_HINT.test(lines[i]) && cliente) break;
        cliente = cliente ? (cliente + " " + lines[i]) : lines[i];
        i++;
        if (cliente) break;
      }

      if (i < lines.length && (esOV(lines[i]) || extraerOVDeCelda(lines[i]))) {
        ov = esOV(lines[i]) ? normOV(lines[i]) : extraerOVDeCelda(lines[i]);
        i++;
      }

      /* Nota: hasta el próximo inicio de registro */
      while (i < lines.length) {
        if (esZona(lines[i])) break;
        if (esOV(lines[i])) break;
        if (esCitaCelda(lines[i]) && nota) break;
        if (esCitaCelda(lines[i]) && !nota && !NOTA_HINT.test(lines[i])) break;
        nota = nota ? (nota + " " + lines[i]) : lines[i];
        i++;
        if (nota && i < lines.length && esZona(lines[i])) break;
        if (nota && !NOTA_HINT.test(nota) && i < lines.length && !NOTA_HINT.test(lines[i])) {
          /* nombre suelto sin pinta de nota → dejar para el siguiente registro */
          if (!esZona(lines[i]) && !esOV(lines[i]) && !esCitaCelda(lines[i])) break;
        }
      }

      var row = filaFromParts(zona, cita, cliente, ov, nota, refISO);
      if (row) out.push(row);
      else i++;
    }
    return out;
  }

  function parseTable(text, refISO) {
    refISO = refISO || progISO();
    var rawLines = String(text || "").split(/\r\n|\n|\r/);
    var lines = [];
    for (var i = 0; i < rawLines.length; i++) {
      var ln = String(rawLines[i] || "").replace(/\u00a0/g, " ").replace(/\s+$/, "").trim();
      if (ln) lines.push(ln);
    }
    if (!lines.length) return [];

    var hasTab = lines.some(function (l) { return l.indexOf("\t") >= 0; });
    var ovLines = lines.filter(function (l) { return esOV(l) || /^OV[-\s]?\d{5,}/i.test(l); }).length;
    /* Si hay varios OV y casi ninguna línea con tab → celdas apiladas en vertical */
    if (!hasTab && ovLines >= 1 && lines.length > ovLines) {
      var multi = parseMultilineCells(lines, refISO);
      if (multi.length) return multi;
    }

    var out = [];
    lines.forEach(function (ln) {
      var r = parseLine(ln, refISO);
      if (r) out.push(r);
    });
    return out;
  }

  /* ───────────── almacenamiento (estado.citas = fuente única, sincroniza con GitHub) ───────────── */
  function getMap() {
    var e = E();
    if (!e) return null;
    if (!(e.citas instanceof Map)) {
      var map = new Map();
      try {
        var raw = localStorage.getItem("rutalog_citas");
        if (raw) { var o = JSON.parse(raw); Object.keys(o || {}).forEach(function (k) { map.set(k, o[k]); }); }
      } catch (er) {}
      e.citas = map;
    }
    return e.citas;
  }
  function persist() {
    try { if (typeof saveCitas === "function") { saveCitas(); return; } } catch (e) {}
    try {
      var o = {};
      getMap().forEach(function (v, k) { o[k] = v; });
      localStorage.setItem("rutalog_citas", JSON.stringify(o));
    } catch (e2) {}
  }
  function clientes() { var e = E(); return (e && e.clientesHoy) || []; }
  function nombreDe(id) {
    var e = E(), i, c, list = clientes();
    id = id9(id);
    if (!id) return "";
    for (i = 0; i < list.length; i++) if (id9(list[i].idCliente) === id) return list[i].nombre || "";
    try {
      if (e && e.maestro && e.maestro.get) {
        c = e.maestro.get(id) || e.maestro.get(String(+id));
        if (c && c.nombre) return c.nombre;
      }
    } catch (er) {}
    return "";
  }
  function claveFila(r) {
    var d = ovDigits(r.ov);
    return d ? "ov" + d : "n" + norm(r.nombre) + "|" + (r.fecha || "");
  }

  // Busca el ID del cliente: 1) por OV en el programa de hoy  2) por nombre (hoy y maestro)
  function resolverId(row) {
    var e = E();
    if (!e) return null;
    var dg = ovDigits(row.ov), list = clientes(), i, j;
    if (dg) {
      for (i = 0; i < list.length; i++) {
        var ovs = list[i].ovs || [];
        for (j = 0; j < ovs.length; j++) if (ovDigits(ovs[j].ov) === dg) return id9(list[i].idCliente);
      }
    }
    var q = norm(row.nombre);
    if (q.length < 4) return null;
    var best = null, sc = 0, tie = false;
    function consider(id, nombre, bonus) {
      var n = norm(nombre), s = 0;
      if (!n || !id9(id)) return;
      if (n === q) s = 100;
      else if (Math.min(n.length, q.length) >= 8 && (n.indexOf(q) >= 0 || q.indexOf(n) >= 0)) s = 80;
      if (!s) return;
      s += bonus;
      if (s > sc) { sc = s; best = id9(id); tie = false; }
      else if (s === sc && id9(id) !== best) tie = true;
    }
    list.forEach(function (c) { consider(c.idCliente, c.nombre, 5); });
    try {
      if (sc < 100 && e.maestro && e.maestro.forEach) {
        e.maestro.forEach(function (c) { consider(c.id || c.idCliente, c.nombre, 0); });
      }
    } catch (er) {}
    return sc >= 80 && !tie ? best : null;
  }

  function todasLasFilas() {
    var map = getMap(), out = [];
    if (!map) return out;
    map.forEach(function (v, key) {
      if (!v) return;
      var lista = Array.isArray(v.ovs) && v.ovs.length ? v.ovs
        : [{ ov: v.ov, fecha: v.fecha, nota: v.nota, zona: v.zona, citaRaw: v.citaRaw, nombre: v.nombre }];
      lista.forEach(function (o) {
        out.push({
          key: String(key), ov: o.ov || "", fecha: o.fecha || "", nota: o.nota || "", zona: o.zona || "",
          citaRaw: o.citaRaw || "", inmediata: !!o.inmediata, aviso: o.aviso || "",
          nombre: o.nombre || v.nombre || nombreDe(key) || String(key)
        });
      });
    });
    return out;
  }

  function registro(ovs, nombre) {
    ovs.sort(function (a, b) {
      return String(a.fecha || "9999").localeCompare(String(b.fecha || "9999")) || String(a.ov).localeCompare(String(b.ov));
    });
    var a = ovs[0];
    return { fecha: a.fecha || "", ov: a.ov || null, nota: a.nota || "", zona: a.zona || "",
      citaRaw: a.citaRaw || "", nombre: nombre || a.nombre || "", ovs: ovs, fuente: "pegar-tabla" };
  }
  function filasDeRegistro(v) {
    if (Array.isArray(v.ovs) && v.ovs.length) return v.ovs.slice();
    return [{ ov: v.ov || "", fecha: v.fecha || "", nota: v.nota || "", zona: v.zona || "",
      citaRaw: v.citaRaw || "", nombre: v.nombre || "" }];
  }

  // quita de todo el mapa las filas que cumplan pred(fila, clave)
  function quitarFilas(map, pred) {
    var cambios = [];
    map.forEach(function (v, key) {
      if (!v) return;
      var filas = filasDeRegistro(v), keep = filas.filter(function (o) {
        return !pred({ ov: o.ov, nombre: o.nombre || v.nombre, fecha: o.fecha }, String(key));
      });
      if (keep.length !== filas.length) cambios.push([key, keep, v.nombre]);
    });
    cambios.forEach(function (c) {
      if (!c[1].length) map.delete(c[0]); else map.set(c[0], registro(c[1], c[2]));
    });
  }

  function aplicar(rows, reemplazar, idForzado) {
    var map = getMap();
    if (!map) return 0;
    if (reemplazar) map.clear();
    rows.forEach(function (r) {
      var ck = claveFila(r);
      quitarFilas(map, function (o) { return claveFila(o) === ck; }); // evita duplicados
      var id = idForzado || resolverId(r);
      var key = id || (ovDigits(r.ov) ? "OV:" + normOV(r.ov) : "N:" + norm(r.nombre).replace(/ /g, "_").slice(0, 40));
      var prev = map.get(key);
      var ovs = prev ? filasDeRegistro(prev) : [];
      ovs.push({ ov: r.ov || "", fecha: r.fecha || "", nota: r.nota || "", zona: r.zona || "",
        citaRaw: r.citaRaw || "", nombre: r.nombre || "", inmediata: !!r.inmediata, aviso: r.aviso || "" });
      map.set(key, registro(ovs, (prev && prev.nombre) || r.nombre));
    });
    persist();
    return rows.length;
  }

  // Si el programa del día se cargó después de pegar las citas, liga las que quedaron sin ID
  function reindexar() {
    var map = getMap();
    if (!map || !clientes().length) return false;
    var pend = [];
    map.forEach(function (v, key) { if (!/^\d{9}$/.test(String(key))) pend.push(key); });
    var movidas = [];
    pend.forEach(function (key) {
      var v = map.get(key);
      if (!v) return;
      filasDeRegistro(v).forEach(function (o) {
        var row = { ov: o.ov, nombre: o.nombre || v.nombre, fecha: o.fecha, nota: o.nota, zona: o.zona,
          citaRaw: o.citaRaw, inmediata: o.inmediata, aviso: o.aviso };
        var id = resolverId(row);
        if (id) movidas.push({ row: row, id: id });
      });
    });
    if (!movidas.length) return false;
    movidas.forEach(function (mv) {
      var ck = claveFila(mv.row);
      quitarFilas(map, function (o) { return claveFila(o) === ck; });
      var prev = map.get(mv.id), ovs = prev ? filasDeRegistro(prev) : [];
      ovs.push({ ov: mv.row.ov || "", fecha: mv.row.fecha || "", nota: mv.row.nota || "", zona: mv.row.zona || "",
        citaRaw: mv.row.citaRaw || "", nombre: mv.row.nombre || "", inmediata: !!mv.row.inmediata, aviso: mv.row.aviso || "" });
      map.set(mv.id, registro(ovs, (prev && prev.nombre) || mv.row.nombre));
    });
    persist();
    return true;
  }

  function borrarFila(ck) {
    var map = getMap();
    if (!map) return;
    quitarFilas(map, function (o) { return claveFila(o) === ck; });
    persist();
  }

  /* ───────────── consulta por cliente / línea ───────────── */
  function indice() {
    var rows = todasLasFilas(), porId = {}, porOV = {};
    rows.forEach(function (r) {
      if (/^\d{9}$/.test(r.key)) (porId[r.key] = porId[r.key] || []).push(r);
      var d = ovDigits(r.ov);
      if (d) (porOV[d] = porOV[d] || []).push(r);
    });
    return { rows: rows, porId: porId, porOV: porOV };
  }

  function infoCliente(idx, cli, ref) {
    var seen = {}, rows = [];
    function add(list) {
      (list || []).forEach(function (r) {
        var k = claveFila(r);
        if (!seen[k]) { seen[k] = 1; rows.push(r); }
      });
    }
    add(idx.porId[id9(cli.idCliente)]);
    var ovs = cli.ovs || [];
    ovs.forEach(function (o) { add(idx.porOV[ovDigits(o.ov)]); });
    if (!rows.length) return null;
    var evs = rows.map(function (r) { return { row: r, ev: evaluar(r, ref) }; });
    var nF = 0, nH = 0, nV = 0, minF = "";
    evs.forEach(function (x) {
      if (x.ev.estado === "futura") { nF++; if (!minF || x.row.fecha < minF) minF = x.row.fecha; }
      else if (x.ev.estado === "hoy") nH++;
      else if (x.ev.estado === "vencida") nV++;
    });
    var sinCita = ovs.filter(function (o) {
      var d = ovDigits(o.ov);
      return d && !rows.some(function (r) { return ovDigits(r.ov) === d; });
    }).length;
    var est;
    if (nF && nF === evs.length && !sinCita) est = "futura";
    else if (nF) est = "mixta";
    else if (nV) est = "vencida";
    else if (nH) est = "hoy";
    else est = "sinfecha";
    return { estado: est, items: evs, minFutura: minF, sinCita: sinCita };
  }

  /* ───────────── MAPA ───────────── */
  function marcarMapa() {
    var e = E();
    if (!e || typeof L === "undefined" || !clientes().length) return;
    var idx = indice();
    if (!idx.rows.length) return;
    var ref = progISO(), porId = {};
    clientes().forEach(function (c) { porId[String(c.idCliente)] = c; });
    [e.markersPanel, e.markersRutas].forEach(function (mm) {
      if (!mm || typeof mm.forEach !== "function") return;
      mm.forEach(function (marker, id) {
        var cli = porId[String(id)];
        if (!cli || !marker || typeof marker.setIcon !== "function") return;
        var info = infoCliente(idx, cli, ref);
        if (!info || (info.estado !== "futura" && info.estado !== "mixta" && info.estado !== "vencida")) return;
        var st = { color: "#64748b", texto: "", sz: 24 };
        try { if (typeof estiloCli === "function") st = estiloCli(cli) || st; } catch (er) {}
        var color = st.color;
        if (color === "#64748b") color = info.estado === "vencida" ? "#dc2626" : "#ea580c";
        var t = Math.max(st.sz || 22, 26) + 4;
        var badge = info.estado === "vencida" ? "VENC." : (info.estado === "mixta" ? "⚠ " : "") + (info.estado === "vencida" ? "" : fmt(info.minFutura));
        var hasNum = st.texto != null && String(st.texto).length > 0;
        var html = '<div class="rutalog-pin-wrap c10-pin c10-' + info.estado + '" style="--pin-bg:' + color + '">' +
          '<div class="rutalog-pin-dot' + (hasNum ? " is-num" : "") + '">' + (hasNum ? esc(st.texto) : "") + "</div>" +
          '<span class="c10-pin-badge">' + esc(badge) + "</span></div>";
        marker.setIcon(L.divIcon({ className: "rutalog-pin", html: html, iconSize: [t, t],
          iconAnchor: [t / 2, t / 2], popupAnchor: [0, -t / 2] }));
      });
    });
  }

  function popupConCita(h, cli) {
    var idx = indice();
    if (!idx.rows.length) return h;
    var info = infoCliente(idx, cli, progISO());
    if (!info) return h;
    var col = { futura: "#ea580c", mixta: "#ea580c", vencida: "#dc2626", hoy: "#15803d", sinfecha: "#737373" };
    var b = '<div class="popup-l" style="margin-top:4px"><b>Citas</b> · programa ' + esc(fmt(progISO())) + "</div>" +
      info.items.map(function (x) {
        var c = col[x.ev.estado] || "#737373";
        return '<div class="popup-l" style="color:' + c + ';font-weight:600">📅 ' + esc(x.row.fecha ? fmt(x.row.fecha) : "s/f") +
          (x.row.ov ? " · " + esc(x.row.ov) : "") + " · " + esc(x.ev.alertas.map(function (a) { return a.t; }).join(" · ")) + "</div>" +
          (x.row.nota ? '<div class="popup-l" style="font-size:11px;opacity:.85">' + esc(x.row.nota) + "</div>" : "");
      }).join("") +
      (info.sinCita ? '<div class="popup-l" style="font-size:11px">+' + info.sinCita + " OV sin cita</div>" : "");
    var re = /<div class="popup-l">Cita:[\s\S]*?<\/div>/;
    if (re.test(h)) return h.replace(re, function () { return b; });
    var i = h.lastIndexOf('<div class="popup-a">');
    return i >= 0 ? h.slice(0, i) + b + h.slice(i) : h + b;
  }

  /* ───────────── PLANIFICACIÓN: aviso al agregar parada ───────────── */
  function alertaPlanificacion(cli) {
    var e = E();
    if (!cli || !e) return;
    if ((e.viajeActual || []).some(function (p) { return p.idCliente === cli.idCliente; })) return;
    var idx = indice();
    if (!idx.rows.length) return;
    var ref = progISO(), info = infoCliente(idx, cli, ref);
    if (!info) return;
    var rel = info.items.filter(function (x) {
      var k = x.ev.estado;
      return k === "futura" || k === "vencida" ||
        x.ev.alertas.some(function (a) { return a.k === "factura" || (a.k === "info" && /Camión/.test(a.t)); });
    });
    if (!rel.length) return;
    var msg = "⚠ " + (cli.nombre || "Cliente") + " — " + rel.map(function (x) {
      return (x.row.ov ? x.row.ov + ": " : "") + x.ev.alertas.map(function (a) { return a.t; }).join(", ");
    }).join(" | ");
    if (info.estado === "mixta") msg += " (hay OV para hoy y OV posteriores)";
    avisar(msg.length > 260 ? msg.slice(0, 257) + "…" : msg, info.estado === "futura" || info.estado === "mixta" ? "warn" : "info");
  }

  /* ───────────── AUDITORÍA DE CARGA ───────────── */
  var ICONO = { futura: "⏳", hoy: "✔", vencida: "⚠", sinfecha: "—" };
  function decorarAuditoria() {
    var tb = el("auditTbody"), e = E();
    if (!tb || !e || !Array.isArray(e.auditLineas)) return;
    var ov = el("auditOverlay");
    if (ov && ov.hidden) return;
    var idx = indice();
    if (!idx.rows.length) { quitarBannerAudit(); return; }
    var ref = progISO(), nF = 0, nV = 0, nL = 0;
    tb.querySelectorAll("tr[data-idx]").forEach(function (tr) {
      var ln = e.auditLineas[Number(tr.dataset.idx)];
      var td = tr.querySelector("td.audit-td-cita");
      if (!ln || !td) return;
      var rows = idx.porOV[ovDigits(ln.ov)], otra = false;
      if (!rows || !rows.length) { rows = idx.porId[id9(ln.idCliente)]; otra = true; }
      var sig = ref + "|" + (otra ? "o" : "d") + "|" + (rows ? rows.map(claveFila).join(",") : "") + "|" + (rows && rows[0] ? rows[0].fecha + rows[0].nota : "");
      if (rows && rows.length) {
        var evs = rows.map(function (r) { return { r: r, ev: evaluar(r, ref) }; });
        var peor = evs.filter(function (x) { return x.ev.estado === "futura"; })[0] ||
          evs.filter(function (x) { return x.ev.estado === "vencida"; })[0] || evs[0];
        var est = peor.ev.estado;
        if (tr.dataset.c10sig !== sig) {
          tr.dataset.c10sig = sig;
          // otra = esta OV no tiene cita propia; solo se avisa (tenue) que el cliente tiene cita en otra OV
          td.textContent = otra ? "~ " + fmt(peor.r.fecha)
            : ICONO[est] + " " + (est === "hoy" ? "HOY" : fmt(peor.r.fecha));
          td.title = evs.map(function (x) {
            return (x.r.ov || "") + " · " + x.ev.alertas.map(function (a) { return a.t; }).join(" · ") + (x.r.nota ? "\n" + x.r.nota : "");
          }).join("\n") + (otra ? "\n(esta OV no tiene cita propia; la cita es de otra OV del mismo cliente)" : "");
          td.className = "audit-td-cita mono c10-" + (otra ? "otra" : est);
          tr.classList.remove("c10-row-futura", "c10-row-vencida", "c10-row-hoy");
          if (!otra && (est === "futura" || est === "vencida" || est === "hoy")) tr.classList.add("c10-row-" + est);
        }
        if (!otra) {
          nL++;
          if (est === "futura") nF++;
          else if (est === "vencida") nV++;
        }
      }
    });
    var table = tb.closest ? tb.closest("table") : null;
    if (!table || !table.parentNode) return;
    var b = el("citasAuditBanner");
    if (!nF && !nV) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("div"); b.id = "citasAuditBanner"; table.parentNode.insertBefore(b, table); }
    b.textContent = "⚠ " + (nF ? nF + " línea(s) con cita POSTERIOR al programa del " + fmt(ref) : "") +
      (nF && nV ? " · " : "") + (nV ? nV + " con cita vencida" : "") + " — no deberían cargarse hoy salvo que la nota lo indique.";
  }
  function quitarBannerAudit() { var b = el("citasAuditBanner"); if (b) b.remove(); }

  /* ───────────── PANEL DE CITAS (UI) ───────────── */
  function injectCSS() {
    if (el("rutalog-citas-v10-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-citas-v10-css";
    st.textContent = [
      "#citasV10Box{margin:12px 0 14px;padding:14px 16px;border:1px dashed #333;border-radius:12px;background:#121212}",
      "#citasV10Box .c10-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:6px}",
      "#citasV10Box .c10-title{font-size:14px;font-weight:700;color:#fafafa}",
      "#citasV10Box .c10-prog{font-size:12px;color:#a3a3a3;display:flex;gap:6px;align-items:center}",
      "#citasV10Box .c10-prog input{background:#0f0f0f;border:1px solid #2a2a2a;color:#fafafa;border-radius:8px;padding:4px 8px;font-size:12px}",
      "#citasV10Box .c10-hint{margin:0 0 8px;font-size:12.5px;color:#a3a3a3;line-height:1.45}",
      "#citasV10Area{width:100%;box-sizing:border-box;min-height:92px;max-height:200px;padding:10px 12px;border-radius:10px;border:1px solid #2a2a2a;background:#0f0f0f;color:#fafafa;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.4;resize:vertical;white-space:pre}",
      "#citasV10Box .c10-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}",
      "#citasV10Status{font-size:12.5px;color:#a3a3a3}",
      ".c10-wrap{margin-top:12px;border:1px solid #232323;border-radius:10px;overflow:auto;max-height:min(46vh,420px);background:#0c0c0c}",
      "table.c10-tabla{width:100%;border-collapse:collapse;font-size:12.5px;min-width:820px}",
      "table.c10-tabla thead th{position:sticky;top:0;z-index:2;background:#1a1a1a;color:#a3a3a3;text-align:center;padding:8px 10px;font-weight:700;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;border:1px solid #2a2a2a;border-bottom:1px solid #333}",
      "table.c10-tabla thead th.c10-th-al{background:#1a1a1a;color:#fbbf24}",
      "table.c10-tabla tbody td{padding:8px 10px;border-bottom:1px solid #1f1f1f;border-right:1px solid #1a1a1a;color:#e5e5e5;vertical-align:middle}",
      "table.c10-tabla td.c10-zona{font-family:ui-monospace,monospace;color:#a3a3a3;text-align:center;width:54px}",
      "table.c10-tabla td.c10-cita{font-weight:700;white-space:nowrap;color:#fbbf24}",
      "table.c10-tabla td.c10-cita small{display:block;font-weight:500;color:#a3a3a3;font-size:11px}",
      "table.c10-tabla td.c10-cli{font-weight:600;color:#fafafa}",
      "table.c10-tabla td.c10-ov{font-family:ui-monospace,monospace;color:#93c5fd;white-space:nowrap}",
      "table.c10-tabla td.c10-nota{font-weight:700;color:#fafafa;max-width:340px;word-break:break-word}",
      "table.c10-tabla tr.c10-futura td:first-child{border-left:4px solid #f97316}",
      "table.c10-tabla tr.c10-hoy td:first-child{border-left:4px solid #22c55e}",
      "table.c10-tabla tr.c10-vencida td:first-child{border-left:4px solid #ef4444}",
      "table.c10-tabla tr.c10-sinfecha td:first-child{border-left:4px solid #525252}",
      "table.c10-tabla tr.c10-futura td.c10-cita{color:#fdba74;background:rgba(249,115,22,.08)}",
      "table.c10-tabla tr.c10-vencida td.c10-cita{color:#fca5a5}",
      "table.c10-tabla tr.c10-hoy td.c10-cita{color:#86efac}",
      ".c10-chip{display:inline-block;margin:1px 4px 1px 0;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}",
      ".c10-chip.futura{background:rgba(249,115,22,.18);color:#fdba74}",
      ".c10-chip.hoy{background:rgba(34,197,94,.16);color:#86efac}",
      ".c10-chip.vencida{background:rgba(239,68,68,.18);color:#fca5a5}",
      ".c10-chip.factura{background:rgba(234,179,8,.18);color:#fde047}",
      ".c10-chip.info{background:rgba(96,165,250,.16);color:#93c5fd}",
      ".c10-chip.aviso,.c10-chip.sinfecha{background:rgba(163,163,163,.18);color:#d4d4d4}",
      "button.c10-del{background:transparent;border:1px solid #333;color:#737373;border-radius:6px;width:26px;height:26px;cursor:pointer}",
      "button.c10-del:hover{background:#3f1d1d;color:#f87171;border-color:#7f1d1d}",
      "#citasV10Resumen{margin:10px 0 0;font-size:12.5px;color:#a3a3a3}",
      "#citasV10Resumen b{color:#fafafa}",
      ".c10-aviso{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(92vw,720px);padding:12px 18px;border-radius:12px;font-size:13.5px;font-weight:700;line-height:1.35;z-index:999999;box-shadow:0 10px 30px rgba(0,0,0,.5);cursor:pointer}",
      ".c10-aviso[hidden]{display:none}",
      ".c10-aviso.warn{background:#9a3412;color:#fff}.c10-aviso.info{background:#854d0e;color:#fff}.c10-aviso.ok{background:#166534;color:#fff}",
      "/* mapa */",
      ".c10-pin .c10-pin-badge{position:absolute;top:-12px;right:-16px;padding:1px 5px;border-radius:7px;font-size:9.5px;font-weight:800;line-height:1.3;color:#fff;background:#ea580c;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.5);pointer-events:none}",
      ".c10-pin.c10-vencida .c10-pin-badge{background:#dc2626}",
      ".c10-pin.c10-futura .rutalog-pin-dot{box-shadow:0 0 0 3px #f97316,0 0 0 6px rgba(249,115,22,.35),0 2px 8px rgba(0,0,0,.4)}",
      ".c10-pin.c10-mixta .rutalog-pin-dot{box-shadow:0 0 0 3px #facc15,0 0 0 6px rgba(249,115,22,.35),0 2px 8px rgba(0,0,0,.4)}",
      ".c10-pin.c10-vencida .rutalog-pin-dot{box-shadow:0 0 0 3px #ef4444,0 0 0 6px rgba(239,68,68,.3),0 2px 8px rgba(0,0,0,.4)}",
      "/* ocultar alta manual de citas */",
      "#citaOV,#citaCliente,#citaFecha,#btnAddCita{display:none!important}",
      "label[for=citaOV],label[for=citaCliente],label[for=citaFecha]{display:none!important}",
      "#page-citas .form-row:has(#citaOV),#page-citas .form-row:has(#btnAddCita){display:none!important}",
      "/* auditoría */",
      "td.audit-td-cita.c10-futura{color:#fdba74!important;font-weight:800;background:rgba(249,115,22,.16)!important}",
      "td.audit-td-cita.c10-vencida{color:#fca5a5!important;font-weight:800;background:rgba(239,68,68,.16)!important}",
      "td.audit-td-cita.c10-hoy{color:#86efac!important;font-weight:700}",
      "td.audit-td-cita.c10-otra{color:#a3a3a3!important;font-style:italic}",
      "tr.c10-row-futura:not(.audit-row-tope) td{background:rgba(249,115,22,.10)}",
      "tr.c10-row-vencida:not(.audit-row-tope) td{background:rgba(239,68,68,.10)}",
      "#citasAuditBanner{margin:0 0 8px;padding:9px 12px;border-radius:8px;background:rgba(249,115,22,.16);color:#fdba74;font-size:12.5px;font-weight:700;border:1px solid rgba(249,115,22,.5)}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function chipsHTML(ev, extra) {
    var h = ev.alertas.map(function (a) { return '<span class="c10-chip ' + a.k + '">' + esc(a.t) + "</span>"; }).join("");
    return h + (extra || "");
  }
  function enPrograma(row, idx) {
    if (!clientes().length) return true; // sin programa cargado no se puede saber
    var d = ovDigits(row.ov), i, list = clientes(), j;
    if (/^\d{9}$/.test(row.key || "")) {
      for (i = 0; i < list.length; i++) if (id9(list[i].idCliente) === row.key) return true;
    }
    if (d) {
      for (i = 0; i < list.length; i++) {
        var ovs = list[i].ovs || [];
        for (j = 0; j < ovs.length; j++) if (ovDigits(ovs[j].ov) === d) return true;
      }
    }
    return false;
  }

  function tablaHTML(items, conBorrar) {
    return '<table class="c10-tabla"><thead><tr><th>ZONA</th><th>CITA</th><th>CLIENTE</th><th>ORDEN DE VENTA</th><th>NOTA</th>' +
      '<th class="c10-th-al">ALERTA</th>' + (conBorrar ? '<th class="c10-th-al"></th>' : "") + "</tr></thead><tbody>" +
      items.map(function (x) {
        var r = x.row, ev = x.ev;
        return '<tr class="c10-' + ev.estado + '">' +
          '<td class="c10-zona">' + esc(r.zona || "—") + "</td>" +
          '<td class="c10-cita">' + esc(r.citaRaw || (r.fecha ? fmtFull(r.fecha) : "—")) +
          (r.fecha ? "<small>" + esc(fmtFull(r.fecha)) + "</small>" : "") + "</td>" +
          '<td class="c10-cli">' + esc(r.nombre) + "</td>" +
          '<td class="c10-ov">' + esc(r.ov || "—") + "</td>" +
          '<td class="c10-nota">' + esc(r.nota || "—") + "</td>" +
          "<td>" + chipsHTML(ev, x.extra) + "</td>" +
          (conBorrar ? '<td><button type="button" class="c10-del" data-ck="' + esc(claveFila(r)) + '" title="Quitar esta cita">×</button></td>' : "") +
          "</tr>";
      }).join("") + "</tbody></table>";
  }

  function renderReporte() {
    var cont = el("listaCitas");
    if (!cont || !getMap()) return;
    var ref = progISO(), idx = indice();
    var items = idx.rows.map(function (r) {
      var x = { row: r, ev: evaluar(r, ref), extra: "" };
      if (!enPrograma(r, idx)) x.extra = '<span class="c10-chip aviso">Sin match en el programa cargado</span>';
      return x;
    });
    items.sort(function (a, b) {
      return String(a.row.fecha || "9999").localeCompare(String(b.row.fecha || "9999")) ||
        String(a.row.nombre).localeCompare(String(b.row.nombre), "es");
    });
    var res = el("citasV10Resumen");
    if (!items.length) {
      cont.innerHTML = '<div class="vacio">Sin fechas de cita todavía. Pega la tabla arriba y pulsa «Procesar y agregar».</div>';
      if (res) res.textContent = "";
      return;
    }
    var cnt = { futura: 0, hoy: 0, vencida: 0, sinfecha: 0 };
    items.forEach(function (x) { cnt[x.ev.estado]++; });
    if (res) {
      res.innerHTML = "<b>" + items.length + "</b> citas · programa del <b>" + esc(fmtFull(ref)) + "</b>: " +
        '<span class="c10-chip hoy">' + cnt.hoy + " hoy</span>" +
        '<span class="c10-chip futura">' + cnt.futura + " posteriores</span>" +
        (cnt.vencida ? '<span class="c10-chip vencida">' + cnt.vencida + " vencidas</span>" : "") +
        (cnt.sinfecha ? '<span class="c10-chip sinfecha">' + cnt.sinfecha + " sin fecha</span>" : "");
    }
    cont.innerHTML = '<div class="c10-wrap">' + tablaHTML(items, true) + "</div>";
    cont.querySelectorAll("button.c10-del").forEach(function (b) {
      b.onclick = function () {
        borrarFila(b.getAttribute("data-ck"));
        renderTodo();
        redibujarMapas();
      };
    });
  }

  function redibujarMapas() { try { if (typeof window.renderMapas === "function") window.renderMapas(); } catch (e) {} }
  function renderTodo() {
    try { reindexar(); } catch (e) {}
    try { renderReporte(); } catch (e2) {}
    try { previewPegado(); } catch (e3) {}
  }

  function previewPegado() {
    var ta = el("citasV10Area"), pv = el("citasV10Preview"), st = el("citasV10Status");
    if (!ta || !pv) return;
    var ref = progISO(), rows = parseTable(ta.value, ref);
    if (!ta.value.trim()) { pv.hidden = true; pv.innerHTML = ""; if (st) st.textContent = ""; return; }
    if (!rows.length) {
      pv.hidden = true; pv.innerHTML = "";
      if (st) st.textContent = "No se leyó ninguna fila — revisa que vengan ZONA · CITA · CLIENTE · OV · NOTA.";
      return;
    }
    var items = rows.map(function (r) { return { row: r, ev: evaluar(r, ref), extra: "" }; });
    if (st) st.textContent = rows.length + " fila(s) listas — pulsa «Procesar y agregar».";
    pv.hidden = false;
    pv.innerHTML = '<div class="c10-wrap">' + tablaHTML(items, false) + "</div>";
  }

  function procesar(reemplazar) {
    var ta = el("citasV10Area");
    if (!ta || !ta.value.trim()) { avisar("Pega primero la tabla en el cuadro.", "info"); return; }
    var rows = parseTable(ta.value, progISO());
    if (!rows.length) { avisar("No se pudo leer ninguna fila de cita.", "info"); return; }
    if (reemplazar && !window.confirm("¿Reemplazar TODAS las citas guardadas por las del cuadro?")) return;
    var n = aplicar(rows, !!reemplazar);
    ta.value = "";
    var st = el("citasV10Status");
    if (st) st.textContent = n + " cita(s) " + (reemplazar ? "reemplazadas" : "agregadas") + ".";
    renderTodo();
    redibujarMapas();
    var ref = progISO(), f = rows.filter(function (r) { return r.fecha && r.fecha > ref; }).length;
    toastSafe(n + " cita(s) " + (reemplazar ? "reemplazadas" : "agregadas") + (f ? " · " + f + " posterior(es) al " + fmt(ref) : ""));
  }

  function agregarManual() {
    var inOV = el("citaOV"), inCli = el("citaCliente"), inF = el("citaFecha");
    if (!inF) return;
    var ov = inOV ? inOV.value.trim() : "", q = inCli ? inCli.value.trim() : "", f = inF.value;
    if (!f) { avisar("La fecha de la cita es obligatoria.", "info"); return; }
    if (!q && !ov) { avisar("Escribe el cliente (nombre o ID) o la orden de venta.", "info"); return; }
    var id = null, nombre = q;
    if (/^\d{5,9}$/.test(q)) { id = id9(q); nombre = nombreDe(id) || q; }
    if (!nombre && ov) {
      var d = ovDigits(ov);
      clientes().forEach(function (c) { if (!nombre && (c.ovs || []).some(function (o) { return ovDigits(o.ov) === d; })) nombre = c.nombre; });
    }
    aplicar([{ ov: normOV(ov), fecha: f, nota: "", zona: "", citaRaw: "", nombre: nombre || normOV(ov), inmediata: false, aviso: "" }], false, id);
    if (inOV) inOV.value = "";
    if (inCli) inCli.value = "";
    inF.value = "";
    renderTodo();
    redibujarMapas();
    toastSafe("Cita agregada");
  }

  function hideManualCitasForm() {
    ["citaOV", "citaCliente", "citaFecha", "btnAddCita"].forEach(function (id) {
      var n = el(id);
      if (!n) return;
      n.style.display = "none";
      n.setAttribute("hidden", "");
      var row = n.closest(".form-row");
      if (row) { row.style.display = "none"; row.setAttribute("hidden", ""); }
    });
    try {
      var page = el("page-citas");
      if (page) {
        page.querySelectorAll(".form-row").forEach(function (row) {
          if (row.querySelector("#citaOV, #citaCliente, #citaFecha, #btnAddCita")) {
            row.style.display = "none";
            row.setAttribute("hidden", "");
          }
        });
      }
    } catch (e) {}
  }

  function ensureUI() {
    injectCSS();
    hideManualCitasForm();
    var lista = el("listaCitas");
    if (!lista) return;
    ["citaPasteBox", "citasPasteBox", "citasListEnhanced"].forEach(function (id) {
      var o = el(id); if (o) o.remove();
    });
    var inCli = el("citaCliente");
    if (inCli && !inCli._c10) {
      inCli._c10 = true;
      inCli.placeholder = "Cliente (nombre o ID)";
      inCli.removeAttribute("maxlength");
      inCli.setAttribute("inputmode", "text");
    }
    if (el("citasV10Box")) return;
    var box = document.createElement("div");
    box.id = "citasV10Box";
    box.innerHTML =
      '<div class="c10-head"><span class="c10-title">Pegar tabla de citas</span>' +
      '<label class="c10-prog">Fecha del programa <input type="date" id="citasProg" title="Vacío = fecha de hoy del equipo"></label></div>' +
      '<p class="c10-hint">Copia desde Excel <b>ZONA · CITA · CLIENTE · ORDEN DE VENTA · NOTA</b> y pega aquí. ' +
      "Cada fila queda individual (una por OV); el ID se busca solo en el maestro.</p>" +
      '<textarea id="citasV10Area" rows="4" spellcheck="false" placeholder="Pega aquí la tabla (Ctrl+V)…"></textarea>' +
      '<div class="c10-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" id="citasV10Apply">Procesar y agregar</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="citasV10Replace">Reemplazar todas</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="citasV10Clear">Limpiar caja</button>' +
      '<span id="citasV10Status"></span></div>' +
      '<div id="citasV10Preview" hidden></div>';
    lista.parentNode.insertBefore(box, lista);
    var res = document.createElement("div");
    res.id = "citasV10Resumen";
    lista.parentNode.insertBefore(res, lista);
    var ta = el("citasV10Area");
    ta.addEventListener("input", previewPegado);
    ta.addEventListener("paste", function () { setTimeout(previewPegado, 30); });
    el("citasV10Apply").onclick = function (ev) { ev.preventDefault(); procesar(false); };
    el("citasV10Replace").onclick = function (ev) { ev.preventDefault(); procesar(true); };
    el("citasV10Clear").onclick = function (ev) {
      ev.preventDefault(); ta.value = ""; previewPegado();
    };
    var pf = el("citasProg");
    pf.value = progISO();
    pf.onchange = function () {
      try { if (pf.value) localStorage.setItem(LS_PROG, pf.value); else localStorage.removeItem(LS_PROG); } catch (e) {}
      if (!pf.value) pf.value = progISO();
      renderTodo();
      redibujarMapas();
    };
    renderTodo();
  }

  /* ───────────── enganches al core (una sola vez cada uno) ───────────── */
  var hooked = {};
  function hookFn(name, factory) {
    if (hooked[name] || typeof window[name] !== "function") return;
    hooked[name] = true;
    window[name] = factory(window[name]);
  }
  function installHooks() {
    hookFn("renderMapas", function (orig) {
      return function () {
        var r = orig.apply(this, arguments);
        try { reindexar(); marcarMapa(); } catch (e) {}
        return r;
      };
    });
    hookFn("popupHtml", function (orig) {
      return function (cli) {
        var h = orig.apply(this, arguments);
        try { h = popupConCita(h, cli); } catch (e) {}
        return h;
      };
    });
    hookFn("agregarParada", function (orig) {
      return function (cli) {
        try { alertaPlanificacion(cli); } catch (e) {}
        return orig.apply(this, arguments);
      };
    });
    if (!hooked.renderCitas && typeof window.renderCitas === "function") {
      hooked.renderCitas = true;
      window.renderCitas = function () { renderTodo(); };
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.id === "btnAddCita") { ev.preventDefault(); ev.stopImmediatePropagation(); agregarManual(); }
    }, true);
  }

  function tick() {
    try {
      var e = E();
      if (e && window.estado !== e) window.estado = e; // el core usa const: lo exponemos para los módulos que miran window.estado
    } catch (er) {}
    try { ensureUI(); } catch (e1) {}
    try { installHooks(); } catch (e2) {}
    try { decorarAuditoria(); } catch (e3) {}
  }

  window.__citasV10Test = {
    parseTable: parseTable, parseLine: parseLine, resolverFecha: resolverFecha, evaluar: evaluar,
    aplicar: aplicar, indice: indice, infoCliente: infoCliente, marcarMapa: marcarMapa,
    decorarAuditoria: decorarAuditoria, renderReporte: renderReporte, ensureUI: ensureUI,
    popupConCita: popupConCita, alertaPlanificacion: alertaPlanificacion, installHooks: installHooks,
    tick: tick, progISO: progISO, resolverId: resolverId, reindexar: reindexar
  };

  if (typeof document !== "undefined") {
    setTimeout(tick, 300);
    setTimeout(tick, 1200);
    setTimeout(tick, 3000);
    /* Scheduler: tick citas cada 8s solo en vista citas */
    if (window.RUTALOG && RUTALOG.tick) {
      RUTALOG.tick.registrar('citas:v15', function () {
        try { tick(); } catch (e) {}
      }, { cada: 8000, vista: 'citas' });
    } else {
      setInterval(function () {
        try {
          if (window.estado && estado.page === "citas") tick();
          else if (typeof tick === "function") tick();
        } catch (e) {}
      }, 8000);
    }
    try { console.info("[RUTALOG] citas v10 — pegar tabla + alertas (planificación / auditoría / mapa)"); } catch (e) {}
  }
})();
