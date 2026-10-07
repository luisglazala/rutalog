/* RUTALOG sync-h6 — cooldown global sobre ghActualizar (silent:true) */
(function () {
  "use strict";
  if (window.__rutalogSyncH6) return;
  window.__rutalogSyncH6 = true;

  var COOLDOWN_MS = 8000;
  var lastAt = 0;

  function wrap() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._syncH6) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      if (opts.silent === true && lastAt && (Date.now() - lastAt) < COOLDOWN_MS) {
        return;
      }
      var r = await orig.apply(this, arguments);
      if (opts.silent === true) lastAt = Date.now();
      return r;
    };
    window.ghActualizar._syncH6 = true;
    console.info("[RUTALOG] sync-h6 · cooldown " + (COOLDOWN_MS / 1000) + "s en ghActualizar silent");
    return true;
  }

  if (!wrap()) {
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (wrap() || n > 50) clearInterval(t);
    }, 200);
  }
})();
