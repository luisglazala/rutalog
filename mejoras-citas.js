/* RUTALOG mejoras-citas — autocompletado cliente por nombre */
(function () {
  "use strict";
  function el(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }
  function pad9Local(id) {
    var s = String(id == null ? "" : id).replace(/\D/g, "");
    if (!s) return "";
    if (typeof pad9 === "function") return pad9(s);
    while (s.length < 9) s = "0" + s;
    return s.slice(-9);
  }
  function ensureCitaAutocomplete() {
    var inp = el("citaCliente");
    if (!inp || inp._citaAcWired) return;
    inp._citaAcWired = true;
    inp.placeholder = "Nombre o ID cliente…";
    inp.setAttribute("autocomplete", "off");
    inp.setAttribute("inputmode", "search");

    var box = document.createElement("div");
    box.className = "cita-ac-wrap";
    box.style.cssText = "position:relative;flex:1;min-width:160px;";
    if (inp.parentNode) {
      inp.parentNode.insertBefore(box, inp);
      box.appendChild(inp);
    }

    var drop = document.createElement("div");
    drop.id = "citaAcDrop";
    drop.className = "cita-ac-drop";
    drop.hidden = true;
    box.appendChild(drop);

    function hideDrop() { drop.hidden = true; drop.innerHTML = ""; }

    function searchMaestro(q) {
      q = (q || "").trim().toLowerCase();
      if (!q || q.length < 2) return [];
      var hits = [];
      try {
        if (window.estado && estado.maestro) {
          estado.maestro.forEach(function (c) {
            if (hits.length >= 25) return;
            var id = String(c.id || "");
            var blob = [id, c.nombre, c.ciudad, c.localidad, c.zona].join(" ").toLowerCase();
            if (blob.indexOf(q) >= 0) hits.push(c);
          });
        }
        if (window.estado && estado.clientesHoy && hits.length < 25) {
          estado.clientesHoy.forEach(function (c) {
            if (hits.length >= 25) return;
            var id = String(c.idCliente || "");
            var blob = [id, c.nombre, c.ciudad, c.localidad].join(" ").toLowerCase();
            if (blob.indexOf(q) >= 0) {
              var exists = hits.some(function (h) { return String(h.id || h.idCliente) === id; });
              if (!exists) hits.push({ id: id, nombre: c.nombre, ciudad: c.ciudad, localidad: c.localidad });
            }
          });
        }
      } catch (e) { console.error(e); }
      hits.sort(function (a, b) {
        return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
      });
      return hits;
    }

    function renderDrop(q) {
      var hits = searchMaestro(q);
      if (!hits.length) {
        drop.innerHTML = '<div class="cita-ac-empty">Sin coincidencias en el maestro</div>';
        drop.hidden = false;
        return;
      }
      drop.innerHTML = hits.map(function (c) {
        var id = pad9Local(c.id || c.idCliente);
        var nom = escapeHtml(c.nombre || "—");
        var sub = escapeHtml([c.ciudad, c.localidad].filter(Boolean).join(" · "));
        return '<button type="button" class="cita-ac-item" data-id="' + escapeHtml(id) + '" data-nombre="' + nom + '">' +
          '<span class="cita-ac-name">' + nom + '</span>' +
          '<span class="cita-ac-meta"><span class="mono">' + escapeHtml(id) + '</span>' +
          (sub ? " · " + sub : "") + "</span></button>";
      }).join("");
      drop.hidden = false;
      Array.prototype.forEach.call(drop.querySelectorAll(".cita-ac-item"), function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute("data-id");
          var nombre = btn.getAttribute("data-nombre");
          inp.value = nombre + " (" + id + ")";
          inp.dataset.citaId = id;
          hideDrop();
          var fecha = el("citaFecha");
          if (fecha) fecha.focus();
        };
      });
    }

    var tmr;
    inp.addEventListener("input", function () {
      delete inp.dataset.citaId;
      clearTimeout(tmr);
      var v = inp.value;
      tmr = setTimeout(function () {
        if ((v || "").trim().length < 2) { hideDrop(); return; }
        renderDrop(v);
      }, 120);
    });
    inp.addEventListener("focus", function () {
      if ((inp.value || "").trim().length >= 2 && !inp.dataset.citaId) renderDrop(inp.value);
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hideDrop();
      if (e.key === "Enter") {
        var first = drop.querySelector(".cita-ac-item");
        if (first && !drop.hidden) { e.preventDefault(); first.click(); }
      }
    });
    document.addEventListener("click", function (e) {
      if (!drop.contains(e.target) && e.target !== inp) hideDrop();
    });

    var btn = el("btnAddCita");
    if (btn && !btn._citaAcHooked) {
      btn._citaAcHooked = true;
      btn.addEventListener("click", function () {
        var raw = (inp.value || "").trim();
        var id = inp.dataset.citaId || "";
        if (!id) {
          var digits = raw.replace(/\D/g, "");
          if (digits.length >= 5) id = pad9Local(digits);
          else {
            var m = raw.match(/\((\d{5,9})\)\s*$/);
            if (m) id = pad9Local(m[1]);
            else {
              var hits = searchMaestro(raw);
              if (hits.length === 1) id = pad9Local(hits[0].id || hits[0].idCliente);
            }
          }
        }
        if (id) {
          inp.value = id;
          inp.dataset.citaId = id;
        }
      }, true);
    }
  }

  function boot() {
    ensureCitaAutocomplete();
    setInterval(ensureCitaAutocomplete, 2000);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 1000); });
  } else {
    setTimeout(boot, 1000);
  }
  setTimeout(boot, 3000);
})();
