/* RUTALOG push-codigo v1 — tras editar/importar código SKU, forzar push real a GitHub */
(function () {
  "use strict";
  if (window.__rutalogPushCodigoV1) return;
  window.__rutalogPushCodigoV1 = true;

  function markDirty(why) {
    try {
      if (typeof ghMarkDirty === "function") ghMarkDirty(why || "codigo");
      else {
        localStorage.setItem("rutalog_gh_dirty", "1");
        localStorage.setItem("rutalog_gh_dirty_why", why || "codigo");
      }
    } catch (e) {}
  }

  async function forcePushCodigo(why) {
    markDirty(why || "codigo");
    try {
      localStorage.removeItem("rutalog_gh_content_hash");
    } catch (e) {}
    var sha = null;
    try {
      sha = localStorage.getItem("rutalog_gh_sha") || null;
    } catch (e2) {}
    console.info(
      "[RUTALOG] push-codigo · iniciando",
      why || "",
      "sku=",
      window.estado && estado.maestroCodigo ? estado.maestroCodigo.size : "?"
    );
    try {
      if (typeof ghPushWithSha === "function") {
        await ghPushWithSha(sha, false);
        console.info("[RUTALOG] push-codigo · ok");
        if (typeof toast === "function") toast("Código SKU subido a GitHub");
        return true;
      }
      if (typeof ghActualizar === "function") {
        await ghActualizar({ silent: false, force: true, manual: true });
        return true;
      }
    } catch (e) {
      console.warn("[RUTALOG] push-codigo · error", e);
      if (typeof toast === "function") {
        toast("No se pudo subir código SKU: " + (e && e.message ? e.message : e));
      }
    }
    return false;
  }

  function wrapSave() {
    if (typeof window.saveMaestroCodigoLS !== "function" || window.saveMaestroCodigoLS._pushCodigo)
      return;
    var orig = window.saveMaestroCodigoLS;
    window.saveMaestroCodigoLS = function () {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        forcePushCodigo("codigo-edit");
      }, 600);
      return r;
    };
    window.saveMaestroCodigoLS._pushCodigo = true;
  }

  function wrapImport() {
    if (typeof window.importarMaestroCodigo !== "function" || window.importarMaestroCodigo._pushCodigo)
      return;
    var orig = window.importarMaestroCodigo;
    window.importarMaestroCodigo = async function (file) {
      var r = await orig.apply(this, arguments);
      setTimeout(function () {
        forcePushCodigo("codigo-import");
      }, 800);
      return r;
    };
    window.importarMaestroCodigo._pushCodigo = true;
  }

  function patchSkipRespectDirty() {
    if (typeof window.ghPushWithSha !== "function") return;
    if (window.ghPushWithSha._pushCodigoDirty) return;
    var orig = window.ghPushWithSha;
    window.ghPushWithSha = async function (sha, silent) {
      try {
        var dirty =
          typeof ghIsDirty === "function"
            ? ghIsDirty()
            : localStorage.getItem("rutalog_gh_dirty") === "1";
        if (dirty) {
          try {
            localStorage.removeItem("rutalog_gh_content_hash");
          } catch (e) {}
        }
      } catch (e2) {}
      return orig.apply(this, arguments);
    };
    window.ghPushWithSha._pushCodigoDirty = true;
  }

  function install() {
    wrapSave();
    wrapImport();
    patchSkipRespectDirty();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 50) clearInterval(t);
  }, 300);

  window.rutalogPushCodigo = forcePushCodigo;
  console.info("[RUTALOG] push-codigo v1 · push forzado tras editar/importar SKU");
})();
