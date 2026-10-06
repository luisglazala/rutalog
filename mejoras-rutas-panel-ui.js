/* RUTALOG rutas-panel-ui v2
 * - Panel = altura mapa + responsive
 * - Sin camión duplicado ni chip Origen
 * - Centro activo en Cambiar centro
 */
(function () {
  "use strict";
  if (window.__rutalogRutasPanelUiV2) return;
  window.__rutalogRutasPanelUiV2 = true;
  window.__rutalogRutasPanelUiV1 = true;

  function ensureCss() {
    if (document.getElementById("rutalog-rutas-panel-ui-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-rutas-panel-ui-css";
    st.textContent = [
      "#rutalogPlanCamion{display:none!important;}",
      "#btnCambiarCentro{width:100%;display:inline-flex;align-items:center;gap:8px;justify-content:flex-start;}",
      "#btnCambiarCentro .centro-actual{",
      "  margin-left:auto;font-weight:700;",
      "  padding:2px 8px;border-radius:999px;font-size:11px;",
      "  background:rgba(56,189,248,.15);color:#7dd3fc;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(st);
  }

  function hideDupCamion() {
    var el = document.getElementById("rutalogPlanCamion");
    if (el) el.style.display = "none";
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
    try {
      var page = document.getElementById("page-rutas");
      if (!page || !page.classList.contains("active")) return;
      var main = document.querySelector(".main") || document.querySelector(".content");
      if (main) {
        main.style.display = "flex";
        main.style.flexDirection = "column";
        main.style.minHeight = "0";
        main.style.height = "100%";
        main.style.overflow = "hidden";
      }
      page.style.flex = "1 1 auto";
      page.style.minHeight = "0";
      page.style.height = "100%";
      page.style.display = "flex";
      page.style.flexDirection = "column";
      page.style.overflow = "hidden";
      var box = page.querySelector(".map-box");
      if (box) {
        box.style.flex = "1 1 auto";
        box.style.minHeight = "0";
        box.style.display = "block";
      }
      var panel = page.querySelector(".side-panel");
      if (panel) {
        panel.style.alignSelf = "stretch";
        panel.style.maxHeight = "none";
        panel.style.height = "auto";
        panel.style.minHeight = "0";
        panel.style.overflow = "hidden";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
      }
      var lista = document.getElementById("listaViajeActual");
      if (lista) {
        lista.style.flex = "1 1 auto";
        lista.style.minHeight = "0";
        lista.style.maxHeight = "none";
        lista.style.overflowY = "auto";
      }
      try {
        if (estado.mapRutas && estado.mapRutas.invalidateSize) {
          estado.mapRutas.invalidateSize(false);
        }
      } catch (e) {}
    } catch (e) {}
  }

  function installRefrescar() {
    if (typeof window.refrescarRutaUI !== "function" || window.refrescarRutaUI._panelUiV2) return;
    var orig = window.refrescarRutaUI;
    window.refrescarRutaUI = function () {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        stripOrigenFromLista();
        updateBtnCentro();
        hideDupCamion();
        forcePanelStretch();
      }, 0);
      return r;
    };
    window.refrescarRutaUI._panelUiV2 = true;
    window.refrescarRutaUI._panelUi = true;
  }

  function installGo() {
    if (typeof window.go !== "function" || window.go._rutasStretch) return;
    var g = window.go;
    window.go = function (page) {
      var r = g.apply(this, arguments);
      setTimeout(forcePanelStretch, 40);
      setTimeout(forcePanelStretch, 250);
      return r;
    };
    window.go._rutasStretch = true;
  }

  function tick() {
    ensureCss();
    hideDupCamion();
    updateBtnCentro();
    stripOrigenFromLista();
    forcePanelStretch();
    installRefrescar();
    installGo();
  }

  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setInterval(tick, 5000);
  window.addEventListener("resize", forcePanelStretch);
  // El mapa se reajusta solo cuando cambia el tamaño de su recuadro
  try {
    var _mapEl = document.getElementById("mapRutas");
    if (_mapEl && window.ResizeObserver && !_mapEl.__rlRO) {
      _mapEl.__rlRO = new ResizeObserver(function () {
        try { if (estado.mapRutas && estado.mapRutas.invalidateSize) estado.mapRutas.invalidateSize(false); } catch (e) {}
      });
      _mapEl.__rlRO.observe(_mapEl);
    }
  } catch (e) {}
  console.info("[RUTALOG] rutas-panel-ui v2 — panel altura mapa + responsive");
})();
