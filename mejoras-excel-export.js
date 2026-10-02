/* RUTALOG mejoras-excel-export v1 — Excel de viajes con formato tipo planificación */
(function () {
  "use strict";
  if (window.__rutalogExcelExportV1) return;
  window.__rutalogExcelExportV1 = true;

  var COLORS = [
    "F5E6C8",
    "C5D9F0",
    "D4EDDA",
    "E2D5F1",
    "FDE2E2",
    "FFF3CD",
    "D1ECF1",
    "E8E8E8"
  ];
  var CITA_YELLOW = "FFE066";
  var HEADER_BG = "1F1F1F";
  var HEADER_FG = "FAFAFA";
  var THICK = { style: "medium", color: { rgb: "333333" } };
  var THIN = { style: "thin", color: { rgb: "B0B0B0" } };

  function loadXlsxStyle() {
    return new Promise(function (resolve) {
      if (window.__xlsxStyleLoaded) return resolve();
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js";
      s.onload = function () {
        window.__xlsxStyleLoaded = true;
        resolve();
      };
      s.onerror = function () {
        console.warn("[excel-export] xlsx-js-style no cargó; se usa XLSX básico");
        resolve();
      };
      document.head.appendChild(s);
    });
  }

  function cell(v, style) {
    var o = { v: v == null ? "" : v, t: typeof v === "number" ? "n" : "s" };
    if (style) o.s = style;
    return o;
  }

  function baseStyle(fillRgb, bold, extra) {
    var s = {
      fill: { patternType: "solid", fgColor: { rgb: fillRgb } },
      font: { name: "Calibri", sz: 11, bold: !!bold, color: { rgb: "1A1A1A" } },
      alignment: { vertical: "center", wrapText: true },
      border: {
        top: THIN,
        bottom: THIN,
        left: THIN,
        right: THIN
      }
    };
    if (extra) {
      if (extra.bold) s.font.bold = true;
      if (extra.bottomThick) s.border.bottom = THICK;
      if (extra.topThick) s.border.top = THICK;
      if (extra.align) s.alignment.horizontal = extra.align;
    }
    return s;
  }

  function headerStyle() {
    return {
      fill: { patternType: "solid", fgColor: { rgb: HEADER_BG } },
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: HEADER_FG } },
      alignment: { vertical: "center", horizontal: "center", wrapText: true },
      border: {
        top: THICK, bottom: THICK, left: THIN, right: THIN
      }
    };
  }

  function tieneCita(txt) {
    if (!txt) return false;
    var t = String(txt).trim().toLowerCase();
    return t && t !== "no" && t !== "—" && t !== "-";
  }

  function buildStyledCompletas(rows, cols) {
    var aoa = [];
    var head = cols.map(function (c) {
      return cell(c, headerStyle());
    });
    aoa.push(head);

    var viajeColorIndex = {};
    var colorIdx = 0;
    var merges = [];
    var lastViaje = null;
    var viajeRanges = [];

    rows.forEach(function (r, i) {
      var viaje = String(r.Viaje || "");
      if (!(viaje in viajeColorIndex)) {
        viajeColorIndex[viaje] = colorIdx % COLORS.length;
        colorIdx++;
      }
      var fill = COLORS[viajeColorIndex[viaje]];
      if (tieneCita(r.Cita)) fill = CITA_YELLOW;

      var nextViaje = i + 1 < rows.length ? String(rows[i + 1].Viaje || "") : null;
      var isLastOfViaje = nextViaje !== viaje;
      var isFirstOfViaje = viaje !== lastViaje;

      if (isFirstOfViaje) {
        viajeRanges.push({ viaje: viaje, start: i, end: i });
      } else {
        viajeRanges[viajeRanges.length - 1].end = i;
      }

      var extra = {};
      if (isLastOfViaje) extra.bottomThick = true;
      if (isFirstOfViaje && i > 0) extra.topThick = true;

      var st = baseStyle(fill, false, extra);
      var stBold = baseStyle(fill, true, extra);
      var stCenter = baseStyle(fill, false, Object.assign({ align: "center" }, extra));

      aoa.push([
        cell(r.Viaje, st),
        cell(r.Parada, stCenter),
        cell(r.Nombre, st),
        cell(r.OV, st),
        cell("", st),
        cell(r["Peso OV (kg)"], stCenter),
        cell(r.Condición, stBold),
        cell(r.Localidad, st),
        cell(r.Ciudad, st),
        cell(r.Provincia, st),
        cell(r.Cita, tieneCita(r.Cita) ? baseStyle(CITA_YELLOW, true, extra) : stCenter),
        cell(r.Camión, stCenter)
      ]);

      lastViaje = viaje;
    });

    viajeRanges.forEach(function (rg) {
      if (rg.end > rg.start) {
        merges.push({
          s: { r: rg.start + 1, c: 4 },
          e: { r: rg.end + 1, c: 4 }
        });
      }
    });

    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = merges;
    ws["!cols"] = [
      { wch: 10 },
      { wch: 8 },
      { wch: 36 },
      { wch: 14 },
      { wch: 6 },
      { wch: 12 },
      { wch: 32 },
      { wch: 36 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 }
    ];
    ws["!rows"] = [{ hpt: 22 }];
    return ws;
  }

  function collectRowsFromCore() {
    var colsCompleta = [
      "Viaje", "Parada", "Nombre", "OV", "IDC", "Peso OV (kg)",
      "Condición", "Localidad", "Ciudad", "Provincia", "Cita", "Camión"
    ];
    var todos = [];
    try {
      if (estado.viajesGuardados && estado.viajesGuardados.length) {
        todos = estado.viajesGuardados.slice();
      }
    } catch (e) {}

    var completas = [];
    todos.forEach(function (v) {
      var camion = v.camion || (v.plantilla ? ("CAMION " + v.plantilla) : "") || "";
      var numParada = 0;
      (v.paradas || []).forEach(function (p) {
        numParada++;
        var cita = null;
        try {
          if (estado.citas && estado.citas.get) cita = estado.citas.get(p.idCliente);
        } catch (e) {}
        var citaTxt = cita ? (cita.fecha || "Sí") : "No";

        var ovs = [];
        if (p.ovs && p.ovs.length) {
          ovs = p.ovs.map(function (o) {
            return { ov: o.ov || o, peso: Number(o.peso) || 0 };
          });
        } else if (p.ovTexto) {
          var parts = String(p.ovTexto).split(",").map(function (s) { return s.trim(); }).filter(Boolean);
          var pesoEach = parts.length ? (Number(p.peso) || 0) / parts.length : (Number(p.peso) || 0);
          ovs = parts.map(function (ov) { return { ov: ov, peso: pesoEach }; });
        } else {
          ovs = [{ ov: "", peso: Number(p.peso) || 0 }];
        }

        ovs.forEach(function (g) {
          completas.push({
            Viaje: v.nombre,
            Parada: numParada,
            Nombre: p.nombre || "",
            OV: g.ov || "",
            IDC: "",
            "Peso OV (kg)": Number((g.peso || 0).toFixed(2)),
            Condición: p.condicion || "",
            Localidad: p.localidad || "",
            Ciudad: p.ciudad || "",
            Provincia: p.provincia || "",
            Cita: citaTxt,
            Camión: camion
          });
        });
      });
    });
    return { cols: colsCompleta, rows: completas, todos: todos };
  }

  function descargarExcelEstilizado() {
    loadXlsxStyle().then(function () {
      try {
        var data = collectRowsFromCore();
        if (!data.rows.length && (!data.todos || !data.todos.length)) {
          if (typeof toast === "function") toast("No hay viajes para descargar");
          return;
        }

        var wb = XLSX.utils.book_new();

        var resumen = (data.todos || []).map(function (v) {
          var peso = 0;
          (v.paradas || []).forEach(function (p) { peso += Number(p.peso) || 0; });
          return {
            Viaje: v.nombre,
            Camión: v.camion || (v.plantilla ? ("CAMION " + v.plantilla) : "") || "",
            "N° Paradas": (v.paradas || []).length,
            "Peso Total (kg)": Number(peso.toFixed(1))
          };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");

        var ws = buildStyledCompletas(data.rows, data.cols);
        XLSX.utils.book_append_sheet(wb, ws, "Completas");

        var f = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, "Rutas_" + f + ".xlsx");
        if (typeof toast === "function") {
          toast("Excel formateado · " + (data.todos || []).length + " viajes · " + data.rows.length + " filas");
        }
      } catch (e) {
        console.error("[excel-export]", e);
        if (typeof window.__descargarExcelOriginal === "function") {
          window.__descargarExcelOriginal();
        } else if (typeof toast === "function") {
          toast("Error al generar Excel: " + (e.message || e));
        }
      }
    });
  }

  function hook() {
    if (typeof window.descargarExcel !== "function") return false;
    if (window.descargarExcel._styled) return true;
    window.__descargarExcelOriginal = window.descargarExcel;
    window.descargarExcel = function () {
      descargarExcelEstilizado();
    };
    window.descargarExcel._styled = true;
    ["btnDescargar", "btnDescargar2"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.onclick = function () { descargarExcelEstilizado(); };
    });
    return true;
  }

  function tick() { hook(); }
  setTimeout(tick, 800);
  setTimeout(tick, 2000);
  setTimeout(tick, 4000);
  setInterval(tick, 5000);
})();
