# RUTALOG

Consolidador territorial · Luis Gerardo Lazala Ortiz

## URL oficial

**https://rutalog.pages.dev/**

Preview de ramas: `https://<rama>.rutalog.pages.dev/` (ej. `arreglo-ui`).

## Arquitectura breve

- Frontend estático (HTML/JS/CSS) en Cloudflare Pages
- `worker.js`: proxy `/api` → GitHub API, **solo** repo `rutalog-datos` y rutas `/contents/`
- Token `GITHUB_SECRET_TOKEN` solo en el servidor (nunca en el navegador)

## Desarrollo

```bash
# sintaxis JS
find . -name '*.js' -not -path './.git/*' -exec node --check {} \;
```

CI: `.github/workflows/js-check.yml` ejecuta `node --check` en cada push.

## Seguridad

Ver `NOTAS.md` (Cloudflare Access, CSP en `_headers`).
