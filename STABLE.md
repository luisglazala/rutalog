# Punto de restauración estable

**Fecha:** 2026-09-30  
**Commit de main al crear la rama `mejoras`:** `8ae409a598ff31a4a56033d9e26c5ab59ec5c0ff`

## Crear el tag (si aún no existe)

```bash
git fetch origin
git tag -a v-estable-2026-09-30 8ae409a598ff31a4a56033d9e26c5ab59ec5c0ff -m "Estado estable antes de correcciones A-G"
git push origin v-estable-2026-09-30
```

## Volver a este estado si algo falla

```bash
git fetch origin
git checkout main
git reset --hard v-estable-2026-09-30
# o: git reset --hard 8ae409a598ff31a4a56033d9e26c5ab59ec5c0ff
git push origin main --force
```

> Solo usa `--force` en main si estás seguro. Preferible revertir con un commit inverso.

## Archivos de producción que no se tocan en estas tareas

- Nombre: `RUTALOG GITHUB.html` (URL con espacio)
- Claves localStorage: `rutalog_session`, `rutalog_usuarios_v2`, `rutalog_gh_token`, `rutalog_gh_meta`, etc.
- Estructura de `ghBuildPayload` / `ghApplyPayload`

## Prueba

Usar `RUTALOG-TEST.html` en la rama `mejoras` antes de promover a producción.
