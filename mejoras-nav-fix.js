/* RUTALOG nav-fix — cambio de panel fiable (delegación + estilos forzados) */
(function () {
  "use strict";
  if (window.__rutalogNavFixV1) return;
  window.__rutalogNavFixV1 = true;

  function showPage(page) {
    if (!page) return;
    try {
      if (window.estado) estado.page = page;
    } catch (e) {}

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
        p.removeAttribute("hidden");
      } else {
        p.style.setProperty("display", "none", "important");
      }
    });

    try {
      var titles = {
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
      var t = document.getElementById("pageTitle");
      if (t) t.textContent = titles[page] || page;
    } catch (e2) {}

    try {
      if (page === "rutas" && window.estado && estado.mapRutas) {
        setTimeout(function () {
          try { estado.mapRutas.invalidateSize(false); } catch (e) {}
          try {
            if (typeof renderMapas === "function") renderMapas();
          } catch (e) {}
        }, 50);
      }
      if (page === "panel" && window.estado && estado.mapPanel) {
        setTimeout(function () {
          try { estado.mapPanel.invalidateSize(false); } catch (e) {}
        }, 50);
      }
    } catch (e3) {}
  }

  function safeGo(page) {
    if (!page) return;
    /* 1) Intentar go global (permisos, etc.) */
    var usedGo = false;
    try {
      if (typeof window.go === "function") {
        window.go(page);
        usedGo = true;
      }
    } catch (e) {
      console.warn("[nav-fix] window.go", e);
    }
    /* 2) Siempre reforzar visibilidad del panel pedido */
    showPage(page);
    /* 3) Si go no existía, ya aplicamos showPage */
    if (!usedGo) {
      console.info("[nav-fix] showPage sin go:", page);
    }
  }

  window.rutalogGo = safeGo;

  /* Delegación en captura: gana a handlers rotos */
  document.addEventListener(
    "click",
    function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var btn = t.closest(".nav button[data-page]");
      if (!btn) return;
      var page = btn.getAttribute("data-page");
      if (!page) return;
      ev.preventDefault();
      /* no stopPropagation total: dejamos cerrar drawer móvil */
      safeGo(page);
    },
    true
  );

  console.info("[RUTALOG] nav-fix v1 — paneles por delegación");
})();
