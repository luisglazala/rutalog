/* RUTALOG mejoras-map-refresh v1 — repintar mapa tras Excel / limpiar día / borrar viajes */
(function () {
  "use strict";
  if (window.__rutalogMapRefreshV1) return;
  window.__rutalogMapRefreshV1 = true;

  function forceMapRefresh(reason) {
    try {
      if (typeof renderMapas === "function") renderMapas();
    } catch (e) {
      console.warn("[map-refresh] renderMapas", e);
    }
    var delays = [50, 150, 350, 700, 1200];
    delays.forEach(function (ms) {
      setTimeout(function () {
        try {
          if (window.estado) {
            if (estado.mapPanel) {
              estado.mapPanel.invalidateSize(true);
              if (estado.clientesHoy && estado.clientesHoy.length && estado.clusterPanel) {
                var b = estado.clusterPanel.getBounds && estado.clusterPanel.getBounds();
                if (b && b.isValid && b.isValid()) {
                  estado.mapPanel.fitBounds(b, { padding: [30, 30], maxZoom: 12 });
                }
              }
            }
            if (estado.mapRutas) estado.mapRutas.invalidateSize(true);
            if (estado.mapCruzados) estado.mapCruzados.invalidateSize(true);
          }
          if (typeof renderMapas === "function") renderMapas();
        } catch (e2) {}
      }, ms);
    });
    if (reason) console.info("[RUTALOG] map-refresh:", reason);
  }

  window.rutalogForceMapRefresh = forceMapRefresh;

  function wrapConstruirHoy() {
    if (typeof window.construirHoy !== "function") return;
    if (window.construirHoy._mapRefresh) return;
    var orig = window.construirHoy;
    window.construirHoy = function (filas) {
      var r = orig.apply(this, arguments);
      forceMapRefresh("construirHoy");
      return r;
    };
    window.construirHoy._mapRefresh = true;
  }

  function wrapRenderMapas() {
    if (typeof window.renderMapas !== "function") return;
    if (window.renderMapas._sizeHook) return;
    var orig = window.renderMapas;
    window.renderMapas = function () {
      var r = orig.apply(this, arguments);
      try {
        if (window.estado && estado.mapPanel) {
          setTimeout(function () {
            try { estado.mapPanel.invalidateSize(true); } catch (e) {}
          }, 80);
        }
      } catch (e) {}
      return r;
    };
    window.renderMapas._sizeHook = true;
  }

  function wireButtons() {
    var lim = document.getElementById("btnLimpiarDia");
    if (lim && !lim._mapRefresh) {
      lim._mapRefresh = true;
      lim.addEventListener("click", function () {
        setTimeout(function () { forceMapRefresh("limpiar-dia"); }, 400);
        setTimeout(function () { forceMapRefresh("limpiar-dia-2"); }, 1000);
      }, true);
    }
    var bor = document.getElementById("btnBorrarViajesTop");
    if (bor && !bor._mapRefresh) {
      bor._mapRefresh = true;
      bor.addEventListener("click", function () {
        setTimeout(function () { forceMapRefresh("borrar-viajes"); }, 400);
        setTimeout(function () { forceMapRefresh("borrar-viajes-2"); }, 1000);
      }, true);
    }
    var drop = document.getElementById("dropDiario");
    if (drop && !drop._mapRefresh) {
      drop._mapRefresh = true;
      drop.addEventListener("drop", function () {
        setTimeout(function () { forceMapRefresh("drop-excel"); }, 500);
        setTimeout(function () { forceMapRefresh("drop-excel-2"); }, 1200);
      }, true);
    }
    var file = document.getElementById("fileDiario");
    if (file && !file._mapRefresh) {
      file._mapRefresh = true;
      file.addEventListener("change", function () {
        setTimeout(function () { forceMapRefresh("file-excel"); }, 600);
        setTimeout(function () { forceMapRefresh("file-excel-2"); }, 1400);
      }, true);
    }
  }

  function wrapGo() {
    if (typeof window.go !== "function") return;
    if (window.go._mapRefresh) return;
    var orig = window.go;
    window.go = function (page) {
      var r = orig.apply(this, arguments);
      if (page === "panel" || page === "rutas") {
        setTimeout(function () { forceMapRefresh("go-" + page); }, 100);
        setTimeout(function () { forceMapRefresh("go-" + page + "-2"); }, 400);
      }
      return r;
    };
    window.go._mapRefresh = true;
  }

  function tick() {
    wrapConstruirHoy();
    wrapRenderMapas();
    wrapGo();
    wireButtons();
  }

  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  setTimeout(tick, 3000);
  setInterval(tick, 5000);
  console.info("[RUTALOG] map-refresh v1");
})();
