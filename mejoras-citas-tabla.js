/* RUTALOG mejoras-citas-tabla v2 — pinta de alertas como tabla Excel (estilo Dynamics) */
(function () {
  "use strict";
  if (window.__rutalogCitasTablaV2) return;
  window.__rutalogCitasTablaV2 = true;
  window.__rutalogCitasTablaV1 = true;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }

  function injectCSS() {
    var st = el("rutalog-citas-tabla-css");
    if (!st) {
      st = document.createElement("style");
      st.id = "rutalog-citas-tabla-css";
      document.head.appendChild(st);
    }
    st.textContent = [
      "#citasListEnhanced{display:none!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important}",
      "#citasPasteBox p.cita-paste-title:nth-of-type(2){display:none!important}",
      "#listaCitas{overflow:auto;max-height:min(58vh,560px);border:1px solid #2a2a2a;border-radius:10px;background:#0c0c0c}",
      "#listaCitas .vacio{padding:20px;color:#737373}",
      "#listaCitas table.citas-excel{width:100%;border-collapse:collapse;font-size:13px;min-width:780px}",
      "#listaCitas table.citas-excel thead th{position:sticky;top:0;z-index:2;background:#171717;color:#a3a3a3;text-align:left;padding:11px 14px;font-weight:700;white-space:nowrap;border-bottom:2px solid #333;letter-spacing:.04em;font-size:11px;text-transform:uppercase}",
      "#listaCitas table.citas-excel tbody td{padding:11px 14px;border-bottom:1px solid #1f1f1f;border-right:1px solid #1a1a1a;color:#e5e5e5;vertical-align:middle}",
      "#listaCitas table.citas-excel tbody td:last-child,#listaCitas table.citas-excel thead th:last-child{border-right:none}",
      "#listaCitas table.citas-excel tbody tr:nth-child(even) td{background:#111}",
      "#listaCitas table.citas-excel tbody tr:hover td{background:#1a1a1a}",
      "#listaCitas table.citas-excel .col-zona{color:#a3a3a3;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;width:64px}",
      "#listaCitas table.citas-excel .col-cita{color:#fb923c;font-weight:700;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;white-space:nowrap;background:rgba(234,88,12,.08)}",
      "#listaCitas table.citas-excel .col-cita.futura{color:#fdba74}",
      "#listaCitas table.citas-excel .col-cliente{font-weight:600;color:#f5f5f5;max-width:220px}",
      "#listaCitas table.citas-excel .col-ov{color:#93c5fd;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:nowrap}",
      "#listaCitas table.citas-excel .col-nota{color:#fafafa;font-weight:700;font-size:12.5px;line-height:1.4;word-break:break-word;max-width:340px}",
      "#listaCitas table.citas-excel .del-cita{background:transparent;border:1px solid #333;color:#737373;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px}",
      "#listaCitas table.citas-excel .del-cita:hover{background:#3f1d1d;color:#f87171;border-color:#7f1d1d}"
    ].join("");
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

  function maestroDe(id, nombre) {
    try {
      if (!estado || !estado.maestro) return null;
      if (estado.maestro.get) {
        var m = estado.maestro.get(id) || estado.maestro.get(String(id));
        if (m) return m;
      }
      if (estado.maestro.forEach) {
        var found = null;
        var q = String(nombre || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
        estado.maestro.forEach(function (r) {
          if (found) return;
          if (String(r.id) === String(id) || String(r.idCliente) === String(id)) found = r;
          else if (q && String(r.nombre || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim() === q) found = r;
        });
        return found;
      }
    } catch (e) {}
    return null;
  }

  function rowsFromCitas() {
    if (!window.estado || !(estado.citas instanceof Map)) return [];
    var rows = [];
    var hoy = fechaPrograma();
    estado.citas.forEach(function (v, id) {
      if (String(id).indexOf("n:") === 0) return;
      var m = maestroDe(id, v.nombre);
      var nombre = v.nombre || (m && m.nombre) || "";
      var zona = v.zona || (m && (m.zona || m.ZONA || m.ruta)) || "";
      var ovs = Array.isArray(v.ovs) && v.ovs.length
        ? v.ovs
        : [{ fecha: v.fecha || "", ov: v.ov || "", nota: v.nota || "", citaRaw: v.citaRaw || "" }];
      ovs.forEach(function (o) {
        var f = o.fecha || v.fecha || "";
        rows.push({
          id: id,
          zona: zona,
          cita: o.citaRaw || f || "—",
          fecha: f,
          cliente: nombre || String(id),
          ov: o.ov || v.ov || "",
          nota: o.nota || v.nota || "",
          futura: !!(f && hoy && f > hoy)
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
          '<tr data-id="' + esc(r.id) + '">' +
          '<td class="col-zona">' + esc(r.zona || "—") + "</td>" +
          '<td class="col-cita' + (r.futura ? " futura" : "") + '">' + esc(r.cita) + "</td>" +
          '<td class="col-cliente" title="' + esc(r.cliente) + '">' + esc(r.cliente) + "</td>" +
          '<td class="col-ov">' + esc(r.ov || "—") + "</td>" +
          '<td class="col-nota" title="' + esc(r.nota) + '">' + esc(r.nota || "—") + "</td>" +
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
    if (window.renderCitas && window.renderCitas._tablaExcelV2) return;
    window.renderCitas = function () { renderTablaExcel(); };
    window.renderCitas._tablaExcelV2 = true;
    window.renderCitas._tablaExcel = true;
  }

  function tick() {
    injectCSS();
    hideCitasAplicadas();
    patchRenderCitas();
    renderTablaExcel();
  }

  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(tick, 3000);
  setInterval(function () {
    injectCSS();
    hideCitasAplicadas();
    patchRenderCitas();
  }, 5000);

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "citasBtnApply" || t.id === "citasBtnReplace") {
      setTimeout(renderTablaExcel, 200);
      setTimeout(renderTablaExcel, 600);
    }
  }, true);

  console.info("[RUTALOG] citas-tabla v2 — Excel ZONA/CITA/CLIENTE/OV/NOTA");
})();
