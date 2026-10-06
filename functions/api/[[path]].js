/** Pages Function /api/* — misma política que worker.js (solo rutalog-datos/contents) */
const ALLOWED_REPO = "luisglazala/rutalog-datos";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "PUT", "PATCH", "POST", "OPTIONS"]);

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
  };
}

function pathAllowed(githubPath) {
  const m = githubPath.match(/^\/repos\/([^/]+)\/([^/]+)(?:\/(contents)(?:\/|$)|\/?$)/);
  if (!m) return false;
  if (m[1] + "/" + m[2] !== ALLOWED_REPO) return false;
  if (githubPath === "/repos/" + ALLOWED_REPO || githubPath === "/repos/" + ALLOWED_REPO + "/") return true;
  return githubPath.indexOf("/repos/" + ALLOWED_REPO + "/contents") === 0;
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
      return new Response(JSON.stringify({ ok: true, repo: ALLOWED_REPO }), {
        status: 200, headers: Object.assign({ "Content-Type": "application/json" }, c),
      });
    }
    if (!pathAllowed(githubPath)) {
      return new Response(JSON.stringify({ error: "No permitido", allowed: ALLOWED_REPO + "/contents/*" }), {
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
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "RUTALOG-Pages-Function",
    });
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
