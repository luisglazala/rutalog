/* RUTALOG UI polish v2 */
(function () {
  "use strict";
  if (window.__rutalogUiPolishV2) return;
  window.__rutalogUiPolishV2 = true;

  function el(id) { return document.getElementById(id); }

  function hideLegacy() {
    ["btnExportSesion", "btnImportSesion", "fileImportSesion"].forEach(function (id) {
      var n = el(id);
      if (n) { n.hidden = true; n.style.display = "none"; }
    });
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
  }

  function styleDownload() {
    var d = el("btnDescargar");
    if (d) { d.classList.add("btn-primary"); d.classList.remove("btn-secondary"); }
  }

  function boot() {
    try {
      hideLegacy();
      ensureDayMenu();
      styleDownload();
    } catch (e) {}
  }
  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1500);
  setTimeout(boot, 4000);
})();
