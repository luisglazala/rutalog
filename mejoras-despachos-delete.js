/* RUTALOG despachos-delete v1 — borrar viaje desde Despachos del día */
(function () {
  "use strict";
  if (window.__rutalogDespachosDeleteV1) return;
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

  function borrarViajeIdx(idx) {
    return (async function () {
      try {
        var v = estado.viajesGuardados[idx];
        if (!v) return;
        var ok = true;
        if (typeof confirmDialog === "function") {
          ok = await confirmDialog("¿Borrar " + (v.nombre || "este viaje") + "?\nLas líneas volverán al mapa.", {
            title: "Borrar viaje",
            danger: true
          });
        } else {
          ok = window.confirm("¿Borrar " + (v.nombre || "este viaje") + "?");
        }
        if (!ok) return;
        if (typeof restaurarLineasDeViaje === "function") restaurarLineasDeViaje(v);
        estado.viajesGuardados.splice(idx, 1);
        if (typeof renumerarViajes === "function") renumerarViajes();
        if (typeof saveViajes === "function") saveViajes();
        if (typeof saveDiarioEstado === "function") saveDiarioEstado();
        if (typeof refrescarRutaUI === "function") refrescarRutaUI();
        if (typeof renderDespachos === "function") renderDespachos();
        if (typeof renderMapas === "function") renderMapas();
        if (typeof toast === "function") toast("Viaje eliminado — líneas devueltas al mapa");
      } catch (e) {
        console.warn("[despachos-delete]", e);
      }
    })();
  }

  function injectButtons() {
    ensureHeader();
    var tb = document.getElementById("tbodyDespachos");
    if (!tb) return;
    var rows = tb.querySelectorAll("tr");
    var seen = {};
    rows.forEach(function (tr) {
      if (tr.querySelector(".col-acciones")) return;
      var td0 = tr.cells && tr.cells[0];
      if (!td0) return;
      var nombre = (td0.childNodes[0] && td0.childNodes[0].textContent
        ? td0.childNodes[0].textContent
        : td0.textContent || ""
      )
        .split("\n")[0]
        .trim();
      var td = document.createElement("td");
      td.className = "col-acciones";
      if (!nombre || nombre.indexOf("(sin guardar)") >= 0 || seen[nombre]) {
        td.innerHTML = "";
        tr.appendChild(td);
        return;
      }
      seen[nombre] = true;
      var idx = -1;
      try {
        idx = (estado.viajesGuardados || []).findIndex(function (v) {
          return String(v.nombre) === nombre;
        });
      } catch (e) {
        idx = -1;
      }
      if (idx < 0) {
        tr.appendChild(td);
        return;
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-del-viaje-desp";
      btn.dataset.idx = String(idx);
      btn.title = "Borrar " + nombre;
      btn.textContent = "Borrar";
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        borrarViajeIdx(Number(btn.dataset.idx));
      };
      td.appendChild(btn);
      tr.appendChild(td);
    });
  }

  function install() {
    if (typeof window.renderDespachos !== "function") return;
    if (window.renderDespachos._despDel) return;
    var orig = window.renderDespachos;
    window.renderDespachos = function () {
      var r = orig.apply(this, arguments);
      setTimeout(injectButtons, 20);
      setTimeout(injectButtons, 200);
      return r;
    };
    window.renderDespachos._despDel = true;
  }

  function forceTall() {
    try {
      var main = document.querySelector(".main") || document.querySelector(".content");
      if (main) {
        main.style.minHeight = "0";
        main.style.height = "100%";
        main.style.display = "flex";
        main.style.flexDirection = "column";
        main.style.overflow = "hidden";
      }
      var page = document.getElementById("page-despachos");
      if (page && page.classList.contains("active")) {
        page.style.flex = "1 1 auto";
        page.style.minHeight = "0";
        page.style.height = "100%";
        page.style.display = "flex";
        page.style.flexDirection = "column";
        page.style.overflow = "hidden";
        var card = page.querySelector(".card");
        if (card) {
          card.style.flex = "1 1 auto";
          card.style.minHeight = "0";
          card.style.display = "flex";
          card.style.flexDirection = "column";
          card.style.overflow = "hidden";
        }
        var wrap = page.querySelector(".table-wrap");
        if (wrap) {
          wrap.style.flex = "1 1 auto";
          wrap.style.minHeight = "0";
          wrap.style.overflow = "auto";
          wrap.style.height = "100%";
        }
      }
    } catch (e) {}
  }

  function tick() {
    install();
    injectButtons();
    forceTall();
  }
  tick();
  setTimeout(tick, 500);
  setTimeout(tick, 1500);
  setInterval(tick, 4000);

  if (typeof window.go === "function" && !window.go._despTall) {
    var g = window.go;
    window.go = function (page) {
      var r = g.apply(this, arguments);
      setTimeout(forceTall, 30);
      setTimeout(forceTall, 200);
      return r;
    };
    window.go._despTall = true;
  }

  console.info("[RUTALOG] despachos-delete v1 — borrar viaje desde tabla");
})();
