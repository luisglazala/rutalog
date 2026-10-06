/* RUTALOG mejoras-v2 v11 — centro solo al cargar Excel Dynamics */
(function () {
  "use strict";
  if (window.__rutalogMejorasV11) return;
  window.__rutalogMejorasV11 = true;

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

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&"+"amp;")
      .replace(/</g, "&"+"lt;")
      .replace(/>/g, "&"+"gt;")
      .replace(/"/g, "&"+"quot;");
  }

  function injectCentroCSS() {
    if (el("rutalog-centro-css")) return;
    var st = document.createElement("style");
    st.id = "rutalog-centro-css";
    st.textContent = [
      ".centro-overlay{position:fixed!important;inset:0!important;background:rgba(0,0,0,.72)!important;z-index:20000!important;",
      "display:flex!important;align-items:center!important;justify-content:center!important;padding:24px!important;}",
      ".centro-overlay[hidden]{display:none!important;}",
      ".centro-modal{background:#171717!important;color:#fafafa!important;border:1px solid #1f1f1f!important;border-radius:16px!important;",
      "width:min(520px,94vw)!important;max-height:min(90vh,640px)!important;box-shadow:0 24px 60px rgba(0,0,0,.55)!important;",
      "overflow:hidden!important;display:flex!important;flex-direction:column!important;}",
      ".centro-modal .body{padding:22px 22px 12px!important;overflow:auto!important;flex:1!important;}",
      ".centro-modal h2{font-size:18px!important;font-weight:700!important;margin:0 0 8px!important;color:#fafafa!important;}",
      ".centro-modal .sub{font-size:13px!important;color:#a3a3a3!important;margin:0 0 18px!important;line-height:1.45!important;}",
      ".centro-opciones{display:flex!important;flex-direction:column!important;gap:12px!important;}",
      ".centro-opt{display:flex!important;align-items:flex-start!important;gap:14px!important;padding:14px 16px!important;",
      "border:2px solid #2a2a2a!important;border-radius:12px!important;cursor:pointer!important;",
      "background:#0f0f0f!important;color:#fafafa!important;text-align:left!important;font-family:inherit!important;width:100%!important;}",
      ".centro-opt:hover{border-color:#525252!important;background:#1a1a1a!important;}",
      ".centro-opt .ico-box{width:42px!important;height:42px!important;border-radius:10px!important;display:flex!important;",
      "align-items:center!important;justify-content:center!important;flex-shrink:0!important;}",
      ".centro-opt .txt strong{display:block!important;font-size:15px!important;margin-bottom:4px!important;color:#fafafa!important;}",
      ".centro-opt .txt span{font-size:12px!important;color:#a3a3a3!important;line-height:1.35!important;}",
      ".centro-modal .foot{padding:14px 20px!important;border-top:1px solid #1f1f1f!important;background:#111!important;",
      "display:flex!important;justify-content:flex-end!important;gap:8px!important;}",
      ".rutalog-cap-box{margin:10px 0;padding:10px 12px;border-radius:10px;background:#0f0f0f;border:1px solid #1f1f1f;}",
      ".rutalog-cap-box .cap-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;}",
      ".rutalog-cap-box .cap-bar{height:8px;background:#262626;border-radius:99px;overflow:hidden;}",
      ".rutalog-cap-box .cap-fill{height:100%;background:#22c55e;border-radius:99px;transition:width .2s;}",
      ".rutalog-cap-box.warn .cap-fill{background:#fbbf24;}",
      ".rutalog-cap-box.danger .cap-fill{background:#f87171;}",
      ".rutalog-cap-box .cap-pct{font-size:11px;color:#a3a3a3;margin-top:4px;}",
      ".rutalog-plantilla-row{display:flex;gap:8px;margin:8px 0 4px;}",
      ".rutalog-plantilla-row button{flex:1;padding:8px 10px;border-radius:8px;border:2px solid #2a2a2a;background:#0f0f0f;color:#fafafa;cursor:pointer;font-size:13px;font-weight:600;}",
      ".rutalog-plantilla-row button.active{border-color:#22c55e;background:#052e16;}",
      ".ciu-chip.ciu-sugerida{outline:2px solid #16a34a;background:rgba(22,163,74,.12)}",
      ".rutalog-ligas-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;margin-bottom:10px;",
      "background:#0f172a;border:1px solid #1f2937;border-radius:10px;font-size:13px;color:#e5e5e5}",
      ".rutalog-ligas-bar .ligas-names{color:#86efac;font-weight:600}",
      ".rutalog-ligas-bar .btn{margin-left:auto}",
      ".confirm-overlay{z-index:21000!important;}",
      ".audit-overlay{z-index:19000!important;}"
    ].join("");
    document.head.appendChild(st);
  }

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = (b[0] - a[0]) * Math.PI / 180;
    var dLon = (b[1] - a[1]) * Math.PI / 180;
    var la1 = a[0] * Math.PI / 180, la2 = b[0] * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function getCapacidad() {
    var plant = "G";
    try { if (window.estado && estado.plantillaCamion) plant = estado.plantillaCamion; } catch (e) {}
    var kg = plant === "P" ? CAP_P : CAP_G;
    return { plant: plant, kgMax: kg, nombre: plant === "P" ? "Camión P (pequeño)" : "Camión G (grande)" };
  }

  function pesoViajeActual() {
    try {
      if (!window.estado || !estado.viajeActual) return 0;
      return estado.viajeActual.reduce(function (s, p) { return s + (Number(p.peso) || 0); }, 0);
    } catch (e) { return 0; }
  }

  function ensurePlantillaRow(side) {
    if (el("rutalogPlantillaRow")) return;
    var row = document.createElement("div");
    row.id = "rutalogPlantillaRow";
    row.className = "rutalog-plantilla-row";
    row.innerHTML =
      '<button type="button" data-p="G" id="btnPlantillaG">Camión G · 12 t</button>' +
      '<button type="button" data-p="P" id="btnPlantillaP">Camión P · 3 t</button>';
    var cap = el("rutalogCapBox");
    if (cap) cap.insertAdjacentElement("beforebegin", row);
    else side.insertBefore(row, side.firstChild);
    function sync() {
      var p = (window.estado && estado.plantillaCamion) || "G";
      var g = el("btnPlantillaG"), pe = el("btnPlantillaP");
      if (g) g.classList.toggle("active", p !== "P");
      if (pe) pe.classList.toggle("active", p === "P");
    }
    row.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        if (!window.estado) return;
        estado.plantillaCamion = b.getAttribute("data-p");
        try { localStorage.setItem("rutalog_plantilla", estado.plantillaCamion); } catch (e) {}
        sync();
        ensureCapacidadBadge();
        toastSafe("Plantilla: " + (estado.plantillaCamion === "P" ? "Camión P (pequeño)" : "Camión G (grande)"));
      };
    });
    try {
      var saved = localStorage.getItem("rutalog_plantilla");
      if (saved && window.estado) estado.plantillaCamion = saved;
    } catch (e) {}
    sync();
  }

  function ensureCapacidadBadge() {
    var side = q(".side-panel");
    if (!side) return;
    var box = el("rutalogCapBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "rutalogCapBox";
      var badges = side.querySelector("#badgeParadas");
      if (badges && badges.parentNode) badges.parentNode.insertAdjacentElement("afterend", box);
      else side.insertBefore(box, side.firstChild);
    }
    ensurePlantillaRow(side);
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

  function ensureCentroPrompt(forzar) {
    injectCentroCSS();
    try {
      if (!window.estado) return;
      if (estado.origenActual && !forzar) return;
      if (typeof abrirSelectorCentro === "function") {
        abrirSelectorCentro({ forzar: !!forzar });
        var ov = el("centroOverlay");
        if (ov) { ov.hidden = false; ov.style.display = "flex"; }
      }
    } catch (e) { console.warn(e); }
  }

  function hookPlanificador() {
    /* No pedir centro al navegar/recargar; solo al cargar Excel (construirHoy) */
  }

  function hookConstruirHoy() {
    if (typeof window.construirHoy !== "function" || window.construirHoy._v11) return;
    var orig = window.construirHoy;
    window.construirHoy = function () {
      var r = orig.apply(this, arguments);
      /* Tras cargar Excel Dynamics: pedir centro si aún no hay origen */
      setTimeout(function () {
        try {
          if (window.estado && !estado.origenActual) ensureCentroPrompt(true);
        } catch (e) {}
        enhanceCiudadFilter();
      }, 500);
      return r;
    };
    window.construirHoy._v11 = true;
  }

  var ZONAS_LIGADAS = [
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
    ["Santo Domingo", "San Cristóbal", "Distrito Nacional", "Santo Domingo Este", "Santo Domingo Oeste", "Santo Domingo Norte", "Villa Mella"],
    ["Yamasá", "Monte Plata", "Santo Domingo"],
    ["Baní", "Peravia", "San José de Ocoa", "Azua", "Padre Las Casas", "Las Yayas de Viajama", "Las Charcas"],
    ["Azua", "Baní"],
    ["Bahoruco", "Independencia", "Vicente Noble", "Duvergé", "Elías Piña", "San Juan", "Barahona", "Pedernales", "Enriquillo", "Comendador"],
    ["La Romana", "Higüey", "Bávaro", "Punta Cana"],
    ["San Pedro de Macorís", "La Romana", "Hato Mayor"],
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
      qa(".chk-ciudad", lista).forEach(function (chk) { disponibles[normCity(chk.value)] = chk; });
      var sugeridas = [];
      ligadas.forEach(function (name) {
        var n = normCity(name);
        Object.keys(disponibles).forEach(function (k) {
          if (k === n || k.indexOf(n) >= 0 || n.indexOf(k) >= 0) sugeridas.push(disponibles[k]);
        });
      });
      if (!sugeridas.length) return;
      qa(".ciu-chip", lista).forEach(function (lab) { lab.classList.remove("ciu-sugerida"); });
      sugeridas.forEach(function (chk) { if (chk.parentNode) chk.parentNode.classList.add("ciu-sugerida"); });
      var bar = el("rutalogLigasBar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "rutalogLigasBar";
        bar.className = "rutalog-ligas-bar";
        lista.parentNode.insertBefore(bar, lista);
      }
      var names = [], seen = {};
      sugeridas.forEach(function (c) { if (!seen[c.value]) { seen[c.value] = 1; names.push(c.value); } });
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
    btn.textContent = "Optimizar orden de paradas";
    btn.disabled = true;
    row.parentNode.insertAdjacentElement("afterend", btn);
    btn.onclick = function () {
      try {
        if (!estado.viajeActual || estado.viajeActual.length < 3) {
          toastSafe("Se necesitan al menos 3 paradas");
          return;
        }
        var pts = estado.viajeActual.slice();
        var start = estado.origenActual && estado.origenActual.lat != null
          ? [estado.origenActual.lat, estado.origenActual.lon]
          : [pts[0].lat, pts[0].lon];
        var remaining = pts.slice(), ordered = [], cur = start;
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
        toastSafe("Orden optimizado");
      } catch (e) { console.error(e); }
    };
  }

  function syncOptimizarState() {
    var btn = el("btnOptimizarRuta");
    if (!btn) return;
    try { btn.disabled = !(estado.viajeActual && estado.viajeActual.length >= 3); } catch (e) { btn.disabled = true; }
  }

  function tick() {
    injectCentroCSS();
    hookPlanificador();
    hookConstruirHoy();
    enhanceCiudadFilter();
    ensureOptimizarBtn();
    ensureCapacidadBadge();
    syncOptimizarState();
  }

  function boot() {
    if (ready) return;
    ready = true;
    tick();
    /* Centro solo al cargar Excel Dynamics (construirHoy), no al recargar la página */
    if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('ui:v2', tick, { cada: 2000, vista: 'siempre' }); else setInterval(tick, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 600); });
  } else setTimeout(boot, 600);
  setTimeout(boot, 1800);
  setTimeout(boot, 3500);
})();
