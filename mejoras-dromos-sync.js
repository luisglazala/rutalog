/* RUTALOG dromos-sync v1 — Fase 2a: lectura de temas Dromos (deltas) + merge maestro
 * Escritura sigue en data.json (rutalog-datos) hasta Fase 2b.
 * Si el token del proxy no tiene acceso a Dromos, falla en silencio y la app sigue.
 */
(function () {
  "use strict";
  if (window.__rutalogDromosSyncV1) return;
  window.__rutalogDromosSyncV1 = true;

  var LOG = "[RUTALOG] dromos-sync";
  var OWNER = "luisglazala";
  var REPO = "Dromos";
  var BRANCH = "main";
  var enabled = true;

  var lastDeltas = null;
  var lastDeltasAt = 0;
  var pullInflight = null;

  function apiBase() {
    try {
      if (window.RUTALOG_API_BASE) return String(window.RUTALOG_API_BASE).replace(/\/$/, "");
    } catch (e) {}
    return "";
  }

  function contentsUrl(path) {
    var base = apiBase();
    var p =
      "/repos/" +
      OWNER +
      "/" +
      REPO +
      "/contents/" +
      path
        .split("/")
        .map(encodeURIComponent)
        .join("/") +
      "?ref=" +
      encodeURIComponent(BRANCH);
    if (base) return base + p;
    return "https://api.github.com" + p;
  }

  function decodeContent(meta) {
    if (!meta) return null;
    if (meta.encoding === "base64" && meta.content) {
      try {
        var bin = atob(meta.content.replace(/\n/g, ""));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder("utf-8").decode(bytes);
      } catch (e) {
        console.warn(LOG, "decode", e);
        return null;
      }
    }
    return null;
  }

  async function fetchTheme(path) {
    var url = contentsUrl(path);
    var headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    var res = await fetch(url, { headers: headers });
    if (res.status === 404) return { ok: false, status: 404, data: null, sha: null };
    if (res.status === 403 || res.status === 401) {
      return { ok: false, status: res.status, data: null, sha: null, denied: true };
    }
    if (!res.ok) {
      var t = await res.text().catch(function () {
        return "";
      });
      throw new Error("Dromos HTTP " + res.status + " " + path + " " + t.slice(0, 120));
    }
    var meta = await res.json();
    var text = decodeContent(meta);
    if (!text) throw new Error("Dromos sin contenido " + path);
    return { ok: true, status: 200, data: JSON.parse(text), sha: meta.sha || null, path: path };
  }

  function applyDeltasToMaestro(deltas) {
    if (!deltas || !deltas.porId || typeof estado === "undefined" || !estado.maestro) return 0;
    var n = 0;
    var porId = deltas.porId;
    Object.keys(porId).forEach(function (id) {
      var patch = porId[id];
      if (!patch || typeof patch !== "object") return;
      var cur = estado.maestro.get(id);
      if (!cur) {
        var bare = String(id).replace(/^0+/, "") || "0";
        estado.maestro.forEach(function (v, k) {
          if (!cur && String(k).replace(/^0+/, "") === bare) cur = v;
        });
      }
      if (!cur) return;
      Object.keys(patch).forEach(function (f) {
        if (f.charAt(0) === "_") return;
        cur[f] = patch[f];
      });
      estado.maestro.set(cur.id || id, cur);
      n++;
    });
    return n;
  }

  async function pullDeltas(opts) {
    opts = opts || {};
    if (!enabled) return null;
    if (pullInflight) return pullInflight;
    pullInflight = (async function () {
      try {
        var r = await fetchTheme("data/maestro/deltas.json");
        if (r.denied) {
          console.warn(LOG, "sin acceso a Dromos (token del proxy). Sigue data.json.");
          enabled = false;
          return null;
        }
        if (!r.ok) {
          if (r.status === 404) console.info(LOG, "deltas.json aún no existe");
          return null;
        }
        lastDeltas = r.data;
        lastDeltasAt = Date.now();
        var applied = applyDeltasToMaestro(r.data);
        if (applied > 0) {
          console.info(LOG, "deltas aplicados:", applied);
          try {
            if (typeof renderMaestro === "function") renderMaestro();
          } catch (e) {}
        } else {
          console.info(LOG, "deltas OK · porId vacío o sin cambios");
        }
        return r.data;
      } catch (e) {
        console.warn(LOG, "pull deltas", e);
        return null;
      } finally {
        pullInflight = null;
      }
    })();
    return pullInflight;
  }

  function hookApplyPayload() {
    if (typeof window.ghApplyPayload !== "function") return false;
    if (window.ghApplyPayload._dromos) return true;
    var orig = window.ghApplyPayload;
    window.ghApplyPayload = function (data, opts) {
      var ret = orig.apply(this, arguments);
      try {
        setTimeout(function () {
          pullDeltas({ silent: true });
        }, 300);
      } catch (e) {}
      return ret;
    };
    window.ghApplyPayload._dromos = true;
    return true;
  }

  function hookActualizar() {
    if (typeof window.ghActualizar !== "function") return false;
    if (window.ghActualizar._dromos) return true;
    var orig = window.ghActualizar;
    window.ghActualizar = async function (opts) {
      var ret = await orig.apply(this, arguments);
      try {
        await pullDeltas({ silent: true });
      } catch (e) {}
      return ret;
    };
    window.ghActualizar._dromos = true;
    return true;
  }

  window.rutalogDromos = {
    pullDeltas: pullDeltas,
    fetchTheme: fetchTheme,
    lastDeltas: function () {
      return lastDeltas;
    },
    applyDeltasToMaestro: applyDeltasToMaestro,
    enabled: function () {
      return enabled;
    },
  };

  function install() {
    hookApplyPayload();
    hookActualizar();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 500);

  setTimeout(function () {
    try {
      if (localStorage.getItem("rutalog_session")) pullDeltas({ silent: true });
    } catch (e) {}
  }, 2500);

  console.info(LOG, "v1 · Fase 2a lectura deltas Dromos (escritura sigue en data.json)");
})();
