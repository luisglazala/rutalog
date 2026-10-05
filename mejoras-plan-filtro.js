/* RUTALOG plan-filtro v1 — Santiago ≠ Santiago Rodríguez; solo ciudades marcadas */
(function () {
  "use strict";
  if (window.__rutalogPlanFiltroV1) return;
  window.__rutalogPlanFiltroV1 = true;

  function cityKey(s) {
    if (typeof window.rutalogCityKey === "function") return window.rutalogCityKey(s);
    var n = String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!n) return "";
    if (n.indexOf("santiago rodriguez") === 0) return "santiago rodriguez";
    if (n === "santiago" || n.indexOf("santiago de los") === 0) return "santiago";
    return n;
  }

  function installBtn() {
    var btn = document.getElementById("btnGenerarViaje");
    if (!btn || btn._filtroV1) return;
    btn._filtroV1 = true;
    btn.addEventListener(
      "click",
      function () {
        try {
          if (typeof getCiudadesSeleccionadas === "function") {
            var sel = getCiudadesSeleccionadas();
            if (sel && sel.length && sel.indexOf("__TODAS__") < 0) {
              window.__rutalogFiltroEstrictoKeys = sel.map(cityKey).filter(Boolean);
            } else {
              window.__rutalogFiltroEstrictoKeys = null;
            }
          }
        } catch (e) {}
        function scrub() {
          var keys = window.__rutalogFiltroEstrictoKeys;
          if (!keys || !keys.length || !estado || !estado.viajeActual) return;
          var before = estado.viajeActual.length;
          estado.viajeActual = estado.viajeActual.filter(function (p) {
            return keys.indexOf(cityKey(p.ciudad)) >= 0;
          });
          if (estado.viajeActual.length !== before) {
            try {
              if (typeof toast === "function")
                toast("Filtro: se quitaron paradas fuera de las ciudades seleccionadas");
            } catch (e) {}
          }
          try {
            if (typeof refrescarRutaUI === "function") refrescarRutaUI();
            if (typeof renderMapas === "function") renderMapas();
          } catch (e2) {}
        }
        setTimeout(scrub, 200);
        setTimeout(scrub, 500);
      },
      true
    );
  }

  function tick() {
    installBtn();
  }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  setInterval(tick, 4000);
  console.info("[RUTALOG] plan-filtro v1 — ciudades estrictas al generar");
})();
