/* RUTALOG dromos-sync v2 — Fase 2b bridge */
(function () {
  "use strict";
  if (window.__rutalogDromosSyncV2) return;
  window.__rutalogDromosSyncV2 = true;
  window.__rutalogDromosSyncV1 = true;
  var LOG = "[RUTALOG] dromos-sync";
  function load(src, next) {
    var s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = function () { if (next) next(); };
    s.onerror = function () { console.warn(LOG, "fail", src); };
    document.head.appendChild(s);
  }
  console.info(LOG, "v2 bridge · write a+b");
  load("./mejoras-dromos-write-a.js?v=1", function () {
    load("./mejoras-dromos-write-b.js?v=1");
  });
})();
