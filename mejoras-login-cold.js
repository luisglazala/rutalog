/* RUTALOG login-cold v1 — en PC nueva / incógnito: bajar usuarios de GitHub antes de fallar el login */
(function () {
  "use strict";
  if (window.__rutalogLoginColdV1) return;
  window.__rutalogLoginColdV1 = true;

  var pulling = false;

  function setLoginMsg(text, isError) {
    var err = document.getElementById("loginError");
    if (!err) return;
    err.textContent = text || "";
    if (text) err.classList.add("visible");
    else err.classList.remove("visible");
  }

  function nUsers() {
    try {
      if (typeof loadUsers !== "function") return 0;
      return loadUsers().filter(function (u) { return u.activo !== false; }).length;
    } catch (e) {
      return 0;
    }
  }

  function pullUsers() {
    if (typeof window.ghActualizar !== "function") {
      return Promise.reject(new Error("Sync no disponible"));
    }
    return window.ghActualizar({ silent: true, force: true, manual: true });
  }

  function ensureUsersThen(fn) {
    if (nUsers() > 0) {
      fn();
      return;
    }
    if (pulling) return;
    pulling = true;
    setLoginMsg("Sincronizando usuarios desde GitHub…");
    var btn = document.getElementById("btnLogin");
    if (btn) btn.disabled = true;
    pullUsers()
      .then(function () {
        pulling = false;
        if (btn) btn.disabled = false;
        var n = nUsers();
        if (n > 0) {
          setLoginMsg("");
          if (typeof aplicarGateLoginDesdeSync === "function") aplicarGateLoginDesdeSync();
          fn();
        } else {
          setLoginMsg("Aún no hay usuarios en GitHub. Espera unos segundos y reintenta, o crea uno en otra PC ya sincronizada.");
        }
      })
      .catch(function (e) {
        pulling = false;
        if (btn) btn.disabled = false;
        var msg = (e && e.message) || String(e);
        setLoginMsg("No se pudo sincronizar: " + msg.slice(0, 100));
        console.warn("[login-cold]", e);
      });
  }

  function patchIntentarLogin() {
    if (typeof window.intentarLogin !== "function" || window.intentarLogin._loginCold) return false;
    var orig = window.intentarLogin;
    window.intentarLogin = async function () {
      if (nUsers() > 0) return orig.apply(this, arguments);
      return new Promise(function (resolve) {
        ensureUsersThen(function () {
          Promise.resolve(orig.apply(window, arguments)).then(resolve, resolve);
        });
      });
    };
    window.intentarLogin._loginCold = true;
    return true;
  }

  function coldBootPull() {
    if (nUsers() > 0) return;
    if (typeof window.ghGetToken === "function" && !window.ghGetToken()) return;
    setLoginMsg("Sincronizando usuarios desde GitHub…");
    pulling = true;
    pullUsers()
      .then(function () {
        pulling = false;
        if (nUsers() > 0) {
          setLoginMsg("");
          if (typeof aplicarGateLoginDesdeSync === "function") aplicarGateLoginDesdeSync();
          console.info("[RUTALOG] login-cold · usuarios bajados:", nUsers());
        } else {
          setLoginMsg("Sincronizado, pero el catálogo no trae usuarios activos.");
        }
      })
      .catch(function (e) {
        pulling = false;
        setLoginMsg("Esperando catálogo… " + (((e && e.message) || "").slice(0, 80)));
        console.warn("[login-cold] boot", e);
      });
  }

  function install() {
    patchIntentarLogin();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 250);

  setTimeout(coldBootPull, 900);
  setTimeout(coldBootPull, 2500);

  console.info("[RUTALOG] login-cold v1 · pull en incógnito / PC nueva");
})();
