# app-core

El blob completo de `app.js` en `e638c98005f54256a4f856d7aba8cad9a54174f0` tiene:

- **sha256:** `5965ceac0c10b6e6a7b41fa2425b1691aef1b327b9fff8344f6b8a69a59ca061`
- **tamaño:** 387120 bytes

No se pudo subir el monolito (~387 KB) por límite del conector en esta sesión.

**Estrategia equivalente:**

1. Cargador: core exacto desde jsDelivr `@e638c980…/app.js` (mismo sha256).
2. `app-core-construirHoy.js` — solo el diff mínimo de `construirHoy` (2.1–2.3).
3. `mejoras-correcciones.js?v=2` — escape, tabla sin coords, alias (sin reemplazar `construirHoy`).

```bash
curl -sL 'https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js' | sha256sum
# 5965ceac0c10b6e6a7b41fa2425b1691aef1b327b9fff8344f6b8a69a59ca061
```
