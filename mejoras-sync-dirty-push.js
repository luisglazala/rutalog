/* RUTALOG sync-dirty-push v1 — remote unchanged no debe saltarse un push local dirty */
(function () {
  "use strict";
  if (window.__rutalogDirtyPushV1) return;
  window.__rutalogDirtyPushV1 = true;

  function isDirty() {
    try {
      if (typeof ghIsDirty === "function") return !!ghIsDirty();
      return localStorage.getItem("rutalog_gh_dirty") === "1";
    } catch (e) {
      return false;
    }
  }

  function patchFetch() {
    if (typeof window.ghFetchFile !== "function" || window.ghFetchFile._dirtyPush) return false;
    var orig = window.ghFetchFile;
    window.ghFetchFile = async function (opts) {
      var remote = await orig.apply(this, arguments);
      if (remote && remote.unchanged && isDirty()) {
        try {
          var forced = await orig.call(this, Object.assign({}, opts || {}, { force: true }));
          if (forced && forced.data != null) {
            console.info("[RUTALOG] dirty-push · fetch forzado (dirty + etag unchanged)");
            return forced;
          }
        } catch (e) {
          console.warn("[RUTALOG] dirty-push force fetch", e);
        }
        return {
          sha: remote.sha,
          data: remote.data,
          size: remote.size || 0,
          unchanged: false,
          _dirtyBypass: true
        };
      }
      return remote;
    };
    window.ghFetchFile._dirtyPush = true;
    return true;
  }

  function install() {
    patchFetch();
  }
  install();
  var n = 0;
  var t = setInterval(function () {
    n++;
    install();
    if (n > 40) clearInterval(t);
  }, 300);

  console.info("[RUTALOG] dirty-push v1 · dirty + etag equal → fetch force / push");
})();
