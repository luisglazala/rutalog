/* RUTALOG maestro-import v3 — fusión app+Excel con prioridad cuando difieren */
(function () {
  "use strict";
  if (window.__rutalogMaestroImportV3) return;
  window.__rutalogMaestroImportV3 = true;
  window.__rutalogMaestroImportV2 = true;
  window.__rutalogMaestroImportV1 = true;

  var LOG = "[RUTALOG] maestro-import";

  function rebuildBare() {
    try {
      estado.maestroByBare = new Map();
      estado.maestro.forEach(function (r, id) {
        var bare = String(id).replace(/^0+/, "") || "0";
        if (!estado.maestroByBare.has(bare)) estado.maestroByBare.set(bare, r);
      });
    } catch (e) {}
  }

  function parseFilas(filas) {
    var out = [];
    for (var i = 0; i < filas.length; i++) {
      var f = filas[i];
      var id = pad9(
        alias(f, [
          "cliente", "id cliente", "id_cliente", "codigo cliente", "# cliente",
          "id", "codigo", "account", "account number"
        ])
      );
      if (!id) continue;
      var lat = num(alias(f, ["latitud", "lat", "latitude"]));
      var lon = num(alias(f, ["longitud", "lon", "long", "lng", "longitude"]));
      out.push({
        id: id,
        nombre: alias(f, ["nombre", "nombre de cliente", "nombre cliente", "name", "customer name"]) || "",
        zona: String(alias(f, ["zona", "zone"]) || ""),
        condicion: alias(f, ["condicion", "condición", "condiciones"]) || "",
        region: alias(f, ["region", "región"]) || "",
        direccion: alias(f, ["direccion", "dirección", "address"]) || "",
        ciudad: alias(f, ["ciudad_std", "ciudad", "city"]) || "",
        provincia: alias(f, ["provincia", "province"]) || "",
        localidad: alias(f, ["localidad", "locality"]) || "",
        lat: lat,
        lon: lon
      });
    }
    return out;
  }

  function filled(v) {
    return v != null && String(v).trim() !== "";
  }

  function normTxt(v) {
    return filled(v) ? String(v).trim() : "";
  }

  function pickText(appVal, excelVal, preferExcel) {
    var a = normTxt(appVal);
    var e = normTxt(excelVal);
    if (!a && !e) return "";
    if (!a) return e;
    if (!e) return a;
    if (a === e) return a;
    return preferExcel ? e : a;
  }

  function pickCoord(appVal, excelVal, preferExcel) {
    var eOk = excelVal != null && Number.isFinite(Number(excelVal));
    var aOk = appVal != null && Number.isFinite(Number(appVal));
    if (eOk && aOk) {
      if (Number(excelVal) === Number(appVal)) return Number(appVal);
      return preferExcel ? Number(excelVal) : Number(appVal);
    }
    if (eOk) return Number(excelVal);
    if (aOk) return Number(appVal);
    return excelVal != null ? excelVal : appVal;
  }

  async function importarMaestroClientes(file) {
    if (!file) return;
    if (typeof leerXLS !== "function") {
      toast("No se puede leer Excel");
      return;
    }
    if (typeof setDropLoading === "function") setDropLoading("dropMaestro", true, "Procesando maestro…");
    try {
      var filas = await leerXLS(file);
      var parsed = parseFilas(filas);
      if (!parsed.length) {
        toast("No se leyeron clientes del archivo (revisa columna Cliente / ID)");
        return;
      }

      var replace = true;
      var preferExcel = false;

      if (estado.maestro && estado.maestro.size > 0) {
        var ok = true;
        if (typeof confirmDialog === "function") {
          ok = await confirmDialog(
            "Archivo: " + file.name + "\n" +
              parsed.length + " clientes leídos.\n\n" +
              "Actual en panel: " + estado.maestro.size + " clientes.\n\n" +
              "Aceptar = REEMPLAZAR (solo queda el Excel).\n" +
              "Cancelar = FUSIONAR (se combinan app + Excel).",
            { title: "Importar Maestro de clientes", okText: "Reemplazar", cancelText: "Fusionar" }
          );
        }
        replace = !!ok;

        if (!replace && typeof confirmDialog === "function") {
          var excelWins = await confirmDialog(
            "Fusión app + Excel\n\n" +
              "• Clientes solo en la app → se conservan\n" +
              "• Clientes solo en el Excel → se agregan\n" +
              "• Campos vacíos → se completan con el otro lado\n\n" +
              "Si APP y EXCEL tienen valores distintos en el mismo campo\n" +
              "(ej. condición distinta):\n\n" +
              "Aceptar = gana el EXCEL (cambios del archivo)\n" +
              "Cancelar = gana la APP (ediciones en pantalla)",
            {
              title: "¿Qué priorizar si hay conflicto?",
              okText: "Priorizar Excel",
              cancelText: "Priorizar app"
            }
          );
          preferExcel = !!excelWins;
        }
      }

      if (replace) estado.maestro.clear();

      var nNew = 0;
      var nUpd = 0;
      var nConflict = 0;

      if (replace) {
        for (var j0 = 0; j0 < parsed.length; j0++) {
          estado.maestro.set(parsed[j0].id, parsed[j0]);
          nNew++;
        }
      } else {
        for (var j = 0; j < parsed.length; j++) {
          var r = parsed[j];
          var prev = estado.maestro.get(r.id);
          if (prev) {
            nUpd++;
            var fields = ["nombre", "zona", "condicion", "region", "direccion", "ciudad", "provincia", "localidad"];
            for (var fi = 0; fi < fields.length; fi++) {
              var fk = fields[fi];
              var av = normTxt(prev[fk]);
              var ev = normTxt(r[fk]);
              if (av && ev && av !== ev) nConflict++;
            }
            estado.maestro.set(r.id, {
              id: r.id,
              nombre: pickText(prev.nombre, r.nombre, preferExcel),
              zona: pickText(prev.zona, r.zona, preferExcel),
              condicion: pickText(prev.condicion, r.condicion, preferExcel),
              region: pickText(prev.region, r.region, preferExcel),
              direccion: pickText(prev.direccion, r.direccion, preferExcel),
              ciudad: pickText(prev.ciudad, r.ciudad, preferExcel),
              provincia: pickText(prev.provincia, r.provincia, preferExcel),
              localidad: pickText(prev.localidad, r.localidad, preferExcel),
              lat: pickCoord(prev.lat, r.lat, preferExcel),
              lon: pickCoord(prev.lon, r.lon, preferExcel)
            });
          } else {
            nNew++;
            estado.maestro.set(r.id, r);
          }
        }
      }

      rebuildBare();
      estado.maestroFuente = replace
        ? "importado (reemplazo) · " + (file.name || "excel")
        : "fusionado (" + (preferExcel ? "Excel prioriza" : "app prioriza") + ") · " + (file.name || "excel");

      try {
        var badge = document.getElementById("badgeMaestro");
        if (badge) badge.textContent = estado.maestro.size;
        var foot = document.getElementById("footStats");
        if (foot) foot.textContent = estado.maestro.size.toLocaleString() + " clientes";
      } catch (e0) {}

      if (typeof actualizarFuenteMaestroUI === "function") actualizarFuenteMaestroUI();
      if (typeof fillProvFilter === "function") fillProvFilter();
      if (typeof renderMaestroTable === "function") renderMaestroTable();
      if (typeof saveMaestroLS === "function") saveMaestroLS();
      try {
        if (typeof ghMarkDirty === "function") ghMarkDirty("maestro-import");
      } catch (e1) {}

      var msg;
      if (replace) {
        msg = "Reemplazado: " + estado.maestro.size + " clientes · " + (file.name || "");
      } else {
        msg =
          "Fusionado: " +
          estado.maestro.size +
          " clientes (" +
          nNew +
          " nuevos Excel, " +
          nUpd +
          " cruzados, prioridad " +
          (preferExcel ? "Excel" : "app") +
          (nConflict ? ", " + nConflict + " campos en conflicto resueltos" : "") +
          ") · " +
          (file.name || "");
      }
      toast(msg);
      console.info(LOG, msg);

      if (estado.diarioRaw && estado.diarioRaw.length && typeof construirHoy === "function") {
        try {
          construirHoy(estado.diarioRaw);
        } catch (e2) {}
      }

      try {
        if (typeof ghGetToken === "function" && ghGetToken()) {
          if (window.rutalogSyncCore && window.rutalogSyncCore.forcePush) {
            setTimeout(function () {
              window.rutalogSyncCore.forcePush(false).catch(function () {});
            }, 500);
          } else if (typeof ghActualizar === "function") {
            setTimeout(function () {
              ghActualizar({ silent: false });
            }, 500);
          }
        }
      } catch (e3) {}
    } catch (e) {
      console.error(LOG, e);
      toast("Error leyendo maestro: " + (e && e.message ? e.message : e));
    } finally {
      if (typeof setDropLoading === "function") setDropLoading("dropMaestro", false);
      var inp = document.getElementById("fileMaestro");
      if (inp) inp.value = "";
    }
  }

  function updateDropLabel() {
    try {
      var drop = document.getElementById("dropMaestro");
      if (!drop) return;
      var t = drop.querySelector(".t");
      var s = drop.querySelector(".s");
      if (t) t.textContent = "Importar maestro de clientes (.xlsx)";
      if (s)
        s.textContent =
          "Arrastra o haz clic · Puedes REEMPLAZAR o FUSIONAR (app + Excel). Si hay conflicto en un campo, eliges si gana la app o el Excel.";
    } catch (e) {}
  }

  function install() {
    if (typeof setupDrop !== "function") return false;
    if (!document.getElementById("dropMaestro") || !document.getElementById("fileMaestro")) return false;
    setupDrop("dropMaestro", "fileMaestro", importarMaestroClientes);
    updateDropLabel();
    return true;
  }

  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    if (install() || n > 40) clearInterval(t);
  }, 400);

  window.rutalogImportarMaestro = importarMaestroClientes;
  console.info(LOG, "v3 · fusión con prioridad app o Excel si hay conflicto");
})();
