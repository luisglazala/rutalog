/* RUTALOG UI polish — jerarquía topbar (sin romper paneles) */
(function () {
  "use strict";
  if (window.__rutalogUiPolishV1) return;
  window.__rutalogUiPolishV1 = true;

  function el(id) {
    return document.getElementById(id);
  }

  function hideLegacySessionBtns() {
    ["btnExportSesion", "btnImportSesion", "fileImportSesion"].forEach(function (id) {
      var n = el(id);
      if (n) {
        n.hidden = true;
        n.style.display = "none";
        n.setAttribute("aria-hidden", "true");
      }
    });
  }

  function ensureDayMenu() {
    var topbar = document.querySelector(".topbar");
    if (!topbar || el("uiDayMenu")) return;

    var limpiar = el("btnLimpiarDia");
    var borrar = el("btnBorrarViajesTop");
    if (!limpiar && !borrar) return;

    var details = document.createElement("details");
    details.className = "ui-day-menu";
    details.id = "uiDayMenu";
    details.innerHTML =
      '<summary class="btn btn-secondary btn-sm" title="Acciones del día">Día ▾</summary>' +
      '<div class="ui-day-dropdown" id="uiDayDropdown"></div>';

    var drop = details.querySelector("#uiDayDropdown");
    var anchor = el("btnDescargar") || el("userChipBar") || topbar.querySelector(".spacer");

    if (limpiar) {
      limpiar.classList.add("btn-sm");
      drop.appendChild(limpiar);
    }
    if (borrar) {
      borrar.classList.add("btn-sm");
      drop.appendChild(borrar);
    }

    if (anchor && anchor.parentNode === topbar) {
      topbar.insertBefore(details, anchor);
    } else {
      topbar.appendChild(details);
    }

    document.addEventListener("click", function (e) {
      if (!details.open) return;
      if (!details.contains(e.target)) details.open = false;
    });
  }

  function stylePrimaryDownload() {
    var d = el("btnDescargar");
    if (d) {
      d.classList.add("btn-primary");
      d.classList.remove("btn-secondary");
    }
  }

  function contextChip() {
    if (el("uiContextChip")) return;
    var topbar = document.querySelector(".topbar");
    var date = el("fechaHoy");
    if (!topbar || !date) return;
    var chip = document.createElement("span");
    chip.id = "uiContextChip";
    chip.className = "ui-chip";
    chip.innerHTML = '<span>Ops</span> <strong id="uiContextChipText">—</strong>';
    if (date.nextSibling) topbar.insertBefore(chip, date.nextSibling);
    else topbar.appendChild(chip);

    function refresh() {
      var t = el("uiContextChipText");
      if (!t) return;
      var centro = "";
      try {
        if (window.estado && estado.origenActual && estado.origenActual.nombre) {
          centro = estado.origenActual.nombre;
        } else if (window.estado && estado.centroNombre) {
          centro = estado.centroNombre;
        }
      } catch (e) {}
      t.textContent = centro || "Sin centro";
    }
    refresh();
    setInterval(refresh, 4000);
  }

  function boot() {
    try {
      hideLegacySessionBtns();
      ensureDayMenu();
      stylePrimaryDownload();
      contextChip();
    } catch (e) {
      console.warn("[ui-polish]", e);
    }
  }

  boot();
  setTimeout(boot, 400);
  setTimeout(boot, 1500);
  setTimeout(boot, 3500);
})();
