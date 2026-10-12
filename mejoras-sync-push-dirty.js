/* RUTALOG sync-push-dirty v1 — si hay dirty, no salir en unchanged; forzar push */
(function () {
  "use strict";
  if (window.__rutalogSyncPushDirtyV1) return;
  window.__rutalogSyncPushDirtyV1 = true;

  var LOG = "[RUTALOG] sync-push-dirty";

  function isDirty() {
    try {
      if (typeof window.ghIsDirty === "function") return !!window.ghIsDirty();
    } catch (e) {}
    try {
      if (window.__rutalogMemDirty) return true;
    } catch (e2) {}
    try {
      return localStorage.getItem("rutalog_gh_dirty") === "1";
    } catch (e3) {
      return false;
    }
  }

  function patchActualizar() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._pushDirty) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      if (isDirty()) {
        opts = Object.assign({}, opts, { force: true });
      }
      var result = await orig.call(this, opts);
      if (isDirty() && typeof window.ghPushWithSha === "function") {
        console.info(LOG, "aún dirty tras actualizar → push");
        try {
          await window.ghPushWithSha(null, !!opts.silent);
        } catch (e) {
          console.warn(LOG, "push tras dirty", e && e.message);
          throw e;
        }
      }
      return result;
    };
    window.ghActualizar._pushDirty = true;
    return true;
  }

  function patchGuardarUsuario() {
    if (typeof window.guardarUsuarioForm !== "function" || window.guardarUsuarioForm._pushDirty)
      return false;
    var orig = window.guardarUsuarioForm;
    window.guardarUsuarioForm = async function () {
      await orig.apply(this, arguments);
      try {
        if (typeof ghMarkDirty === "function") ghMarkDirty("usuarios");
      } catch (e) {}
      try {
        if (window.__rutalogMemDirty !== undefined) window.__rutalogMemDirty = true;
      } catch (e2) {}
      try {
        if (typeof toast === "function") toast("Subiendo usuarios a GitHub…");
        if (window.rutalogSyncCore && typeof window.rutalogSyncCore.forcePush === "function") {
          await window.rutalogSyncCore.forcePush(false);
        } else if (typeof window.ghPushWithSha === "function") {
          await window.ghPushWithSha(null, false);
        }
      } catch (e3) {
        console.warn(LOG, "push usuarios", e3 && e3.message);
        if (typeof toast === "function") {
          toast("Usuario guardado aquí; subida: " + String((e3 && e3.message) || e3).slice(0, 80));
        }
      }
    };
    window.guardarUsuarioForm._pushDirty = true;
    return true;
  }

  function install() {
    patchActualizar();
    patchGuardarUsuario();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 400);

  console.info(LOG, "v1 · dirty → force fetch + push · guardar usuario → forcePush");
})();
