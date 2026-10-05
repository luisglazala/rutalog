/* RUTALOG login v8 — sin flash sesión: si hay localStorage, no mostrar login */
(function () {
  "use strict";
  if (window.__rutalogLoginInmediatoV8) return;
  window.__rutalogLoginInmediatoV8 = true;

  var shownOnce = false;
  var unlocked = false;

  function hasSessionLS() {
    try {
      var raw = localStorage.getItem("rutalog_session");
      if (!raw) return false;
      var s = JSON.parse(raw);
      return !!(s && s.id && s.username);
    } catch (e) {
      return false;
    }
  }

  function hasSession() {
    try {
      if (typeof usuarioActual === "function") {
        var u = usuarioActual();
        if (u && u.id && u.username) return true;
      }
    } catch (e) {}
    return hasSessionLS();
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

  function setBootingOnly() {
    try {
      document.documentElement.classList.add("rutalog-booting", "rutalog-session-pending");
      document.documentElement.classList.remove("rutalog-need-login", "rutalog-ready");
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
      /* sesión local inválida */
      try { localStorage.removeItem("rutalog_session"); } catch (e) {}
      setNeedLogin();
      showOverlayOnly(null, true);
      return;
    }
    if (unlocked && document.documentElement.classList.contains("rutalog-ready")) return;
    unlocked = true;
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

  function showOverlayOnly(msg, forceFocus) {
    /* Si hay sesión en LS, NUNCA mostrar login (evita flash) */
    if (hasSessionLS() || hasSession()) {
      setBootingOnly();
      hideOverlay();
      if (hasSession()) unlockApp();
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
    document.querySelectorAll(".topbar, .sidebar, .main").forEach(function (n) {
      n.style.visibility = "hidden";
      n.style.opacity = "0";
      n.style.pointerEvents = "none";
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
      if (u) setTimeout(function () { try { if (!isTypingInLogin()) u.focus(); } catch (e) {} }, 50);
    }
    shownOnce = true;
  }

  function patchMostrarLogin() {
    if (typeof window.mostrarLogin !== "function" || window.mostrarLogin._v8) return;
    window.mostrarLogin = function (show) {
      if (show) {
        if (hasSessionLS() || hasSession()) {
          hideOverlay();
          if (hasSession()) unlockApp();
          else setBootingOnly();
          return;
        }
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
    window.mostrarLogin._v8 = true;
  }

  function patchIntentarLogin() {
    if (typeof window.intentarLogin !== "function" || window.intentarLogin._v8) return;
    var _orig = window.intentarLogin;
    window.intentarLogin = async function () {
      var r = await _orig.apply(this, arguments);
      if (hasSession()) unlockApp();
      else showOverlayOnly("Usuario o contraseña incorrectos", false);
      return r;
    };
    window.intentarLogin._v8 = true;
  }

  function patchCerrarSesion() {
    if (typeof window.cerrarSesion !== "function" || window.cerrarSesion._v8) return;
    var _orig = window.cerrarSesion;
    window.cerrarSesion = function () {
      unlocked = false;
      shownOnce = false;
      try { _orig.apply(this, arguments); } catch (e) {}
      try { localStorage.removeItem("rutalog_session"); } catch (e2) {}
      setTimeout(function () {
        showOverlayOnly("Sesión cerrada. Introduce usuario y contraseña", true);
      }, 40);
    };
    window.cerrarSesion._v8 = true;
  }

  function boot() {
    patchMostrarLogin();
    patchIntentarLogin();
    patchCerrarSesion();
    window.requiereLogin = function () { return !hasSession(); };

    if (hasSessionLS()) {
      /* Sesión guardada: pantalla negra hasta confirmar, sin login */
      setBootingOnly();
      hideOverlay();
      if (hasSession()) unlockApp();
      else {
        /* core aún no listo: reintentar */
        setTimeout(function () {
          if (hasSession()) unlockApp();
          else if (hasSessionLS()) setBootingOnly();
          else showOverlayOnly(null, true);
        }, 400);
        setTimeout(function () {
          if (hasSession()) unlockApp();
          else if (!hasSessionLS()) showOverlayOnly(null, true);
          else unlockApp(); /* confiar en LS si core no expone usuarioActual */
        }, 1200);
      }
    } else {
      showOverlayOnly(null, !shownOnce);
    }
  }

  setTimeout(boot, 80);
  setTimeout(boot, 500);
  setTimeout(boot, 1200);

  setInterval(function () {
    if (isTypingInLogin() || loginHasTypedContent()) return;
    if (hasSessionLS() || hasSession()) {
      if (!document.documentElement.classList.contains("rutalog-ready")) {
        if (hasSession()) unlockApp();
        else setBootingOnly();
      }
    } else if (document.documentElement.classList.contains("rutalog-ready")) {
      unlocked = false;
      showOverlayOnly(null, false);
    }
  }, 2500);
})();
