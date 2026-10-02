/* deprecated → mejoras-mapa.js (stub de compatibilidad) */
(function () {
  "use strict";
  if (window.__rutalogMapaV1 || window.__rutalogMarcadoresV2) return;
  window.__rutalogMarcadoresV2 = true;
  var s = document.createElement("script");
  s.src = "./mejoras-mapa.js?v=1";
  s.async = false;
  document.head.appendChild(s);
})();
