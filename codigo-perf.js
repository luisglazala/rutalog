/* RUTALOG — Código SKU performance: paginación (evita freeze con 1500+ SKU) */
(function () {
  const PAGE_SIZE = 80;
  let codigoPage = 0;

  function ensurePager() {
    let pager = document.getElementById("codigoPager");
    if (pager) return pager;
    const info = document.getElementById("codigoFuenteInfo");
    pager = document.createElement("div");
    pager.id = "codigoPager";
    pager.className = "codigo-pager";
    if (info && info.parentNode) info.parentNode.insertBefore(pager, info.nextSibling);
    else {
      const page = document.getElementById("page-codigo");
      if (page) page.appendChild(pager);
    }
    return pager;
  }

  window.renderCodigoTable = function renderCodigoTable() {
    const tb = document.getElementById("codigoTbody");
    if (!tb || !window.estado || !estado.maestroCodigo) return;

    const q = (document.getElementById("qCodigo")?.value || "").trim().toLowerCase();
    const fil = document.getElementById("filCodigoUnd")?.value || "";
    const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

    let rows = [...estado.maestroCodigo.values()];
    if (q) {
      rows = rows.filter(r =>
        String(r.sku).toLowerCase().includes(q) ||
        String(r.producto || "").toLowerCase().includes(q)
      );
    }
    if (fil === "1") rows = rows.filter(r => Number(r.undCaja) === 1);
    else if (fil === "gt1") rows = rows.filter(r => Number(r.undCaja) > 1);
    else if (fil === "blank") rows = rows.filter(r => r.undCaja == null || !(Number(r.undCaja) > 0));

    rows.sort((a, b) => {
      const na = Number(a.sku), nb = Number(b.sku);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a.sku).localeCompare(String(b.sku));
    });

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (codigoPage >= totalPages) codigoPage = totalPages - 1;
    if (codigoPage < 0) codigoPage = 0;

    const start = codigoPage * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    const badge = document.getElementById("badgeCodigo");
    if (badge) {
      badge.textContent = estado.maestroCodigo.size + " SKU" +
        (q || fil ? " · " + total + " filtrados" : "");
    }
    const info = document.getElementById("codigoFuenteInfo");
    if (info) {
      const src = estado.maestroCodigoFuente || "";
      const clean = (src === "base" || src === "embebido" || !src) ? "" : (src + " · ");
      info.textContent = clean + total + " visibles · total " + estado.maestroCodigo.size + " SKU";
    }

    if (!pageRows.length) {
      tb.innerHTML = '<tr><td colspan="6" class="vacio">Sin registros. Ajusta el filtro o agrega un SKU.</td></tr>';
    } else {
      tb.innerHTML = pageRows.map(r => {
        const key = typeof normSkuKey === "function" ? normSkuKey(r.sku) : String(r.sku);
        const upp = (r.undCaja != null && r.cajaPaleta != null && r.undCaja > 0 && r.cajaPaleta > 0)
          ? (r.undCaja * r.cajaPaleta) : (r.undPaleta != null ? r.undPaleta : "");
        return `<tr data-key="${esc(key)}">
      <td class="mono"><input class="ed-cell mono cod-sku" data-f="sku" value="${esc(r.sku)}"></td>
      <td><input class="ed-cell cod-prod" data-f="producto" value="${esc(r.producto)}"></td>
      <td><input class="ed-cell mono cod-und" data-f="undCaja" type="number" min="0" step="1" value="${r.undCaja != null ? r.undCaja : ""}"></td>
      <td><input class="ed-cell mono cod-cp" data-f="cajaPaleta" type="number" min="0" step="1" value="${r.cajaPaleta != null ? r.cajaPaleta : ""}"></td>
      <td class="mono cod-upp">${upp !== "" ? upp : "—"}</td>
      <td><button type="button" class="btn btn-danger btn-sm cod-del" data-key="${esc(key)}" title="Eliminar">✕</button></td>
    </tr>`;
      }).join("");

      tb.querySelectorAll(".ed-cell").forEach(inp => {
        inp.onchange = () => {
          const tr = inp.closest("tr");
          const oldKey = tr.dataset.key;
          const rec = estado.maestroCodigo.get(oldKey);
          if (!rec) return;
          const f = inp.dataset.f;
          if (f === "sku") {
            const newSku = String(inp.value || "").trim();
            if (!newSku) { inp.value = rec.sku; return; }
            const newKey = typeof normSkuKey === "function" ? normSkuKey(newSku) : newSku;
            if (newKey !== oldKey && estado.maestroCodigo.has(newKey)) {
              if (typeof toast === "function") toast("Ya existe el SKU " + newSku);
              inp.value = rec.sku;
              return;
            }
            estado.maestroCodigo.delete(oldKey);
            rec.sku = newSku;
            estado.maestroCodigo.set(newKey, rec);
            tr.dataset.key = newKey;
            const del = tr.querySelector(".cod-del");
            if (del) del.dataset.key = newKey;
          } else if (f === "producto") {
            rec.producto = String(inp.value || "").trim();
          } else if (f === "undCaja") {
            const v = parseFloat(inp.value);
            rec.undCaja = Number.isFinite(v) && v >= 0 ? v : null;
          } else if (f === "cajaPaleta") {
            const v = parseFloat(inp.value);
            rec.cajaPaleta = Number.isFinite(v) && v >= 0 ? v : null;
          }
          if (rec.undCaja != null && rec.cajaPaleta != null && rec.undCaja > 0 && rec.cajaPaleta > 0)
            rec.undPaleta = rec.undCaja * rec.cajaPaleta;
          const uppCell = tr.querySelector(".cod-upp");
          if (uppCell) uppCell.textContent = rec.undPaleta != null ? rec.undPaleta : "—";
          if (typeof saveMaestroCodigoLS === "function") saveMaestroCodigoLS();
          estado.maestroCodigoFuente = "editado local (" + estado.maestroCodigo.size + " SKU)";
        };
      });
      tb.querySelectorAll(".cod-del").forEach(btn => {
        btn.onclick = async () => {
          const key = btn.dataset.key;
          const rec = estado.maestroCodigo.get(key);
          if (!rec) return;
          const ok = typeof confirmDialog === "function"
            ? await confirmDialog("¿Eliminar SKU " + rec.sku + " del maestro de código?", { title: "Eliminar", danger: true })
            : confirm("¿Eliminar SKU " + rec.sku + "?");
          if (!ok) return;
          estado.maestroCodigo.delete(key);
          if (typeof saveMaestroCodigoLS === "function") saveMaestroCodigoLS();
          renderCodigoTable();
          if (typeof toast === "function") toast("SKU eliminado");
        };
      });
    }

    const pager = ensurePager();
    if (total <= PAGE_SIZE) {
      pager.innerHTML = total ? `<span>Mostrando <strong>${total}</strong> SKU</span>` : "";
    } else {
      const from = start + 1;
      const to = Math.min(start + PAGE_SIZE, total);
      pager.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="codigoPrev" ${codigoPage === 0 ? "disabled" : ""}>←</button>
        <span>Pág. <strong>${codigoPage + 1}</strong> / ${totalPages} · ${from}–${to} de <strong>${total}</strong></span>
        <button type="button" class="btn btn-secondary btn-sm" id="codigoNext" ${codigoPage >= totalPages - 1 ? "disabled" : ""}>→</button>
      `;
      const prev = document.getElementById("codigoPrev");
      const next = document.getElementById("codigoNext");
      if (prev) prev.onclick = () => { codigoPage--; renderCodigoTable(); };
      if (next) next.onclick = () => { codigoPage++; renderCodigoTable(); };
    }
  };

  function wireFilters() {
    const q = document.getElementById("qCodigo");
    const fil = document.getElementById("filCodigoUnd");
    if (q && !q._codigoPerfWired) {
      q._codigoPerfWired = true;
      q.addEventListener("input", () => { codigoPage = 0; });
    }
    if (fil && !fil._codigoPerfWired) {
      fil._codigoPerfWired = true;
      fil.addEventListener("change", () => { codigoPage = 0; });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireFilters);
  } else {
    wireFilters();
  }
  setTimeout(wireFilters, 500);
})();
