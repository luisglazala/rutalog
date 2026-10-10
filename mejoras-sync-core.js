/* RUTALOG sync-core v1 — timeout OK + dirty siempre sube + schedule = push
 * Corrige el pipeline de TODOS los paneles (maestro, citas, topes, código, usuarios).
 */
(function () {
  "use strict";
  if (window.__rutalogSyncCoreV1) return;
  window.__rutalogSyncCoreV1 = true;

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

  async function pushIfDirty(silent) {
    if (!isDirty()) return false;
    if (typeof ghPushWithSha !== "function") return false;
    console.info("[RUTALOG] sync-core · push por dirty");
    await ghPushWithSha(lastSha(), !!silent);
    return true;
  }

  function patchActualizar() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._syncCore) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      var silent = !!opts.silent;

      if (isDirty()) {
        try {
          await pushIfDirty(silent);
          if (!isDirty()) {
            if (!silent && typeof toast === "function") {
              toast("Cambios subidos a GitHub");
            }
            return;
          }
        } catch (e) {
          console.warn("[RUTALOG] sync-core · push falló", e);
          if (!silent && typeof toast === "function") {
            toast("No se pudo subir: " + (e && e.message ? e.message : e));
          }
          throw e;
        }
      }

      var fetchOrig = window.ghFetchFile;
      var wrapped = false;
      if (typeof fetchOrig === "function") {
        window.ghFetchFile = async function (fo) {
          var remote = await fetchOrig.apply(this, arguments);
          if (remote && remote.unchanged && isDirty()) {
            try {
              var forced = await fetchOrig.call(this, Object.assign({}, fo || {}, { force: true }));
              if (forced && forced.data != null) return forced;
            } catch (e) {}
            return {
              sha: remote.sha,
              data: remote.data,
              size: remote.size || 0,
              unchanged: false
            };
          }
          return remote;
        };
        wrapped = true;
      }
      try {
        return await orig.call(this, opts);
      } finally {
        if (wrapped) window.ghFetchFile = fetchOrig;
      }
    };
    window.ghActualizar._syncCore = true;
    return true;
  }

  function patchSchedulePush() {
    if (typeof window.ghSchedulePush !== "function" || window.ghSchedulePush._syncCore) return false;
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
          console.warn("[RUTALOG] sync-core · schedule push", e);
        } finally {
          _inflight = false;
        }
      }, 1500);
    };
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
      return orig.apply(this, arguments);
    };
    window.ghPushWithSha._syncCoreDirty = true;
    return true;
  }

  function install() {
    patchPushSkip();
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

  window.rutalogSyncCore = { pushIfDirty: pushIfDirty, isDirty: isDirty };
  console.info("[RUTALOG] sync-core v1 · dirty→push · schedule=push · sin early-return vacío");
})();
