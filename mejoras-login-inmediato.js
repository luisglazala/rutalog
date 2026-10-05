/* RUTALOG login v6 — sin parpadeo al escribir ni al cambiar de campo */
(function () {
  "use strict";
  if (window.__rutalogLoginInmediatoV6) return;
  window.__rutalogLoginInmediatoV6 = true;

  var shownOnce = false;
  var syncStarted = false;
  var unlocked = false;
  var loginStable = false;

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
    if (ae.id === "loginUser" || ae.id === "loginPass") return true;
    /* También si el foco está dentro del card de login */
    var card = document.querySelector(".login-card");
    if (card && card.contains(ae)) return true;
    return false;
  }

  function loginHasTypedContent() {
    try {
      var u = document.getElementById("loginUser");
      var p = document.getElementById("loginPass");
      if (u && String(u.value || "").length) return true;
      if (p && String(p.value || "").length) return true;
    } catch (e) {}
    return false;
  }

  /** Solo al cerrar sesión — no tocar autocomplete (evita reflow del navegador) */
  function clearLoginFields() {
    if (isTypingInLogin() || loginHasTypedContent()) return;
    try {
      var u = document.getElementById("loginUser");
      var p = document.getElementById("loginPass");
      if (u) u.value = "";
      if (p) p.value = "";
    } catch (e) {}
  }

  function forceClearLoginFields() {
    try {
      var u = document.getElementById("loginUser");
      var p = document.getElementById("loginPass");
      if (u) {
        u.blur();
        u.value = "";
      }
      if (p) {
        p.blur();
        p.value = "";
      }
    } catch (e) {}
  }

  function unlockApp() {
    if (unlocked && document.documentElement.classList.contains("rutalog-ready")) {
      return; /* ya estable: no volver a tocar el DOM */
    }
    unlocked = true;
    loginStable = true;
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
    loginStable = false;
    shownOnce = false;
    forceClearLoginFields();
    try {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-ready", "rutalog-booting");
    } catch (e) {}
    showOverlayOnly(msg || "Introduce usuario y contraseña", true);
  }

  function showOverlayOnly(msg, forceFocus) {
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

    if (msg && !isTypingInLogin() && !loginHasTypedContent()) {
      var err = document.getElementById("loginError");
      if (err) {
        err.textContent = msg;
        err.classList.add("visible");
      }
    }

    /* Solo enfocar usuario la primera vez, nunca si ya escribe o está en contraseña */
    if ((forceFocus || !shownOnce) && !isTypingInLogin() && !loginHasTypedContent()) {
      var u = document.getElementById("loginUser");
      if (u) {
        setTimeout(function () {
          try {
            if (!isTypingInLogin() || document.activeElement === u) u.focus();
          } catch (e) {}
        }, 60);
      }
    }
    shownOnce = true;
  }

  function patchMostrarLogin() {
    if (typeof window.mostrarLogin !== "function" || window.mostrarLogin._stablePatchV6) return;
    window.mostrarLogin = function (show) {
      if (show) {
        if (hasSession()) {
          unlockApp();
          return;
        }
        /* No limpiar ni robar foco si el usuario ya está escribiendo */
        if (isTypingInLogin() || loginHasTypedContent()) {
          showOverlayOnly(null, false);
          return;
        }
        unlocked = false;
        showOverlayOnly(null, true);
        return;
      }
      if (hasSession()) unlockApp();
    };
    window.mostrarLogin._stablePatchV6 = true;
  }

  function patchIntentarLogin() {
    if (typeof window.intentarLogin !== "function" || window.intentarLogin._stablePatchV6) return;
    var _orig = window.intentarLogin;
    window.intentarLogin = async function () {
      var r = await _orig.apply(this, arguments);
      try {
        if (hasSession()) {
          unlockApp();
          /* Un solo frame para pintar la app sin doble toggle */
          requestAnimationFrame(function () {
            if (hasSession()) unlockApp();
          });
        }
      } catch (e) {}
      return r;
    };
    window.intentarLogin._stablePatchV6 = true;
  }

  function patchCerrarSesion() {
    if (typeof window.cerrarSesion !== "function" || window.cerrarSesion._stablePatchV6) return;
    var _orig = window.cerrarSesion;
    window.cerrarSesion = function () {
      unlocked = false;
      loginStable = false;
      shownOnce = false;
      try { _orig.apply(this, arguments); } catch (e) {}
      forceClearLoginFields();
      setTimeout(function () {
        lockToLogin("Sesión cerrada. Introduce usuario y contraseña");
      }, 40);
    };
    window.cerrarSesion._stablePatchV6 = true;
  }

  function patchGate() {
    if (typeof window.aplicarGateLoginDesdeSync === "function" && !window.aplicarGateLoginDesdeSync._stableV6) {
      var _g = window.aplicarGateLoginDesdeSync;
      window.aplicarGateLoginDesdeSync = function () {
        try { _g.apply(this, arguments); } catch (e) {}
        if (hasSession()) unlockApp();
        else if (!isTypingInLogin() && !loginHasTypedContent()) showOverlayOnly(null, false);
      };
      window.aplicarGateLoginDesdeSync._stableV6 = true;
    }
  }

  function kickSyncOnce() {
    if (syncStarted || hasSession()) return;
    syncStarted = true;
    if (!isTypingInLogin()) {
      showOverlayOnly("Sincronizando usuarios…", false);
    }
    if (typeof ghActualizar !== "function") {
      if (!isTypingInLogin()) showOverlayOnly("Introduce usuario y contraseña", false);
      return;
    }
    Promise.resolve(ghActualizar({ silent: true }))
      .then(function () {
        if (hasSession()) unlockApp();
        else if (!isTypingInLogin() && !loginHasTypedContent()) {
          showOverlayOnly("Introduce usuario y contraseña", false);
        }
      })
      .catch(function () {
        if (!isTypingInLogin() && !loginHasTypedContent()) {
          showOverlayOnly("Introduce usuario y contraseña", false);
        }
      });
  }

  function stabilizeLoginInputs() {
    var u = document.getElementById("loginUser");
    var p = document.getElementById("loginPass");
    if (u) {
      u.setAttribute("autocomplete", "username");
      u.setAttribute("spellcheck", "false");
    }
    if (p) {
      /* current-password: no cambiar a new-password (provoca reflow del gestor de claves) */
      p.setAttribute("autocomplete", "current-password");
      p.setAttribute("spellcheck", "false");
    }
  }

  function boot() {
    stabilizeLoginInputs();
    patchMostrarLogin();
    patchIntentarLogin();
    patchCerrarSesion();
    patchGate();
    if (hasSession()) {
      unlockApp();
    } else {
      showOverlayOnly(null, !shownOnce);
      setTimeout(kickSyncOnce, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 150); });
  } else {
    setTimeout(boot, 150);
  }
  setTimeout(boot, 700);
  setTimeout(boot, 1800);

  /* Vigilancia suave: no tocar el DOM si el usuario escribe */
  setInterval(function () {
    if (isTypingInLogin() || loginHasTypedContent()) return;
    patchMostrarLogin();
    patchCerrarSesion();
    if (hasSession()) {
      if (!unlocked) unlockApp();
    } else if (unlocked) {
      lockToLogin("Introduce usuario y contraseña");
    }
  }, 2500);
})();
