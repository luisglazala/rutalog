/* RUTALOG loader: gate + token + login + correcciones A-E + extras unificados (G) */
(function () {
  try { document.documentElement.classList.add("rutalog-booting"); } catch (e) {}
  var css = document.createElement("style");
  css.id = "rutalog-critical-css";
  css.textContent = [
    "html.rutalog-booting .sidebar,html.rutalog-booting .main,html:not(.rutalog-ready) .sidebar,html:not(.rutalog-ready) .main,html:not(.rutalog-ready) .app{visibility:hidden!important;opacity:0!important;pointer-events:none!important}",
    "html.rutalog-need-login #loginOverlay{display:flex!important;visibility:visible!important;pointer-events:auto!important}",
    "#btnExportSesion,#btnImportSesion,#fileImportSesion{display:none!important}",
    "#rutalogTokenGate{position:fixed;inset:0;z-index:100000;background:#0a0a0a;display:flex;align-items:center;justify-content:center;padding:24px}",
    "#rutalogTokenGate .tg-card{width:min(420px,94vw);background:#171717;border:1px solid #1f1f1f;border-radius:16px;padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,.45);color:#fafafa}",
    "#rutalogTokenGate h2{font-size:18px;font-weight:700;margin:0 0 6px}",
    "#rutalogTokenGate p{font-size:13px;color:#a3a3a3;margin:0 0 16px;line-height:1.45}",
    "#rutalogTokenGate label{display:block;font-size:12px;font-weight:600;color:#a3a3a3;margin-bottom:4px}",
    "#rutalogTokenGate input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #1f1f1f;background:#0f0f0f;color:#fafafa;font-size:14px;box-sizing:border-box;margin-bottom:12px}",
    "#rutalogTokenGate .btn{width:100%;justify-content:center;margin-top:4px}",
    "#rutalogTokenGate .tg-skip{margin-top:10px;background:transparent;border:none;color:#a3a3a3;font-size:12px;cursor:pointer;width:100%;text-align:center}",
    "#rutalogTokenGate .tg-err{display:none;background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:8px;padding:8px 12px;font-size:12.5px;margin-bottom:12px}",
    "#rutalogTokenGate .tg-err.visible{display:block}"
  ].join("\n");
  document.head.appendChild(css);

  function removeDiaBtns() {
    ["btnExportSesion","btnImportSesion","fileImportSesion"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }
  /* G: una sola pasada (sin setTimeout); el HTML ya no debe traer estos botones */
  removeDiaBtns();

  function revealApp() {
    try {
      document.documentElement.classList.remove("rutalog-booting");
      document.documentElement.classList.remove("rutalog-need-login");
      document.documentElement.classList.add("rutalog-ready");
    } catch (e) {}
    var main = document.querySelector(".main");
    var sb = document.querySelector(".sidebar");
    var ov = document.getElementById("loginOverlay");
    var loginOn = ov && !ov.hidden && ov.style.display !== "none";
    if (loginOn) {
      if (main) { main.style.visibility = "hidden"; main.style.opacity = "0"; }
      if (sb) { sb.style.visibility = "hidden"; sb.style.opacity = "0"; }
    } else {
      if (main) { main.style.visibility = ""; main.style.opacity = ""; }
      if (sb) { sb.style.visibility = ""; sb.style.opacity = ""; }
    }
  }

  function hasToken() {
    try {
      if (typeof ghGetToken === "function") return !!ghGetToken();
      return !!(localStorage.getItem("rutalog_gh_token") || "");
    } catch (e) { return false; }
  }

  function showTokenGate(onDone) {
    if (document.getElementById("rutalogTokenGate")) return;
    var gate = document.createElement("div");
    gate.id = "rutalogTokenGate";
    gate.innerHTML =
      '<div class="tg-card">' +
      "<h2>Configurar GitHub</h2>" +
      "<p>Primera vez en este equipo. Pega el token de GitHub (PAT) para sincronizar usuarios y catálogos.</p>" +
      '<div class="tg-err" id="tgErr"></div>' +
      '<label for="tgToken">Token de GitHub (ghp_…)</label>' +
      '<input type="password" id="tgToken" placeholder="ghp_…" autocomplete="off">' +
      '<button type="button" class="btn btn-primary" id="tgSave">Guardar y continuar</button>' +
      '<button type="button" class="tg-skip" id="tgSkip">Continuar sin token (modo local)</button>' +
      "</div>";
    document.body.appendChild(gate);
    var err = document.getElementById("tgErr");
    var inp = document.getElementById("tgToken");
    setTimeout(function () { if (inp) inp.focus(); }, 80);
    function finish() {
      if (gate.parentNode) gate.parentNode.removeChild(gate);
      if (typeof onDone === "function") onDone();
    }
    document.getElementById("tgSave").onclick = function () {
      var v = (inp && inp.value || "").trim();
      if (!v || v.length < 10) {
        if (err) { err.textContent = "Indica un token válido."; err.classList.add("visible"); }
        return;
      }
      try {
        if (typeof ghSetToken === "function") ghSetToken(v);
        else localStorage.setItem("rutalog_gh_token", v);
      } catch (e) {}
      var tokField = document.getElementById("syncToken");
      if (tokField) tokField.value = v;
      if (typeof toast === "function") toast("Token guardado");
      finish();
      try { if (typeof ghActualizar === "function") setTimeout(function () { ghActualizar({ silent: true }); }, 400); } catch (e) {}
    };
    document.getElementById("tgSkip").onclick = function () { finish(); };
    if (inp) inp.onkeydown = function (e) { if (e.key === "Enter") document.getElementById("tgSave").click(); };
  }

  function afterAppReady() {
    removeDiaBtns();
    if (typeof mostrarLogin === "function") {
      var _ml = mostrarLogin;
      window.mostrarLogin = function (show) {
        _ml(show);
        var main = document.querySelector(".main");
        var sb = document.querySelector(".sidebar");
        if (show) {
          try {
            document.documentElement.classList.add("rutalog-need-login");
            document.documentElement.classList.remove("rutalog-ready");
          } catch (e) {}
          if (main) { main.style.visibility = "hidden"; main.style.opacity = "0"; }
          if (sb) { sb.style.visibility = "hidden"; sb.style.opacity = "0"; }
        } else {
          if (main) { main.style.visibility = ""; main.style.opacity = ""; }
          if (sb) { sb.style.visibility = ""; sb.style.opacity = ""; }
          try {
            document.documentElement.classList.remove("rutalog-booting");
            document.documentElement.classList.remove("rutalog-need-login");
            document.documentElement.classList.add("rutalog-ready");
          } catch (e) {}
        }
      };
    }
    function continueBoot() {
      setTimeout(function () {
        try {
          if (typeof requiereLogin === "function" && requiereLogin() && typeof usuarioActual === "function" && !usuarioActual()) {
            if (typeof mostrarLogin === "function") mostrarLogin(true);
          } else revealApp();
        } catch (e) { revealApp(); }
        setTimeout(function () {
          var ov = document.getElementById("loginOverlay");
          var loginOn = ov && !ov.hidden && getComputedStyle(ov).display !== "none";
          if (!loginOn) revealApp();
        }, 900);
      }, 100);
    }
    if (!hasToken()) showTokenGate(continueBoot);
    else continueBoot();
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("fail " + src)); };
      document.head.appendChild(s);
    });
  }

  function loadExtras() {
    /* Cargador único de extras (antes se duplicaban desde el HTML y desde aquí) */
    try {
      function onceScript(flag, src) {
        if (window[flag]) return;
        window[flag] = true;
        var s = document.createElement("script");
        s.src = src;
        document.body.appendChild(s);
      }
      if (!document.getElementById("rutalog-mejoras-v2-css")) {
        var l = document.createElement("link");
        l.id = "rutalog-mejoras-v2-css";
        l.rel = "stylesheet";
        l.href = "./mejoras-v2.css?v=11";
        document.head.appendChild(l);
      }
      onceScript("__rutalogMejorasV2", "./mejoras-v2.js?v=11");
      onceScript("__rutalogMejorasCitas", "./mejoras-citas.js?v=8");
      onceScript("__rutalogMejorasCentros", "./mejoras-centros.js?v=2");
      onceScript("__rutalogMejorasCruzados", "./mejoras-cruzados.js?v=4");
      onceScript("__rutalogMejorasAudit", "./mejoras-audit.js?v=3");
      onceScript("__rutalogCodigoPerf", "./codigo-perf.js?v=1");
    } catch (eM) { console.warn("[RUTALOG] extras", eM); }
  }

  var APP = "https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js";
  loadScript(APP).then(function () {
    afterAppReady();
    return loadScript("./mejoras-correcciones.js?v=1");
  }).then(function () {
    loadExtras();
  }).catch(function (e) {
    console.error("[RUTALOG]", e);
    try {
      document.documentElement.classList.add("rutalog-ready");
      document.documentElement.classList.remove("rutalog-booting");
      document.documentElement.classList.remove("rutalog-need-login");
    } catch (err) {}
    loadExtras();
  });
})();
