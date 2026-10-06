/* RUTALOG mejoras-sync v3.4 — sin toasts duplicados · boot único · silent auto */
(function () {
  "use strict";
  if (window.__rutalogSyncV34) return;
  window.__rutalogSyncV34 = true;
  window.__rutalogSyncV3 = true;
  window.__rutalogSyncV2 = true;
  window.__rutalogSyncV1 = true;

  var PULL_MS_FOCUS = 45000;
  var PULL_MS_DIRTY = 20000;
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
      st.textContent =
        "Última sync: " +
        new Date(_lastOkAt).toLocaleString() +
        " (" +
        fmtAgo(_lastOkAt) +
        ")";
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

  /** Una sola ejecución de ghActualizar a la vez; auto siempre silent salvo manual:true */
  function patchGhActualizar() {
    if (typeof window.ghActualizar !== "function") return false;
    if (window.ghActualizar._syncDedupeV34) return true;
    var orig = window.ghActualizar;
    window.ghActualizar = function (opts) {
      opts = opts || {};
      var manual = !!opts.manual;
      var next = Object.assign({}, opts, {
        silent: manual ? !!opts.silent === false && opts.silent !== true ? false : !!opts.silent : true
      });
      /* Auto: siempre silent. Manual: silent false si el usuario pidió ver toasts */
      if (!manual) next.silent = true;
      else if (opts.silent === false) next.silent = false;
      else next.silent = true;

      if (_ghInflight) return _ghInflight;
      try {
        _ghInflight = Promise.resolve(orig.call(this, next)).finally(function () {
          _ghInflight = null;
        });
        return _ghInflight;
      } catch (e) {
        _ghInflight = null;
        return Promise.reject(e);
      }
    };
    window.ghActualizar._syncDedupeV34 = true;
    return true;
  }

  async function pullOnce(silent) {
    if (!hasToken()) return;
    patchGhActualizar();
    if (typeof ghActualizar !== "function") return;
    if (_pulling) return;
    _pulling = true;
    refreshBadge();
    try {
      /* silent true = auto; silent false = manual con toast */
      var isSilent = silent !== false;
      await ghActualizar({
        silent: isSilent,
        manual: !isSilent
      });
      _lastOkAt = Date.now();
      _lastErr = null;
      broadcast("pull-ok");
    } catch (e) {
      _lastErr = e && e.message ? e.message : String(e);
      console.warn("[sync-v3.4] pull", e);
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
    } catch (e) {
      console.warn("[sync-v3.4] BroadcastChannel", e);
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
    /* un solo pull inicial silencioso */
    setTimeout(function () {
      patchGhActualizar();
      pullOnce(true);
      refreshBadge();
      wireManualControls();
    }, 1500);
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
    console.info("[RUTALOG] sync v3.4 · sin toasts auto · boot único");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 600);
    });
  } else {
    setTimeout(boot, 600);
  }
  /* respaldo único si DOMContentLoaded ya pasó de forma rara */
  setTimeout(boot, 2500);
})();
