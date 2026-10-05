/* RUTALOG — Código SKU performance v5: abrir panel sin tirón (post-refresh) */
(function () {
  "use strict";
  if (window.__rutalogCodigoPerfV5) return;
  window.__rutalogCodigoPerfV5 = true;

  var PAGE_SIZE = 50;
  var codigoPage = 0;
  var _renderTimer = null;
  var _cacheKey = "";
  var _cacheRows = null;

  function ensurePager() {
    var pager = document.getElementById("codigoPager");
    if (pager) return pager;
    var info = document.getElementById("codigoFuenteInfo");
    pager = document.createElement("div");
    pager.id = "codigoPager";
    pager.className = "codigo-pager";
    pager.style.cssText = "display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0;font-size:13px;color:#a3a3a3";
    if (info && info.parentNode) info.parentNode.insertBefore(pager, info.nextSibling);
    else {
      var page = document.getElementById("page-codigo");
      if (page) page.appendChild(pager);
    }
    return pager;
  }

  function showPlaceholder() {
    var tb = document.getElementById("codigoTbody");
    if (!tb) return;
    if (tb.getAttribute("data-cp-ready") === "1" && tb.children.length) return;
    tb.innerHTML = '<tr><td colspan="6" class="vacio" style="opacity:.7">Cargando catálogo SKU…</td></tr>';
  }

  function getFilteredRows() {
    if (!window.estado || !estado.maestroCodigo) return [];
    var qEl = document.getElementById("qCodigo");
    var filEl = document.getElementById("filCodigoUnd");
    var q = (qEl && qEl.value || "").trim().toLowerCase();
    var fil = (filEl && filEl.value) || "";
    var key = estado.maestroCodigo.size + "|" + q + "|" + fil;
    if (_cacheKey === key && _cacheRows) return _cacheRows;

    var rows = Array.from(estado.maestroCodigo.values());
    if (q) {
      rows = rows.filter(function (r) {
        return String(r.sku).toLowerCase().indexOf(q) >= 0 ||
          String(r.producto || "").toLowerCase().indexOf(q) >= 0;
      });
    }
    if (fil === "1") rows = rows.filter(function (r) { return Number(r.undCaja) === 1; });
    else if (fil === "gt1") rows = rows.filter(function (r) { return Number(r.undCaja) > 1; });
    else if (fil === "blank") rows = rows.filter(function (r) { return r.undCaja == null || !(Number(r.undCaja) > 0); });

    rows.sort(function (a, b) {
      var na = Number(a.sku), nb = Number(b.sku);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a.sku).localeCompare(String(b.sku));
    });
    _cacheKey = key;
    _cacheRows = rows;
    return rows;
  }

  function doRender() {
    var tb = document.getElementById("codigoTbody");
    if (!tb || !window.estado || !estado.maestroCodigo) return;

    var esc = function (s) {
      return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    };

    var rows = getFilteredRows();
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    if (codigoPage >= totalPages) codigoPage = totalPages - 1;
    if (codigoPage < 0) codigoPage = 0;

    var start = codigoPage * PAGE_SIZE;
    var pageRows = rows.slice(start, start + PAGE_SIZE);

    var q = (document.getElementById("qCodigo") && document.getElementById("qCodigo").value || "").trim();
    var fil = (document.getElementById("filCodigoUnd") && document.getElementById("filCodigoUnd").value) || "";

    var badge = document.getElementById("badgeCodigo");
    if (badge) {
      badge.textContent = estado.maestroCodigo.size + " SKU" + (q || fil ? " · " + total + " filtrados" : "");
    }
    var info = document.getElementById("codigoFuenteInfo");
    if (info) {
      var src = estado.maestroCodigoFuente || "";
      var clean = (src === "base" || src === "embebido" || !src) ? "" : (src + " · ");
      info.textContent = clean + total + " en filtro · pág. " + (codigoPage + 1) + "/" + totalPages;
    }

    if (!pageRows.length) {
      tb.innerHTML = '<tr><td colspan="6" class="vacio">Sin registros. Ajusta el filtro o agrega un SKU.</td></tr>';
      tb.setAttribute("data-cp-ready", "1");
    } else {
      var html = "";
      for (var i = 0; i < pageRows.length; i++) {
        var r = pageRows[i];
        var key = typeof normSkuKey === "function" ? normSkuKey(r.sku) : String(r.sku);
        var upp = (r.undCaja != null && r.cajaPaleta != null && r.undCaja > 0 && r.cajaPaleta > 0)
          ? (r.undCaja * r.cajaPaleta)
          : (r.undPaleta != null ? r.undPaleta : "");
        html += '<tr data-key="' + esc(key) + '">' +
          '<td class="mono"><input class="ed-cell mono cod-sku" data-f="sku" value="' + esc(r.sku) + '"></td>' +
          '<td><input class="ed-cell cod-prod" data-f="producto" value="' + esc(r.producto) + '"></td>' +
          '<td><input class="ed-cell mono cod-und" data-f="undCaja" type="number" min="0" step="1" value="' + (r.undCaja != null ? r.undCaja : "") + '"></td>' +
          '<td><input class="ed-cell mono cod-cp" data-f="cajaPaleta" type="number" min="0" step="1" value="' + (r.cajaPaleta != null ? r.cajaPaleta : "") + '"></td>' +
          '<td class="mono cod-upp">' + (upp !== "" ? upp : "—") + '</td>' +
          '<td><button type="button" class="btn btn-danger btn-sm cod-del" data-key="' + esc(key) + '" title="Eliminar">✕</button></td>' +
          '</tr>';
      }
      tb.innerHTML = html;
      tb.setAttribute("data-cp-ready", "1");

      tb.querySelectorAll(".ed-cell").forEach(function (inp) {
        inp.onchange = function () {
          _cacheRows = null;
          _cacheKey = "";
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
              inp.value = rec.sku;
              return;
            }
            estado.maestroCodigo.delete(oldKey);
            rec.sku = newSku;
            estado.maestroCodigo.set(newKey, rec);
            tr.dataset.key = newKey;
            var del = tr.querySelector(".cod-del");
            if (del) del.dataset.key = newKey;
          } else if (f === "producto") {
            rec.producto = String(inp.value || "").trim();
          } else if (f === "undCaja") {
            var v = parseFloat(inp.value);
            rec.undCaja = Number.isFinite(v) && v >= 0 ? v : null;
          } else if (f === "cajaPaleta") {
            var v2 = parseFloat(inp.value);
            rec.cajaPaleta = Number.isFinite(v2) && v2 >= 0 ? v2 : null;
          }
          if (rec.undCaja != null && rec.cajaPaleta != null && rec.undCaja > 0 && rec.cajaPaleta > 0)
            rec.undPaleta = rec.undCaja * rec.cajaPaleta;
          var uppCell = tr.querySelector(".cod-upp");
          if (uppCell) uppCell.textContent = rec.undPaleta != null ? rec.undPaleta : "—";
          if (typeof saveMaestroCodigoLS === "function") saveMaestroCodigoLS();
          estado.maestroCodigoFuente = "editado local (" + estado.maestroCodigo.size + " SKU)";
        };
      });
      tb.querySelectorAll(".cod-del").forEach(function (btn) {
        btn.onclick = async function () {
          _cacheRows = null;
          _cacheKey = "";
          var key = btn.dataset.key;
          var rec = estado.maestroCodigo.get(key);
          if (!rec) return;
          var ok = typeof confirmDialog === "function"
            ? await confirmDialog("¿Eliminar SKU " + rec.sku + " del maestro de código?", { title: "Eliminar", danger: true })
            : confirm("¿Eliminar SKU " + rec.sku + "?");
          if (!ok) return;
          estado.maestroCodigo.delete(key);
          if (typeof saveMaestroCodigoLS === "function") saveMaestroCodigoLS();
          window.renderCodigoTable();
          if (typeof toast === "function") toast("SKU eliminado");
        };
      });
    }

    var pager = ensurePager();
    if (total <= PAGE_SIZE) {
      pager.innerHTML = total ? "<span>Mostrando <strong>" + total + "</strong> SKU</span>" : "";
    } else {
      var from = start + 1;
      var to = Math.min(start + PAGE_SIZE, total);
      pager.innerHTML =
        '<button type="button" class="btn btn-secondary btn-sm" id="codigoPrev"' + (codigoPage === 0 ? " disabled" : "") + ">←</button>" +
        "<span>Pág. <strong>" + (codigoPage + 1) + "</strong> / " + totalPages + " · " + from + "–" + to + " de <strong>" + total + "</strong></span>" +
        '<button type="button" class="btn btn-secondary btn-sm" id="codigoNext"' + (codigoPage >= totalPages - 1 ? " disabled" : "") + ">→</button>";
      var prev = document.getElementById("codigoPrev");
      var next = document.getElementById("codigoNext");
      if (prev) prev.onclick = function () { codigoPage--; window.renderCodigoTable(); };
      if (next) next.onclick = function () { codigoPage++; window.renderCodigoTable(); };
    }
  }

  function installRender() {
    window.renderCodigoTable = function renderCodigoTable() {
      if (_renderTimer) cancelAnimationFrame(_renderTimer);
      /* Dos frames: 1) panel visible + placeholder, 2) pintar filas */
      showPlaceholder();
      _renderTimer = requestAnimationFrame(function () {
        _renderTimer = requestAnimationFrame(function () {
          _renderTimer = null;
          try { doRender(); } catch (e) { console.warn("[codigo-perf]", e); }
        });
      });
    };
  }

  function wireFilters() {
    var q = document.getElementById("qCodigo");
    var fil = document.getElementById("filCodigoUnd");
    if (q && !q._codigoPerfWired) {
      q._codigoPerfWired = true;
      q.addEventListener("input", function () {
        codigoPage = 0;
        _cacheRows = null;
        _cacheKey = "";
      });
    }
    if (fil && !fil._codigoPerfWired) {
      fil._codigoPerfWired = true;
      fil.addEventListener("change", function () {
        codigoPage = 0;
        _cacheRows = null;
        _cacheKey = "";
      });
    }
  }

  function patchGo() {
    if (typeof window.go !== "function") return;
    if (window.go._codigoPerfV5) return;
    var _go = window.go;
    window.go = function (page) {
      /* Al ir a código: mostrar página YA, tabla después */
      if (page === "codigo") showPlaceholder();
      var r = _go.apply(this, arguments);
      if (page === "codigo") {
        installRender();
        requestAnimationFrame(function () {
          try { window.renderCodigoTable(); } catch (e) {}
        });
      }
      return r;
    };
    window.go._codigoPerfV5 = true;
  }

  function boot() {
    installRender();
    wireFilters();
    patchGo();
  }

  boot();
  setTimeout(boot, 100);
  setTimeout(boot, 400);
  setTimeout(boot, 1200);
  setTimeout(boot, 3000);

  /* Precarga ligera del listado cuando el maestro ya está en memoria (sin pintar inputs) */
  setTimeout(function () {
    try {
      if (window.estado && estado.maestroCodigo && estado.maestroCodigo.size) {
        getFilteredRows();
      }
    } catch (e) {}
  }, 2000);
})();
