/* deprecated → mejoras-mapa.js (stub de compatibilidad) */
(function () {
  "use strict";
  if (window.__rutalogMapaV1 || window.__rutalogMapIconsV1) return;
  window.__rutalogMapIconsV1 = true;
  var s = document.createElement("script");
  s.src = "./mejoras-mapa.js?v=1";
  s.async = false;
  document.head.appendChild(s);
})();
