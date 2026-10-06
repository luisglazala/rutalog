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
