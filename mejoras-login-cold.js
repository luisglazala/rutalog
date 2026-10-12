/* RUTALOG login-cold v5 — usuarios aunque localStorage esté al límite */
(function () {
  "use strict";
  if (window.__rutalogLoginColdV5) return;
  window.__rutalogLoginColdV5 = true;
  window.__rutalogLoginColdV4 = true;
  window.__rutalogLoginColdV3 = true;
  window.__rutalogLoginColdV2 = true;
  window.__rutalogLoginColdV1 = true;

  var LS_USERS = "rutalog_usuarios_v2";
  var SS_USERS = "rutalog_usuarios_v2_ss";
  var pulling = false;

  function setLoginMsg(text) {
    var err = document.getElementById("loginError");
    if (!err) return;
    err.textContent = text || "";
    if (text) err.classList.add("visible");
    else err.classList.remove("visible");
  }

  function freeLocalStorageQuota() {
    var victims = [
      "rutalog_maestro_codigo",
      "rutalog_pending_push",
      "rutalog_gh_content_hash",
      "rutalog_maestro_codigo__idb",
      "rutalog_usuarios",
      "rutalog_users",
      "rutalog_usuarios_v1"
    ];
    var freed = 0;
    victims.forEach(function (k) {
      try {
        var v = localStorage.getItem(k);
        if (v) {
          freed += v.length;
          localStorage.removeItem(k);
        }
      } catch (e) {}
    });
    if (freed) console.info("[login-cold] liberados ~" + Math.round(freed / 1024) + " KB de LS");
    return freed;
  }

  function writeUsersArray(arr) {
    var json = JSON.stringify(arr);
    window.__rutalogUsersMem = arr;
    try {
      sessionStorage.setItem(SS_USERS, json);
    } catch (e0) {
      console.warn("[login-cold] sessionStorage usuarios", e0);
    }
    var ok = false;
    try {
      localStorage.setItem(LS_USERS, json);
      ok = localStorage.getItem(LS_USERS) && localStorage.getItem(LS_USERS).length > 2;
    } catch (e) {
      console.warn("[login-cold] LS setItem usuarios falló:", e && e.name, e && e.message);
      freeLocalStorageQuota();
      try {
        localStorage.setItem(LS_USERS, json);
        ok = localStorage.getItem(LS_USERS) && localStorage.getItem(LS_USERS).length > 2;
      } catch (e2) {
        console.warn("[login-cold] LS reintento falló:", e2 && e2.name);
        ok = false;
      }
    }
    if (!ok && typeof window.rutalogStorage === "object" && window.rutalogStorage.safeSetHeavy) {
      try {
        window.rutalogStorage.safeSetHeavy(LS_USERS, json);
        ok = true;
      } catch (e3) {}
    }
    return ok || (arr && arr.length > 0);
  }

  function nUsers() {
    try {
      if (window.__rutalogUsersMem && window.__rutalogUsersMem.length) {
        return window.__rutalogUsersMem.filter(function (u) {
          return u.activo !== false;
        }).length;
      }
      if (typeof loadUsers === "function") {
        var fromFn = loadUsers().filter(function (u) {
          return u.activo !== false;
        }).length;
        if (fromFn > 0) return fromFn;
      }
      var raw = localStorage.getItem(LS_USERS);
      if (!raw) {
        try {
          raw = sessionStorage.getItem(SS_USERS);
        } catch (e) {}
      }
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
      id: u.id || "u_" + Math.random().toString(36).slice(2, 9),
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
    var normalized = [];
    for (var i = 0; i < list.length; i++) {
      var nu = normalizeUser(list[i]);
      if (nu) normalized.push(nu);
    }
    console.info("[login-cold] normalizados:", normalized.length, "de", list.length);
    if (!normalized.length) return 0;

    freeLocalStorageQuota();

    try {
      window._ghApplyingUsers = true;
      writeUsersArray(normalized);
      if (typeof saveUsers === "function") {
        try {
          saveUsers(normalized);
        } catch (eS) {}
      }
    } catch (e) {
      console.warn("[login-cold] save", e);
    } finally {
      try {
        window._ghApplyingUsers = false;
      } catch (e2) {}
    }

    try {
      if (typeof ghApplyPayload === "function") {
        ghApplyPayload(data, { action: "login-cold" });
      }
    } catch (e) {
      console.warn("[login-cold] ghApplyPayload", e);
      try {
        writeUsersArray(normalized);
      } catch (e3) {}
    }

    writeUsersArray(normalized);
    return nUsers();
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
            Array.isArray(remote.data.maestroClientes) ? remote.data.maestroClientes.length : 0
          );
          return applyRemoteUsers(remote.data);
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
    if (nUsers() > 0 || (window.__rutalogUsersMem && window.__rutalogUsersMem.length)) {
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
        if (nUsers() > 0 || (window.__rutalogUsersMem && window.__rutalogUsersMem.length)) {
          afterUsersOk();
          fn();
        } else {
          setLoginMsg(
            'GitHub no tiene usuarios. En consola: await rutalogSeedAdmin("llazala","tu_clave") y luego Entrar.'
          );
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
      var self = this;
      var args = arguments;
      return new Promise(function (resolve) {
        ensureUsersThen(function () {
          Promise.resolve(orig.apply(self, args)).then(resolve).catch(function (e) {
            console.warn("[login-cold] intentarLogin", e);
            resolve(undefined);
          });
        });
      });
    };
    window.intentarLogin._loginCold = true;
    return true;
  }

  function patchLoadUsers() {
    if (typeof window.loadUsers !== "function" || window.loadUsers._loginColdV4) return false;
    var orig = window.loadUsers;
    window.loadUsers = function () {
      try {
        var arr = orig.apply(this, arguments);
        if (Array.isArray(arr) && arr.length) return arr;
      } catch (e) {}
      if (window.__rutalogUsersMem && window.__rutalogUsersMem.length) {
        return window.__rutalogUsersMem.slice();
      }
      try {
        var ss = sessionStorage.getItem(SS_USERS);
        if (ss) {
          var parsed = JSON.parse(ss);
          if (Array.isArray(parsed) && parsed.length) return parsed;
        }
      } catch (e2) {}
      return [];
    };
    window.loadUsers._loginColdV4 = true;
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
        } else {
          setLoginMsg(
            'GitHub sin usuarios. Consola: await rutalogSeedAdmin("llazala","tu_clave")'
          );
        }
      })
      .catch(function (e) {
        pulling = false;
        setLoginMsg("Esperando catálogo… " + String((e && e.message) || "").slice(0, 80));
      });
  }

  function install() {
    patchLoadUsers();
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

  console.info("[RUTALOG] login-cold v5 · seed si GitHub sin usuarios");
})();
