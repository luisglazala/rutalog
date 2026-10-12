/* RUTALOG usuarios-guard v2 — seed local + login sin depender de GitHub vacío */
(function () {
  "use strict";
  if (window.__rutalogUsuariosGuardV2) return;
  window.__rutalogUsuariosGuardV2 = true;
  window.__rutalogUsuariosGuardV1 = true;

  var LOG = "[RUTALOG] usuarios-guard";
  var LS_USERS = "rutalog_usuarios_v2";
  var SS_USERS = "rutalog_usuarios_v2_ss";

  function hashOf(pass) {
    if (typeof hashPassSync === "function") return hashPassSync(pass);
    throw new Error("hashPassSync no listo; espera 2s y reintenta");
  }

  function countUsers() {
    try {
      if (window.__rutalogUsersMem && window.__rutalogUsersMem.length) {
        return window.__rutalogUsersMem.length;
      }
    } catch (e) {}
    try {
      if (typeof loadUsers === "function") {
        var a = loadUsers() || [];
        if (a.length) return a.length;
      }
    } catch (e2) {}
    try {
      var raw = localStorage.getItem(LS_USERS) || sessionStorage.getItem(SS_USERS);
      if (!raw) return 0;
      var p = JSON.parse(raw);
      return Array.isArray(p) ? p.length : 0;
    } catch (e3) {
      return 0;
    }
  }

  function injectUsers(arr) {
    if (!Array.isArray(arr) || !arr.length) return false;
    window.__rutalogUsersMem = arr.slice();
    var json = JSON.stringify(arr);
    try {
      sessionStorage.setItem(SS_USERS, json);
    } catch (e0) {}
    try {
      localStorage.setItem(LS_USERS, json);
    } catch (e1) {
      console.warn(LOG, "LS usuarios falló (cuota?); quedan en memoria y sessionStorage");
    }
    try {
      if (typeof saveUsers === "function") {
        window._ghApplyingUsers = true;
        try {
          saveUsers(arr);
        } finally {
          window._ghApplyingUsers = false;
        }
      }
    } catch (e2) {
      window._ghApplyingUsers = false;
    }
    return true;
  }

  function patchLoadUsers() {
    if (typeof window.loadUsers !== "function" || window.loadUsers._usuariosGuard) return false;
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
          var p = JSON.parse(ss);
          if (Array.isArray(p) && p.length) return p;
        }
      } catch (e2) {}
      return [];
    };
    window.loadUsers._usuariosGuard = true;
    return true;
  }

  async function ensureUsersBeforePush() {
    if (countUsers() > 0) return true;
    try {
      if (typeof ghFetchFile !== "function") return false;
      var remote = await ghFetchFile({ force: true });
      var list = remote && remote.data && (remote.data.usuarios || remote.data.users);
      if (Array.isArray(list) && list.length > 0) {
        injectUsers(list);
        return countUsers() > 0;
      }
    } catch (e) {
      console.warn(LOG, "ensureUsersBeforePush", e);
    }
    return false;
  }

  function patchPush() {
    if (typeof window.ghPushWithSha !== "function" || window.ghPushWithSha._usuariosGuardV2)
      return false;
    var orig = window.ghPushWithSha;
    window.ghPushWithSha = async function (sha, silent) {
      var ok = await ensureUsersBeforePush();
      if (!ok && !window.__rutalogAllowEmptyUsersPush) {
        var msg =
          "No se sube: no hay usuarios. Restaura con: await rutalogSeedAdmin(\"llazala\",\"tu_clave\")";
        console.error(LOG, msg);
        if (!silent && typeof toast === "function") toast(msg);
        throw new Error(msg);
      }
      try {
        return await orig.apply(this, arguments);
      } catch (e) {
        var m = String((e && e.message) || e);
        if (/422|fast forward|not a fast forward/i.test(m)) {
          console.warn(LOG, "422 → reintento");
          try {
            if (typeof ghFetchFile === "function") await ghFetchFile({ force: true });
            return await orig.call(this, null, silent);
          } catch (e2) {
            throw e2;
          }
        }
        throw e;
      }
    };
    window.ghPushWithSha._usuariosGuardV2 = true;
    window.ghPushWithSha._usuariosGuard = true;
    return true;
  }

  window.rutalogSeedAdmin = async function (username, password, opts) {
    opts = opts || {};
    username = String(username || "").trim();
    password = String(password || "");
    if (!username || !password) {
      throw new Error('Uso: await rutalogSeedAdmin("llazala", "tu_clave")');
    }
    var passHash = hashOf(password);
    var users = [];
    try {
      if (typeof loadUsers === "function") users = loadUsers() || [];
    } catch (e) {}
    if (!Array.isArray(users)) users = [];

    var found = null;
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].username || "").toLowerCase() === username.toLowerCase()) {
        found = users[i];
        break;
      }
    }
    if (found) {
      found.passHash = passHash;
      found.activo = true;
      if (opts.rol) found.rol = opts.rol === "operador" ? "operador" : "admin";
    } else {
      users.push({
        id: "u_seed_" + Date.now().toString(36),
        username: username,
        nombre: opts.nombre || username,
        passHash: passHash,
        rol: opts.rol === "operador" ? "operador" : "admin",
        activo: true,
        createdAt: new Date().toISOString()
      });
    }
    injectUsers(users);
    console.info(LOG, "seed local OK · usuarios:", countUsers(), "hash:", passHash.slice(0, 12) + "…");

    var err = document.getElementById("loginError");
    if (err) {
      err.textContent = "Usuario restaurado en este navegador. Pulsa Entrar.";
      err.classList.add("visible");
    }

    try {
      if (typeof ghMarkDirty === "function") ghMarkDirty("seed-admin");
      if (window.rutalogSyncCore && typeof window.rutalogSyncCore.forcePush === "function") {
        await window.rutalogSyncCore.forcePush(true);
        console.info(LOG, "seed subido a GitHub");
        if (typeof toast === "function") toast("Usuario restaurado y subido a GitHub");
      } else if (typeof ghPushWithSha === "function") {
        await ghPushWithSha(null, true);
        console.info(LOG, "seed subido a GitHub");
      }
    } catch (ePush) {
      console.warn(LOG, "seed local OK pero push falló (puedes entrar igual):", ePush && ePush.message);
      if (typeof toast === "function") {
        toast("Usuario listo en este PC. Subida a GitHub falló: " + (ePush && ePush.message ? ePush.message : ePush));
      }
    }
    return countUsers();
  };

  window.rutalogUsersStatus = function () {
    var out = {
      mem: window.__rutalogUsersMem ? window.__rutalogUsersMem.length : 0,
      loadUsers: 0,
      ls: 0,
      names: []
    };
    try {
      out.loadUsers = (typeof loadUsers === "function" ? loadUsers() : []).length;
      var u = typeof loadUsers === "function" ? loadUsers() : [];
      out.names = u.map(function (x) {
        return x.username;
      });
    } catch (e) {}
    try {
      var raw = localStorage.getItem(LS_USERS);
      out.ls = raw ? JSON.parse(raw).length : 0;
    } catch (e2) {}
    console.info(LOG, "status", out);
    return out;
  };

  function install() {
    patchLoadUsers();
    patchPush();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 50) clearInterval(t);
  }, 300);

  console.info(LOG, "v2 · rutalogSeedAdmin(user,pass) · rutalogUsersStatus()");
})();
