/* RUTALOG loader — CSS paralelo; JS en 4 oleadas */
(function () {
  "use strict";
  if (window.__rutalogLoaderStarted) return;
  window.__rutalogLoaderStarted = true;

  function loadCss(href) {
    return new Promise(function (resolve) {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      l.onload = function () { resolve(); };
      l.onerror = function () { resolve(); };
      document.head.appendChild(l);
    });
  }

  function loadJs(src) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      (document.body || document.documentElement).appendChild(s);
    });
  }

  function parallel(list, fn) {
    return Promise.all(list.map(fn));
  }

  var CSS_POST = [
    "./mejoras-v2.css?v=11",
    "./mejoras-layout.css?v=3",
    "./mejoras-ui-polish.css?v=1",
    "./mejoras-rutas-layout.css?v=5",
    "./mejoras-despachos-layout.css?v=3",
    "./mejoras-responsive.css?v=2",
    "./fix-mapa-rutas.css?v=2"
  ];

  var JS_EARLY = [
    "./rutalog-scheduler.js?v=1",
    "./mejoras-invalidate-debounce.js?v=1",
    "./mejoras-storage.js?v=1",
    "./mejoras-storage-h7.js?v=1",
    "./mejoras-gh-proxy.js?v=4",
    "./mejoras-login-inmediato.js?v=10",
    "./mejoras-logout-clear.js?v=1"
  ];

  var JS_MID = [
    "./codigo-perf.js?v=6",
    "./mejoras-go-perf.js?v=3",
    "./mejoras-go-h8.js?v=1",
    "./mejoras-ui-polish.js?v=3",
    "./mejoras-sync.js?v=35",
    "./mejoras-sync-h6.js?v=1",
    "./mejoras-fase1-sync-login.js?v=1",
    "./mejoras-v2.js?v=11",
    "./mejoras-citas-v15.js?v=17",
    "./mejoras-centros.js?v=4",
    "./mejoras-cruzados.js?v=4",
    "./mejoras-audit.js?v=6",
    "./mejoras-planificacion.js?v=4",
    "./mejoras-excel-export.js?v=3"
  ];

  var JS_HOOKS = ["./rutalog-hooks.js?v=6"];

  var JS_MAP = [
    "./mejoras-mapa.js?v=3",
    "./mejoras-map-refresh.js?v=33",
    "./mejoras-ciudades.js?v=3",
    "./mejoras-ciudades-disponibles.js?v=1",
    "./mejoras-map-despachados.js?v=2",
    "./mejoras-mapa-fix.js?v=7",
    "./mejoras-mapa-vista.js?v=1",
    "./mejoras-mapa-hide.js?v=1",
    "./mejoras-mapa-ciudades-ruta.js?v=31",
    "./mejoras-mapa-incremental.js?v=1",
    "./mejoras-mapa-click.js?v=1",
    "./mejoras-osrm-on-save.js?v=1",
    "./mejoras-osrm-onsave.js?v=1",
    "./mejoras-listas-inc.js?v=1",
    "./mejoras-plan-filtro.js?v=1",
    "./mejoras-ui-centro-viajes.js?v=3",
    "./mejoras-mapa-sin-rectas.js?v=2",
    "./mejoras-despachos-delete.js?v=2",
    "./mejoras-rutas-panel-ui.js?v=6",
    "./rutas-mapa.js?v=2",
    "./mejoras-nav-fix.js?v=6"
  ];

  function run() {
    return parallel(CSS_POST, loadCss)
      .then(function () { return parallel(JS_EARLY, loadJs); })
      .then(function () { return parallel(JS_MID, loadJs); })
      .then(function () { return parallel(JS_HOOKS, loadJs); })
      .then(function () { return parallel(JS_MAP, loadJs); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { run(); });
  } else {
    run();
  }
})();
