# Mejoras RUTALOG

## Plan (una por commit, revertible)

| # | Mejora | Estado | SHA para revertir |
|---|--------|--------|-------------------|
| 0 | Baseline antes de mejoras | listo | `66a2173eab2e48723450aa1e59b25cb8ad933504` |
| 1 | Maestro fuera del HTML (`maestro-base.json`) | preparada (pendiente subir archivos grandes) | — |
| 2 | Separar CSS y JS | pendiente | — |
| 3 | Estados vacíos y feedback planificador | pendiente | — |
| 4 | Exportar / restaurar sesión del día | pendiente | — |
| 5 | PWA + PDF.js diferido | pendiente | — |
| 6 | Optimización orden de paradas | pendiente | — |

## Cómo revertir
Escribe en el chat: **revierte la mejora N** o **revierte el último cambio**.

## Mejora 1 — detalle
- HTML sin maestro embebido (~465 KB)
- Archivo nuevo `maestro-base.json` (2699 clientes)
- Multi-usuario sigue en localStorage + `rutalog-datos`
