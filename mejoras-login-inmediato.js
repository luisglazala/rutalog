/* RUTALOG login v8 — sin flash sesión: si hay localStorage, no mostrar login */
(function () {
  "use strict";
  try {
    var _raw = localStorage.getItem("rutalog_session");
    if (_raw) {
      var _u = JSON.parse(_raw);
      if (_u && _u.id && _u.username) {
        document.documentElement.classList.add("rutalog-session-pending", "rutalog-booting");
        document.documentElement.classList.remove("rutalog-need-login");
        var _ov = document.getElementById("loginOverlay");
        if (_ov) { _ov.hidden = true; _ov.style.display = "none"; _ov.style.visibility = "hidden"; }
      }
    }
  } catch (_e) {}

  if (window.__rutalogLoginInmediatoV8) return;
  window.__rutalogLoginInmediatoV8 = true;

  var shownOnce = false;
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

  function clearLoginFields() {
    try {
      var u = document.getElementById("loginUser");
      var p = document.getElementById("loginPass");
      if (u) { u.value = ""; u.defaultValue = ""; u.blur(); }
      if (p) { p.value = ""; p.defaultValue = ""; p.blur(); }
    } catch (e) {}
  }

  function setNeedLogin() {
    try {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-ready", "rutalog-booting", "rutalog-session-pending");
    } catch (e) {}
  }

  function setReady() {
    try {
      /* Rellenar nombre de sesión ANTES de mostrar topbar */
      try {
        var raw = localStorage.getItem("rutalog_session");
        if (raw) {
          var s = JSON.parse(raw);
          var nm = document.getElementById("userChipName");
          var ch = document.getElementById("userChipBar");
          if (nm && s) nm.textContent = s.nombre || s.username || "—";
          if (ch && s && (s.id || s.username)) ch.hidden = false;
        }
      } catch (eN) {}
      document.documentElement.classList.remove("rutalog-need-login", "rutalog-booting", "rutalog-session-pending");
      document.documentElement.classList.add("rutalog-ready");
    } catch (e) {}
  }

  function hideOverlay() {
    var ov = document.getElementById("loginOverlay");
    if (!ov) return;
    ov.hidden = true;
    ov.setAttribute("hidden", "");
    ov.style.display = "none";
    ov.style.visibility = "hidden";
    ov.style.pointerEvents = "none";
  }

  function unlockApp() {
    if (!hasSession()) {
      try { localStorage.removeItem("rutalog_session"); } catch (e) {}
      setNeedLogin();
      showOverlayOnly(null, true);
      return;
    }
    if (unlocked && document.documentElement.classList.contains("rutalog-ready")) return;
    unlocked = true;
    try {
      var _raw = localStorage.getItem("rutalog_session");
      if (_raw) {
        var _u = JSON.parse(_raw);
        if (_u && _u.username) {
          var _nm = document.getElementById("userChipName");
          if (_nm) _nm.textContent = _u.nombre || _u.name || _u.username || "—";
          var _ch = document.getElementById("userChipBar");
          if (_ch) _ch.hidden = false;
        }
      }
    } catch (_e) {}
    setReady();
    hideOverlay();

    document.querySelectorAll(".topbar, .sidebar, .main").forEach(function (n) {
      n.style.visibility = "";
      n.style.opacity = "";
      n.style.pointerEvents = "";
    });
    document.querySelectorAll(".nav button[data-page]").forEach(function (b) {
      b.hidden = false;
    });
    var chip = document.getElementById("userChipBar");
    if (chip) chip.hidden = false;
    if (typeof aplicarPermisosUI === "function") {
      try { aplicarPermisosUI(); } catch (e) {}
    }
  }

  function showOverlayOnly(msg, force) {
    if (hasSession() && !force) {
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
      ov.style.pointerEvents = "auto";
      ov.style.zIndex = "99999";
    }
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

  function lockToLogin(msg) {
    unlocked = false;
    shownOnce = false;
    clearLoginFields();
    showOverlayOnly(msg || "Introduce usuario y contraseña", true);
    setTimeout(clearLoginFields, 50);
    setTimeout(clearLoginFields, 300);
  }

  function patchCerrarSesion() {
    if (typeof window.cerrarSesion !== "function" || window.cerrarSesion._stablePatch) return;
    var _cerrar = window.cerrarSesion;
    window.cerrarSesion = function () {
      clearLoginFields();
      try { _cerrar.apply(this, arguments); } catch (e) { console.warn(e); }
      unlocked = false;
      shownOnce = false;
      clearLoginFields();
      setTimeout(function () {
        lockToLogin("Sesión cerrada. Introduce usuario y contraseña");
        clearLoginFields();
      }, 30);
    };
    window.cerrarSesion._stablePatch = true;
  }

  function patchIntentarLogin() {
    if (typeof window.intentarLogin !== "function" || window.intentarLogin._stablePatch) return;
    var _login = window.intentarLogin;
    window.intentarLogin = function () {
      var r = _login.apply(this, arguments);
      setTimeout(function () { if (hasSession()) unlockApp(); }, 100);
      setTimeout(function () { if (hasSession()) unlockApp(); }, 300);
      return r;
    };
    window.intentarLogin._stablePatch = true;
  }

  function boot() {
    patchCerrarSesion();
    patchIntentarLogin();
    if (hasSession()) unlockApp();
    else showOverlayOnly(null, true);
    if (window.RUTALOG && RUTALOG.tick) {
      RUTALOG.tick.registrar('login:gate', function () {
        patchCerrarSesion();
        if (hasSession()) {
          if (!document.documentElement.classList.contains("rutalog-ready")) unlockApp();
        } else if (document.documentElement.classList.contains("rutalog-ready")) {
          lockToLogin("Introduce usuario y contraseña");
        }
      }, { cada: 1500, vista: 'siempre' });
    } else {
      setInterval(function () {
        patchCerrarSesion();
        if (hasSession()) {
          if (!document.documentElement.classList.contains("rutalog-ready")) unlockApp();
        } else if (document.documentElement.classList.contains("rutalog-ready")) {
          lockToLogin("Introduce usuario y contraseña");
        }
      }, 1500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 200); });
  } else {
    setTimeout(boot, 200);
  }
  setTimeout(boot, 800);
  setTimeout(boot, 2000);
})();
