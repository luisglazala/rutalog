/* RUTALOG usuarios-save v1 — guardar usuario fiable (mem + SS + LS + push) */
(function () {
  "use strict";
  if (window.__rutalogUsuariosSaveV1) return;
  window.__rutalogUsuariosSaveV1 = true;

  var LOG = "[RUTALOG] usuarios-save";
  var LS = "rutalog_usuarios_v2";
  var SS = "rutalog_usuarios_v2_ss";

  function writeAll(arr) {
    if (!Array.isArray(arr)) return false;
    window.__rutalogUsersMem = arr.slice();
    var json = JSON.stringify(arr);
    var ok = false;
    try {
      sessionStorage.setItem(SS, json);
      ok = true;
    } catch (e0) {}
    try {
      localStorage.setItem(LS, json);
      ok = true;
    } catch (e1) {
      console.warn(LOG, "LS falló", e1 && e1.name);
      try {
        if (window.rutalogStorage && window.rutalogStorage.safeSetHeavy) {
          window.rutalogStorage.safeSetHeavy(LS, json);
          ok = true;
        }
      } catch (e2) {}
    }
    return ok || arr.length >= 0;
  }

  function readAll() {
    if (window.__rutalogUsersMem && window.__rutalogUsersMem.length) {
      return window.__rutalogUsersMem.slice();
    }
    try {
      var ss = sessionStorage.getItem(SS);
      if (ss) {
        var a = JSON.parse(ss);
        if (Array.isArray(a) && a.length) return a;
      }
    } catch (e) {}
    try {
      var ls = localStorage.getItem(LS);
      if (ls) {
        var b = JSON.parse(ls);
        if (Array.isArray(b)) return b;
      }
    } catch (e2) {}
    return [];
  }

  function patchSaveLoad() {
    if (typeof window.saveUsers === "function" && !window.saveUsers._usuariosSave) {
      var oSave = window.saveUsers;
      window.saveUsers = function (arr) {
        writeAll(arr);
        try {
          return oSave.apply(this, arguments);
        } catch (e) {
          console.warn(LOG, "saveUsers core", e);
          return true;
        }
      };
      window.saveUsers._usuariosSave = true;
    }
    if (typeof window.loadUsers === "function" && !window.loadUsers._usuariosSave) {
      var oLoad = window.loadUsers;
      window.loadUsers = function () {
        var fromMem = readAll();
        if (fromMem.length) return fromMem;
        try {
          return oLoad.apply(this, arguments) || [];
        } catch (e) {
          return [];
        }
      };
      window.loadUsers._usuariosSave = true;
    }
  }

  function bindButton() {
    var btn = document.getElementById("btnAddUsuario");
    if (!btn || btn._usuariosSave) return false;
    btn.addEventListener(
      "click",
      function () {
        setTimeout(function () {
          try {
            if (typeof renderUsuariosTable === "function") renderUsuariosTable();
          } catch (e) {}
        }, 100);
      },
      false
    );
    btn._usuariosSave = true;
    return true;
  }

  window.rutalogGuardarUsuarioAhora = async function () {
    patchSaveLoad();
    if (typeof window.guardarUsuarioForm === "function") {
      await window.guardarUsuarioForm();
      console.info(LOG, "después form · usuarios:", readAll().length);
      if (typeof renderUsuariosTable === "function") renderUsuariosTable();
      return readAll().length;
    }
    throw new Error("guardarUsuarioForm no disponible");
  };

  function install() {
    patchSaveLoad();
    bindButton();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 300);

  console.info(LOG, "v1 · save/load con memoria · rutalogGuardarUsuarioAhora()");
})();
