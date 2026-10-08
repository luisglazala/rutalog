import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const calls = { writes: 0, reads: 0 };
function reset() { calls.writes = 0; calls.reads = 0; }
function makeLS() {
  const s = new Map();
  return {
    getItem: k => s.has(k) ? s.get(k) : null,
    setItem: (k,v) => s.set(String(k), String(v)),
    removeItem: k => s.delete(k),
  };
}
function okJson(obj, status=200) {
  return { ok: status>=200&&status<300, status, json: async()=>obj, text: async()=>JSON.stringify(obj), clone(){return okJson(obj,status);} };
}
function errRes(status, body="") {
  return { ok:false, status, json: async()=>{ try{return JSON.parse(body);}catch{return{message:body};} }, text: async()=>body, clone(){return errRes(status,body);} };
}

const GOOD_DATA = { version:1, usuarios:[{id:"1",username:"admin",activo:true},{id:"2",username:"op",activo:true}], maestroClientes:[{id:"c1"}], citas:{}, topesSku:[], codigoSku:[] };
const GOOD_TEXT = JSON.stringify(GOOD_DATA);
const GOOD_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const GOOD_B64 = Buffer.from(GOOD_TEXT,"utf8").toString("base64");

function loadGh(fetchImpl, ls) {
  const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: ls,
    document: { getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[], addEventListener:()=>{}, hidden:false },
    window: {}, location: { protocol:"https:" },
    fetch: async (url, init={}) => {
      const m = (init.method||"GET").toUpperCase();
      if (["PUT","POST","PATCH","DELETE"].includes(m)) calls.writes++; else calls.reads++;
      return fetchImpl(String(url), init);
    },
    JSON, TextEncoder: globalThis.TextEncoder, TextDecoder: globalThis.TextDecoder,
    atob: s => Buffer.from(s,"base64").toString("binary"),
    btoa: s => Buffer.from(s,"binary").toString("base64"),
    Map, Array, Object, String, Number, Boolean, Error, Promise, Date, Math,
    parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  };
  sandbox.window = sandbox;
  const src = fs.readFileSync(path.join(root,"core-app.js"),"utf8");
  const start = src.indexOf("function ghGetToken()");
  const end = src.indexOf("async function ghActualizar");
  const block = src.slice(start, end);
  const preamble = `
    var estado = { maestro:new Map(), citas:new Map(), topesSku:new Map(), maestroCodigo:new Map() };
    var GH_SYNC = { owner:"luisglazala", repo:"rutalog-datos", path:"data.json", branch:"main", LS_TOKEN:"rutalog_gh_token", LS_META:"rutalog_gh_meta" };
    function toast(m){ sandbox_lastToast=String(m); } var sandbox_lastToast="";
    function ghUpdateSyncBadge(){}
    function ghClearDirty(){} function ghIsDirty(){return false;} function ghMarkDirty(){} function ghSchedulePush(){}
    function ghB64ToUtf8(b64){ var bin=atob(b64); var bytes=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); return new TextDecoder("utf-8").decode(bytes); }
    function loadUsers(){ try{return JSON.parse(localStorage.getItem("rutalog_usuarios_v2")||"[]");}catch(e){return [];} }
    function ghBuildPayload(){ return { version:1, updatedAt:new Date().toISOString(), updatedBy:"test", maestroClientes:[], citas:{}, topesSku:[], codigoSku:[], usuarios:loadUsers() }; }
  `;
  vm.createContext(sandbox);
  vm.runInContext(preamble + "\n" + block, sandbox, { timeout: 5000 });
  return sandbox;
}

let passed=0, failed=0;
async function test(name, fn) {
  reset();
  try { await fn(); passed++; console.log("PASS:", name); }
  catch(e) { failed++; console.error("FAIL:", name, e.message); }
}

await test("content vacío → failed, 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  ls.setItem("rutalog_gh_last_good", JSON.stringify({sha:GOOD_SHA,size:GOOD_TEXT.length,users:2}));
  const s = loadGh(async (url) => {
    if (url.includes("/contents/")) return okJson({sha:"b".repeat(40), content:"", encoding:"none", size:1200000});
    if (url.includes("/git/blobs/")) return okJson({sha:"b".repeat(40), content:"", encoding:"base64", size:0});
    return errRes(500);
  }, ls);
  let threw=false; try{ await s.ghFetchFile(); }catch(e){ threw=true; }
  assert.equal(threw, true); assert.equal(calls.writes, 0); assert.equal(s.ghLastReadFailed(), true);
});

await test("1.2MB blob OK, 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  const big = {...GOOD_DATA, pad:"x".repeat(1_200_000)};
  const bigText = JSON.stringify(big);
  const bigB64 = Buffer.from(bigText,"utf8").toString("base64");
  const sha = "c".repeat(40);
  const s = loadGh(async (url) => {
    if (url.includes("/contents/")) return okJson({sha, content:"", encoding:"none", size:bigText.length});
    if (url.includes("/git/blobs/"+sha)) return okJson({sha, content:bigB64, encoding:"base64", size:bigText.length});
    return errRes(404);
  }, ls);
  const r = await s.ghFetchFile();
  assert.equal(r.data.usuarios.length, 2); assert.ok(r.size > 1_000_000); assert.equal(calls.writes, 0);
});

await test("401 → 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","bad");
  const s = loadGh(async () => errRes(401,'{"message":"Bad credentials"}'), ls);
  try{ await s.ghFetchFile(); }catch(e){ assert.match(e.message,/401|Token/i); }
  assert.equal(calls.writes, 0); assert.equal(s.ghLastReadFailed(), true);
});

await test("403 → 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  const s = loadGh(async () => errRes(403,'{"message":"Forbidden"}'), ls);
  try{ await s.ghFetchFile(); }catch(e){ assert.match(e.message,/403|Token|permiso/i); }
  assert.equal(calls.writes, 0);
});

await test("404 → 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  const s = loadGh(async () => errRes(404,"Not Found"), ls);
  try{ await s.ghFetchFile(); }catch(e){ assert.match(e.message,/No existe|404/i); }
  assert.equal(calls.writes, 0);
});

await test("red caída → 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  const s = loadGh(async () => { throw new TypeError("Failed to fetch"); }, ls);
  try{ await s.ghFetchFile(); }catch(e){ assert.match(e.message,/Sin conexión|Failed to fetch/i); }
  assert.equal(calls.writes, 0);
});

await test("sha unchanged → 1 read, 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  ls.setItem("rutalog_gh_sha", GOOD_SHA);
  ls.setItem("rutalog_gh_last_good", JSON.stringify({sha:GOOD_SHA, size:GOOD_TEXT.length, users:2}));
  const s = loadGh(async (url) => {
    if (url.includes("/contents/")) return okJson({sha:GOOD_SHA, content:GOOD_B64, encoding:"base64", size:GOOD_TEXT.length});
    return errRes(500);
  }, ls);
  const r = await s.ghFetchFile();
  assert.equal(r.unchanged, true); assert.equal(r.data, null); assert.equal(calls.writes, 0); assert.equal(calls.reads, 1);
});

await test("push bloqueado read_failed", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  ls.setItem("rutalog_usuarios_v2", JSON.stringify(GOOD_DATA.usuarios));
  const s = loadGh(async () => errRes(500), ls);
  s.ghMarkReadFailed("sim");
  try{ await s.ghPushWithSha(GOOD_SHA, true); }catch(e){ assert.match(e.message,/Escritura bloqueada/i); }
  assert.equal(calls.writes, 0);
});

await test("push bloqueado users→0", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  ls.setItem("rutalog_usuarios_v2", "[]");
  ls.setItem("rutalog_gh_last_good", JSON.stringify({sha:GOOD_SHA, size:50000, users:5}));
  ls.removeItem("rutalog_gh_read_failed");
  const s = loadGh(async () => errRes(500), ls);
  try{ await s.ghPushWithSha(GOOD_SHA, true); }catch(e){ assert.match(e.message,/Escritura bloqueada.*usuarios/i); }
  assert.equal(calls.writes, 0);
});

await test("push bloqueado size<50%", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  ls.setItem("rutalog_usuarios_v2", JSON.stringify(GOOD_DATA.usuarios));
  ls.setItem("rutalog_gh_last_good", JSON.stringify({sha:GOOD_SHA, size:500000, users:2}));
  ls.removeItem("rutalog_gh_read_failed");
  const s = loadGh(async () => errRes(500), ls);
  try{ await s.ghPushWithSha(GOOD_SHA, true); }catch(e){ assert.match(e.message,/Escritura bloqueada.*<50%/i); }
  assert.equal(calls.writes, 0);
});

await test("mensaje login distingue", async () => {
  const ls = makeLS();
  const s = loadGh(async () => errRes(500), ls);
  s.ghMarkReadFailed("t");
  const msg = s.ghLastReadFailed()
    ? "No se pudo leer el catálogo desde GitHub (archivo grande o red). Reintenta «Actualizar» en Configuración."
    : "No hay usuarios registrados.";
  assert.match(msg, /No se pudo leer el catálogo/);
});

await test("409 + read_failed → 0 writes", async () => {
  const ls = makeLS(); ls.setItem("rutalog_gh_token","tok");
  ls.setItem("rutalog_usuarios_v2", JSON.stringify(GOOD_DATA.usuarios));
  const s = loadGh(async () => errRes(409,'{"message":"Conflict"}'), ls);
  s.ghMarkReadFailed("stale");
  try{ await s.ghPushWithSha("old", true); }catch(e){ assert.match(e.message,/Escritura bloqueada/i); }
  assert.equal(calls.writes, 0);
});

console.log("passed:", passed, "failed:", failed);
if (failed) process.exit(1);
