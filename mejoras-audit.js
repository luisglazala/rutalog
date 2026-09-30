/* RUTALOG mejoras-audit v2 — sin fila extra; totales solo en el pie fijo del modal */
(function () {
  "use strict";
  if (window.__rutalogAuditTotalesV2) return;
  window.__rutalogAuditTotalesV2 = true;

  function el(id) { return document.getElementById(id); }

  /** Quita la fila tfoot que añadimos antes (ya no hace falta) */
  function removeTfoot() {
    try {
      var tf = document.getElementById("auditTfoot");
      if (tf && tf.parentNode) tf.parentNode.removeChild(tf);
    } catch (e) {}
  }

  function injectCSS() {
    if (el("rutalog-audit-foot-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-audit-foot-css";
    /* Pie del modal siempre visible; destaca cajas y peso */
    st.textContent =
      "#auditOverlay .audit-foot{position:sticky;bottom:0;z-index:5;" +
      "background:#111!important;border-top:1px solid #2a2a2a;" +
      "box-shadow:0 -8px 24px rgba(0,0,0,.35);}" +
      "#auditCajas,#auditPesoSel{color:#86efac!important;font-weight:800;}" +
      "#auditTfoot{display:none!important;}";
    document.head.appendChild(st);
  }

  function tick() {
    injectCSS();
    removeTfoot();
  }

  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  setInterval(tick, 3000);
})();
