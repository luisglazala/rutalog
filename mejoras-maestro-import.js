/* RUTALOG maestro-import v2 — fusión conserva ediciones app + Excel completa/agrega */
(function () {
  "use strict";
  if (window.__rutalogMaestroImportV2) return;
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
      if (estado.maestro && estado.maestro.size > 0) {
        var ok = true;
        if (typeof confirmDialog === "function") {
          ok = await confirmDialog(
            "Archivo: " + file.name + "\n" + parsed.length + " clientes leídos.\n\n" +
              "Actual en panel: " + estado.maestro.size + " clientes.\n\n" +
              "Aceptar = REEMPLAZAR todo el maestro por el archivo.\n" +
              "Cancelar = FUSIONAR: se conservan tus ediciones en la app (ej. condición)\n" +
              "y el Excel agrega clientes nuevos y completa campos vacíos (coords, etc.).",
            { title: "Importar Maestro de clientes", okText: "Reemplazar", cancelText: "Fusionar" }
          );
        }
        replace = !!ok;
      }

      if (replace) estado.maestro.clear();

      var nNew = 0, nUpd = 0;
      function filled(v) { return v != null && String(v).trim() !== ""; }
      function pickText(appVal, excelVal) {
        var a = filled(appVal) ? String(appVal).trim() : "";
        var e = filled(excelVal) ? String(excelVal).trim() : "";
        if (!a && !e) return "";
        if (!a) return e;
        if (!e) return a;
        return a;
      }
      function pickCoord(appVal, excelVal) {
        if (excelVal != null && Number.isFinite(Number(excelVal))) return Number(excelVal);
        if (appVal != null && Number.isFinite(Number(appVal))) return Number(appVal);
        return excelVal != null ? excelVal : appVal;
      }

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
            estado.maestro.set(r.id, {
              id: r.id,
              nombre: pickText(prev.nombre, r.nombre),
              zona: pickText(prev.zona, r.zona),
              condicion: pickText(prev.condicion, r.condicion),
              region: pickText(prev.region, r.region),
              direccion: pickText(prev.direccion, r.direccion),
              ciudad: pickText(prev.ciudad, r.ciudad),
              provincia: pickText(prev.provincia, r.provincia),
              localidad: pickText(prev.localidad, r.localidad),
              lat: pickCoord(prev.lat, r.lat),
              lon: pickCoord(prev.lon, r.lon)
            });
          } else {
            nNew++;
            estado.maestro.set(r.id, r);
          }
        }
      }

      rebuildBare();
      estado.maestroFuente =
        (replace ? "importado (reemplazo)" : "fusionado (app+excel)") + " · " + (file.name || "excel");

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
      try { if (typeof ghMarkDirty === "function") ghMarkDirty("maestro-import"); } catch (e1) {}

      var msg = replace
        ? "Reemplazado: " + estado.maestro.size + " clientes · " + (file.name || "")
        : "Fusionado: " + estado.maestro.size + " clientes (" + nNew +
          " nuevos del Excel, " + nUpd + " cruzados; ediciones de la app conservadas) · " + (file.name || "");
      toast(msg);
      console.info(LOG, msg);

      if (estado.diarioRaw && estado.diarioRaw.length && typeof construirHoy === "function") {
        try { construirHoy(estado.diarioRaw); } catch (e2) {}
      }

      try {
        if (typeof ghGetToken === "function" && ghGetToken()) {
          if (window.rutalogSyncCore && window.rutalogSyncCore.forcePush) {
            setTimeout(function () { window.rutalogSyncCore.forcePush(false).catch(function () {}); }, 500);
          } else if (typeof ghActualizar === "function") {
            setTimeout(function () { ghActualizar({ silent: false }); }, 500);
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
          "Arrastra o haz clic · REEMPLAZAR = solo el Excel. FUSIONAR = se guardan tus cambios en la app y los del Excel (nuevos y campos vacíos / coordenadas).";
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
  console.info(LOG, "v2 · fusión conserva ediciones app + Excel completa/agrega");
})();
