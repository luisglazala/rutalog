# RUTALOG

Consolidador territorial · Luis Gerardo Lazala Ortiz

## URL oficial (usar esta)

**https://rutalog.pages.dev/**

La raíz (`/`) sirve la app directamente vía `index.html` (sin redirect).

El enlace antiguo sigue válido por compatibilidad:
`https://rutalog.pages.dev/RUTALOG%20GITHUB.html`

Entorno Cloudflare Pages. Es el despliegue estable.

> GitHub Pages (`luisglazala.github.io/rutalog`) puede no servir la app o quedar desfasado. No lo uses como enlace principal.

## Qué hace la app

Planificación de rutas, maestro de clientes, topes SKU, citas, auditoría de carga y sync de catálogos compartidos.

## Datos compartidos (privado)

Maestro, citas, topes, códigos SKU y usuarios viven en el repo privado `rutalog-datos`.

En **rutalog.pages.dev** el sync va por el proxy `/api` de Cloudflare (no hace falta pegar el token en el navegador).

## Desarrollo

- Entrada pública: `index.html` → misma carga que `RUTALOG GITHUB.html`.
- No renombrar `RUTALOG GITHUB.html` (marcadores y QR antiguos).
- Loader: `app.js` → core (`app-core-runtime.js` o CDN pin e638c98) → parches `mejoras-*.js`.
- No cambiar claves de `localStorage` ni la forma del JSON de `ghBuildPayload` sin migración.

## Sync

- Pull automático al abrir y al volver a la pestaña.
- Push al guardar catálogos (debounce ~1.5 s en el core).
- Pull en foco cada ~10 s; ~7 s si hay cambios pendientes (`mejoras-sync.js` v3.1).
