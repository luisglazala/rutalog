/**
 * RUTALOG Cloudflare Worker
 * - /api/*  → proxy a api.github.com con GITHUB_SECRET_TOKEN
 * - resto   → assets estáticos del proyecto (si existen)
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api")) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleGitHubProxy(request, env, url);
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("RUTALOG Worker OK · use /api/... for GitHub proxy", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
  };
}

async function handleGitHubProxy(request, env, url) {
  const cors = corsHeaders();
  try {
    let githubPath = url.pathname.replace(/^\/api/, "");
    if (!githubPath.startsWith("/")) githubPath = "/" + githubPath;
    if (githubPath === "/") {
      return json({ ok: true, service: "RUTALOG GitHub proxy", hint: "/api/repos/..." }, 200, cors);
    }

    const githubUrl = "https://api.github.com" + githubPath + url.search;
    const token = env.GITHUB_SECRET_TOKEN;
    if (!token) {
      return json({ error: "GITHUB_SECRET_TOKEN no configurado en el Worker" }, 500, cors);
    }

    const headers = new Headers();
    headers.set("Authorization", "Bearer " + token);
    headers.set("User-Agent", "RUTALOG-Cloudflare-Proxy");
    headers.set("Accept", request.headers.get("Accept") || "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", request.headers.get("X-GitHub-Api-Version") || "2022-11-28");
    const ct = request.headers.get("Content-Type");
    if (ct) headers.set("Content-Type", ct);

    const init = { method: request.method, headers };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }

    const ghRes = await fetch(githubUrl, init);
    const outHeaders = new Headers(ghRes.headers);
    Object.keys(cors).forEach((k) => outHeaders.set(k, cors[k]));

    return new Response(ghRes.body, {
      status: ghRes.status,
      statusText: ghRes.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    return json({ error: err && err.message ? err.message : String(err) }, 500, cors);
  }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
