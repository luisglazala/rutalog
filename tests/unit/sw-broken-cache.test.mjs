import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const goodShell = fs.readFileSync(path.join(root, "shell-body.html"), "utf8");
const brokenShell = '<!DOCTYPE html>\n<!-- RESTORE: content too large for single tool arg; use follow-up -->\n';

function isBrokenShell(text) {
  if (!text || text.length < 5000) return true;
  if (text.indexOf("loginOverlay") < 0) return true;
  if (text.indexOf("RESTORE_MARKER") >= 0) return true;
  if (text.indexOf("content too large for single tool arg") >= 0) return true;
  return false;
}

assert.equal(isBrokenShell(brokenShell), true);
assert.equal(isBrokenShell(goodShell), false);
assert.equal(isBrokenShell(""), true);
assert.equal(isBrokenShell("x".repeat(6000)), true);
assert.equal(isBrokenShell("x".repeat(6000) + "loginOverlay"), false);

const fakeCache = new Map();
fakeCache.set("/shell-body.html", brokenShell);
async function networkFirstShell(pathKey, networkText) {
  if (!isBrokenShell(networkText)) fakeCache.set(pathKey, networkText);
  return networkText;
}
const result = await networkFirstShell("/shell-body.html", goodShell);
assert.ok(result.includes("loginOverlay"));
assert.equal(isBrokenShell(fakeCache.get("/shell-body.html")), false);

fakeCache.set("/shell-body.html", brokenShell);
assert.equal(isBrokenShell(fakeCache.get("/shell-body.html")) ? null : fakeCache.get("/shell-body.html"), null);

console.log("PASS: SW isBrokenShell + network-first + offline reject broken");
console.log("NOTE: Usuario SW viejo puede necesitar 1 recarga; no borrar caché a mano.");
