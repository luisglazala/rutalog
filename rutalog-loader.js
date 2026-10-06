/* RUTALOG loader v2 — CSS/JS en paralelo (arranque más rápido) */
(function () {
  "use strict";
  if (window.RUTALOG && window.RUTALOG.load && window.RUTALOG.load.__v2) return;

  var loaded = new Set();
  var pending = new Map();

  function keyOf(url) {
    try {
      var u = String(url || "").trim();
      var q = u.indexOf("?");
      if (q >= 0) u = u.slice(0, q);
      var h = u.indexOf("#");
      if (h >= 0) u = u.slice(0, h);
      if (u.indexOf("./") === 0) u = u.slice(2);
      return u;
    } catch (e) {
      return String(url || "");
    }
  }

  function markExisting() {
    try {
      document.querySelectorAll("script[src]").forEach(function (s) {
        loaded.add(keyOf(s.getAttribute("src")));
      });
      document.querySelectorAll('link[rel="stylesheet"][href]').forEach(function (l) {
        loaded.add(keyOf(l.getAttribute("href")));
      });
    } catch (e) {}
  }
  markExisting();

  function loadCss(href) {
    var k = keyOf(href);
    if (loaded.has(k)) return Promise.resolve(false);
    if (pending.has(k)) return pending.get(k);
    var p = new Promise(function (resolve) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = function () { loaded.add(k); pending.delete(k); resolve(true); };
      link.onerror = function () {
        pending.delete(k);
        console.warn("[RUTALOG.load] CSS fail", href);
        resolve(false);
      };
      document.head.appendChild(link);
    });
    pending.set(k, p);
    return p;
  }

  function loadJs(src) {
    var k = keyOf(src);
    if (loaded.has(k)) return Promise.resolve(false);
    if (pending.has(k)) return pending.get(k);
    var p = new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { loaded.add(k); pending.delete(k); resolve(true); };
      s.onerror = function () {
        pending.delete(k);
        console.warn("[RUTALOG.load] JS fail", src);
        resolve(false);
      };
      (document.body || document.head).appendChild(s);
    });
    pending.set(k, p);
    return p;
  }

  function parallel(list, fn) {
    return Promise.all(list.map(function (u) { return fn(u); }));
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
    "./mejoras-storage.js?v=1",
    "./mejoras-gh-proxy.js?v=4",
    "./mejoras-login-inmediato.js?v=10"
  ];

  var JS_MID = [
    "./codigo-perf.js?v=6",
    "./mejoras-go-perf.js?v=3",
    "./mejoras-ui-polish.js?v=3",
    "./mejoras-sync.js?v=34",
    "./mejoras-v2.js?v=11",
    "./mejoras-citas-v15.js?v=17",
    "./mejoras-centros.js?v=4",
    "./mejoras-cruzados.js?v=4",
    "./mejoras-audit.js?v=6",
    "./mejoras-planificacion.js?v=4",
    "./mejoras-excel-export.js?v=3"
  ];

  var JS_HOOKS = ["./rutalog-hooks.js?v=5"];

  var JS_MAP = [
    "./mejoras-mapa.js?v=3",
    "./mejoras-map-refresh.js?v=33",
    "./mejoras-ciudades.js?v=3",
    "./mejoras-ciudades-disponibles.js?v=1",
    "./mejoras-map-despachados.js?v=2",
    "./mejoras-mapa-fix.js?v=7",
    "./mejoras-mapa-hide.js?v=1",
    "./mejoras-mapa-ciudades-ruta.js?v=3",
    "./mejoras-plan-filtro.js?v=1",
    "./mejoras-ui-centro-viajes.js?v=3",
    "./mejoras-mapa-sin-rectas.js?v=2",
    "./mejoras-despachos-delete.js?v=2",
    "./mejoras-rutas-panel-ui.js?v=6",
    "./rutas-mapa.js?v=2",
    "./mejoras-nav-fix.js?v=4"
  ];

  function loadExtrasOnce() {
    if (window.__rutalogExtrasLoaded) return Promise.resolve();
    window.__rutalogExtrasLoaded = true;
    markExisting();
    return parallel(CSS_POST, loadCss)
      .then(function () { return parallel(JS_EARLY, loadJs); })
      .then(function () { return parallel(JS_MID, loadJs); })
      .then(function () { return parallel(JS_HOOKS, loadJs); })
      .then(function () { return parallel(JS_MAP, loadJs); })
      .then(function () {
        try {
          if (window.RUTALOG && RUTALOG.hooks && RUTALOG.hooks.install) RUTALOG.hooks.install();
        } catch (e) {}
      });
  }

  window.RUTALOG = window.RUTALOG || {};
  window.RUTALOG.load = {
    __v1: true,
    __v2: true,
    keyOf: keyOf,
    has: function (url) { return loaded.has(keyOf(url)); },
    css: loadCss,
    js: loadJs,
    extras: loadExtrasOnce,
    markExisting: markExisting,
    loadedKeys: function () { return Array.from(loaded); }
  };
})();
