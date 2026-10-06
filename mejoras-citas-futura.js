/* RUTALOG mejoras-citas-futura v1 — pegado tabla ZONA/CITA/CLIENTE/OV/NOTA + mapa naranja si fecha > programa */
(function () {
  "use strict";
  if (window.__rutalogCitasFuturaV1) return;
  window.__rutalogCitasFuturaV1 = true;

  function isoDate(d) {
    if (!d || isNaN(d.getTime())) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function fechaPrograma() {
    try {
      if (window.estado && estado.fechaHoy) return String(estado.fechaHoy).slice(0, 10);
    } catch (e) {}
    return isoDate(new Date());
  }
  function parseFechaFlexible(raw, nota, ref) {
    var sources = [String(raw || ""), String(nota || "")];
    for (var i = 0; i < sources.length; i++) {
      var t = sources[i].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!t) continue;
      var m = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (m) {
        var yy = +m[3]; if (yy < 100) yy += 2000;
        return isoDate(new Date(yy, +m[2] - 1, +m[1]));
      }
      m = t.match(/(LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO)\s*(\d{1,2})(?:[\/\-](\d{1,2}))?/i);
      if (m) {
        var day = +m[2], month = m[3] ? +m[3] - 1 : null;
        var base = ref || new Date();
        var mo = month != null ? month : base.getMonth();
        var cand = new Date(base.getFullYear(), mo, day);
        if (month == null && day < base.getDate() - 5) cand = new Date(base.getFullYear(), mo + 1, day);
        return isoDate(cand);
      }
    }
    return null;
  }
  function normName(s) {
    return String(s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
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

  function parseTableLine(line) {
    line = String(line || "").replace(/\u00a0/g, " ").trim();
    if (!line) return null;
    var up = normName(line);
    if (/ZONA/.test(up) && /CITA/.test(up) && /CLIENTE/.test(up)) return null;

    var cols;
    if (line.indexOf("\t") >= 0) cols = line.split("\t").map(function (x) { return x.trim(); });
    else if (line.indexOf("|") >= 0) cols = line.split("|").map(function (x) { return x.trim(); }).filter(Boolean);
    else cols = line.split(/\s{2,}/).map(function (x) { return x.trim(); }).filter(Boolean);

    if (cols.length < 3) {
      var ovM = line.match(/\b(OV[- ]?\d{6,})\b/i);
      if (!ovM) return null;
      var ov = ovM[1].replace(/\s+/g, "").replace(/^OV(?!-)/i, "OV-");
      var before = line.slice(0, ovM.index).trim();
      var nota = line.slice(ovM.index + ovM[0].length).trim();
      var zona = "", citaRaw = "", cliente = before;
      var zm = before.match(/^(\d{1,4})\s+(.*)$/);
      if (zm) { zona = zm[1]; before = zm[2]; }
      var cm = before.match(/^((?:LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)\s*\d{0,2})\s+(.*)$/i);
      if (cm) { citaRaw = cm[1]; cliente = cm[2]; }
      else cliente = before;
      var ref = new Date();
      try { if (estado.fechaHoy) ref = new Date(estado.fechaHoy + "T12:00:00"); } catch (e) {}
      return {
        zona: zona, citaRaw: citaRaw, cliente: cliente, ov: ov, nota: nota,
        fecha: parseFechaFlexible(citaRaw, nota, ref),
        idCliente: findIdByName(cliente)
      };
    }

    var zona = "", citaRaw = "", cliente = "", ov = "", nota = "";
    var i = 0;
    if (/^\d{1,4}$/.test(cols[0])) { zona = cols[0]; i = 1; }
    var rest = cols.slice(i);
    if (rest.length >= 2 && /^OV/i.test(rest[1])) {
      cliente = rest[0];
      ov = rest[1].replace(/\s+/g, "");
      nota = rest.slice(2).join(" ");
    } else if (rest.length >= 3 && /^OV/i.test(rest[2])) {
      citaRaw = rest[0];
      cliente = rest[1];
      ov = rest[2].replace(/\s+/g, "");
      nota = rest.slice(3).join(" ");
    } else {
      var ovIdx = -1;
      for (var j = 0; j < rest.length; j++) {
        if (/OV[- ]?\d/i.test(rest[j])) { ovIdx = j; break; }
      }
      if (ovIdx < 0) return null;
      ov = rest[ovIdx].replace(/\s+/g, "");
      if (ovIdx >= 2) {
        citaRaw = rest[0];
        cliente = rest.slice(1, ovIdx).join(" ");
      } else {
        cliente = rest[0];
      }
      nota = rest.slice(ovIdx + 1).join(" ");
    }
    if (!cliente && !ov) return null;
    if (!cliente) cliente = ov;
    var ref2 = new Date();
    try { if (estado.fechaHoy) ref2 = new Date(estado.fechaHoy + "T12:00:00"); } catch (e) {}
    return {
      zona: zona,
      citaRaw: citaRaw,
      cliente: cliente,
      ov: ov.replace(/^OV(?!-)/i, "OV-"),
      nota: nota,
      fecha: parseFechaFlexible(citaRaw, nota, ref2),
      idCliente: findIdByName(cliente)
    };
  }

  function parsePasteTable(text) {
    return String(text || "").split(/\r?\n/).map(parseTableLine).filter(Boolean);
  }
  window.__citasParseTest = parsePasteTable;

  function getCitasMap() {
    if (!window.estado) window.estado = {};
    if (!(estado.citas instanceof Map)) {
      var map = new Map();
      try {
        var raw = localStorage.getItem("rutalog_citas");
        if (raw) {
          var obj = JSON.parse(raw);
          if (obj && typeof obj === "object") Object.keys(obj).forEach(function (k) { map.set(k, obj[k]); });
        }
      } catch (e) {}
      estado.citas = map;
    }
    return estado.citas;
  }

  function citaEsPosterior(idCliente) {
    try {
      var c = getCitasMap().get(String(idCliente));
      if (!c) return null;
      var hoy = fechaPrograma();
      var fechas = [];
      if (c.fecha) fechas.push(String(c.fecha).slice(0, 10));
      if (Array.isArray(c.ovs)) c.ovs.forEach(function (o) {
        if (o.fecha) fechas.push(String(o.fecha).slice(0, 10));
      });
      var fut = null;
      fechas.forEach(function (f) {
        if (f && hoy && f > hoy) if (!fut || f < fut) fut = f;
      });
      return fut;
    } catch (e) { return null; }
  }
  window.__citaEsPosterior = citaEsPosterior;

  function injectCSS() {
    if (document.getElementById("rutalog-cita-futura-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-cita-futura-css";
    st.textContent = [
      ".rutalog-pin-dot.has-cita-futura,.marcador.has-cita-futura{",
      "  background:#ea580c!important;",
      "  box-shadow:0 0 0 3px #f97316,0 2px 8px rgba(0,0,0,.4)!important;",
      "}",
      "#leyendaCitaFutura{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#fb923c;margin:4px 8px;}",
      "#leyendaCitaFutura i{width:12px;height:12px;border-radius:50%;background:#ea580c;box-shadow:0 0 0 2px #f97316;display:inline-block;}",
      "#citasPreviewTable th{background:#3f6212!important;color:#ecfccb!important;}"
    ].join("");
    document.head.appendChild(st);
  }

  function patchEstiloCli() {
    if (typeof window.estiloCli !== "function" || window.estiloCli._futura) return;
    var orig = window.estiloCli;
    window.estiloCli = function (cli) {
      var st = orig.apply(this, arguments);
      try {
        var id = cli && (cli.idCliente || cli.id);
        var fut = citaEsPosterior(id);
        if (fut) {
          var enViaje = st && st.color === "#f59e0b" && st.texto;
          if (!enViaje) {
            st = Object.assign({}, st, { color: "#ea580c", sz: Math.max(st.sz || 22, 26) });
          }
          st.citaFutura = fut;
        }
      } catch (e) {}
      return st;
    };
    window.estiloCli._futura = true;
  }

  function patchIcono() {
    if (typeof window.icono !== "function") return;
    if (window.icono._futuraClass) return;
    var orig = window.icono;
    window.icono = function (color, texto, size) {
      var ico = orig.apply(this, arguments);
      try {
        if (color === "#ea580c" && ico && ico.options && ico.options.html) {
          var h = String(ico.options.html);
          if (h.indexOf("has-cita-futura") < 0) {
            h = h.replace('class="rutalog-pin-dot', 'class="rutalog-pin-dot has-cita-futura');
            h = h.replace('class="marcador"', 'class="marcador has-cita-futura"');
            ico.options.html = h;
          }
        }
      } catch (e) {}
      return ico;
    };
    window.icono._futuraClass = true;
    window.icono._rutalogPin = orig._rutalogPin;
  }

  function patchPopup() {
    if (typeof window.popupHtml !== "function" || window.popupHtml._futura) return;
    var orig = window.popupHtml;
    window.popupHtml = function (cli) {
      var html = orig.apply(this, arguments);
      try {
        var fut = citaEsPosterior(cli && cli.idCliente);
        if (fut) {
          html += '<div class="popup-l" style="color:#fb923c;font-weight:600;">⚠ Cita posterior: ' + fut + "</div>";
        }
      } catch (e) {}
      return html;
    };
    window.popupHtml._futura = true;
  }

  function getCitasMapPersist(map) {
    try {
      var o = {};
      map.forEach(function (v, k) { o[k] = v; });
      localStorage.setItem("rutalog_citas", JSON.stringify(o));
      localStorage.setItem("rutalog_gh_dirty", "1");
    } catch (e) {}
  }

  function persistAndApply(rows, replaceAll) {
    var map = getCitasMap();
    if (replaceAll) map.clear();
    var n = 0;
    rows.forEach(function (r) {
      var id = r.idCliente ? String(r.idCliente) : ("x:" + normName(r.cliente).slice(0, 40));
      var prev = map.get(id) || { idCliente: r.idCliente || null, nombre: r.cliente, ovs: [], fuente: "pegar-tabla" };
      var ovs = Array.isArray(prev.ovs) ? prev.ovs.slice() : [];
      ovs = ovs.filter(function (o) {
        return String(o.fecha || "") !== String(r.fecha || "") || String(o.ov || "") !== String(r.ov || "");
      });
      ovs.push({ fecha: r.fecha || "", ov: r.ov || "", nota: r.nota || "", citaRaw: r.citaRaw || "" });
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
    getCitasMapPersist(map);
    return n;
  }

  function wirePasteButtons() {
    var ta = document.getElementById("citaPasteArea") || document.getElementById("citasPasteArea");
    var a = document.getElementById("citasBtnApply");
    var r = document.getElementById("citasBtnReplace");
    function run(replaceAll) {
      if (!ta) return;
      var rows = parsePasteTable(ta.value);
      if (!rows.length) {
        try { if (typeof toast === "function") toast("No se detectaron filas de la tabla"); } catch (e) {}
        return;
      }
      var n = persistAndApply(rows, !!replaceAll);
      try { if (typeof toast === "function") toast((replaceAll ? "Reemplazadas: " : "Aplicadas: ") + n); } catch (e) {}
      try { if (typeof renderMapas === "function") renderMapas(); } catch (e2) {}
      try { if (typeof renderCitas === "function") renderCitas(); } catch (e3) {}
    }
    if (a && !a._futuraWire) {
      a._futuraWire = true;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        run(false);
      }, true);
    }
    if (r && !r._futuraWire) {
      r._futuraWire = true;
      r.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!confirm("¿Reemplazar todas las citas pegadas?")) return;
        run(true);
      }, true);
    }
  }

  function addLegend() {
    if (document.getElementById("leyendaCitaFutura")) return;
    var host = document.getElementById("badgeActivos");
    if (!host || !host.parentNode) return;
    var leg = document.createElement("span");
    leg.id = "leyendaCitaFutura";
    leg.innerHTML = "<i></i> Cita con fecha posterior al programa";
    host.parentNode.insertBefore(leg, host.nextSibling);
  }

  function tick() {
    injectCSS();
    patchEstiloCli();
    patchIcono();
    patchPopup();
    wirePasteButtons();
    addLegend();
  }
  tick();
  setTimeout(tick, 800);
  setTimeout(tick, 2000);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('citas:futura', tick, { cada: 5000, vista: 'citas' }); else setInterval(tick, 5000);
  console.info("[RUTALOG] citas-futura v1 — tabla + mapa naranja");
})();
