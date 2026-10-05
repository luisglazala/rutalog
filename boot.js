/* Gate síncrono: no pintar app hasta que el loader termine (evita parpadeo) */
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
    if (!hasSession) {
      document.documentElement.classList.add("rutalog-need-login");
    }
    /* Nunca agregar rutalog-ready aquí — lo hace app.js al final */
  } catch (e) {
    document.documentElement.classList.add("rutalog-booting");
    document.documentElement.classList.add("rutalog-need-login");
  }
})();
