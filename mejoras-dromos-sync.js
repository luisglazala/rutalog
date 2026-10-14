/* RUTALOG dromos-sync v2 — Fase 2b bridge (carga write) */
(function () {
  "use strict";
  if (window.__rutalogDromosSyncV2) return;
  window.__rutalogDromosSyncV2 = true;
  window.__rutalogDromosSyncV1 = true;
  var LOG = "[RUTALOG] dromos-sync";
  console.info(LOG, "v2 bridge · cargando write module");
  var s = document.createElement("script");
  s.src = "./mejoras-dromos-write.js?v=1";
  s.async = true;
  s.onerror = function () { console.warn(LOG, "no se pudo cargar dromos-write"); };
  document.head.appendChild(s);
})();
