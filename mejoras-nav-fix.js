/* RUTALOG nav-fix v5 — Inicio síncrono; go no pisa el título; mapas diferidos */
(function () {
  "use strict";
  if (window.__rutalogNavFixV5) return;
  window.__rutalogNavFixV5 = true;
  window.__rutalogNavFixV4 = true;

  var TITLES = {
    panel: "Inicio",
    rutas: "Mapa de rutas",
    despachos: "Despachos del día",
    maestro: "Maestro de clientes",
    citas: "Citas",
    topes: "Topes de carga SKU",
    codigo: "Código SKU",
    cruzados: "Viajes cruzados",
    reserva: "% Reserva física por OV",
    config: "Configuración"
  };
  var lastPage = "";

  function applyTitle(page) {
    try {
      var t = document.getElementById("pageTitle");
      if (t) t.textContent = TITLES[page] || page;
      document.querySelectorAll('.nav button[data-page="panel"] .nav-label').forEach(function (n) {
        n.textContent = "Inicio";
      });
    } catch (e) {}
  }

  function showPage(page) {
    if (!page) return false;
    var target = document.getElementById("page-" + page);
    if (!target) return false;
    try { if (window.estado) estado.page = page; } catch (e) {}
    document.querySelectorAll(".nav button[data-page]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-page") === page);
    });
    document.querySelectorAll(".page").forEach(function (p) {
      var on = p.id === "page-" + page;
      p.classList.toggle("active", on);
      if (on) {
        p.style.setProperty("display", "flex", "important");
        p.style.setProperty("visibility", "visible", "important");
        p.style.setProperty("opacity", "1", "important");
        p.style.setProperty("pointer-events", "auto", "important");
        p.removeAttribute("hidden");
      } else {
        p.style.setProperty("display", "none", "important");
      }
    });
    applyTitle(page);
    return true;
  }

  function lightMapTouch(page) {
    try {
      if (page === "rutas" && window.estado && estado.mapRutas && estado.mapRutas.invalidateSize) {
        estado.mapRutas.invalidateSize(false);
      } else if (page === "panel" && window.estado && estado.mapPanel && estado.mapPanel.invalidateSize) {
        estado.mapPanel.invalidateSize(false);
      } else if (page === "cruzados" && window.estado && estado.mapCruzados && estado.mapCruzados.invalidateSize) {
        estado.mapCruzados.invalidateSize(false);
      }
    } catch (e) {}
  }

  function safeGo(page) {
    if (!page) return;
    if (page === lastPage) { showPage(page); return; }
    lastPage = page;
    showPage(page);
    applyTitle(page);
    requestAnimationFrame(function () { lightMapTouch(page); });
    setTimeout(function () {
      try {
        window.__rutalogNavSilent = true;
        if (typeof window.go === "function") {
          try { window.go(page); } catch (eGo) {}
        }
      } catch (e) {
        console.warn("[nav-fix] go", e);
      }
      applyTitle(page);
      showPage(page);
      setTimeout(function () {
        applyTitle(page);
        window.__rutalogNavSilent = false;
        lightMapTouch(page);
      }, 0);
      setTimeout(function () { applyTitle(page); }, 50);
    }, 0);
  }

  window.rutalogGo = safeGo;
  window.rutalogShowPage = showPage;

  function onNav(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var btn = t.closest(".nav button[data-page], .nav [data-page]");
    if (!btn) return;
    var page = btn.getAttribute("data-page");
    if (!page) return;
    ev.preventDefault();
    ev.stopPropagation();
    safeGo(page);
  }
  document.addEventListener("click", onNav, true);

  function wireButtons() {
    document.querySelectorAll(".nav button[data-page]").forEach(function (b) {
      if (b.__navFixV5) return;
      b.__navFixV5 = true;
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        safeGo(b.getAttribute("data-page"));
      }, true);
    });
    applyTitle(window.estado && estado.page ? estado.page : "panel");
  }
  wireButtons();
  setTimeout(wireButtons, 400);
  setTimeout(wireButtons, 1500);

  function patchCoreGoTitles() {
    if (typeof window.go !== "function" || window.go._navTitleV5) return;
    var orig = window.go;
    window.go = function (page) {
      var r = orig.apply(this, arguments);
      applyTitle(page);
      return r;
    };
    window.go._navTitleV5 = true;
  }
  patchCoreGoTitles();
  setTimeout(patchCoreGoTitles, 500);
  setTimeout(patchCoreGoTitles, 2000);

  console.info("[RUTALOG] nav-fix v5 — Inicio síncrono, sin flash Panel");
})();
