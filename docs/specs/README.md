# Specs

Cada feature arranca con una spec en esta carpeta, **antes** de tocar código. La
spec se revisa y se aprueba, y recién entonces se implementa. Va en el mismo PR
que el código, así el porqué de cada cambio queda al lado del cambio.

## Numeración

`NNN-nombre-corto.md`, correlativo: `001-alta-de-socio.md`. El número no se
reutiliza aunque una spec se descarte.

Si una feature toca los dos repos, cada uno tiene su propia spec con **el mismo
número y nombre**, y cada una cubre solo su lado. La del frontend se apoya en el
contrato que fija la del backend.

## Estados

| Estado | Significa |
|---|---|
| Borrador | En discusión; puede cambiar cualquier cosa. |
| Aprobada | Se puede implementar. Si al implementar algo no cierra, se corrige la spec primero. |
| Implementada | El código que la cumple está en el mismo PR. Queda como registro: no se reescribe, se hace una spec nueva. |

## Estructura

1. **Contexto**: el problema y por qué se ataca ahora.
2. **Alcance**: qué entra y, sobre todo, qué **no** entra.
3. **Requisitos**: numerados (`R1`, `R2`…) y verificables. Cada uno termina en al
   menos un test.
4. **Contrato**: request, respuestas y códigos de estado. Es lo que consume el
   frontend.
5. **Diseño**: qué cambia en el código y las decisiones tomadas, con las
   alternativas descartadas y por qué.
6. **Pruebas**: qué test cubre cada requisito.
7. **Tareas**: el orden de implementación, tildándose a medida que avanza.
8. **Pendientes**: lo que quedó afuera a propósito.
