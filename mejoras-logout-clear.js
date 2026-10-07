/* RUTALOG logout-clear v1 — no dejar usuario/clave visibles al cerrar sesión */
(function () {
  "use strict";
  if (window.__rutalogLogoutClearV1) return;
  window.__rutalogLogoutClearV1 = true;

  function clearLoginFields() {
    try {
      ["loginUser", "loginPass", "user", "pass", "username", "password"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.value = "";
          el.setAttribute("autocomplete", id.indexOf("ass") >= 0 || id === "password" ? "new-password" : "off");
        }
      });
      var form = document.querySelector("#loginOverlay form, form.login-form, #loginForm");
      if (form) {
        try { form.reset(); } catch (e) {}
      }
    } catch (e) {}
  }

  function patchCerrar() {
    if (typeof window.cerrarSesion !== "function" || window.cerrarSesion._logoutClear) return false;
    var orig = window.cerrarSesion;
    window.cerrarSesion = function () {
      var r = orig.apply(this, arguments);
      clearLoginFields();
      setTimeout(clearLoginFields, 50);
      setTimeout(clearLoginFields, 300);
      return r;
    };
    window.cerrarSesion._logoutClear = true;
    return true;
  }

  function wireBtn() {
    var btn = document.getElementById("btnLogout");
    if (btn && !btn._logoutClear) {
      btn._logoutClear = true;
      btn.addEventListener("click", function () {
        setTimeout(clearLoginFields, 0);
        setTimeout(clearLoginFields, 100);
      }, true);
    }
  }

  var n = 0;
  function tick() {
    n++;
    patchCerrar();
    wireBtn();
    if (n < 40) setTimeout(tick, n < 10 ? 200 : 1000);
  }
  tick();
  console.info("[RUTALOG] logout-clear v1 — campos vacíos al cerrar sesión");
})();
