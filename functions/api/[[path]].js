/** Cloudflare Pages Function: proxy seguro a GitHub API (token solo en el servidor) */
export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-GitHub-Api-Version",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    // /api/repos/... -> /repos/...
    let githubPath = url.pathname.replace(/^\/api/, "");
    if (!githubPath.startsWith("/")) githubPath = "/" + githubPath;
    const githubUrl = "https://api.github.com" + githubPath + url.search;

    const GITHUB_TOKEN = env.GITHUB_SECRET_TOKEN;
    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ error: "GITHUB_SECRET_TOKEN no configurado en Cloudflare" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modifiedHeaders = new Headers();
    modifiedHeaders.set("Authorization", "Bearer " + GITHUB_TOKEN);
    modifiedHeaders.set("User-Agent", "RUTALOG-Cloudflare-Proxy");
    const accept = request.headers.get("Accept");
    if (accept) modifiedHeaders.set("Accept", accept);
    else modifiedHeaders.set("Accept", "application/vnd.github+json");
    const apiVer = request.headers.get("X-GitHub-Api-Version");
    if (apiVer) modifiedHeaders.set("X-GitHub-Api-Version", apiVer);
    else modifiedHeaders.set("X-GitHub-Api-Version", "2022-11-28");
    const ct = request.headers.get("Content-Type");
    if (ct) modifiedHeaders.set("Content-Type", ct);

    const init = {
      method: request.method,
      headers: modifiedHeaders,
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }

    const githubResponse = await fetch(githubUrl, init);
    const responseHeaders = new Headers(githubResponse.headers);
    Object.keys(corsHeaders).forEach((key) => responseHeaders.set(key, corsHeaders[key]));

    return new Response(githubResponse.body, {
      status: githubResponse.status,
      statusText: githubResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error && error.message ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
