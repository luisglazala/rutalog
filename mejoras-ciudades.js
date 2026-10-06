/* RUTALOG ciudades v3 — solo campo ciudad (no localidad/provincia) */
(function () {
  "use strict";
  if (window.__rutalogCiudadesV3) return;
  window.__rutalogCiudadesV3 = true;
  window.__rutalogCiudadesV2 = true;
  window.__rutalogCiudadesV1 = true;

  function soloCiudad(c) {
    if (!c) return "";
    try {
      if (estado.maestro) {
        var m = estado.maestro.get(c.idCliente);
        if (!m && c.idCliente) {
          var bare = String(c.idCliente).replace(/^0+/, "") || "0";
          m = estado.maestro.get(bare.padStart(9, "0")) || estado.maestro.get(bare);
        }
        if (m && m.ciudad) return String(m.ciudad).trim();
      }
    } catch (e) {}
    if (c.ciudad && c.ciudad !== c.localidad) return String(c.ciudad).trim();
    return "";
  }

  function rebuildCiudadesList() {
    try {
      if (!window.estado) return 0;
      var set = new Set();
      (estado.clientesHoy || []).forEach(function (c) {
        var city = soloCiudad(c);
        if (city) set.add(city);
      });
      var ciudades = Array.from(set).filter(Boolean).sort(function (a, b) {
        return a.localeCompare(b, "es");
      });
      var lista = document.getElementById("listaCiudades");
      if (!lista) return 0;
      var prev = [];
      try {
        if (typeof getCiudadesSeleccionadas === "function") prev = getCiudadesSeleccionadas() || [];
      } catch (e) {}
      var keep = prev.filter(function (x) {
        return x !== "__TODAS__" && ciudades.indexOf(x) >= 0;
      });
      lista.innerHTML = ciudades.map(function (c) {
        var safe = String(c)
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;");
        var ck = keep.length && keep.indexOf(c) >= 0 ? "checked" : "";
        return (
          '<label class="ciu-chip"><input type="checkbox" class="chk-ciudad" value="' +
          safe +
          '" ' +
          ck +
          '">' +
          safe +
          "</label>"
        );
      }).join("");
      var chkTodas = document.getElementById("chkTodasCiudades");
      if (chkTodas) chkTodas.checked = !keep.length;
      if (typeof bindCiudadChecks === "function") bindCiudadChecks();
      if (typeof actualizarLabelCiudad === "function") actualizarLabelCiudad();
      console.info("[RUTALOG] ciudades v3:", ciudades.length, ciudades.slice(0, 12).join(", "));
      return ciudades.length;
    } catch (e) {
      console.warn("[ciudades]", e);
      return 0;
    }
  }

  window.rutalogRebuildCiudades = rebuildCiudadesList;

  function afterHoy() {
    if (typeof window.construirHoy !== "function") return;
    if (window.construirHoy._ciudadesHookV3) return;
    var orig = window.construirHoy;
    window.construirHoy = function (filas) {
      var r = orig.apply(this, arguments);
      setTimeout(rebuildCiudadesList, 50);
      setTimeout(rebuildCiudadesList, 300);
      setTimeout(rebuildCiudadesList, 800);
      return r;
    };
    window.construirHoy._ciudadesHookV3 = true;
  }

  function tick() { afterHoy(); }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 2000);
  setTimeout(rebuildCiudadesList, 1500);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('ciudades:tick', tick, { cada: 4000, vista: 'rutas' }); else setInterval(tick, 4000);
  console.info("[RUTALOG] ciudades v3 — solo ciudades");
})();
