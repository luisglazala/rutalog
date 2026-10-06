# NOTAS — rama arreglo-ui

## Fase 0 (recuperar estilos)
- Causa: styles.css quedó en ~1.8 kB solo con layout de #page-rutas; se perdió el diseño base.
- Última versión con @import jsDelivr: commit ccdbcba0 (`@e638c980.../styles.css`).
- base.css = contenido completo de ese CSS del core e638 (~43 kB), embebido en el repo para no depender de la CDN.
- styles.css = `@import url("base.css");` + overlays locales de ccdbcba0 (part2, estéticas, leaflet, alturas mapa) + bloque actual de layout de rutas.
- Suposición segura: no había url() relativas a fuentes en el CSS e638 (verificado).

## No tocado
- rutalog-datos, tokens, usuarios, maestro, citas data.


## Fase 2.4 (parcial)
- `rutas-mapa.js`: único ResizeObserver + invalidateSize debounced del mapa de rutas vía hooks.
- No se eliminaron aún todos los parches de mapa (siguen vivos); fusión completa pendiente de validación en preview.

## Fase 3
- `mejoras-planificacion.js`: eliminado selector visual de camión (`rutalogPlanCamion`) y panel de restantes (`mostrarRestantes` no-op visual). Plantilla por defecto G en `estado`. Se conserva botón Generar viaje.
- NOTA: auditoría de topes sigue mostrando plantillas G/P (otra pantalla); no se tocó.

## Fase 4
- `mejoras-responsive.css`: dvh, grid rutas en móvil (mapa arriba / panel abajo), botones topbar ≥40px solo `.btn`.
- `test-resoluciones.mjs` no existe en el repo: no ejecutado.

## Fase 5
- `_headers` con nosniff, DENY frame, CSP básica (OSM, OSRM, cdnjs). Verificar en preview que no bloquee tiles/OSRM.
- Worker: ya limitaba repos `rutalog` + `rutalog-datos`. No se eliminaron las 3 variantes de worker en este paso (requiere confirmar cuál usa Pages).
- Cloudflare Access: proteger `/` (app) y no exponer tokens; el proxy `/api` debe seguir autenticado solo por secret de servidor. Configurar Access tú en el dashboard.
- No se tocó rutalog-datos ni secretos.


## Paso 2.3 (cierre parcial 2026-10-06)
Migrados a RUTALOG.hooks (sin reasignar window.* cuando hooks está):
- ui-centro-viajes, mapa-ciudades-ruta, mapa-fix (setCoreRenderMapas), rutas-panel-ui, sin-rectas, go-perf noop, codigo-perf parcial.
hooks v5: setCoreRenderMapas / setCoreGo / setCoreRefrescarRutaUI.

## Paso 2.4 (parcial)
rutas-mapa v2 coordinador RO + hooks. No se eliminaron aún todos los archivos de parche (siguen aportando lógica: fillCluster, filtros ciudades, etc.).

## Fase 3
planificacion sin UI camión/restantes (previo).

## Fase 4
mejoras-responsive + fix-mapa-rutas.

## Fase 5
_headers CSP ampliado; worker.js allowlist repos. Cloudflare Access: configurar en dashboard (no en código). No tocar secretos.
Varios entrypoints worker (_worker.js, functions/) — unificar cuando se confirme cuál usa el proyecto Pages.


## Fase 5 — Seguridad (2026-10-06)

### Worker único
- Canónico: `worker.js` (wrangler.toml `main`).
- `_worker.js` solo reexporta `worker.js` (no duplicar lógica).
- `functions/api/[[path]].js` + `functions/api.js`: misma allowlist para Pages Functions.

### Allowlist
- Solo `luisglazala/rutalog-datos`
- Solo paths `/repos/.../contents/...` (y meta del repo)
- Rechazo 403 a cualquier otro repo/ruta

### CSP / headers
- `_headers`: nosniff, SAMEORIGIN, CSP con OSM/OSRM/cdnjs/pages.dev

### XSS citas
- `esc()` en `mejoras-citas-tabla.js` escapa `& < > " '`

### CI
- `.github/workflows/js-check.yml` → `node --check` en todos los `.js`

### Cloudflare Access (manual)
Rutas a considerar proteger en el dashboard:
- `/*` (app completa) o al menos la UI de operadores
- No hace falta poner el PAT en Access: el secret del proxy ya es server-side
- Evitar exponer preview públicas con datos reales si no hay Access

### No hecho a propósito
- No se configuró Access desde código (lo hace el dueño en Cloudflare).
