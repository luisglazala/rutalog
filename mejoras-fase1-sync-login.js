/* RUTALOG fase1-sync-login v1 */
(function () {
  "use strict";
  if (window.__rutalogFase1SyncLogin) return;
  window.__rutalogFase1SyncLogin = true;

  function patchFetchClear() {
    if (typeof window.ghFetchFile !== "function" || window.ghFetchFile._fase1) return false;
    var orig = window.ghFetchFile;
    window.ghFetchFile = async function (opts) {
      try {
        var r = await orig.apply(this, arguments);
        try {
          if (r && r.unchanged && typeof ghClearReadFailed === "function") ghClearReadFailed();
        } catch (e) {}
        return r;
      } catch (e) {
        if (String(e.message || "").indexOf("No existe") >= 0) {
          try { if (typeof ghClearReadFailed === "function") ghClearReadFailed(); } catch (e2) {}
        }
        throw e;
      }
    };
    window.ghFetchFile._fase1 = true;
    return true;
  }

  function patchActualizar404() {
    if (typeof window.ghActualizar !== "function" || window.ghActualizar._fase1) return false;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      opts = opts || {};
      try {
        return await orig.call(this, opts);
      } catch (e) {
        var msg = String(e && e.message || e || "");
        if (msg.indexOf("No existe") >= 0) {
          try { if (typeof ghClearReadFailed === "function") ghClearReadFailed(); } catch (e2) {}
          try {
            if (typeof ghPushWithSha === "function") {
              await ghPushWithSha(null, !!(opts && opts.silent));
              return;
            }
          } catch (e3) { throw e3; }
        }
        throw e;
      }
    };
    window.ghActualizar._fase1 = true;
    return true;
  }

  function patchGate() {
    var fn = window.aplicarGateLoginDesdeSync || (typeof aplicarGateLoginDesdeSync === "function" ? aplicarGateLoginDesdeSync : null);
    if (!fn || fn._fase1) return !!fn;
    var orig = fn;
    var wrapped = function () {
      try {
        var noUsers = typeof loadUsers === "function" && !loadUsers().some(function (u) { return u.activo !== false; });
        var readFailed = typeof ghLastReadFailed === "function" && ghLastReadFailed();
        if (readFailed && noUsers) {
          if (typeof mostrarLogin === "function") mostrarLogin(true);
          var err = document.getElementById("loginError");
          if (err) {
            err.innerHTML = "No se pudo leer el catalogo. <button type=\"button\" id=\"btnRetryCatalogo\" class=\"btn btn-secondary btn-sm\">Reintentar</button>";
            err.classList.add("visible");
            var btn = document.getElementById("btnRetryCatalogo");
            if (btn && !btn._wired) {
              btn._wired = true;
              btn.onclick = async function () {
                err.textContent = "Reintentando...";
                try {
                  if (typeof ghClearReadFailed === "function") ghClearReadFailed();
                  if (typeof ghActualizar === "function") await ghActualizar({ silent: true });
                } catch (e) {}
                wrapped();
              };
            }
          }
          var mainEl = document.querySelector(".main");
          if (mainEl) mainEl.style.visibility = "hidden";
          return;
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    wrapped._fase1 = true;
    window.aplicarGateLoginDesdeSync = wrapped;
    try { aplicarGateLoginDesdeSync = wrapped; } catch (e) {}
    return true;
  }

  var n = 0;
  function tick() {
    n++;
    patchFetchClear();
    patchActualizar404();
    patchGate();
    if (n < 50) setTimeout(tick, n < 12 ? 200 : 800);
  }
  tick();
  console.info("[RUTALOG] fase1-sync-login v1");
})();
