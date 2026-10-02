/* RUTALOG mejoras-sync v2 — pull en foco + BroadcastChannel entre pestañas */
(function () {
  "use strict";
  if (window.__rutalogSyncV2) return;
  window.__rutalogSyncV2 = true;
  window.__rutalogSyncV1 = true;

  var PULL_MS_FOCUS = 25000;
  var PULL_MS_DIRTY = 12000;
  var _pullTimer = null;
  var _lastOkAt = null;
  var _lastErr = null;
  var _tabId = "t" + Math.random().toString(36).slice(2, 10);
  var _bc = null;

  function el(id) {
    return document.getElementById(id);
  }

  function hasToken() {
    try {
      if (typeof ghGetToken === "function") return !!ghGetToken();
    } catch (e) {}
    return false;
  }

  function isDirty() {
    try {
      return localStorage.getItem("rutalog_gh_dirty") === "1";
    } catch (e) {
      return false;
    }
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

  function broadcast(type, extra) {
    try {
      if (!_bc) return;
      _bc.postMessage({
        type: type,
        tabId: _tabId,
        at: Date.now(),
        extra: extra || null
      });
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
      broadcast("pull-ok");
    } catch (e) {
      _lastErr = e && e.message ? e.message : String(e);
      refreshBadge();
      console.warn("[sync-v2] pull", e);
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
    }, isDirty() ? PULL_MS_DIRTY : PULL_MS_FOCUS);
  }

  function onVisibility() {
    if (document.hidden) return;
    pullOnce(true);
    startPullLoop();
  }

  function setupBroadcast() {
    try {
      if (typeof BroadcastChannel === "undefined") return;
      _bc = new BroadcastChannel("rutalog_sync");
      _bc.onmessage = function (ev) {
        var msg = ev && ev.data;
        if (!msg || msg.tabId === _tabId) return;
        if (msg.type === "data-changed" || msg.type === "push-ok") {
          setTimeout(function () {
            pullOnce(true);
          }, 400);
        }
        if (msg.type === "pull-ok" && msg.at) {
          _lastOkAt = msg.at;
          _lastErr = null;
          refreshBadge();
        }
      };
    } catch (e) {
      console.warn("[sync-v2] BroadcastChannel no disponible", e);
    }
  }

  function hookDirtyAndPush() {
    try {
      if (window.__rutalogSyncSetItemPatched) return;
      window.__rutalogSyncSetItemPatched = true;
      var proto = Storage.prototype;
      var orig = proto.setItem;
      if (orig._syncV2) return;
      proto.setItem = function (k, v) {
        var r = orig.apply(this, arguments);
        try {
          if (this === localStorage && String(k) === "rutalog_gh_dirty") {
            if (String(v) === "1") {
              broadcast("data-changed");
              startPullLoop();
            } else {
              broadcast("push-ok");
            }
          }
        } catch (e) {}
        return r;
      };
      proto.setItem._syncV2 = true;
    } catch (e) {}
  }

  function hookBadgeRefresh() {
    if (typeof window.ghUpdateSyncBadge === "function" && !window.ghUpdateSyncBadge._syncV2) {
      var orig = window.ghUpdateSyncBadge;
      window.ghUpdateSyncBadge = function () {
        try {
          orig.apply(this, arguments);
        } catch (e) {}
        refreshBadge();
      };
      window.ghUpdateSyncBadge._syncV2 = true;
    }
    if (typeof window.ghStartPullLoop === "function" && !window.ghStartPullLoop._syncV2) {
      window.ghStartPullLoop = function (on) {
        if (!on) {
          stopPullLoop();
          return;
        }
        startPullLoop();
      };
      window.ghStartPullLoop._syncV2 = true;
    }
  }

  function boot() {
    setupBroadcast();
    hookDirtyAndPush();
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
    window.rutalogSync = {
      pull: function () {
        return pullOnce(false);
      },
      broadcast: broadcast
    };
    console.info(
      "[RUTALOG] sync v2 · pull " +
        PULL_MS_FOCUS / 1000 +
        "s foco · " +
        PULL_MS_DIRTY / 1000 +
        "s si dirty · BroadcastChannel"
    );
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
