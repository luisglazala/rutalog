/* RUTALOG mejoras-v2 v8b — capa de mejoras */
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
      if (badges && badges.parentNode) badges.parentNode.insertAdjacentElement("afterend", box);
      else side.insertBefore(box, side.firstChild);
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
    btn.title = "Reordenar paradas por vecino más cercano";
    btn.innerHTML = "Optimizar orden de paradas";
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
        var bestI = 0, bestD = Infinity;
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
      if (e.key === "k" || e.key === "K") { e.preventDefault(); openGlobalSearch(); }
      return;
    }
    if (e.key === "s" || e.key === "S") {
      var g = el("btnGuardarViaje");
      if (g && !g.disabled) { e.preventDefault(); g.click(); }
    } else if (e.key === "o" || e.key === "O") {
      var op = el("btnOptimizarRuta");
      if (op && !op.disabled) op.click();
    } else if (e.key === "Escape") closeGlobalSearch();
  }

  function ensureSearchUI() {
    if (el("rutalogSearchOverlay")) return;
    var ov = document.createElement("div");
    ov.id = "rutalogSearchOverlay";
    ov.className = "rutalog-search-overlay";
    ov.hidden = true;
    ov.innerHTML =
      '<div class="rutalog-search-card">' +
      '<input type="search" id="rutalogSearchInput" placeholder="Buscar OV, cliente, ciudad…" autocomplete="off">' +
      '<div class="rutalog-search-hint">Ctrl+K · Enter · Esc</div>' +
      '<ul id="rutalogSearchResults" class="rutalog-search-results"></ul></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) closeGlobalSearch(); });
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

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&"+"amp;")
      .replace(/</g, "&"+"lt;")
      .replace(/>/g, "&"+"gt;")
      .replace(/"/g, "&"+"quot;");
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
              }
            });
          }
        });
      }
    } catch (e) {}
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

  function ensureOperadorToggle() {
    var top = q(".topbar");
    if (!top || el("btnModoOperador")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btnModoOperador";
    btn.className = "btn btn-secondary btn-sm";
    btn.title = "Oculta módulos avanzados";
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

  /* ---- Centro obligatorio + ligas de zonas Norte / Sur / Este ---- */
  var ZONAS_LIGADAS = [
    /* Zona Norte / La Vega */
    ["Santiago", "Tamboril", "Valverde", "Tavera", "Mao"],
    ["Puerto Plata"],
    ["Espaillat", "Hermanas Mirabal", "Salcedo", "Tenares", "Villa Tapia", "Moca"],
    ["Dajabón", "Santiago Rodríguez", "Monte Cristi", "Esperanza"],
    ["San Francisco de Macorís", "Cenoví", "Villa Arriba", "Villa Riva", "Arenoso", "Nagua"],
    ["María Trinidad Sánchez", "Samaná", "Las Terrenas"],
    ["Piedra Blanca", "Bonao", "Maimón", "Monseñor Nouel"],
    ["Monseñor Nouel", "San José de Ocoa"],
    ["La Vega", "Jarabacoa", "Constanza", "La Canela"],
    ["Cotuí", "Sánchez Ramírez"],
    /* Zona Sur MAY STD */
    ["Santo Domingo", "San Cristóbal", "Distrito Nacional", "Santo Domingo Este", "Santo Domingo Oeste", "Santo Domingo Norte", "Villa Mella"],
    ["Yamasá", "Monte Plata", "Santo Domingo"],
    ["Baní", "Peravia", "San José de Ocoa", "Azua", "Padre Las Casas", "Las Yayas de Viajama", "Las Charcas"],
    ["Azua", "Baní"],
    ["Bahoruco", "Independencia", "Vicente Noble", "Duvergé", "Elías Piña", "San Juan", "Barahona", "Pedernales", "Enriquillo", "Comendador"],
    ["Bahoruco", "Independencia", "Azua"],
    /* Zona Este */
    ["La Romana", "Higüey", "Bávaro", "Punta Cana"],
    ["San Pedro de Macorís", "La Romana", "Hato Mayor"],
    ["San Pedro de Macorís", "Hato Mayor"],
    ["Hato Mayor", "Miches", "El Seibo"]
  ];

  function normCity(s) {
    return String(s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function ligadasDe(ciudad) {
    var qn = normCity(ciudad);
    if (!qn) return [];
    var out = {};
    ZONAS_LIGADAS.forEach(function (grupo) {
      var hit = grupo.some(function (g) {
        var ng = normCity(g);
        return ng === qn || ng.indexOf(qn) >= 0 || qn.indexOf(ng) >= 0;
      });
      if (hit) grupo.forEach(function (g) { out[g] = true; });
    });
    return Object.keys(out);
  }

  function ensureCentroPrompt() {
    try {
      if (!window.estado) return;
      if (estado.origenActual) return;
      if (typeof abrirSelectorCentro === "function") abrirSelectorCentro({ forzar: true });
    } catch (e) {}
  }

  function hookConstruirHoy() {
    if (typeof window.construirHoy !== "function" || window.construirHoy._ligaZonas) return;
    var orig = window.construirHoy;
    window.construirHoy = function () {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        ensureCentroPrompt();
        enhanceCiudadFilter();
      }, 400);
      return r;
    };
    window.construirHoy._ligaZonas = true;
  }

  function enhanceCiudadFilter() {
    var lista = el("listaCiudades");
    if (!lista || lista._ligaBound) return;
    lista._ligaBound = true;
    lista.addEventListener("change", function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains("chk-ciudad") || !t.checked) return;
      var ligadas = ligadasDe(t.value);
      if (!ligadas.length) return;
      var disponibles = {};
      qa(".chk-ciudad", lista).forEach(function (chk) {
        disponibles[normCity(chk.value)] = chk;
      });
      var sugeridas = [];
      ligadas.forEach(function (name) {
        var n = normCity(name);
        Object.keys(disponibles).forEach(function (k) {
          if (k === n || k.indexOf(n) >= 0 || n.indexOf(k) >= 0) sugeridas.push(disponibles[k]);
        });
      });
      if (!sugeridas.length) return;
      qa(".ciu-chip", lista).forEach(function (lab) { lab.classList.remove("ciu-sugerida"); });
      sugeridas.forEach(function (chk) {
        if (chk.parentNode) chk.parentNode.classList.add("ciu-sugerida");
      });
      var bar = el("rutalogLigasBar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "rutalogLigasBar";
        bar.className = "rutalog-ligas-bar";
        lista.parentNode.insertBefore(bar, lista);
      }
      var names = [];
      var seen = {};
      sugeridas.forEach(function (c) {
        if (!seen[c.value]) { seen[c.value] = 1; names.push(c.value); }
      });
      bar.innerHTML = '<span class="ligas-label">Se pueden ligar con <strong>' + escapeHtml(t.value) +
        '</strong>:</span> <span class="ligas-names">' + names.map(escapeHtml).join(", ") +
        '</span> <button type="button" class="btn btn-primary btn-sm" id="btnAplicarLigas">Seleccionar ligadas</button>';
      var btn = el("btnAplicarLigas");
      if (btn) {
        btn.onclick = function () {
          sugeridas.forEach(function (chk) { chk.checked = true; });
          var todas = el("chkTodasCiudades");
          if (todas) todas.checked = false;
          if (typeof actualizarLabelCiudad === "function") actualizarLabelCiudad();
          if (typeof renderMapas === "function") renderMapas();
          toastSafe("Ciudades ligadas seleccionadas");
        };
      }
    });
  }

  function ensureLigasCSS() {
    if (el("rutalog-ligas-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-ligas-css";
    st.textContent =
      ".ciu-chip.ciu-sugerida{outline:2px solid #16a34a;background:rgba(22,163,74,.12)}" +
      ".rutalog-ligas-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;margin-bottom:10px;" +
      "background:#0f172a;border:1px solid #1f2937;border-radius:10px;font-size:13px;color:#e5e5e5}" +
      ".rutalog-ligas-bar .ligas-names{color:#86efac;font-weight:600}" +
      ".rutalog-ligas-bar .btn{margin-left:auto}";
    document.head.appendChild(st);
  }

  function onPageChange() {
    try {
      if (window.estado && estado.page === "rutas") {
        setTimeout(ensureCentroPrompt, 500);
        setTimeout(enhanceCiudadFilter, 600);
      }
    } catch (e) {}
  }

  function hookNav() {
    qa(".nav button").forEach(function (b) {
      if (b._ligaNav) return;
      b._ligaNav = true;
      b.addEventListener("click", function () { setTimeout(onPageChange, 300); });
    });
  }

  function tick() {
    ensureLigasCSS();
    hookConstruirHoy();
    hookNav();
    enhanceCiudadFilter();
    ensureOptimizarBtn();
    ensureCapacidadBadge();
    syncOptimizarState();
    ensureOperadorToggle();
    ensureSearchUI();
    hookRefrescar();
  }

  function boot() {
    if (ready) return;
    ready = true;
    document.addEventListener("keydown", onKey);
    ensureLigasCSS();
    hookConstruirHoy();
    hookNav();
    tick();
    setTimeout(ensureCentroPrompt, 1200);
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
