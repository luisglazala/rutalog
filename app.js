/* RUTALOG loader + CSS crítico + Código SKU paginado */
(function () {
  /* CSS crítico: login, módulos, confirm, auditoría (no depende del cache de Pages) */
  var css = document.createElement("style");
  css.id = "rutalog-critical-css";
  css.textContent = [
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
    ".perm-item{display:flex!important;align-items:center!important;gap:10px!important;padding:12px 14px!important;border:1px solid #1f1f1f!important;border-radius:10px!important;background:#1f1f1f!important;font-size:13px!important;cursor:pointer!important;user-select:none!important;min-height:44px!important}",
    ".perm-item:hover{border-color:#525252!important;background:#262626!important}",
    ".perm-item input{accent-color:#60a5fa!important;width:16px!important;height:16px!important;flex-shrink:0!important;margin:0!important}",
    ".confirm-overlay{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px}",
    ".confirm-overlay[hidden]{display:none!important}",
    ".confirm-modal{background:#171717;border:1px solid #1f1f1f;border-radius:14px;width:min(400px,94vw);box-shadow:0 20px 50px rgba(0,0,0,.4);color:#fafafa}",
    ".confirm-modal .body{padding:18px 20px}",
    ".confirm-modal h2{font-size:15px;font-weight:700;margin:0 0 8px}",
    ".confirm-modal .msg{font-size:13.5px;color:#a3a3a3;margin:0;line-height:1.45}",
    ".confirm-modal .foot{padding:12px 16px;border-top:1px solid #1f1f1f;display:flex;gap:8px;justify-content:flex-end}",
    ".audit-overlay{position:fixed!important;inset:0!important;z-index:8000!important;background:rgba(15,23,42,.55)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important}",
    ".audit-overlay[hidden]{display:none!important}",
    ".audit-modal{width:min(1480px,96vw)!important;max-width:96vw!important;height:min(920px,92vh)!important;max-height:92vh!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;background:#171717!important;border:1px solid #1f1f1f!important;border-radius:14px!important;box-shadow:0 24px 60px rgba(0,0,0,.4)!important;color:#fafafa!important}",
    ".audit-head{padding:14px 18px!important;border-bottom:1px solid #1f1f1f!important;display:flex!important;align-items:flex-start!important;gap:12px!important;flex-shrink:0!important}",
    ".audit-body{flex:1!important;overflow:auto!important;min-height:0!important}",
    ".audit-foot{padding:12px 18px!important;border-top:1px solid #1f1f1f!important;background:#1f1f1f!important;display:flex!important;align-items:center!important;gap:14px!important;flex-wrap:wrap!important;flex-shrink:0!important}",
    ".audit-foot .spacer{flex:1!important}",
    ".audit-table{width:100%!important;border-collapse:collapse!important;font-size:12.5px!important}",
    ".audit-table th{position:sticky!important;top:0!important;background:#262626!important;padding:9px 10px!important;text-align:left!important;white-space:nowrap!important;z-index:1!important}",
    ".audit-table td{padding:7px 10px!important;border-bottom:1px solid #1f1f1f!important;white-space:nowrap!important}",
    ".codigo-pager{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:#a3a3a3}",
    ".codigo-pager .btn{min-width:36px}",
    ".codigo-pager strong{color:#fafafa}"
  ].join("\n");
  document.head.appendChild(css);

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
        tb.innerHTML = '<tr><td colspan="6" class="vacio">Sin registros. Ajusta el filtro o agrega un SKU.</td></tr>';
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
            '<td><button type="button" class="btn btn-danger btn-sm cod-del" data-key="' + esc(key) + '" title="Eliminar">✕</button></td></tr>';
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
            if (typeof toast === "function") toast("SKU eliminado");
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
        else {
          var pg = document.getElementById("page-codigo");
          if (pg) pg.appendChild(pager);
        }
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
    setTimeout(function () {
      var qEl = document.getElementById("qCodigo");
      var filEl = document.getElementById("filCodigoUnd");
      if (qEl && !qEl._codWired) {
        qEl._codWired = true;
        qEl.addEventListener("input", function () { window._codPage = 0; });
      }
      if (filEl && !filEl._codWired) {
        filEl._codWired = true;
        filEl.addEventListener("change", function () { window._codPage = 0; });
      }
    }, 400);
  }).catch(function (e) { console.error("[RUTALOG]", e); });
})();
