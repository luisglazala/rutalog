import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workerPath = path.join(root, "worker.js");
const entryPath = path.join(root, "_worker.js");

const entrySrc = fs.readFileSync(entryPath, "utf8");
assert.match(entrySrc, /export\s*\{\s*default\s*\}\s*from\s*["']\.\/worker\.js["']/);
assert.ok(!/pathAllowed|handleGitHubProxy|ALLOWED_REPO/.test(entrySrc), "_worker.js no debe tener lógica propia");

const mod = await import(pathToFileURL(workerPath).href);
const worker = mod.default;
assert.ok(worker && typeof worker.fetch === "function");

function req(method, url, host = "preview.rutalog.pages.dev", body = null) {
  const headers = new Headers({ Host: host });
  if (body) headers.set("Content-Type", "application/json");
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

const env = {
  GITHUB_SECRET_TOKEN: "test-token-not-real",
  ASSETS: { fetch: async () => new Response("asset", { status: 200 }) },
};

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log("PASS:", name); }
  catch (e) { failed++; console.error("FAIL:", name, e && e.message); }
}

await test("GET /api info", async () => {
  const r = await worker.fetch(req("GET", "https://preview.rutalog.pages.dev/api"), env);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ok, true);
});

await test("GET contents/data.json preview OK (ruta permitida)", async () => {
  const r = await worker.fetch(
    req("GET", "https://preview.rutalog.pages.dev/api/repos/luisglazala/rutalog-datos/contents/data.json"),
    env
  );
  assert.notEqual(r.status, 403);
});

await test("GET contents/otro.json → 403", async () => {
  const r = await worker.fetch(
    req("GET", "https://preview.rutalog.pages.dev/api/repos/luisglazala/rutalog-datos/contents/otro.json"),
    env
  );
  assert.equal(r.status, 403);
});

await test("GET blob SHA preview OK path", async () => {
  const sha = "a".repeat(40);
  const r = await worker.fetch(
    req("GET", "https://preview.rutalog.pages.dev/api/repos/luisglazala/rutalog-datos/git/blobs/" + sha),
    env
  );
  assert.notEqual(r.status, 403);
});

await test("PUT contents preview 403 escritura", async () => {
  const r = await worker.fetch(
    req("PUT", "https://preview.rutalog.pages.dev/api/repos/luisglazala/rutalog-datos/contents/data.json", "preview.rutalog.pages.dev", { message: "x", content: "e30=" }),
    env
  );
  assert.equal(r.status, 403);
});

await test("PUT localhost 403", async () => {
  const r = await worker.fetch(
    req("PUT", "https://localhost/api/repos/luisglazala/rutalog-datos/contents/data.json", "localhost", {}),
    env
  );
  assert.equal(r.status, 403);
});

await test("PUT prod host no 403 por preview-block", async () => {
  const r = await worker.fetch(
    req("PUT", "https://rutalog.pages.dev/api/repos/luisglazala/rutalog-datos/contents/data.json", "rutalog.pages.dev", {}),
    env
  );
  assert.notEqual(r.status, 403);
});

await test("other repo 403", async () => {
  const r = await worker.fetch(
    req("GET", "https://preview.rutalog.pages.dev/api/repos/other/other/contents/data.json"),
    env
  );
  assert.equal(r.status, 403);
});

await test("POST git/blobs path permitido (no 403 path)", async () => {
  const r = await worker.fetch(
    req("POST", "https://rutalog.pages.dev/api/repos/luisglazala/rutalog-datos/git/blobs", "rutalog.pages.dev", { content: "{}", encoding: "utf-8" }),
    env
  );
  assert.notEqual(r.status, 403);
});

console.log("passed:", passed, "failed:", failed);
if (failed) process.exit(1);
