/* RUTALOG login-cold v2 — incógnito/PC nueva: forzar apply de usuarios del remoto */
(function () {
  "use strict";
  if (window.__rutalogLoginColdV2) return;
  window.__rutalogLoginColdV2 = true;
  window.__rutalogLoginColdV1 = true;

  var pulling = false;

  function setLoginMsg(text) {
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

  function applyRemoteUsers(data) {
    if (!data || typeof data !== "object") return 0;
    var list = data.usuarios || data.users || [];
    if (!Array.isArray(list) || !list.length) return 0;
    try {
      if (typeof ghApplyPayload === "function") {
        ghApplyPayload(data, { action: "login-cold" });
      } else if (typeof saveUsers === "function") {
        saveUsers(list);
      }
    } catch (e) {
      console.warn("[login-cold] apply", e);
    }
    return nUsers();
  }

  function pullAndApplyUsers() {
    if (typeof window.ghFetchFile === "function") {
      window.__rutalogForceFetch = true;
      return window
        .ghFetchFile({ force: true })
        .then(function (remote) {
          window.__rutalogForceFetch = false;
          if (!remote) return 0;
          if (remote.unchanged && typeof window.ghActualizar === "function") {
            return window.ghActualizar({ silent: true, force: true, manual: true }).then(function () {
              return nUsers();
            });
          }
          if (remote.data) {
            var n = applyRemoteUsers(remote.data);
            try {
              if (remote.sha) localStorage.setItem("rutalog_gh_sha", remote.sha);
              if (remote.data.updatedAt) localStorage.setItem("rutalog_gh_remote_at", remote.data.updatedAt);
            } catch (e) {}
            return n;
          }
          return 0;
        })
        .catch(function (e) {
          window.__rutalogForceFetch = false;
          throw e;
        });
    }
    if (typeof window.ghActualizar === "function") {
      return window.ghActualizar({ silent: true, force: true, manual: true }).then(function () {
        return nUsers();
      });
    }
    return Promise.reject(new Error("Sync no disponible"));
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
    pullAndApplyUsers()
      .then(function (n) {
        pulling = false;
        if (btn) btn.disabled = false;
        n = nUsers();
        if (n > 0) {
          setLoginMsg("");
          if (typeof aplicarGateLoginDesdeSync === "function") aplicarGateLoginDesdeSync();
          console.info("[RUTALOG] login-cold · usuarios:", n);
          fn();
        } else {
          setLoginMsg("El catálogo remoto no trae usuarios activos. En la PC donde sí entras, abre Configuración → Actualizar ahora para subir usuarios.");
        }
      })
      .catch(function (e) {
        pulling = false;
        if (btn) btn.disabled = false;
        setLoginMsg("No se pudo sincronizar: " + String((e && e.message) || e).slice(0, 100));
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

  function patchActualizar() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._loginColdApply) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      var r = await orig.apply(this, arguments);
      try {
        if (nUsers() === 0 && typeof window.ghFetchFile === "function") {
          window.__rutalogForceFetch = true;
          var remote = await window.ghFetchFile({ force: true });
          window.__rutalogForceFetch = false;
          if (remote && remote.data) applyRemoteUsers(remote.data);
        }
      } catch (e) {
        window.__rutalogForceFetch = false;
        console.warn("[login-cold] post-apply", e);
      }
      return r;
    };
    window.ghActualizar._loginColdApply = true;
    return true;
  }

  function coldBootPull() {
    if (nUsers() > 0) return;
    setLoginMsg("Sincronizando usuarios desde GitHub…");
    if (pulling) return;
    pulling = true;
    pullAndApplyUsers()
      .then(function () {
        pulling = false;
        if (nUsers() > 0) {
          setLoginMsg("");
          if (typeof aplicarGateLoginDesdeSync === "function") aplicarGateLoginDesdeSync();
          console.info("[RUTALOG] login-cold boot · usuarios:", nUsers());
        } else {
          setLoginMsg("Sincronizado, pero aún no hay usuarios locales. Pulsa Entrar para reintentar o Actualizar en otra sesión admin.");
        }
      })
      .catch(function (e) {
        pulling = false;
        setLoginMsg("Esperando catálogo… " + String((e && e.message) || "").slice(0, 80));
      });
  }

  function install() {
    patchIntentarLogin();
    patchActualizar();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 50) clearInterval(t);
  }, 250);

  setTimeout(coldBootPull, 1000);
  setTimeout(coldBootPull, 3000);

  console.info("[RUTALOG] login-cold v2 · apply forzado de usuarios remotos");
})();
