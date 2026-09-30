/* RUTALOG mejoras-citas-ui */
(function () {
  "use strict";
  function el(id) { return document.getElementById(id); }
  function api() { return window.__rutalogCitas || {}; }

  function ensurePasteUI() {
    var page = el("page-citas");
    if (!page || el("citaPasteBox")) return;
    var card = page.querySelector(".card") || page;
    var box = document.createElement("div");
    box.id = "citaPasteBox";
    box.className = "cita-paste-box";
    box.innerHTML =
      '<h4 class="cita-paste-title">Pegar tabla de citas</h4>' +
      '<p class="cita-paste-hint">Copia desde Excel (ZONA · CITA · CLIENTE · ORDEN DE VENTA · NOTA) y pega abajo. No hace falta ID ni maestro: se guarda nombre, OV, fecha y nota. Cada fila aparece individual.</p>' +
      '<textarea id="citaPasteArea" rows="5" placeholder="Pega aquí la tabla (Ctrl+V)…"></textarea>' +
      '<div class="cita-paste-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" id="btnCitaPasteAplicar">Procesar y agregar</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnCitaPasteReemplazar">Reemplazar todas</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="btnCitaPasteLimpiar">Limpiar caja</button>' +
      '<span id="citaPasteStatus" class="cita-paste-status"></span></div>' +
      '<div id="citaPastePreview" class="cita-paste-preview" hidden></div>';
    var first = card.querySelector("h3");
    if (first && first.parentNode === card) card.insertBefore(box, first.nextSibling);
    else card.insertBefore(box, card.firstChild);

    el("btnCitaPasteAplicar").onclick = function () { runPaste(false); };
    el("btnCitaPasteReemplazar").onclick = function () { runPaste(true); };
    el("btnCitaPasteLimpiar").onclick = function () {
      var ta = el("citaPasteArea"); if (ta) ta.value = "";
      var prev = el("citaPastePreview"); if (prev) { prev.hidden = true; prev.innerHTML = ""; }
      var st = el("citaPasteStatus"); if (st) st.textContent = "";
    };
    var ta = el("citaPasteArea");
    if (ta) ta.addEventListener("paste", function () { setTimeout(previewPaste, 50); });
  }

  function previewPaste() {
    var A = api();
    var ta = el("citaPasteArea"), prev = el("citaPastePreview");
    if (!ta || !prev || !A.parsePasteTable) return;
    var parsed = A.parsePasteTable(ta.value);
    if (!parsed.rows.length) { prev.hidden = true; prev.innerHTML = ""; return; }
    prev.hidden = false;
    var esc = A.escapeHtml;
    prev.innerHTML =
      '<div class="cita-paste-sum">' + parsed.rows.length + " filas listas para agregar</div>" +
      '<div class="cita-paste-table-wrap"><table class="cita-paste-table"><thead><tr>' +
      "<th>Cliente</th><th>OV</th><th>Fecha</th><th>Zona</th><th>Nota</th>" +
      "</tr></thead><tbody>" +
      parsed.rows.map(function (r) {
        return "<tr class=\"ok\"><td>" + esc(r.clienteNombre) + "</td>" +
          "<td class=\"mono\">" + esc(r.ov || "—") + "</td>" +
          "<td class=\"mono\">" + esc(r.fecha || "—") + "</td>" +
          "<td>" + esc(r.zona || "") + "</td>" +
          "<td title=\"" + esc(r.nota || "") + "\">" + esc(r.nota || "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function runPaste(replaceAll) {
    var A = api();
    var ta = el("citaPasteArea");
    if (!ta || !ta.value.trim()) { if (A.toastSafe) A.toastSafe("Pega primero la tabla de citas"); return; }
    if (!A.parsePasteTable || !A.applyCitaRows) { if (A.toastSafe) A.toastSafe("Módulo citas no listo"); return; }
    previewPaste();
    var parsed = A.parsePasteTable(ta.value);
    if (!parsed.rows.length) { A.toastSafe("No se leyeron filas"); return; }
    var res = A.applyCitaRows(parsed.rows, replaceAll);
    var st = el("citaPasteStatus");
    if (st) st.textContent = res.ok + " citas agregadas";
    A.toastSafe(res.ok + " cita(s) procesada(s)");
  }

  function ensureCitaAutocomplete() {
    var inp = el("citaCliente");
    if (!inp || inp._citaAcWired) return;
    inp._citaAcWired = true;
    inp.placeholder = "Nombre cliente (opcional)…";
    inp.setAttribute("autocomplete", "off");
  }

  function boot() {
    ensurePasteUI();
    ensureCitaAutocomplete();
    var A = api();
    if (A.renderCitasEnhanced) try { A.renderCitasEnhanced(); } catch (e) {}
  }
  setTimeout(boot, 1000);
  setTimeout(boot, 2500);
  setTimeout(boot, 5000);
  setInterval(function () { ensurePasteUI(); ensureCitaAutocomplete(); }, 3000);
})();
