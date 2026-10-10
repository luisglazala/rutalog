/* RUTALOG sync-core v2 — dirty→push fiable; limpia bloqueo read_failed; pending hasta OK */
(function () {
  "use strict";
  if (window.__rutalogSyncCoreV2) return;
  window.__rutalogSyncCoreV2 = true;
  window.__rutalogSyncCoreV1 = true;

  var PENDING_KEY = "rutalog_pending_push";

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

  function readFailedStuck() {
    try {
      if (typeof ghLastReadFailed === "function") return !!ghLastReadFailed();
      var v = localStorage.getItem("rutalog_gh_read_failed");
      return !!(v && v.length > 2);
    } catch (e) {
      return false;
    }
  }

  function savePendingSnapshot() {
    try {
      if (typeof ghBuildPayload !== "function") return;
      var p = ghBuildPayload();
      var slim = {
        at: Date.now(),
        codigoSku: p.codigoSku || [],
        topesSku: p.topesSku || [],
        citas: p.citas || {},
        maestroFuente: p.maestroFuente || "",
        maestroClientes: p.maestroClientes || [],
        usuarios: p.usuarios || []
      };
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(slim));
    } catch (e) {
      console.warn("[RUTALOG] sync-core · no se pudo guardar pending", e);
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
      if (!raw) return false;
      var slim = JSON.parse(raw);
      if (!slim || !window.estado) return false;
      var age = Date.now() - (slim.at || 0);
      if (age > 24 * 3600 * 1000) {
        clearPendingSnapshot();
        return false;
      }
      if (Array.isArray(slim.codigoSku) && slim.codigoSku.length > 0) {
        if (
          !estado.maestroCodigo ||
          estado.maestroCodigo.size === 0 ||
          /base|embed/i.test(String(estado.maestroCodigoFuente || ""))
        ) {
          estado.maestroCodigo = estado.maestroCodigo || new Map();
          estado.maestroCodigo.clear();
          slim.codigoSku.forEach(function (r) {
            if (!r || r.sku == null) return;
            var key = typeof normSkuKey === "function" ? normSkuKey(r.sku) : String(r.sku).trim();
            if (key) estado.maestroCodigo.set(key, r);
          });
          estado.maestroCodigoFuente = "pending local (" + estado.maestroCodigo.size + " SKU)";
        }
      }
      if (Array.isArray(slim.topesSku) && slim.topesSku.length > 0 && estado.topesSku) {
        if (estado.topesSku.size === 0) {
          slim.topesSku.forEach(function (t) {
            if (!t || t.sku == null) return;
            var key = typeof normSkuKey === "function" ? normSkuKey(t.sku) : String(t.sku);
            estado.topesSku.set(key, t);
          });
        }
      }
      if (slim.citas && typeof slim.citas === "object" && estado.citas) {
        if (!estado.citas.size) {
          Object.keys(slim.citas).forEach(function (k) {
            estado.citas.set(k, slim.citas[k]);
          });
        }
      }
      if (typeof ghMarkDirty === "function") ghMarkDirty("pending-restore");
      console.info("[RUTALOG] sync-core · restaurado pending de sessionStorage");
      return true;
    } catch (e) {
      console.warn("[RUTALOG] sync-core · restore pending", e);
      return false;
    }
  }

  async function ensureWritable() {
    if (!readFailedStuck()) return true;
    console.warn("[RUTALOG] sync-core · read_failed activo → intentando desbloquear con fetch force");
    try {
      if (typeof ghFetchFile === "function") {
        var remote = await ghFetchFile({ force: true });
        if (remote && (remote.data || remote.unchanged)) {
          clearReadFailed();
          if (remote.data && typeof ghSetLastGood === "function") {
            try {
              ghSetLastGood({
                sha: remote.sha,
                size: remote.size || 0,
                users: remote.data.usuarios ? remote.data.usuarios.length : 0
              });
            } catch (e) {}
          }
          console.info("[RUTALOG] sync-core · read_failed limpiado tras fetch OK");
          return true;
        }
      }
    } catch (e) {
      console.warn("[RUTALOG] sync-core · no se pudo desbloquear", e);
    }
    try {
      var raw = localStorage.getItem("rutalog_gh_read_failed");
      var info = raw ? JSON.parse(raw) : null;
      var at = info && info.at ? Date.parse(info.at) : 0;
      var lg = typeof ghGetLastGood === "function" ? ghGetLastGood() : null;
      if (lg && lg.sha && at && Date.now() - at > 10 * 60 * 1000) {
        clearReadFailed();
        console.info("[RUTALOG] sync-core · read_failed antiguo ignorado (>10 min)");
        return true;
      }
    } catch (e2) {}
    return false;
  }

  async function pushIfDirty(silent) {
    if (!isDirty()) return false;
    if (typeof ghPushWithSha !== "function") return false;

    savePendingSnapshot();

    var ok = await ensureWritable();
    if (!ok) {
      var msg =
        "No se puede subir: la última lectura del catálogo falló. Pulsa Actualizar ahora y reintenta.";
      console.warn("[RUTALOG] sync-core · " + msg);
      if (!silent && typeof toast === "function") toast(msg);
      throw new Error(msg);
    }

    try {
      localStorage.removeItem("rutalog_gh_content_hash");
    } catch (e) {}

    console.info("[RUTALOG] sync-core · push por dirty");
    await ghPushWithSha(lastSha(), !!silent);
    clearPendingSnapshot();
    return true;
  }

  function patchActualizar() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._syncCoreV2) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      var silent = !!opts.silent;

      if (isDirty()) {
        try {
          await pushIfDirty(silent);
          if (!isDirty()) {
            if (!silent && typeof toast === "function") toast("Cambios subidos a GitHub");
            return;
          }
        } catch (e) {
          console.warn("[RUTALOG] sync-core · push falló", e);
          if (!silent && typeof toast === "function") {
            toast("No se pudo subir: " + (e && e.message ? e.message : e));
          }
          if (!silent) throw e;
          return;
        }
      }

      try {
        var r = await orig.call(this, opts);
        clearReadFailed();
        return r;
      } catch (e) {
        throw e;
      }
    };
    window.ghActualizar._syncCoreV2 = true;
    window.ghActualizar._syncCore = true;
    return true;
  }

  function patchSchedulePush() {
    if (typeof window.ghSchedulePush !== "function" || window.ghSchedulePush._syncCoreV2) return false;
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
      try {
        savePendingSnapshot();
      } catch (e3) {}
      var token = "";
      try {
        token = typeof ghGetToken === "function" ? ghGetToken() : "";
      } catch (e4) {}
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
          console.warn("[RUTALOG] sync-core · schedule push", e);
        } finally {
          _inflight = false;
        }
      }, 1500);
    };
    window.ghSchedulePush._syncCoreV2 = true;
    window.ghSchedulePush._syncCore = true;
    return true;
  }

  function patchPushSkip() {
    if (typeof window.ghPushWithSha !== "function" || window.ghPushWithSha._syncCoreDirty) return false;
    var orig = window.ghPushWithSha;
    window.ghPushWithSha = async function (sha, silent) {
      if (isDirty()) {
        try {
          localStorage.removeItem("rutalog_gh_content_hash");
        } catch (e) {}
      }
      var r = await orig.apply(this, arguments);
      clearPendingSnapshot();
      clearReadFailed();
      return r;
    };
    window.ghPushWithSha._syncCoreDirty = true;
    return true;
  }

  function install() {
    patchPushSkip();
    patchSchedulePush();
    patchActualizar();
  }

  function bootRestore() {
    setTimeout(function () {
      if (restorePendingIfNeeded()) {
        setTimeout(function () {
          pushIfDirty(true).catch(function (e) {
            console.warn("[RUTALOG] sync-core · push tras restore", e);
          });
        }, 2000);
      }
    }, 2500);
  }

  install();
  bootRestore();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 400);

  window.rutalogSyncCore = {
    pushIfDirty: pushIfDirty,
    isDirty: isDirty,
    clearReadFailed: clearReadFailed,
    savePending: savePendingSnapshot
  };
  console.info("[RUTALOG] sync-core v2 · dirty→push · desbloqueo read_failed · pending session");
})();
