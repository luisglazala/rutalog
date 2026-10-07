/* RUTALOG invalidateSize debounce v1 — un solo invalidate por mapa cada ~150 ms */
(function () {
  "use strict";
  if (window.__rutalogInvalidateDebounce) return;
  window.__rutalogInvalidateDebounce = true;

  var DEBOUNCE_MS = 150;

  function patch() {
    if (typeof L === "undefined" || !L.Map || !L.Map.prototype) return false;
    if (L.Map.prototype.invalidateSize.__rutalogDebounced) return true;

    var orig = L.Map.prototype.invalidateSize;
    L.Map.prototype.invalidateSize = function (animate) {
      var map = this;
      if (!map || map._rutalogInvDebouncePending) {
        if (map) map._rutalogInvAnimate = animate;
        return map;
      }
      map._rutalogInvAnimate = animate;
      map._rutalogInvDebouncePending = true;
      clearTimeout(map._rutalogInvTimer);
      map._rutalogInvTimer = setTimeout(function () {
        map._rutalogInvDebouncePending = false;
        map._rutalogInvTimer = null;
        try {
          orig.call(map, map._rutalogInvAnimate);
        } catch (e) {}
      }, DEBOUNCE_MS);
      return map;
    };
    L.Map.prototype.invalidateSize.__rutalogDebounced = true;
    console.info("[RUTALOG] invalidate-debounce v1 · " + DEBOUNCE_MS + " ms");
    return true;
  }

  if (!patch()) {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (patch() || tries > 40) clearInterval(t);
    }, 100);
  }
})();
