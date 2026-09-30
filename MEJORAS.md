# Mejoras RUTALOG

| # | Mejora | Estado | Notas |
|---|--------|--------|-------|
| 0 | Baseline original | ok | `66a2173e…` |
| 1 | Maestro fuera del HTML | aplicada | `maestro-base.json` |
| 2–6 | CSS/JS, vacíos, sesión, PWA, optimizar | parcial | boot + paginado SKU |
| 7 | **mejoras-v2** (capa overlay) | aplicada | ver abajo |

## mejoras-v2 (2026-09-29)

Incluye (sin tocar cifrado de token ni export/import de sesión del día):

1. **Capacidad de camión en vivo** en el panel de ruta (barra G 12 t / P 3 t con colores).
2. **Optimizar orden** de paradas (vecino más cercano desde el centro/almacén). Atajo: `O`.
3. **Búsqueda global** `Ctrl+K` (clientes del día, maestro, SKU).
4. **Modo operador** (oculta Config / Topes / Código / Citas).
5. **Atajos**: `S` guardar viaje, `Esc` cerrar, `Ctrl+K` buscar.
6. Estilos asociados en `mejoras-v2.css`.

Archivos: `mejoras-v2.js`, `mejoras-v2.css` (cargados desde el boot de `app.js`).
