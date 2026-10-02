# Cloudflare Worker — RUTALOG

URL: `https://rutalog.luisgerardo024.workers.dev`

## Por qué daba 404 en `/api`
El Worker solo servía archivos estáticos (HTML/JS). **No había código que atendiera `/api/*`**.

Solución: `worker.js` en la raíz del repo (proxy a GitHub API).

## Qué hacer ahora (Dashboard)

1. Entra a **Workers & Pages → rutalog**
2. **Edit code** / Deploy y asegúrate de que el script del Worker sea el contenido de **`worker.js`** del repo (o conecta el repo y redeploy).
3. **Settings → Variables and Secrets**:
   - `GITHUB_SECRET_TOKEN` = tu PAT (acceso a `luisglazala/rutalog-datos`)
4. **Save and deploy**

## Deploy con Wrangler (alternativa)

```bash
npm i -g wrangler
cd rutalog
wrangler secret put GITHUB_SECRET_TOKEN
wrangler deploy
```

## Cómo comprobar que el proxy funciona

1. Abre: https://rutalog.luisgerardo024.workers.dev/api  
   Debe responder algo como: `{"ok":true,"service":"RUTALOG GitHub proxy"}`

2. Luego:  
   https://rutalog.luisgerardo024.workers.dev/api/repos/luisglazala/rutalog-datos/contents/data.json?ref=main  
   Debe devolver JSON de GitHub (no la página de error 404 del navegador).

## App
https://rutalog.luisgerardo024.workers.dev/RUTALOG%20GITHUB.html

El frontend ya apunta el proxy a `/api` en ese dominio.
