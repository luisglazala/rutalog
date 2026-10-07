/* RUTALOG storage-h7 v1 — skip escritura idéntica + debounce heavy */
(function () {
  "use strict";
  if (window.__rutalogStorageH7) return;
  window.__rutalogStorageH7 = true;

  var HEAVY = ["rutalog_maestro", "rutalog_clientes_hoy", "rutalog_session_data", "rutalog_gh_meta"];
  var lastVal = Object.create(null);
  var timers = Object.create(null);
  var DEBOUNCE_MS = 400;

  function isHeavy(key) {
    var k = String(key || "");
    if (HEAVY.indexOf(k) !== -1) return true;
    if (k.indexOf("rutalog_") === 0 && k.length > 40) return true;
    return false;
  }

  function patch() {
    try {
      var proto = Storage.prototype;
      if (proto.setItem._rutalogStorageH7) return;
      var prev = proto.setItem;
      proto.setItem = function (key, value) {
        var k = String(key);
        var v = String(value);
        if (lastVal[k] === v) return;
        if (isHeavy(k) && v.length > 2000) {
          lastVal[k] = v;
          if (timers[k]) clearTimeout(timers[k]);
          var self = this;
          timers[k] = setTimeout(function () {
            timers[k] = null;
            try { prev.call(self, k, lastVal[k]); } catch (e) {
              console.warn("[storage-h7] setItem heavy", k, e && e.name);
            }
          }, DEBOUNCE_MS);
          return;
        }
        lastVal[k] = v;
        return prev.call(this, k, v);
      };
      proto.setItem._rutalogStorageH7 = true;
      if (prev._rutalogStorageV1) proto.setItem._rutalogStorageV1 = true;
    } catch (e) {
      console.warn("[storage-h7]", e);
    }
  }

  patch();
  setTimeout(patch, 300);
  setTimeout(patch, 1500);
  console.info("[RUTALOG] storage-h7 v1 — skip idéntico + debounce heavy");
})();
