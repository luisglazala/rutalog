/* RUTALOG loader: core e638c98 + construirHoy v5 + planificacion v4 + layout v3 + marcadores + excel */
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
    "#rutalogTokenGate{position:fixed;inset:0;z-index:100000;background:#0a0a0a;display:flex;align-items:center;justify-content:center;padding:24px}",
    "#rutalogTokenGate .tg-card{width:min(420px,94vw);background:#171717;border:1px solid #1f1f1f;border-radius:16px;padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,.45);color:#fafafa}",
    "#rutalogTokenGate h2{font-size:18px;font-weight:700;margin:0 0 6px}",
    "#rutalogTokenGate p{font-size:13px;color:#a3a3a3;margin:0 0 16px;line-height:1.45}",
    "#rutalogTokenGate label{display:block;font-size:12px;font-weight:600;color:#a3a3a3;margin-bottom:4px}",
    "#rutalogTokenGate input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #1f1f1f;background:#0f0f0f;color:#fafafa;font-size:14px;box-sizing:border-box;margin-bottom:12px}",
    "#rutalogTokenGate .btn{width:100%;justify-content:center;margin-top:4px}",
    "#rutalogTokenGate .tg-skip{margin-top:10px;background:transparent;border:none;color:#a3a3a3;font-size:12px;cursor:pointer;width:100%;text-align:center}",
    "#rutalogTokenGate .tg-err{display:none;background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:8px;padding:8px 12px;font-size:12.5px;margin-bottom:12px}",
    "#rutalogTokenGate .tg-err.visible{display:block}",
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
      document.documentElement.classList.remove("rutalog-booting");
      document.documentElement.classList.remove("rutalog-need-login");
      document.documentElement.classList.add("rutalog-ready");
    } catch (e) {}
    var main = document.querySelector(".main");
    var sb = document.querySelector(".sidebar");
    var ov = document.getElementById("loginOverlay");
    var loginOn = ov && !ov.hidden && ov.style.display !== "none";
    if (loginOn) {
      if (main) { main.style.visibility = "hidden"; main.style.opacity = "0"; }
      if (sb) { sb.style.visibility = "hidden"; sb.style.opacity = "0"; }
    } else {
      if (main) { main.style.visibility = ""; main.style.opacity = ""; }
      if (sb) { sb.style.visibility = ""; sb.style.opacity = ""; }
    }
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
      onceScript("__rutalogExcelExport", "./mejoras-excel-export.js?v=1");
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
      document.documentElement.classList.add("rutalog-ready");
      document.documentElement.classList.remove("rutalog-booting");
      document.documentElement.classList.remove("rutalog-need-login");
    } catch (err) {}
    loadExtras();
  });
})();
