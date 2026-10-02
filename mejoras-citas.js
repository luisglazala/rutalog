/* RUTALOG mejoras-citas v8 — pegar tabla (escapeHtml arreglado) */
(function () {
  "use strict";
  if (window.__rutalogCitasV8 || window.__rutalogCitasV7) return;
  window.__rutalogCitasV8 = true;
  window.__rutalogCitasV7 = true;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function toastSafe(msg) {
    try {
      if (typeof toast === "function") { toast(msg); return; }
    } catch (e) {}
    try {
      var t = document.createElement("div");
      t.textContent = String(msg);
      t.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:99999;background:#1f2937;color:#fff;padding:10px 14px;border-radius:8px;font:13px system-ui";
      document.body.appendChild(t);
      setTimeout(function () { try { t.remove(); } catch (e) {} }, 3000);
    } catch (e) {}
  }
  function normName(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  }
  function isoDate(d) {
    if (!(d instanceof Date) || isNaN(d)) return "";
    return d.toISOString().slice(0, 10);
  }
  function parseCitaFecha(raw, ref) {
    var s = String(raw || "").trim();
    if (!s) return "";
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      var dd = (+m[1]), mm = (+m[2]), yy = +m[3];
      if (yy < 100) yy += 2000;
      return yy + "-" + String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
    }
    return s;
  }
  function findIdByName(nombre) {
    try {
      if (!window.estado) return null;
      var target = normName(nombre);
      if (!target) return null;
      var best = null, sc = 0;
      function score(n) {
        var nn = normName(n);
        if (!nn) return 0;
        if (nn === target) return 100;
        if (nn.indexOf(target) >= 0 || target.indexOf(nn) >= 0) return 80;
        return 0;
      }
      if (estado.maestro) estado.maestro.forEach(function (c) {
        var s = score(c.nombre || c.name || "");
        if (s > sc) { sc = s; best = c.id || c.idCliente || null; }
      });
      if (sc < 80 && estado.clientesHoy) estado.clientesHoy.forEach(function (c) {
        var s = score(c.nombre || "");
        if (s > sc) { sc = s; best = c.idCliente || c.id || null; }
      });
      return sc >= 80 ? String(best) : null;
    } catch (e) { return null; }
  }
  function parseLine(line) {
    line = String(line || "").trim();
    if (!line) return null;
    var cols = line.split("\t").map(function (x) { return x.trim(); });
    if (cols.length < 2) cols = line.split(/\s{2,}/).map(function (x) { return x.trim(); });
    if (cols.length < 2) return null;
    var id = cols[0], nombre = cols[1] || "", fecha = cols[2] || cols[1] || "";
    if (/^id|cliente|código/i.test(id)) return null;
    var fechaIso = parseCitaFecha(fecha);
    if (!/^\d+$/.test(String(id).replace(/\D/g, "")) && nombre) {
      var found = findIdByName(id);
      if (found) { nombre = id; id = found; }
    }
    id = String(id || "").replace(/\D/g, "");
    if (!id) return null;
    return { idCliente: id, nombre: nombre, fecha: fechaIso || fecha, citaRaw: line };
  }
  function parsePasteTable(text) {
    var rows = [];
    String(text || "").split(/\r?\n/).forEach(function (line) {
      var r = parseLine(line);
      if (r) rows.push(r);
    });
    return rows;
  }
  function makeKey(r) {
    return String(r.idCliente || "") + "|" + String(r.fecha || "");
  }
  function getCitasMap() {
    if (!window.estado) window.estado = {};
    if (!(estado.citas instanceof Map)) {
      var map = new Map();
      try {
        var raw = localStorage.getItem("rutalog_citas");
        if (raw) {
          var obj = JSON.parse(raw);
          Object.keys(obj).forEach(function (k) { map.set(k, obj[k]); });
        }
      } catch (e) {}
      estado.citas = map;
    }
    return estado.citas;
  }
  function persistCitas() {
    try {
      var o = {};
      getCitasMap().forEach(function (v, k) { o[k] = v; });
      localStorage.setItem("rutalog_citas", JSON.stringify(o));
    } catch (e) {}
  }
  function applyRows(rows, replaceAll) {
    var map = getCitasMap();
    if (replaceAll) map.clear();
    rows.forEach(function (r) {
      var id = String(r.idCliente);
      var prev = map.get(id) || { idCliente: id, nombre: r.nombre, ovs: [], fuente: "pegar-tabla" };
      var ovs = Array.isArray(prev.ovs) ? prev.ovs.slice() : [];
      ovs = ovs.filter(function (o) { return String(o.fecha) !== String(r.fecha); });
      ovs.push({ fecha: r.fecha, ov: r.ov || "", nota: r.nota || "" });
      ovs.sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
      map.set(id, {
        idCliente: id,
        nombre: r.nombre || prev.nombre || "",
        fecha: r.fecha,
        citaRaw: r.citaRaw || "",
        ovs: ovs,
        fuente: "pegar-tabla"
      });
    });
    persistCitas();
  }
  function renderList() {
    var cont = el("citasList") || el("listaCitas") || document.querySelector("#page-citas .citas-list");
    if (!cont) return;
    var citas = getCitasMap();
    var items = [];
    citas.forEach(function (v, id) {
      var ovs = Array.isArray(v.ovs) ? v.ovs : [];
      if (!ovs.length && v.fecha) ovs = [{ fecha: v.fecha }];
      ovs.forEach(function (o) {
        items.push({ id: id, nombre: v.nombre || "", fecha: o.fecha || v.fecha || "" });
      });
    });
    items.sort(function (a, b) {
      return String(a.fecha).localeCompare(String(b.fecha)) || String(a.nombre).localeCompare(String(b.nombre));
    });
    cont.innerHTML = items.map(function (it) {
      return '<div class="cita-row" data-id="' + esc(it.id) + '" data-fecha="' + esc(it.fecha) + '">' +
        '<span class="mono">' + esc(it.id) + '</span> ' +
        '<span>' + esc(it.nombre) + '</span> ' +
        '<span class="mono">' + esc(it.fecha) + '</span> ' +
        '<button type="button" class="del-cita" data-id="' + esc(it.id) + '" data-fecha="' + esc(it.fecha) + '">×</button></div>';
    }).join("") || '<div class="muted">Sin citas</div>';
    cont.querySelectorAll(".del-cita").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-id");
        var map = getCitasMap();
        map.delete(id);
        persistCitas();
        renderList();
      };
    });
  }
  function wireButtons(root) {
    root = root || document;
    var area = el("citasPaste") || el("txtCitasPaste") || root.querySelector("textarea[data-citas],#page-citas textarea");
    var btnA = el("btnCitasAplicar") || root.querySelector("[data-citas-apply]");
    var btnR = el("btnCitasReemplazar") || root.querySelector("[data-citas-replace]");
    if (btnA && !btnA._citasWired) {
      btnA._citasWired = true;
      btnA.onclick = function (e) {
        e.preventDefault();
        var rows = parsePasteTable(area ? area.value : "");
        if (!rows.length) { toastSafe("No se detectaron filas de cita"); return; }
        applyRows(rows, false);
        renderList();
        toastSafe("Citas aplicadas: " + rows.length);
      };
    }
    if (btnR && !btnR._citasWired) {
      btnR._citasWired = true;
      btnR.onclick = function (e) {
        e.preventDefault();
        var rows = parsePasteTable(area ? area.value : "");
        applyRows(rows, true);
        renderList();
        toastSafe("Citas reemplazadas: " + rows.length);
      };
    }
  }
  function ensurePasteUI() {
    var page = el("page-citas");
    if (!page) return;
    if (!el("citasPaste") && !page.querySelector("textarea")) {
      var box = document.createElement("div");
      box.className = "citas-paste-box";
      box.innerHTML = '<label>Pegar tabla de citas</label><textarea id="citasPaste" rows="6" placeholder="ID\tNombre\tFecha"></textarea>' +
        '<div class="row gap"><button type="button" id="btnCitasAplicar" class="btn">Aplicar</button>' +
        '<button type="button" id="btnCitasReemplazar" class="btn ghost">Reemplazar todo</button></div>' +
        '<div id="citasList" class="citas-list"></div>';
      page.appendChild(box);
    }
    wireButtons(page);
    renderList();
  }
  function tick() {
    try { ensurePasteUI(); wireButtons(); } catch (e) { console.warn("[citas-v8]", e); }
  }
  setTimeout(tick, 600);
  setTimeout(tick, 1500);
  setTimeout(tick, 3000);
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("[data-page='citas'],#nav-citas,.nav [data-page=\"citas\"]")) setTimeout(tick, 100);
  });
  console.info("[RUTALOG] citas v8");
})();
