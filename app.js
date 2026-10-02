/* RUTALOG loader: core + extras + gh-proxy + login inmediato */
(function () {
  try { document.documentElement.classList.add("rutalog-booting"); } catch (e) {}
  var css = document.createElement("style");
  css.id = "rutalog-critical-css";
  css.textContent = [
    "html.rutalog-booting .sidebar,html.rutalog-booting .main,html:not(.rutalog-ready) .sidebar,html:not(.rutalog-ready) .main,html:not(.rutalog-ready) .app{visibility:hidden!important;opacity:0!important;pointer-events:none!important}",
    "html.rutalog-need-login #loginOverlay{display:flex!important;visibility:visible!important;pointer-events:auto!important}",
    "#btnExportSesion,#btnImportSesion,#fileImportSesion{display:none!important}",
    ".page{display:none!important}",
    ".page.active{display:flex!important;flex-direction:column!important;gap:14px!important}",
    ".leaflet-div-icon,.leaflet-marker-icon.leaflet-div-icon{background:transparent!important;border:none!important;box-shadow:none!important}",
    ".leaflet-div-icon .marcador,.rutalog-pin .rutalog-pin-dot{border-radius:50%!important}"
  ].join("\n");
  document.head.appendChild(css);

  function removeDiaBtns() {
    ["btnExportSesion","btnImportSesion","fileImportSesion"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }
  removeDiaBtns();

  function forcePageVisibility() {
    try {
      document.querySelectorAll(".page").forEach(function (p) {
        if (p.classList.contains("active")) {
          p.style.setProperty("display", "flex", "important");
        } else {
          p.style.setProperty("display", "none", "important");
        }
      });
    } catch (e) {}
  }

  function patchGo() {
    if (typeof window.go !== "function" || window.go.__rutalogPatched) return;
    var _go = window.go;
    window.go = function (page) {
      var r = _go.apply(this, arguments);
      forcePageVisibility();
      return r;
    };
    window.go.__rutalogPatched = true;
  }

  function revealApp() {
    try {
      var hasSession = false;
      try {
        var raw = localStorage.getItem("rutalog_session");
        if (raw) {
          var u = JSON.parse(raw);
          if (u && u.id && u.username) hasSession = true;
        }
      } catch (e) {}
      document.documentElement.classList.remove("rutalog-booting");
      if (hasSession) {
        document.documentElement.classList.remove("rutalog-need-login");
        document.documentElement.classList.add("rutalog-ready");
      } else {
        document.documentElement.classList.add("rutalog-need-login");
        document.documentElement.classList.remove("rutalog-ready");
      }
    } catch (e) {}
    forcePageVisibility();
  }

  function forceLeafletIcons() {
    var id = "rutalog-leaflet-no-square";
    if (document.getElementById(id)) return;
    var st = document.createElement("style");
    st.id = id;
    st.textContent = ".leaflet-div-icon,.leaflet-marker-icon.leaflet-div-icon{background:transparent!important;border:none!important;box-shadow:none!important}";
    (document.head || document.documentElement).appendChild(st);
  }
  forceLeafletIcons();

  function onceScript(flag, src) {
    if (window[flag]) return;
    window[flag] = true;
    var s = document.createElement("script");
    s.src = src;
    s.async = false;
    document.head.appendChild(s);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function afterAppReady() {
    removeDiaBtns();
    patchGo();
    setTimeout(patchGo, 500);
    setTimeout(patchGo, 1500);
    forcePageVisibility();
    revealApp();
  }

  function loadExtras() {
    try {
      if (!document.getElementById("rutalog-mejoras-v2-css")) {
        var l = document.createElement("link");
        l.id = "rutalog-mejoras-v2-css";
        l.rel = "stylesheet";
        l.href = "./mejoras-v2.css?v=11";
        document.head.appendChild(l);
      }
      var oldL = document.getElementById("rutalog-layout-css");
      if (oldL) oldL.remove();
      var lLayout = document.createElement("link");
      lLayout.id = "rutalog-layout-css";
      lLayout.rel = "stylesheet";
      lLayout.href = "./mejoras-layout.css?v=3";
      document.head.appendChild(lLayout);
      onceScript("__rutalogMejorasV2", "./mejoras-v2.js?v=11");
      onceScript("__rutalogMejorasCitas", "./mejoras-citas.js?v=8");
      onceScript("__rutalogMejorasCentros", "./mejoras-centros.js?v=4");
      onceScript("__rutalogMejorasCruzados", "./mejoras-cruzados.js?v=4");
      onceScript("__rutalogMejorasAudit", "./mejoras-audit.js?v=5");
      onceScript("__rutalogCodigoPerf", "./codigo-perf.js?v=1");
      onceScript("__rutalogPlanificacion", "./mejoras-planificacion.js?v=4");
      onceScript("__rutalogMarcadores", "./mejoras-marcadores.js?v=2");
      onceScript("__rutalogMapIcons", "./mejoras-map-icons.js?v=1");
      onceScript("__rutalogExcelExport", "./mejoras-excel-export.js?v=3");
      onceScript("__rutalogGhProxy", "./mejoras-gh-proxy.js?v=3");
      onceScript("__rutalogLoginInmediato", "./mejoras-login-inmediato.js?v=1");
      patchGo();
      forcePageVisibility();
    } catch (eM) { console.warn("[RUTALOG] extras", eM); }
  }

  var APP = "https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js";
  loadScript(APP).then(function () {
    forceLeafletIcons();
    onceScript("__rutalogMarcadores", "./mejoras-marcadores.js?v=2");
    afterAppReady();
    return loadScript("./app-core-construirHoy.js?v=5");
  }).then(function () {
    return loadScript("./mejoras-correcciones.js?v=2");
  }).then(function () {
    loadExtras();
  }).catch(function (e) {
    console.error("[RUTALOG]", e);
    try {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-booting");
    } catch (err) {}
    loadExtras();
  });
})();
