/* app-core-runtime bootstrap — ensambla partes del core */
(function () {
  var PARTS = ['./app-core-runtime.part0.js', './app-core-runtime.part1.js', './app-core-runtime.part2.js', './app-core-runtime.part3.js', './app-core-runtime.part4.js'];
  function loadText(url) {
    return fetch(url, { cache: "force-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.text();
    });
  }
  Promise.all(PARTS.map(loadText))
    .then(function (chunks) {
      var code = chunks.join("");
      var blob = new Blob([code], { type: "text/javascript" });
      var s = document.createElement("script");
      s.src = URL.createObjectURL(blob);
      s.onload = function () {
        try { URL.revokeObjectURL(s.src); } catch (e) {}
      };
      s.onerror = function () {
        console.error("[RUTALOG] core blob failed");
      };
      document.head.appendChild(s);
    })
    .catch(function (e) {
      console.error("[RUTALOG] core parts", e);
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js";
      document.head.appendChild(s);
    });
})();
