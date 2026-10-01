/* RUTALOG map-icons v1 — sin cuadrados Leaflet al refrescar */
(function () {
  "use strict";
  if (window.__rutalogMapIconsV1) return;
  window.__rutalogMapIconsV1 = true;

  function injectCSS() {
    var id = "rutalog-map-icons-css";
    var st = document.getElementById(id);
    if (!st) {
      st = document.createElement("style");
      st.id = id;
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = [
      ".leaflet-div-icon,",
      ".leaflet-marker-icon.leaflet-div-icon,",
      ".leaflet-marker-icon.leaflet-interactive.leaflet-div-icon{",
      "  background:transparent!important;",
      "  border:none!important;",
      "  box-shadow:none!important;",
      "  margin:0!important;",
      "}",
      ".leaflet-div-icon .marcador,",
      ".rutalog-marker .marcador{",
      "  border-radius:50%!important;",
      "  display:flex!important;",
      "  align-items:center!important;",
      "  justify-content:center!important;",
      "  color:#fff!important;",
      "  font-weight:700!important;",
      "  border:2px solid rgba(255,255,255,.9)!important;",
      "  box-shadow:0 1px 4px rgba(0,0,0,.35)!important;",
      "  box-sizing:border-box!important;",
      "}",
      ".rutalog-origen-ico,",
      ".rutalog-marker{",
      "  background:transparent!important;",
      "  border:none!important;",
      "}"
    ].join("");
  }

  injectCSS();

  function makeCircleIcon(color, texto, size) {
    var t = size || 26;
    var label = texto != null && texto !== "" ? String(texto) : "";
    var html =
      '<div class="marcador" style="width:' + t + "px;height:" + t +
      "px;border-radius:50%;background:" + (color || "#64748b") +
      ";font-size:" + (label ? 11 : 0) + "px;line-height:" + t +
      'px;text-align:center;">' + label + "</div>";
    return L.divIcon({
      className: "rutalog-marker",
      html: html,
      iconSize: [t, t],
      iconAnchor: [t / 2, t / 2],
      popupAnchor: [0, -t / 2]
    });
  }

  function hookIcono() {
    if (typeof window.icono !== "function") return;
    if (window.icono._roundHook) return;
    window.icono = function (color, texto, size) {
      return makeCircleIcon(color, texto, size);
    };
    window.icono._roundHook = true;
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
    if (typeof window.renderMapas !== "function" || window.renderMapas._mapIconsHook) return;
    var orig = window.renderMapas;
    window.renderMapas = function () {
      injectCSS();
      hookIcono();
      hookIconoAlmacen();
      var r = orig.apply(this, arguments);
      setTimeout(cleanMaps, 0);
      setTimeout(cleanMaps, 50);
      setTimeout(cleanMaps, 150);
      return r;
    };
    window.renderMapas._mapIconsHook = true;
  }

  function tick() {
    injectCSS();
    hookIcono();
    hookIconoAlmacen();
    hookRenderMapas();
    cleanMaps();
  }

  tick();
  setTimeout(tick, 300);
  setTimeout(tick, 800);
  setTimeout(tick, 1600);
  setInterval(tick, 3000);
})();
