/* RUTALOG mejoras-citas loader */
(function () {
  function load(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }
  var v = "?v=4";
  load("./mejoras-citas-core.js" + v).then(function () {
    return load("./mejoras-citas-ui.js" + v);
  }).catch(function (e) { console.warn("[RUTALOG] citas", e); });
})();
