import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_REPO = "luisglazala/rutalog-datos";
const WRITE_METHODS = new Set(["PUT", "PATCH", "POST", "DELETE"]);
const PROD_HOST = "rutalog.pages.dev";

function pathAllowed(githubPath, method) {
  const m = githubPath.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (!m) return false;
  if (m[1] + "/" + m[2] !== ALLOWED_REPO) return false;
  const rest = m[3] || "";
  if (rest === "" || rest === "/") return true;
  if (rest.indexOf("/contents") === 0) return true;
  if ((method === "GET" || method === "HEAD") && /^\/git\/blobs\/[0-9a-f]{40}$/i.test(rest)) return true;
  return false;
}
function isProdHost(hostHeader) {
  return String(hostHeader || "").toLowerCase().split(":")[0] === PROD_HOST;
}
function writesAllowed(hostHeader, env) {
  if (isProdHost(hostHeader)) return true;
  if (env && (env.ALLOW_PREVIEW_WRITES === "1" || env.ALLOW_PREVIEW_WRITES === "true")) return true;
  return false;
}
function decide(method, githubPath, host, env = {}) {
  if (!pathAllowed(githubPath, method)) return { status: 403, reason: "path" };
  if (WRITE_METHODS.has(method) && !writesAllowed(host, env)) return { status: 403, reason: "preview-write-block" };
  return { status: 200, reason: "ok" };
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("PASS:", name); }
  catch (e) { failed++; console.error("FAIL:", name, e.message); }
}

const contentsPath = "/repos/luisglazala/rutalog-datos/contents/data.json";
const blobPath = "/repos/luisglazala/rutalog-datos/git/blobs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("GET contents preview OK", () => assert.equal(decide("GET", contentsPath, "limpieza.rutalog.pages.dev").status, 200));
test("GET blob preview OK", () => assert.equal(decide("GET", blobPath, "abc.rutalog.pages.dev").status, 200));
test("PUT preview 403", () => { const r = decide("PUT", contentsPath, "limpieza.rutalog.pages.dev"); assert.equal(r.status, 403); assert.equal(r.reason, "preview-write-block"); });
test("POST preview 403", () => assert.equal(decide("POST", contentsPath, "x.pages.dev").status, 403));
test("PUT localhost 403", () => assert.equal(decide("PUT", contentsPath, "localhost:8787").status, 403));
test("PUT prod OK", () => assert.equal(decide("PUT", contentsPath, "rutalog.pages.dev").status, 200));
test("POST prod OK", () => assert.equal(decide("POST", contentsPath, "rutalog.pages.dev").status, 200));
test("PUT preview + ALLOW_PREVIEW_WRITES", () => assert.equal(decide("PUT", contentsPath, "limpieza.rutalog.pages.dev", { ALLOW_PREVIEW_WRITES: "1" }).status, 200));
test("other repo 403", () => assert.equal(decide("GET", "/repos/other/repo/contents/x", "rutalog.pages.dev").reason, "path"));
test("DELETE preview 403", () => assert.equal(decide("DELETE", contentsPath, "foo.rutalog.pages.dev").status, 403));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const worker = fs.readFileSync(path.join(root, "worker.js"), "utf8");
const fn = fs.readFileSync(path.join(root, "functions/api/[[path]].js"), "utf8");
test("worker has writesAllowed", () => { assert.match(worker, /writesAllowed/); assert.match(worker, /rutalog\.pages\.dev/); assert.match(worker, /ALLOW_PREVIEW_WRITES/); });
test("functions has writesAllowed", () => { assert.match(fn, /writesAllowed/); assert.match(fn, /ALLOW_PREVIEW_WRITES/); });

console.log("passed:", passed, "failed:", failed);
if (failed) process.exit(1);
