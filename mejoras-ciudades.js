/* RUTALOG ciudades v2 — syntax fixed */
(function () {
  "use strict";
  if (window.__rutalogCiudadesV2) return;
  window.__rutalogCiudadesV2 = true;
  window.__rutalogCiudadesV1 = true;

  function rebuildCiudadesList() {
    try {
      if (!window.estado) return 0;
      var set = new Set();
      (estado.clientesHoy || []).forEach(function (c) {
        if (c.ciudad) set.add(String(c.ciudad).trim());
        if (c.localidad) set.add(String(c.localidad).trim());
        if (c.provincia) set.add(String(c.provincia).trim());
      });
      if (estado.maestro && estado.maestro.forEach) {
        (estado.clientesHoy || []).forEach(function (c) {
          try {
            var m = estado.maestro.get(c.idCliente);
            if (!m && c.idCliente) {
              var bare = String(c.idCliente).replace(/^0+/, "") || "0";
              m = estado.maestro.get(bare.padStart(9, "0")) || estado.maestro.get(bare);
            }
            if (m) {
              if (m.ciudad) set.add(String(m.ciudad).trim());
              if (m.localidad) set.add(String(m.localidad).trim());
            }
          } catch (e) {}
        });
      }
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
      console.info("[RUTALOG] ciudades filtro:", ciudades.length, ciudades.slice(0, 8).join(", "));
      return ciudades.length;
    } catch (e) {
      console.warn("[ciudades]", e);
      return 0;
    }
  }

  window.rutalogRebuildCiudades = rebuildCiudadesList;

  function afterHoy() {
    if (typeof window.construirHoy !== "function") return;
    if (window.construirHoy._ciudadesHook) return;
    var orig = window.construirHoy;
    window.construirHoy = function (filas) {
      var r = orig.apply(this, arguments);
      setTimeout(rebuildCiudadesList, 50);
      setTimeout(rebuildCiudadesList, 300);
      setTimeout(rebuildCiudadesList, 800);
      return r;
    };
    window.construirHoy._ciudadesHook = true;
  }

  function afterLimpiar() {
    var btn = document.getElementById("btnLimpiarDia");
    if (!btn || btn._ciudadesHook) return;
    btn._ciudadesHook = true;
    btn.addEventListener(
      "click",
      function () {
        setTimeout(rebuildCiudadesList, 400);
        setTimeout(rebuildCiudadesList, 1000);
      },
      true
    );
  }

  function tick() {
    afterHoy();
    afterLimpiar();
  }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 2000);
  setTimeout(function () {
    rebuildCiudadesList();
  }, 1500);
  setInterval(tick, 4000);
  console.info("[RUTALOG] ciudades v2");
})();
