/* RUTALOG sync-core v5 — dirty en memoria si localStorage no persiste */
(function () {
  "use strict";
  if (window.__rutalogSyncCoreV5) return;
  window.__rutalogSyncCoreV5 = true;
  window.__rutalogSyncCoreV4 = true;
  window.__rutalogSyncCoreV3 = true;
  window.__rutalogSyncCoreV2 = true;
  window.__rutalogSyncCoreV1 = true;

  var PENDING_KEY = "rutalog_pending_push";
  var LOG = "[RUTALOG] sync-core v5";
  var _memDirty = false;
  var _memDirtyWhy = "";

  function isDirty() {
    if (_memDirty) return true;
    try {
      if (localStorage.getItem("rutalog_gh_dirty") === "1") return true;
      if (sessionStorage.getItem("rutalog_gh_dirty") === "1") return true;
      if (typeof ghIsDirty === "function" && ghIsDirty()) return true;
      return false;
    } catch (e) {
      return !!_memDirty;
    }
  }

  function markDirtyMem(why) {
    _memDirty = true;
    _memDirtyWhy = why || "edit";
    try {
      localStorage.setItem("rutalog_gh_dirty", "1");
      localStorage.setItem("rutalog_gh_dirty_why", _memDirtyWhy);
      localStorage.setItem("rutalog_gh_dirty_at", new Date().toISOString());
    } catch (e) {
      console.warn(LOG, "localStorage dirty fallo:", e && e.name, e && e.message);
    }
    try {
      sessionStorage.setItem("rutalog_gh_dirty", "1");
    } catch (e2) {}
  }

  function clearDirtyMem() {
    _memDirty = false;
    _memDirtyWhy = "";
    try {
      if (typeof ghClearDirty === "function") ghClearDirty();
      else {
        localStorage.removeItem("rutalog_gh_dirty");
        localStorage.removeItem("rutalog_gh_dirty_why");
        localStorage.removeItem("rutalog_gh_dirty_at");
      }
    } catch (e) {}
    try {
      sessionStorage.removeItem("rutalog_gh_dirty");
    } catch (e2) {}
  }

  function lastSha() {
    try {
      return localStorage.getItem("rutalog_gh_sha") || null;
    } catch (e) {
      return null;
    }
  }

  function clearReadFailed() {
    try {
      if (typeof ghClearReadFailed === "function") ghClearReadFailed();
      else localStorage.removeItem("rutalog_gh_read_failed");
    } catch (e) {}
  }

  function savePendingSnapshot() {
    try {
      if (typeof ghBuildPayload !== "function") return;
      var p = ghBuildPayload();
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          at: Date.now(),
          codigoSku: p.codigoSku || [],
          topesSku: p.topesSku || [],
          citas: p.citas || {},
          maestroClientes: p.maestroClientes || [],
          usuarios: p.usuarios || []
        })
      );
    } catch (e) {
      console.warn(LOG, "pending save", e);
    }
  }

  function clearPendingSnapshot() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (e) {}
  }

  async function ensurePayloadSafeForPush() {
    clearReadFailed();
    var users = [];
    try {
      if (typeof loadUsers === "function") users = loadUsers() || [];
    } catch (e) {}
    var maestroSize = window.estado && estado.maestro ? estado.maestro.size : 0;
    if (!(users.length === 0 || maestroSize < 100)) return true;
    console.info(LOG, "payload incompleto → fetch remoto");
    try {
      if (typeof ghFetchFile !== "function") return true;
      var remote = await ghFetchFile({ force: true });
      if (!remote || !remote.data) return true;
      var d = remote.data;
      if (users.length === 0 && Array.isArray(d.usuarios) && d.usuarios.length) {
        try {
          localStorage.setItem("rutalog_usuarios_v2", JSON.stringify(d.usuarios));
        } catch (e3) {}
      }
      if (maestroSize < 100 && Array.isArray(d.maestroClientes) && d.maestroClientes.length > 100) {
        try {
          estado.maestro.clear();
          d.maestroClientes.forEach(function (r) {
            if (r && r.id) estado.maestro.set(String(r.id), r);
          });
        } catch (e4) {}
      }
      if (typeof ghSetLastGood === "function") {
        try {
          ghSetLastGood({
            sha: remote.sha,
            size: remote.size || 0,
            users: (d.usuarios && d.usuarios.length) || 0
          });
        } catch (e5) {}
      }
      clearReadFailed();
    } catch (e) {
      console.warn(LOG, "ensurePayload", e);
    }
    return true;
  }

  async function pushIfDirty(silent) {
    if (!isDirty()) {
      console.info(LOG, "pushIfDirty: no dirty");
      return false;
    }
    if (typeof ghPushWithSha !== "function") {
      console.warn(LOG, "ghPushWithSha no existe");
      return false;
    }
    savePendingSnapshot();
    await ensurePayloadSafeForPush();
    try {
      localStorage.removeItem("rutalog_gh_content_hash");
    } catch (e) {}
    clearReadFailed();
    console.info(LOG, "push por dirty…");
    try {
      await ghPushWithSha(lastSha(), !!silent);
      clearPendingSnapshot();
      clearDirtyMem();
      console.info(LOG, "push OK");
      if (!silent && typeof toast === "function") toast("Cambios subidos a GitHub");
      return true;
    } catch (e) {
      console.error(LOG, "push ERROR:", e && e.message ? e.message : e);
      if (!silent && typeof toast === "function") {
        toast("No se pudo subir: " + (e && e.message ? e.message : e));
      }
      throw e;
    }
  }

  function patchMarkDirty() {
    if (typeof window.ghMarkDirty !== "function" || window.ghMarkDirty._syncCoreV5) return false;
    var orig = window.ghMarkDirty;
    window.ghMarkDirty = function (reason) {
      markDirtyMem(reason || "edit");
      try {
        return orig.apply(this, arguments);
      } catch (e) {}
    };
    window.ghMarkDirty._syncCoreV5 = true;
    return true;
  }

  function patchActualizar() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._syncCoreV5) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      var silent = !!opts.silent;
      if (isDirty()) {
        try {
          await pushIfDirty(silent);
          if (!isDirty()) return;
        } catch (e) {
          if (!silent) throw e;
          return;
        }
      }
      var r = await orig.call(this, opts);
      clearReadFailed();
      return r;
    };
    window.ghActualizar._syncCoreV5 = true;
    return true;
  }

  function patchSchedulePush() {
    if (typeof window.ghSchedulePush !== "function" || window.ghSchedulePush._syncCoreV5) return false;
    var _timer = null;
    var _inflight = false;
    window.ghSchedulePush = function (reason) {
      try {
        if (typeof _ghApplyingRemote !== "undefined" && _ghApplyingRemote) return;
        if (typeof _ghApplyingUsers !== "undefined" && _ghApplyingUsers) return;
      } catch (e) {}
      markDirtyMem(reason || "edit");
      try {
        if (typeof ghMarkDirty === "function") ghMarkDirty(reason || "edit");
      } catch (e2) {}
      savePendingSnapshot();
      var token = "";
      try {
        token = typeof ghGetToken === "function" ? ghGetToken() : "";
      } catch (e3) {}
      if (!token) return;
      if (_timer) clearTimeout(_timer);
      _timer = setTimeout(async function () {
        _timer = null;
        if (_inflight) {
          window.ghSchedulePush(reason || "retry");
          return;
        }
        if (!isDirty()) return;
        _inflight = true;
        try {
          await pushIfDirty(true);
        } catch (e) {
          console.warn(LOG, "schedule push fail", e && e.message ? e.message : e);
        } finally {
          _inflight = false;
        }
      }, 1500);
    };
    window.ghSchedulePush._syncCoreV5 = true;
    return true;
  }

  function patchPushClear() {
    if (typeof window.ghPushWithSha !== "function" || window.ghPushWithSha._syncCoreV5) return false;
    var orig = window.ghPushWithSha;
    window.ghPushWithSha = async function (sha, silent) {
      clearReadFailed();
      try {
        localStorage.removeItem("rutalog_gh_content_hash");
      } catch (e) {}
      var r = await orig.apply(this, arguments);
      clearPendingSnapshot();
      clearDirtyMem();
      clearReadFailed();
      return r;
    };
    window.ghPushWithSha._syncCoreV5 = true;
    return true;
  }

  window.rutalogDiagnoseSync = function () {
    var out = {
      dirty: isDirty(),
      memDirty: _memDirty,
      token: null,
      users: 0,
      maestro: 0,
      codigo: 0
    };
    try {
      out.readFailed = localStorage.getItem("rutalog_gh_read_failed");
      out.rawDirty = localStorage.getItem("rutalog_gh_dirty");
      out.ssDirty = sessionStorage.getItem("rutalog_gh_dirty");
      out.token = typeof ghGetToken === "function" ? ghGetToken() : null;
      out.users = typeof loadUsers === "function" ? (loadUsers() || []).length : 0;
      out.maestro = window.estado && estado.maestro ? estado.maestro.size : 0;
      out.codigo = window.estado && estado.maestroCodigo ? estado.maestroCodigo.size : 0;
    } catch (e) {
      out.error = String(e);
    }
    console.info(LOG, "diagnose", out);
    return out;
  };

  async function forcePush(silent) {
    markDirtyMem("force-push");
    console.info(LOG, "forcePush: memDirty=", _memDirty, "ls=", localStorage.getItem("rutalog_gh_dirty"));
    return pushIfDirty(silent !== undefined ? silent : false);
  }

  function install() {
    patchMarkDirty();
    patchPushClear();
    patchSchedulePush();
    patchActualizar();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 400);

  window.rutalogSyncCore = {
    pushIfDirty: pushIfDirty,
    forcePush: forcePush,
    isDirty: isDirty,
    diagnose: window.rutalogDiagnoseSync
  };
  console.info(LOG, "dirty en memoria · forcePush() · rutalogDiagnoseSync()");
})();
