/* RUTALOG ciudades-disponibles v1
 * Deshabilita chips de ciudades sin clientes disponibles en el mapa/día.
 */
(function () {
  "use strict";
  if (window.__rutalogCiudadesDisponiblesV1) return;
  window.__rutalogCiudadesDisponiblesV1 = true;

  function cityKey(s) {
    if (typeof window.rutalogCityKey === "function") return window.rutalogCityKey(s);
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function enViajeOGuardado(id) {
    try {
      if ((estado.viajeActual || []).some(function (p) {
        return String(p.idCliente) === String(id);
      }))
        return true;
      return (estado.viajesGuardados || []).some(function (v) {
        return (v.paradas || []).some(function (p) {
          return String(p.idCliente) === String(id);
        });
      });
    } catch (e) {
      return false;
    }
  }

  function clienteDisponible(c) {
    if (!c || c.lat == null || c.lon == null) return false;
    if (enViajeOGuardado(c.idCliente)) return false;
    try {
      if (typeof clienteCompletamenteAsignado === "function") {
        if (clienteCompletamenteAsignado(c.idCliente) || clienteCompletamenteAsignado(String(c.idCliente)))
          return false;
      }
    } catch (e) {}
    try {
      if (typeof clienteTieneLineasPendientes === "function") {
        if (!clienteTieneLineasPendientes(c.idCliente)) return false;
      }
    } catch (e) {}
    var peso = Number(c.peso) || 0;
    if (!(peso > 0)) {
      try {
        var pend =
          (estado.lineasPendientes &&
            (estado.lineasPendientes.get(c.idCliente) ||
              estado.lineasPendientes.get(String(c.idCliente)))) ||
          [];
        var has = pend.some(function (l) {
          return !l.despachado && (l.aDespachar == null || Math.abs(Number(l.aDespachar)) > 0);
        });
        if (!has) return false;
      } catch (e2) {
        return false;
      }
    }
    return true;
  }

  function conteoPorCiudad() {
    var map = {};
    (estado.clientesHoy || []).forEach(function (c) {
      if (!clienteDisponible(c)) return;
      var k = cityKey(c.ciudad);
      if (!k) return;
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }

  function ensureCss() {
    if (document.getElementById("rutalog-ciu-disp-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-ciu-disp-css";
    st.textContent =
      ".ciu-chip.is-empty{opacity:.38;cursor:not-allowed;pointer-events:none;}" +
      ".ciu-chip.is-empty input{cursor:not-allowed;}" +
      ".ciu-chip .ciu-n{font-size:10px;opacity:.75;margin-left:4px;font-weight:600;}";
    (document.head || document.documentElement).appendChild(st);
  }

  function actualizarChips() {
    if (!window.estado) return;
    ensureCss();
    var counts = conteoPorCiudad();
    document.querySelectorAll(".chk-ciudad").forEach(function (chk) {
      var label = chk.closest("label") || chk.parentElement;
      var k = cityKey(chk.value);
      var n = counts[k] || 0;
      var empty = n <= 0;
      chk.disabled = empty;
      if (empty && chk.checked) {
        chk.checked = false;
        try {
          chk.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (e) {}
      }
      if (label) {
        if (empty) label.classList.add("is-empty");
        else label.classList.remove("is-empty");
        label.title = empty
          ? "Sin clientes disponibles en esta ciudad"
          : n + " cliente(s) disponible(s)";
        var badge = label.querySelector(".ciu-n");
        if (!empty) {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "ciu-n";
            label.appendChild(badge);
          }
          badge.textContent = "(" + n + ")";
        } else if (badge) {
          badge.remove();
        }
      }
    });
  }

  function after(fn) {
    if (typeof window[fn] !== "function") return;
    if (window[fn]._ciuDisp) return;
    var orig = window[fn];
    window[fn] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(actualizarChips, 80);
      setTimeout(actualizarChips, 400);
      return r;
    };
    window[fn]._ciuDisp = true;
  }

  function tick() {
    after("construirHoy");
    after("renderMapas");
    after("refrescarRutaUI");
    after("confirmarAuditoriaYDespachar");
    if (typeof window.rutalogRebuildCiudades === "function" && !window.rutalogRebuildCiudades._ciuDisp) {
      var rb = window.rutalogRebuildCiudades;
      window.rutalogRebuildCiudades = function () {
        var r = rb.apply(this, arguments);
        setTimeout(actualizarChips, 50);
        setTimeout(actualizarChips, 250);
        return r;
      };
      window.rutalogRebuildCiudades._ciuDisp = true;
    }
    actualizarChips();
  }

  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('ciudades:disp', tick, { cada: 4000, vista: 'rutas' }); else setInterval(tick, 4000);
  console.info("[RUTALOG] ciudades-disponibles v1 — chips vacíos deshabilitados");
})();
