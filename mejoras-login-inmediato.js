/* RUTALOG mejoras-login-inmediato v3 — login al abrir + liberar UI al entrar */
(function () {
  "use strict";
  if (window.__rutalogLoginInmediatoV3) return;
  window.__rutalogLoginInmediatoV3 = true;

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

  /** Quitar bloqueo de login y mostrar la app */
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

  function showOverlayOnly(msg) {
    if (unlocked || hasSession()) {
      unlockApp();
      return;
    }

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
        if (unlocked || hasSession()) {
          unlockApp();
          return;
        }
        var ov = document.getElementById("loginOverlay");
        if (!ov) return _orig.apply(this, arguments);
        ov.hidden = false;
        ov.removeAttribute("hidden");
        ov.style.display = "flex";
        // NO vaciar loginUser / loginPass
        if (!isTypingInLogin()) {
          var u = document.getElementById("loginUser");
          setTimeout(function () {
            if (u && !isTypingInLogin()) try { u.focus(); } catch (e) {}
          }, 50);
        }
        return;
      }
      // Cerrar login → liberar app
      unlockApp();
      try {
        return _orig.apply(this, arguments);
      } catch (e) {}
    };
    window.mostrarLogin._stablePatch = true;
  }

  function patchIntentarLogin() {
    if (typeof window.intentarLogin !== "function" || window.intentarLogin._stablePatch) return;
    var _login = window.intentarLogin;
    window.intentarLogin = async function () {
      var r = await _login.apply(this, arguments);
      // Si quedó sesión, liberar UI (aunque el core falle en CSS)
      setTimeout(function () {
        if (hasSession()) unlockApp();
      }, 50);
      setTimeout(function () {
        if (hasSession()) unlockApp();
      }, 300);
      return r;
    };
    window.intentarLogin._stablePatch = true;
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
        if (hasSession()) {
          unlockApp();
          return;
        }
        var n = 0;
        try {
          if (typeof loadUsers === "function") {
            n = loadUsers().filter(function (u) { return u.activo !== false; }).length;
          }
        } catch (e) {}
        showOverlayOnly(
          n > 0
            ? "Introduce usuario y contraseña"
            : "Usuarios no cargados aún. Espera un momento o recarga."
        );
      })
      .catch(function () {
        showOverlayOnly(
          "No se pudo sincronizar. Si ya hay usuarios en este equipo, prueba de nuevo."
        );
      });
  }

  function boot() {
    patchMostrarLogin();
    patchIntentarLogin();
    patchGate();
    if (hasSession()) {
      unlockApp();
      return;
    }
    showOverlayOnly(null);
  }

  boot();

  var tries = 0;
  var t = setInterval(function () {
    tries++;
    patchMostrarLogin();
    patchIntentarLogin();
    patchGate();
    if (hasSession()) {
      unlockApp();
      clearInterval(t);
      return;
    }
    if (document.getElementById("loginOverlay")) {
      showOverlayOnly(null);
      if (!syncStarted) kickSyncOnce();
      if (shownOnce && tries > 12) clearInterval(t);
    }
    if (tries > 50) clearInterval(t);
  }, 300);

  setTimeout(kickSyncOnce, 900);

  // Por si el usuario entra y el overlay sigue bloqueado por CSS
  setInterval(function () {
    if (hasSession() && !unlocked) unlockApp();
  }, 1000);
})();
