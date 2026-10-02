/* RUTALOG mejoras-login-inmediato v1 — pedir login al abrir el link si no hay sesión */
(function () {
  "use strict";
  if (window.__rutalogLoginInmediatoV1) return;
  window.__rutalogLoginInmediatoV1 = true;

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

  function forceLoginUI() {
    if (hasSession()) {
      try {
        document.documentElement.classList.remove("rutalog-need-login", "rutalog-booting");
        document.documentElement.classList.add("rutalog-ready");
      } catch (e) {}
      return false;
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

    if (typeof mostrarLogin === "function") {
      try { mostrarLogin(true); } catch (e) {}
    }
    return true;
  }

  function afterSyncGate() {
    if (hasSession()) return;
    forceLoginUI();
    var err = document.getElementById("loginError");
    var n = 0;
    try {
      if (typeof loadUsers === "function") {
        n = loadUsers().filter(function (u) { return u.activo !== false; }).length;
      }
    } catch (e) {}
    if (err) {
      if (n > 0) {
        err.textContent = "Introduce usuario y contraseña";
        err.classList.add("visible");
      } else {
        err.textContent = "Sincronizando usuarios… si no carga, pulsa Actualizar tras el primer acceso admin.";
        err.classList.add("visible");
      }
    }
  }

  function patchGate() {
    if (typeof window.aplicarGateLoginDesdeSync === "function" && !window.aplicarGateLoginDesdeSync._loginInmediato) {
      var _orig = window.aplicarGateLoginDesdeSync;
      window.aplicarGateLoginDesdeSync = function () {
        try { _orig.apply(this, arguments); } catch (e) { console.warn(e); }
        if (!hasSession()) forceLoginUI();
      };
      window.aplicarGateLoginDesdeSync._loginInmediato = true;
    }
    if (typeof window.requiereLogin === "function" && !window.requiereLogin._loginInmediato) {
      var _req = window.requiereLogin;
      window.requiereLogin = function () {
        if (!hasSession()) return true;
        return _req.apply(this, arguments);
      };
      window.requiereLogin._loginInmediato = true;
    }
  }

  function kickSync() {
    if (hasSession()) return;
    forceLoginUI();
    var err = document.getElementById("loginError");
    if (err) {
      err.textContent = "Sincronizando usuarios desde la nube…";
      err.classList.add("visible");
    }
    if (typeof ghActualizar === "function") {
      Promise.resolve(ghActualizar({ silent: true }))
        .then(function () { afterSyncGate(); })
        .catch(function () { afterSyncGate(); });
    } else {
      afterSyncGate();
    }
  }

  function tick() {
    patchGate();
    if (!hasSession()) forceLoginUI();
  }

  tick();
  setTimeout(tick, 100);
  setTimeout(function () { tick(); kickSync(); }, 700);
  setTimeout(tick, 1500);
  setTimeout(tick, 3000);
  setInterval(function () {
    patchGate();
    if (!hasSession()) forceLoginUI();
  }, 2500);
})();
