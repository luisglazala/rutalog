/* Gate: con sesión → solo booting (pantalla negra). Sin sesión → need-login. */
(function () {
  try {
    document.documentElement.classList.add("rutalog-booting");
    var hasSession = false;
    try {
      var raw = localStorage.getItem("rutalog_session");
      if (raw) {
        var u = JSON.parse(raw);
        if (u && u.id && u.username) hasSession = true;
      }
    } catch (e) {}
    if (hasSession) {
      document.documentElement.classList.add("rutalog-session-pending");
      document.documentElement.classList.remove("rutalog-need-login");
    } else {
      document.documentElement.classList.add("rutalog-need-login");
      document.documentElement.classList.remove("rutalog-session-pending");
    }
  } catch (e) {
    document.documentElement.classList.add("rutalog-booting");
    document.documentElement.classList.add("rutalog-need-login");
  }
})();
