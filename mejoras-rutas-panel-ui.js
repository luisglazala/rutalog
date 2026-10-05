/* RUTALOG rutas-panel-ui v1
 * - Panel lateral misma altura que el mapa
 * - Oculta selector Camión duplicado (#rutalogPlanCamion)
 * - Quita chip Origen de la lista de paradas
 * - "Cambiar centro" muestra el centro activo
 */
(function () {
  "use strict";
  if (window.__rutalogRutasPanelUiV1) return;
  window.__rutalogRutasPanelUiV1 = true;

  function ensureCss() {
    if (document.getElementById("rutalog-rutas-panel-ui-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-rutas-panel-ui-css";
    st.textContent = [
      "#rutalogPlanCamion{display:none!important;}",
      "#page-rutas.active .map-box{",
      "  display:flex!important;align-items:stretch!important;",
      "  min-height:0!important;flex:1 1 auto!important;",
      "}",
      "#page-rutas.active .side-panel{",
      "  display:flex!important;flex-direction:column!important;",
      "  align-self:stretch!important;height:auto!important;",
      "  max-height:none!important;min-height:0!important;",
      "  overflow:auto!important;",
      "}",
      "#page-rutas.active #mapRutas{",
      "  flex:1 1 auto!important;min-height:0!important;",
      "}",
      "#btnCambiarCentro{width:100%;justify-content:flex-start;}",
      "#btnCambiarCentro .centro-actual{",
      "  margin-left:auto;font-weight:700;opacity:.95;",
      "  padding:2px 8px;border-radius:999px;font-size:11px;",
      "  background:rgba(56,189,248,.15);color:#7dd3fc;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(st);
  }

  function hideDupCamion() {
    var el = document.getElementById("rutalogPlanCamion");
    if (el) el.style.display = "none";
    document.querySelectorAll("#rutalogPlanCamion, .rutalog-plan-camion").forEach(function (n) {
      n.style.display = "none";
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
      var t = (li.textContent || "").trim();
      if (t.indexOf("Origen:") === 0 || (li.querySelector(".nombre-p") && /Origen:/.test(li.textContent))) {
        li.remove();
      }
    });
  }

  function installRefrescar() {
    if (typeof window.refrescarRutaUI !== "function") return;
    if (window.refrescarRutaUI._panelUi) return;
    var orig = window.refrescarRutaUI;
    window.refrescarRutaUI = function () {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        stripOrigenFromLista();
        updateBtnCentro();
        hideDupCamion();
      }, 0);
      setTimeout(function () {
        stripOrigenFromLista();
        updateBtnCentro();
        hideDupCamion();
      }, 80);
      return r;
    };
    window.refrescarRutaUI._panelUi = true;
  }

  function installSeleccionar() {
    if (typeof window.seleccionarOrigen !== "function") return;
    if (window.seleccionarOrigen._panelUi) return;
    var so = window.seleccionarOrigen;
    window.seleccionarOrigen = function () {
      var r = so.apply(this, arguments);
      setTimeout(updateBtnCentro, 20);
      return r;
    };
    window.seleccionarOrigen._panelUi = true;
  }

  function tick() {
    ensureCss();
    hideDupCamion();
    updateBtnCentro();
    stripOrigenFromLista();
    installRefrescar();
    installSeleccionar();
  }
  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setInterval(tick, 4000);
  console.info("[RUTALOG] rutas-panel-ui v1 — centro en botón, sin origen ni camión dup");
})();
