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
      '<p class="cita-paste-hint">Copia desde Excel (ZONA · CITA · CLIENTE · ORDEN DE VENTA · NOTA) y pega abajo. Se empareja el cliente por nombre con el maestro. Cada OV aparece individual en el listado; la alerta del mapa usa la fecha más próxima del cliente.</p>' +
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
    var okN = parsed.rows.filter(function (r) { return r.matched; }).length;
    var failN = parsed.rows.length - okN;
    var esc = A.escapeHtml;
    prev.innerHTML =
      '<div class="cita-paste-sum">' + parsed.rows.length + " filas · " +
      '<span class="ok">' + okN + " con match</span> · <span class=\"fail\">" + failN + " sin match</span></div>" +
      '<div class="cita-paste-table-wrap"><table class="cita-paste-table"><thead><tr>' +
      "<th>Cliente (tabla)</th><th>Match maestro</th><th>ID</th><th>OV</th><th>Fecha</th><th>Zona</th>" +
      "</tr></thead><tbody>" +
      parsed.rows.map(function (r) {
        return "<tr class=\"" + (r.matched ? "ok" : "fail") + "\"><td>" + esc(r.clienteNombre) + "</td><td>" +
          (r.matched ? esc(r.matchNombre) : "— sin match —") + "</td><td class=\"mono\">" + (r.idCliente || "—") +
          "</td><td class=\"mono\">" + esc(r.ov || "—") + "</td><td class=\"mono\">" + esc(r.fecha || "—") +
          "</td><td>" + esc(r.zona || "") + "</td></tr>";
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
    var res = A.applyCitaRows(parsed.rows.filter(function (r) { return r.matched; }), replaceAll);
    var st = el("citaPasteStatus");
    if (st) st.textContent = res.ok + " citas agregadas" + (res.fail ? " · " + res.fail + " sin match" : "");
    A.toastSafe(res.ok + " cita(s) procesada(s)" + (res.fail ? ", " + res.fail + " sin cliente en maestro" : ""));
  }

  function ensureCitaAutocomplete() {
    var A = api();
    var inp = el("citaCliente");
    if (!inp || inp._citaAcWired) return;
    inp._citaAcWired = true;
    inp.placeholder = "Nombre o ID cliente…";
    inp.setAttribute("autocomplete", "off");
    var box = document.createElement("div");
    box.className = "cita-ac-wrap";
    box.style.cssText = "position:relative;flex:1;min-width:160px;";
    if (inp.parentNode) { inp.parentNode.insertBefore(box, inp); box.appendChild(inp); }
    var drop = document.createElement("div");
    drop.id = "citaAcDrop"; drop.className = "cita-ac-drop"; drop.hidden = true;
    box.appendChild(drop);
    function hideDrop() { drop.hidden = true; drop.innerHTML = ""; }
    function search(q) {
      q = (q || "").trim().toLowerCase();
      if (!q || q.length < 2 || !window.estado || !estado.maestro) return [];
      var hits = [];
      estado.maestro.forEach(function (c) {
        if (hits.length >= 25) return;
        var blob = [c.id, c.nombre, c.ciudad].join(" ").toLowerCase();
        if (blob.indexOf(q) >= 0) hits.push(c);
      });
      return hits;
    }
    var tmr;
    inp.addEventListener("input", function () {
      delete inp.dataset.citaId;
      clearTimeout(tmr);
      var v = inp.value;
      tmr = setTimeout(function () {
        if ((v || "").trim().length < 2) { hideDrop(); return; }
        var hits = search(v), esc = A.escapeHtml || function (s) { return s; };
        var pad = A.pad9Local || function (x) { return x; };
        if (!hits.length) { drop.innerHTML = '<div class="cita-ac-empty">Sin coincidencias</div>'; drop.hidden = false; return; }
        drop.innerHTML = hits.map(function (c) {
          var id = pad(c.id);
          return '<button type="button" class="cita-ac-item" data-id="' + esc(id) + '" data-nombre="' + esc(c.nombre || "") + '">' +
            '<span class="cita-ac-name">' + esc(c.nombre || "—") + '</span>' +
            '<span class="cita-ac-meta mono">' + esc(id) + "</span></button>";
        }).join("");
        drop.hidden = false;
        Array.prototype.forEach.call(drop.querySelectorAll(".cita-ac-item"), function (btn) {
          btn.onclick = function (e) {
            e.preventDefault();
            inp.value = btn.getAttribute("data-nombre") + " (" + btn.getAttribute("data-id") + ")";
            inp.dataset.citaId = btn.getAttribute("data-id");
            hideDrop();
          };
        });
      }, 120);
    });
    document.addEventListener("click", function (e) {
      if (!drop.contains(e.target) && e.target !== inp) hideDrop();
    });
    var btn = el("btnAddCita");
    if (btn && !btn._citaAcHooked) {
      btn._citaAcHooked = true;
      btn.addEventListener("click", function () {
        var raw = (inp.value || "").trim(), id = inp.dataset.citaId || "";
        if (!id) {
          var digits = raw.replace(/\D/g, "");
          if (digits.length >= 5) id = (A.pad9Local || String)(digits);
          else {
            var m = raw.match(/\((\d{5,9})\)\s*$/);
            if (m) id = (A.pad9Local || String)(m[1]);
          }
        }
        if (id) { inp.value = id; inp.dataset.citaId = id; }
      }, true);
    }
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
