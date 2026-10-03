/* RUTALOG mejoras-citas-tabla v1 — pinta de alertas como tabla Excel; sin lista "Citas aplicadas" */
(function () {
  "use strict";
  if (window.__rutalogCitasTablaV1) return;
  window.__rutalogCitasTablaV1 = true;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function injectCSS() {
    if (el("rutalog-citas-tabla-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-citas-tabla-css";
    st.textContent = [
      "#citasListEnhanced { display:none!important; height:0!important; overflow:hidden!important; margin:0!important; padding:0!important; }",
      "#citasPasteBox p.cita-paste-title:nth-of-type(2) { display:none!important; }",
      "#listaCitas { overflow:auto; max-height:min(55vh,520px); border:1px solid #2a2a2a; border-radius:10px; }",
      "#listaCitas .vacio { padding:20px; color:#737373; }",
      "#listaCitas table.citas-excel { width:100%; border-collapse:collapse; font-size:12.5px; }",
      "#listaCitas table.citas-excel thead th {",
      "  position:sticky; top:0; z-index:1;",
      "  background:#4d7c0f; color:#ecfccb;",
      "  text-align:left; padding:10px 12px; font-weight:700;",
      "  white-space:nowrap; border-bottom:2px solid #365314;",
      "  letter-spacing:.02em; font-size:11.5px;",
      "}",
      "#listaCitas table.citas-excel tbody td {",
      "  padding:9px 12px; border-bottom:1px solid #1f1f1f; color:#e5e5e5;",
      "  vertical-align:top; max-width:220px;",
      "}",
      "#listaCitas table.citas-excel tbody tr:hover td { background:#1a1a1a; }",
      "#listaCitas table.citas-excel .mono { font-family:ui-monospace,Menlo,monospace; font-size:12px; color:#86efac; }",
      "#listaCitas table.citas-excel .nota { color:#a3a3a3; font-size:12px; line-height:1.35; word-break:break-word; max-width:280px; }",
      "#listaCitas table.citas-excel .futura { color:#fb923c; font-weight:600; }",
      "#listaCitas table.citas-excel .del-cita {",
      "  background:transparent; border:1px solid #333; color:#f87171;",
      "  border-radius:6px; width:28px; height:28px; cursor:pointer; font-size:14px;",
      "}",
      "#listaCitas table.citas-excel .del-cita:hover { background:#3f1d1d; }"
    ].join("");
    document.head.appendChild(st);
  }

  function hideCitasAplicadas() {
    try {
      var list = el("citasListEnhanced");
      if (list) { list.hidden = true; list.style.display = "none"; }
      var box = el("citasPasteBox");
      if (box) {
        box.querySelectorAll("p.cita-paste-title").forEach(function (p) {
          if (/aplicadas/i.test(p.textContent || "")) p.style.display = "none";
        });
      }
    } catch (e) {}
  }

  function fechaPrograma() {
    try {
      if (window.estado && estado.fechaHoy) return String(estado.fechaHoy).slice(0, 10);
    } catch (e) {}
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function rowsFromCitas() {
    if (!window.estado || !(estado.citas instanceof Map)) return [];
    var rows = [];
    var hoy = fechaPrograma();
    estado.citas.forEach(function (v, id) {
      if (String(id).indexOf("n:") === 0) return;
      var nombre = v.nombre || "";
      try {
        if (!nombre && estado.maestro) {
          if (estado.maestro.get) {
            var m = estado.maestro.get(id);
            if (m) nombre = m.nombre || "";
          }
          if (!nombre && estado.maestro.forEach) {
            estado.maestro.forEach(function (r) {
              if (String(r.id) === String(id) || String(r.idCliente) === String(id)) nombre = r.nombre || nombre;
            });
          }
        }
      } catch (e) {}
      var ovs = Array.isArray(v.ovs) && v.ovs.length ? v.ovs : [{
        fecha: v.fecha || "",
        ov: v.ov || "",
        nota: v.nota || "",
        citaRaw: v.citaRaw || ""
      }];
      ovs.forEach(function (o) {
        var f = o.fecha || v.fecha || "";
        rows.push({
          id: id,
          zona: v.zona || "",
          cita: o.citaRaw || f || "—",
          fecha: f,
          cliente: nombre || String(id),
          ov: o.ov || v.ov || "",
          nota: o.nota || v.nota || "",
          futura: f && hoy && f > hoy
        });
      });
    });
    rows.sort(function (a, b) {
      return String(a.fecha).localeCompare(String(b.fecha)) || String(a.cliente).localeCompare(String(b.cliente));
    });
    return rows;
  }

  function renderTablaExcel() {
    injectCSS();
    hideCitasAplicadas();
    var cont = el("listaCitas");
    if (!cont) return;
    var rows = rowsFromCitas();
    if (!rows.length) {
      cont.innerHTML = '<div class="vacio">Sin fechas de cita todavía. Pega la tabla arriba y pulsa Aplicar, o agrega manualmente.</div>';
      return;
    }
    cont.innerHTML =
      '<table class="citas-excel"><thead><tr>' +
      "<th>ZONA</th><th>CITA</th><th>CLIENTE</th><th>ORDEN DE VENTA</th><th>NOTA</th><th></th>" +
      "</tr></thead><tbody>" +
      rows.map(function (r) {
        return (
          "<tr data-id=\"" + esc(r.id) + "\">" +
          "<td>" + esc(r.zona || "—") + "</td>" +
          '<td class="' + (r.futura ? "futura" : "mono") + '">' + esc(r.cita) + (r.futura ? " · posterior" : "") + "</td>" +
          "<td><span class=\"mono\">" + esc(r.id) + "</span><br>" + esc(r.cliente) + "</td>" +
          "<td class=\"mono\">" + esc(r.ov || "—") + "</td>" +
          '<td class="nota" title="' + esc(r.nota) + '">' + esc(r.nota || "—") + "</td>" +
          '<td><button type="button" class="del-cita" data-id="' + esc(r.id) + '" title="Eliminar">×</button></td>' +
          "</tr>"
        );
      }).join("") +
      "</tbody></table>";
    cont.querySelectorAll(".del-cita").forEach(function (b) {
      b.onclick = function () {
        try {
          if (estado.citas) estado.citas.delete(b.getAttribute("data-id"));
          if (typeof saveCitas === "function") saveCitas();
          else {
            var o = {};
            estado.citas.forEach(function (v, k) { o[k] = v; });
            localStorage.setItem("rutalog_citas", JSON.stringify(o));
          }
          renderTablaExcel();
          if (typeof renderMapas === "function") renderMapas();
        } catch (e) {}
      };
    });
  }

  function patchRenderCitas() {
    if (window.renderCitas && window.renderCitas._tablaExcel) return;
    window.renderCitas = function () { renderTablaExcel(); };
    window.renderCitas._tablaExcel = true;
  }

  function tick() {
    injectCSS();
    hideCitasAplicadas();
    patchRenderCitas();
    renderTablaExcel();
  }

  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  setTimeout(tick, 3500);
  setInterval(function () {
    injectCSS();
    hideCitasAplicadas();
    patchRenderCitas();
  }, 4000);

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "citasBtnApply" || t.id === "citasBtnReplace") {
      setTimeout(renderTablaExcel, 200);
      setTimeout(renderTablaExcel, 600);
    }
  }, true);

  console.info("[RUTALOG] citas-tabla v1 — pinta como Excel");
})();
