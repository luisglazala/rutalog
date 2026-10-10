/* RUTALOG mejoras-storage v1.1 — espejo IndexedDB sin código SKU (lag) */
(function () {
  "use strict";
  if (window.__rutalogStorageV1) return;
  window.__rutalogStorageV1 = true;

  var DB_NAME = "rutalog_idb";
  var DB_VER = 1;
  var STORE = "kv";
  var HEAVY = [
    "rutalog_maestro",
    "rutalog_topes_sku",
    "rutalog_citas",
    "rutalog_usuarios_v2"
  ];
  /* rutalog_maestro_codigo: NO espejar (lag); solo memoria + GitHub */

  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("no IndexedDB"));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("idb open")); };
    });
    return dbPromise;
  }

  function dropCodigoSkuCache() {
    try { localStorage.removeItem("rutalog_maestro_codigo"); } catch (e) {}
    try {
      openDb().then(function (db) {
        try {
          var tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete("rutalog_maestro_codigo");
        } catch (e2) {}
      }).catch(function () {});
    } catch (e3) {}
  }

  function idbSet(key, value) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(key);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function lsSet(key, val) {
    try {
      localStorage.setItem(key, val);
      return true;
    } catch (e) {
      return false;
    }
  }

  function estimateLsBytes() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k) || "";
        total += (k ? k.length : 0) + v.length;
      }
    } catch (e) {}
    return total * 2;
  }

  function restoreFromIdb() {
    if (!window.indexedDB) return Promise.resolve();
    var jobs = HEAVY.map(function (key) {
      if (lsGet(key)) return Promise.resolve();
      return idbGet(key).then(function (v) {
        if (v != null && v !== "") {
          if (lsSet(key, String(v))) {
            console.info("[storage-v1.1] restaurado desde IDB:", key, String(v).length);
          }
        }
      }).catch(function () {});
    });
    return Promise.all(jobs);
  }

  function mirrorToIdb() {
    if (!window.indexedDB) return Promise.resolve();
    var jobs = [];
    HEAVY.forEach(function (key) {
      var v = lsGet(key);
      if (v != null) jobs.push(idbSet(key, v).catch(function () {}));
    });
    return Promise.all(jobs);
  }

  function safeSetHeavy(key, value) {
    if (!lsSet(key, value)) {
      return idbSet(key, value).then(function () {
        try {
          localStorage.setItem(key + "__idb", "1");
        } catch (e) {}
        console.warn("[storage-v1.1] LS lleno; " + key + " guardado en IndexedDB");
        return false;
      });
    }
    idbSet(key, value).catch(function () {});
    return Promise.resolve(true);
  }

  function patchSetItem() {
    try {
      var proto = Storage.prototype;
      if (proto.setItem._rutalogStorageV1) return;
      var orig = proto.setItem;
      proto.setItem = function (key, value) {
        if (HEAVY.indexOf(String(key)) !== -1) {
          try {
            return orig.call(this, key, value);
          } catch (e) {
            idbSet(String(key), String(value)).catch(function () {});
            try {
              orig.call(this, String(key) + "__idb", "1");
            } catch (e2) {}
            console.warn("[storage-v1.1] setItem falló, espejo IDB:", key, e && e.name);
            return;
          }
        }
        return orig.call(this, key, value);
      };
      proto.setItem._rutalogStorageV1 = true;
    } catch (e) {
      console.warn("[storage-v1.1] no se pudo parchear setItem", e);
    }
  }

  function showUsageHint() {
    try {
      var bytes = estimateLsBytes();
      var kb = Math.round(bytes / 1024);
      if (kb > 3500) {
        console.warn("[storage-v1.1] localStorage ~" + kb + " KB (cerca del límite típico ~5 MB)");
      } else {
        console.info("[storage-v1.1] localStorage ~" + kb + " KB · espejo IDB activo");
      }
    } catch (e) {}
  }

  function boot() {
    dropCodigoSkuCache();
    patchSetItem();
    restoreFromIdb()
      .then(function () { return mirrorToIdb(); })
      .then(function () { showUsageHint(); })
      .catch(function (e) {
        console.warn("[storage-v1.1] boot", e);
      });
    if (window.RUTALOG && RUTALOG.tick) {
      RUTALOG.tick.registrar("storage:mirror", function () {
        mirrorToIdb().catch(function () {});
      }, { cada: 120000, vista: "siempre" });
    } else {
      setInterval(function () {
        mirrorToIdb().catch(function () {});
      }, 120000);
    }
    window.rutalogStorage = {
      mirror: mirrorToIdb,
      restore: restoreFromIdb,
      usageBytes: estimateLsBytes,
      safeSetHeavy: safeSetHeavy
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 200); });
  } else {
    setTimeout(boot, 200);
  }
  setTimeout(boot, 1500);
})();
