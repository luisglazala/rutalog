/* RUTALOG loader */
(function () {
  try { document.documentElement.classList.add("rutalog-booting"); } catch (e) {}
  var css = document.createElement("style");
  css.id = "rutalog-critical-css";
  css.textContent = [
    "html.rutalog-booting .sidebar,html.rutalog-booting .main,html.rutalog-booting .topbar,html.rutalog-booting .app,html.rutalog-session-pending .sidebar,html.rutalog-session-pending .main,html.rutalog-session-pending .topbar,html.rutalog-session-pending .app,html.rutalog-need-login .sidebar,html.rutalog-need-login .main,html.rutalog-need-login .topbar,html.rutalog-need-login .app > :not(#loginOverlay){visibility:hidden!important;opacity:0!important;pointer-events:none!important}",
    "html.rutalog-need-login #loginOverlay{display:flex!important;visibility:visible!important;pointer-events:auto!important}",
    "#btnExportSesion,#btnImportSesion,#fileImportSesion{display:none!important}",
    ".page{display:none!important}",
    ".page.active{display:flex!important;flex-direction:column!important;gap:14px!important}",
    ".leaflet-div-icon,.leaflet-marker-icon.leaflet-div-icon{background:transparent!important;border:none!important}"
  ].join("\n");
  document.head.appendChild(css);

  function removeDiaBtns() {
    ["btnExportSesion","btnImportSesion","fileImportSesion"].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
  }

  removeDiaBtns();

  function forcePageVisibility() {
    try {
      document.querySelectorAll(".page").forEach(function (p) {
        if (p.classList.contains("active")) p.style.setProperty("display", "flex", "important");
        else p.style.setProperty("display", "none", "important");
      });
    } catch (e) {}
  }

  function cleanupRoutePanel() {
    try {
      var page = document.getElementById("page-rutas");
      if (!page) return;
      var hiddenSelectors = [
        "#rutalogPlanCamion",
        "#planCamion",
        "#camionSelect",
        "#selectCamion",
        ".ruta-camion",
        ".camion-select",
        ".restante",
        "#restante",
        "[data-role='restante']",
        "[data-role='camion']",
        "[id*='camion']",
        "[id*='restante']",
        "[class*='camion']",
        "[class*='restante']"
      ];
      hiddenSelectors.forEach(function (selector) {
        page.querySelectorAll(selector).forEach(function (el) {
          el.style.display = "none";
          el.setAttribute("hidden", "hidden");
          el.setAttribute("aria-hidden", "true");
        });
      });
      page.querySelectorAll("*").forEach(function (el) {
        var text = (el.textContent || "").toLowerCase();
        var label = ((el.getAttribute("aria-label") || "") + " " + (el.getAttribute("title") || "")).toLowerCase();
        if ((text.indexOf("restante") >= 0 || text.indexOf("camión") >= 0 || text.indexOf("camion") >= 0 || label.indexOf("restante") >= 0 || label.indexOf("camión") >= 0 || label.indexOf("camion") >= 0) && !el.closest("#btnCambiarCentro") && !el.closest("#listaViajeActual") && !el.closest("#badgeParadas") && !el.closest("#badgePesoViaje") && !el.closest("#numViaje")) {
          el.style.display = "none";
          el.setAttribute("hidden", "hidden");
          el.setAttribute("aria-hidden", "true");
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
      cleanupRoutePanel();
      try {
        var t = document.getElementById("pageTitle");
        if (t && page === "panel") t.textContent = "Inicio";
        document.querySelectorAll('.nav button[data-page="panel"] .nav-label').forEach(function (n) { n.textContent = "Inicio"; });
      } catch (e) {}
      return r;
    };
    window.go.__rutalogPatched = true;
  }

  function hydrateSessionChip() {
    try {
      var raw = localStorage.getItem("rutalog_session");
      if (!raw) return false;
      var u = JSON.parse(raw);
      if (!u || !u.id || !u.username) return false;
      var name = document.getElementById("userChipName");
      if (name) name.textContent = u.nombre || u.name || u.username || "—";
      var chip = document.getElementById("userChipBar");
      if (chip) chip.hidden = false;
      return true;
    } catch (e) { return false; }
  }

  function revealApp() {
    try {
      var hasSession = false;
      try {
        var raw = localStorage.getItem("rutalog_session");
        if (raw) { var u = JSON.parse(raw); if (u && u.id && u.username) hasSession = true; }
      } catch (e) {}
      requestAnimationFrame(function () {
        try {
          if (hasSession) {
            hydrateSessionChip();
            document.documentElement.classList.remove("rutalog-need-login", "rutalog-booting", "rutalog-session-pending");
            document.documentElement.classList.add("rutalog-ready");
          } else {
            document.documentElement.classList.remove("rutalog-ready", "rutalog-booting", "rutalog-session-pending");
            document.documentElement.classList.add("rutalog-need-login");
            var ov = document.getElementById("loginOverlay");
            if (ov) { ov.hidden = false; ov.style.display = "flex"; }
          }
        } catch (e2) {}
        forcePageVisibility();
        cleanupRoutePanel();
      });
    } catch (e) { forcePageVisibility(); }
  }

  function forceLeafletIcons() {
    if (document.getElementById("rutalog-leaflet-no-square")) return;
    var st = document.createElement("style");
    st.id = "rutalog-leaflet-no-square";
    st.textContent = ".leaflet-div-icon,.leaflet-marker-icon.leaflet-div-icon{background:transparent!important;border:none!important}";
    (document.head || document.documentElement).appendChild(st);
  }

  forceLeafletIcons();

  function onceScript(flag, src) {
    if (window[flag]) return;
    if (document.querySelector('script[src="' + src + '"]')) {
      window[flag] = true;
      return;
    }
    window[flag] = true;
    var s = document.createElement("script");
    s.src = src; s.async = false;
    document.head.appendChild(s);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
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
    cleanupRoutePanel();
    setTimeout(patchGo, 500);
    setTimeout(patchGo, 1500);
    forcePageVisibility();
    revealApp();
  }

  function loadExtras() {
    try {
      if (window.RUTALOG && RUTALOG.load && typeof RUTALOG.load.extras === "function") {
        RUTALOG.load.extras().then(function () {
          try { patchGo(); forcePageVisibility(); cleanupRoutePanel(); } catch (e) {}
        }).catch(function (eM) { console.warn("[RUTALOG] extras", eM); });
        return;
      }
      console.warn("[RUTALOG] rutalog-loader.js no disponible");
    } catch (eM) { console.warn("[RUTALOG] extras", eM); }
  }

  var APP = "./core-app.js?v=noflicker1";
  loadScript(APP).then(function () {
    forceLeafletIcons();
    afterAppReady();
    return loadScript("./app-core-construirHoy.js?v=7");
  }).then(function () {
    return loadScript("./mejoras-correcciones.js?v=2");
  }).then(function () {
    /* Un solo manifiesto post-core (rutalog-loader.js) — sin second pass de onceScript */
    cleanupRoutePanel();
    loadExtras();
  }).catch(function (e) {
    console.error("[RUTALOG]", e);
    try {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-booting");
    } catch (err) {}
    cleanupRoutePanel();
    loadExtras();
  });
})();
