/* app-core-construirHoy.js — restaurado desde e638c98 + sinPunto tabla + filtro ciudades seguro */
(function () {
function construirHoy(filas) {
  // Guardar líneas crudas a nivel SKU (no agregar aún)
  const lineas = [];
  let lineId = 0;
  for (const f of filas) {
    const ov = String(alias(f, ALIAS_DIARIO.ov) || "").trim();
    if (!ov) continue;
    const id = pad9(alias(f, ALIAS_DIARIO.cliente));
    if (!id) continue;
    // Dynamics suele exportar cantidades en negativo (salida); trabajar siempre en valor absoluto
    let peso = num(alias(f, ALIAS_DIARIO.peso));
    if (peso == null) peso = 0;
    peso = Math.abs(peso);
    let cantidad = num(alias(f, ALIAS_DIARIO.cantidad));
    if (cantidad != null) cantidad = Math.abs(cantidad);
    const qty = cantidad != null && cantidad > 0 ? cantidad : 1;
    lineas.push({
      lineId: "L" + (++lineId),
      ov,
      idCliente: id,
      nombreRaw: alias(f, ALIAS_DIARIO.nombre) || "",
      sku: String(alias(f, ALIAS_DIARIO.sku) || "").trim(),
      producto: String(alias(f, ALIAS_DIARIO.producto) || "").trim(),
      cantidad: qty,
      unidad: String(alias(f, ALIAS_DIARIO.unidad) || "CJ").trim() || "CJ",
      peso,
      pesoUnit: qty ? peso / qty : peso,
      estado: normEstado(alias(f, ALIAS_DIARIO.estado)),
      alma: String(alias(f, ALIAS_DIARIO.alma) || "").trim(),
      ciudadExcel: String(alias(f, ALIAS_DIARIO.ciudad) || "").trim(),
      provinciaExcel: String(alias(f, ALIAS_DIARIO.provincia) || "").trim(),
    });
  }
  estado.lineasRaw = lineas;

  // Consolidar por OV (para stats y agrupación por cliente)
  const porOV = {};
  for (const ln of lineas) {
    if (porOV[ln.ov]) porOV[ln.ov].peso += ln.peso;
    else porOV[ln.ov] = {
      ov: ln.ov, idCliente: ln.idCliente,
      nombreRaw: ln.nombreRaw, peso: ln.peso, estado: ln.estado,
    };
  }

  // Agrupar por cliente
  const porCli = {};
  Object.values(porOV).forEach(r => {
    if (!r.idCliente) return;
    if (!porCli[r.idCliente]) {
      porCli[r.idCliente] = {
        idCliente: r.idCliente, peso: 0, ovs: [],
        nombreRaw: r.nombreRaw, estado: r.estado,
      };
    }
    porCli[r.idCliente].peso += r.peso;
    porCli[r.idCliente].ovs.push({ ov: r.ov, peso: r.peso, estado: r.estado });
    const rank = { Factura: 3, "Confirmación": 2, Ninguno: 1 };
    if ((rank[r.estado] || 0) > (rank[porCli[r.idCliente].estado] || 0))
      porCli[r.idCliente].estado = r.estado;
  });

  function resolverMaestro(id) {
    if (!id) return null;
    let m = estado.maestro.get(id);
    if (m) return m;
    const bare = String(id).replace(/^0+/, "") || "0";
    const pad = bare.padStart(9, "0");
    m = estado.maestro.get(pad) || estado.maestro.get(bare);
    if (m) return m;
    if (estado.maestroByBare && estado.maestroByBare.has(bare)) return estado.maestroByBare.get(bare);
    for (const [k, v] of estado.maestro) {
      if (String(k).replace(/^0+/, "") === bare) return v;
    }
    return null;
  }
  estado.clientesHoy = Object.values(porCli).map(c => {
    const m = resolverMaestro(c.idCliente);
    if (!m || m.lat == null || m.lon == null) return null;
    // Normalizar al id del maestro para consistencia
    const idOk = m.id || c.idCliente;
    return {
      idCliente: idOk,
      nombre: m.nombre || c.nombreRaw || "(sin nombre)",
      lat: m.lat, lon: m.lon,
      condicion: m.condicion || "",
      localidad: m.localidad || "",
      ciudad: m.ciudad || "",
      provincia: m.provincia || "",
      peso: c.peso,
      ovs: c.ovs,
      ovTexto: c.ovs.map(x => x.ov).join(", "),
      estadoDoc: c.estado,
    };
  }).filter(Boolean);

  // Líneas pendientes por cliente (todas al inicio)
  estado.lineasPendientes = new Map();
  for (const ln of lineas) {
    if (!estado.lineasPendientes.has(ln.idCliente)) estado.lineasPendientes.set(ln.idCliente, []);
    estado.lineasPendientes.get(ln.idCliente).push({ ...ln, despachado: false, aDespachar: ln.cantidad });
  }

  // Control de OVs por cliente
  estado.controlOVs.clear();
  estado.clientesHoy.forEach(c => {
    const total = new Set((c.ovs || []).map(o => String(o.ov).trim()).filter(Boolean));
    estado.controlOVs.set(c.idCliente, { totalOVs: total, seleccionadasOVs: new Set() });
  });
  if (typeof recomputarOVsSeleccionadas === "function") recomputarOVsSeleccionadas();

  const ovs = Object.keys(porOV).length;
  const pesoT = Object.values(porOV).reduce((s,x)=>s+x.peso,0);
  const conf = Object.values(porOV).filter(x=>x.estado==="Confirmación").length;
  const fact = Object.values(porOV).filter(x=>x.estado==="Factura").length;
  const el = (id) => document.getElementById(id);
  if (el("sOV")) el("sOV").textContent = ovs;
  if (el("sPeso")) el("sPeso").textContent = pesoT.toFixed(2) + " kg";
  if (el("sConf")) el("sConf").textContent = conf;
  if (el("sFact")) el("sFact").textContent = fact;
  if (el("sMapa")) el("sMapa").textContent = estado.clientesHoy.length;
  if (el("badgeMapaPanel")) el("badgeMapaPanel").textContent = estado.clientesHoy.length + " puntos";
  if (el("badgeActivos")) el("badgeActivos").textContent = estado.clientesHoy.length + " puntos activos";

  const ciudades = [...new Set(estado.clientesHoy.map(c => c.ciudad).filter(Boolean))].sort();
  const lista = document.getElementById("listaCiudades");
  if (lista) {
    let prev = (typeof getCiudadesSeleccionadas === "function") ? getCiudadesSeleccionadas() : ["__TODAS__"];
    let keep = prev.filter(x => x !== "__TODAS__");
    if (!keep.length && typeof cargarCiudadesFiltroLS === "function") {
      const fromLS = cargarCiudadesFiltroLS();
      if (fromLS && fromLS.length) keep = fromLS;
    }
    // Solo conservar ciudades que existen hoy (evita filtro LS viejo → mapa vacío)
    if (keep.length) keep = keep.filter(c => ciudades.includes(c));
    lista.innerHTML = ciudades.map(c => {
      const ck = keep.length ? (keep.includes(c) ? "checked" : "") : "";
      return `<label class="ciu-chip"><input type="checkbox" class="chk-ciudad" value="${c}" ${ck}> ${c}</label>`;
    }).join("");
    const chkTodas = document.getElementById("chkTodasCiudades");
    if (chkTodas) chkTodas.checked = !keep.length;
    if (typeof bindCiudadChecks === "function") bindCiudadChecks();
    if (typeof actualizarLabelCiudad === "function") actualizarLabelCiudad();
    try {
      const any = document.querySelector(".chk-ciudad:checked");
      if (chkTodas && !any) { chkTodas.checked = true; }
    } catch (e) {}
  }

  // Clientes del Excel sin punto (sin maestro o sin lat/lon)
  const idsExcel = new Set(Object.keys(porCli));
  let sinPunto = 0;
  const sinPuntoRows = [];
  idsExcel.forEach(id => {
    const m = resolverMaestro(id);
    if (!m || m.lat == null || m.lon == null) {
      sinPunto++;
      const g = porCli[id];
      sinPuntoRows.push({
        idCliente: id,
        nombre: (m && m.nombre) || (g && g.nombreRaw) || id,
        ovs: (g && g.ovs) ? g.ovs.map(o => o.ov).join(", ") : "",
        peso: g ? g.peso : 0,
        estado: g ? g.estado : "",
        motivo: !m ? "Sin maestro" : "Sin lat/lon en maestro",
      });
    }
  });
  if (typeof renderSinPunto === "function") {
    try { renderSinPunto(sinPuntoRows); } catch (e) {}
  }
  if (typeof saveDiarioEstado === "function") saveDiarioEstado();
  if (typeof renderMapas === "function") renderMapas();
  setTimeout(() => {
    try {
      if (estado.mapPanel) { estado.mapPanel.invalidateSize(); }
      if (estado.mapRutas) { estado.mapRutas.invalidateSize(); }
      if (typeof renderMapas === "function") renderMapas();
    } catch (e) {}
  }, 200);
  let msg = estado.clientesHoy.length + " clientes en mapa · " + lineas.length + " líneas";
  if (sinPunto > 0) msg += " · " + sinPunto + " sin coordenadas/maestro";
  if (typeof toast === "function") toast(msg);
  if (typeof rellenarNombresTopesDesdeDiario === "function") {
    const nNom = rellenarNombresTopesDesdeDiario();
    if (nNom > 0 && typeof toast === "function") toast(nNom + " nombre(s) de SKU rellenados desde el Excel");
  }
  setTimeout(() => {
    if (typeof abrirSelectorCentro === "function" && !estado.origenActual) {
      abrirSelectorCentro({ forzar: false });
    }
  }, 350);
}

  window.construirHoy = construirHoy;
  console.info("[RUTALOG] construirHoy restaurado (core e638c98 + sinPunto)");
})();
