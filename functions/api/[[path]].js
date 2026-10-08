/** Pages Function /api/* — misma política que worker.js */
const ALLOWED_REPO = "luisglazala/rutalog-datos";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "PUT", "PATCH", "POST", "OPTIONS"]);
const WRITE_METHODS = new Set(["PUT", "PATCH", "POST", "DELETE"]);
const PROD_HOST = "rutalog.pages.dev";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
  };
}

function pathAllowed(githubPath, method) {
  const m = githubPath.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (!m) return false;
  if (m[1] + "/" + m[2] !== ALLOWED_REPO) return false;
  const rest = m[3] || "";
  if (rest === "" || rest === "/") return true;
  if (rest.indexOf("/contents") === 0) return true;
  if ((method === "GET" || method === "HEAD") && /^\/git\/blobs\/[0-9a-f]{40}$/i.test(rest)) {
    return true;
  }
  return false;
}

function isProdHost(request) {
  const host = (request.headers.get("Host") || "").toLowerCase().split(":")[0];
  return host === PROD_HOST;
}

function writesAllowed(request, env) {
  if (isProdHost(request)) return true;
  if (env && (env.ALLOW_PREVIEW_WRITES === "1" || env.ALLOW_PREVIEW_WRITES === "true")) return true;
  return false;
}

export async function onRequest(context) {
  const { request, env } = context;
  const c = cors();
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: c });
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405, headers: Object.assign({ "Content-Type": "application/json" }, c),
    });
  }
  try {
    const url = new URL(request.url);
    let githubPath = url.pathname.replace(/^\/api/, "") || "/";
    if (!githubPath.startsWith("/")) githubPath = "/" + githubPath;
    if (githubPath === "/" || githubPath === "") {
      return new Response(JSON.stringify({
        ok: true,
        repo: ALLOWED_REPO,
        writes: writesAllowed(request, env) ? "allowed" : "blocked-preview",
      }), {
        status: 200, headers: Object.assign({ "Content-Type": "application/json" }, c),
      });
    }
    if (!pathAllowed(githubPath, request.method)) {
      return new Response(JSON.stringify({ error: "No permitido", allowed: ALLOWED_REPO + "/contents/* + GET git/blobs" }), {
        status: 403, headers: Object.assign({ "Content-Type": "application/json" }, c),
      });
    }
    if (WRITE_METHODS.has(request.method) && !writesAllowed(request, env)) {
      return new Response(JSON.stringify({
        error: "Escritura bloqueada en preview",
        detail: "Solo lectura en hosts distintos de " + PROD_HOST,
        host: request.headers.get("Host") || "",
      }), {
        status: 403, headers: Object.assign({ "Content-Type": "application/json" }, c),
      });
    }
    const token = env.GITHUB_SECRET_TOKEN || env.GITHUB_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: "Token no configurado" }), {
        status: 500, headers: Object.assign({ "Content-Type": "application/json" }, c),
      });
    }
    const ghUrl = "https://api.github.com" + githubPath + url.search;
    const headers = new Headers({
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "RUTALOG-Pages-Function",
    });
    const clientAccept = request.headers.get("Accept") || "";
    if (clientAccept.indexOf("application/vnd.github.raw") >= 0) {
      headers.set("Accept", "application/vnd.github.raw+json");
    } else {
      headers.set("Accept", "application/vnd.github+json");
    }
    if (request.headers.get("Content-Type")) headers.set("Content-Type", request.headers.get("Content-Type"));
    const init = { method: request.method, headers };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }
    const ghRes = await fetch(ghUrl, init);
    const out = new Headers(ghRes.headers);
    Object.keys(c).forEach((k) => out.set(k, c[k]));
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(ghRes.body, { status: ghRes.status, statusText: ghRes.statusText, headers: out });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500, headers: Object.assign({ "Content-Type": "application/json" }, c),
    });
  }
}
