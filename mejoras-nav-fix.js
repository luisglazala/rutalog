/* RUTALOG nav-fix v2 — cambio de panel prioritario */
(function () {
  "use strict";
  if (window.__rutalogNavFixV2) return;
  window.__rutalogNavFixV2 = true;

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

  function showPage(page) {
    if (!page) return false;
    var target = document.getElementById("page-" + page);
    if (!target) {
      console.warn("[nav-fix] no existe page-" + page);
      return false;
    }

    try {
      if (window.estado) estado.page = page;
    } catch (e) {}

    document.querySelectorAll(".nav button[data-page]").forEach(function (b) {
      var on = b.getAttribute("data-page") === page;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
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
        p.classList.remove("active");
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
        main.style.setProperty("opacity", "1", "important");
        main.style.setProperty("pointer-events", "auto", "important");
      }
    } catch (e3) {}

    /* mapas */
    setTimeout(function () {
      try {
        if (page === "rutas" && window.estado && estado.mapRutas) {
          estado.mapRutas.invalidateSize(false);
          if (typeof window.renderMapas === "function") {
            try { window.renderMapas(); } catch (e) {}
          }
        }
        if (page === "panel" && window.estado && estado.mapPanel) {
          estado.mapPanel.invalidateSize(false);
        }
        if (page === "cruzados" && window.estado && estado.mapCruzados) {
          estado.mapCruzados.invalidateSize(false);
        }
      } catch (e4) {}
    }, 60);

    return true;
  }

  function safeGo(page) {
    if (!page) return;
    /* UI primero (lo que el usuario ve) */
    showPage(page);
    /* go nativo después para lógica interna (sin confiar en él para el DOM) */
    setTimeout(function () {
      try {
        if (typeof window.go === "function" && !window.go.__navFixSkip) {
          /* marcar para no reentrar si go dispara otro click */
          var prev = window.estado && estado.page;
          window.go(page);
          /* si go dejó mal el DOM, reaplicar */
          showPage(page);
        }
      } catch (e) {
        console.warn("[nav-fix] go", e);
        showPage(page);
      }
    }, 0);
  }

  window.rutalogGo = safeGo;
  window.rutalogShowPage = showPage;

  function onNavActivate(ev) {
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

  document.addEventListener("click", onNavActivate, true);
  document.addEventListener("pointerup", onNavActivate, true);

  /* Re-wire directo por si el menú se re-renderiza */
  function wireButtons() {
    document.querySelectorAll(".nav button[data-page]").forEach(function (b) {
      if (b.__navFixWired) return;
      b.__navFixWired = true;
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        safeGo(b.getAttribute("data-page"));
      });
    });
  }
  wireButtons();
  setTimeout(wireButtons, 500);
  setTimeout(wireButtons, 2000);
  setTimeout(wireButtons, 5000);

  try {
    var nav = document.querySelector(".nav");
    if (nav && typeof MutationObserver !== "undefined") {
      var obs = new MutationObserver(function () { wireButtons(); });
      obs.observe(nav, { childList: true, subtree: true });
    }
  } catch (e) {}

  console.info("[RUTALOG] nav-fix v2 activo — prueba rutalogGo('citas')");
})();
