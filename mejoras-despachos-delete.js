/* RUTALOG despachos-acciones v2
 * Por fila: quitar cliente del viaje.
 * Primera fila del viaje: también borrar viaje completo.
 */
(function () {
  "use strict";
  if (window.__rutalogDespachosDeleteV2) return;
  window.__rutalogDespachosDeleteV2 = true;
  window.__rutalogDespachosDeleteV1 = true;

  function ensureHeader() {
    var thead = document.querySelector("#page-despachos thead tr");
    if (!thead) return;
    if (thead.querySelector(".col-acciones")) return;
    var th = document.createElement("th");
    th.className = "col-acciones";
    th.textContent = "Acción";
    thead.appendChild(th);
  }

  function recalcularClienteHoy(idCliente) {
    try {
      var cli = (estado.clientesHoy || []).find(function (c) {
        return String(c.idCliente) === String(idCliente);
      });
      if (!cli) return;
      var pend = (estado.lineasPendientes.get(idCliente) || estado.lineasPendientes.get(String(idCliente)) || []).filter(
        function (l) {
          return !l.despachado && (l.aDespachar == null || Number(l.aDespachar) > 0);
        }
      );
      if (!pend.length) {
        cli.peso = 0;
        cli.ovs = [];
        cli.ovTexto = "";
        return;
      }
      var porOV = {};
      pend.forEach(function (l) {
        var q = l.aDespachar != null ? l.aDespachar : l.cantidad;
        var pw = (l.pesoUnit || 0) * q;
        if (!porOV[l.ov]) porOV[l.ov] = { ov: l.ov, peso: 0, estado: l.estado || "" };
        porOV[l.ov].peso += pw;
      });
      cli.ovs = Object.values(porOV);
      cli.peso = cli.ovs.reduce(function (s, o) { return s + o.peso; }, 0);
      cli.ovTexto = cli.ovs.map(function (o) { return o.ov; }).join(", ");
    } catch (e) {}
  }

  function restaurarParada(p) {
    if (!p) return;
    var lineas = p.lineas || [];
    if (lineas.length) {
      lineas.forEach(function (ln) {
        if (!ln.lineId || String(ln.lineId).indexOf("SYN-") === 0) return;
        var pend = estado.lineasPendientes.get(p.idCliente) || estado.lineasPendientes.get(String(p.idCliente)) || [];
        var orig = pend.find(function (x) { return x.lineId === ln.lineId; });
        if (!orig) {
          orig = {
            lineId: ln.lineId, ov: ln.ov, idCliente: p.idCliente, sku: ln.sku, producto: ln.producto,
            cantidad: ln.cantidadOriginal != null ? ln.cantidadOriginal : ln.cantidad,
            unidad: ln.unidad,
            pesoUnit: ln.peso && ln.cantidad ? ln.peso / ln.cantidad : 0,
            peso: 0, alma: ln.alma || "", estado: "", despachado: false, aDespachar: 0
          };
          pend.push(orig);
          estado.lineasPendientes.set(p.idCliente, pend);
        }
        var qty = Number(ln.cantidad) || 0;
        orig.aDespachar = (Number(orig.aDespachar) || 0) + qty;
        orig.despachado = false;
        orig.peso = (orig.pesoUnit || 0) * orig.aDespachar;
      });
    }
    recalcularClienteHoy(p.idCliente);
  }

  function afterChange() {
    if (typeof renumerarViajes === "function") renumerarViajes();
    if (typeof saveViajes === "function") saveViajes();
    if (typeof saveDiarioEstado === "function") saveDiarioEstado();
    if (typeof refrescarRutaUI === "function") refrescarRutaUI();
    if (typeof renderDespachos === "function") renderDespachos();
    if (typeof renderMapas === "function") renderMapas();
  }

  function borrarViajeCompleto(idx) {
    return (async function () {
      var v = estado.viajesGuardados[idx];
      if (!v) return;
      var ok = true;
      if (typeof confirmDialog === "function") {
        ok = await confirmDialog("¿Borrar " + (v.nombre || "este viaje") + " completo?\nTodos los clientes vuelven al mapa.", {
          title: "Borrar viaje", danger: true
        });
      } else ok = window.confirm("¿Borrar viaje completo?");
      if (!ok) return;
      if (typeof restaurarLineasDeViaje === "function") restaurarLineasDeViaje(v);
      else (v.paradas || []).forEach(restaurarParada);
      estado.viajesGuardados.splice(idx, 1);
      afterChange();
      if (typeof toast === "function") toast("Viaje eliminado");
    })();
  }

  function quitarCliente(idxViaje, idCliente) {
    return (async function () {
      var v = estado.viajesGuardados[idxViaje];
      if (!v || !v.paradas) return;
      var pi = v.paradas.findIndex(function (p) {
        return String(p.idCliente) === String(idCliente);
      });
      if (pi < 0) return;
      var p = v.paradas[pi];
      var ok = true;
      if (typeof confirmDialog === "function") {
        ok = await confirmDialog(
          "¿Quitar a " + (p.nombre || idCliente) + " de " + (v.nombre || "este viaje") + "?\nSus líneas vuelven al mapa.",
          { title: "Quitar cliente", danger: true }
        );
      } else ok = window.confirm("¿Quitar cliente del viaje?");
      if (!ok) return;
      restaurarParada(p);
      v.paradas.splice(pi, 1);
      if (!v.paradas.length) {
        estado.viajesGuardados.splice(idxViaje, 1);
        if (typeof toast === "function") toast("Viaje vacío eliminado");
      } else if (typeof toast === "function") toast("Cliente quitado del viaje");
      afterChange();
    })();
  }

  function nombreViajeDeCelda(td0) {
    if (!td0) return "";
    return (td0.childNodes[0] && td0.childNodes[0].textContent
      ? td0.childNodes[0].textContent
      : td0.textContent || ""
    ).split("\n")[0].trim();
  }

  function injectButtons() {
    ensureHeader();
    var tb = document.getElementById("tbodyDespachos");
    if (!tb) return;
    var rows = Array.prototype.slice.call(tb.querySelectorAll("tr"));
    var firstOfTrip = {};
    rows.forEach(function (tr) {
      var old = tr.querySelector(".col-acciones");
      if (old) old.remove();
      var td0 = tr.cells && tr.cells[0];
      var tdCli = tr.cells && tr.cells[2];
      if (!td0) return;
      var nombre = nombreViajeDeCelda(td0);
      if (!nombre || nombre.indexOf("(sin guardar)") >= 0) {
        var empty = document.createElement("td");
        empty.className = "col-acciones";
        tr.appendChild(empty);
        return;
      }
      var idx = -1;
      try {
        idx = (estado.viajesGuardados || []).findIndex(function (v) {
          return String(v.nombre) === nombre;
        });
      } catch (e) { idx = -1; }
      var idCliente = tdCli ? String(tdCli.textContent || "").trim() : "";
      var td = document.createElement("td");
      td.className = "col-acciones";
      td.style.whiteSpace = "nowrap";
      if (idx >= 0 && idCliente) {
        var btnCli = document.createElement("button");
        btnCli.type = "button";
        btnCli.className = "btn-del-viaje-desp btn-quitar-cli";
        btnCli.title = "Quitar solo este cliente del viaje";
        btnCli.textContent = "Cliente";
        btnCli.onclick = function (e) {
          e.preventDefault(); e.stopPropagation();
          quitarCliente(idx, idCliente);
        };
        td.appendChild(btnCli);
      }
      if (idx >= 0 && !firstOfTrip[nombre]) {
        firstOfTrip[nombre] = true;
        var btnV = document.createElement("button");
        btnV.type = "button";
        btnV.className = "btn-del-viaje-desp btn-borrar-viaje";
        btnV.title = "Borrar viaje completo";
        btnV.textContent = "Viaje";
        btnV.style.marginLeft = "4px";
        btnV.onclick = function (e) {
          e.preventDefault(); e.stopPropagation();
          borrarViajeCompleto(idx);
        };
        td.appendChild(btnV);
      }
      tr.appendChild(td);
    });
  }

  function forceTall() {
    try {
      var main = document.querySelector(".main") || document.querySelector(".content");
      if (main) {
        main.style.minHeight = "0"; main.style.height = "100%";
        main.style.display = "flex"; main.style.flexDirection = "column";
        main.style.overflow = "hidden";
      }
      var page = document.getElementById("page-despachos");
      if (page && page.classList.contains("active")) {
        page.style.flex = "1 1 auto"; page.style.minHeight = "0"; page.style.height = "100%";
        page.style.display = "flex"; page.style.flexDirection = "column"; page.style.overflow = "hidden";
        var card = page.querySelector(".card");
        if (card) {
          card.style.flex = "1 1 auto"; card.style.minHeight = "0";
          card.style.display = "flex"; card.style.flexDirection = "column"; card.style.overflow = "hidden";
        }
        var wrap = page.querySelector(".table-wrap");
        if (wrap) {
          wrap.style.flex = "1 1 auto"; wrap.style.minHeight = "0";
          wrap.style.overflow = "auto"; wrap.style.height = "100%";
        }
      }
    } catch (e) {}
  }

  function install() {
    if (typeof window.renderDespachos !== "function") return;
    if (window.renderDespachos._despDelV2) return;
    var orig = window.renderDespachos;
    window.renderDespachos = function () {
      var r = orig.apply(this, arguments);
      setTimeout(injectButtons, 20);
      setTimeout(injectButtons, 200);
      setTimeout(forceTall, 30);
      return r;
    };
    window.renderDespachos._despDelV2 = true;
    window.renderDespachos._despDel = true;
  }

  function tick() { install(); injectButtons(); forceTall(); }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('despachos:delete', tick, { cada: 4000, vista: 'despachos' }); else setInterval(tick, 4000);
  console.info("[RUTALOG] despachos-acciones v2 — quitar cliente o borrar viaje");
})();
