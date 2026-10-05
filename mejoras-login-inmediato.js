/* RUTALOG login v7 — gate estricto: sin sesión no se ve la app ni topbar */
(function () {
  "use strict";
  if (window.__rutalogLoginInmediatoV7) return;
  window.__rutalogLoginInmediatoV7 = true;

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
    if (ae.id === "loginUser" || ae.id === "loginPass") return true;
    var card = document.querySelector(".login-card");
    return !!(card && card.contains(ae));
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

  function forceClearLoginFields() {
    try {
      var u = document.getElementById("loginUser");
      var p = document.getElementById("loginPass");
      if (u) { u.blur(); u.value = ""; }
      if (p) { p.blur(); p.value = ""; }
    } catch (e) {}
  }

  function setNeedLogin() {
    try {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-ready", "rutalog-booting");
    } catch (e) {}
  }

  function setReady() {
    try {
      document.documentElement.classList.remove("rutalog-need-login", "rutalog-booting");
      document.documentElement.classList.add("rutalog-ready");
    } catch (e) {}
  }

  function unlockApp() {
    if (!hasSession()) {
      lockToLogin(null);
      return;
    }
    if (unlocked && document.documentElement.classList.contains("rutalog-ready")) return;
    unlocked = true;
    setReady();

    var ov = document.getElementById("loginOverlay");
    if (ov) {
      ov.hidden = true;
      ov.setAttribute("hidden", "");
      ov.style.display = "none";
      ov.style.visibility = "hidden";
      ov.style.pointerEvents = "none";
    }

    ["main", "sidebar"].forEach(function (sel) {
      var n = document.querySelector("." + sel);
      if (n) {
        n.style.visibility = "";
        n.style.opacity = "";
        n.style.pointerEvents = "";
      }
    });
    var top = document.querySelector(".topbar");
    if (top) {
      top.style.visibility = "";
      top.style.opacity = "";
      top.style.pointerEvents = "";
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
    forceClearLoginFields();
    setNeedLogin();
    showOverlayOnly(msg || null, true);
  }

  function showOverlayOnly(msg, forceFocus) {
    if (hasSession()) {
      unlockApp();
      return;
    }
    unlocked = false;
    setNeedLogin();

    var ov = document.getElementById("loginOverlay");
    if (ov) {
      ov.hidden = false;
      ov.removeAttribute("hidden");
      ov.style.display = "flex";
      ov.style.visibility = "visible";
      ov.style.opacity = "1";
      ov.style.pointerEvents = "auto";
      ov.style.zIndex = "99999";
    }

    /* Ocultar chrome explícitamente (refuerzo) */
    document.querySelectorAll(".topbar, .sidebar, .main").forEach(function (n) {
      n.style.visibility = "hidden";
      n.style.opacity = "0";
      n.style.pointerEvents = "none";
    });
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

    if ((forceFocus || !shownOnce) && !isTypingInLogin() && !loginHasTypedContent()) {
      var u = document.getElementById("loginUser");
      if (u) {
        setTimeout(function () {
          try {
            if (!isTypingInLogin()) u.focus();
          } catch (e) {}
        }, 60);
      }
    }
    shownOnce = true;
  }

  function patchMostrarLogin() {
    if (typeof window.mostrarLogin !== "function" || window.mostrarLogin._v7) return;
    window.mostrarLogin = function (show) {
      if (show) {
        if (hasSession()) { unlockApp(); return; }
        if (isTypingInLogin() || loginHasTypedContent()) {
          showOverlayOnly(null, false);
          return;
        }
        showOverlayOnly(null, true);
        return;
      }
      if (hasSession()) unlockApp();
      else showOverlayOnly(null, false);
    };
    window.mostrarLogin._v7 = true;
  }

  function patchIntentarLogin() {
    if (typeof window.intentarLogin !== "function" || window.intentarLogin._v7) return;
    var _orig = window.intentarLogin;
    window.intentarLogin = async function () {
      var r = await _orig.apply(this, arguments);
      if (hasSession()) unlockApp();
      else showOverlayOnly("Usuario o contraseña incorrectos", false);
      return r;
    };
    window.intentarLogin._v7 = true;
  }

  function patchCerrarSesion() {
    if (typeof window.cerrarSesion !== "function" || window.cerrarSesion._v7) return;
    var _orig = window.cerrarSesion;
    window.cerrarSesion = function () {
      unlocked = false;
      shownOnce = false;
      try { _orig.apply(this, arguments); } catch (e) {}
      try { localStorage.removeItem("rutalog_session"); } catch (e2) {}
      forceClearLoginFields();
      setTimeout(function () {
        lockToLogin("Sesión cerrada. Introduce usuario y contraseña");
      }, 40);
    };
    window.cerrarSesion._v7 = true;
  }

  function patchRequiereLogin() {
    /* Siempre exigir login si no hay sesión (ignora modo libre sin usuarios) */
    window.requiereLogin = function () {
      return !hasSession();
    };
    window.requiereLogin._v7 = true;
  }

  function patchReveal() {
    /* Si app.js pone ready sin sesión, lo revertimos */
    if (hasSession()) return;
    setNeedLogin();
  }

  function kickSyncOnce() {
    if (syncStarted || hasSession()) return;
    syncStarted = true;
    if (typeof ghActualizar !== "function") return;
    Promise.resolve(ghActualizar({ silent: true })).then(function () {
      if (hasSession()) unlockApp();
      else if (!isTypingInLogin()) showOverlayOnly(null, false);
    }).catch(function () {});
  }

  function stabilizeLoginInputs() {
    var u = document.getElementById("loginUser");
    var p = document.getElementById("loginPass");
    if (u) { u.setAttribute("autocomplete", "username"); u.setAttribute("spellcheck", "false"); }
    if (p) { p.setAttribute("autocomplete", "current-password"); p.setAttribute("spellcheck", "false"); }
  }

  function boot() {
    stabilizeLoginInputs();
    patchMostrarLogin();
    patchIntentarLogin();
    patchCerrarSesion();
    patchRequiereLogin();
    if (hasSession()) unlockApp();
    else {
      showOverlayOnly(null, !shownOnce);
      patchReveal();
      setTimeout(kickSyncOnce, 500);
    }
  }

  setTimeout(boot, 100);
  setTimeout(boot, 600);
  setTimeout(boot, 1500);
  setTimeout(boot, 3000);

  setInterval(function () {
    if (isTypingInLogin() || loginHasTypedContent()) return;
    if (hasSession()) {
      if (!unlocked) unlockApp();
    } else {
      if (unlocked || document.documentElement.classList.contains("rutalog-ready")) {
        lockToLogin(null);
      } else {
        setNeedLogin();
        var ov = document.getElementById("loginOverlay");
        if (ov && (ov.hidden || ov.style.display === "none")) showOverlayOnly(null, false);
      }
    }
  }, 2000);
})();
