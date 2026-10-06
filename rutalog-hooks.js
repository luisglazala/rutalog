/* RUTALOG hooks — un solo punto de extensión para go / renderMapas / refrescarRutaUI */
(function () {
  "use strict";
  if (window.RUTALOG && window.RUTALOG.hooks && window.RUTALOG.hooks.__v1) return;
  window.RUTALOG = window.RUTALOG || {};

  var listeners = {
    "antes:go": [],
    "despues:go": [],
    "antes:renderMapas": [],
    "despues:renderMapas": [],
    "antes:refrescarRutaUI": [],
    "despues:refrescarRutaUI": []
  };

  function on(ev, fn) {
    if (!listeners[ev]) listeners[ev] = [];
    if (typeof fn === "function") listeners[ev].push(fn);
    return function off() {
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
  var _rmTimer = null;

  function install() {
    if (installed) return true;
    if (typeof window.go !== "function") return false;
    if (typeof window.renderMapas !== "function") return false;

    _go = window.go;
    _rm = window.renderMapas;
    _rr = typeof window.refrescarRutaUI === "function" ? window.refrescarRutaUI : null;

    window.go = function (page) {
      emit("antes:go", [page]);
      var r = _go.apply(this, arguments);
      emit("despues:go", [page, r]);
      return r;
    };
    window.go.__rutalogHooks = true;

    window.renderMapas = function () {
      emit("antes:renderMapas", []);
      if (_rmTimer) clearTimeout(_rmTimer);
      var ctx = this;
      var args = arguments;
      _rmTimer = setTimeout(function () {
        _rmTimer = null;
        try {
          var r = _rm.apply(ctx, args);
          emit("despues:renderMapas", [r]);
        } catch (e) {
          console.warn("[RUTALOG.hooks] renderMapas", e);
        }
      }, 60);
    };
    window.renderMapas.__rutalogHooks = true;
    window.renderMapas.now = function () {
      if (_rmTimer) { clearTimeout(_rmTimer); _rmTimer = null; }
      emit("antes:renderMapas", []);
      try {
        var r = _rm.apply(window, arguments);
        emit("despues:renderMapas", [r]);
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
    console.info("[RUTALOG.hooks] wrappers instalados");
    return true;
  }

  window.RUTALOG.hooks = {
    __v1: true,
    on: on,
    emit: emit,
    install: install,
    installed: function () { return installed; }
  };

  // reintentos suaves tras carga de core
  var n = 0;
  var t = setInterval(function () {
    n++;
    if (install() || n > 40) clearInterval(t);
  }, 250);
})();
