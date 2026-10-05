/** Cloudflare Pages Function — proxy GitHub con lista blanca de repos */
const ALLOWED_REPOS = ["luisglazala/rutalog-datos", "luisglazala/rutalog"];

export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  try {
    const url = new URL(request.url);
    let githubPath = url.pathname.replace(/^\/api/, "") || "/";
    if (!githubPath.startsWith("/")) githubPath = "/" + githubPath;
    if (githubPath === "/") {
      return new Response(JSON.stringify({ ok: true, repos: ALLOWED_REPOS }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const m = githubPath.match(/^\/repos\/([^/]+)\/([^/]+)/);
    if (!m || ALLOWED_REPOS.indexOf(m[1] + "/" + m[2]) === -1) {
      if (githubPath !== "/rate_limit") {
        return new Response(JSON.stringify({ error: "Ruta no permitida", path: githubPath }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }
    const token = env.GITHUB_SECRET_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: "GITHUB_SECRET_TOKEN missing" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
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
    }
    const ghRes = await fetch("https://api.github.com" + githubPath + url.search, init);
    const outHeaders = new Headers(ghRes.headers);
    Object.keys(cors).forEach((k) => outHeaders.set(k, cors[k]));
    return new Response(ghRes.body, { status: ghRes.status, statusText: ghRes.statusText, headers: outHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
