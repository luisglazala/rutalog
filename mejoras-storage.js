/* RUTALOG mejoras-storage v1 — espejo IndexedDB de catálogos pesados (retrocompatible) */
(function () {
  "use strict";
  if (window.__rutalogStorageV1) return;
  window.__rutalogStorageV1 = true;

  var DB_NAME = "rutalog_idb";
  var DB_VER = 1;
  var STORE = "kv";
  var HEAVY = [
    "rutalog_maestro",
    "rutalog_maestro_codigo",
    "rutalog_topes_sku",
    "rutalog_citas",
    "rutalog_usuarios_v2"
  ];

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
    var n = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k) || "";
        n += (k ? k.length : 0) + v.length;
      }
    } catch (e) {}
    return n * 2;
  }

  function mirrorToIdb() {
    var jobs = [];
    HEAVY.forEach(function (key) {
      var v = lsGet(key);
      if (v && v.length > 20) {
        jobs.push(idbSet(key, v).catch(function () {}));
      }
    });
    return Promise.all(jobs);
  }

  function restoreFromIdb() {
    var jobs = HEAVY.map(function (key) {
      var cur = lsGet(key);
      if (cur && cur.length > 20) return Promise.resolve();
      return idbGet(key).then(function (v) {
        if (typeof v === "string" && v.length > 20) {
          if (!lsSet(key, v)) {
            console.warn("[storage-v1] no se pudo restaurar a LS:", key);
          } else {
            console.info("[storage-v1] restaurado desde IDB:", key, v.length);
          }
        }
      }).catch(function () {});
    });
    return Promise.all(jobs);
  }

  function safeSetHeavy(key, value) {
    if (!lsSet(key, value)) {
      return idbSet(key, value).then(function () {
        try {
          localStorage.setItem(key + "__idb", "1");
        } catch (e) {}
        console.warn("[storage-v1] LS lleno; " + key + " guardado en IndexedDB");
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
            console.warn("[storage-v1] setItem falló, espejo IDB:", key, e && e.name);
            return;
          }
        }
        return orig.call(this, key, value);
      };
      proto.setItem._rutalogStorageV1 = true;
    } catch (e) {
      console.warn("[storage-v1] no se pudo parchear setItem", e);
    }
  }

  function showUsageHint() {
    try {
      var bytes = estimateLsBytes();
      var kb = Math.round(bytes / 1024);
      if (kb > 3500) {
        console.warn("[storage-v1] localStorage ~" + kb + " KB (cerca del límite típico ~5 MB)");
      } else {
        console.info("[storage-v1] localStorage ~" + kb + " KB · espejo IDB activo");
      }
      var badge = document.getElementById("badgeSync");
      if (badge && kb > 4000) {
        badge.title = (badge.title || "") + " · LS ~" + kb + "KB";
      }
    } catch (e) {}
  }

  function boot() {
    patchSetItem();
    restoreFromIdb()
      .then(function () { return mirrorToIdb(); })
      .then(function () { showUsageHint(); })
      .catch(function (e) {
        console.warn("[storage-v1] boot", e);
      });
    setInterval(function () {
      mirrorToIdb().catch(function () {});
    }, 120000);
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
