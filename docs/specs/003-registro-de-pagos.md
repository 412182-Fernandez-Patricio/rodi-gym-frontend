# 003 · Registro de pagos

**Estado:** Implementada · **Repo:** frontend · **Rama:** `feature/register-payment`

Se apoya en el contrato de `rodi-gym-backend/docs/specs/003-registro-de-pagos.md`.

## Contexto

Pagos ya lista los pagos (spec 002), pero todavía no hay forma de cobrar. Es la
pieza que cierra el circuito del alta: un socio nuevo nace **Deudor** (spec 001)
y hoy no se le puede registrar el primer pago desde la app.

El backend decide el monto (la cuota configurada) y lo que el pago le hace a la
membresía. El frontend solo elige **a quién** se le cobra y **con qué medio**.
Tiene que mostrar el monto antes de confirmar y advertir cuando el cobro parece
de más.

## Alcance

**Entra**

- Pantalla `/payments/new`.
- Dos entradas: el botón flotante de Pagos y un botón "Registrar pago" en el
  perfil del socio, que llega con el socio ya elegido.
- Buscar y elegir al socio, elegir el medio de pago, ver el monto y cobrar.
- Advertencias antes de confirmar: el socio ya está al día, o está dado de baja.

**No entra**

- Cambiar el monto, hacer descuentos o cobros parciales: lo fija el backend.
- Anular un pago.
- Cobrar desde el alta en el mismo paso. El alta ya termina en el perfil, que
  ahora tiene "Registrar pago".
- Pantalla de configuración de la cuota.

## Requisitos

### Entradas

- **R1.** En Pagos, el botón flotante "Registrar pago" navega a `/payments/new`.
  El listado deja lugar abajo para que el botón no tape "Cargar más" ni el total.
- **R2.** En el perfil, un botón "Registrar pago" navega a
  `/payments/new?member=<dni>`.
- **R3.** El header dice "Registrar pago". La flecha de volver lleva al perfil
  cuando se llegó con `?member` y a `/payments` si no.

### Socio

- **R4.** Sin `?member`, la pantalla arranca con un buscador de socios: nombre,
  apellido o DNI, con 300 ms de debounce, usando `GET /members?search=` con
  `size=5`. Tocar un resultado **lo elige**, no navega a su perfil.
- **R5.** Con `?member`, se carga ese socio y aparece ya elegido. Si no existe o
  falla la carga, se avisa y se muestra el buscador.
- **R6.** El socio elegido se muestra con nombre, DNI y estado (Al día, Vencido o
  Inactivo, con la fecha de vencimiento si la tiene). Un botón "Cambiar" vuelve
  al buscador.

### Advertencias

- **R7.** Si el socio está **al día**: "Está al día hasta el dd/mm/aaaa. Este
  pago suma un mes más." Es un aviso y no bloquea el cobro, porque pagar por
  adelantado es legítimo.
- **R8.** Si el socio está **inactivo**: "Está dado de baja. Al cobrarle se
  reactiva."

### Medio y monto

- **R9.** Tres opciones de medio de pago (Efectivo, Transferencia y Débito), con
  **ninguna elegida al entrar**. Se usan las etiquetas de `PAYMENT_METHOD_LABELS`.
- **R10.** El monto sale de `GET /config/monthly-price` y se muestra con
  `formatAmount` ("$7.000").
- **R11.** Si el monto no se pudo cargar, se avisa y **no se puede cobrar**: el
  administrador tiene que ver el monto antes de confirmar. El aviso tiene un botón
  **"Reintentar"** que vuelve a pedirlo.

### Cobrar

- **R12.** El botón dice "Cobrar $7.000". Está deshabilitado mientras falte el
  socio, el medio de pago o el monto.
- **R13.** Mientras la request está en curso, el botón está deshabilitado y dice
  "Cobrando…". Dos toques salen como **un solo POST**.
- **R14.** Con el 201 se va al **perfil del socio**, sin dejar el formulario en el
  historial ni duplicar el perfil. El perfil se vuelve a cargar y muestra el nuevo
  vencimiento y el pago en "Últimos pagos".
  - Si se llegó con `?member` desde otra pantalla de la app (el perfil),
    `Location.back()`: vuelve a esa entrada del historial.
  - Si no (desde Pagos, o con un link directo sin historial), `navigate` al
    perfil con `replaceUrl`.
  - **Por qué:** con `replaceUrl` desde el perfil el historial quedaba
    `/members/X`, `/members/X`. El primer "volver" del sistema no hacía nada
    visible (misma URL, el router la ignora) y hacía falta un segundo.
- **R15.** Con un 404, avisa "El socio ya no existe." y vuelve al buscador.
- **R16.** Con un 400, un 500 o un error de red, muestra un aviso general y
  **conserva** el socio y el medio elegidos, para reintentar.

## Contrato

- `GET /api/config/monthly-price` → `{ key: 'monthly_price', value: '7000.0' }`.
  El `value` es **texto** y se convierte con `Number()`.
- `POST /api/payments` con `{ memberId, paymentMethod }`, que el interceptor
  manda como `member_id` y `payment_method`. Responde 201 con un `Payment`, 404 o
  400.
- `GET /api/members/:id` y `GET /api/members?search=&size=5`, que ya existen.

## Diseño

### Servicios

- `PaymentService.createPayment(payment: PaymentCreate)`, con
  `PaymentCreate = { memberId: number; paymentMethod: PaymentMethod }`.
- `ConfigService.getMonthlyPrice(): Observable<number>` en `shared/services`.
  Hace el `Number(value)` ahí mismo: es la única conversión y no amerita un
  modelo.

### Ruta

- `payments/new`, declarada antes de cualquier `payments/:algo` (hoy no hay, pero
  se respeta la trampa anotada en `CLAUDE.md`).
- El socio llega por **query param** (`?member=`) y no por path, porque es
  opcional.

### Página `payment-create`

- Estado en signals: `member` (el socio elegido o `null`), `method`, `price` y
  `saving`.
- Buscador: el mismo esquema que Socios (`toObservable`, `debounceTime(300)`,
  `distinctUntilChanged` y `switchMap` con `catchError` adentro), pero con
  resultados en una lista propia de botones. **No se reusa `member-card`**:
  navega al perfil y trae el botón de contacto, y acá tocar tiene que elegir.
- El estado del socio se calcula con `resolveMemberStatus` y las fechas con
  `formatIsoDate`, igual que en el resto de la app.
- Las etiquetas del estado ("Al día", "Vencido", "Inactivo") ya estaban copiadas
  en `member-card` y en el perfil. Pasan a `MEMBER_STATUS_LABELS` en
  `member.model.ts`, y las usan las tres pantallas.
- "Hay historial de la app" se decide con
  `router.lastSuccessfulNavigation?.previousNavigation`: es `null` cuando
  `/payments/new` fue la primera pantalla cargada.
- Medios de pago: tres botones con `aria-pressed`, con la misma estética que los
  chips de filtro.
- **Descartado:** un paso de confirmación aparte ("¿Cobrar $7.000 a Ana
  Garcia?"). Las advertencias y el monto en el botón ya dan esa información, y
  un paso más enlentece el caso normal, que es cobrar en el mostrador.

### Perfil

- Botón "Registrar pago" en la sección "Últimos pagos", con `routerLink` a
  `/payments/new` y `queryParams` `{ member: id }`.

### Pagos

- `<app-fab-button icon="add" label="Registrar pago" link="/payments/new" />`.
- `pb-14` al final del listado, como en Socios, para que el botón no tape lo
  último.

## Pruebas

| Requisito | Test |
|---|---|
| Servicios | `payment.service.spec.ts`: el POST sale en snake_case. `config.service.spec.ts`: `'7000.0'` → `7000`. |
| R1, R2 | spec de Pagos (link del FAB) y del perfil (link con `?member`). |
| R3 | spec de la página: el header y el `backLink` con y sin `?member`. |
| R4 | spec de la página: tipear busca con `size=5` tras el debounce; tocar un resultado lo elige y no navega. |
| R5, R6 | spec de la página: con `?member` carga y elige; con un 404 muestra el aviso y el buscador; "Cambiar" vuelve al buscador. |
| R7, R8 | spec de la página: aviso con socio al día, con socio inactivo y ningún aviso con socio vencido. |
| R9–R12 | spec de la página: sin medio elegido el botón está deshabilitado; el texto del botón lleva el monto; si falla el config, no se puede cobrar, y "Reintentar" lo vuelve a pedir. |
| R13 | spec de la página: dos clicks con la request pendiente → un solo POST. |
| R14 | spec de la página: 201 sin historial previo → `navigate(['/members', id], { replaceUrl: true })`; 201 llegando desde el perfil → `Location.back()`. |
| R15, R16 | spec de la página: 404 vuelve al buscador; 500 muestra el aviso y conserva la selección. |

Los specs con HTTP registran el interceptor y responden en snake_case.

## Tareas

- [x] `PaymentService.createPayment` y `ConfigService`, más sus specs.
- [x] Ruta `payments/new`.
- [x] Página `payment-create`.
- [x] Botón flotante en Pagos y botón en el perfil.
- [x] Specs.
- [x] `npx ng build` y `npx ng test --watch=false --browsers=ChromeHeadless` en
  verde.
- [x] Probarlo contra el backend con la rama `feature/register-payment` (lo
  levanta el usuario).
- [x] Actualizar `CLAUDE.md` (pantallas y pendientes) y pasar esta spec a
  **Implementada**.

## Pendientes

- Período que cubre cada pago: depende del backend.
- Anular un pago cargado por error.
- "Ver todos" desde el perfil, que lleve a Pagos filtrado por ese socio.
- Si el cobro en el mostrador pide más velocidad, recordar el último medio de
  pago usado.
