/**
 * RUTALOG — único worker / proxy GitHub (Fase 5)
 * wrangler.toml → main = worker.js
 * Solo repo luisglazala/rutalog-datos y rutas /contents/ (datos).
 * Secret: GITHUB_SECRET_TOKEN (nunca en el cliente).
 */
const ALLOWED_REPO = "luisglazala/rutalog-datos";
const ALLOWED_METHODS = new Set(["GET", "HEAD", "PUT", "PATCH", "POST", "OPTIONS"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api")) {
      return new Response(null, { status: 204, headers: corsHeaders() });
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

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
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

/**
 * Solo:
 *  /repos/luisglazala/rutalog-datos/contents/...
 *  /repos/luisglazala/rutalog-datos (meta)
 * Rechaza cualquier otro owner/repo o path (git/blobs, etc. fuera de contents).
 */
function pathAllowed(githubPath) {
  if (githubPath === "/rate_limit") return false;
  const m = githubPath.match(
    /^\/repos\/([^/]+)\/([^/]+)(?:\/(contents)(?:\/|$)|\/?$)/
  );
  if (!m) return false;
  const full = m[1] + "/" + m[2];
  if (full !== ALLOWED_REPO) return false;
  // repo root meta OK; deep paths must be under contents
  if (githubPath === "/repos/" + ALLOWED_REPO || githubPath === "/repos/" + ALLOWED_REPO + "/") {
    return true;
  }
  return githubPath.indexOf("/repos/" + ALLOWED_REPO + "/contents") === 0;
}

async function handleGitHubProxy(request, env, url) {
  const cors = corsHeaders();
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
          scope: "solo /contents/* de rutalog-datos",
        },
        200,
        cors
      );
    }

    if (!pathAllowed(githubPath)) {
      return json(
        {
          error: "Ruta o repositorio no permitido",
          allowed: ALLOWED_REPO + "/contents/*",
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
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");
    headers.set("User-Agent", "RUTALOG-Cloudflare-Proxy");
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
    const outHeaders = new Headers(ghRes.headers);
    Object.keys(cors).forEach(function (k) {
      outHeaders.set(k, cors[k]);
    });
    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");

    return new Response(ghRes.body, {
      status: ghRes.status,
      statusText: ghRes.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 500, corsHeaders());
  }
}
