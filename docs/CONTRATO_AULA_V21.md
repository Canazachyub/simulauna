# CONTRATO API v2.1 — Aula Virtual SimulaUNA

> **Estado:** implementado en `google-apps-script/aula.gs` + extensiones de
> `setup.gs`/`main.gs`. Este documento describe las actions **nuevas**,
> aditivas, del Aula Virtual (§10 de `docs/AULA_VIRTUAL_DISENO.md`, con las
> hojas v2 de `§13` incluidas: `clases_en_vivo`, `grabaciones`, `recursos`).
> **NO modifica** `docs/CONTRATO_API_V2.md` (sigue congelado tal cual) ni
> ninguna hoja/action existente. Mismo estilo de router declarativo
> (`ROUTES`), misma resolución de tenant (`getTenant`), mismo patrón de
> cache namespaced que el contrato v2.
>
> Espejo 1:1 de la forma de datos con `src/components/aula/aulaMock.ts`
> (`AulaAgregadoMock` y sus sub-tipos) — el día que el frontend reemplace el
> mock por `services/api.ts`, la forma de `getAula` ya calza con lo que los
> componentes de `src/components/aula/*.tsx` esperan.

## 1. Autenticación y alcance

Todas las actions requieren `token` (igual que el contrato v2). Las que
exponen datos de un alumno específico (`getAula`, `getMisPagos`,
`inscribirCiclo`) requieren además `dni` (+ `email` cuando se indica) para
verificación liviana anti-fraude: se reutiliza `checkGlobalFraud_()`
(ya definida en `users.gs` para `register`/`checkAccess`) — si el
`dni`+`email` recibidos entran en conflicto con un registro existente de
`CORE.usuarios` (mismo DNI con otro email, o viceversa), la action se
rechaza con error. Si el DNI simplemente no existe todavía en
`CORE.usuarios`, **no** se rechaza (no hay riesgo de fuga: sin usuario no
hay matrícula que filtrar) — esto evita romper el flujo de un alumno que
aún no se registró pero ya quiere ver el Aula.

## 2. Nuevas hojas (CORE) — resumen de headers exactos

Todas viven en el mismo spreadsheet `CORE_SPREADSHEET_ID` (ninguna hoja
nueva por universidad), creadas por `setupCore()` vía
`setupSheetWithHeaders_()` (idempotente).

| Hoja | Headers (orden exacto) |
|---|---|
| `ciclos` | `id_ciclo, universidad, nombre, proceso, fecha_inicio, fecha_fin, turno, aforo, precio_matricula, precio_mensualidad, n_mensualidades, estado, whatsapp_coordinador` |
| `matriculas` | `id_matricula, dni, universidad, id_ciclo, fecha_inscripcion, estado, turno_elegido, observaciones` |
| `pagos` | `id_pago, dni, id_ciclo, concepto, monto, fecha_reporte, fecha_verificacion, medio, estado, voucher_ref, verificado_por` |
| `horario` | `id_ciclo, dia, hora_inicio, hora_fin, curso, docente, modalidad, enlace_meet, aula_fisica` |
| `docentes` | `id_docente, universidad, nombre, curso, foto_url, bio_corta` |
| `materiales` | `id_material, id_ciclo, semana, curso, titulo, tipo, url_drive, fecha_publicacion, destacado, estado` |
| `grupos_whatsapp` | `id_grupo, id_ciclo, nombre_grupo, enlace_invitacion, estado` |
| `anuncios` | `id_anuncio, id_ciclo, fecha, titulo, cuerpo, fijado, estado` |
| `clases_en_vivo` | `id_clase, id_ciclo, fecha, hora_inicio, hora_fin, curso, docente, plataforma, enlace, estado` |
| `grabaciones` | `id_grabacion, id_ciclo, fecha, curso, docente, titulo, url_video, duracion_min` |
| `recursos` | `id_recurso, id_ciclo, titulo, descripcion, url, categoria` |

**Desviaciones deliberadas frente a `AULA_VIRTUAL_DISENO.md` (documentadas
aquí porque ese documento queda como la propuesta original, no se edita):**
- `materiales` y `anuncios` ganan una columna `estado` que el diseño
  original no listaba explícitamente. Se agrega para seguir el mismo
  patrón de publicación por fila que ya usa `Banco_<Curso>.ESTADO=activa`
  en el contrato v2 congelado, y que el propio diseño pide en su filosofía
  de "publicar = agregar/activar la fila" (§5.1). Gating: `materiales`
  requiere `estado=publicado` exacto (fila sin ese valor = invisible,
  igual de estricto que `Banco_`); `anuncios` excluye solo `estado=oculto`
  (una fila con la columna vacía sigue publicada, para no romper filas
  cargadas antes de que el coordinador aprenda a usar la columna).
- `grabaciones` y `recursos` **no** tienen columna de estado: la sola
  presencia de la fila las publica (mismo criterio que `docentes`/
  `horario`/`grupos_whatsapp`), porque no hay un flujo de "borrador" para
  ellas en el diseño (el coordinador las agrega ya listas).

## 3. Precedencia del gate de acceso al Aula

Reglas de `getAula` (ver también `AULA_VIRTUAL_DISENO.md` §8):

1. **Fuente primaria:** fila en `matriculas` con `dni` + `universidad`
   coincidentes y `estado=matriculado`, cuyo `ciclos.estado ≠ cerrado`. Si
   hay varias, se toma la de `fecha_inscripcion` más reciente.
2. **Override manual:** `CORE.permisos` con `modalidad='aula'` y
   `estado` distinto de `inactivo`/`revocado` (mismo criterio que
   `checkPermiso_()`, ya usado por `simulacro`/`banqueo`). Sirve para dar
   acceso manual sin pasar por el flujo de matrícula/pago (ej. cortesía,
   pruebas, convenios). **Precedencia:** si existe matrícula activa, esa
   manda para resolver `matricula.estado`/`turnoElegido` en la respuesta;
   el permiso de `aula` solo *habilita* el acceso cuando **no** hay
   matrícula (en ese caso `matricula.estado` en la respuesta es el string
   sintético `'activo_por_permiso'`, para que el frontend lo distinga de
   una matrícula real). Si tampoco se puede resolver un `id_ciclo` (ni por
   parámetro, ni por matrícula, ni un ciclo abierto/en curso del tenant),
   se degrada a `matriculado:false`.
3. Sin matrícula activa ni permiso → `{matriculado:false, ciclosDisponibles:[...]}`
   (mismos ciclos que devolvería `getCiclos(estado=inscripciones_abiertas)`).

## 4. Actions

### `getCiclos` — GET

| Param | Requerido | Notas |
|---|---|---|
| `universidad` | sí | tenant |
| `estado` | no | filtra por `inscripciones_abiertas`\|`en_curso`\|`cerrado` |

Respuesta `data`:
```json
{ "ciclos": [{
  "idCiclo": "una-demo-2026-1", "universidad": "una", "nombre": "Ciclo Demo UNA 2026",
  "proceso": "ORDINARIO", "fechaInicio": "2026-06-01", "fechaFin": "2026-09-30",
  "turno": "mañana", "aforo": 40, "precioMatricula": 80, "precioMensualidad": 150,
  "nMensualidades": 4, "estado": "inscripciones_abiertas",
  "whatsappCoordinador": "https://wa.me/51900000000"
}] }
```
Cache: `aula:<universidad>:ciclos[:<estado>]`, TTL 300s.

### `inscribirCiclo` — POST (body JSON, mismo patrón que `submitExam`: querystring `?action=inscribirCiclo&token=...`, body `{...}`)

| Param (body) | Requerido |
|---|---|
| `universidad` | sí |
| `dni` | sí |
| `email` | sí |
| `cicloId` | sí |
| `turno` | no |

Idempotente por `dni`+`cicloId`: si ya existe una fila en `matriculas` para
ese par, **no** crea una nueva — devuelve `yaExistia:true` y el `estado`
actual de esa fila (puede ser `preinscrito`, `matriculado` o `retirado`,
lo que el coordinador haya dejado). Si no existe, valida que el ciclo
exista para esa universidad y que `estado ≠ cerrado` (si está cerrado,
error `"Este ciclo ya cerró inscripciones"`), crea la fila con
`estado=preinscrito`, `fecha_inscripcion=ahora`.

Respuesta `data`:
```json
{
  "inscrito": true, "yaExistia": false, "idMatricula": "mat-<uuid>",
  "estado": "preinscrito", "cicloId": "una-demo-2026-1", "universidad": "una",
  "instruccionesPago": {
    "mensaje": "Realiza el pago de matrícula (S/ 80) por Yape/Plin/transferencia. Envía la captura de tu voucher por WhatsApp al coordinador: https://wa.me/51900000000. Cuando el coordinador verifique tu pago, tu matrícula pasará de \"preinscrito\" a \"matriculado\" y tendrás acceso completo al Aula.",
    "precioMatricula": 80, "precioMensualidad": 150,
    "whatsappCoordinador": "https://wa.me/51900000000"
  }
}
```
No crea fila en `pagos` ni en `permisos` — eso lo hace el coordinador a
mano al verificar el voucher (cambiar `matriculas.estado` a `matriculado`),
igual que documenta `AULA_VIRTUAL_DISENO.md` §2.1.

### `getAula` — GET

| Param | Requerido | Notas |
|---|---|---|
| `universidad` | sí | |
| `dni` | sí | |
| `email` | sí | anti-fraude liviano, ver §1 |
| `cicloId` | no | si se omite, se resuelve la matrícula activa más reciente (o el ciclo abierto/en curso más reciente si el acceso viene de un permiso `aula` sin matrícula) |

Respuesta `data` cuando **no** hay acceso:
```json
{ "matriculado": false, "tieneCicloActivo": false, "ciclosDisponibles": [ /* getCiclos(inscripciones_abiertas) */ ] }
```

Respuesta `data` cuando **sí** hay acceso (agregado en un solo round-trip,
como `getConfig`):
```json
{
  "matriculado": true, "tieneCicloActivo": true,
  "ciclo": { "...": "forma de getCiclos" },
  "matricula": { "estado": "matriculado", "turnoElegido": "mañana", "fechaInscripcion": "2026-05-20" },
  "horario": [{ "dia": "lunes", "horaInicio": "08:00", "horaFin": "09:30", "curso": "Aritmética", "docente": "...", "modalidad": "virtual", "enlaceMeet": "...", "aulaFisica": "" }],
  "docentes": [{ "idDocente": "...", "nombre": "...", "curso": "...", "fotoUrl": "", "bioCorta": "..." }],
  "materiales": [{ "idMaterial": "...", "semana": 3, "curso": "...", "titulo": "...", "tipo": "pdf", "urlDrive": "...", "fechaPublicacion": "2026-06-10", "destacado": true }],
  "anuncios": [{ "idAnuncio": "...", "fecha": "2026-06-01", "titulo": "...", "cuerpo": "...", "fijado": true }],
  "grupoWhatsapp": { "nombreGrupo": "...", "enlaceInvitacion": "...", "estado": "activo" },
  "pagos": { "estadoGeneral": "al_dia|en_revision|vencido", "conceptos": [{ "concepto": "mensualidad_2", "etiqueta": "Mensualidad 2", "monto": 150, "estado": "pendiente", "medio": "", "fechaReporte": "", "fechaVerificacion": "" }] },
  "simulacrosCiclo": [{ "fecha": "2026-06-15", "proceso": "ORDINARIO", "puntaje": 1580, "puntajeMax": 3000, "porcentaje": 52.7 }],
  "clasesEnVivo": [{ "idClase": "...", "fecha": "2026-06-20", "horaInicio": "08:00", "horaFin": "09:30", "curso": "...", "docente": "...", "plataforma": "meet", "enlace": "...", "estado": "programada" }],
  "grabaciones": [{ "idGrabacion": "...", "fecha": "2026-06-10", "curso": "...", "docente": "...", "titulo": "...", "urlVideo": "...", "duracionMin": 78 }],
  "recursos": [{ "idRecurso": "...", "titulo": "...", "descripcion": "...", "url": "...", "categoria": "Química" }]
}
```

`pagos` y `matricula` son **siempre por-DNI, nunca cacheados a nivel
servidor** (se leen frescas en cada llamada). El resto del agregado
(`ciclo`, `horario`, `docentes`, `materiales`, `anuncios`, `grupoWhatsapp`,
`clasesEnVivo`, `grabaciones`, `recursos`) se cachea por ciclo, clave
`aula:<universidad>:<cicloId>`, TTL 1800s (30 min) — es el mismo contenido
para todos los alumnos de ese ciclo, así que cachear por DNI sería
desperdiciar cache.

`simulacrosCiclo` reutiliza `CORE.historial` (sin hoja nueva), filtrando
por `dni` + `universidad` + rango `[ciclo.fechaInicio, ciclo.fechaFin]` —
igual que describe `AULA_VIRTUAL_DISENO.md` §7 fila 7. Es una sección
"autocontenida": si falla la lectura de `historial` por cualquier motivo,
`simulacrosCiclo` devuelve `[]` sin tumbar el resto de `getAula`.

`tieneCicloActivo` es un alias exacto de `matriculado` (mismo valor) — se
incluyen ambos nombres porque `matriculado` es el que pide este contrato
explícitamente y `tieneCicloActivo` es el nombre que ya usa
`AulaAgregadoMock` en `aulaMock.ts`, para que el día del corte de mock a
API real el frontend pueda leer cualquiera de los dos sin remapear campos.

### `getMisPagos` — GET

| Param | Requerido |
|---|---|
| `universidad` | sí |
| `dni` | sí |
| `cicloId` | sí |

Respuesta `data`: misma forma que `pagos` dentro de `getAula`
(`{estadoGeneral, conceptos:[...]}`). Sin cache (dato financiero, siempre
fresco).

**Cálculo de `estadoGeneral`** (limitación honesta: la hoja `pagos` no
tiene columna de fecha de vencimiento, así que no hay forma de derivar
"vencido" por fecha — ver `AULA_VIRTUAL_DISENO.md` §3 donde tampoco se
define esa columna):
- `rechazado` en algún concepto → `vencido` (se interpreta como la señal
  más fuerte de que algo requiere atención).
- si no, `pendiente` en algún concepto → `en_revision`.
- si no (todo `verificado`, o sin filas) → `al_dia`.

## 5. Router (`main.gs` / `ROUTES`)

```js
getCiclos:      { handler: handleGetCiclos_,      required: ['universidad'], method: 'GET' },
getAula:        { handler: handleGetAula_,        required: ['universidad', 'dni', 'email'], method: 'GET' },
getMisPagos:    { handler: handleGetMisPagos_,    required: ['universidad', 'dni', 'cicloId'], method: 'GET' },
inscribirCiclo: { handler: handleInscribirCiclo_, required: ['universidad', 'dni', 'email', 'cicloId'], method: 'POST' }
```

## 6. Errores

Mismo patrón centralizado que el contrato v2: cualquier `throw` dentro de
un handler se captura en `handleRequest_` y se traduce a
`{success:false, error:"<mensaje>"}`. Casos explícitos en `aula.gs`:
- `universidad` inválida → `"Universidad no válida"` (vía
  `resolveTenantOrThrow_`, sin cambios).
- Falta hoja del Aula en CORE → `'Hoja "<nombre>" no encontrada en el
  spreadsheet CORE. Ejecuta setupCore() para crearla.'`
- `inscribirCiclo` a un ciclo inexistente → `"Ciclo no válido para esta
  universidad"`.
- `inscribirCiclo` a un ciclo cerrado (primera vez, sin fila previa) →
  `"Este ciclo ya cerró inscripciones"`.
- Conflicto DNI/email (getAula, inscribirCiclo) → `"DNI y email no
  coinciden con el usuario registrado"`.
