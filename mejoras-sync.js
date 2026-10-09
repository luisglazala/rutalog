/* RUTALOG mejoras-sync v3.8 — watchdog 90/120s (catálogo grande) */
(function () {
  "use strict";
  if (window.__rutalogSyncV34) return;
  window.__rutalogSyncV34 = true;
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
  var _ghInflight = null;

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
    var h = Math.floor(m / 60);
    if (h < 48) return "hace " + h + " h";
    return "hace " + Math.floor(h / 24) + " d";
  }

  function fmtLocal(ts) {
    if (!ts) return "—";
    try {
      var d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    } catch (e) {
      return String(ts);
    }
  }

  function metaTimestamp() {
    try {
      var raw = localStorage.getItem("rutalog_gh_meta");
      if (!raw) return _lastOkAt;
      var m = JSON.parse(raw);
      if (m && m.updatedAt) {
        var t = Date.parse(m.updatedAt);
        if (!isNaN(t)) return t;
      }
    } catch (e) {}
    return _lastOkAt;
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
      st.textContent = "Error: " + String(_lastErr).slice(0, 100);
      return;
    }
    var ts = metaTimestamp();
    var action = "";
    var by = "";
    try {
      var raw = localStorage.getItem("rutalog_gh_meta");
      if (raw) {
        var m = JSON.parse(raw);
        if (m && m.action) action = " · " + m.action;
        if (m && m.updatedBy) by = " · " + m.updatedBy;
      }
    } catch (e) {}
    if (ts) {
      st.textContent = "Última sync: " + fmtLocal(ts) + " (" + fmtAgo(ts) + ")" + action + by;
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
      if (isDirty()) {
        setBadge("pendiente", "Hay cambios locales sin subir");
        setStatusLine();
        return;
      }
      setBadge("sync ok · " + fmtAgo(_lastOkAt), "Clic para actualizar ahora");
      setStatusLine();
    } catch (e) {}
  }

  function broadcast(type) {
    try {
      if (!_bc) return;
      _bc.postMessage({ type: type, tabId: _tabId, at: Date.now() });
    } catch (e) {}
  }

  function patchGhActualizar() {
    if (typeof window.ghActualizar !== "function") return;
    if (window.ghActualizar._syncV34) return;
    var orig = window.ghActualizar;
    window.ghActualizar = function (opts) {
      opts = opts || {};
      var bypass = opts.silent === false || opts.force || opts.manual;
      if (_ghInflight && !bypass) return _ghInflight;
      var run = Promise.resolve()
        .then(function () {
          return orig.call(window, opts);
        })
        .finally(function () {
          if (_ghInflight === run) _ghInflight = null;
        });
      if (!bypass) _ghInflight = run;
      return run;
    };
    window.ghActualizar._syncV34 = true;
  }

  async function pullOnce(silent) {
    if (!hasToken()) return;
    patchGhActualizar();
    if (typeof ghActualizar !== "function") return;
    if (_pulling) return;
    _pulling = true;
    refreshBadge();
    var isSilent = silent !== false;
    var timeoutMs = isSilent ? 90000 : 120000;
    var watchdog = setTimeout(function () {
      if (_pulling) {
        _pulling = false;
        if (!isSilent) {
          _lastErr = "Sync tardó más de " + Math.round(timeoutMs / 1000) + " s; reintenta Actualizar ahora";
        }
        refreshBadge();
      }
    }, timeoutMs);
    try {
      await ghActualizar({
        silent: isSilent,
        manual: !isSilent,
        force: true
      });
      _lastOkAt = Date.now();
      _lastErr = null;
      broadcast("pull-ok");
    } catch (e) {
      _lastErr = e && e.message ? e.message : String(e);
      console.warn("[sync-v3.8] pull", e);
    } finally {
      clearTimeout(watchdog);
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
      if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.cancelar("sync:pull");
    } catch (e) {}
  }

  function startPullLoop() {
    stopPullLoop();
    if (!hasToken()) return;
    if (window.RUTALOG && RUTALOG.tick) {
      var _focusSkip = 0;
      RUTALOG.tick.registrar(
        "sync:pull",
        function () {
          if (document.hidden) return;
          if (!hasToken()) return;
          if (!isDirty()) {
            _focusSkip++;
            if (_focusSkip % 2 === 1) return;
          } else {
            _focusSkip = 0;
          }
          pullOnce(true);
        },
        { cada: PULL_MS_DIRTY, vista: "siempre" }
      );
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
      if (_bc) return;
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
    } catch (e) {}
  }

  function hookDirtyAndPush() {
    try {
      if (typeof window.ghMarcarDirty === "function" && !window.ghMarcarDirty._syncV34) {
        var md = window.ghMarcarDirty;
        window.ghMarcarDirty = function () {
          var r = md.apply(this, arguments);
          refreshBadge();
          return r;
        };
        window.ghMarcarDirty._syncV34 = true;
      }
    } catch (e) {}
  }

  function wireManualControls() {
    var btn = el("btnSyncAhora");
    if (btn && !btn._syncV34) {
      btn._syncV34 = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        pullOnce(false);
      });
    }
    var badge = el("badgeSync");
    if (badge && !badge._syncV34) {
      badge._syncV34 = true;
      badge.title = "Clic para actualizar ahora";
      badge.addEventListener("click", function () {
        pullOnce(false);
      });
    }
  }

  function hookBadgeRefresh() {
    if (typeof window.ghUpdateSyncBadge === "function" && !window.ghUpdateSyncBadge._syncV34) {
      var orig = window.ghUpdateSyncBadge;
      window.ghUpdateSyncBadge = function () {
        try {
          orig.apply(this, arguments);
        } catch (e) {}
        refreshBadge();
      };
      window.ghUpdateSyncBadge._syncV34 = true;
    }
    if (typeof window.ghStartPullLoop === "function" && !window.ghStartPullLoop._syncV34) {
      window.ghStartPullLoop = function (on) {
        if (!on) {
          stopPullLoop();
          return;
        }
        startPullLoop();
      };
      window.ghStartPullLoop._syncV34 = true;
    }
  }

  function boot() {
    if (_booted) return;
    _booted = true;
    patchGhActualizar();
    setTimeout(patchGhActualizar, 500);
    setTimeout(patchGhActualizar, 2000);
    setupBroadcast();
    hookDirtyAndPush();
    hookBadgeRefresh();
    wireManualControls();
    startPullLoop();
    function pullWhenUiReady() {
      function go() {
        patchGhActualizar();
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
      RUTALOG.tick.registrar("sync:badge", refreshBadge, { cada: 30000, vista: "siempre" });
      RUTALOG.tick.registrar("sync:wire", wireManualControls, { cada: 20000, vista: "siempre" });
    } else {
      setInterval(refreshBadge, 30000);
      setInterval(wireManualControls, 20000);
    }
    window.rutalogSync = {
      pull: function () {
        return pullOnce(false);
      },
      broadcast: broadcast
    };
    console.info("[RUTALOG] sync v3.8 · watchdog 90/120s (catálogo grande)");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 600);
    });
  } else {
    setTimeout(boot, 600);
  }
  setTimeout(boot, 2500);
})();
