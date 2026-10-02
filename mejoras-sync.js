/* RUTALOG mejoras-sync v1 — pull más frecuente en foco + badge claro */
(function () {
  "use strict";
  if (window.__rutalogSyncV1) return;
  window.__rutalogSyncV1 = true;

  var PULL_MS_FOCUS = 25000;
  var _pullTimer = null;
  var _lastOkAt = null;
  var _lastErr = null;

  function el(id) {
    return document.getElementById(id);
  }

  function hasToken() {
    try {
      if (typeof ghGetToken === "function") return !!ghGetToken();
    } catch (e) {}
    return false;
  }

  function fmtAgo(ts) {
    if (!ts) return "—";
    var s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 5) return "ahora";
    if (s < 60) return "hace " + s + " s";
    var m = Math.floor(s / 60);
    if (m < 60) return "hace " + m + " min";
    return "hace " + Math.floor(m / 60) + " h";
  }

  function setBadge(text, title) {
    var b = el("badgeSync");
    if (!b) return;
    b.textContent = text;
    if (title) b.title = title;
  }

  function refreshBadge() {
    try {
      if (!hasToken()) {
        setBadge("sin sync", "Sin token / proxy de sync");
        return;
      }
      if (_lastErr) {
        setBadge("sync error", String(_lastErr).slice(0, 120));
        return;
      }
      if (_lastOkAt) {
        setBadge("Sync · " + fmtAgo(_lastOkAt), "Última sync OK: " + new Date(_lastOkAt).toLocaleString());
        return;
      }
      setBadge("sync listo", "Esperando primera sincronización");
    } catch (e) {}
  }

  async function pullOnce(silent) {
    if (!hasToken()) return;
    if (typeof ghActualizar !== "function") return;
    try {
      await ghActualizar({ silent: silent !== false });
      _lastOkAt = Date.now();
      _lastErr = null;
      refreshBadge();
    } catch (e) {
      _lastErr = e && e.message ? e.message : String(e);
      refreshBadge();
      console.warn("[sync-v1] pull", e);
    }
  }

  function stopPullLoop() {
    if (_pullTimer) {
      clearInterval(_pullTimer);
      _pullTimer = null;
    }
  }

  function startPullLoop() {
    stopPullLoop();
    if (!hasToken()) return;
    _pullTimer = setInterval(function () {
      if (document.hidden) return;
      pullOnce(true);
    }, PULL_MS_FOCUS);
  }

  function onVisibility() {
    if (document.hidden) return;
    pullOnce(true);
  }

  function hookBadgeRefresh() {
    if (typeof window.ghUpdateSyncBadge === "function" && !window.ghUpdateSyncBadge._syncV1) {
      var orig = window.ghUpdateSyncBadge;
      window.ghUpdateSyncBadge = function () {
        try {
          orig.apply(this, arguments);
        } catch (e) {}
        refreshBadge();
      };
      window.ghUpdateSyncBadge._syncV1 = true;
    }
    if (typeof window.ghStartPullLoop === "function" && !window.ghStartPullLoop._syncV1) {
      window.ghStartPullLoop = function (on) {
        if (!on) {
          stopPullLoop();
          return;
        }
        startPullLoop();
      };
      window.ghStartPullLoop._syncV1 = true;
    }
  }

  function boot() {
    hookBadgeRefresh();
    startPullLoop();
    setTimeout(function () {
      pullOnce(true);
      refreshBadge();
    }, 1200);
    setTimeout(function () {
      pullOnce(true);
      refreshBadge();
    }, 4000);
    document.addEventListener("visibilitychange", onVisibility);
    setInterval(refreshBadge, 10000);
    console.info("[RUTALOG] sync v1 · pull cada " + PULL_MS_FOCUS / 1000 + "s en foco");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 800);
    });
  } else {
    setTimeout(boot, 800);
  }
  setTimeout(boot, 2500);
})();
