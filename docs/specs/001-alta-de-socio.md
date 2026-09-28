# 001 · Alta de socio

**Estado:** Aprobada · **Repo:** frontend · **Rama:** `feature/create-member`

Se apoya en el contrato de `rodi-gym-backend/docs/specs/001-alta-de-socio.md`.

## Contexto

En Socios ya está el botón flotante "Agregar socio", pero no hace nada: hoy la única
forma de cargar un socio es pegarle a la API a mano. El backend está cambiando el
alta para que **no regale un mes de membresía**: el socio nace activo pero sin
membresía, o sea **Deudor**, hasta que se le registre el primer pago.

## Alcance

**Entra**

- Pantalla de alta en `/members/new`, a la que lleva el botón flotante de Socios.
- Formulario con DNI, nombre, apellido y teléfono, validado igual que el backend.
- Manejo del DNI repetido (409) y de los errores de red o del servidor.
- Al guardar, ir al perfil del socio recién creado.

**No entra**

- **Registrar el primer pago** desde el alta. Pagos es todavía un placeholder; el
  socio queda como Deudor y se le cobra desde ahí cuando exista.
- **Reactivar un socio dado de baja**: el backend responde 409 y el frontend solo
  ofrece ir a su perfil.
- Editar un socio.
- Aviso al salir con el formulario a medio llenar.
- Foto y fecha de alta del socio (no existen en el backend).

## Requisitos

- **R1.** El botón flotante de Socios navega a `/members/new`.
- **R2.** `/members/new` abre el formulario y **no** el perfil de un socio con id
  `new`.
- **R3.** El header muestra "Nuevo socio" con la flecha de volver a `/members`.
- **R4.** El DNI acepta solo dígitos y tiene que tener **7 u 8** (1.000.000 a
  99.999.999). Se toleran puntos y espacios al tipear o pegar (`40.123.456`); se
  sacan antes de validar.
- **R5.** Nombre, apellido y teléfono son obligatorios y **no pueden ser solo
  espacios**. Se mandan recortados (`trim`).
- **R6.** Los errores de un campo se muestran recién cuando el campo se tocó o se
  intentó guardar, no mientras se completa por primera vez.
- **R7.** Con el formulario inválido, "Guardar" no llama a la API: marca los campos
  con error.
- **R8.** Mientras se guarda, el botón queda deshabilitado y dice "Guardando…". Un
  segundo toque no manda otro POST.
- **R9.** Con **201**, navega a `/members/:dni` reemplazando la entrada del
  historial: volver desde el perfil lleva a Socios, no al formulario vacío.
- **R10.** Con **409**, el campo DNI muestra "Ya existe un socio con ese DNI" y un
  link a su perfil. El resto del formulario conserva lo cargado. Se identifica por
  el código, no por el `message`.
- **R11.** Con cualquier otro error (400, 5xx, sin conexión) aparece un aviso
  general "No se pudo guardar el socio. Probá de nuevo." y se conserva lo cargado.
- **R12.** Al editar el DNI después de un 409, el error de duplicado desaparece.

## Contrato

`POST /members` según la spec del backend. El `caseConversionInterceptor` convierte
las claves, así que el servicio trabaja en camelCase:

```ts
interface MemberCreate {
  id: number;          // DNI
  name: string;
  lastName: string;
  phoneNumber: string;
}
```

| Código | Qué hace el frontend |
|---|---|
| 201 | Devuelve el `Member` creado (`expirationDate: null`) → R9 |
| 409 | R10 |
| 400 / otro | R11 |

## Diseño

### Servicio

- `MemberService.createMember(member: MemberCreate): Observable<Member>`. El tipo
  `MemberCreate` va en `member.model.ts`, al lado de `Member`. Sin mappers.

### Ruta

- `members/new` se declara **antes** de `members/:id` en `app.routes.ts`. El router
  toma la primera que coincide, y al revés `new` caería como id del perfil.
- **Descartado:** abrir el formulario en un bottom sheet sobre la lista. Una ruta
  propia se integra sola con el botón de volver del sistema operativo y con el
  `PageHeaderService`, y no requiere armar un componente de overlay que hoy no
  existe.

### Página `member-create`

- `modules/members/pages/member-create/`, generada con `ng generate component`.
- **Reactive forms tipados** (`NonNullableFormBuilder`). Es el primer formulario de
  la app; las validaciones y el estado de envío quedan explícitos y testeables sin
  tocar el DOM.
- **Descartado:** template-driven forms con `ngModel`: los validadores custom (DNI,
  en blanco) y el error de servidor sobre un campo son más engorrosos.
- Validadores:
  - DNI: `required` + un validador propio que saca puntos y espacios y exige
    `^\d{7,8}$` y `>= 1.000.000`.
  - Nombre, apellido, teléfono: `required` + un validador `notBlank` (Angular no
    trae uno; `required` deja pasar `"   "`).
  - El 409 se marca con `setErrors({ duplicate: true })` sobre el control del DNI;
    se limpia solo porque cualquier cambio de valor re-ejecuta los validadores (R12).
- El DNI es `inputmode="numeric"` pero **`type="text"`**: `type="number"` aceptaría
  `e`, `-` y decimales, y mostraría flechitas.
- El teléfono es `type="tel"` sin formato: el backend decidió no validarlo más allá
  de no estar en blanco.
- Estado con signals: `saving` y `saveFailed`. El envío es un `subscribe` puntual
  (no hay stream que mantener vivo, así que la trampa del `catchError` fuera del
  `switchMap` no aplica).
- Estilo con los tokens de `@theme`. Los inputs copian el del buscador de Socios
  (borde `line`, foco `accent`); los errores en `danger-strong`.

### Socios

- `<app-fab-button icon="person_add" label="Agregar socio" link="/members/new" />`.

## Pruebas

| Requisito | Test |
|---|---|
| Servicio | `member.service.spec.ts` (nuevo): el POST sale en snake_case a `/api/members` |
| R2 | `app.routes.spec.ts` o en el spec de la página: `/members/new` resuelve a `MemberCreateComponent` |
| R4, R5, R7 | `member-create.component.spec.ts`: DNI con puntos válido; 6 y 9 dígitos, letras y en blanco inválidos; espacios en nombre inválidos; inválido no hace request |
| R6 | spec de la página: sin tocar no hay mensaje; tras guardar sí |
| R8 | spec de la página: dos clicks con la request pendiente → un solo POST |
| R9 | spec de la página: 201 → `navigate(['/members', dni], { replaceUrl: true })` |
| R10, R12 | spec de la página: 409 → error de duplicado con link; al cambiar el DNI se va |
| R11 | spec de la página: 500 y error de red → aviso general, valores intactos |
| R1, R3 | spec de la página (header) y de Socios (link del FAB) |

Los specs con HTTP registran el interceptor y responden en snake_case, como el
resto.

## Tareas

- [x] `MemberCreate` y `MemberService.createMember` + spec.
- [x] Ruta `members/new` antes de `members/:id`.
- [x] Página `member-create` con formulario, validaciones y manejo de errores.
- [x] Link del FAB en Socios.
- [x] Specs de la página.
- [x] `npx ng build` y `npx ng test --watch=false --browsers=ChromeHeadless` en verde.
- [x] Probarlo contra el backend con la rama `feature/create-member` (lo levanta el
  usuario).
- [x] Actualizar `CLAUDE.md` (pantallas, convenciones de formularios, trampa de la
  ruta).
- [ ] Pasar esta spec a **Implementada** al mergear.

## Pendientes

- **Registrar el primer pago** apenas se crea el socio, cuando exista Pagos. Hoy el
  flujo termina en un perfil que dice "Vencido".
- El badge dice **"Vencido"** también para quien nunca pagó. Podría distinguirse
  ("Sin pago"), pero cambia el criterio compartido con el check-in.
- **Reactivar socios dados de baja** desde el 409 (depende del backend).
- Editar un socio: el formulario debería poder reusarse.
