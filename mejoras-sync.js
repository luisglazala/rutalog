/* RUTALOG mejoras-sync v3.5 — un solo pull inicial + cooldown 8s + boot único */
(function () {
  "use strict";
  if (window.__rutalogSyncV3) return;
  window.__rutalogSyncV3 = true;
  window.__rutalogSyncV2 = true;
  window.__rutalogSyncV1 = true;

  var PULL_MS_FOCUS = 30000;
  var PULL_MS_DIRTY = 15000;
  var _pullTimer = null;
  var _lastOkAt = null;
  var _lastErr = null;
  var _pulling = false;
  var _tabId = "t" + Math.random().toString(36).slice(2, 10);
  var _bc = null;
  var _booted = false;
  var _lastPullAt = 0;
  var PULL_COOLDOWN_MS = 8000;

  function el(id) {
    return document.getElementById(id);
  }

  function hasToken() {
    try {
      if (typeof ghGetToken === "function" && ghGetToken()) return true;
    } catch (e) {}
    try {
      if ((localStorage.getItem("rutalog_gh_token") || "").trim()) return true;
    } catch (e2) {}
    /* Proxy Cloudflare inyecta el token en el servidor: no hace falta token en el navegador */
    try {
      if (window.RUTALOG_API_BASE) return true;
      if (/rutalog\.pages\.dev$/i.test(location.hostname || "")) return true;
    } catch (e3) {}
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
        setBadge("sync " + fmtAgo(_lastOkAt), "Última sync: " + new Date(_lastOkAt).toLocaleString());
        setStatusLine();
        return;
      }
      setBadge("sync listo", "Token OK — esperando primera sync");
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
    var now = Date.now();
    /* Cooldown solo en pulls silenciosos; manual (silent===false) siempre pasa */
    if (silent !== false && _lastPullAt && (now - _lastPullAt) < PULL_COOLDOWN_MS) return;
    _pulling = true;
    refreshBadge();
    try {
      await ghActualizar({ silent: silent !== false });
      _lastOkAt = Date.now();
      _lastPullAt = _lastOkAt;
      _lastErr = null;
      broadcast("pull-ok");
    } catch (e) {
      _lastErr = e && e.message ? e.message : String(e);
      console.warn("[sync-v3.5] pull", e);
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
    try {
      if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.cancelar('sync:pull');
    } catch (e) {}
  }

  function startPullLoop() {
    stopPullLoop();
    if (!hasToken()) return;
    if (window.RUTALOG && RUTALOG.tick) {
      var _focusSkip = 0;
      RUTALOG.tick.registrar('sync:pull', function () {
        if (document.hidden) return;
        if (!hasToken()) return;
        /* dirty: cada 15s; limpio: cada ~30s (salta uno) */
        if (!isDirty()) {
          _focusSkip++;
          if (_focusSkip % 2 === 1) return;
        } else {
          _focusSkip = 0;
        }
        pullOnce(true);
      }, { cada: PULL_MS_DIRTY, vista: 'siempre' });
      return;
    }
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
      console.warn("[sync-v3.5] BroadcastChannel no disponible", e);
    }
  }

  function hookDirtyAndPush() {
    try {
      if (typeof window.ghMarkDirty === "function" && !window.ghMarkDirty._syncV3) {
        var origDirty = window.ghMarkDirty;
        window.ghMarkDirty = function () {
          try {
            origDirty.apply(this, arguments);
          } catch (e) {}
          startPullLoop();
        };
        window.ghMarkDirty._syncV3 = true;
      }
    } catch (e) {}
    try {
      if (typeof window.ghPush === "function" && !window.ghPush._syncV3) {
        var origPush = window.ghPush;
        window.ghPush = function () {
          var r = origPush.apply(this, arguments);
          try {
            broadcast("push-ok");
          } catch (e) {}
          return r;
        };
        window.ghPush._syncV3 = true;
      }
    } catch (e2) {}
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
    if (_booted) return;
    _booted = true;
    setupBroadcast();
    hookDirtyAndPush();
    hookBadgeRefresh();
    wireManualControls();
    startPullLoop();
    /* Un solo pull inicial cuando la UI está lista (no doble boot, no 1s+3.5s) */
    function pullWhenUiReady() {
      function go() {
        pullOnce(true);
        refreshBadge();
        wireManualControls();
      }
      var tries = 0;
      function wait() {
        tries++;
        var ready =
          document.documentElement.classList.contains("rutalog-ready") ||
          document.documentElement.classList.contains("rutalog-need-login");
        if (ready || tries > 40) {
          requestAnimationFrame(function () {
            setTimeout(go, 800);
          });
          return;
        }
        setTimeout(wait, 100);
      }
      wait();
    }
    pullWhenUiReady();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    if (window.RUTALOG && RUTALOG.tick) {
      RUTALOG.tick.registrar('sync:badge', refreshBadge, { cada: 20000, vista: 'siempre' });
      RUTALOG.tick.registrar('sync:wire', wireManualControls, { cada: 15000, vista: 'siempre' });
    } else {
      setInterval(refreshBadge, 20000);
      setInterval(wireManualControls, 15000);
    }
    window.rutalogSync = {
      pull: function () {
        return pullOnce(false);
      },
      broadcast: broadcast
    };
    console.info(
      "[RUTALOG] sync v3.5 · " +
        PULL_MS_FOCUS / 1000 +
        "s foco · " +
        PULL_MS_DIRTY / 1000 +
        "s dirty · pull tras UI lista · cooldown 8s"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 700);
    });
  } else {
    setTimeout(boot, 700);
  }
})();
