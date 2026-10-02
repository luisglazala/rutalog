# Cloudflare Pages — RUTALOG

## 1. Conectar el repo
En Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → `luisglazala/rutalog`.

- Framework preset: **None**
- Build command: *(vacío)*
- Build output directory: `/` (o `.`)

## 2. Secret del token
Settings → Environment variables → Add:

| Name | Value |
|------|--------|
| `GITHUB_SECRET_TOKEN` | Tu PAT de GitHub (repo `rutalog-datos`, contents read/write) |

Marcar como **Encrypt** / Secret. Aplicar a Production (y Preview si quieres).

## 3. Cómo funciona
- `functions/api/[[path]].js` recibe `/api/repos/...` y llama a `https://api.github.com/repos/...` con el token del servidor.
- `mejoras-gh-proxy.js` reescribe los `fetch` del navegador de `api.github.com` → `/api` y **elimina** la cabecera Authorization.
- El token **nunca** viaja al frontend.

## 4. Dominio
Tras el deploy, la app queda en `https://<proyecto>.pages.dev`.  
Si sigues en GitHub Pages, el proxy `/api` no existirá ahí: hay que usar la URL de Cloudflare Pages.

Opcional en consola del navegador antes de sync:
```js
window.RUTALOG_API_BASE = "https://<proyecto>.pages.dev/api";
```
