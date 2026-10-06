/* RUTALOG hooks v4 — go ligero; sin renderMapas automático al cambiar panel */
(function () {
  "use strict";
  if (window.RUTALOG && window.RUTALOG.hooks && window.RUTALOG.hooks.__v5) return;
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

  function forcePages() {
    try {
      document.querySelectorAll(".page").forEach(function (p) {
        if (p.classList.contains("active")) {
          p.style.setProperty("display", "flex", "important");
        } else {
          p.style.setProperty("display", "none", "important");
        }
      });
    } catch (e) {}
  }

  function installGo() {
    if (typeof window.go !== "function") return false;
    if (window.go.__rutalogHooksV5) return true;
    _go = window.go;
    window.go = function (page) {
      var silent = !!window.__rutalogNavSilent;
      try { emit("antes:go", [page]); } catch (e0) {}
      var r;
      try { r = _go.apply(this, arguments); } catch (e1) {
        console.warn("[RUTALOG.hooks] go", e1);
      }
      if (!silent) {
        try { forcePages(); } catch (e2) {}
      }
      try { emit("despues:go", [page, r]); } catch (e3) {}
      /* NO renderMapas aquí — solo invalidate si ya hay mapa (barato) */
      if (page === "rutas" && !silent) {
        setTimeout(function () {
          try {
            if (window.estado && estado.mapRutas) estado.mapRutas.invalidateSize(false);
          } catch (e4) {}
        }, 100);
      }
      return r;
    };
    window.go.__rutalogHooksV5 = true;
    goInstalled = true;
    return true;
  }

  function installRenderMapas() {
    if (typeof window.renderMapas !== "function") return false;
    if (window.renderMapas.__rutalogHooksV5) return true;
    _rm = window.renderMapas;
    window.renderMapas = function () {
      /* Durante cambio de panel silencioso: no repintar miles de pines */
      if (window.__rutalogNavSilent) return;
      emit("antes:renderMapas", []);
      var r;
      try { r = _rm.apply(this, arguments); } catch (e) {
        console.warn("[RUTALOG.hooks] renderMapas", e);
      }
      try { emit("despues:renderMapas", [r]); } catch (e2) {}
      return r;
    };
    window.renderMapas.__rutalogHooksV5 = true;
    window.renderMapas.now = function () {
      emit("antes:renderMapas", []);
      try {
        var r = _rm.apply(window, arguments);
        emit("despues:renderMapas", [r]);
        return r;
      } catch (e) {}
    };
    rmInstalled = true;
    return true;
  }

  function installRefrescar() {
    if (typeof window.refrescarRutaUI !== "function") return false;
    if (window.refrescarRutaUI.__rutalogHooksV5) return true;
    _rr = window.refrescarRutaUI;
    window.refrescarRutaUI = function () {
      emit("antes:refrescarRutaUI", []);
      var r;
      try { r = _rr.apply(this, arguments); } catch (e) {}
      emit("despues:refrescarRutaUI", [r]);
      return r;
    };
    window.refrescarRutaUI.__rutalogHooksV5 = true;
    return true;
  }

  function install() {
    installGo();
    installRenderMapas();
    installRefrescar();
    return goInstalled && rmInstalled;
  }

  window.RUTALOG.hooks = {
    __v1: true, __v2: true, __v3: true, __v4: true, __v5: true,
    on: on, emit: emit, install: install,
    installed: function () { return goInstalled && rmInstalled; },
    setCoreRenderMapas: function (fn) {
      if (typeof fn === "function") { _rm = fn; }
    },
    setCoreRefrescarRutaUI: function (fn) {
      if (typeof fn === "function") { _rr = fn; }
    },
    setCoreGo: function (fn) {
      if (typeof fn === "function") { _go = fn; }
    }
  };

  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if ((goInstalled && rmInstalled) || n > 80) clearInterval(t);
  }, 200);
})();
