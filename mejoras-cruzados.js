/* RUTALOG mejoras-cruzados v1 — Excel desde PDF Cargando lista */
(function () {
  "use strict";
  if (window.__rutalogCruzadosXls) return;
  window.__rutalogCruzadosXls = true;

  function el(id) { return document.getElementById(id); }
  function toastSafe(msg) {
    if (typeof toast === "function") toast(msg);
    else console.log("[RUTALOG]", msg);
  }

  function extraerArticulosPorBloque(textoPlano) {
    var texto = String(textoPlano || "").replace(/\r/g, "\n");
    var lineas = texto.split(/\n+/).map(function (l) { return l.replace(/\s+/g, " ").trim(); }).filter(Boolean);

    var bloques = [];
    var i;
    for (i = 0; i < lineas.length; i++) {
      var mIde = lineas[i].match(/\b(IDE\d{6,})\b/i);
      var mEnt = /^Entregar\s*a\s*:?/i.test(lineas[i]);
      if (mIde || mEnt) {
        bloques.push({ start: i, ide: mIde ? mIde[1].toUpperCase() : null, lineas: [] });
      }
    }
    if (!bloques.length) {
      bloques.push({ start: 0, ide: null, lineas: lineas.slice() });
    } else {
      for (var b = 0; b < bloques.length; b++) {
        var end = b + 1 < bloques.length ? bloques[b + 1].start : lineas.length;
        bloques[b].lineas = lineas.slice(bloques[b].start, end);
        if (!bloques[b].ide) {
          for (var j = 0; j < bloques[b].lineas.length; j++) {
            var mi = bloques[b].lineas[j].match(/\b(IDE\d{6,})\b/i);
            if (mi) { bloques[b].ide = mi[1].toUpperCase(); break; }
          }
        }
      }
    }

    var porIde = {};
    var porOrden = [];

    bloques.forEach(function (blk, idx) {
      var arts = [];
      var ls = blk.lineas;
      for (var k = 0; k < ls.length; k++) {
        var L = ls[k];
        if (/Ubicaci[oó]n\s*provisional|Matr[ií]cula|Id\.\s*de\s*art[ií]culo|Nombre\s*de\s*art[ií]culo|^Cant\.?$/i.test(L)) continue;
        if (/^N\.\s*[oº°]\s*de\s*parada|^Id\.\s*del\s*env|^Total\s*de\s*piezas|^Peso\s*total|^Volumen|^Entregar\s*a/i.test(L)) continue;
        if (/Almac[eé]n:|Transportista:|Id\.\s*de\s*la\s*carga|Fecha\s*y\s*hora/i.test(L)) continue;

        var mSku = L.match(/\b(\d{3,6})\b\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*([A-Za-z]{0,4})?\s*$/);
        if (mSku) {
          var nombreArt = mSku[2].replace(/\s+/g, " ").trim();
          if (/^(AV\.?|AVE\.?|CALLE|C\/|CARRETERA|NO\.)/i.test(nombreArt)) continue;
          if (nombreArt.length < 3) continue;
          arts.push({
            sku: mSku[1],
            producto: nombreArt,
            cantidad: parseFloat(String(mSku[3]).replace(",", ".")) || mSku[3],
            unidad: (mSku[4] || "").trim()
          });
          continue;
        }

        var mMult = L.match(/M[uú]ltiple\s+M[uú]ltiple\s+(\d+)/i) || L.match(/\bM[uú]ltiple\b.*?(\d+)\s*M[uú]ltiple/i);
        if (mMult) {
          arts.push({
            sku: "MULTIPLE",
            producto: "Múltiple (varios artículos)",
            cantidad: parseFloat(mMult[1]) || mMult[1],
            unidad: ""
          });
          continue;
        }

        var mSolo = L.match(/^\s*(\d{3,6})\s+(.{5,80})$/);
        if (mSolo && !/IDE|DOM|parada/i.test(mSolo[2])) {
          var cantNext = null;
          if (k + 1 < ls.length) {
            var mc = ls[k + 1].match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-z]{0,4})?$/);
            if (mc) cantNext = { c: parseFloat(mc[1].replace(",", ".")) || mc[1], u: mc[2] || "" };
          }
          arts.push({
            sku: mSolo[1],
            producto: mSolo[2].replace(/\s+/g, " ").trim(),
            cantidad: cantNext ? cantNext.c : "",
            unidad: cantNext ? cantNext.u : ""
          });
        }
      }

      var entry = { ide: blk.ide, orden: idx + 1, articulos: arts };
      porOrden.push(entry);
      if (blk.ide) porIde[blk.ide] = entry;
    });

    return { porIde: porIde, porOrden: porOrden };
  }

  function enriquecerParadas(textoPlano) {
    try {
      var list = (window.estado && estado.paradasCruzadas) || [];
      if (!list.length) return;
      var ext = extraerArticulosPorBloque(textoPlano);
      list.forEach(function (p, i) {
        var found = null;
        if (p.idEnvio && ext.porIde[String(p.idEnvio).toUpperCase()]) {
          found = ext.porIde[String(p.idEnvio).toUpperCase()];
        } else if (ext.porOrden[i]) {
          found = ext.porOrden[i];
        }
        p.articulos = found ? found.articulos.slice() : (p.articulos || []);
      });
      estado.paradasCruzadas = list;
      estado._cruzadosTextoPlano = textoPlano;
    } catch (e) {
      console.warn("[cruzados] enriquecer", e);
    }
  }

  function filasExcel() {
    var list = (window.estado && estado.paradasCruzadas) || [];
    var rows = [];
    list.forEach(function (p) {
      var base = {
        "Nº parada": p.orden || "",
        "Id. del envío": p.idEnvio || "",
        "Entregar a": p.nombre || "",
        "Dirección": p.direccion || "",
        "Ciudad": p.ciudad || (p.match && p.match.ciudad) || "",
        "Peso total (kg)": p.peso != null ? p.peso : "",
        "Cliente maestro": p.match ? (p.match.nombre || "") : "",
        "Id cliente": p.match ? (p.match.idCliente || "") : ""
      };
      var arts = p.articulos || [];
      if (!arts.length) {
        rows.push(Object.assign({}, base, {
          "Id. artículo (SKU)": "",
          "Nombre de artículo": "",
          "Cantidad": "",
          "Unidad": ""
        }));
      } else {
        arts.forEach(function (a, idx) {
          rows.push(Object.assign({}, base, {
            "Id. artículo (SKU)": a.sku || "",
            "Nombre de artículo": a.producto || "",
            "Cantidad": a.cantidad != null ? a.cantidad : "",
            "Unidad": a.unidad || ""
          }));
          if (idx > 0) {
            rows[rows.length - 1]["Nº parada"] = "";
            rows[rows.length - 1]["Id. del envío"] = "";
            rows[rows.length - 1]["Entregar a"] = "";
            rows[rows.length - 1]["Dirección"] = "";
            rows[rows.length - 1]["Ciudad"] = "";
            rows[rows.length - 1]["Peso total (kg)"] = "";
            rows[rows.length - 1]["Cliente maestro"] = "";
            rows[rows.length - 1]["Id cliente"] = "";
          }
        });
      }
    });
    return rows;
  }

  function descargarExcelCruzados() {
    try {
      if (typeof XLSX === "undefined") {
        toastSafe("XLSX no está cargado");
        return;
      }
      var list = (window.estado && estado.paradasCruzadas) || [];
      if (!list.length) {
        toastSafe("No hay paradas. Carga primero el PDF.");
        return;
      }
      var sinArt = list.every(function (p) { return !(p.articulos && p.articulos.length); });
      if (sinArt && estado._cruzadosTextoPlano) {
        enriquecerParadas(estado._cruzadosTextoPlano);
      }

      var rows = filasExcel();
      var ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 10 }, { wch: 14 }, { wch: 36 }, { wch: 40 }, { wch: 18 },
        { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 36 }, { wch: 10 }, { wch: 8 }
      ];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Viajes cruzados");

      var resumen = list.map(function (p) {
        return {
          "Nº parada": p.orden || "",
          "Id. del envío": p.idEnvio || "",
          "Entregar a": p.nombre || "",
          "Dirección": p.direccion || "",
          "Ciudad": p.ciudad || "",
          "Peso (kg)": p.peso != null ? p.peso : "",
          "Líneas SKU": (p.articulos || []).length,
          "Match maestro": p.match ? "Sí" : "No"
        };
      });
      var ws2 = XLSX.utils.json_to_sheet(resumen);
      XLSX.utils.book_append_sheet(wb, ws2, "Resumen paradas");

      var f = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, "Viajes_cruzados_" + f + ".xlsx");
      toastSafe("Excel descargado · " + list.length + " paradas · " + rows.length + " filas");
    } catch (e) {
      console.error(e);
      toastSafe("Error al generar Excel: " + (e.message || e));
    }
  }

  function ensureUI() {
    var page = el("page-cruzados");
    if (!page || el("btnExcelCruzados")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btnExcelCruzados";
    btn.className = "btn btn-primary btn-sm";
    btn.textContent = "Descargar Excel del PDF";
    btn.title = "Exporta Id. envío, Entregar a y desglose de artículos";
    btn.style.cssText = "margin-left:8px;";

    var info = el("cruzadosInfo");
    var drop = el("dropCruzados");
    if (info && info.parentNode) {
      var wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;";
      info.parentNode.insertBefore(wrap, info);
      wrap.appendChild(info);
      wrap.appendChild(btn);
    } else if (drop && drop.parentNode) {
      drop.parentNode.insertBefore(btn, drop.nextSibling);
    } else {
      page.insertBefore(btn, page.firstChild);
    }
    btn.onclick = descargarExcelCruzados;
  }

  function hookProcesar() {
    if (typeof window.procesarPDFCruzados !== "function" || window.procesarPDFCruzados._xlsHook) return;
    var orig = window.procesarPDFCruzados;
    window.procesarPDFCruzados = async function (file) {
      var r = await orig.apply(this, arguments);
      try {
        if (typeof extraerTextoPDF === "function") {
          var textoObj = await extraerTextoPDF(file);
          var plano = (textoObj && (textoObj.plano || textoObj.texto || textoObj)) || "";
          if (typeof plano !== "string") {
            plano = (textoObj.colIzq || "") + "\n" + (textoObj.colDer || "") + "\n" + (textoObj.plano || "");
          }
          enriquecerParadas(plano);
          if (typeof renderCruzadosLista === "function") renderCruzadosLista();
        }
      } catch (e) {
        console.warn("[cruzados] post-parse articulos", e);
      }
      return r;
    };
    window.procesarPDFCruzados._xlsHook = true;
  }

  function tick() {
    ensureUI();
    hookProcesar();
  }

  setTimeout(tick, 800);
  setTimeout(tick, 2000);
  setTimeout(tick, 4000);
  setInterval(tick, 3000);
})();
