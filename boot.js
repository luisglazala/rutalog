/* Gate síncrono: decide login antes del primer paint significativo */
(function () {
  try {
    var hasSession = false;
    try {
      var raw = localStorage.getItem("rutalog_session");
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.id && u.username) hasSession = true;
      }
    } catch (e) {}
    var needLogin = false;
    try {
      var usersRaw = localStorage.getItem("rutalog_usuarios_v2");
      var users = usersRaw ? JSON.parse(usersRaw) : [];
      if (Array.isArray(users) && users.some(function (x) { return x && x.activo !== false; })) {
        needLogin = !hasSession;
      }
    } catch (e) {}
    if (needLogin) {
      document.documentElement.classList.add("rutalog-need-login");
    } else if (hasSession) {
      document.documentElement.classList.add("rutalog-ready");
    } else {
      document.documentElement.classList.add("rutalog-booting");
    }
  } catch (e) {
    document.documentElement.classList.add("rutalog-booting");
  }
})();
