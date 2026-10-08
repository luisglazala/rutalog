# Ramas remotas

Tras Fase 1 en main, ramas candidatas a borrar:

1. `fase1-correcciones` — contenido ya en main
2. `limpieza` — mergeado PR #6
3. `arreglo-ui` — rendimiento; gran parte en main
4. `cierre-estabilidad` — docs/cierre parcial
5. `mejoras` — muy atrasada

```bash
git push origin --delete fase1-correcciones
git push origin --delete limpieza
# opcional tras revisar:
# git push origin --delete arreglo-ui cierre-estabilidad mejoras
```

Tag estable:

```bash
git tag -a v-estable-2026-10-08 <SHA_MAIN> -m "Estable post fase1 + CI/seguridad"
git push origin v-estable-2026-10-08
```
