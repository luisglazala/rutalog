/* RUTALOG maestro-export v1 — descargar maestro de clientes a Excel */
(function () {
  "use strict";
  if (window.__rutalogMaestroExportV1) return;
  window.__rutalogMaestroExportV1 = true;

  var LOG = "[RUTALOG] maestro-export";

  function exportarMaestroClientes() {
    if (typeof XLSX === "undefined") {
      if (typeof toast === "function") toast("Falta la librería XLSX (revisa conexión)");
      return;
    }
    if (!estado || !estado.maestro || !estado.maestro.size) {
      if (typeof toast === "function") toast("No hay clientes en el maestro para exportar");
      return;
    }
    var headers = [
      "ID",
      "Nombre",
      "Zona",
      "Condicion",
      "Region",
      "Direccion",
      "Ciudad",
      "Provincia",
      "Localidad",
      "Latitud",
      "Longitud"
    ];
    var rows = [headers];
    var list = [];
    estado.maestro.forEach(function (r) {
      list.push(r);
    });
    list.sort(function (a, b) {
      return String(a.id || "").localeCompare(String(b.id || ""), undefined, { numeric: true });
    });
    list.forEach(function (r) {
      rows.push([
        r.id || "",
        r.nombre || "",
        r.zona || "",
        r.condicion || "",
        r.region || "",
        r.direccion || "",
        r.ciudad || "",
        r.provincia || "",
        r.localidad || "",
        r.lat != null && r.lat !== "" ? r.lat : "",
        r.lon != null && r.lon !== "" ? r.lon : ""
      ]);
    });
    var ws = XLSX.utils.aoa_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MaestroClientes");
    var name =
      "Maestro_Clientes_" +
      new Date().toISOString().slice(0, 10) +
      ".xlsx";
    XLSX.writeFile(wb, name);
    if (typeof toast === "function") toast("Exportados " + list.length + " clientes → " + name);
    console.info(LOG, "exportados", list.length);
  }

  function ensureButton() {
    var page = document.getElementById("page-maestro");
    if (!page) return false;
    if (document.getElementById("btnExportMaestro")) return true;

    var badge = document.getElementById("badgeMaestro");
    var header = badge && badge.parentElement;
    if (!header) {
      header = page.querySelector(".card h3");
      if (header) header = header.parentElement;
    }
    if (!header) return false;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btnExportMaestro";
    btn.className = "btn btn-secondary btn-sm";
    btn.title = "Descargar maestro de clientes a Excel para editar en el PC";
    btn.textContent = "Exportar Excel";
    btn.style.marginLeft = "8px";
    btn.onclick = function (e) {
      e.preventDefault();
      exportarMaestroClientes();
    };

    if (badge && badge.parentElement === header) {
      header.insertBefore(btn, badge);
    } else {
      header.appendChild(btn);
    }

    var tip = page.querySelector(".card p");
    if (tip && tip.dataset.exportTip !== "1") {
      tip.dataset.exportTip = "1";
      tip.innerHTML =
        tip.innerHTML +
        " · <strong>Recomendado:</strong> Exportar Excel → editar en el PC → Importar y <em>Reemplazar</em>.";
    }
    return true;
  }

  window.exportarMaestroClientes = exportarMaestroClientes;

  function install() {
    ensureButton();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 400);

  console.info(LOG, "v1 · botón Exportar Excel en Maestro");
})();
