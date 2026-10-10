/* RUTALOG sync-skip-unchanged v1 — no crear commit si el catálogo es idéntico */
(function () {
  "use strict";
  if (window.__rutalogSkipUnchangedV1) return;
  window.__rutalogSkipUnchangedV1 = true;

  var HASH_KEY = "rutalog_gh_content_hash";

  function fnv1a(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function contentHashFromPayload(payload) {
    if (!payload || typeof payload !== "object") return "";
    var o = {
      version: payload.version,
      maestroClientes: payload.maestroClientes || [],
      maestroFuente: payload.maestroFuente || "",
      citas: payload.citas || {},
      topesSku: payload.topesSku || [],
      codigoSku: payload.codigoSku || [],
      usuarios: payload.usuarios || []
    };
    try {
      return fnv1a(JSON.stringify(o));
    } catch (e) {
      return "";
    }
  }

  function contentHashFromData(data) {
    if (!data || typeof data !== "object") return "";
    return contentHashFromPayload({
      version: data.version,
      maestroClientes: data.maestroClientes,
      maestroFuente: data.maestroFuente,
      citas: data.citas,
      topesSku: data.topesSku,
      codigoSku: data.codigoSku,
      usuarios: data.usuarios
    });
  }

  function getStoredHash() {
    try {
      return localStorage.getItem(HASH_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setStoredHash(h) {
    try {
      if (h) localStorage.setItem(HASH_KEY, h);
    } catch (e) {}
  }

  function patchPush() {
    if (typeof window.ghPushWithSha !== "function" || window.ghPushWithSha._skipUnchanged) return false;
    var orig = window.ghPushWithSha;
    window.ghPushWithSha = async function (sha, silent) {
      var payload = null;
      var localHash = "";
      try {
        if (typeof ghBuildPayload === "function") {
          payload = ghBuildPayload();
          localHash = contentHashFromPayload(payload);
        }
      } catch (e) {}
      var remoteHash = getStoredHash();
      if (localHash && remoteHash && localHash === remoteHash) {
        try {
          if (typeof ghClearDirty === "function") ghClearDirty();
        } catch (e) {}
        try {
          if (typeof ghSetMeta === "function") {
            ghSetMeta({
              updatedAt: (payload && payload.updatedAt) || new Date().toISOString(),
              updatedBy: (payload && payload.updatedBy) || null,
              action: "omitido (sin cambios)"
            });
          }
        } catch (e2) {}
        if (!silent && typeof toast === "function") {
          toast("Sin cambios que subir · catálogo idéntico al de GitHub");
        }
        console.info("[RUTALOG] skip-unchanged · push omitido hash=" + localHash);
        return;
      }
      var r = await orig.apply(this, arguments);
      if (localHash) setStoredHash(localHash);
      return r;
    };
    window.ghPushWithSha._skipUnchanged = true;
    return true;
  }

  function patchApply() {
    if (typeof window.ghApplyPayload !== "function" || window.ghApplyPayload._skipUnchanged) return false;
    var orig = window.ghApplyPayload;
    window.ghApplyPayload = function (data, opts) {
      var r = orig.apply(this, arguments);
      try {
        var h = contentHashFromData(data);
        if (h) setStoredHash(h);
      } catch (e) {}
      return r;
    };
    window.ghApplyPayload._skipUnchanged = true;
    return true;
  }

  function patchCodigoNoLs() {
    try {
      localStorage.removeItem("rutalog_maestro_codigo");
    } catch (e) {}
    if (typeof window.loadMaestroCodigoLS === "function" && !window.loadMaestroCodigoLS._noLs) {
      window.loadMaestroCodigoLS = function () {
        try {
          localStorage.removeItem("rutalog_maestro_codigo");
        } catch (e) {}
        return false;
      };
      window.loadMaestroCodigoLS._noLs = true;
    }
    if (typeof window.saveMaestroCodigoLS === "function" && !window.saveMaestroCodigoLS._noLs) {
      var oSave = window.saveMaestroCodigoLS;
      window.saveMaestroCodigoLS = function () {
        try {
          localStorage.removeItem("rutalog_maestro_codigo");
        } catch (e) {}
        return oSave.apply(this, arguments);
      };
      window.saveMaestroCodigoLS._noLs = true;
    }
  }

  function install() {
    patchPush();
    patchApply();
    patchCodigoNoLs();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 300);

  console.info("[RUTALOG] skip-unchanged v1 · no commit si hash igual + código sin LS");
})();
