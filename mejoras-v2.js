/* RUTALOG mejoras-v2 — capa de mejoras (no modifica token ni export/import sesión) */
(function () {
  "use strict";

  var CAP_G = 12000;
  var CAP_P = 3000;
  var ready = false;

  function el(id) { return document.getElementById(id); }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toastSafe(msg) {
    if (typeof toast === "function") toast(msg);
    else console.log("[RUTALOG]", msg);
  }

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = (b[0] - a[0]) * Math.PI / 180;
    var dLon = (b[1] - a[1]) * Math.PI / 180;
    var la1 = a[0] * Math.PI / 180;
    var la2 = b[0] * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function getCapacidad() {
    var plant = "G";
    try {
      if (window.estado && estado.plantillaCamion) plant = estado.plantillaCamion;
    } catch (e) {}
    var kg = plant === "P" ? CAP_P : CAP_G;
    return { plant: plant, kgMax: kg, nombre: plant === "P" ? "Camión P" : "Camión G" };
  }

  function pesoViajeActual() {
    try {
      if (!window.estado || !estado.viajeActual) return 0;
      return estado.viajeActual.reduce(function (s, p) { return s + (Number(p.peso) || 0); }, 0);
    } catch (e) { return 0; }
  }

  function ensureCapacidadBadge() {
    var side = q(".side-panel");
    if (!side) return;
    var box = el("rutalogCapBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "rutalogCapBox";
      box.className = "rutalog-cap-box";
      var badges = side.querySelector("#badgeParadas");
      if (badges && badges.parentNode) {
        badges.parentNode.insertAdjacentElement("afterend", box);
      } else {
        side.insertBefore(box, side.firstChild);
      }
    }
    var cap = getCapacidad();
    var peso = pesoViajeActual();
    var pct = cap.kgMax > 0 ? (peso / cap.kgMax) * 100 : 0;
    var cls = "ok";
    if (pct >= 95) cls = "danger";
    else if (pct >= 80) cls = "warn";
    box.className = "rutalog-cap-box " + cls;
    box.innerHTML =
      '<div class="cap-row"><span>' + cap.nombre + "</span><strong>" +
      peso.toFixed(0) + " / " + cap.kgMax + " kg</strong></div>" +
      '<div class="cap-bar"><div class="cap-fill" style="width:' + Math.min(100, pct).toFixed(1) + '%"></div></div>' +
      '<div class="cap-pct">' + pct.toFixed(0) + "% capacidad</div>";
  }

  function ensureOptimizarBtn() {
    var side = q(".side-panel");
    if (!side || el("btnOptimizarRuta")) return;
    var row = side.querySelector("#btnDeshacer");
    if (!row || !row.parentNode) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btnOptimizarRuta";
    btn.className = "btn btn-secondary btn-sm";
    btn.style.cssText = "width:100%;margin-top:6px;";
    btn.title = "Reordenar paradas por vecino más cercano (desde el centro)";
    btn.innerHTML = "⚡ Optimizar orden";
    btn.disabled = true;
    row.parentNode.insertAdjacentElement("afterend", btn);
    btn.onclick = optimizarOrden;
  }

  function optimizarOrden() {
    try {
      if (!window.estado || !estado.viajeActual || estado.viajeActual.length < 3) {
        toastSafe("Se necesitan al menos 3 paradas para optimizar");
        return;
      }
      var pts = estado.viajeActual.slice();
      var start = null;
      if (estado.origenActual && estado.origenActual.lat != null) {
        start = [estado.origenActual.lat, estado.origenActual.lon];
      } else {
        start = [pts[0].lat, pts[0].lon];
      }
      var remaining = pts.slice();
      var ordered = [];
      var cur = start;
      while (remaining.length) {
        var bestI = 0;
        var bestD = Infinity;
        for (var i = 0; i < remaining.length; i++) {
          var d = haversineKm(cur, [remaining[i].lat, remaining[i].lon]);
          if (d < bestD) { bestD = d; bestI = i; }
        }
        var next = remaining.splice(bestI, 1)[0];
        ordered.push(next);
        cur = [next.lat, next.lon];
      }
      estado.viajeActual = ordered;
      if (typeof refrescarRutaUI === "function") refrescarRutaUI();
      if (typeof renderMapas === "function") renderMapas();
      else if (typeof pintarRutas === "function") pintarRutas();
      ensureCapacidadBadge();
      toastSafe("Orden optimizado (" + ordered.length + " paradas)");
    } catch (e) {
      console.error(e);
      toastSafe("No se pudo optimizar el orden");
    }
  }

  function syncOptimizarState() {
    var btn = el("btnOptimizarRuta");
    if (!btn) return;
    try {
      var n = (window.estado && estado.viajeActual) ? estado.viajeActual.length : 0;
      btn.disabled = n < 3;
    } catch (e) { btn.disabled = true; }
  }

  function onKey(e) {
    var tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        openGlobalSearch();
        return;
      }
      return;
    }
    if (e.key === "s" || e.key === "S") {
      var g = el("btnGuardarViaje");
      if (g && !g.disabled) { e.preventDefault(); g.click(); }
    } else if (e.key === "o" || e.key === "O") {
      var op = el("btnOptimizarRuta");
      if (op && !op.disabled) op.click();
    } else if (e.key === "Escape") {
      closeGlobalSearch();
      var audit = el("auditOverlay");
      if (audit && !audit.hidden) {
        var volver = el("btnAuditVolver");
        if (volver) volver.click();
      }
    }
  }

  function ensureSearchUI() {
    if (el("rutalogSearchOverlay")) return;
    var ov = document.createElement("div");
    ov.id = "rutalogSearchOverlay";
    ov.className = "rutalog-search-overlay";
    ov.hidden = true;
    ov.innerHTML =
      '<div class="rutalog-search-card">' +
      '<input type="search" id="rutalogSearchInput" placeholder="Buscar OV, cliente, ciudad, SKU…" autocomplete="off">' +
      '<div class="rutalog-search-hint">Ctrl+K · Enter para ir · Esc cerrar</div>' +
      '<ul id="rutalogSearchResults" class="rutalog-search-results"></ul>' +
      "</div>";
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) {
      if (e.target === ov) closeGlobalSearch();
    });
    var inp = el("rutalogSearchInput");
    if (inp) {
      inp.addEventListener("input", function () { renderSearchResults(inp.value); });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { closeGlobalSearch(); e.preventDefault(); }
        if (e.key === "Enter") {
          var first = q("#rutalogSearchResults li button");
          if (first) first.click();
        }
      });
    }
  }

  function openGlobalSearch() {
    ensureSearchUI();
    var ov = el("rutalogSearchOverlay");
    if (!ov) return;
    ov.hidden = false;
    var inp = el("rutalogSearchInput");
    if (inp) { inp.value = ""; inp.focus(); }
    renderSearchResults("");
  }

  function closeGlobalSearch() {
    var ov = el("rutalogSearchOverlay");
    if (ov) ov.hidden = true;
  }

  function renderSearchResults(qstr) {
    var ul = el("rutalogSearchResults");
    if (!ul) return;
    qstr = (qstr || "").trim().toLowerCase();
    if (!qstr || qstr.length < 2) {
      ul.innerHTML = '<li class="vacio">Escribe al menos 2 caracteres…</li>';
      return;
    }
    var hits = [];
    try {
      if (window.estado && estado.clientesHoy) {
        estado.clientesHoy.forEach(function (c) {
          var blob = [c.idCliente, c.nombre, c.ciudad, c.ovTexto, c.localidad].join(" ").toLowerCase();
          if (blob.indexOf(qstr) >= 0) {
            hits.push({
              tipo: "Hoy",
              titulo: (c.nombre || c.idCliente || "Cliente"),
              sub: (c.ovTexto || "") + (c.ciudad ? " · " + c.ciudad : ""),
              go: function () {
                var btn = document.querySelector('.nav button[data-page="rutas"]');
                if (btn) btn.click();
                setTimeout(function () {
                  if (estado.markersRutas && estado.markersRutas.get(c.idCliente)) {
                    var m = estado.markersRutas.get(c.idCliente);
                    if (estado.mapRutas) estado.mapRutas.setView(m.getLatLng(), 14);
                    m.openPopup();
                  }
                }, 300);
              }
            });
          }
        });
      }
      if (window.estado && estado.maestro) {
        var n = 0;
        estado.maestro.forEach(function (c) {
          if (n >= 12) return;
          var blob = [c.id, c.nombre, c.ciudad, c.localidad, c.zona].join(" ").toLowerCase();
          if (blob.indexOf(qstr) >= 0) {
            n++;
            hits.push({
              tipo: "Maestro",
              titulo: c.nombre || c.id,
              sub: (c.ciudad || "") + (c.id ? " · " + c.id : ""),
              go: function () {
                var btn = document.querySelector('.nav button[data-page="maestro"]');
                if (btn) btn.click();
                var qIn = el("qMaestro");
                if (qIn) {
                  qIn.value = c.nombre || c.id || "";
                  qIn.dispatchEvent(new Event("input", { bubbles: true }));
                }
              }
            });
          }
        });
      }
    } catch (e) { console.error(e); }
    if (!hits.length) {
      ul.innerHTML = '<li class="vacio">Sin resultados</li>';
      return;
    }
    ul.innerHTML = hits.slice(0, 20).map(function (h, i) {
      return '<li><button type="button" data-i="' + i + '"><span class="rs-tipo">' + h.tipo +
        '</span><span class="rs-tit">' + escapeHtml(h.titulo) + '</span><span class="rs-sub">' +
        escapeHtml(h.sub) + "</span></button></li>";
    }).join("");
    qa("button", ul).forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.dataset.i);
        closeGlobalSearch();
        if (hits[i] && hits[i].go) hits[i].go();
      };
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }

  function ensureOperadorToggle() {
    var top = q(".topbar");
    if (!top || el("btnModoOperador")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btnModoOperador";
    btn.className = "btn btn-secondary btn-sm";
    btn.title = "Oculta módulos avanzados (Config, Topes, Código, Citas)";
    btn.textContent = "Modo operador";
    var spacer = q(".topbar .spacer");
    if (spacer) spacer.insertAdjacentElement("afterend", btn);
    else top.appendChild(btn);
    btn.onclick = function () {
      document.documentElement.classList.toggle("rutalog-operador");
      var on = document.documentElement.classList.contains("rutalog-operador");
      try { localStorage.setItem("rutalog_modo_operador", on ? "1" : "0"); } catch (e) {}
      btn.textContent = on ? "Modo completo" : "Modo operador";
      toastSafe(on ? "Modo operador activo" : "Modo completo");
    };
    try {
      if (localStorage.getItem("rutalog_modo_operador") === "1") {
        document.documentElement.classList.add("rutalog-operador");
        btn.textContent = "Modo completo";
      }
    } catch (e) {}
  }

  function polishEmptyStates() {}

  function hookRefrescar() {
    if (typeof window.refrescarRutaUI === "function" && !window.refrescarRutaUI._mejoras) {
      var orig = window.refrescarRutaUI;
      window.refrescarRutaUI = function () {
        var r = orig.apply(this, arguments);
        try { ensureCapacidadBadge(); syncOptimizarState(); } catch (e) {}
        return r;
      };
      window.refrescarRutaUI._mejoras = true;
    }
  }

  function tick() {
    ensureOptimizarBtn();
    ensureCapacidadBadge();
    syncOptimizarState();
    ensureOperadorToggle();
    ensureSearchUI();
    polishEmptyStates();
    hookRefrescar();
  }

  function boot() {
    if (ready) return;
    ready = true;
    document.addEventListener("keydown", onKey);
    tick();
    setInterval(tick, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 800); });
  } else {
    setTimeout(boot, 800);
  }
  setTimeout(boot, 2000);
  setTimeout(boot, 4000);
})();
