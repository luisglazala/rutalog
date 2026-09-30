/* RUTALOG mejoras-audit v1 — sumatoria cajas y peso en tabla auditoría */
(function () {
  "use strict";
  if (window.__rutalogAuditTotales) return;
  window.__rutalogAuditTotales = true;

  function el(id) { return document.getElementById(id); }

  function calcTotales() {
    var totalCajas = 0;
    var totalPeso = 0;
    var n = 0;
    try {
      var lineas = (window.estado && estado.auditLineas) || [];
      var f = typeof getAuditFiltros === "function" ? getAuditFiltros() : null;
      lineas.forEach(function (ln) {
        if (!ln.selected) return;
        if (f && typeof lineaPasaFiltroAudit === "function" && !lineaPasaFiltroAudit(ln, f)) return;
        var q = Number(ln.aDespacharEdit) || 0;
        if (q <= 0) return;
        n++;
        var peso = (Number(ln.pesoUnit) || 0) * q;
        totalPeso += peso;
        var u = typeof undPorCajaDeSku === "function" ? undPorCajaDeSku(ln.sku) : null;
        if (u && u > 0) totalCajas += q / u;
        else totalCajas += q;
      });
    } catch (e) {}
    return { cajas: totalCajas, peso: totalPeso, n: n };
  }

  function ensureTfoot() {
    var table = document.querySelector("#auditOverlay table.audit-table")
      || document.querySelector("#auditOverlay table");
    if (!table) return null;
    var tfoot = table.querySelector("tfoot#auditTfoot");
    if (!tfoot) {
      tfoot = document.createElement("tfoot");
      tfoot.id = "auditTfoot";
      table.appendChild(tfoot);
    }
    return tfoot;
  }

  function renderTotalesRow() {
    var tfoot = ensureTfoot();
    if (!tfoot) return;
    var t = calcTotales();
    var cajasTxt = Number.isInteger(t.cajas) ? String(t.cajas) : t.cajas.toFixed(2);
    var pesoTxt = t.peso.toFixed(2);
    tfoot.innerHTML =
      '<tr class="audit-totales-row">' +
      '<td colspan="10" style="text-align:right;font-weight:700;padding:10px 12px;border-top:2px solid #333;">Total seleccionado (' + t.n + ' líneas)</td>' +
      '<td class="mono" style="font-weight:800;padding:10px 8px;border-top:2px solid #333;color:#86efac;">' + cajasTxt + '</td>' +
      '<td style="border-top:2px solid #333;"></td>' +
      '<td class="mono" style="font-weight:800;padding:10px 8px;border-top:2px solid #333;color:#86efac;">' + pesoTxt + '</td>' +
      '<td style="border-top:2px solid #333;"></td>' +
      '</tr>';
  }

  function injectCSS() {
    if (el("rutalog-audit-totales-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-audit-totales-css";
    st.textContent =
      "#auditTfoot .audit-totales-row{background:#0f0f0f;}" +
      "#auditTfoot .audit-totales-row td{background:#0f0f0f;color:#e5e5e5;font-size:13px;}" +
      "#auditOverlay .audit-body{padding-bottom:4px;}";
    document.head.appendChild(st);
  }

  function hookRender() {
    if (typeof window.renderAuditoriaTabla !== "function" || window.renderAuditoriaTabla._totalesHook) return;
    var orig = window.renderAuditoriaTabla;
    window.renderAuditoriaTabla = function () {
      var r = orig.apply(this, arguments);
      try { renderTotalesRow(); } catch (e) {}
      return r;
    };
    window.renderAuditoriaTabla._totalesHook = true;
  }

  function tick() {
    injectCSS();
    hookRender();
    if (el("auditOverlay") && !el("auditOverlay").hidden) {
      try { renderTotalesRow(); } catch (e) {}
    }
  }

  setTimeout(tick, 800);
  setTimeout(tick, 2000);
  setTimeout(tick, 4000);
  setInterval(tick, 2500);
})();
