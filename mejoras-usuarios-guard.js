/* RUTALOG usuarios-guard v1 — no subir data.json sin usuarios; seed de emergencia */
(function () {
  "use strict";
  if (window.__rutalogUsuariosGuardV1) return;
  window.__rutalogUsuariosGuardV1 = true;

  var LOG = "[RUTALOG] usuarios-guard";
  var LS_USERS = "rutalog_usuarios_v2";

  function countUsers() {
    try {
      if (typeof loadUsers === "function") return (loadUsers() || []).length;
    } catch (e) {}
    try {
      var raw = localStorage.getItem(LS_USERS);
      if (!raw) return 0;
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a.length : 0;
    } catch (e2) {
      return 0;
    }
  }

  function injectUsers(arr) {
    if (!Array.isArray(arr) || !arr.length) return false;
    try {
      window.__rutalogUsersMem = arr;
      localStorage.setItem(LS_USERS, JSON.stringify(arr));
    } catch (e) {
      try {
        sessionStorage.setItem("rutalog_usuarios_v2_ss", JSON.stringify(arr));
      } catch (e2) {}
    }
    try {
      if (typeof saveUsers === "function") {
        window._ghApplyingUsers = true;
        saveUsers(arr);
        window._ghApplyingUsers = false;
      }
    } catch (e3) {
      window._ghApplyingUsers = false;
    }
    return true;
  }

  async function ensureUsersBeforePush() {
    if (countUsers() > 0) return true;
    console.warn(LOG, "local sin usuarios → intentando recuperar del remoto");
    try {
      if (typeof ghFetchFile !== "function") return false;
      var remote = await ghFetchFile({ force: true });
      var list =
        remote && remote.data && (remote.data.usuarios || remote.data.users);
      if (Array.isArray(list) && list.length > 0) {
        injectUsers(list);
        console.info(LOG, "recuperados del remoto:", list.length);
        return countUsers() > 0;
      }
      console.warn(LOG, "remoto también sin usuarios");
    } catch (e) {
      console.warn(LOG, "fetch para usuarios", e);
    }
    return false;
  }

  function patchPush() {
    if (typeof window.ghPushWithSha !== "function" || window.ghPushWithSha._usuariosGuard)
      return false;
    var orig = window.ghPushWithSha;
    window.ghPushWithSha = async function (sha, silent) {
      var ok = await ensureUsersBeforePush();
      if (!ok && !window.__rutalogAllowEmptyUsersPush) {
        var msg =
          "Escritura bloqueada: no hay usuarios locales ni en GitHub. Restaura con rutalogSeedAdmin(\"usuario\",\"clave\") y vuelve a subir.";
        console.error(LOG, msg);
        if (!silent && typeof toast === "function") toast(msg);
        throw new Error(msg);
      }
      try {
        return await orig.apply(this, arguments);
      } catch (e) {
        var m = String((e && e.message) || e);
        if (/422|fast forward|not a fast forward/i.test(m)) {
          console.warn(LOG, "422 fast-forward → reintento con HEAD fresco");
          try {
            if (typeof ghFetchFile === "function") {
              await ghFetchFile({ force: true });
            }
            return await orig.call(this, null, silent);
          } catch (e2) {
            throw e2;
          }
        }
        throw e;
      }
    };
    window.ghPushWithSha._usuariosGuard = true;
    return true;
  }

  window.rutalogSeedAdmin = async function (username, password, opts) {
    opts = opts || {};
    username = String(username || "").trim();
    if (!username || !password) {
      throw new Error("Uso: rutalogSeedAdmin(\"usuario\", \"clave\")");
    }
    if (typeof hashPassSync !== "function") {
      throw new Error("hashPassSync no disponible");
    }
    var passHash = hashPassSync(password);
    var users = [];
    try {
      if (typeof loadUsers === "function") users = loadUsers() || [];
    } catch (e) {}
    var found = null;
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].username).toLowerCase() === username.toLowerCase()) {
        found = users[i];
        break;
      }
    }
    if (found) {
      found.passHash = passHash;
      found.activo = true;
      found.rol = opts.rol === "operador" ? "operador" : "admin";
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
    window.__rutalogAllowEmptyUsersPush = false;
    try {
      if (typeof ghMarkDirty === "function") ghMarkDirty("seed-admin");
    } catch (e) {}
    if (typeof window.rutalogSyncCore === "object" && window.rutalogSyncCore.forcePush) {
      await window.rutalogSyncCore.forcePush(false);
    } else if (typeof ghPushWithSha === "function") {
      await ghPushWithSha(null, false);
    }
    console.info(LOG, "seed OK · usuarios:", countUsers());
    if (typeof toast === "function") toast("Usuario restaurado y subido a GitHub");
    return countUsers();
  };

  function install() {
    patchPush();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 400);

  console.info(LOG, "v1 · no push sin usuarios · rutalogSeedAdmin(user, pass)");
})();
