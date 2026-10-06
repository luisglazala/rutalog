# DIAGNÓSTICO RUTALOG — rama arreglo-ui

Fecha de inventario: 2026-10-06. Fuente: árbol `arreglo-ui` + preview `https://arreglo-ui.rutalog.pages.dev/`.

## 0. Fase 0 (estilos)

- Causa del fallo visual: `styles.css` en main quedó en ~1834 bytes solo con layout de `#page-rutas`; se perdió el diseño base.
- Última versión con `@import` a jsDelivr: commit `ccdbcba0` (`@e638c980.../styles.css`).
- Recuperación: `base.css` (~43107 bytes) = CSS completo e638 en el repo; `styles.css` empieza por `@import url("base.css");` + overlays locales + layout rutas.
- Verificación automática `test-resoluciones.mjs`: NO existe en el repo (ni en arreglo-ui ni listado de blobs). No se pudo ejecutar.
- Verificación de red en preview: `base.css` HTTP 200 ~43KB con `:root`, `font-family: Inter, system-ui`; `styles.css` comienza con `@import url("base.css");`.
- Captura 1366×768: no generada en este paso (sin Playwright en entorno / sin test-resoluciones.mjs). Pendiente confirmación visual humana en la preview.

## 1. Cargas duplicadas (una línea por hallazgo)

- DUPLICADO CSS: `mejoras-v2.css?v=11` se carga desde `index.html` (link stylesheet) y otra vez desde `app.js` función `loadExtras()` (crea link `#rutalog-mejoras-v2-css`).
- DUPLICADO CSS: `mejoras-layout.css?v=3` se carga desde `index.html` (link stylesheet) y otra vez desde `app.js` función `loadExtras()` (crea link `#rutalog-layout-css`).
- DUPLICADO JS: `mejoras-storage.js?v=1` se carga desde `index.html` (script) y otra vez desde `app.js` vía `onceScript("__rutalogStorage", ...)`.
- DUPLICADO JS: `mejoras-gh-proxy.js?v=3` se carga desde `index.html` (script) y otra vez desde `app.js` vía `onceScript("__rutalogGhProxy", ...)`.
- DUPLICADO JS: `mejoras-login-inmediato.js?v=9` se carga desde `index.html` (script) y otra vez desde `app.js` vía `onceScript("__rutalogLoginInmediatoV8", ...)` (el flag onceScript puede evitar la 2ª ejecución si la 1ª ya marcó el flag; el archivo puede pedirse igual según orden).
- DUPLICADO BLOQUE MAPA: en `app.js`, el mismo grupo de `onceScript` de mapa/ciudades/rutas se invoca en `loadExtras()` y se vuelve a invocar tras `loadScript(APP)` (segunda pasada de: `mejoras-mapa.js`, `mejoras-map-refresh.js`, `mejoras-ciudades.js`, `mejoras-ciudades-disponibles.js`, `mejoras-map-despachados.js`, `mejoras-mapa-fix.js`, `mejoras-mapa-hide.js`, `mejoras-mapa-ciudades-ruta.js`, `mejoras-plan-filtro.js`, `mejoras-ui-centro-viajes.js`, `mejoras-mapa-sin-rectas.js`, `mejoras-despachos-delete.js`, `mejoras-rutas-panel-ui.js`).
- EFECTO OBSERVADO: logs de consola repetidos del tipo `[storage-v1]`, sync y ciudades; en Network, CSS de mejoras-v2 y layout pueden aparecer dos veces.

## 2. setInterval activos (archivo, línea aprox., ms, vista/efecto)

- `core-app.js` ~L5367: intervalo 60000 ms — pull GitHub silencioso (`ghStartPullLoop`); afecta sync global (todas las vistas si hay token).
- `core-app.js` ~L5989: intervalo 120000 ms — respaldo `ghActualizar` cada 2 min; sync global.
- `core-app.js` (contexto cerca de L5989): también hay disparo relacionado a 8000 ms en el bloque de auto-sync al montar; sync global.
- `mejoras-centros.js` ~L154: 4000 ms — `hook()` + `pintar()` centros; vista relacionada con origen/centros y mapas.
- `mejoras-citas-futura.js` ~L354: 5000 ms — `tick`; vista citas / alertas futuras.
- `mejoras-citas-tabla.js` ~L178: 5000 ms — `injectCSS`, `hideCitasAplicadas`, `patchRenderCitas`; vista citas.
- `mejoras-citas-v15.js` ~L1076: 8000 ms — `tick` citas (comenta preferencia página citas pero ejecuta tick también fuera); vista citas y decoración global.
- `mejoras-citas.js` ~L1076: 8000 ms — mismo contenido que `mejoras-citas-v15.js` (duplicado exacto); si ambos cargaran, doble tick (hoy el loader apunta a v15).
- `mejoras-ciudades-disponibles.js` ~L162: 4000 ms — `tick`; filtro ciudades disponibles (rutas/panel).
- `mejoras-ciudades.js` ~L94: 4000 ms — `tick`; UI ciudades (rutas/panel).
- `mejoras-cruzados.js` ~L280: 3000 ms — `tick`; vista viajes cruzados.
- `mejoras-despachos-delete.js` ~L246: 4000 ms — `tick`; vista despachos + posible refresco ruta.
- `mejoras-excel-export.js` ~L440: 5000 ms — `tick`; enganche botones descarga (global).
- `mejoras-gh-proxy.js` ~L103: 4000 ms — `hideTokenUI`; configuración / ocultar token (global).
- `mejoras-login-inmediato.js` ~L212: 1500 ms — gate sesión (`unlockApp` / `lockToLogin`); global login.
- `mejoras-mapa-ciudades-ruta.js` ~L421: 5000 ms — `tick`; mapa de rutas + chips ciudades.
- `mejoras-mapa-fix.js` ~L265: 3000 ms — `tick`; arreglo mapa (rutas/panel).
- `mejoras-mapa-hide.js` ~L134: 4000 ms — `tick`; ocultar elementos mapa; rutas/panel.
- `mejoras-mapa-sin-rectas.js` ~L88: 5000 ms — `install` + `strip` trazos rectos; mapa rutas.
- `mejoras-mapa.js` ~L134: 5000 ms — `tick` iconos/pines; mapas.
- `mejoras-plan-filtro.js` ~L70: 4000 ms — `tick`; filtro plan / rutas.
- `mejoras-planificacion.js` ~L391: 500 ms × máximo 60 iteraciones — espera `ensureUI()`; arranque planificación (no es permanente si clearInterval).
- `mejoras-storage.js` ~L179: 120000 ms — `mirrorToIdb`; storage global.
- `mejoras-sync.js` ~L146: variable `PULL_MS_FOCUS` (30000 ms) o `PULL_MS_DIRTY` (15000 ms) — pull de datos; sync global.
- `mejoras-sync.js` ~L275: 20000 ms — `refreshBadge`; badge sync global.
- `mejoras-sync.js` ~L276: 15000 ms — `wireManualControls`; controles sync global.
- `mejoras-ui-centro-viajes.js` ~L111: 4000 ms — `tick`; centro de viajes / panel ruta.
- `mejoras-v2.js` ~L342: 2000 ms — `tick` UI v2; global.

Total líneas con setInterval inventariadas en JS de raíz: 27 (más el timer de 500 ms temporal de planificación).

## 3. Cadena de parches go / renderMapas / refrescarRutaUI

Orden de carga típico (core primero, luego extras de app.js; el bloque mapa se registra dos veces):

1. `core-app.js` — define `go`, `renderMapas`, `refrescarRutaUI`, crea 3× `L.map` (panel, rutas, cruzados).
2. `codigo-perf.js` — reasigna `window.go`.
3. `mejoras-go-perf.js` — reasigna `renderMapas` (debounce).
4. `mejoras-mapa.js` — tick pines; no siempre reasigna renderMapas.
5. `mejoras-map-refresh.js` — stub/parche refresh (archivo pequeño ~267 B en árbol).
6. `mejoras-ciudades.js` / `mejoras-ciudades-disponibles.js` — ticks ciudades.
7. `mejoras-map-despachados.js` — stub/parche despachados (~196 B).
8. `mejoras-mapa-fix.js` — reasigna `renderMapas` y toca `refrescarRutaUI`; interval 3000 ms.
9. `mejoras-mapa-hide.js` — tick hide.
10. `mejoras-mapa-ciudades-ruta.js` — reasigna `renderMapas` y `refrescarRutaUI`; interval 5000 ms.
11. `mejoras-plan-filtro.js` — toca `refrescarRutaUI`.
12. `mejoras-ui-centro-viajes.js` — toca `refrescarRutaUI`.
13. `mejoras-mapa-sin-rectas.js` — reasigna `renderMapas` / `refrescarRutaUI`.
14. `mejoras-despachos-delete.js` — toca `refrescarRutaUI`.
15. `mejoras-rutas-panel-ui.js` — reasigna `window.go` y toca `refrescarRutaUI`.
16. `mejoras-citas-v15.js` / `mejoras-centros.js` — también pueden asignar `renderMapas`.
17. `app.js` — envuelve `go` (forcePageVisibility).

Quién gana: el último wrapper que cargó. En la práctica compiten `mapa-ciudades-ruta`, `mapa-sin-rectas`, `mapa-fix` y `rutas-panel-ui` sobre el mismo mapa de rutas.

## 4. Instancias Leaflet

- `core-app.js` contiene 3 llamadas `L.map(` (panel, rutas, cruzados).
- Los parches no suelen crear un cuarto mapa; sí recrean capas y llaman `invalidateSize` desde varios módulos e intervals.

## 5. Duplicados exactos de contenido

- `mejoras-citas.js` (52372 bytes) idéntico a `mejoras-citas-v15.js` (52372 bytes).
- `mejoras-citas-core.js` (279 bytes) idéntico a `mejoras-citas-ui.js` (279 bytes).

## 6. Archivos JS/CSS/JSON muy pequeños (<400 bytes) o vacíos

- `app-core.js` — 205 bytes.
- `mejoras-citas-core.js` — 279 bytes (dup de ui).
- `mejoras-citas-ui.js` — 279 bytes.
- `mejoras-map-despachados.js` — 196 bytes.
- `mejoras-map-icons.js` — 334 bytes.
- `mejoras-map-refresh.js` — 267 bytes.
- `mejoras-mapa-viaje.js` — 186 bytes.
- `mejoras-marcadores.js` — 338 bytes.
- `test-50k.json` — 0 bytes (vacío).

No borrar aún sin búsqueda de referencias dinámicas (Fase 2.4 / limpieza).

## 7. Qué es RUTALOG GITHUB.html (solo documentación)

- Es un HTML de entrada alternativo al mismo tipo de loader que `index.html` (boot.css/js, shell, app.js).
- Se despliega en Pages como archivo estático; la URL larga `https://rutalog.pages.dev/RUTALOG%20GITHUB` lo abre.
- `index.html` es la entrada de la raíz `https://rutalog.pages.dev/`.
- No son byte-idénticos: tamaños distintos (RG ~6374 vs index ~5740 en arreglo-ui); scripts pueden llevar `?v=` distintos (ej. login v6 vs v9 según copia).
- Histórico: nombre legacy cuando el proyecto se servía/copiaba como página única en GitHub Pages.
- Política: no borrar ni modificar sin confirmación explícita del dueño del producto.

## 8. Cifras RUTALOG_PERF ANTES (Paso 2.0)

Pendiente de relleno tras cargar `debug-perf.js?debug=perf` en la preview:

- (a) Vista Inicio / Panel — por medir.
- (b) 30 s en Mapa de rutas con viaje en construcción — por medir.

Instrumentación: ver `debug-perf.js` (solo activo con `?debug=perf` en la URL).


## 9. Paso 2.1 — cargador único (2026-10-06)

- Archivo nuevo: `rutalog-loader.js` — Set de claves = path sin `?v=`; `RUTALOG.load.extras()` carga CSS_POST + JS_EARLY + JS_MID + JS_MAP en secuencia.
- `app.js`: eliminada la segunda pasada de `onceScript` post-core; `loadExtras()` delega al manifiesto único.
- `index.html`: quitados links duplicados a `mejoras-v2.css` y `mejoras-layout.css` (solo el loader); añadido `rutalog-loader.js` antes de `app.js`.
- Orden de dependencias: mismo que antes (core-app → construirHoy → correcciones → extras). No se reordenaron módulos de mapa.
- Cómo revertir: restaurar app.js/index.html previos al commit 2.1 y borrar `rutalog-loader.js`.
- Medición PERF: pendiente en preview tras deploy (`?debug=perf` + `RUTALOG_PERF.reporte()`).


## 10. Paso 2.2 — planificador único

- Nuevo: `rutalog-scheduler.js` — `RUTALOG.tick.registrar(nombre, fn, { cada, vista })`, un `setInterval` interno de 1000 ms, pausa si `document.hidden`, errores por tarea.
- Migrados a tick (con fallback setInterval si no hay scheduler): mapa*, ciudades*, plan-filtro, ui-centro-viajes, despachos-delete, centros, cruzados, citas-*, excel-export, gh-proxy, v2, login, storage, sync, planificacion.
- Vistas: tareas de mapa/ciudades/filtro con `vista: 'rutas'`; citas con `vista: 'citas'`; sync/storage/login `siempre`.
- sync pull: cada 15s en scheduler; si no dirty salta uno (~30s). badge 20s, wire 15s.
- planificacion ensureUI: tick 1s y `cancelar` al cumplir (sustituye 500ms×60).
- No migrados aún: timers internos de `core-app.js` (gh pull 60s / 120s) — viven en el core.
- Cómo revertir: commits paso2.2 en archivos individuales + borrar rutalog-scheduler.js del loader.


## 11. Paso 2.3 — hooks (parcial)

- Nuevo: `rutalog-hooks.js` — `RUTALOG.hooks.on/emit/install`. Un wrapper de `go`, `renderMapas` (debounce 60ms) y `refrescarRutaUI`.
- Migrado a hooks (sin reasignar): `mejoras-mapa-sin-rectas.js` v2.
- `mejoras-go-perf.js` v3 noop (debounce en hooks).
- Pendiente migrar a hooks (aún pueden reasignar): mapa-hide, despachos-delete, plan-filtro, ui-centro-viajes, mapa-ciudades-ruta, mapa-fix, rutas-panel-ui, map-refresh, map-despachados, codigo-perf.
- Riesgo: parches posteriores que reasignan `renderMapas` pueden envolver el wrapper de hooks; el emit sigue si llaman al prev.
