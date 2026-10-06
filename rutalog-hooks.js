/* RUTALOG hooks v2 — wrapper seguro + repaint mapa al entrar en rutas */
(function () {
  "use strict";
  if (window.RUTALOG && window.RUTALOG.hooks && window.RUTALOG.hooks.__v2) return;
  window.RUTALOG = window.RUTALOG || {};

  var listeners = {
    "antes:go": [], "despues:go": [],
    "antes:renderMapas": [], "despues:renderMapas": [],
    "antes:refrescarRutaUI": [], "despues:refrescarRutaUI": []
  };

  function on(ev, fn) {
    if (!listeners[ev]) listeners[ev] = [];
    if (typeof fn === "function") listeners[ev].push(fn);
    return function () {
      listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; });
    };
  }

  function emit(ev, args) {
    var list = listeners[ev] || [];
    for (var i = 0; i < list.length; i++) {
      try { list[i].apply(null, args || []); } catch (e) {
        console.warn("[RUTALOG.hooks]", ev, e);
      }
    }
  }

  var installed = false;
  var _go = null;
  var _rm = null;
  var _rr = null;

  function callRenderNow() {
    try {
      if (typeof _rm === "function") _rm.call(window);
      else if (typeof window.renderMapas === "function" && !window.renderMapas.__rutalogHooks) {
        window.renderMapas();
      } else if (window.renderMapas && window.renderMapas.now) {
        window.renderMapas.now();
      }
    } catch (e) {
      console.warn("[RUTALOG.hooks] callRenderNow", e);
    }
  }

  function invalidateRutas() {
    try {
      if (window.estado && estado.mapRutas && estado.mapRutas.invalidateSize) {
        estado.mapRutas.invalidateSize(false);
      }
    } catch (e) {}
  }

  function install() {
    if (typeof window.go !== "function") return false;
    if (typeof window.renderMapas !== "function") return false;

    /* Si ya instalamos, actualizar refs si alguien reasignó el original por debajo */
    if (installed) {
      if (window.go.__rutalogHooks && window.renderMapas.__rutalogHooks) return true;
    }

    var goCand = window.go;
    var rmCand = window.renderMapas;
    var rrCand = typeof window.refrescarRutaUI === "function" ? window.refrescarRutaUI : null;

    /* No re-envolver nuestro propio wrapper */
    if (goCand.__rutalogHooks) goCand = _go || goCand;
    if (rmCand.__rutalogHooks) rmCand = _rm || rmCand;
    if (rrCand && rrCand.__rutalogHooks) rrCand = _rr || rrCand;

    _go = goCand;
    _rm = rmCand;
    _rr = rrCand;

    window.go = function (page) {
      emit("antes:go", [page]);
      var r = _go.apply(this, arguments);
      emit("despues:go", [page, r]);
      if (page === "rutas") {
        setTimeout(function () {
          invalidateRutas();
          callRenderNow();
          invalidateRutas();
        }, 50);
        setTimeout(function () {
          invalidateRutas();
          callRenderNow();
        }, 300);
      }
      return r;
    };
    window.go.__rutalogHooks = true;

    /* Sin debounce agresivo: pintar ya; rAF solo para emit after */
    window.renderMapas = function () {
      emit("antes:renderMapas", []);
      var r;
      try {
        r = _rm.apply(this, arguments);
      } catch (e) {
        console.warn("[RUTALOG.hooks] renderMapas", e);
      }
      try {
        requestAnimationFrame(function () {
          emit("despues:renderMapas", [r]);
          invalidateRutas();
        });
      } catch (e2) {
        emit("despues:renderMapas", [r]);
      }
      return r;
    };
    window.renderMapas.__rutalogHooks = true;
    window.renderMapas.now = function () {
      emit("antes:renderMapas", []);
      try {
        var r = _rm.apply(window, arguments);
        emit("despues:renderMapas", [r]);
        invalidateRutas();
        return r;
      } catch (e) {
        console.warn("[RUTALOG.hooks] renderMapas.now", e);
      }
    };

    if (_rr) {
      window.refrescarRutaUI = function () {
        emit("antes:refrescarRutaUI", []);
        var r = _rr.apply(this, arguments);
        emit("despues:refrescarRutaUI", [r]);
        return r;
      };
      window.refrescarRutaUI.__rutalogHooks = true;
    }

    installed = true;
    console.info("[RUTALOG.hooks] v2 wrappers instalados");
    return true;
  }

  window.RUTALOG.hooks = {
    __v1: true,
    __v2: true,
    on: on,
    emit: emit,
    install: install,
    installed: function () { return installed; }
  };

  var n = 0;
  var t = setInterval(function () {
    n++;
    if (install() || n > 60) clearInterval(t);
  }, 200);
})();
