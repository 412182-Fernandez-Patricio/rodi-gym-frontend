# 002 · Listado de pagos

**Estado:** Aprobada · **Repo:** frontend · **Rama:** `feature/payments-list`

Se apoya en el contrato de `rodi-gym-backend/docs/specs/002-listado-de-pagos.md`.

## Contexto

`/payments` es un placeholder de dos líneas. La feature de Pagos se parte en dos:
primero el **listado**, que cubre esta spec, y después **registrar un pago**, que
va en una spec aparte.

El backend agrega el parámetro `search` a `GET /payments` y el nombre del socio
en cada pago, así que el listado puede mostrar quién pagó sin pedir el padrón
entero.

## Alcance

**Entra**

- Listado de pagos en `/payments`, del más reciente al más viejo.
- Buscador por nombre, apellido o DNI del socio.
- Chips por medio de pago: Todos, Efectivo, Transferencia y Débito.
- "Cargar más" y el total de pagos.

**No entra**

- **Registrar un pago** y su botón flotante: van en la spec siguiente.
- Filtro por rango de fechas. El backend ya lo soporta, pero la pantalla no lo
  pide todavía.
- "Ver todos" desde el perfil del socio.
- Tocar un pago para ir al perfil del socio.

## Requisitos

- **R1.** `/payments` lista los pagos del más reciente al más viejo, de a **20**.
- **R2.** Cada pago muestra el **nombre y apellido** del socio, la fecha
  (dd/mm/aaaa), el medio de pago y el monto.
- **R3.** El buscador consulta **300 ms después** de que el usuario deja de
  tipear, y no repite la consulta si el texto no cambió. Se compara **recortado**:
  `"ana"` y `"ana "` son el mismo criterio.
- **R4.** Los chips filtran por medio de pago. "Todos" no filtra y es el
  seleccionado al entrar. El chip activo tiene `aria-pressed="true"`.
- **R5.** El buscador y los chips se combinan.
- **R6.** Cambiar el texto o el chip vuelve a la primera página y **reemplaza** el
  listado. "Cargar más" pide la página siguiente y **acumula**.
- **R7.** Una respuesta vieja no pisa una nueva: si el usuario tipea rápido, se
  muestra el resultado del último criterio.
- **R8.** Al final se muestra "N pagos" (o "1 pago") cuando no hay más páginas, y
  "Cargar más" cuando las hay.
- **R9.** Estados vacíos: "Cargando…" mientras no hay datos, "No hay pagos que
  coincidan." sin resultados, y "No se pudieron cargar los pagos." si falla.
- **R10.** Después de un error, cambiar el texto o el chip **vuelve a consultar**
  (el stream no muere).
- **R11.** Si falla "Cargar más", reintentar pide **la misma página**, no la
  siguiente.
- **R12.** En el perfil del socio, la lista de últimos pagos **no cambia**: sigue
  sin mostrar el nombre, que ahí sobra.

## Contrato

`GET /api/payments?search=&payment_method=&page=&size=20`. El orden por defecto
del backend ya es `payment_date` descendente.

Cada pago, ya en camelCase por el interceptor:

```ts
{
  id: 34,
  memberId: 30111222,
  memberName: 'Ana',
  memberLastName: 'Garcia',
  amount: 7000,
  paymentDate: '2026-09-22 10:05:00',   // sin la T
  paymentMethod: 'CASH',
}
```

## Diseño

### Modelo y servicio

- `Payment` suma `memberName` y `memberLastName`.
- `PaymentSearch` suma `search?: string`. Se manda recortado y, si queda vacío,
  no se manda, igual que en `MemberService`.

### `payment-list`

- Nuevo input opcional `showMember = input(false)`.
- Con `showMember` en `true`, la línea principal es "Nombre Apellido" y la
  secundaria "fecha · medio". Sin él queda como hoy (R12).
- **Descartado:** un componente nuevo para el listado de Pagos. Las dos listas
  difieren en una línea, y el componente ya es presentacional justamente para
  reusarlo.

### Página `payments`

- Mismo esquema que `member-list`: `searchTerm` y `method` como signals,
  `combineLatest` de los dos con `debounceTime(300)` y `distinctUntilChanged` sobre
  el texto **recortado** (R3), y un `switchMap` para el criterio y otro para "Cargar más" (R6, R7).
- `catchError` va **dentro** del `switchMap` (R10), y al fallar "Cargar más" se
  deshace el avance de página (R11).
- Chips: `{ label, method: PaymentMethod | null }`, con las etiquetas tomadas de
  `PAYMENT_METHOD_LABELS`.
- Placeholder del buscador: "Buscar por socio o DNI...".
- **Descartado por ahora:** extraer lo que comparte con `member-list` (chips,
  buscador y paginación acumulada) a un componente o helper. Con dos pantallas
  todavía no está claro cuál es la abstracción. Queda en Pendientes.

## Pruebas

| Requisito | Test |
|---|---|
| Servicio | `payment.service.spec.ts`: `search` recortado sale como parámetro, y en blanco no sale. |
| R2, R12 | `payment-list.component.spec.ts`: con `showMember` muestra el nombre; sin él, no. |
| R1, R3 | `payments.component.spec.ts`: la primera consulta sale con `size=20`; tipear consulta una vez pasado el debounce; agregar un espacio al final no vuelve a consultar. |
| R7 | spec de la página: con una consulta pendiente, un criterio nuevo la **cancela** y solo se muestra la respuesta nueva. |
| R4, R5 | spec de la página: el chip manda `payment_method` y conserva `search`; "Todos" no lo manda. |
| R6, R8 | spec de la página: "Cargar más" pide `page=1` y acumula; un chip nuevo reemplaza y vuelve a `page=0`. |
| R9, R10 | spec de la página: con un 500 aparece el mensaje de error, y un chip después vuelve a consultar. |
| R11 | spec de la página: falla `page=1` y el reintento vuelve a pedir `page=1`. |

Los specs con HTTP registran el interceptor y responden en snake_case, como el
resto.

## Tareas

- [x] `Payment` y `PaymentSearch` con los campos nuevos, más su spec.
- [x] `showMember` en `payment-list`, más su spec.
- [x] Página `payments` con buscador, chips y paginación.
- [x] Specs de la página.
- [x] `npx ng build` y `npx ng test --watch=false --browsers=ChromeHeadless` en
  verde.
- [x] Probarlo contra el backend con la rama `feature/payments-list` (lo levanta
  el usuario).
- [x] Actualizar `CLAUDE.md` (estado de las pantallas).
- [ ] Pasar esta spec a **Implementada**.

## Pendientes

- **Registrar un pago**: spec siguiente.
- **"Ver todos"** desde el perfil, que lleve a Pagos filtrado por ese socio.
- Tocar un pago para ir al perfil del socio.
- Filtro por rango de fechas ("este mes", "mes pasado").
- Extraer lo que comparten Socios y Pagos (chips, buscador y paginación).
