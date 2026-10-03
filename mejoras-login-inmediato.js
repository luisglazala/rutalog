/* RUTALOG mejoras-login-inmediato v5 — login al abrir + limpiar credenciales al cerrar sesión */
(function () {
  "use strict";
  if (window.__rutalogLoginInmediatoV5) return;
  window.__rutalogLoginInmediatoV5 = true;

  var shownOnce = false;
  var syncStarted = false;
  var unlocked = false;

  function hasSession() {
    try {
      if (typeof usuarioActual === "function") {
        var u = usuarioActual();
        if (u && u.id && u.username) return true;
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem("rutalog_session");
      if (!raw) return false;
      var s = JSON.parse(raw);
      return !!(s && s.id && s.username);
    } catch (e) {
      return false;
    }
  }

  function isTypingInLogin() {
    var ae = document.activeElement;
    if (!ae) return false;
    return ae.id === "loginUser" || ae.id === "loginPass";
  }

  /** Seguridad: no dejar credenciales en el formulario al cerrar sesión */
  function clearLoginFields() {
    try {
      var u = document.getElementById("loginUser");
      var p = document.getElementById("loginPass");
      if (u) {
        u.value = "";
        u.defaultValue = "";
        u.setAttribute("autocomplete", "username");
        u.blur();
      }
      if (p) {
        p.value = "";
        p.defaultValue = "";
        p.setAttribute("autocomplete", "new-password");
        p.blur();
      }
    } catch (e) {}
  }

  function unlockApp() {
    unlocked = true;
    try {
      document.documentElement.classList.remove("rutalog-need-login", "rutalog-booting");
      document.documentElement.classList.add("rutalog-ready");
    } catch (e) {}

    var ov = document.getElementById("loginOverlay");
    if (ov) {
      ov.hidden = true;
      ov.setAttribute("hidden", "");
      ov.style.display = "none";
      ov.style.visibility = "hidden";
      ov.style.pointerEvents = "none";
    }

    var main = document.querySelector(".main");
    if (main) {
      main.style.visibility = "";
      main.style.opacity = "";
      main.style.pointerEvents = "";
    }
    var sb = document.querySelector(".sidebar");
    if (sb) {
      sb.style.visibility = "";
      sb.style.opacity = "";
    }
    document.querySelectorAll(".nav button[data-page]").forEach(function (b) {
      b.hidden = false;
    });
    var chip = document.getElementById("userChipBar");
    if (chip) chip.hidden = false;

    if (typeof aplicarPermisosUI === "function") {
      try { aplicarPermisosUI(); } catch (e) {}
    }
  }

  function lockToLogin(msg) {
    unlocked = false;
    shownOnce = false;
    clearLoginFields();
    try {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-ready", "rutalog-booting");
    } catch (e) {}
    showOverlayOnly(msg || "Introduce usuario y contraseña");
    setTimeout(clearLoginFields, 50);
    setTimeout(clearLoginFields, 300);
  }

  function showOverlayOnly(msg) {
    if (hasSession()) {
      unlockApp();
      return;
    }
    unlocked = false;

    try {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-ready", "rutalog-booting");
    } catch (e) {}

    var ov = document.getElementById("loginOverlay");
    if (ov) {
      ov.hidden = false;
      ov.removeAttribute("hidden");
      ov.style.display = "flex";
      ov.style.visibility = "visible";
      ov.style.pointerEvents = "auto";
      ov.style.zIndex = "99999";
    }

    var main = document.querySelector(".main");
    if (main) {
      main.style.visibility = "hidden";
      main.style.opacity = "0";
      main.style.pointerEvents = "none";
    }
    var sb = document.querySelector(".sidebar");
    if (sb) {
      sb.style.visibility = "hidden";
      sb.style.opacity = "0";
    }
    document.querySelectorAll(".nav button[data-page]").forEach(function (b) {
      b.hidden = true;
    });
    var chip = document.getElementById("userChipBar");
    if (chip) chip.hidden = true;

    if (msg) {
      var err = document.getElementById("loginError");
      if (err && !isTypingInLogin()) {
        err.textContent = msg;
        err.classList.add("visible");
      }
    }

    if (!shownOnce && !isTypingInLogin()) {
      var u = document.getElementById("loginUser");
      if (u) setTimeout(function () { try { u.focus(); } catch (e) {} }, 80);
    }
    shownOnce = true;
  }

  function patchMostrarLogin() {
    if (typeof window.mostrarLogin !== "function" || window.mostrarLogin._stablePatch) return;
    var _orig = window.mostrarLogin;
    window.mostrarLogin = function (show) {
      if (show) {
        if (hasSession()) {
          unlockApp();
          return;
        }
        unlocked = false;
        clearLoginFields();
        var ov = document.getElementById("loginOverlay");
        if (!ov) return _orig.apply(this, arguments);
        ov.hidden = false;
        ov.removeAttribute("hidden");
        ov.style.display = "flex";
        ov.style.visibility = "visible";
        ov.style.pointerEvents = "auto";
        showOverlayOnly(null);
        clearLoginFields();
        return;
      }
      return _orig.apply(this, arguments);
    };
    window.mostrarLogin._stablePatch = true;
  }

  function patchIntentarLogin() {
    if (typeof window.intentarLogin !== "function" || window.intentarLogin._stablePatch) return;
    var _login = window.intentarLogin;
    window.intentarLogin = function () {
      var r = _login.apply(this, arguments);
      setTimeout(function () {
        if (hasSession()) unlockApp();
      }, 100);
      setTimeout(function () {
        if (hasSession()) unlockApp();
      }, 300);
      return r;
    };
    window.intentarLogin._stablePatch = true;
  }

  function patchCerrarSesion() {
    if (typeof window.cerrarSesion !== "function" || window.cerrarSesion._stablePatch) return;
    var _cerrar = window.cerrarSesion;
    window.cerrarSesion = function () {
      clearLoginFields();
      try {
        _cerrar.apply(this, arguments);
      } catch (e) {
        console.warn(e);
      }
      unlocked = false;
      shownOnce = false;
      clearLoginFields();
      setTimeout(function () {
        lockToLogin("Sesión cerrada. Introduce usuario y contraseña");
        clearLoginFields();
      }, 30);
      setTimeout(function () {
        if (!hasSession()) {
          lockToLogin("Introduce usuario y contraseña");
          clearLoginFields();
        }
      }, 200);
    };
    window.cerrarSesion._stablePatch = true;
  }

  function patchGate() {
    if (typeof window.aplicarGateLoginDesdeSync === "function" && !window.aplicarGateLoginDesdeSync._stable) {
      var _g = window.aplicarGateLoginDesdeSync;
      window.aplicarGateLoginDesdeSync = function () {
        try { _g.apply(this, arguments); } catch (e) {}
        if (hasSession()) unlockApp();
        else showOverlayOnly(null);
      };
      window.aplicarGateLoginDesdeSync._stable = true;
    }
    if (typeof window.requiereLogin === "function" && !window.requiereLogin._stable) {
      var _r = window.requiereLogin;
      window.requiereLogin = function () {
        if (!hasSession()) return true;
        return _r.apply(this, arguments);
      };
      window.requiereLogin._stable = true;
    }
  }

  function kickSyncOnce() {
    if (syncStarted || hasSession()) return;
    syncStarted = true;
    showOverlayOnly("Sincronizando usuarios desde la nube…");
    if (typeof ghActualizar !== "function") {
      showOverlayOnly("Introduce usuario y contraseña");
      return;
    }
    Promise.resolve(ghActualizar({ silent: true }))
      .then(function () {
        if (hasSession()) unlockApp();
        else showOverlayOnly("Introduce usuario y contraseña");
      })
      .catch(function () {
        showOverlayOnly("Introduce usuario y contraseña");
      });
  }

  function boot() {
    patchMostrarLogin();
    patchIntentarLogin();
    patchCerrarSesion();
    patchGate();
    if (hasSession()) {
      unlockApp();
    } else {
      showOverlayOnly(null);
      setTimeout(kickSyncOnce, 400);
    }
    setInterval(function () {
      patchMostrarLogin();
      patchCerrarSesion();
      if (hasSession()) {
        if (!unlocked) unlockApp();
      } else if (unlocked) {
        lockToLogin("Introduce usuario y contraseña");
      }
    }, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 200); });
  } else {
    setTimeout(boot, 200);
  }
  setTimeout(boot, 800);
  setTimeout(boot, 2000);
})();
