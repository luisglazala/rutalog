# FASE 1 — Correcciones

Base: main@0a26752 (nota: origin/main actual puede estar en b4d1aab con mapa-click posterior).

## Estado por punto

1. Sync
   - 1a unchanged limpia rutalog_gh_read_failed — VERIFICADO (test "unchanged limpia read_failed")
   - 1b 404 no marca failed; ghActualizar crea sin bloquear — VERIFICADO (tests 404)
   - tests sync ampliados 16 PASS — VERIFICADO
2. Modo libre solo si lectura OK y catálogo vacío — CÓDIGO LISTO SIN PROBAR (e2e login fallido no automatizado aquí)
3. CI js-check.yml nuevo — VERIFICADO localmente (node --check, integridad, 3 unit)
4. SW test carga isBrokenShell real + red rota usa caché — VERIFICADO; sw.js corregido
5. Proxy rutas exactas + CORS restringido + test importa worker — VERIFICADO 9 PASS
6. btnExportUsers informe — solo propuesta (no aplicado)

## Commits en fase1-correcciones

Ver `git log --oneline 0a26752..HEAD`

## Pruebas

- node --check: 0 fallos
- sync-read-protection: 16 passed
- proxy-preview-writes: 9 passed
- sw-broken-cache: PASS
