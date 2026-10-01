/* mejoras-marcadores.js v2 — pines circulares + sin caja Leaflet */
(function () {
  if (window.__rutalogMarcadoresV2) return;
  window.__rutalogMarcadoresV2 = true;

  function injectCSS() {
    var id = "rutalog-marcadores-css";
    var s = document.getElementById(id);
    if (!s) {
      s = document.createElement("style");
      s.id = id;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = [
      ".leaflet-div-icon,",
      ".leaflet-marker-icon.leaflet-div-icon,",
      ".leaflet-marker-icon.rutalog-pin{",
      "  background:transparent!important;",
      "  border:none!important;",
      "  box-shadow:none!important;",
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
      ".leaflet-div-icon .marcador{",
      "  border-radius:50%!important;",
      "  display:flex!important;align-items:center!important;justify-content:center!important;",
      "  color:#fff!important;font-weight:700!important;",
      "}"
    ].join("");
  }

  injectCSS();

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

  function apply() {
    if (typeof L === "undefined") return false;
    window.icono = pinIcon;
    window.icono._rutalogPin = true;
    return true;
  }

  function repaint() {
    injectCSS();
    apply();
    try {
      if (typeof renderMapas === "function") renderMapas();
    } catch (e) {}
  }

  apply();
  var n = 0;
  var t = setInterval(function () {
    n++;
    if (apply() || n > 50) clearInterval(t);
  }, 100);

  setTimeout(repaint, 200);
  setTimeout(repaint, 600);
  setTimeout(repaint, 1200);

  console.info("[RUTALOG] marcadores circulares v2");
})();
