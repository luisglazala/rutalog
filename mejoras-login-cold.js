/* RUTALOG login-cold v3 — apply usuarios con escritura directa a localStorage */
(function () {
  "use strict";
  if (window.__rutalogLoginColdV3) return;
  window.__rutalogLoginColdV3 = true;
  window.__rutalogLoginColdV21 = true;
  window.__rutalogLoginColdV2 = true;
  window.__rutalogLoginColdV1 = true;

  var LS_USERS = "rutalog_usuarios_v2";
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
      if (typeof loadUsers === "function") {
        return loadUsers().filter(function (u) { return u.activo !== false; }).length;
      }
      var raw = localStorage.getItem(LS_USERS);
      if (!raw) return 0;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function normalizeUser(u) {
    if (!u || typeof u !== "object") return null;
    var username = String(u.username || u.user || u.usuario || u.login || u.nombre || "").trim();
    if (!username) return null;
    return {
      id: u.id || ("u_" + Math.random().toString(36).slice(2, 9)),
      username: username,
      nombre: u.nombre || u.name || username,
      passHash: u.passHash || u.hash || u.passwordHash || "",
      rol: u.rol === "admin" ? "admin" : "operador",
      permisos: u.permisos && typeof u.permisos === "object" ? u.permisos : undefined,
      activo: u.activo !== false,
      createdAt: u.createdAt || null
    };
  }

  function applyRemoteUsers(data) {
    if (!data || typeof data !== "object") return 0;
    var list = data.usuarios || data.users || [];
    if (!Array.isArray(list) || !list.length) {
      console.warn("[login-cold] remoto sin array usuarios");
      return 0;
    }
    console.info("[login-cold] raw keys[0]:", list[0] ? Object.keys(list[0]) : []);
    var normalized = [];
    for (var i = 0; i < list.length; i++) {
      var nu = normalizeUser(list[i]);
      if (nu) normalized.push(nu);
    }
    console.info("[login-cold] normalizados:", normalized.length, "de", list.length);
    if (!normalized.length) return 0;

    try {
      window._ghApplyingUsers = true;
      if (typeof saveUsers === "function") {
        saveUsers(normalized);
      }
      localStorage.setItem(LS_USERS, JSON.stringify(normalized));
    } catch (e) {
      console.warn("[login-cold] save", e);
    } finally {
      try { window._ghApplyingUsers = false; } catch (e2) {}
    }

    try {
      if (typeof ghApplyPayload === "function") {
        ghApplyPayload(data, { action: "login-cold" });
      }
    } catch (e) {
      console.warn("[login-cold] ghApplyPayload", e);
    }

    var n = nUsers();
    console.info("[login-cold] tras apply loadUsers:", n, "LS raw len:", (localStorage.getItem(LS_USERS) || "").length);
    return n;
  }

  function pullAndApplyUsers() {
    if (typeof window.ghFetchFile !== "function") {
      if (typeof window.ghActualizar === "function") {
        return window.ghActualizar({ silent: true, force: true, manual: true }).then(function () {
          return nUsers();
        });
      }
      return Promise.reject(new Error("Sync no disponible"));
    }
    window.__rutalogForceFetch = true;
    return window
      .ghFetchFile({ force: true })
      .then(function (remote) {
        window.__rutalogForceFetch = false;
        if (!remote) return 0;
        if (remote.data) {
          var rawU = remote.data.usuarios || remote.data.users || [];
          console.info(
            "[RUTALOG] login-cold · remoto usuarios:",
            Array.isArray(rawU) ? rawU.length : 0,
            "maestro:",
            Array.isArray(remote.data.maestroClientes) ? remote.data.maestroClientes.length : 0,
            "bytes:",
            remote.size || 0
          );
          return applyRemoteUsers(remote.data);
        }
        if (remote.unchanged && typeof window.ghActualizar === "function") {
          return window.ghActualizar({ silent: true, force: true, manual: true }).then(function () {
            return nUsers();
          });
        }
        return 0;
      })
      .catch(function (e) {
        window.__rutalogForceFetch = false;
        throw e;
      });
  }

  function afterUsersOk() {
    setLoginMsg("");
    if (typeof aplicarGateLoginDesdeSync === "function") aplicarGateLoginDesdeSync();
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
      .then(function () {
        pulling = false;
        if (btn) btn.disabled = false;
        if (nUsers() > 0) {
          afterUsersOk();
          console.info("[RUTALOG] login-cold · usuarios locales:", nUsers());
          fn();
        } else {
          setLoginMsg("Se descargó el catálogo pero no se pudieron guardar los usuarios. Revisa consola [login-cold].");
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

  function coldBootPull() {
    if (nUsers() > 0) return;
    if (pulling) return;
    pulling = true;
    setLoginMsg("Sincronizando usuarios desde GitHub…");
    pullAndApplyUsers()
      .then(function () {
        pulling = false;
        if (nUsers() > 0) {
          afterUsersOk();
          console.info("[RUTALOG] login-cold boot · usuarios:", nUsers());
        } else {
          setLoginMsg("Catálogo remoto OK pero usuarios no quedaron en este navegador. Pulsa Entrar para reintentar.");
        }
      })
      .catch(function (e) {
        pulling = false;
        setLoginMsg("Esperando catálogo… " + String((e && e.message) || "").slice(0, 80));
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

  setTimeout(coldBootPull, 1200);
  setTimeout(coldBootPull, 3500);

  console.info("[RUTALOG] login-cold v3 · escritura directa usuarios");
})();
