/* RUTALOG loader — carga app original + optimización Código SKU */
(function () {
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
  }
  // App completa desde commit estable (antes de este loader)
  var APP = "https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js";
  var PERF = "./codigo-perf.js";
  loadScript(APP)
    .then(function () { return loadScript(PERF); })
    .catch(function (err) {
      console.error("[RUTALOG]", err);
      // Fallback: intentar app local antigua si existiera en caché
    });
})();
