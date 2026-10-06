/* RUTALOG hooks v3 — go nunca se bloquea; renderMapas aparte */
(function () {
  "use strict";
  if (window.RUTALOG && window.RUTALOG.hooks && window.RUTALOG.hooks.__v3) return;
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

  var _go = null;
  var _rm = null;
  var _rr = null;
  var goInstalled = false;
  var rmInstalled = false;
  var rrInstalled = false;

  function forcePages() {
    try {
      document.querySelectorAll(".page").forEach(function (p) {
        if (p.classList.contains("active")) {
          p.style.setProperty("display", "flex", "important");
          p.style.setProperty("visibility", "visible", "important");
          p.style.setProperty("opacity", "1", "important");
        } else {
          p.style.setProperty("display", "none", "important");
        }
      });
    } catch (e) {}
  }

  function invalidateRutas() {
    try {
      if (window.estado && estado.mapRutas && estado.mapRutas.invalidateSize) {
        estado.mapRutas.invalidateSize(false);
      }
    } catch (e) {}
  }

  function installGo() {
    if (typeof window.go !== "function") return false;
    if (window.go.__rutalogHooksV3) return true;

    _go = window.go;
    window.go = function (page) {
      var r;
      try {
        emit("antes:go", [page]);
      } catch (e0) {}
      try {
        r = _go.apply(this, arguments);
      } catch (e1) {
        console.warn("[RUTALOG.hooks] go error", e1);
      }
      try {
        forcePages();
      } catch (e2) {}
      try {
        emit("despues:go", [page, r]);
      } catch (e3) {}
      if (page === "rutas") {
        setTimeout(function () {
          try {
            invalidateRutas();
            if (typeof _rm === "function") _rm.call(window);
            else if (typeof window.renderMapas === "function" && window.renderMapas.now) {
              window.renderMapas.now();
            } else if (typeof window.renderMapas === "function" && !window.renderMapas.__rutalogHooksV3) {
              window.renderMapas();
            }
            invalidateRutas();
          } catch (e4) {}
        }, 80);
      }
      return r;
    };
    window.go.__rutalogHooksV3 = true;
    goInstalled = true;
    return true;
  }

  function installRenderMapas() {
    if (typeof window.renderMapas !== "function") return false;
    if (window.renderMapas.__rutalogHooksV3) return true;

    _rm = window.renderMapas;
    window.renderMapas = function () {
      emit("antes:renderMapas", []);
      var r;
      try {
        r = _rm.apply(this, arguments);
      } catch (e) {
        console.warn("[RUTALOG.hooks] renderMapas", e);
      }
      try {
        emit("despues:renderMapas", [r]);
        invalidateRutas();
      } catch (e2) {}
      return r;
    };
    window.renderMapas.__rutalogHooksV3 = true;
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
    rmInstalled = true;
    return true;
  }

  function installRefrescar() {
    if (typeof window.refrescarRutaUI !== "function") return false;
    if (window.refrescarRutaUI.__rutalogHooksV3) return true;
    _rr = window.refrescarRutaUI;
    window.refrescarRutaUI = function () {
      emit("antes:refrescarRutaUI", []);
      var r;
      try {
        r = _rr.apply(this, arguments);
      } catch (e) {
        console.warn("[RUTALOG.hooks] refrescarRutaUI", e);
      }
      emit("despues:refrescarRutaUI", [r]);
      return r;
    };
    window.refrescarRutaUI.__rutalogHooksV3 = true;
    rrInstalled = true;
    return true;
  }

  function install() {
    var a = installGo();
    var b = installRenderMapas();
    installRefrescar();
    return a && b;
  }

  window.RUTALOG.hooks = {
    __v1: true,
    __v2: true,
    __v3: true,
    on: on,
    emit: emit,
    install: install,
    installed: function () { return goInstalled && rmInstalled; }
  };

  var n = 0;
  var t = setInterval(function () {
    n++;
    installGo();
    installRenderMapas();
    installRefrescar();
    if ((goInstalled && rmInstalled) || n > 80) clearInterval(t);
  }, 200);
})();
