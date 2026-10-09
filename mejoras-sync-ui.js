/* RUTALOG sync-ui v2 — panel limpio + respeta doble fecha */
(function () {
  "use strict";
  if (window.__rutalogSyncUiV2) return;
  window.__rutalogSyncUiV2 = true;
  window.__rutalogSyncUiV1 = true;

  function fmtLocal(ts) {
    if (!ts) return "—";
    try {
      var d = ts instanceof Date ? ts : new Date(ts);
      if (isNaN(d.getTime())) {
        var p = Date.parse(String(ts));
        if (isNaN(p)) return String(ts);
        d = new Date(p);
      }
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    } catch (e) {
      return String(ts);
    }
  }

  function fmtAgo(ts) {
    var t = typeof ts === "number" ? ts : Date.parse(ts);
    if (!t || isNaN(t)) return "";
    var s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 5) return "ahora";
    if (s < 60) return "hace " + s + " s";
    var m = Math.floor(s / 60);
    if (m < 60) return "hace " + m + " min";
    var h = Math.floor(m / 60);
    if (h < 48) return "hace " + h + " h";
    return "hace " + Math.floor(h / 24) + " d";
  }

  function polishStatus() {
    var st = document.getElementById("syncStatus");
    if (!st) return;
    if (st.querySelector && st.querySelector("span") && /comprobación|Catálogo/i.test(st.textContent || "")) {
      return;
    }
    var txt = st.textContent || "";
    var iso = txt.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/);
    if (iso) {
      var rest = txt.replace(iso[0], "").replace(/^Última sync:\s*/i, "").trim();
      rest = rest.replace(/^\s*[·•]\s*/, "");
      var local = fmtLocal(iso[0]);
      var ago = fmtAgo(iso[0]);
      st.textContent =
        "Última sync: " + local + (ago ? " (" + ago + ")" : "") + (rest ? " " + rest : "");
    }
  }

  function hideTokenBlock() {
    try {
      if (!(location && /\.pages\.dev$/i.test(location.hostname))) return;
    } catch (e) {
      return;
    }
    ["syncToken", "btnSaveToken", "btnClearToken", "btnToggleToken"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.display = "none";
      el.setAttribute("hidden", "");
    });
    var tok = document.getElementById("syncToken");
    if (tok) {
      var row = tok.closest(".form-row");
      if (row) row.style.display = "none";
      var p = row && row.nextElementSibling;
      if (p && p.tagName === "P" && /token|PAT|Developer settings/i.test(p.textContent || "")) {
        p.style.display = "none";
      }
    }
  }

  function trimHelpText() {
    var st = document.getElementById("syncStatus");
    if (!st) return;
    var help = st.nextElementSibling;
    if (help && help.tagName === "P") {
      help.textContent =
        "Comparte usuarios, maestro, citas, topes SKU y código SKU. El trabajo del día (viajes, mapa) es local de cada PC.";
      help.style.fontSize = "11.5px";
      help.style.color = "var(--muted)";
      help.style.margin = "8px 0 0";
    }
    var cards = document.querySelectorAll("#page-config h3");
    cards.forEach(function (h) {
      if (/Sincronización/i.test(h.textContent || "")) {
        h.textContent = "Sincronización (GitHub)";
        var sub = h.nextElementSibling;
        if (sub && sub.tagName === "P") {
          sub.innerHTML =
            'Repo: <code style="font-size:11px;">luisglazala/rutalog-datos</code> · vía Cloudflare';
        }
      }
    });
    var lab = document.getElementById("syncAuto");
    if (lab && lab.parentElement && lab.parentElement.tagName === "LABEL") {
      var nodes = lab.parentElement.childNodes;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeType === 3 && /Auto/i.test(nodes[i].textContent || "")) {
          nodes[i].textContent = " Auto cada 30 s (usuarios y datos)";
        }
      }
    }
  }

  function patchGhSetMeta() {
    if (typeof window.ghSetMeta !== "function" || window.ghSetMeta._syncUi) return false;
    var orig = window.ghSetMeta;
    window.ghSetMeta = function (m) {
      var r = orig.apply(this, arguments);
      try {
        setTimeout(polishStatus, 0);
      } catch (e) {}
      return r;
    };
    window.ghSetMeta._syncUi = true;
    return true;
  }

  function run() {
    hideTokenBlock();
    trimHelpText();
    polishStatus();
    patchGhSetMeta();
  }

  run();
  setTimeout(run, 800);
  setTimeout(run, 2000);
  setInterval(function () {
    polishStatus();
  }, 15000);

  console.info("[RUTALOG] sync-ui v2 · respeta doble fecha");
})();
