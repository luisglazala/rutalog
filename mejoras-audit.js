/* RUTALOG mejoras-audit v5 — modal ancho + ocultar Cliente + colores botones viaje */
(function () {
  "use strict";
  if (window.__rutalogAuditV5) return;
  window.__rutalogAuditV5 = true;

  function el(id) { return document.getElementById(id); }

  var DIAS = [
    { key: "domingo", re: /\bdomingos?\b/i },
    { key: "lunes", re: /\blunes\b/i },
    { key: "martes", re: /\bmartes\b/i },
    { key: "miercoles", re: /\bmi[eé]rcoles\b/i },
    { key: "jueves", re: /\bjueves\b/i },
    { key: "viernes", re: /\bviernes\b/i },
    { key: "sabado", re: /\bs[aá]bados?\b/i }
  ];

  function diaPrograma() {
    try {
      var fh = el("fechaHoy");
      if (fh && fh.textContent) {
        var t = fh.textContent.toLowerCase();
        for (var i = 0; i < DIAS.length; i++) {
          if (DIAS[i].re.test(t)) return DIAS[i].key;
        }
      }
    } catch (e) {}
    return DIAS[new Date().getDay()].key;
  }

  function condicionRestringeDia(cond, diaProg) {
    if (!cond || !diaProg) return false;
    var c = String(cond).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var dia = diaProg.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var menciona = false;
    for (var i = 0; i < DIAS.length; i++) {
      var k = DIAS[i].key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (k === dia && DIAS[i].re.test(c)) { menciona = true; break; }
    }
    if (!menciona) return false;
    if (/\bno\s+(se\s+)?recibe|\bcerrado|\bnunca|\bexcepto|\bno\s+atiende|\bno\s+despach/.test(c)) return true;
    if (/\bsolo\b|\bunicamente\b|\búnicamente\b/.test(c)) {
      var soloMatch = c.match(/(?:solo|unicamente|únicamente)\s+([a-záéíóúñ,\sy]+)/i);
      if (soloMatch) {
        var bloque = soloMatch[1];
        var permitido = false;
        for (var j = 0; j < DIAS.length; j++) {
          var kj = DIAS[j].key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (kj === dia && DIAS[j].re.test(bloque)) { permitido = true; break; }
        }
        return !permitido;
      }
    }
    return true;
  }

  function citaDeCliente(idCliente) {
    try {
      if (!idCliente || !window.estado || !estado.citas) return null;
      return estado.citas.get(String(idCliente)) || estado.citas.get(idCliente) || null;
    } catch (e) { return null; }
  }

  function condicionDeCliente(idCliente, ln) {
    if (ln && ln.condicion) return ln.condicion;
    try {
      if (!idCliente || !estado.maestro) return "";
      var m = estado.maestro.get(String(idCliente));
      if (m && m.condicion) return m.condicion;
      if (estado.clientesHoy) {
        for (var i = 0; i < estado.clientesHoy.length; i++) {
          if (String(estado.clientesHoy[i].idCliente) === String(idCliente))
            return estado.clientesHoy[i].condicion || "";
        }
      }
    } catch (e) {}
    return "";
  }

  function ensureColumns() {
    var thead = document.querySelector("#auditOverlay table thead tr");
    if (!thead) return;
    if (thead.querySelector("th.audit-th-cita")) return;
    var ths = thead.querySelectorAll("th");
    var ciudadTh = null;
    for (var i = 0; i < ths.length; i++) {
      if (/ciudad/i.test(ths[i].textContent)) { ciudadTh = ths[i]; break; }
    }
    if (!ciudadTh) return;
    var thCita = document.createElement("th");
    thCita.className = "audit-th-cita";
    thCita.textContent = "Cita";
    var thCond = document.createElement("th");
    thCond.className = "audit-th-cond";
    thCond.textContent = "Condición";
    ciudadTh.insertAdjacentElement("afterend", thCond);
    ciudadTh.insertAdjacentElement("afterend", thCita);
  }

  function hideClienteColumn() {
    try {
      var thead = document.querySelector("#auditOverlay table thead tr");
      if (thead) {
        thead.querySelectorAll("th").forEach(function (th) {
          if (/cliente/i.test((th.textContent || "").trim()) && !/ciudad/i.test(th.textContent || "")) {
            th.classList.add("audit-col-cliente");
            th.style.cssText = "display:none!important;width:0;padding:0;border:0;overflow:hidden;";
          }
        });
      }
      document.querySelectorAll("#auditTbody tr").forEach(function (tr) {
        var tds = tr.children;
        if (tds.length > 2) {
          tds[2].classList.add("audit-col-cliente");
          tds[2].style.cssText = "display:none!important;width:0;padding:0;border:0;overflow:hidden;";
        }
      });
    } catch (e) {}
  }

  function calcTotales() {
    var emp = 0, cajas = 0, peso = 0, n = 0;
    var lineas = (window.estado && estado.auditLineas) || [];
    lineas.forEach(function (ln) {
      if (!ln.selected) return;
      var q = Number(ln.aDespacharEdit) || 0;
      if (q <= 0) return;
      n++;
      emp += q;
      peso += (Number(ln.pesoUnit) || 0) * q;
      var u = typeof undPorCajaDeSku === "function" ? undPorCajaDeSku(ln.sku) : null;
      if (u && u > 0) cajas += q / u;
    });
    return { n: n, emp: emp, cajas: cajas, peso: peso };
  }

  function ensureTfoot() {
    var table = document.querySelector("#auditOverlay table.audit-table")
      || document.querySelector("#auditOverlay table");
    if (!table) return null;
    var tfoot = table.querySelector("tfoot#auditTfootEmbed");
    if (!tfoot) {
      tfoot = document.createElement("tfoot");
      tfoot.id = "auditTfootEmbed";
      table.appendChild(tfoot);
    }
    return tfoot;
  }

  function renderTfoot() {
    var tfoot = ensureTfoot();
    if (!tfoot) return;
    var t = calcTotales();
    var cajasTxt = Number.isInteger(t.cajas) ? String(t.cajas) : t.cajas.toFixed(2);
    var empTxt = t.emp.toLocaleString("es-DO", { maximumFractionDigits: 2 });
    var pesoTxt = t.peso.toFixed(2);
    tfoot.innerHTML =
      '<tr class="audit-totales-embed">' +
      '<td colspan="11" style="text-align:right;font-weight:700;padding:8px 10px;">Total sel. (' + t.n + ' líneas)</td>' +
      '<td class="mono audit-tf-cajas" style="font-weight:800;color:#86efac;" title="Suma cajas">' + cajasTxt + '</td>' +
      '<td class="mono audit-tf-emp" style="font-weight:800;color:#86efac;" title="Suma a despachar">' + empTxt + '</td>' +
      '<td class="mono audit-tf-peso" style="font-weight:800;color:#86efac;" title="Suma peso kg">' + pesoTxt + '</td>' +
      '<td></td>' +
      '</tr>';
  }

  function decorateRows() {
    var tb = el("auditTbody");
    if (!tb || !window.estado) return;
    var dia = diaPrograma();
    var excesos = typeof evaluarTopesEnAuditoria === "function" ? evaluarTopesEnAuditoria() : [];
    var excessKeys = {};
    excesos.forEach(function (e) { excessKeys[e.key] = e; });

    tb.querySelectorAll("tr[data-idx]").forEach(function (tr) {
      var i = Number(tr.dataset.idx);
      var ln = estado.auditLineas[i];
      if (!ln) return;

      if (!tr.querySelector("td.audit-td-cita")) {
        var tds = tr.querySelectorAll("td");
        var ciudadTd = tds[4];
        if (!ciudadTd) return;
        var cita = citaDeCliente(ln.idCliente);
        var cond = condicionDeCliente(ln.idCliente, ln);
        var citaTxt = cita ? (cita.fecha || cita.citaRaw || "Sí") : "—";
        var tdCita = document.createElement("td");
        tdCita.className = "audit-td-cita mono";
        tdCita.title = cita ? (cita.fecha || "") : "Sin cita";
        tdCita.textContent = citaTxt;
        var tdCond = document.createElement("td");
        tdCond.className = "audit-td-cond";
        tdCond.title = cond || "";
        tdCond.textContent = cond || "—";
        if (cond && cond.length > 28) tdCond.textContent = cond.slice(0, 26) + "…";
        ciudadTd.insertAdjacentElement("afterend", tdCond);
        ciudadTd.insertAdjacentElement("afterend", tdCita);
      }

      tr.classList.remove("audit-row-cita", "audit-row-cond", "audit-row-tope");
      var cita2 = citaDeCliente(ln.idCliente);
      var cond2 = condicionDeCliente(ln.idCliente, ln);
      var key = typeof normSkuKey === "function" ? normSkuKey(ln.sku) : String(ln.sku || "");
      var hasTope = ln.selected && key && excessKeys[key];
      var hasCita = !!cita2;
      var hasCond = condicionRestringeDia(cond2, dia);

      if (hasTope) tr.classList.add("audit-row-tope");
      else if (hasCita) tr.classList.add("audit-row-cita");
      else if (hasCond) tr.classList.add("audit-row-cond");
    });
  }

  function hideFootTextStats() {
    var foot = document.querySelector("#auditOverlay .audit-foot");
    if (!foot) return;
    foot.querySelectorAll(".stat-line").forEach(function (sl) {
      if (sl.querySelector('input[name="auditPlantilla"]') || sl.querySelector("#auditCapacidad")) return;
      if (sl.querySelector("#auditLineasSel") || sl.querySelector("#auditPesoSel") ||
          sl.querySelector("#auditEmp") || sl.querySelector("#auditCajas") || sl.querySelector("#auditPesoRem")) {
        sl.style.display = "none";
      }
    });
  }

  function injectCSS() {
    if (el("rutalog-audit-v5-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-audit-v5-css";
    st.textContent = [
      "#auditOverlay.audit-overlay{padding:12px!important;}",
      "#auditOverlay .audit-modal{width:min(98vw,1900px)!important;max-width:98vw!important;max-height:96vh!important;}",
      "#auditOverlay .audit-body{max-height:calc(100vh - 240px);overflow:auto;}",
      "#auditOverlay table.audit-table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;}",
      "#auditOverlay table thead th{position:sticky;top:0;z-index:3;background:#141414;white-space:nowrap;}",
      "#auditOverlay table tbody td{white-space:nowrap;}",
      "#auditOverlay table thead th:last-child,#auditOverlay table tbody td:last-child{min-width:88px;padding-right:14px;}",
      "#auditTfootEmbed{position:sticky;bottom:0;z-index:4;}",
      "#auditTfootEmbed td{background:#0d0d0d;border-top:2px solid #333;padding:8px 8px;font-size:12.5px;}",
      "#auditOverlay .audit-foot{position:sticky;bottom:0;z-index:5;background:#111!important;border-top:1px solid #2a2a2a;box-shadow:0 -6px 18px rgba(0,0,0,.3);}",
      "tr.audit-row-cita td{background:rgba(249,115,22,.14)!important;}",
      "tr.audit-row-cita{box-shadow:inset 3px 0 0 #f97316;}",
      "tr.audit-row-cond td{background:rgba(234,179,8,.14)!important;}",
      "tr.audit-row-cond{box-shadow:inset 3px 0 0 #eab308;}",
      "tr.audit-row-tope td,tr.audit-tope-exceed td{background:rgba(239,68,68,.16)!important;}",
      "tr.audit-row-tope,tr.audit-tope-exceed{box-shadow:inset 3px 0 0 #ef4444;}",
      "td.audit-td-cita{white-space:nowrap;max-width:110px;}",
      "td.audit-td-cond{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      "#auditOverlay table thead th:nth-child(3),#auditOverlay table tbody td:nth-child(3),#auditOverlay th.audit-col-cliente,#auditOverlay td.audit-col-cliente{display:none!important;width:0!important;min-width:0!important;padding:0!important;border:none!important;overflow:hidden!important;}",
      "#auditOverlay .audit-nombre{max-width:220px;}",
      "#auditCapacidad{color:#86efac;}",
      "#btnGuardarViaje{background:linear-gradient(135deg,#8b5cf6,#a78bfa)!important;border-color:#7c3aed!important;color:#fff!important;box-shadow:0 2px 10px rgba(139,92,246,.35);}",
      "#btnGuardarViaje:hover:not(:disabled){filter:brightness(1.08);}",
      "#btnGuardarViaje:disabled{opacity:.45;filter:grayscale(.3);}",
      "#btnOptimizarRuta,button#btnGenerarViaje{background:linear-gradient(135deg,#0d9488,#14b8a6)!important;border-color:#0f766e!important;color:#fff!important;box-shadow:0 2px 10px rgba(13,148,136,.3);}",
      "#btnOptimizarRuta:hover:not(:disabled),button#btnGenerarViaje:hover:not(:disabled){filter:brightness(1.08);}"
    ].join("");
    document.head.appendChild(st);
  }

  function colorizeViajeButtons() {
    try {
      var g = el("btnGuardarViaje");
      if (g) {
        g.style.background = "linear-gradient(135deg,#8b5cf6,#a78bfa)";
        g.style.borderColor = "#7c3aed";
        g.style.color = "#fff";
      }
      document.querySelectorAll("button").forEach(function (b) {
        var t = (b.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (t.indexOf("generar viaje") !== -1 || b.id === "btnGenerarViaje") {
          b.style.background = "linear-gradient(135deg,#0d9488,#14b8a6)";
          b.style.borderColor = "#0f766e";
          b.style.color = "#fff";
        }
      });
    } catch (e) {}
  }

  function afterRender() {
    try {
      ensureColumns();
      decorateRows();
      hideClienteColumn();
      renderTfoot();
      hideFootTextStats();
    } catch (e) { console.warn("[audit-v5]", e); }
  }

  function hookRender() {
    if (typeof window.renderAuditoriaTabla !== "function" || window.renderAuditoriaTabla._auditV5) return;
    var orig = window.renderAuditoriaTabla;
    window.renderAuditoriaTabla = function () {
      var r = orig.apply(this, arguments);
      afterRender();
      return r;
    };
    window.renderAuditoriaTabla._auditV5 = true;
  }

  function hookStats() {
    if (typeof window.actualizarAuditStats !== "function" || window.actualizarAuditStats._auditV5) return;
    var orig = window.actualizarAuditStats;
    window.actualizarAuditStats = function () {
      var r = orig.apply(this, arguments);
      try {
        decorateRows();
        hideClienteColumn();
        renderTfoot();
        hideFootTextStats();
      } catch (e) {}
      return r;
    };
    window.actualizarAuditStats._auditV5 = true;
  }

  function tick() {
    injectCSS();
    colorizeViajeButtons();
    hookRender();
    hookStats();
    if (el("auditOverlay") && !el("auditOverlay").hidden) afterRender();
  }

  setTimeout(tick, 600);
  setTimeout(tick, 1500);
  setTimeout(tick, 3000);
  setInterval(tick, 2000);
})();
