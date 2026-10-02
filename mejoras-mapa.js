/* RUTALOG mejoras-mapa v1 — unifica marcadores + map-icons (pines circulares) */
(function () {
  "use strict";
  if (window.__rutalogMapaV1) return;
  window.__rutalogMapaV1 = true;
  window.__rutalogMarcadoresV2 = true;
  window.__rutalogMapIconsV1 = true;

  function injectCSS() {
    var id = "rutalog-mapa-css";
    var st = document.getElementById(id);
    if (!st) {
      st = document.createElement("style");
      st.id = id;
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = [
      ".leaflet-div-icon,",
      ".leaflet-marker-icon.leaflet-div-icon,",
      ".leaflet-marker-icon.leaflet-interactive.leaflet-div-icon,",
      ".leaflet-marker-icon.rutalog-pin{",
      "  background:transparent!important;",
      "  border:none!important;",
      "  box-shadow:none!important;",
      "  margin:0!important;",
      "}",
      ".rutalog-pin-wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;}",
      ".rutalog-pin-dot{",
      "  width:72%;height:72%;border-radius:50%;",
      "  background:var(--pin-bg,#64748b);",
      "  border:2.5px solid rgba(255,255,255,.92);",
      "  box-shadow:0 2px 8px rgba(0,0,0,.35);",
      "  display:flex;align-items:center;justify-content:center;",
      "  color:#fff;font-weight:700;font-size:11px;line-height:1;",
      "  font-family:system-ui,-apple-system,sans-serif;",
      "  box-sizing:border-box;",
      "}",
      ".rutalog-pin-dot.is-num{width:82%;height:82%;font-size:12px;}",
      ".leaflet-div-icon .marcador,",
      ".rutalog-marker .marcador{",
      "  border-radius:50%!important;",
      "  display:flex!important;align-items:center!important;justify-content:center!important;",
      "  color:#fff!important;font-weight:700!important;",
      "  border:2px solid rgba(255,255,255,.9)!important;",
      "  box-shadow:0 1px 4px rgba(0,0,0,.35)!important;",
      "  box-sizing:border-box!important;",
      "}",
      ".rutalog-origen-ico,.rutalog-marker{",
      "  background:transparent!important;border:none!important;",
      "}"
    ].join("");
  }

  function pinIcon(color, texto, size) {
    var t = size || 28;
    var hasNum = texto != null && String(texto).length > 0;
    var html =
      '<div class="rutalog-pin-wrap" style="--pin-bg:' + (color || "#64748b") + '">' +
      '<div class="rutalog-pin-dot' + (hasNum ? " is-num" : "") + '">' +
      (hasNum ? String(texto) : "") +
      "</div></div>";
    return L.divIcon({
      className: "rutalog-pin",
      html: html,
      iconSize: [t, t],
      iconAnchor: [t / 2, t / 2],
      popupAnchor: [0, -t / 2]
    });
  }

  function applyIcono() {
    if (typeof L === "undefined") return false;
    window.icono = function (color, texto, size) {
      return pinIcon(color, texto, size);
    };
    window.icono._rutalogPin = true;
    window.icono._roundHook = true;
    return true;
  }

  function hookIconoAlmacen() {
    if (typeof window.iconoAlmacen !== "function") return;
    if (window.iconoAlmacen._roundHook) return;
    window.iconoAlmacen = function (a, seleccionado) {
      var t = seleccionado ? 36 : 28;
      var color = (a && a.color) || "#64748b";
      var html =
        '<div style="width:' + t + "px;height:" + t +
        "px;border-radius:50%;background:" + color +
        ";border:3px solid " + (seleccionado ? "#f59e0b" : "#fff") +
        ';box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;' +
        "font-size:10px;font-weight:700;color:#fff;">CI</div>";
      return L.divIcon({
        className: "rutalog-marker",
        html: html,
        iconSize: [t, t],
        iconAnchor: [t / 2, t / 2]
      });
    };
    window.iconoAlmacen._roundHook = true;
  }

  function stripSquareLayers(map) {
    if (!map || !map.eachLayer) return;
    try {
      map.eachLayer(function (layer) {
        if (!layer || !layer.getElement) return;
        var el = layer.getElement();
        if (!el) return;
        if (el.classList && el.classList.contains("leaflet-div-icon")) {
          el.style.background = "transparent";
          el.style.border = "none";
          el.style.boxShadow = "none";
        }
      });
    } catch (e) {}
  }

  function cleanMaps() {
    try {
      if (window.estado) {
        stripSquareLayers(estado.mapPanel);
        stripSquareLayers(estado.mapRutas);
        stripSquareLayers(estado.mapCruzados);
      }
    } catch (e) {}
  }

  function hookRenderMapas() {
    if (typeof window.renderMapas !== "function" || window.renderMapas._mapaHook) return;
    var orig = window.renderMapas;
    window.renderMapas = function () {
      injectCSS();
      applyIcono();
      hookIconoAlmacen();
      var r = orig.apply(this, arguments);
      setTimeout(cleanMaps, 0);
      setTimeout(cleanMaps, 80);
      return r;
    };
    window.renderMapas._mapaHook = true;
  }

  function tick() {
    injectCSS();
    applyIcono();
    hookIconoAlmacen();
    hookRenderMapas();
    cleanMaps();
  }

  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setInterval(tick, 5000);
  console.info("[RUTALOG] mapa unificado v1 (marcadores+icons)");
})();
