/* RUTALOG debug-perf — solo si ?debug=perf en la URL */
(function () {
  "use strict";
  try {
    if (!/[?&]debug=perf(?:&|$)/.test(String(location.search || ""))) return;
  } catch (e) {
    return;
  }
  if (window.__rutalogDebugPerf) return;
  window.__rutalogDebugPerf = true;

  var timers = new Map(); // id -> {ms, stack, file}
  var nextId = 1;
  var counts = { go: 0, renderMapas: 0, refrescarRutaUI: 0, invalidateSize: 0 };
  var windowStart = Date.now();
  var longTasks = [];
  var _origInterval = window.setInterval.bind(window);
  var _origClear = window.clearInterval.bind(window);

  function fileFromStack(stack) {
    try {
      var lines = String(stack || "").split("\n");
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i];
        if (L.indexOf("debug-perf") !== -1) continue;
        var m = L.match(/\/([\w.\-]+\.js)(?:\?|:)/);
        if (m) return m[1];
        m = L.match(/([\w.\-]+\.js)/);
        if (m) return m[1];
      }
    } catch (e) {}
    return "?";
  }

  window.setInterval = function (fn, ms) {
    var id = _origInterval(fn, ms);
    var stack = "";
    try { stack = new Error().stack || ""; } catch (e) {}
    timers.set(id, { ms: ms, stack: stack, file: fileFromStack(stack), t: Date.now() });
    return id;
  };
  window.clearInterval = function (id) {
    timers.delete(id);
    return _origClear(id);
  };

  function wrapNamed(name) {
    var desc = Object.getOwnPropertyDescriptor(window, name);
    var current = window[name];
    function install(fn) {
      if (typeof fn !== "function") return fn;
      if (fn.__perfWrapped) return fn;
      var w = function () {
        counts[name] = (counts[name] || 0) + 1;
        return fn.apply(this, arguments);
      };
      w.__perfWrapped = true;
      w.__perfOrig = fn;
      return w;
    }
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: function () { return current; },
        set: function (v) { current = install(v); }
      });
      if (typeof current === "function") current = install(current);
    } catch (e) {
      var t = setInterval(function () {
        if (typeof window[name] === "function" && !window[name].__perfWrapped) {
          window[name] = install(window[name]);
        }
      }, 500);
      setTimeout(function () { clearInterval(t); }, 15000);
    }
  }
  wrapNamed("go");
  wrapNamed("renderMapas");
  wrapNamed("refrescarRutaUI");

  // Leaflet invalidateSize
  function patchLeaflet() {
    try {
      if (!window.L || !L.Map || !L.Map.prototype) return false;
      if (L.Map.prototype.invalidateSize.__perfWrapped) return true;
      var orig = L.Map.prototype.invalidateSize;
      L.Map.prototype.invalidateSize = function () {
        counts.invalidateSize++;
        return orig.apply(this, arguments);
      };
      L.Map.prototype.invalidateSize.__perfWrapped = true;
      return true;
    } catch (e) {
      return false;
    }
  }
  patchLeaflet();
  var lf = _origInterval(function () {
    if (patchLeaflet()) clearInterval(lf);
  }, 1000);

  try {
    if (typeof PerformanceObserver !== "undefined") {
      var po = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          longTasks.push({ t: Date.now(), dur: e.duration });
          if (longTasks.length > 50) longTasks.shift();
        });
      });
      po.observe({ entryTypes: ["longtask"] });
    }
  } catch (e) {}

  function reporte() {
    var elapsed = (Date.now() - windowStart) / 1000;
    var byFile = {};
    timers.forEach(function (info) {
      var f = info.file || "?";
      byFile[f] = (byFile[f] || 0) + 1;
    });
    var rows = [];
    rows.push(["metric", "value"]);
    rows.push(["timers_activos", String(timers.size)]);
    Object.keys(byFile).sort().forEach(function (f) {
      rows.push(["timer_file:" + f, String(byFile[f])]);
    });
    rows.push(["go_total", String(counts.go)]);
    rows.push(["renderMapas_total", String(counts.renderMapas)]);
    rows.push(["refrescarRutaUI_total", String(counts.refrescarRutaUI)]);
    rows.push(["invalidateSize_total", String(counts.invalidateSize)]);
    rows.push(["go_per_s", (counts.go / Math.max(elapsed, 0.001)).toFixed(3)]);
    rows.push(["renderMapas_per_s", (counts.renderMapas / Math.max(elapsed, 0.001)).toFixed(3)]);
    rows.push(["refrescarRutaUI_per_s", (counts.refrescarRutaUI / Math.max(elapsed, 0.001)).toFixed(3)]);
    rows.push(["longtasks", String(longTasks.length)]);
    var maxLt = 0;
    longTasks.forEach(function (x) { if (x.dur > maxLt) maxLt = x.dur; });
    rows.push(["longtask_max_ms", maxLt.toFixed(1)]);
    rows.push(["elapsed_s", elapsed.toFixed(1)]);
    console.table(rows.map(function (r) { return { metric: r[0], value: r[1] }; }));
    return {
      timers: timers.size,
      byFile: byFile,
      counts: Object.assign({}, counts),
      longTasks: longTasks.length,
      longtaskMaxMs: maxLt,
      elapsedS: elapsed
    };
  }

  window.RUTALOG_PERF = {
    reporte: reporte,
    counts: counts,
    timers: timers
  };
  console.info("[RUTALOG_PERF] activo — llama RUTALOG_PERF.reporte() en consola");
})();
