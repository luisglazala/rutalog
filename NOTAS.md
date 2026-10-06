# NOTAS — rama arreglo-ui

## Fase 0 (recuperar estilos)
- Causa: styles.css quedó en ~1.8 kB solo con layout de #page-rutas; se perdió el diseño base.
- Última versión con @import jsDelivr: commit ccdbcba0 (`@e638c980.../styles.css`).
- base.css = contenido completo de ese CSS del core e638 (~43 kB), embebido en el repo para no depender de la CDN.
- styles.css = `@import url("base.css");` + overlays locales de ccdbcba0 (part2, estéticas, leaflet, alturas mapa) + bloque actual de layout de rutas.
- Suposición segura: no había url() relativas a fuentes en el CSS e638 (verificado).

## No tocado
- rutalog-datos, tokens, usuarios, maestro, citas data.
