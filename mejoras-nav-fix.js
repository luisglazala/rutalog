/* RUTALOG nav-fix v4 — panel al instante; go en segundo plano; silent largo */
(function () {
  "use strict";
  if (window.__rutalogNavFixV4) return;
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

  function showPage(page) {
    if (!page) return false;
    var target = document.getElementById("page-" + page);
    if (!target) return false;

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
        p.style.setProperty("pointer-events", "auto", "important");
        p.removeAttribute("hidden");
      } else {
        p.style.setProperty("display", "none", "important");
      }
    });

    try {
      var t = document.getElementById("pageTitle");
      if (t) t.textContent = TITLES[page] || page;
    } catch (e2) {}

    try {
      var main = document.querySelector(".main");
      if (main) {
        main.style.setProperty("visibility", "visible", "important");
        main.style.setProperty("pointer-events", "auto", "important");
      }
    } catch (e3) {}

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
    if (page === lastPage) {
      showPage(page);
      return;
    }
    lastPage = page;

    /* UI inmediata — no esperar a go ni a renderMapas */
    showPage(page);
    requestAnimationFrame(function () { lightMapTouch(page); });

    /* go nativo diferido + silent largo (core agenda renderMapas en setTimeout) */
    setTimeout(function () {
      try {
        if (typeof window.go === "function") {
          window.__rutalogNavSilent = true;
          try {
            window.go(page);
          } catch (eGo) {}
          setTimeout(function () {
            window.__rutalogNavSilent = false;
          }, 1200);
        }
      } catch (e) {
        console.warn("[nav-fix] go", e);
        window.__rutalogNavSilent = false;
      }
      showPage(page);
      lightMapTouch(page);
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
      if (b.__navFixV4) return;
      b.__navFixV4 = true;
      b.addEventListener(
        "click",
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          safeGo(b.getAttribute("data-page"));
        },
        true
      );
    });
  }
  wireButtons();
  setTimeout(wireButtons, 500);
  setTimeout(wireButtons, 2000);

  console.info("[RUTALOG] nav-fix v4 — paneles instantáneos");
})();
