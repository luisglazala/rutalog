/* RUTALOG UI polish v3 — menú Día se cierra al clic fuera o tras acción */
(function () {
  "use strict";
  if (window.__rutalogUiPolishV3) return;
  window.__rutalogUiPolishV3 = true;
  window.__rutalogUiPolishV2 = true;

  function el(id) { return document.getElementById(id); }

  function hideLegacy() {
    ["btnExportSesion", "btnImportSesion", "fileImportSesion"].forEach(function (id) {
      var n = el(id);
      if (n) { n.hidden = true; n.style.display = "none"; }
    });
  }

  function closeDayMenu() {
    var details = el("uiDayMenu");
    if (details && details.open) {
      details.open = false;
      details.removeAttribute("open");
    }
  }

  function ensureDayMenu() {
    var topbar = document.querySelector(".topbar");
    if (!topbar) return;
    var limpiar = el("btnLimpiarDia");
    var borrar = el("btnBorrarViajesTop");
    if (!limpiar && !borrar) return;

    var details = el("uiDayMenu");
    if (!details) {
      details = document.createElement("details");
      details.className = "ui-day-menu";
      details.id = "uiDayMenu";
      details.innerHTML =
        '<summary class="btn btn-secondary btn-sm">Día ▾</summary>' +
        '<div class="ui-day-dropdown" id="uiDayDropdown"></div>';
      var anchor = el("btnDescargar") || el("userChipBar");
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(details, anchor);
      else topbar.appendChild(details);
    }
    var drop = el("uiDayDropdown") || details.querySelector(".ui-day-dropdown");
    if (limpiar && limpiar.parentNode !== drop) drop.appendChild(limpiar);
    if (borrar && borrar.parentNode !== drop) drop.appendChild(borrar);

    if (limpiar && !limpiar._dayMenuClose) {
      limpiar._dayMenuClose = true;
      limpiar.addEventListener("click", function () {
        setTimeout(closeDayMenu, 0);
        setTimeout(closeDayMenu, 50);
      }, true);
    }
    if (borrar && !borrar._dayMenuClose) {
      borrar._dayMenuClose = true;
      borrar.addEventListener("click", function () {
        setTimeout(closeDayMenu, 0);
        setTimeout(closeDayMenu, 50);
      }, true);
    }
  }

  function wireOutsideClose() {
    if (document.documentElement._dayMenuOutside) return;
    document.documentElement._dayMenuOutside = true;

    document.addEventListener("click", function (e) {
      var details = el("uiDayMenu");
      if (!details || !details.open) return;
      if (details.contains(e.target)) return;
      closeDayMenu();
    }, true);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDayMenu();
    }, true);

    document.addEventListener("focusin", function (e) {
      var details = el("uiDayMenu");
      if (!details || !details.open) return;
      if (details.contains(e.target)) return;
      var t = e.target;
      if (t && t.closest && (t.closest(".modal") || t.closest("[role='dialog']") || t.closest(".confirm-dialog"))) return;
      closeDayMenu();
    }, true);
  }

  function styleDownload() {
    var d = el("btnDescargar");
    if (d) { d.classList.add("btn-primary"); d.classList.remove("btn-secondary"); }
  }

  function boot() {
    try {
      hideLegacy();
      ensureDayMenu();
      wireOutsideClose();
      styleDownload();
    } catch (e) {}
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1500);
  setTimeout(boot, 4000);
  console.info("[RUTALOG] ui-polish v3 — menú Día autoclose");
})();
