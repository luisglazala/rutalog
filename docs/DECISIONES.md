# Decisiones tomadas en Fase B (cierre-estabilidad)

1. **Shell restore**: se usó exactamente el blob de `bfd7801` (idéntico a `f26b40d`, diff vacío). Contenido verificado: 44271 bytes, sha256 `7ba4b7f8d47330f2fe0034ee745d716748440b5c9b26345e9b85354a3133eb68`.
2. **Push del archivo grande**: no se usó la API de Contents para `shell-body.html` (44 KB) para evitar la causa raíz del truncado anterior. Queda pendiente push por git con credenciales.
3. **index.html en remoto**: sí se actualizó vía API para apuntar a `./shell-body.html?v=restored1` y eliminar jsDelivr.
4. **Tests primero**: fixtures sintéticos y esqueleto e2e; ejecución completa bloqueada hasta shell en remoto + preview.
5. **go-h8**: no reasigna `window.go`; solo asegura flags.
