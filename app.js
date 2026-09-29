/* RUTALOG loader: gate visual + token primero + login + SKU paginado */
(function () {
  /* Ocultar app hasta decidir login/token (evita destello) */
  try { document.documentElement.classList.add("rutalog-booting"); } catch (e) {}
  var css = document.createElement("style");
  css.id = "rutalog-critical-css";
  css.textContent = [
    "html.rutalog-booting .sidebar,html.rutalog-booting .main,html:not(.rutalog-ready) .sidebar,html:not(.rutalog-ready) .main{visibility:hidden!important;opacity:0!important;pointer-events:none!important}",
    "#btnExportSesion,#btnImportSesion,#fileImportSesion{display:none!important}",
    ".login-overlay{position:fixed;inset:0;z-index:99999;background:#0a0a0a;display:flex;align-items:center;justify-content:center;padding:24px}",
    ".login-overlay[hidden]{display:none!important;visibility:hidden!important;pointer-events:none!important}",
    ".login-overlay:not([hidden]){display:flex!important;visibility:visible!important;pointer-events:auto!important}",
    ".login-card{width:min(400px,94vw)!important;max-width:400px!important;background:#171717!important;border:1px solid #1f1f1f!important;border-radius:16px!important;padding:28px 24px!important;box-shadow:0 24px 60px rgba(0,0,0,.45)!important;color:#fafafa!important}",
    ".login-card .logo-row{display:flex!important;align-items:center!important;gap:12px!important;margin-bottom:18px!important}",
    ".login-card .logo-mark{width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;border-radius:10px!important;background:#111!important;border:1px solid #1f1f1f!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;overflow:hidden!important}",
    ".login-card .logo-mark svg{width:28px!important;height:28px!important;display:block!important}",
    ".login-card h2{font-size:18px!important;font-weight:700!important;margin:0 0 4px!important;color:#fafafa!important}",
    ".login-card .sub{font-size:13px!important;color:#a3a3a3!important;margin:0 0 18px!important}",
    ".login-card label{display:block!important;font-size:12px!important;font-weight:600!important;color:#a3a3a3!important;margin-bottom:4px!important}",
    ".login-card .field{margin-bottom:12px!important}",
    ".login-card input[type=text],.login-card input[type=password]{width:100%!important;padding:10px 12px!important;border-radius:8px!important;border:1px solid #1f1f1f!important;background:#0f0f0f!important;color:#fafafa!important;font-family:inherit!important;font-size:14px!important;box-sizing:border-box!important}",
    ".login-card input:focus{outline:none!important;border-color:#f5f5f5!important}",
    ".login-error{display:none;background:#422006;border:1px solid #d97706;color:#fde68a;border-radius:8px;padding:8px 12px;font-size:12.5px;margin-bottom:12px}",
    ".login-error.visible{display:block}",
    ".login-card .btn{width:100%!important;justify-content:center!important;margin-top:4px!important}",
    ".login-card .credit{margin-top:16px;font-size:11px;color:#a3a3a3;text-align:center}",
    ".perm-grid,#cfgPermGrid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))!important;gap:12px!important;margin-top:12px!important}",
    ".perm-item{display:flex!important;align-items:center!important;gap:10px!important;padding:12px 14px!important;border:1px solid #1f1f1f!important;border-radius:10px!important;background:#1f1f1f!important;font-size:13px!important;cursor:pointer!important;min-height:44px!important}",
    ".perm-item input{accent-color:#60a5fa!important;width:16px!important;height:16px!important;margin:0!important}",
    ".audit-modal{width:min(1480px,96vw)!important;max-width:96vw!important;height:min(920px,92vh)!important;max-height:92vh!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}",
    ".audit-body{flex:1!important;overflow:auto!important;min-height:0!important}",
    ".audit-foot{flex-shrink:0!important}",
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
  removeDiaBtns();
  setTimeout(removeDiaBtns, 200);
  setTimeout(removeDiaBtns, 800);

  function revealApp() {
    try {
      document.documentElement.classList.remove("rutalog-booting");
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
      "<p>Primera vez en este equipo. Pega el token de GitHub (PAT) para sincronizar usuarios y catálogos. Luego podrás iniciar sesión.</p>" +
      '<div class="tg-err" id="tgErr"></div>' +
      "<label for=\"tgToken\">Token de GitHub (ghp_…)</label>" +
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
        if (err) { err.textContent = "Indica un token válido (ghp_… o github_pat_…)."; err.classList.add("visible"); }
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
      // Sincronizar usuarios si es posible
      try {
        if (typeof ghActualizar === "function") {
          setTimeout(function () { ghActualizar({ silent: true }); }, 400);
        }
      } catch (e) {}
    };
    document.getElementById("tgSkip").onclick = function () { finish(); };
    if (inp) {
      inp.onkeydown = function (e) {
        if (e.key === "Enter") document.getElementById("tgSave").click();
      };
    }
  }

  function afterAppReady() {
    removeDiaBtns();
    // Parchear mostrarLogin para mantener app oculta mientras hay login
    if (typeof mostrarLogin === "function") {
      var _ml = mostrarLogin;
      window.mostrarLogin = function (show) {
        _ml(show);
        var main = document.querySelector(".main");
        var sb = document.querySelector(".sidebar");
        if (show) {
          if (main) { main.style.visibility = "hidden"; main.style.opacity = "0"; }
          if (sb) { sb.style.visibility = "hidden"; sb.style.opacity = "0"; }
        } else {
          if (main) { main.style.visibility = ""; main.style.opacity = ""; }
          if (sb) { sb.style.visibility = ""; sb.style.opacity = ""; }
          try {
            document.documentElement.classList.remove("rutalog-booting");
            document.documentElement.classList.add("rutalog-ready");
          } catch (e) {}
        }
      };
    }

    function continueBoot() {
      // Dar tiempo a initUsuariosUI del app principal
      setTimeout(function () {
        try {
          if (typeof requiereLogin === "function" && requiereLogin() && typeof usuarioActual === "function" && !usuarioActual()) {
            if (typeof mostrarLogin === "function") mostrarLogin(true);
          } else {
            revealApp();
          }
        } catch (e) {
          revealApp();
        }
        // Si tras sync no hay login visible, revelar
        setTimeout(function () {
          var ov = document.getElementById("loginOverlay");
          var loginOn = ov && !ov.hidden && getComputedStyle(ov).display !== "none";
          if (!loginOn) revealApp();
        }, 900);
      }, 100);
    }

    if (!hasToken()) {
      showTokenGate(continueBoot);
    } else {
      continueBoot();
    }
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

  var APP = "https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js";
  loadScript(APP).then(function () {
    afterAppReady();

    /* Paginación Código SKU */
    var PAGE = 80;
    window._codPage = 0;
    window.renderCodigoTable = function () {
      var tb = document.getElementById("codigoTbody");
      if (!tb || !window.estado || !estado.maestroCodigo) return;
      var q = ((document.getElementById("qCodigo") || {}).value || "").trim().toLowerCase();
      var fil = ((document.getElementById("filCodigoUnd") || {}).value || "");
      var rows = Array.from(estado.maestroCodigo.values());
      if (q) {
        rows = rows.filter(function (r) {
          return String(r.sku).toLowerCase().indexOf(q) !== -1 ||
            String(r.producto || "").toLowerCase().indexOf(q) !== -1;
        });
      }
      if (fil === "1") rows = rows.filter(function (r) { return Number(r.undCaja) === 1; });
      else if (fil === "gt1") rows = rows.filter(function (r) { return Number(r.undCaja) > 1; });
      else if (fil === "blank") rows = rows.filter(function (r) { return r.undCaja == null || !(Number(r.undCaja) > 0); });
      rows.sort(function (a, b) {
        var na = Number(a.sku), nb = Number(b.sku);
        if (isFinite(na) && isFinite(nb)) return na - nb;
        return String(a.sku).localeCompare(String(b.sku));
      });
      var total = rows.length;
      var maxP = Math.max(1, Math.ceil(total / PAGE));
      if (window._codPage >= maxP) window._codPage = maxP - 1;
      if (window._codPage < 0) window._codPage = 0;
      var start = window._codPage * PAGE;
      var slice = rows.slice(start, start + PAGE);
      var esc = function (s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      };
      var badge = document.getElementById("badgeCodigo");
      if (badge) badge.textContent = estado.maestroCodigo.size + " SKU" + (q || fil ? " · " + total + " filtrados" : "");
      var info = document.getElementById("codigoFuenteInfo");
      if (info) {
        var src = estado.maestroCodigoFuente || "";
        var clean = (src === "base" || src === "embebido" || !src) ? "" : (src + " · ");
        info.textContent = clean + total + " visibles · total " + estado.maestroCodigo.size + " SKU";
      }
      if (!slice.length) {
        tb.innerHTML = '<tr><td colspan="6" class="vacio">Sin registros.</td></tr>';
      } else {
        tb.innerHTML = slice.map(function (r) {
          var key = typeof normSkuKey === "function" ? normSkuKey(r.sku) : String(r.sku);
          var upp = (r.undCaja != null && r.cajaPaleta != null && r.undCaja > 0 && r.cajaPaleta > 0)
            ? (r.undCaja * r.cajaPaleta) : (r.undPaleta != null ? r.undPaleta : "—");
          return '<tr data-key="' + esc(key) + '">' +
            '<td class="mono"><input class="ed-cell mono cod-sku" data-f="sku" value="' + esc(r.sku) + '"></td>' +
            '<td><input class="ed-cell cod-prod" data-f="producto" value="' + esc(r.producto) + '"></td>' +
            '<td><input class="ed-cell mono cod-und" data-f="undCaja" type="number" min="0" step="1" value="' + (r.undCaja != null ? r.undCaja : "") + '"></td>' +
            '<td><input class="ed-cell mono cod-cp" data-f="cajaPaleta" type="number" min="0" step="1" value="' + (r.cajaPaleta != null ? r.cajaPaleta : "") + '"></td>' +
            '<td class="mono cod-upp">' + upp + '</td>' +
            '<td><button type="button" class="btn btn-danger btn-sm cod-del" data-key="' + esc(key) + '">✕</button></td></tr>';
        }).join("");
        Array.prototype.forEach.call(tb.querySelectorAll(".ed-cell"), function (inp) {
          inp.onchange = function () {
            var tr = inp.closest("tr");
            var oldKey = tr.dataset.key;
            var rec = estado.maestroCodigo.get(oldKey);
            if (!rec) return;
            var f = inp.dataset.f;
            if (f === "sku") {
              var newSku = String(inp.value || "").trim();
              if (!newSku) { inp.value = rec.sku; return; }
              var newKey = typeof normSkuKey === "function" ? normSkuKey(newSku) : newSku;
              if (newKey !== oldKey && estado.maestroCodigo.has(newKey)) {
                if (typeof toast === "function") toast("Ya existe el SKU " + newSku);
                inp.value = rec.sku; return;
              }
              estado.maestroCodigo.delete(oldKey);
              rec.sku = newSku;
              estado.maestroCodigo.set(newKey, rec);
              tr.dataset.key = newKey;
            } else if (f === "producto") rec.producto = String(inp.value || "").trim();
            else if (f === "undCaja") {
              var v = parseFloat(inp.value);
              rec.undCaja = isFinite(v) && v >= 0 ? v : null;
            } else if (f === "cajaPaleta") {
              var v2 = parseFloat(inp.value);
              rec.cajaPaleta = isFinite(v2) && v2 >= 0 ? v2 : null;
            }
            if (rec.undCaja != null && rec.cajaPaleta != null && rec.undCaja > 0 && rec.cajaPaleta > 0)
              rec.undPaleta = rec.undCaja * rec.cajaPaleta;
            var uppCell = tr.querySelector(".cod-upp");
            if (uppCell) uppCell.textContent = rec.undPaleta != null ? rec.undPaleta : "—";
            if (typeof saveMaestroCodigoLS === "function") saveMaestroCodigoLS();
          };
        });
        Array.prototype.forEach.call(tb.querySelectorAll(".cod-del"), function (btn) {
          btn.onclick = function () {
            var key = btn.dataset.key;
            var rec = estado.maestroCodigo.get(key);
            if (!rec) return;
            if (!confirm("¿Eliminar SKU " + rec.sku + "?")) return;
            estado.maestroCodigo.delete(key);
            if (typeof saveMaestroCodigoLS === "function") saveMaestroCodigoLS();
            renderCodigoTable();
          };
        });
      }
      var pager = document.getElementById("codigoPager");
      if (!pager) {
        pager = document.createElement("div");
        pager.id = "codigoPager";
        pager.className = "codigo-pager";
        var infoEl = document.getElementById("codigoFuenteInfo");
        if (infoEl && infoEl.parentNode) infoEl.parentNode.appendChild(pager);
      }
      if (total <= PAGE) {
        pager.innerHTML = total ? "Mostrando <strong>" + total + "</strong> SKU" : "";
      } else {
        var from = start + 1, to = Math.min(start + PAGE, total);
        pager.innerHTML =
          '<button type="button" class="btn btn-secondary btn-sm" id="codigoPrev"' + (window._codPage === 0 ? " disabled" : "") + '>←</button> ' +
          '<span>Pág. <strong>' + (window._codPage + 1) + '</strong>/' + maxP + ' · ' + from + '–' + to + ' de <strong>' + total + '</strong></span> ' +
          '<button type="button" class="btn btn-secondary btn-sm" id="codigoNext"' + (window._codPage >= maxP - 1 ? " disabled" : "") + '>→</button>';
        var prev = document.getElementById("codigoPrev");
        var next = document.getElementById("codigoNext");
        if (prev) prev.onclick = function () { window._codPage--; renderCodigoTable(); };
        if (next) next.onclick = function () { window._codPage++; renderCodigoTable(); };
      }
    };
  }).catch(function (e) {
    console.error("[RUTALOG]", e);
    try { document.documentElement.classList.add("rutalog-ready"); document.documentElement.classList.remove("rutalog-booting"); } catch (err) {}
  });
})();
