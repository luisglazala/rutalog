/* RUTALOG maestro-import v1 — Excel con Reemplazar o Fusionar (como Código SKU) */
(function () {
  "use strict";
  if (window.__rutalogMaestroImportV1) return;
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
          "cliente",
          "id cliente",
          "id_cliente",
          "codigo cliente",
          "# cliente",
          "id",
          "codigo",
          "account",
          "account number"
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
            "Archivo: " +
              file.name +
              "\n" +
              parsed.length +
              " clientes leídos.\n\n" +
              "Actual en panel: " +
              estado.maestro.size +
              " clientes.\n\n" +
              "Aceptar = REEMPLAZAR todo el maestro por el archivo.\n" +
              "Cancelar = FUSIONAR (actualizar existentes + agregar nuevos).",
            {
              title: "Importar Maestro de clientes",
              okText: "Reemplazar",
              cancelText: "Fusionar"
            }
          );
        }
        replace = !!ok;
      }

      if (replace) estado.maestro.clear();

      var nNew = 0;
      var nUpd = 0;
      for (var j = 0; j < parsed.length; j++) {
        var r = parsed[j];
        var prev = estado.maestro.get(r.id);
        if (prev) {
          nUpd++;
          estado.maestro.set(r.id, {
            id: r.id,
            nombre: r.nombre || prev.nombre || "",
            zona: r.zona !== "" ? r.zona : prev.zona || "",
            condicion: r.condicion || prev.condicion || "",
            region: r.region || prev.region || "",
            direccion: r.direccion || prev.direccion || "",
            ciudad: r.ciudad || prev.ciudad || "",
            provincia: r.provincia || prev.provincia || "",
            localidad: r.localidad || prev.localidad || "",
            lat: r.lat != null ? r.lat : prev.lat,
            lon: r.lon != null ? r.lon : prev.lon
          });
        } else {
          nNew++;
          estado.maestro.set(r.id, r);
        }
      }

      rebuildBare();
      estado.maestroFuente =
        (replace ? "importado (reemplazo)" : "fusionado") + " · " + (file.name || "excel");

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

      var msg =
        (replace ? "Reemplazado" : "Fusionado") +
        ": " +
        estado.maestro.size +
        " clientes (" +
        nNew +
        " nuevos, " +
        nUpd +
        " actualizados) · " +
        (file.name || "");
      toast(msg);
      console.info(LOG, msg);

      if (estado.diarioRaw && estado.diarioRaw.length && typeof construirHoy === "function") {
        try {
          construirHoy(estado.diarioRaw);
        } catch (e2) {}
      }

      try {
        if (typeof ghGetToken === "function" && ghGetToken()) {
          if (window.rutalogSyncCore && typeof window.rutalogSyncCore.forcePush === "function") {
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
          "Arrastra o haz clic · Al importar puedes REEMPLAZAR todo o FUSIONAR (actualizar + agregar). Se guarda en este navegador y se sincroniza con GitHub.";
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
  console.info(LOG, "v1 · import Excel con Reemplazar / Fusionar");
})();
