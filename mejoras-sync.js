/* RUTALOG mejoras-sync v3 — cerca de tiempo real: foco, online, badge clicable, dirty 10s */
(function () {
  "use strict";
  if (window.__rutalogSyncV3) return;
  window.__rutalogSyncV3 = true;
  window.__rutalogSyncV2 = true;
  window.__rutalogSyncV1 = true;

  var PULL_MS_FOCUS = 18000;
  var PULL_MS_DIRTY = 10000;
  var _pullTimer = null;
  var _lastOkAt = null;
  var _lastErr = null;
  var _pulling = false;
  var _tabId = "t" + Math.random().toString(36).slice(2, 10);
  var _bc = null;

  function el(id) {
    return document.getElementById(id);
  }

  function hasToken() {
    try {
      if (typeof ghGetToken === "function") return !!ghGetToken();
    } catch (e) {}
    try {
      return !!(localStorage.getItem("rutalog_gh_token") || "").trim();
    } catch (e2) {
      return false;
    }
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
    b.style.cursor = "pointer";
  }

  function setStatusLine() {
    var st = el("syncStatus");
    if (!st) return;
    if (_lastErr) {
      st.textContent = "Error: " + String(_lastErr).slice(0, 80);
      return;
    }
    if (_lastOkAt) {
      st.textContent = "Última sync: " + new Date(_lastOkAt).toLocaleString() + " (" + fmtAgo(_lastOkAt) + ")";
      return;
    }
    st.textContent = "Última sync: —";
  }

  function refreshBadge() {
    try {
      if (!hasToken()) {
        setBadge("sin sync", "Sin token — Configuración → GitHub");
        setStatusLine();
        return;
      }
      if (_pulling) {
        setBadge("sincronizando…", "Pull en curso");
        return;
      }
      if (_lastErr) {
        setBadge("sync error", String(_lastErr).slice(0, 120));
        setStatusLine();
        return;
      }
      if (_lastOkAt) {
        setBadge("Sync · " + fmtAgo(_lastOkAt), "Clic para actualizar ahora");
        setStatusLine();
        return;
      }
      setBadge("sync listo", "Clic para actualizar ahora");
      setStatusLine();
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
    if (_pulling) return;
    _pulling = true;
    refreshBadge();
    try {
      await ghActualizar({ silent: silent !== false });
      _lastOkAt = Date.now();
      _lastErr = null;
      broadcast("pull-ok");
    } catch (e) {
      _lastErr = e && e.message ? e.message : String(e);
      console.warn("[sync-v3] pull", e);
    } finally {
      _pulling = false;
      refreshBadge();
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
    var ms = isDirty() ? PULL_MS_DIRTY : PULL_MS_FOCUS;
    _pullTimer = setInterval(function () {
      if (document.hidden) return;
      pullOnce(true);
    }, ms);
  }

  function onVisibility() {
    if (document.hidden) return;
    pullOnce(true);
    startPullLoop();
  }

  function onFocus() {
    pullOnce(true);
  }

  function onOnline() {
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
          }, 350);
        }
        if (msg.type === "pull-ok" && msg.at) {
          _lastOkAt = msg.at;
          _lastErr = null;
          refreshBadge();
        }
      };
    } catch (e) {
      console.warn("[sync-v3] BroadcastChannel no disponible", e);
    }
  }

  function hookDirtyAndPush() {
    try {
      if (window.__rutalogSyncSetItemPatchedV3) return;
      window.__rutalogSyncSetItemPatchedV3 = true;
      var proto = Storage.prototype;
      var orig = proto.setItem;
      if (orig._syncV3) return;
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
      proto.setItem._syncV3 = true;
    } catch (e) {}
  }

  function wireManualControls() {
    var btn = el("btnSyncActualizar");
    if (btn && !btn._syncV3) {
      btn._syncV3 = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        pullOnce(false);
      });
    }
    var badge = el("badgeSync");
    if (badge && !badge._syncV3) {
      badge._syncV3 = true;
      badge.title = "Clic para actualizar ahora";
      badge.addEventListener("click", function () {
        pullOnce(false);
      });
    }
  }

  function hookBadgeRefresh() {
    if (typeof window.ghUpdateSyncBadge === "function" && !window.ghUpdateSyncBadge._syncV3) {
      var orig = window.ghUpdateSyncBadge;
      window.ghUpdateSyncBadge = function () {
        try {
          orig.apply(this, arguments);
        } catch (e) {}
        refreshBadge();
      };
      window.ghUpdateSyncBadge._syncV3 = true;
    }
    if (typeof window.ghStartPullLoop === "function" && !window.ghStartPullLoop._syncV3) {
      window.ghStartPullLoop = function (on) {
        if (!on) {
          stopPullLoop();
          return;
        }
        startPullLoop();
      };
      window.ghStartPullLoop._syncV3 = true;
    }
  }

  function boot() {
    setupBroadcast();
    hookDirtyAndPush();
    hookBadgeRefresh();
    wireManualControls();
    startPullLoop();
    setTimeout(function () {
      pullOnce(true);
      refreshBadge();
      wireManualControls();
    }, 1000);
    setTimeout(function () {
      pullOnce(true);
      refreshBadge();
    }, 3500);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    setInterval(refreshBadge, 8000);
    setInterval(wireManualControls, 5000);
    window.rutalogSync = {
      pull: function () {
        return pullOnce(false);
      },
      broadcast: broadcast
    };
    console.info(
      "[RUTALOG] sync v3 · " +
        PULL_MS_FOCUS / 1000 +
        "s foco · " +
        PULL_MS_DIRTY / 1000 +
        "s dirty · focus/online/badge"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 700);
    });
  } else {
    setTimeout(boot, 700);
  }
  setTimeout(boot, 2200);
})();
