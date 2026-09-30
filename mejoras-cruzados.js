/* RUTALOG mejoras-cruzados v3 — Condicion desde maestro */
(function () {
  "use strict";
  if (window.__rutalogCruzadosXls3) return;
  window.__rutalogCruzadosXls3 = true;

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
      if (mIde || mEnt) bloques.push({ start: i, ide: mIde ? mIde[1].toUpperCase() : null, lineas: [] });
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
    var porIde = {}, porOrden = [];
    bloques.forEach(function (blk, idx) {
      var arts = [];
      var ls = blk.lineas;
      for (var k = 0; k < ls.length; k++) {
        var L = ls[k];
        if (/Ubicaci[oó]n\s*provisional|Matr[ií]cula|Id\.\s*de\s*art[ií]culo|Nombre\s*de\s*art[ií]culo|^Cant\.?$/i.test(L)) continue;
        if (/^N\.\s*[oº°]\s*de\s*parada|^Id\.\s*del\s*env|^Total\s*de\s*piezas|^Peso\s*total|^Volumen|^Entregar\s*a/i.test(L)) continue;
        var mSku = L.match(/\b(\d{3,6})\b\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*([A-Za-z]{0,4})?\s*$/);
        if (mSku) {
          var nombreArt = mSku[2].replace(/\s+/g, " ").trim();
          if (/^(AV\.?|AVE\.?|CALLE|C\/|CARRETERA|NO\.)/i.test(nombreArt)) continue;
          if (nombreArt.length < 3) continue;
          arts.push({ sku: mSku[1], producto: nombreArt, cantidad: parseFloat(String(mSku[3]).replace(",", ".")) || mSku[3], unidad: (mSku[4] || "").trim() });
          continue;
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
        if (p.idEnvio && ext.porIde[String(p.idEnvio).toUpperCase()]) found = ext.porIde[String(p.idEnvio).toUpperCase()];
        else if (ext.porOrden[i]) found = ext.porOrden[i];
        p.articulos = found ? found.articulos.slice() : (p.articulos || []);
      });
      estado.paradasCruzadas = list;
      estado._cruzadosTextoPlano = textoPlano;
    } catch (e) { console.warn("[cruzados] enriquecer", e); }
  }

  function ciudadDeParada(p) {
    if (p.match) {
      if (p.match.ciudad) return p.match.ciudad;
      if (p.match.localidad) return p.match.localidad;
    }
    return p.ciudad || "";
  }

  function condicionDeParada(p) {
    if (p.match && p.match.condicion) return p.match.condicion;
    if (p.condicion) return p.condicion;
    try {
      if (p.match && (p.match.id || p.match.idCliente) && window.estado && estado.maestro) {
        var id = String(p.match.id || p.match.idCliente);
        var m = estado.maestro.get(id);
        if (m && m.condicion) return m.condicion;
      }
    } catch (e) {}
    return "";
  }

  function enriquecerCondiciones() {
    try {
      var list = (window.estado && estado.paradasCruzadas) || [];
      if (!list.length || !estado.maestro) return;
      list.forEach(function (p) {
        if (!p.match) return;
        if (p.match.condicion) return;
        var id = p.match.id || p.match.idCliente;
        if (!id) return;
        var m = estado.maestro.get(String(id));
        if (m) {
          p.match.condicion = m.condicion || "";
          if (m.ciudad && !p.match.ciudad) p.match.ciudad = m.ciudad;
          if (m.localidad && !p.match.localidad) p.match.localidad = m.localidad;
        }
      });
    } catch (e) { console.warn("[cruzados] condiciones", e); }
  }

  function nombreLimpio(p) {
    var n = String(p.nombre || "").replace(/\s+/g, " ").trim();
    if (n.length >= 8) {
      var words = n.split(" ");
      for (var len = Math.min(5, Math.floor(words.length / 2)); len >= 2; len--) {
        var pref = words.slice(0, len).join(" ");
        var rest = words.slice(len).join(" ");
        if (rest.indexOf(pref) === 0 || rest.toUpperCase().indexOf(pref.toUpperCase()) === 0) {
          n = rest.trim() || pref;
          break;
        }
      }
      var half = Math.floor(n.length / 2);
      var a = n.slice(0, half).trim();
      var b = n.slice(half).trim();
      if (a.length > 4 && b.indexOf(a) === 0) n = b;
    }
    return n;
  }

  function filasExcel() {
    var list = (window.estado && estado.paradasCruzadas) || [];
    return list.map(function (p) {
      return {
        "Nº parada": p.orden != null ? p.orden : "",
        "Id. del envío": p.idEnvio || "",
        "Entregar a": nombreLimpio(p),
        "Dirección": p.direccion || (p.match && p.match.direccion) || "",
        "Ciudad": ciudadDeParada(p),
        "Peso total (kg)": p.peso != null ? p.peso : "",
        "Cliente maestro": p.match ? (p.match.nombre || "") : "",
        "Condicion": condicionDeParada(p),
        "Motivo": ""
      };
    });
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
      enriquecerCondiciones();
      var rows = filasExcel();
      var ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 10 }, { wch: 14 }, { wch: 40 }, { wch: 42 }, { wch: 18 },
        { wch: 14 }, { wch: 36 }, { wch: 14 }, { wch: 16 }
      ];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Viajes cruzados");
      var f = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, "Viajes_cruzados_" + f + ".xlsx");
      toastSafe("Excel descargado · " + rows.length + " paradas");
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
    btn.title = "Paradas: Id envío, Entregar a, ciudad del mapa, condición, motivo";
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
          enriquecerCondiciones();
          if (typeof renderCruzadosLista === "function") renderCruzadosLista();
        }
      } catch (e) {
        console.warn("[cruzados] post-parse articulos", e);
      }
      return r;
    };
    window.procesarPDFCruzados._xlsHook = true;
  }

  function hookCruzar() {
    if (typeof window.cruzarParadasConMaestro !== "function" || window.cruzarParadasConMaestro._condHook) return;
    var orig = window.cruzarParadasConMaestro;
    window.cruzarParadasConMaestro = function (paradas) {
      var out = orig.apply(this, arguments);
      try {
        (out || []).forEach(function (p) {
          if (!p || !p.match) return;
          var id = p.match.id || p.match.idCliente;
          if (!id || !estado.maestro) return;
          var m = estado.maestro.get(String(id));
          if (m) {
            p.match.condicion = m.condicion || "";
            if (m.ciudad) p.match.ciudad = m.ciudad;
            if (m.localidad) p.match.localidad = m.localidad;
          }
        });
      } catch (e) {}
      return out;
    };
    window.cruzarParadasConMaestro._condHook = true;
  }

  function tick() {
    ensureUI();
    hookProcesar();
    hookCruzar();
    enriquecerCondiciones();
  }

  setTimeout(tick, 800);
  setTimeout(tick, 2000);
  setTimeout(tick, 4000);
  setInterval(tick, 3000);
})();
