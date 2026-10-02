/**
 * RUTALOG Cloudflare Worker
 * - /api/* → GitHub proxy
 * - /app-core-runtime.js → core pin e638c98 (mismo origen)
 */
const CORE_PIN =
  "https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api")) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleGitHubProxy(request, env, url);
    }

    if (
      url.pathname === "/app-core-runtime.js" ||
      url.pathname.endsWith("/app-core-runtime.js")
    ) {
      return handleCoreRuntime(request, ctx);
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("RUTALOG Worker OK · /api · /app-core-runtime.js", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
  };
}

async function handleCoreRuntime(request, ctx) {
  try {
    const cache = caches.default;
    const cacheKey = new Request(CORE_PIN, { method: "GET" });
    let res = await cache.match(cacheKey);
    if (!res) {
      const upstream = await fetch(CORE_PIN, {
        cf: { cacheTtl: 86400, cacheEverything: true },
      });
      if (!upstream.ok) {
        return new Response("// core pin fetch failed: " + upstream.status, {
          status: 502,
          headers: { "Content-Type": "application/javascript; charset=utf-8" },
        });
      }
      const body = await upstream.text();
      res = new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "X-Rutalog-Core": "e638c980",
        },
      });
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
      }
    }
    const out = new Response(res.body, res);
    out.headers.set("Content-Type", "application/javascript; charset=utf-8");
    out.headers.set("X-Rutalog-Core", "e638c980");
    return out;
  } catch (err) {
    return new Response(
      "// core error: " + (err && err.message ? err.message : String(err)),
      {
        status: 500,
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      }
    );
  }
}

async function handleGitHubProxy(request, env, url) {
  const cors = corsHeaders();
  try {
    let githubPath = url.pathname.replace(/^\/api/, "");
    if (!githubPath.startsWith("/")) githubPath = "/" + githubPath;
    if (githubPath === "/") {
      return json(
        { ok: true, service: "RUTALOG GitHub proxy", hint: "/api/repos/..." },
        200,
        cors
      );
    }

    const githubUrl = "https://api.github.com" + githubPath + url.search;
    const token = env.GITHUB_SECRET_TOKEN;
    if (!token) {
      return json(
        { error: "GITHUB_SECRET_TOKEN no configurado en el Worker" },
        500,
        cors
      );
    }

    const headers = new Headers();
    headers.set("Authorization", "Bearer " + token);
    headers.set("User-Agent", "RUTALOG-Cloudflare-Proxy");
    headers.set(
      "Accept",
      request.headers.get("Accept") || "application/vnd.github+json"
    );
    headers.set(
      "X-GitHub-Api-Version",
      request.headers.get("X-GitHub-Api-Version") || "2022-11-28"
    );
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
    return json(
      { error: err && err.message ? err.message : String(err) },
      500,
      cors
    );
  }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
