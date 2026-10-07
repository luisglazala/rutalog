# Auditoría de rendimiento RUTALOG — rama `arreglo-ui`

**Preview:** https://arreglo-ui.rutalog.pages.dev/  
**Fecha:** 2026-10-07  
**Regla:** medir antes de arreglar. Este documento es la **Parte 3**; no incluye arreglos aplicados.

---

## 1. Banco de medición

| Artefacto | Estado |
|-----------|--------|
| `tests/perf.mjs` | Creado (Playwright + contadores + escenarios cold/idle). Requiere `npx playwright install chromium`. |
| `?debug=perf` | Activo (`debug-perf.js`): cuenta `go`, `renderMapas`, `refrescarRutaUI`, `invalidateSize`, intervalos. |
| Medición browser | Ejecutada sobre la preview (carga en frío, idle 25–30 s, network, `RUTALOG_PERF.reporte()`). |
| CPU 4x / Fast 4G | **No ejecutado** en el sandbox (Chromium Playwright incompleto). Cifras **sin throttling**. |
| Sesión autenticada | **No disponible**. Escenarios Excel, viaje, pan mapa, citas, 30× nav post-login: **no medidos**. |

### 1.1 Cifras base (sin throttling, boot / login)

| Métrica | Valor | Escenario |
|---------|-------|-----------|
| `domInteractive` | ~377 ms | Cold load |
| `loadEventEnd` | ~583 ms | Cold load |
| Recursos totales | ~85–95 | Cold load |
| Scripts `.js` | **41–54** | Cold load |
| Hojas `.css` | **15** | Cold load |
| Pulls `data.json` en ~8 s de arranque | **10–12** | Cold load |
| Pulls `data.json` en 25 s de reposo | **+2** | Idle |
| Long tasks (debug-perf, ~28 s) | **1** (máx **134 ms**) | Boot |
| Long tasks en 25 s idle | **0** | Idle |
| CLS (sin input) | **0** (en login) | Cold/idle |
| `invalidateSize` sin interacción | **5** | Boot |
| Intervalos activos | **4** | gh-proxy 4s, login 2.5s, scheduler 1s, storage 120s |
| Heap JS | 11–15 MB | Login |
| Maestro | 2699 clientes (log) | Boot |

---

## 2. Hallazgos ordenados por impacto

### H1 — Múltiples pulls de `data.json` en el arranque
- **Síntoma:** lag de red/CPU en boot.
- **Evidencia:** 10–12 requests a `data.json` al cargar; +2 en 25 s idle (150–263 ms c/u).
- **Causa:** sync/proxy sin deduplicar el pull inicial.
- **Arreglo:** un solo `pullOnce` tras UI lista; cola inflight; no parse si versión igual.
- **Riesgo:** medio. **Prueba:** ≤1 pull en primeros 5 s.

### H2 — Cascada ~15 CSS y ~40+ JS (loadExtras)
- **Síntoma:** TTI tardío, FOUC cuando entran `mejoras-*.css`.
- **Evidencia:** 15 CSS / 41+ JS en resource timeline; CSS extras tras shell.
- **Arreglo:** fusionar CSS de layout; preload `core-app.js`/`styles.css`; no CSS que cambie altura del mapa tras primer paint.
- **Riesgo:** medio.

### H3 — Temporizadores siempre activos
- **Evidencia:** 4 intervalos en login (gh-proxy 4s, login 2.5s, scheduler 1s, storage 120s). Código: sync 30s/15s; mapa-fix tick 3s; ciudades-ruta 5s.
- **Arreglo:** login gate por eventos; backoff proxy; pausar scheduler si `document.hidden`.
- **Riesgo:** bajo–medio.

### H4 — `clearLayers()` total en clusters
- **Evidencia código:** `mapa-fix.js` y `mapa-ciudades-ruta.js` hacen `clearLayers` en rebuild.
- **Runtime post-login:** no medido.
- **Arreglo:** pines incrementales por idCliente.
- **Riesgo:** medio.

### H5 — `invalidateSize` ×5 en boot
- **Evidencia:** `counts.invalidateSize: 5` con `go:0`.
- **Arreglo:** un invalidate diferido/debounce por mapa visible.
- **Riesgo:** bajo.

### H6 — Sync periódico aunque no haya cambios
- **Evidencia:** idle 25 s → 2× `data.json` (sí hay request).
- **Arreglo:** ETag/hash; no `renderMapas` si pull vacío.
- **Riesgo:** medio.

### H7 — localStorage/IDB maestro 2699 (~880 KB)
- **Evidencia:** log maestro 2699; long task 134 ms en boot (posible hydrate).
- **No medido:** stringify de ~2.3 MB en cada dirty.
- **Arreglo:** debounce; hash antes de stringify; IDB async.
- **Riesgo:** medio–alto.

### H8 — Wrappers apilados de `go` / `renderMapas`
- **Evidencia código:** nav-fix, app patchGo, mapa-fix, ciudades-ruta.
- **Arreglo:** un pipeline de navegación; un dueño de renderMapas.
- **Riesgo:** medio.

### H9 — Flash título Panel → Inicio
- **Evidencia:** en preview a veces ya “Inicio”; core puede escribir “Panel de despachos” antes del parche.
- **Arreglo:** HTML + `titles.panel` = Inicio en origen.
- **Riesgo:** bajo.

### H10 — OSRM re-fetch / polylines
- **Evidencia código:** rebuildRoutes sin caché durable.
- **Arreglo:** OSRM al guardar; `osrmLatLngs` en el viaje.
- **Riesgo:** bajo–medio.

### H11 — innerHTML de listas grandes
- **Evidencia:** patrón en core; CLS no medido en despachos/citas.
- **Arreglo:** update incremental; virtualizar si >200 filas.
- **Riesgo:** medio.

---

## 3. Hipótesis descartadas

| Hipótesis | Resultado |
|-----------|-----------|
| Long tasks constantes en reposo | **Descartada** en login: 25 s idle → 0 long tasks |
| CLS alto en login | **Descartada:** CLS ≈ 0 |
| Heap crece en idle corto | **No observado:** 15→11 MB (GC) |

---

## 4. No medido

CPU 4x, 30× nav post-login, Excel, viaje, pan/zoom 1500 pines, citas, forced reflows, FOUC filmstrip — requieren sesión y/o Chromium throttled en este entorno.

---

## 5. Orden sugerido (esperando aprobación)

1. H1 pulls data.json  
2. H5 invalidateSize debounce  
3. H3 intervalos  
4. H6 pull condicional  
5. H4 pines incrementales  
6. H2 CSS/preload  
7. H8 unificar go/renderMapas  
8. H10 OSRM on-save  
9. H7 storage  
10. H11 listas  

**No ejecutar hasta OK.** Un hallazgo = un commit = medición antes/después.

```bash
PREVIEW_URL=https://arreglo-ui.rutalog.pages.dev node tests/perf.mjs
# Navegador: ?debug=perf → RUTALOG_PERF.reporte()
```
