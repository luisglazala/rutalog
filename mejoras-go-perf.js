/* RUTALOG — capa2: un solo render al cambiar de panel + debounce de mapas */
(function () {
  "use strict";
  if (window.__rutalogGoPerfV1) return;
  window.__rutalogGoPerfV1 = true;

  var _rmTimer = null;
  var _rmOrig = null;
  var _goOrig = null;

  function ensureRenderMapasWrapped() {
    if (typeof window.renderMapas !== "function") return false;
    if (window.renderMapas._goPerfDebounce) return true;
    _rmOrig = window.renderMapas;
    window.renderMapas = function renderMapasDebounced() {
      if (_rmTimer) clearTimeout(_rmTimer);
      _rmTimer = setTimeout(function () {
        _rmTimer = null;
        try {
          if (_rmOrig) _rmOrig.call(window);
        } catch (e) {
          console.warn("[go-perf] renderMapas", e);
        }
      }, 90);
    };
    window.renderMapas._goPerfDebounce = true;
    window.renderMapas.now = function () {
      if (_rmTimer) {
        clearTimeout(_rmTimer);
        _rmTimer = null;
      }
      try {
        if (_rmOrig) _rmOrig.call(window);
      } catch (e) {
        console.warn("[go-perf] renderMapas.now", e);
      }
    };
    return true;
  }

  function patchGo() {
    if (typeof window.go !== "function") return false;
    if (window.go._goPerfV1) return true;
    _goOrig = window.go;

    window.go = function goPerf(page) {
      ensureRenderMapasWrapped();

      var realRM = _rmOrig || window.renderMapas;
      if (window.renderMapas && window.renderMapas._goPerfDebounce && _rmOrig) {
        realRM = _rmOrig;
      }
      var realRC = window.renderCodigoTable;
      var realCruz = window.renderCruzadosMapa;
      var realTopes = window.renderTopesTable;

      /* Durante el go del core, tragar llamadas a mapa/código (el core agenda +120ms) */
      var blocking = true;
      window.renderMapas = function () {
        if (blocking) return;
        if (typeof realRM === "function") return realRM.apply(this, arguments);
      };
      window.renderMapas.now = function () {
        if (typeof realRM === "function") return realRM.apply(this, arguments);
      };
      if (typeof realRC === "function") {
        window.renderCodigoTable = function () {
          if (blocking) return;
          return realRC.apply(this, arguments);
        };
      }

      var result = _goOrig.apply(this, arguments);

      setTimeout(function () {
        blocking = false;
        /* Restaurar debounce para el resto de la app */
        if (_rmOrig) {
          window.renderMapas = function renderMapasDebounced() {
            if (_rmTimer) clearTimeout(_rmTimer);
            _rmTimer = setTimeout(function () {
              _rmTimer = null;
              try { _rmOrig.call(window); } catch (e) {}
            }, 90);
          };
          window.renderMapas._goPerfDebounce = true;
          window.renderMapas.now = function () {
            if (_rmTimer) { clearTimeout(_rmTimer); _rmTimer = null; }
            try { _rmOrig.call(window); } catch (e) {}
          };
        }
        if (typeof realRC === "function") window.renderCodigoTable = realRC;

        try {
          if (page === "panel" && window.estado && estado.mapPanel) {
            estado.mapPanel.invalidateSize();
            if (typeof realRM === "function") realRM.call(window);
          } else if (page === "rutas" && window.estado && estado.mapRutas) {
            estado.mapRutas.invalidateSize();
            if (typeof realRM === "function") realRM.call(window);
          } else if (page === "codigo" && typeof realRC === "function") {
            realRC.call(window);
          } else if (page === "cruzados" && window.estado && estado.mapCruzados) {
            estado.mapCruzados.invalidateSize();
            if (typeof realCruz === "function") realCruz.call(window);
          } else if (page === "topes" && typeof realTopes === "function") {
            realTopes.call(window);
          }
        } catch (e) {
          console.warn("[go-perf] post-go", e);
        }
      }, 130);

      return result;
    };
    window.go._goPerfV1 = true;
    return true;
  }

  function boot() {
    ensureRenderMapasWrapped();
    patchGo();
  }

  boot();
  setTimeout(boot, 200);
  setTimeout(boot, 800);
  setTimeout(boot, 2000);
  setTimeout(boot, 4000);
})();
