/* RUTALOG push-serial v1 — un solo push a la vez; 422 = reintento limpio */
(function () {
  "use strict";
  if (window.__rutalogPushSerialV1) return;
  window.__rutalogPushSerialV1 = true;

  var LOG = "[RUTALOG] push-serial";
  var _chain = Promise.resolve();
  var _inflight = false;

  function patch() {
    if (typeof window.ghPushWithSha !== "function" || window.ghPushWithSha._pushSerial) return false;
    var orig = window.ghPushWithSha;

    window.ghPushWithSha = function (sha, silent) {
      var run = function () {
        _inflight = true;
        return Promise.resolve()
          .then(function () {
            return orig.call(window, sha, silent);
          })
          .catch(function (e) {
            var m = String((e && e.message) || e);
            if (/422|fast forward|not a fast forward|Unprocessable/i.test(m)) {
              console.info(LOG, "conflicto de versión (otra subida ganó) → reintento en 800 ms");
              return new Promise(function (r) {
                setTimeout(r, 800);
              }).then(function () {
                return orig.call(window, null, silent);
              });
            }
            throw e;
          })
          .finally(function () {
            _inflight = false;
          });
      };

      var done = _chain.then(run, run);
      _chain = done.catch(function () {});
      return done;
    };
    window.ghPushWithSha._pushSerial = true;
    return true;
  }

  patch();
  var n = 0;
  var t = setInterval(function () {
    n++;
    patch();
    if (n > 40) clearInterval(t);
  }, 400);

  console.info(LOG, "v1 · cola de un push · reintento 422");
})();
