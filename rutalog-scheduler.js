/* RUTALOG scheduler — un solo setInterval interno */
(function () {
  "use strict";
  if (window.RUTALOG && window.RUTALOG.tick && window.RUTALOG.tick.__v1) return;
  window.RUTALOG = window.RUTALOG || {};

  var tasks = [];
  var timer = null;
  var TICK_MS = 1000;
  var lastPage = "";

  function currentVista() {
    try {
      if (window.estado && estado.page) {
        var p = String(estado.page);
        if (p === "rutas") return "rutas";
        if (p === "panel" || p === "inicio") return "inicio";
        return p; // citas, despachos, etc.
      }
    } catch (e) {}
    try {
      var act = document.querySelector(".page.active");
      if (act && act.id) {
        var id = act.id.replace(/^page-/, "");
        if (id === "rutas") return "rutas";
        if (id === "panel") return "inicio";
        return id;
      }
    } catch (e2) {}
    return "inicio";
  }

  function matchesVista(taskVista, now) {
    if (!taskVista || taskVista === "siempre") return true;
    if (taskVista === now) return true;
    // alias
    if (taskVista === "inicio" && (now === "panel" || now === "inicio")) return true;
    return false;
  }

  function pulse() {
    if (document.hidden) return;
    var now = currentVista();
    var t = Date.now();
    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      if (!matchesVista(task.vista, now)) continue;
      if (t - task.last < task.cada) continue;
      task.last = t;
      try {
        task.fn();
      } catch (err) {
        console.warn("[RUTALOG.tick]", task.nombre, err);
      }
    }
  }

  function ensureTimer() {
    if (timer != null) return;
    timer = setInterval(pulse, TICK_MS);
  }

  function registrar(nombre, fn, opts) {
    opts = opts || {};
    var cada = Math.max(1000, Number(opts.cada) || 4000);
    var vista = opts.vista || "siempre";
    // reemplazar mismo nombre
    tasks = tasks.filter(function (t) { return t.nombre !== nombre; });
    tasks.push({
      nombre: nombre,
      fn: fn,
      cada: cada,
      vista: vista,
      last: 0
    });
    ensureTimer();
    return nombre;
  }

  function cancelar(nombre) {
    tasks = tasks.filter(function (t) { return t.nombre !== nombre; });
  }

  function listar() {
    return tasks.map(function (t) {
      return { nombre: t.nombre, cada: t.cada, vista: t.vista };
    });
  }

  window.RUTALOG.tick = {
    __v1: true,
    registrar: registrar,
    cancelar: cancelar,
    listar: listar,
    _pulse: pulse
  };

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) pulse();
  });
})();
