# FIX lectura data.json > 1 MB + protección escritura + lectura meta-first

## Causa
API Contents devuelve `content:""` / `encoding:"none"` para archivos >1 MB. El proxy bloqueaba `/git/blobs` → catálogo vacío → «No hay usuarios registrados».

## Lectura actual (meta-first)
1. Metadatos (sha) siempre.
2. Si sha = última buena → `unchanged` (1 petición).
3. Si meta trae content base64 → parse (1 petición).
4. Si content vacío → `/git/blobs/{sha}` (2 peticiones).
5. Dedupe in-flight unifica llamadas concurrentes del arranque.

## Proxy
- GET/HEAD `/git/blobs/{sha40}` permitido.
- Escrituras bloqueadas si Host ≠ `rutalog.pages.dev` salvo `ALLOW_PREVIEW_WRITES=1`.
- Un solo token de servidor compartido (`GITHUB_SECRET_TOKEN`).

## Protección escritura (core-app)
- Bloqueo si última lectura falló, usuarios→0 con last_good.users>0, o size <50% last_good.
- Login: «No se pudo leer el catálogo…» vs «No hay usuarios registrados».

## Pruebas (ejecutadas en entorno de desarrollo)
- `tests/unit/sync-read-protection.test.mjs` — 12 casos (401/403/404/red/1.2MB/users→0/<50%)
- `tests/unit/proxy-preview-writes.test.mjs` — preview 403 / prod OK
- `tests/unit/sw-broken-cache.test.mjs` — SW rechaza shell 85 B
- `tests/e2e/shell-login.spec.mjs` — loginOverlay, sin shell incompleto

## Presupuesto API
~100 lecturas/h por usuario; 10 usuarios ≈ 1000/h ≪ 5000/h del token compartido.
