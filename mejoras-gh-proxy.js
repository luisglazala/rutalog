/* RUTALOG mejoras-gh-proxy v3 — Cloudflare Pages (sin token en el navegador) */
(function () {
  "use strict";
  if (window.__rutalogGhProxyV3) return;
  window.__rutalogGhProxyV3 = true;

  var CF_API_DEFAULT = "https://rutalog.pages.dev/api";

  function apiBase() {
    if (window.RUTALOG_API_BASE) return String(window.RUTALOG_API_BASE).replace(/\/$/, "");
    try {
      if (location && /rutalog\.pages\.dev$/i.test(location.hostname)) {
        return "/api";
      }
    } catch (e) {}
    return CF_API_DEFAULT;
  }

  window.RUTALOG_API_BASE = window.RUTALOG_API_BASE || CF_API_DEFAULT;

  function toProxyUrl(url) {
    var s = String(url || "");
    if (s.indexOf("https://api.github.com") === 0) {
      return apiBase() + s.slice("https://api.github.com".length);
    }
    return null;
  }

  var _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      var rawUrl = typeof input === "string" ? input : (input && input.url);
      var proxied = rawUrl ? toProxyUrl(rawUrl) : null;
      if (proxied) {
        init = init ? Object.assign({}, init) : {};
        var h = new Headers(init.headers || (typeof input !== "string" && input.headers) || {});
        h.delete("Authorization");
        h.delete("authorization");
        if (!h.has("Accept")) h.set("Accept", "application/vnd.github+json");
        if (!h.has("X-GitHub-Api-Version")) h.set("X-GitHub-Api-Version", "2022-11-28");
        init.headers = h;
        return _fetch(proxied, init);
      }
    } catch (e) {
      console.warn("[gh-proxy] fetch patch", e);
    }
    return _fetch(input, init);
  };

  function patchGh() {
    window.ghGetToken = function () {
      return "cf-proxy";
    };
    window.ghSetToken = function () {
      try {
        localStorage.removeItem("rutalog_gh_token");
      } catch (e) {}
      if (typeof ghUpdateSyncBadge === "function") ghUpdateSyncBadge();
    };
    try {
      localStorage.removeItem("rutalog_gh_token");
    } catch (e) {}

    window.ghUpdateSyncBadge = function () {
      var b = document.getElementById("badgeSync");
      if (b) b.textContent = "Cloudflare · OK";
    };
    try {
      window.ghUpdateSyncBadge();
    } catch (e) {}
  }

  function hideTokenUI() {
    [
      "syncToken",
      "btnSaveToken",
      "btnClearToken",
      "btnToggleToken",
      "rutalogTokenGate",
      "tokenGate",
      "ghTokenRow"
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.display = "none";
      el.setAttribute("hidden", "");
      if (el.tagName === "INPUT") {
        el.value = "";
        el.disabled = true;
      }
    });
  }

  function tick() {
    patchGh();
    hideTokenUI();
  }

  tick();
  setTimeout(tick, 400);
  setTimeout(tick, 1200);
  setTimeout(tick, 3000);
  if (window.RUTALOG && RUTALOG.tick) RUTALOG.tick.registrar('gh:hide-token', hideTokenUI, { cada: 4000, vista: 'siempre' }); else setInterval(hideTokenUI, 4000);
})();
