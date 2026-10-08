import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const swSrc = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const goodShell = fs.readFileSync(path.join(root, "shell-body.html"), "utf8");
const brokenShell = "<!DOCTYPE html>\n<!-- RESTORE_MARKER: content too large -->\n";

assert.ok(goodShell.includes("loginOverlay"));
assert.ok(goodShell.length > 5000);

const sandbox = {
  self: {
    addEventListener() {},
    skipWaiting() {},
    clients: { claim() {} },
  },
  caches: {
    open: async () => ({ addAll: async () => {}, match: async () => null, put: async () => {} }),
    keys: async () => [],
    delete: async () => true,
  },
  fetch: async () => new Response("x"),
  Response,
  Request,
  URL,
  console,
};
vm.createContext(sandbox);
const start = swSrc.indexOf("function isBrokenShell");
const end = swSrc.indexOf('self.addEventListener("install"');
assert.ok(start >= 0 && end > start, "no se encontro isBrokenShell en sw.js real");
vm.runInContext(swSrc.slice(start, end), sandbox, { timeout: 2000 });
assert.equal(typeof sandbox.isBrokenShell, "function");

assert.equal(sandbox.isBrokenShell(brokenShell), true);
assert.equal(sandbox.isBrokenShell(goodShell), false);
assert.equal(sandbox.isBrokenShell(""), true);
assert.equal(sandbox.isBrokenShell("x".repeat(6000)), true);
assert.equal(sandbox.isBrokenShell("x".repeat(6000) + "loginOverlay"), false);

const cacheStore = new Map();
cacheStore.set("/shell-body.html", goodShell);
async function networkFirstShell(pathKey, networkText) {
  if (!sandbox.isBrokenShell(networkText)) {
    cacheStore.set(pathKey, networkText);
    return networkText;
  }
  const cached = cacheStore.get(pathKey);
  if (cached && !sandbox.isBrokenShell(cached)) return cached;
  return networkText;
}
const fromNetBroken = await networkFirstShell("/shell-body.html", brokenShell);
assert.equal(fromNetBroken.includes("loginOverlay"), true, "debe devolver copia buena de cache");

cacheStore.set("/shell-body.html", brokenShell);
const recovered = await networkFirstShell("/shell-body.html", goodShell);
assert.equal(recovered.includes("loginOverlay"), true);
assert.equal(sandbox.isBrokenShell(cacheStore.get("/shell-body.html")), false);

console.log("PASS: SW isBrokenShell REAL + network-first + recuperacion");
console.log("NOTE: Usuario con SW viejo puede necesitar 1 recarga para activar el nuevo.");
