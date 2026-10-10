/* RUTALOG sync-core v3 — push real: limpia bloqueos, completa payload, logs claros */
(function () {
  "use strict";
  if (window.__rutalogSyncCoreV3) return;
  window.__rutalogSyncCoreV3 = true;
  window.__rutalogSyncCoreV2 = true;
  window.__rutalogSyncCoreV1 = true;

  var PENDING_KEY = "rutalog_pending_push";
  var LOG = "[RUTALOG] sync-core v3";

  function isDirty() {
    try {
      if (typeof ghIsDirty === "function") return !!ghIsDirty();
      return localStorage.getItem("rutalog_gh_dirty") === "1";
    } catch (e) {
      return false;
    }
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

  function restorePendingIfNeeded() {
    try {
      var raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw || !window.estado) return false;
      var slim = JSON.parse(raw);
      if (!slim || Date.now() - (slim.at || 0) > 86400000) {
        clearPendingSnapshot();
        return false;
      }
      var restored = false;
      if (Array.isArray(slim.codigoSku) && slim.codigoSku.length) {
        estado.maestroCodigo = estado.maestroCodigo || new Map();
        if (
          estado.maestroCodigo.size === 0 ||
          /base|embed|pending/i.test(String(estado.maestroCodigoFuente || ""))
        ) {
          estado.maestroCodigo.clear();
          slim.codigoSku.forEach(function (r) {
            if (!r || r.sku == null) return;
            var key = typeof normSkuKey === "function" ? normSkuKey(r.sku) : String(r.sku).trim();
            if (key) estado.maestroCodigo.set(key, r);
          });
          estado.maestroCodigoFuente = "pending (" + estado.maestroCodigo.size + ")";
          restored = true;
        }
      }
      if (restored && typeof ghMarkDirty === "function") ghMarkDirty("pending-restore");
      if (restored) console.info(LOG, "restaurado pending");
      return restored;
    } catch (e) {
      return false;
    }
  }

  async function ensurePayloadSafeForPush() {
    clearReadFailed();
    var users = [];
    try {
      if (typeof loadUsers === "function") users = loadUsers() || [];
    } catch (e) {}
    var maestroSize = window.estado && estado.maestro ? estado.maestro.size : 0;
    var needRemote = users.length === 0 || maestroSize < 100;
    if (!needRemote) return true;
    console.info(LOG, "payload incompleto (users=" + users.length + " maestro=" + maestroSize + ") → fetch remoto");
    try {
      if (typeof ghFetchFile !== "function") return true;
      var remote = await ghFetchFile({ force: true });
      if (!remote || !remote.data) {
        console.warn(LOG, "fetch remoto sin data");
        return true;
      }
      var d = remote.data;
      if (users.length === 0 && Array.isArray(d.usuarios) && d.usuarios.length > 0) {
        try {
          localStorage.setItem("rutalog_usuarios_v2", JSON.stringify(d.usuarios));
          console.info(LOG, "usuarios rellenados desde remoto:", d.usuarios.length);
        } catch (e3) {
          console.warn(LOG, "no se pudieron rellenar usuarios", e3);
        }
      }
      if (maestroSize < 100 && Array.isArray(d.maestroClientes) && d.maestroClientes.length > 100) {
        try {
          if (window.estado && estado.maestro) {
            estado.maestro.clear();
            d.maestroClientes.forEach(function (r) {
              if (r && r.id) estado.maestro.set(String(r.id), r);
            });
            estado.maestroFuente = "github-pre-push";
            console.info(LOG, "maestro rellenado desde remoto:", estado.maestro.size);
          }
        } catch (e4) {
          console.warn(LOG, "no se pudo rellenar maestro", e4);
        }
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
      return true;
    } catch (e) {
      console.warn(LOG, "ensurePayload fetch", e);
      return true;
    }
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

  function patchActualizar() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._syncCoreV3) return false;
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
    window.ghActualizar._syncCoreV3 = true;
    window.ghActualizar._syncCoreV2 = true;
    window.ghActualizar._syncCore = true;
    return true;
  }

  function patchSchedulePush() {
    if (typeof window.ghSchedulePush !== "function" || window.ghSchedulePush._syncCoreV3) return false;
    var _timer = null;
    var _inflight = false;
    window.ghSchedulePush = function (reason) {
      try {
        if (typeof _ghApplyingRemote !== "undefined" && _ghApplyingRemote) return;
        if (typeof _ghApplyingUsers !== "undefined" && _ghApplyingUsers) return;
      } catch (e) {}
      try {
        if (typeof ghMarkDirty === "function") ghMarkDirty(reason || "edit");
      } catch (e2) {}
      savePendingSnapshot();
      var token = "";
      try {
        token = typeof ghGetToken === "function" ? ghGetToken() : "";
      } catch (e3) {}
      if (!token) {
        console.warn(LOG, "schedule: sin token");
        return;
      }
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
    window.ghSchedulePush._syncCoreV3 = true;
    window.ghSchedulePush._syncCore = true;
    return true;
  }

  function patchPushClear() {
    if (typeof window.ghPushWithSha !== "function" || window.ghPushWithSha._syncCoreV3) return false;
    var orig = window.ghPushWithSha;
    window.ghPushWithSha = async function (sha, silent) {
      clearReadFailed();
      try {
        localStorage.removeItem("rutalog_gh_content_hash");
      } catch (e) {}
      var r = await orig.apply(this, arguments);
      clearPendingSnapshot();
      clearReadFailed();
      return r;
    };
    window.ghPushWithSha._syncCoreV3 = true;
    window.ghPushWithSha._syncCoreDirty = true;
    return true;
  }

  window.rutalogDiagnoseSync = function () {
    var out = {
      dirty: isDirty(),
      readFailed: null,
      lastGood: null,
      token: null,
      users: 0,
      maestro: 0,
      codigo: 0,
      pending: false
    };
    try {
      out.readFailed = localStorage.getItem("rutalog_gh_read_failed");
      out.lastGood = localStorage.getItem("rutalog_gh_last_good");
      out.token = typeof ghGetToken === "function" ? ghGetToken() : null;
      out.users = typeof loadUsers === "function" ? (loadUsers() || []).length : 0;
      out.maestro = window.estado && estado.maestro ? estado.maestro.size : 0;
      out.codigo = window.estado && estado.maestroCodigo ? estado.maestroCodigo.size : 0;
      out.pending = !!sessionStorage.getItem(PENDING_KEY);
      out.dirtyWhy = localStorage.getItem("rutalog_gh_dirty_why");
    } catch (e) {
      out.error = String(e);
    }
    console.info(LOG, "diagnose", out);
    return out;
  };

  function install() {
    patchPushClear();
    patchSchedulePush();
    patchActualizar();
  }

  install();
  setTimeout(function () {
    if (restorePendingIfNeeded()) {
      setTimeout(function () {
        pushIfDirty(true).catch(function () {});
      }, 2500);
    }
  }, 3000);

  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 400);

  window.rutalogSyncCore = {
    pushIfDirty: pushIfDirty,
    isDirty: isDirty,
    diagnose: window.rutalogDiagnoseSync
  };
  console.info(LOG, "dirty→push · desbloqueo · payload completo · rutalogDiagnoseSync()");
})();
