/* RUTALOG mejoras-audit v3 — sin fila extra; totales en el pie fijo; sin setInterval */
(function () {
  "use strict";
  if (window.__rutalogAuditTotalesV3) return;
  window.__rutalogAuditTotalesV3 = true;

  function el(id) { return document.getElementById(id); }

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

  tick();
  try {
    var obs = new MutationObserver(function () {
      if (el("auditOverlay")) {
        tick();
        try { obs.disconnect(); } catch (e) {}
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () {
      try { obs.disconnect(); } catch (e) {}
      tick();
    }, 10000);
  } catch (e) {
    tick();
  }
})();
