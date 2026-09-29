/* RUTALOG loader + Código SKU paginado */
(function () {
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
    // Reset página al filtrar
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
