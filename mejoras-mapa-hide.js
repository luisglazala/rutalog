/* RUTALOG mapa-hide v1 — fuerza ocultar clientes ya despachados/guardados */
(function () {
  "use strict";
  if (window.__rutalogMapaHideV1) return;
  window.__rutalogMapaHideV1 = true;

  function getPend(id) {
    if (!window.estado || !estado.lineasPendientes) return null;
    return estado.lineasPendientes.get(id) ||
      estado.lineasPendientes.get(String(id)) ||
      estado.lineasPendientes.get(Number(id)) || null;
  }

  function hasResidual(id) {
    var pend = getPend(id);
    if (!pend || !pend.length) return false;
    return pend.some(function (l) {
      return !l.despachado && (l.aDespachar == null || Math.abs(Number(l.aDespachar)) > 1e-9);
    });
  }

  function isCompleto(id) {
    try {
      if (typeof clienteCompletamenteAsignado === "function") {
        if (clienteCompletamenteAsignado(id)) return true;
        if (clienteCompletamenteAsignado(String(id))) return true;
        var n = Number(id);
        if (!isNaN(n) && clienteCompletamenteAsignado(n)) return true;
      }
    } catch (e) {}
    var pend = getPend(id);
    if (pend && pend.length && !hasResidual(id)) return true;
    return false;
  }

  function inGuardado(id) {
    try {
      return (estado.viajesGuardados || []).some(function (v) {
        return (v.paradas || []).some(function (p) {
          return String(p.idCliente) === String(id);
        });
      });
    } catch (e) { return false; }
  }

  function inActual(id) {
    try {
      return (estado.viajeActual || []).some(function (p) {
        return String(p.idCliente) === String(id);
      });
    } catch (e) { return false; }
  }

  function debeOcultar(id) {
    if (inActual(id)) return false;
    if (isCompleto(id)) return true;
    if (inGuardado(id) && !hasResidual(id)) return true;
    if (inGuardado(id)) {
      var cli = (estado.clientesHoy || []).find(function (c) {
        return String(c.idCliente) === String(id);
      });
      if (cli && !(Number(cli.peso) > 0)) return true;
    }
    return false;
  }

  function purgeMarkers() {
    if (!window.estado) return;
    function purgeCluster(cluster, markersMap) {
      if (!cluster || !markersMap) return;
      var toRemove = [];
      markersMap.forEach(function (marker, id) {
        if (inActual(id)) return;
        if (debeOcultar(id)) toRemove.push(id);
      });
      toRemove.forEach(function (id) {
        var m = markersMap.get(id);
        try {
          if (m && cluster.hasLayer && cluster.hasLayer(m)) cluster.removeLayer(m);
          else if (m && estado.mapRutas) estado.mapRutas.removeLayer(m);
          if (m && estado.mapPanel) estado.mapPanel.removeLayer(m);
        } catch (e) {}
        markersMap.delete(id);
      });
    }
    try {
      purgeCluster(estado.clusterRutas, estado.markersRutas);
      purgeCluster(estado.clusterPanel, estado.markersPanel);
    } catch (e) {}
    try {
      var n = 0, peso = 0;
      (estado.clientesHoy || []).forEach(function (c) {
        if (!c || c.lat == null) return;
        if (inActual(c.idCliente)) return;
        if (debeOcultar(c.idCliente)) return;
        n++;
        peso += Number(c.peso) || 0;
      });
      var el = document.getElementById("badgeActivos");
      if (el) el.textContent = n + " puntos activos";
      el = document.getElementById("badgeMapaPanel");
      if (el) el.textContent = n + " puntos";
      el = document.getElementById("sMapa");
      if (el) el.textContent = String(n);
      el = document.getElementById("sPeso");
      if (el) el.textContent = peso.toFixed(2) + " kg";
    } catch (e) {}
  }

  function after(fn) {
    if (typeof window[fn] !== "function") return;
    if (window[fn]._mapHide) return;
    var orig = window[fn];
    window[fn] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(purgeMarkers, 40);
      setTimeout(purgeMarkers, 250);
      setTimeout(purgeMarkers, 700);
      return r;
    };
    window[fn]._mapHide = true;
  }

  function tick() {
    after("renderMapas");
    after("refrescarRutaUI");
    after("confirmarAuditoriaYDespachar");
    after("agregarParada");
    purgeMarkers();
  }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('mapa:hide', tick, { cada: 4000, vista: 'rutas' }); else setInterval(tick, 4000);
  console.info("[RUTALOG] mapa-hide v1 — purga clientes despachados");
})();
