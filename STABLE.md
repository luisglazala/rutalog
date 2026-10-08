# Estado estable

- **Tag recomendado:** `v-estable-2026-10-08` (crear en el commit de este paquete de CI/seguridad).
- **Rollback:**
  ```bash
  git fetch --tags
  git checkout v-estable-2026-10-08
  ```
- **Producción:** https://rutalog.pages.dev/ (Cloudflare Pages + Access + worker.js).
- **No usar** GitHub Pages (`luisglazala.github.io/rutalog` → 404 a propósito).

## Ramas

| Rama | Estado |
|------|--------|
| main | Producción |
| fase1-correcciones | Ya en main → se puede borrar |
| limpieza | Mergeado (PR #6) → se puede borrar |
| arreglo-ui / cierre-estabilidad / mejoras | Históricas |

Ver `docs/BRANCHES.md`.
