/* RUTALOG rutas-panel-ui v3
 * - Un solo refresh de panel activo
 * - Sin polling repetitivo en rutas
 * - Oculta selector de camión y bloque restante en vista rutas
 */
(function () {
  "use strict";
  if (window.__rutalogRutasPanelUiV3) return;
  window.__rutalogRutasPanelUiV3 = true;

  function isRoutePageVisible() {
    var page = document.getElementById("page-rutas");
    return !!(page && page.classList.contains("active"));
  }

  function ensureCss() {
    if (document.getElementById("rutalog-rutas-panel-ui-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-rutas-panel-ui-css";
    st.textContent = [
      "#rutalogPlanCamion,#planCamion,#camionSelect,#selectCamion,.ruta-camion,.camion-select,.restante,#restante,[data-role='restante'],[data-role='camion']{display:none!important;visibility:hidden!important;pointer-events:none!important}",
      "#btnCambiarCentro{width:100%;display:inline-flex;align-items:center;gap:8px;justify-content:flex-start;min-height:40px;padding:10px 12px;}",
      "#btnCambiarCentro .centro-actual{margin-left:auto;font-weight:700;padding:2px 8px;border-radius:999px;font-size:11px;background:rgba(56,189,248,.14);color:#7dd3fc;}",
      ".page#page-rutas .map-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,380px);grid-template-rows:minmax(0,1fr);gap:12px;flex:1 1 auto;min-height:0;align-items:stretch;}",
      ".page#page-rutas .map-box{position:relative;display:flex;flex-direction:column;min-height:clamp(360px,52dvh,760px);height:100%;overflow:hidden;}",
      ".page#page-rutas #mapRutas{width:100%;height:100%;min-height:clamp(360px,52dvh,760px);flex:1 1 auto;}",
      ".page#page-rutas .side-panel{display:flex;flex-direction:column;min-height:0;overflow:hidden;}",
      ".page#page-rutas #listaViajeActual{flex:1 1 auto;min-height:120px;overflow-y:auto;}",
      ".page#page-rutas .btn,.page#page-rutas button{min-height:40px;}",
      "@media (max-width:900px){.page#page-rutas .map-layout{grid-template-columns:1fr;grid-template-rows:minmax(320px,52dvh) auto;}.page#page-rutas .map-box,.page#page-rutas #mapRutas{min-height:clamp(320px,52dvh,560px);}}",
      "@media (max-width:560px){.page#page-rutas .map-layout{gap:8px;}.page#page-rutas .side-panel{max-height:none;}}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(st);
  }

  function hideDupCamion() {
    ["rutalogPlanCamion","planCamion","camionSelect","selectCamion"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.style.display = "none";
        el.setAttribute("hidden", "hidden");
        el.setAttribute("aria-hidden", "true");
      }
    });
    var page = document.getElementById("page-rutas");
    if (!page) return;
    page.querySelectorAll(".restante, #restante, [data-role='restante'], [data-role='camion'], [class*='restante'], [class*='camion'], [id*='restante'], [id*='camion']").forEach(function (el) {
      el.style.display = "none";
      el.setAttribute("hidden", "hidden");
      el.setAttribute("aria-hidden", "true");
    });
  }

  function labelCentro() {
    try {
      if (estado.origenActual && estado.origenActual.corto) return estado.origenActual.corto;
    } catch (e) {}
    return "";
  }

  function updateBtnCentro() {
    var btn = document.getElementById("btnCambiarCentro");
    if (!btn) return;
    var corto = labelCentro();
    var span = btn.querySelector(".centro-actual");
    if (!corto) {
      if (span) span.remove();
      return;
    }
    if (!span) {
      span = document.createElement("span");
      span.className = "centro-actual";
      btn.appendChild(span);
    }
    span.textContent = corto;
    try {
      var col = (estado.origenActual && estado.origenActual.color) || "#38bdf8";
      span.style.background = col + "22";
      span.style.color = col;
      span.style.border = "1px solid " + col + "55";
    } catch (e) {}
  }

  function stripOrigenFromLista() {
    var ul = document.getElementById("listaViajeActual");
    if (!ul) return;
    ul.querySelectorAll("li").forEach(function (li) {
      if (/Origen:/.test(li.textContent || "")) li.remove();
    });
  }

  function forcePanelStretch() {
    if (!isRoutePageVisible()) return;
    try {
      var page = document.getElementById("page-rutas");
      if (!page) return;
      page.style.display = "flex";
      page.style.flexDirection = "column";
      page.style.minHeight = "0";
      page.style.height = "100%";
      page.style.overflow = "hidden";

      var main = document.querySelector(".main") || document.querySelector(".content");
      if (main) {
        main.style.display = "flex";
        main.style.flexDirection = "column";
        main.style.minHeight = "0";
      }

      var box = page.querySelector(".map-box");
      if (box) {
        box.style.flex = "1 1 auto";
        box.style.minHeight = "0";
      }

      var panel = page.querySelector(".side-panel");
      if (panel) {
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
      }

      var lista = document.getElementById("listaViajeActual");
      if (lista) {
        lista.style.flex = "1 1 auto";
        lista.style.minHeight = "0";
      }

      if (estado && estado.mapRutas && typeof estado.mapRutas.invalidateSize === "function") {
        requestAnimationFrame(function () { try { estado.mapRutas.invalidateSize(false); } catch (e) {} });
      }
    } catch (e) {}
  }

  function debouncedRefresh() {
    if (!isRoutePageVisible()) return;
    if (window.__rutalogPanelRefreshQueued) return;
    window.__rutalogPanelRefreshQueued = true;
    requestAnimationFrame(function () {
      hideDupCamion();
      updateBtnCentro();
      stripOrigenFromLista();
      forcePanelStretch();
      window.__rutalogPanelRefreshQueued = false;
    });
  }

  function installRefrescar() {
    if (typeof window.refrescarRutaUI === "function" && window.refrescarRutaUI.__rutalogRoutePanelUi) return;
    if (typeof window.refrescarRutaUI === "function") {
      var orig = window.refrescarRutaUI;
      window.refrescarRutaUI = function () {
        var r = orig.apply(this, arguments);
        setTimeout(debouncedRefresh, 0);
        return r;
      };
      window.refrescarRutaUI.__rutalogRoutePanelUi = true;
    }
  }

  function installGo() {
    if (typeof window.go !== "function" || window.go.__rutalogRoutePanelUi) return;
    var orig = window.go;
    window.go = function (page) {
      var r = orig.apply(this, arguments);
      setTimeout(debouncedRefresh, 40);
      return r;
    };
    window.go.__rutalogRoutePanelUi = true;
  }

  function installObserver() {
    if (window.__rutalogRouteObserver) return;
    var target = document.getElementById("page-rutas");
    if (!target || typeof MutationObserver === "undefined") return;
    var observer = new MutationObserver(function () {
      if (isRoutePageVisible()) debouncedRefresh();
    });
    observer.observe(target, { attributes: true, attributeFilter: ["class"] });
    window.__rutalogRouteObserver = observer;
  }

  function installResizeObserver() {
    if (window.__rutalogRouteResizeObserver) return;
    var mapEl = document.getElementById("mapRutas");
    if (!mapEl || typeof ResizeObserver === "undefined") return;
    var ro = new ResizeObserver(function () {
      if (isRoutePageVisible()) debouncedRefresh();
    });
    ro.observe(mapEl);
    window.__rutalogRouteResizeObserver = ro;
  }

  function tick() {
    ensureCss();
    hideDupCamion();
    updateBtnCentro();
    stripOrigenFromLista();
    forcePanelStretch();
    installRefrescar();
    installGo();
    installObserver();
    installResizeObserver();
    if (isRoutePageVisible()) debouncedRefresh();
  }

  tick();
  setTimeout(tick, 300);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) debouncedRefresh();
  });
  window.addEventListener("resize", function () { debouncedRefresh(); }, { passive: true });
  console.info("[RUTALOG] rutas-panel-ui v3 — panel único, sin polling");
})();
