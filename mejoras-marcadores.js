/* mejoras-marcadores.js — pines circulares suaves en el mapa */
(function () {
  if (window.__rutalogMarcadoresV1) return;
  window.__rutalogMarcadoresV1 = true;

  if (!document.getElementById("rutalog-marcadores-css")) {
    var s = document.createElement("style");
    s.id = "rutalog-marcadores-css";
    s.textContent = [
      ".rutalog-pin-wrap{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;}",
      ".rutalog-pin-dot{",
      "  width:72%;height:72%;border-radius:50%;",
      "  background:var(--pin-bg,#64748b);",
      "  border:2.5px solid rgba(255,255,255,.92);",
      "  box-shadow:0 2px 8px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.12);",
      "  display:flex;align-items:center;justify-content:center;",
      "  color:#fff;font-weight:700;font-size:11px;line-height:1;",
      "  font-family:system-ui,-apple-system,sans-serif;",
      "}",
      ".rutalog-pin-dot.is-num{width:82%;height:82%;font-size:12px;}",
      ".leaflet-marker-icon.rutalog-pin{background:transparent!important;border:none!important;}"
    ].join("");
    (document.head || document.documentElement).appendChild(s);
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

  function apply() {
    if (typeof L === "undefined") return false;
    window.icono = pinIcon;
    return true;
  }

  if (!apply()) {
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (apply() || n > 40) clearInterval(t);
    }, 250);
  }

  setTimeout(function () {
    try {
      if (typeof renderMapas === "function") renderMapas();
    } catch (e) {}
  }, 800);

  console.info("[RUTALOG] marcadores circulares v1");
})();
