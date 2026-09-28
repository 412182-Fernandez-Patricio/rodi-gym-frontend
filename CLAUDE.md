# RODI GYM — Frontend

PWA mobile-first para **el administrador** de un gimnasio (no hay app para socios).
Consume la API del repo `rodi-gym-backend`.

Angular 20 standalone · signals · Tailwind v4 · **sin Angular Material**

## Comandos

```bash
npx ng build
npx ng test --watch=false --browsers=ChromeHeadless   # 64 tests
```

**No levantar el dev server por iniciativa propia** — lo hace el usuario, para
tener control de los logs. Si hace falta ver una salida concreta, pedírselo.
`npm run start:lan` sirve en `0.0.0.0` para abrirlo desde el celular.

## Estado de las pantallas

| Sección | Estado |
|---|---|
| **Socios** (`/members`) | Listado con buscador, chips de estado y "Cargar más" |
| **Alta** (`/members/new`) | Formulario de socio; al guardar va a su perfil |
| **Perfil** (`/members/:id`) | Calendario de asistencia navegable + últimos pagos |
| **Ingresos** (`/check-in`) | Contador del día y registro con motivos en español |
| **Inicio** (`/dashboard`) | Placeholder |
| **Pagos** (`/payments`) | Placeholder |

## Convenciones ya establecidas

- **Componentes siempre en archivos separados** (`.ts` / `.html`), generados con
  `ng generate component`. Nada de `template:` ni `styles:` inline. El schematic ya
  está configurado en `angular.json` para mantener el sufijo `.component`, que
  Angular 20 dejó de poner por defecto.
- **Tailwind en el HTML.** Las clases condicionales se arman como `computed` en el
  `.ts` (ver `member-card`). Los colores salen **solo** de los tokens de `@theme`
  en `styles.css` — nada de hex sueltos.
- Componentes **presentacionales** reciben arrays y no saben de dónde vienen
  (`payment-list`, `checkin-list`, `attendance-calendar`), así los reusa cualquier
  pantalla. `OnPush` + `input.required()`.
- Los servicios devuelven el modelo tal cual: **no hay mappers por modelo**.
- **Formularios con reactive forms tipados** (`NonNullableFormBuilder`), como el
  alta de socio. Los errores se muestran con el campo `touched`, y "Guardar" hace
  `markAllAsTouched()`. Los campos de texto usan un validador `notBlank`, porque
  `Validators.required` deja pasar `"   "`. Un error del servidor sobre un campo
  (el 409 del DNI) va con `setErrors`, y se borra solo al editar el campo.
- **Los errores de la API se distinguen por el código HTTP**, nunca por el texto
  de `message`.
- Cada feature arranca con una spec en `docs/specs/` (ver su `README.md`).

## Trampas conocidas

- **`caseConversionInterceptor`** convierte snake_case ↔ camelCase en los dos
  sentidos. Por eso los modelos son la forma de la API directamente. **No crear
  funciones de mapeo por modelo.** Contracara: si un endpoint devolviera un objeto
  cuyas **claves son datos** (un mapa de fecha a cantidad), esas claves también se
  reescriben. Por eso la asistencia devuelve una lista.
- **Nunca parsear fechas de la API con `Date`.** Un `'aaaa-mm-dd'` se interpreta
  como medianoche **UTC** y en UTC-3 cae un día antes: corre el calendario entero.
  Se comparan y formatean **como texto**. `Date` solo con el constructor numérico
  (`new Date(2026, 7, 1)`), que sí es hora local.
- **Los formatos de fecha no son uniformes**: `expiration_date` es `aaaa-mm-dd`,
  `checkin_time` es ISO con `T`, y **`payment_date` viene `yyyy-MM-dd HH:mm:ss` sin
  la `T`** porque su DTO tiene un `@JsonFormat` propio.
- **`PageHeaderService`**: una página puede tomar el header del layout (título
  dinámico y flecha de volver). El layout lo limpia en `NavigationStart`, antes de
  que se construya la página entrante, o el título se filtra a la siguiente.
- **`catchError` va dentro del `switchMap`**, nunca afuera: afuera, un error
  completa el stream y los cambios siguientes dejan de pedir nada, sin aviso.
- **Las rutas fijas van antes que las de parámetro**: `members/new` está antes de
  `members/:id`. Al revés, el router abre el perfil de un socio con id `new`.
- El botón del sistema operativo para volver **ya funciona solo**: el router usa la
  History API.

## Trampas en los tests

- **`toObservable` se alimenta de un `effect`**, que se vacía en la detección de
  cambios. Tras escribir un signal hay que llamar `fixture.detectChanges()` o el
  observable no emite. Al usar la app de verdad pasa solo.
- **Karma corre la página oculta**, así que `document.hidden` es `true` y cualquier
  lógica atada a visibilidad no arranca. El spec de Ingresos lo fuerza a visible.
- Los specs con HTTP registran el **interceptor** (`withInterceptors`), así que los
  mocks responden en **snake_case**, como la API real.
- `httpMock.verify({ ignoreCancelled: true })` donde haya `forkJoin`: al fallar una
  consulta, cancela su hermana.

## Conexión con el backend

`environment.apiUrl` es `/api`, que el proxy del dev server (`proxy.config.json`)
reenvía a `http://localhost:8080` **reescribiendo el prefijo**, porque el backend
expone sus controllers en la raíz (`/members`, `/payments`) y chocarían con las
rutas del router. Eso además evita CORS en desarrollo — que del lado del backend
todavía no está configurado.

Las búsquedas de socios, pagos y check-ins devuelven un **sobre paginado**
(`PageResponse<T>` en `shared/models`), no un array.

## Pendientes

- **Inicio y Pagos** siguen siendo placeholders. Cuando se arme Inicio, va a querer
  los números del día: ahí conviene un `GET /checkins/summary` en el backend en vez
  de que cada pantalla haga sus dos consultas.
- Desde el perfil, un **"Ver todos"** que lleve a Pagos filtrado por ese socio.
- Filtros pendientes en Socios: **ordenar por vencimiento** (el endpoint ya acepta
  `sort`, es solo frontend) y **"vencen esta semana"** (necesita backend).
- La pantalla de Ingresos pide el padrón entero para resolver nombres. Si crece, lo
  correcto es que el backend mande el nombre en el propio check-in.
- Después del alta, **registrar el primer pago** (cuando exista Pagos). Hoy el
  socio nuevo queda como Deudor y su perfil dice "Vencido".
- Del mockup faltan la **fecha de alta** del socio y el período que cubre cada pago:
  ninguno de los dos existe en el backend.
- La PWA depende de **Google Fonts por CDN**, así que sin conexión los íconos no
  cargan. `index.html` además carga una segunda familia que no usa nadie.

## Flujo de trabajo

Ramas cortas desde `develop`, un PR por feature:

```bash
git fetch && git checkout -b feature/lo-que-sea rodi-gym-frontend/develop
```

El remoto se llama **`rodi-gym-frontend`**, no `origin`.
