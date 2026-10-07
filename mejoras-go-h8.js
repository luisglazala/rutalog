/* RUTALOG go-h8 v1 — un solo wrapper de go (RUTALOG.hooks) */
(function () {
  "use strict";
  if (window.__rutalogGoH8) return;
  window.__rutalogGoH8 = true;

  function ensureSingleGo() {
    if (!window.RUTALOG || !RUTALOG.hooks) return false;
    if (typeof window.go !== "function") return false;
    if (window.go.__rutalogHooksV5) {
      window.go._codigoPerfV5 = true;
      window.go.__rutalogRoutePanelUi = true;
      window.go._mapaFixV5 = true;
      return true;
    }
    try {
      if (typeof RUTALOG.hooks.install === "function") RUTALOG.hooks.install();
    } catch (e) {}
    if (window.go.__rutalogHooksV5) {
      window.go._codigoPerfV5 = true;
      window.go.__rutalogRoutePanelUi = true;
      return true;
    }
    return false;
  }

  var n = 0;
  function tick() {
    n++;
    ensureSingleGo();
    if (n < 40) setTimeout(tick, n < 8 ? 200 : 1000);
  }
  tick();
  console.info("[RUTALOG] go-h8 v1 — un solo wrapper go");
})();
