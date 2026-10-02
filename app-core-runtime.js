/* RUTALOG app-core-runtime.js
 *
 * En https://rutalog.pages.dev este archivo NO se lee del disco estático:
 * el Worker (_worker.js) intercepta /app-core-runtime.js y sirve el core
 * completo del pin e638c980 (387 KB, sha256 5965ceac…).
 *
 * El loader (app.js) pide ./app-core-runtime.js primero; si falla, usa jsDelivr.
 *
 * Para tener el .js completo también en el repo (copia local / GitHub UI):
 *   curl -sL "https://cdn.jsdelivr.net/gh/luisglazala/rutalog@e638c98005f54256a4f856d7aba8cad9a54174f0/app.js" \
 *     -o app-core-runtime.js
 *   git add app-core-runtime.js && git commit -m "chore: app-core-runtime.js completo" && git push
 *
 * No ejecutar este stub como código de la app en pages.dev (lo sustituye el Worker).
 */
console.info("[RUTALOG] app-core-runtime stub en repo; en pages.dev el Worker entrega el core real");
