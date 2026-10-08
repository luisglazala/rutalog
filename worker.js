/**
 * RUTALOG — único worker / proxy GitHub (Fase 5)
 * wrangler.toml → main = worker.js
 * Solo repo luisglazala/rutalog-datos: contents/data.json + Git Data API.
 * Secret: GITHUB_SECRET_TOKEN (nunca en el cliente).
 * Preview: escritura bloqueada salvo ALLOW_PREVIEW_WRITES=1.
 */
const ALLOWED_REPO = "luisglazala/rutalog-datos";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "PUT", "PATCH", "POST", "OPTIONS"]);
const WRITE_METHODS = new Set(["PUT", "PATCH", "POST", "DELETE"]);
const PROD_HOST = "rutalog.pages.dev";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api")) {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleGitHubProxy(request, env, url);
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("RUTALOG Worker · /api → rutalog-datos", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

function corsHeaders(request) {
  var origin = "*";
  try {
    var o = (request && request.headers && request.headers.get("Origin")) || "";
    if (o === "https://rutalog.pages.dev") origin = o;
    else if (/^https:\/\/[a-z0-9-]+\.rutalog\.pages\.dev$/i.test(o)) origin = o;
    else if (!o) origin = "https://rutalog.pages.dev";
    else origin = "https://rutalog.pages.dev";
  } catch (e) { origin = "https://rutalog.pages.dev"; }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
    "Vary": "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign(
      { "Content-Type": "application/json; charset=utf-8" },
      cors || {}
    ),
  });
}

function pathAllowed(githubPath, method) {
  if (githubPath === "/rate_limit") return false;
  const m = githubPath.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (!m) return false;
  const full = m[1] + "/" + m[2];
  if (full !== ALLOWED_REPO) return false;
  const rest = m[3] || "";
  if (rest === "" || rest === "/") return true;
  if (/^\/contents\/data\.json$/i.test(rest) || /^\/contents\/data\.json\?/i.test(rest)) return true;
  if ((method === "GET" || method === "HEAD") && /^\/git\/blobs\/[0-9a-f]{40}$/i.test(rest)) return true;
  if (method === "POST" && rest === "/git/blobs") return true;
  if (method === "POST" && rest === "/git/trees") return true;
  if ((method === "GET" || method === "POST") && /^\/git\/commits(\/[0-9a-f]{40})?$/i.test(rest)) return true;
  if ((method === "GET" || method === "PATCH") && /^\/git\/refs\/heads\//i.test(rest)) return true;
  return false;
}

function isProdHost(request) {
  const host = (request.headers.get("Host") || "").toLowerCase().split(":")[0];
  if (host === PROD_HOST) return true;
  return false;
}

function writesAllowed(request, env) {
  if (isProdHost(request)) return true;
  if (env && (env.ALLOW_PREVIEW_WRITES === "1" || env.ALLOW_PREVIEW_WRITES === "true")) {
    return true;
  }
  return false;
}

async function handleGitHubProxy(request, env, url) {
  const cors = corsHeaders(request);
  try {
    if (!ALLOWED_METHODS.has(request.method)) {
      return json({ error: "Método no permitido" }, 405, cors);
    }

    let githubPath = url.pathname.replace(/^\/api/, "") || "/";
    if (!githubPath.startsWith("/")) githubPath = "/" + githubPath;

    if (githubPath === "/" || githubPath === "") {
      return json(
        {
          ok: true,
          service: "RUTALOG GitHub proxy",
          repo: ALLOWED_REPO,
          scope: "contents/data.json + Git Data API",
          writes: writesAllowed(request, env) ? "allowed" : "blocked-preview",
        },
        200,
        cors
      );
    }

    if (!pathAllowed(githubPath, request.method)) {
      return json(
        {
          error: "Ruta o repositorio no permitido",
          allowed: ALLOWED_REPO + "/contents/data.json y git data API",
        },
        403,
        cors
      );
    }

    if (WRITE_METHODS.has(request.method) && !writesAllowed(request, env)) {
      return json(
        {
          error: "Escritura bloqueada en preview",
          detail: "Solo lectura en hosts distintos de " + PROD_HOST + ". Define ALLOW_PREVIEW_WRITES=1 solo si es necesario.",
          host: request.headers.get("Host") || "",
        },
        403,
        cors
      );
    }

    const token = env.GITHUB_SECRET_TOKEN || env.GITHUB_TOKEN;
    if (!token) {
      return json({ error: "Token de servidor no configurado" }, 500, cors);
    }

    const ghUrl = "https://api.github.com" + githubPath + (url.search || "");
    const headers = new Headers();
    headers.set("Authorization", "Bearer " + token);
    headers.set("X-GitHub-Api-Version", "2022-11-28");
    headers.set("User-Agent", "RUTALOG-Cloudflare-Proxy");

    const clientAccept = request.headers.get("Accept") || "";
    if (clientAccept.indexOf("application/vnd.github.raw") >= 0) {
      headers.set("Accept", "application/vnd.github.raw+json");
    } else {
      headers.set("Accept", "application/vnd.github+json");
    }
    if (request.headers.get("Content-Type")) {
      headers.set("Content-Type", request.headers.get("Content-Type"));
    }

    const init = {
      method: request.method,
      headers: headers,
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }

    const ghRes = await fetch(ghUrl, init);
    const out = new Headers(ghRes.headers);
    Object.keys(cors).forEach((k) => out.set(k, cors[k]));
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(ghRes.body, {
      status: ghRes.status,
      statusText: ghRes.statusText,
      headers: out,
    });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500, cors);
  }
}
