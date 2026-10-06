/* RUTALOG ui-centro-viajes v1
 * - Cancelar cierra el selector de centro
 * - Viajes guardados: solo conteo (sin lista larga)
 */
(function () {
  "use strict";
  if (window.__rutalogUiCentroViajesV1) return;
  window.__rutalogUiCentroViajesV1 = true;

  function cerrarCentro() {
    try {
      if (typeof cerrarSelectorCentro === "function") cerrarSelectorCentro();
    } catch (e) {}
    var overlay = document.getElementById("centroOverlay");
    if (overlay) {
      overlay.hidden = true;
      overlay.style.display = "none";
      overlay.setAttribute("hidden", "");
    }
  }

  function hookCancelar() {
    var btn = document.getElementById("btnCentroCancelar");
    if (!btn || btn._centroCancelHook) return;
    btn._centroCancelHook = true;
    btn.addEventListener(
      "click",
      function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        cerrarCentro();
      },
      true
    );
  }

  function pintarConteoViajes() {
    var cont = document.getElementById("listaViajesGuardados");
    if (!cont) return;
    var n = 0;
    try {
      n = (estado.viajesGuardados || []).length;
    } catch (e) {
      n = 0;
    }
    cont.innerHTML =
      '<div class="rutalog-viajes-conteo" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:#38bdf8;color:#0a0a0a;font-weight:700;font-size:13px;">' +
      n +
      "</span>" +
      '<div><div style="font-weight:600;font-size:13px;">Viajes guardados</div>' +
      '<div style="font-size:11.5px;opacity:.7;">' +
      (n === 0
        ? "Ninguno aún — genera y guarda desde el mapa"
        : n === 1
          ? "1 viaje en el día · detalle en Despachos"
          : n + " viajes en el día · detalle en Despachos") +
      "</div></div></div>" +
      (n > 0
        ? '<button type="button" class="btn btn-secondary btn-sm" id="btnIrDespachosViajes" style="white-space:nowrap;">Ver</button>'
        : "") +
      "</div>";
    var btn = document.getElementById("btnIrDespachosViajes");
    if (btn && !btn._hook) {
      btn._hook = true;
      btn.onclick = function () {
        try {
          if (typeof go === "function") go("despachos");
        } catch (e) {}
      };
    }
  }

  function installRender() {
    if (typeof window.renderViajesGuardados !== "function") return;
    if (window.renderViajesGuardados._conteoHook) return;
    var orig = window.renderViajesGuardados;
    window.renderViajesGuardados = function () {
      try {
        orig.apply(this, arguments);
      } catch (e) {}
      pintarConteoViajes();
    };
    window.renderViajesGuardados._conteoHook = true;
  }

  function installRefrescar() {
    if (typeof window.refrescarRutaUI !== "function") return;
    if (window.refrescarRutaUI._conteoHook) return;
    var orig = window.refrescarRutaUI;
    window.refrescarRutaUI = function () {
      var r = orig.apply(this, arguments);
      setTimeout(pintarConteoViajes, 30);
      return r;
    };
    window.refrescarRutaUI._conteoHook = true;
  }

  function tick() {
    hookCancelar();
    installRender();
    installRefrescar();
    pintarConteoViajes();
  }
  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('ui:centro-viajes', tick, { cada: 4000, vista: 'rutas' }); else setInterval(tick, 4000);
  console.info("[RUTALOG] ui-centro-viajes v1 — Cancelar cierra · conteo viajes");
})();
