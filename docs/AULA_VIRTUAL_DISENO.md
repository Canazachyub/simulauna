# Aula Virtual SimulaUNA — Diseño completo (propuesta v2.1)

> **Estado de este documento:** propuesta de diseño y extensión. NO modifica
> `docs/CONTRATO_API_V2.md` (que queda congelado tal cual). Todo lo descrito
> aquí son hojas, actions y componentes **nuevos**, aditivos, que no tocan
> ninguna acción ni hoja existente. Mientras el backend v2.1 no exista, la
> UI vive de un mock local (`src/components/aula/aulaMock.ts`) que sigue
> exactamente este modelo de datos, para que el día del corte solo cambie
> la fuente de datos, no los componentes.
>
> Autor: subagente de gestión de academias preuniversitarias + frontend.
> Fecha: 2026-07. Ver también `docs/DIRECCION_DISENO_V3.md` §Aulas virtuales
> (la previsión original: "backend sin cambios hoy, permisos.modalidad ya es
> texto libre").
>
> **Actualización 2026-07 (v2 de la UI, mismo modelo de datos):** las
> secciones §0 y §7 describían un **muro único** (`AulaMuro`, un solo grid
> bento con todo). Feedback directo del usuario: eso se sentía como un
> Padlet, y lo que se quiere es una **plataforma con navegación entre
> secciones**, usando bento **dentro** de cada sección. La UI se rediseñó
> en consecuencia (`AulaShell` reemplaza a `AulaMuro`) — ver la sección
> nueva **"Arquitectura de navegación del aula (v2)"** al final de este
> documento. El modelo de datos de §1-§12 sigue vigente tal cual (ciclos,
> matrículas, pagos, horario, docentes, materiales, grupos, anuncios); solo
> se agregan 3 hojas nuevas (`clases_en_vivo`, `grabaciones`, `recursos`) y
> cambia el LAYOUT, no el backend propuesto.

## 0. Filosofía: "muro curado", no Padlet libre

> **Evolucionado en v2** (ver sección final): el "coordinador decide el
> layout" sigue siendo el principio rector (el alumno nunca arrastra ni
> reordena nada), pero el layout dejó de ser un muro único — ahora es una
> plataforma con secciones navegables, cada una con su propio bento
> curado por el coordinador. Lo que NO cambia: cero drag&drop, cero "añadir
> nota", el alumno solo consume.

La referencia mental del usuario es Padlet, pero **invertida en quién
decide el layout**: en Padlet el alumno arrastra notas y arma su propio
muro. Aquí el **coordinador de ciclo** (o el equipo SimulaUNA) es quien
publica contenido a hojas de Google Sheets con estructura fija, y el
frontend renderiza ese contenido en un layout **bento pre-diseñado y fijo
por sección**. El alumno solo consume: no hay drag&drop, no hay
"añadir nota", no hay reordenar. Esto es deliberado y calca cómo operan
las academias reales (Pamer/Trilce/ADUNI): el coordinador de ciclo publica
el horario, el material y los avisos; el alumno los recibe ya organizados.

Ventajas de este enfoque para una academia preuniversitaria real:
- **Cero curva de aprendizaje** para el alumno (típicamente 16-19 años,
  primera vez en un aula virtual "seria").
- **Cero soporte técnico**: nadie llama a la academia preguntando "cómo
  subo un archivo a mi muro", porque el alumno nunca publica nada.
- **Consistencia de marca**: todas las aulas de todas las universidades se
  ven "SimulaUNA", con el acento institucional (`--uni-*`) como único
  elemento que cambia.

## 1. Modelo de ciclos

### 1.1 Decisión: ¿dónde vive la hoja `ciclos`? → **CORE**, no por universidad

Justificación (pensando en quién administra qué en el día a día):

- Las hojas por universidad (`config_examen`, `Banco_<Curso>`, etc.) las
  edita el **equipo académico/contenido** (arma bancos de preguntas,
  configura escalas). Son datos de **examen**.
- Las hojas del Aula (`ciclos`, `matriculas`, `pagos`, `horario`,
  `docentes`, `materiales`, `grupos_whatsapp`, `anuncios`) las edita el
  **equipo de operaciones/coordinación** (matricula alumnos, verifica
  Yape, publica el horario de la semana). Son datos de **gestión de
  alumnos**, y ya existe un spreadsheet dedicado a eso: **CORE**
  (`usuarios`, `permisos`, `intentos`, `historial`).
- Poner `ciclos`/`matriculas`/`pagos` en CORE evita que el equipo de
  operaciones tenga que abrir 7 spreadsheets distintos (uno por
  universidad) para saber si Juan Pérez (dni X) pagó su mensualidad —
  todo el ciclo de vida del alumno (cuenta → permisos → historial →
  matrícula → pagos) queda en **un solo lugar**, filtrable por columna
  `universidad`, igual que ya hace `permisos` e `intentos` hoy.
- Si mañana una universidad grande necesita su propio spreadsheet de aula
  (por volumen), se puede migrar esa universidad sola sin tocar el
  contrato: la lectura ya pasaría por `getTenant` como con `config_examen`.
  Por ahora (fase 1, pocas universidades con ciclo activo) CORE alcanza y
  es más simple de operar.

### 1.2 Hoja `ciclos` (CORE)

| Columna | Tipo | Notas |
|---|---|---|
| `id_ciclo` | texto | slug único, ej. `una-verano-2027-1` |
| `universidad` | texto | código (`una`, `unsa`, …) |
| `nombre` | texto | ej. "Ciclo Verano UNA 2027-I" |
| `proceso` | texto | `ORDINARIO`\|`CEPRE`\|`EXTRAORDINARIO` — a qué proceso de admisión prepara |
| `fecha_inicio` | fecha | |
| `fecha_fin` | fecha | |
| `turno` | texto | `mañana`\|`tarde`\|`noche`\|`unico` (si hay 1 solo turno) |
| `aforo` | número | cupos totales del ciclo/turno |
| `precio_matricula` | número | soles |
| `precio_mensualidad` | número | soles |
| `n_mensualidades` | número | cuántas mensualidades dura el ciclo (ej. 4) |
| `estado` | texto | `inscripciones_abiertas`\|`en_curso`\|`cerrado` |
| `whatsapp_coordinador` | texto (opcional) | enlace directo al coordinador para dudas de matrícula (distinto del grupo de aula) |

Un ciclo por fila. Varios ciclos activos en paralelo por universidad son
válidos (ej. turno mañana y turno tarde son 2 filas). El `estado` es lo
único que el coordinador cambia manualmente conforme avanza el calendario
— no hay automatización de fechas en fase 1 (honesto: nadie escribe un
cron para esto todavía, se revisa a mano semanalmente).

## 2. Matrículas e inscripción

### 2.1 Flujo del estudiante

1. Estudiante ya tiene cuenta (dni/email en `CORE.usuarios`, típicamente
   porque ya rindió un simulacro gratis).
2. Ve en `/:universidad` la tarjeta "Aula virtual" — si hay al menos un
   ciclo con `estado=inscripciones_abiertas`, dice "Matricúlate" en vez de
   "Próximamente" (hoy no hay ninguno, por eso el estado real es
   ComingSoon en todas partes).
3. Pantalla de matrícula (futura, fuera del alcance de este entregable de
   UI): elige turno/ciclo → confirma DNI/nombre/celular → el frontend
   llama `inscribirCiclo` (propuesta, ver §10) → se crea una fila en
   `matriculas` con `estado=preinscrito`.
4. El alumno **reporta el pago de matrícula por WhatsApp** (ver §3) → el
   coordinador, al verificar el voucher, cambia manualmente la fila de
   `matriculas` a `estado=matriculado` (no hay pasarela de pago que lo
   automatice — ver honestidad del MVP en §3).
5. Si el alumno decide no continuar el ciclo, el coordinador marca
   `estado=retirado` (esto también apaga el acceso al aula, ver §8).

### 2.2 Hoja `matriculas` (CORE)

| Columna | Notas |
|---|---|
| `id_matricula` | slug/uuid corto |
| `dni` | vincula con `CORE.usuarios` |
| `universidad` | código |
| `id_ciclo` | FK a `ciclos.id_ciclo` |
| `fecha_inscripcion` | fecha de la preinscripción |
| `estado` | `preinscrito`\|`matriculado`\|`retirado` |
| `turno_elegido` | por si el ciclo tiene varios turnos |
| `observaciones` | texto libre del coordinador (ej. "beca 20%", "cambio de turno el 15/03") |

Un alumno puede tener varias filas históricas (una por ciclo al que se
inscribió alguna vez) — el "ciclo activo" de un alumno es la fila con
`estado=matriculado` cuyo `ciclo.estado ≠ cerrado` más reciente.

## 3. Pagos y mensualidades — honestidad del MVP

**No hay pasarela de pagos.** Esto es intencional y realista: la inmensa
mayoría de academias preuniversitarias medianas en el Perú (fuera de las
cadenas grandes con área de sistemas propia) operan pagos por
Yape/Plin/transferencia + verificación manual, porque integrar una
pasarela (Culqi, Niubiz, MercadoPago) implica RUC, comisiones y
un backend de cobros que no es prioridad de un MVP. El flujo real:

1. El alumno **hace el Yape/Plin/transferencia** a la cuenta de la
   academia (número mostrado en la propia Aula, dato estático por
   universidad/ciclo).
2. El alumno **envía la captura del voucher por WhatsApp** al grupo o
   número del coordinador (mismo canal que ya usa la plataforma para la
   lista de espera — `WHATSAPP_BASE` existente).
3. El coordinador (persona), al ver el voucher, **agrega una fila
   manualmente en la hoja `pagos`** con `estado=verificado`. Si el alumno
   aún no pagó pero ya se le recordó, puede registrarse igual la fila con
   `estado=pendiente` (para que el sistema sepa que hay una mensualidad
   "en curso de revisión" y no lo trate como moroso duro de inmediato).
4. El estudiante ve en su Aula (sección "Mi estado de pagos") un resumen
   simple: matrícula pagada sí/no, mensualidades 1..N con su estado. **No
   ve montos de terceros ni historial contable completo** — solo lo suyo,
   en lenguaje llano ("Mensualidad 2 · pagada el 14/04", "Mensualidad 3 ·
   pendiente, vence el 30/04").
5. Recordatorios de vencimiento: fase 1 = **manual** (el coordinador
   escribe al grupo de WhatsApp del ciclo un día antes del vencimiento,
   como ya hace cualquier academia). Fase 2 (futura, ver §9) podría
   automatizarse con Apps Script + trigger de tiempo que lea `pagos` y
   mande un recordatorio por WhatsApp Business API — **no se construye
   ahora**, se deja como TODO explícito.

### 3.1 Hoja `pagos` (CORE)

| Columna | Notas |
|---|---|
| `id_pago` | slug/uuid |
| `dni` | |
| `id_ciclo` | |
| `concepto` | `matricula`\|`mensualidad_1`\|`mensualidad_2`\|… (texto libre, no enum cerrado — un ciclo puede tener `n_mensualidades` distinto) |
| `monto` | soles reportados |
| `fecha_reporte` | cuándo el alumno avisó que pagó (o cuándo el coordinador registró la fila) |
| `fecha_verificacion` | cuándo el coordinador lo confirmó (vacío si sigue pendiente) |
| `medio` | `yape`\|`plin`\|`transferencia`\|`efectivo` |
| `estado` | `pendiente`\|`verificado`\|`rechazado` |
| `voucher_ref` | texto libre (ej. "captura enviada al grupo 12/04", número de operación) — **no se sube el voucher a Sheets**, la imagen vive en el chat de WhatsApp; Sheets solo referencia que existe |
| `verificado_por` | nombre del coordinador que lo validó (trazabilidad) |

### 3.2 Qué ve el estudiante — "Mi estado de cuenta" (sección del muro)

Tarjeta simple, sin jerga contable:
- Chip de estado general: **Al día** (verde) / **Pendiente de
  verificación** (ámbar, "tu pago está en revisión") / **Mensualidad
  vencida** (rojo suave, nunca agresivo — tono de aviso amable, ver §8).
- Lista de conceptos con su estado (matrícula + cada mensualidad hasta la
  fecha).
- CTA "¿Ya pagaste? Avísanos por WhatsApp" (mismo patrón que la lista de
  espera) — reutiliza el canal existente, cero fricción nueva.

## 4. Horario

### 4.1 Hoja `horario` (CORE)

| Columna | Notas |
|---|---|
| `id_ciclo` | FK |
| `dia` | `lunes`..`domingo` |
| `hora_inicio` / `hora_fin` | `HH:mm` |
| `curso` | nombre del curso (idealmente el mismo canónico de `cursos_canonicos`, para eventual cruce con banqueo, aunque no es obligatorio) |
| `docente` | nombre (idealmente calza con `docentes.nombre`) |
| `modalidad` | `presencial`\|`virtual` |
| `enlace_meet` | URL (vacío si presencial) |
| `aula_fisica` | texto (vacío si virtual), ej. "Aula 302 - Sede Salcedo" |

Una fila por bloque de clase. El render semanal agrupa por `dia` y ordena
por `hora_inicio`. Si hay huecos (no hay clase ese bloque) simplemente no
hay fila — no se rellena con "libre" salvo que el coordinador quiera
(texto libre en `curso`, ej. "Repaso libre").

### 4.2 Render en la web: `HorarioSemanal`

Grid de 7 columnas (días) en desktop, lista agrupada por día en móvil
(el grid de 7 columnas no cabe legible en una pantalla de teléfono — se
prioriza legibilidad sobre "parecerse a un calendario de escritorio").
Cada bloque muestra curso + rango horario + docente + un botón "Unirme"
si es virtual y la clase es hoy/próxima, o el aula física si es
presencial.

## 5. Docentes y materiales — "Drive sincronizado" sin backend nuevo

### 5.1 Convención de carpetas en Google Drive

Estructura real y operable por cualquier coordinador sin entrenamiento
técnico:

```
Drive compartido "SimulaUNA - Materiales"
└── <universidad>/                      (ej. una/)
    └── <id_ciclo>/                     (ej. una-verano-2027-1/)
        └── Semana <N>/                 (ej. Semana 03/)
            └── <Curso>/                (ej. Aritmética/)
                ├── separata-semana3.pdf
                ├── practica-dirigida.pdf
                └── (los videos van como enlace de YouTube/Drive, no se suben pesados)
```

- El **docente** sube su archivo a su carpeta de curso/semana (permisos de
  Drive: el docente es "editor" solo de su curpeta de curso, el
  coordinador es editor de todo — esto se configura una vez en Drive, no
  requiere código).
- El **coordinador** (o el propio docente, si se le da confianza) agrega
  **una fila en la hoja `materiales`** con el link para "publicarlo" en
  el Aula. Subir el archivo a Drive **no lo hace visible en la web** —
  solo la fila en Sheets lo publica. Esto da control de calidad (nadie ve
  un archivo a medio subir) y es el mismo patrón ya usado por
  `Banco_<Curso>.ESTADO=activa` en el contrato existente.
- Para compartir el archivo sin dolores de permisos, el Drive compartido
  se configura una vez como "cualquiera con el enlace puede ver" a nivel
  de carpeta raíz `<universidad>/` (o por ciclo, si se quiere aislar
  ciclos vencidos) — de nuevo, configuración de Drive, cero código.

### 5.2 Hoja `docentes` (CORE)

| Columna | Notas |
|---|---|
| `id_docente` | |
| `universidad` | |
| `nombre` | |
| `curso` | curso(s) que dicta — si dicta varios, varias filas (una por curso) es más simple de filtrar que CSV |
| `foto_url` | opcional, URL de Drive/foto pública; si vacío, la UI muestra iniciales en un avatar de color institucional |
| `bio_corta` | opcional, 1 línea ("Ingeniero civil, 8 años preparando postulantes") |

### 5.3 Hoja `materiales` (CORE)

| Columna | Notas |
|---|---|
| `id_material` | |
| `id_ciclo` | FK |
| `semana` | número |
| `curso` | |
| `titulo` | ej. "Separata 3 — Factorización" |
| `tipo` | `pdf`\|`video`\|`enlace` |
| `url_drive` | link (Drive, o YouTube si es video) |
| `fecha_publicacion` | fecha (para ordenar "lo más nuevo arriba" y para armar "Hoy en tu aula") |
| `destacado` | `si`/`no` — el coordinador marca manualmente el material de la semana que quiere resaltar en "Hoy en tu aula" |

## 6. Comunidad WhatsApp

### 6.1 Hoja `grupos_whatsapp` (CORE)

| Columna | Notas |
|---|---|
| `id_grupo` | |
| `id_ciclo` | FK (un grupo por ciclo/turno, o varios si se separan por curso — decisión del coordinador, el modelo no lo restringe) |
| `nombre_grupo` | ej. "UNA Verano 2027-I · Turno Mañana" |
| `enlace_invitacion` | link `chat.whatsapp.com/...` |
| `estado` | `activo`\|`lleno`\|`cerrado` — WhatsApp limita a 1024 miembros; si un grupo se llena, el coordinador crea uno nuevo y actualiza el link, marcando el viejo `lleno` |

El estudiante matriculado ve el botón "Unirme al grupo de tu aula" — si
`estado≠activo`, el botón se reemplaza por un aviso ("Grupo completo, el
coordinador abrirá uno nuevo pronto") en vez de un link roto.

## 7. El muro curado — secciones del Aula del estudiante

> **Evolucionado en v2:** esta tabla describía las celdas de un único muro
> (`AulaMuro`, retirado). Hoy cada fila de esta tabla es, en su mayoría, una
> **sección propia navegable** de `AulaShell` (ver sección final), y "Hoy en
> tu aula" se convirtió en la sección **Inicio** con un countdown a la
> próxima clase en vivo en vez de solo el próximo bloque de horario. La
> tabla se conserva como referencia del contenido/fuente de cada pieza —
> el mapeo exacto a secciones de la v2 está en la tabla de la sección final.

Layout bento, **cero configuración del alumno**, mobile-first. Orden y
tamaño de celda pensados por prioridad real de un alumno de academia
(qué necesita saber HOY, en 5 segundos, al entrar):

| # | Sección | Tamaño de celda | Contenido | Fuente |
|---|---|---|---|---|
| 1 | **Hoy en tu aula** | dominante (2 col / 2x1) | Próxima clase (curso, hora, docente, botón unirse) + material nuevo destacado de la semana | `horario` (próximo bloque) + `materiales` (`destacado=si` más reciente) |
| 2 | **Horario semanal** | mediana | Grid/lista de la semana completa | `horario` |
| 3 | **Anuncios del coordinador** | mediana, con scroll interno si hay >3 | Feed cronológico, fijados primero | `anuncios` |
| 4 | **Materiales por curso** | mediana-grande | Acordeón por curso → lista por semana, ícono por tipo (pdf/video/enlace) | `materiales` + `docentes` (para mostrar quién lo publicó) |
| 5 | **Mi estado de pagos** | pequeña | Chip de estado + lista de conceptos (ver §3.2) | `pagos` |
| 6 | **Mi grupo de WhatsApp** | pequeña | Botón unirme / aviso de grupo lleno | `grupos_whatsapp` |
| 7 | **Mis simulacros del ciclo** | pequeña-mediana | Reusa `CORE.historial` filtrado por `universidad` + rango de fechas del ciclo: últimos intentos con puntaje | `historial` (existente, sin cambios) |
| 8 | **Mi asistencia** | — | Ver §9 (extensión futura, NO se construye ahora) | — |

Regla de diseño: cada sección es **autocontenida** (puede fallar/estar
vacía sin romper el resto — ej. si un ciclo no tiene anuncios todavía, la
celda muestra un estado vacío amable, no un hueco roto). Esto es
importante porque en la vida real de una academia, algunas secciones
arrancan vacías (recién empieza el ciclo, aún no hay materiales) y el
alumno no debe sentir que "algo está roto".

## 8. Acceso: matriculado y al día vs. moroso

- **Gate de acceso al aula**: se extiende `CORE.permisos` con
  `modalidad='aula'` (el campo YA es texto libre en el contrato — cero
  cambio de esquema). Una fila `dni | universidad | modalidad=aula |
  estado=activo | fecha` se crea (manual o vía `inscribirCiclo`) cuando el
  alumno queda `matriculado` en `matriculas`. Sin esta fila, la ruta
  `/:universidad/aula` sigue mostrando el ComingSoon actual (no hay
  regresión: hoy nadie tiene esta fila, por eso el 100% de los usuarios
  ven ComingSoon).
- **Al día vs. moroso** es una capa *encima* del gate anterior, no un
  segundo gate duro: un alumno moroso **no pierde el acceso completo**
  (eso generaría abandono y mala fe — además la realidad de las academias
  es que rara vez cortan el acceso de golpe, primero avisan). En su lugar:
  - Si tiene alguna mensualidad `vencida` (fecha pasada y sin fila
    `verificado`), el Aula se muestra completa pero con un **aviso amable
    fijado arriba del muro** ("Tu mensualidad 3 está pendiente — repórtala
    por WhatsApp para seguir al día") — nunca un bloqueo total agresivo.
  - Solo si el coordinador decide cortar del todo (caso extremo, alumno
    que abandonó sin avisar hace meses), cambia `matriculas.estado` a
    `retirado` — eso sí regresa al alumno al ComingSoon normal.
  - Esta es una decisión deliberada de producto: la fricción de cobro es
    responsabilidad humana del coordinador (como en la vida real), no del
    software quitando acceso automáticamente.

## 9. Extensiones futuras (solo se listan, NO se construyen ahora)

- **Asistencia**: hoja `asistencia` (dni, id_ciclo, fecha, curso,
  estado presente/tarde/falta) — requeriría que el docente o un monitor
  la registre, probablemente con un Google Form que escribe a Sheets.
- **Notas de prácticas dirigidas**: hoja `notas` (dni, id_ciclo, curso,
  practica, puntaje) — separado del `historial` de simulacros, porque son
  evaluaciones distintas (formativas del ciclo vs. simulacros de examen
  de admisión).
- **Ranking del ciclo**: tabla comparativa (anónima o con consentimiento)
  usando `historial` filtrado por `id_ciclo` — requiere decidir política
  de privacidad antes de construir (¿se muestra el nombre de otros
  alumnos? probablemente solo posición + percentil, no nombres).
- **Certificados**: generación de PDF (ya existe `jspdf`/`jspdf-autotable`
  en el proyecto para Results, se podría reusar) al completar el ciclo con
  asistencia mínima — necesita definir criterio de "completó el ciclo".

## 10. Propuesta de nuevas actions del backend (v2.1 — NO implementado, NO toca el contrato v2 congelado)

Mismo estilo de router declarativo (`ROUTES`) del contrato actual.
Todas requieren `token` como las actuales; las que exponen datos de un
alumno específico requieren además `dni` (+ verificación liviana de
`email`, igual que `checkAccess` hoy) para no filtrar datos de otro DNI.

| action | método | params | respuesta `data` (propuesta) |
|---|---|---|---|
| `getCiclos` | GET | `universidad`, `estado?` | `[{idCiclo, nombre, proceso, fechaInicio, fechaFin, turno, aforo, precioMatricula, precioMensualidad, nMensualidades, estado}]` |
| `getAula` | GET | `universidad`, `dni` | Payload agregado (un solo round-trip, como `getConfig`): `{ciclo, matricula:{estado,turno}, horario:[...], docentes:[...], materiales:[...], anuncios:[...], grupoWhatsapp:{...}, pagos:{estadoGeneral, conceptos:[...]}, simulacrosCiclo:[...]}` — si `dni` no tiene matrícula activa, `{tieneCicloActivo:false}` |
| `inscribirCiclo` | POST | `{universidad, dni, idCiclo, turnoElegido}` | Crea fila en `matriculas` (`estado=preinscrito`). No crea pago ni permiso todavía (eso lo hace el coordinador al verificar matrícula) |
| `getMateriales` | GET | `universidad, idCiclo, curso?, semana?` | `[{titulo, tipo, urlDrive, fechaPublicacion, curso, semana}]` — para una vista de materiales con filtros propios, además de lo embebido en `getAula` |
| `getHorario` | GET | `universidad, idCiclo` | `[{dia, horaInicio, horaFin, curso, docente, modalidad, enlaceMeet, aulaFisica}]` |
| `reportarPago` (fase 2, opcional) | POST | `{universidad, dni, idCiclo, concepto, monto, medio}` | Crea fila en `pagos` con `estado=pendiente` — reemplazaría el aviso "avísanos por WhatsApp" por un registro semi-automático, pero la verificación humana del voucher se mantiene igual |

Notas de diseño de estas actions (para cuando se implementen):
- `getAula` es deliberadamente un **agregado** (como `getConfig`), no 6
  llamadas sueltas — un alumno con conexión de academia/celular en el
  Perú promedio no debería esperar 6 round-trips para ver su muro.
- Cache: `getCiclos`/`getHorario`/`getMateriales`/docentes son
  cacheables con el mismo mecanismo namespaced `<universidad>:<recurso>`
  del contrato (TTL más corto que 1800s, ej. 300s, porque cambian más
  seguido que la config de examen). `getAula` (personalizado por `dni`)
  NO se cachea a nivel servidor (o TTL muy corto, ~60s) porque mezcla
  datos por alumno.
- Anti-fraude/seguridad: igual patrón que `checkAccess` — se valida que
  el `dni` recibido corresponda a un registro real en `CORE.usuarios`
  antes de servir `getAula`, para que no cualquiera pueda leer el aula de
  otro DNI adivinando el número.

## 11. Resumen de hojas nuevas (CORE) — para `setupCore()` cuando se implemente v2.1

`ciclos`, `matriculas`, `pagos`, `horario`, `docentes`, `materiales`,
`grupos_whatsapp`, `anuncios` — 8 hojas nuevas, todas en el spreadsheet
CORE existente, ninguna nueva spreadsheet por universidad. `CORE.permisos`
gana la modalidad `aula` como valor de texto (sin migración de esquema).

> **v2:** se agregan 3 hojas más, mismo criterio (CORE, sin spreadsheet
> nuevo): `clases_en_vivo`, `grabaciones`, `recursos` — ver su modelo
> completo en "Arquitectura de navegación del aula (v2)" más abajo. Total
> con v2: **11 hojas nuevas** en CORE.

## 12. Trazabilidad con la UI mock (Entregable 2)

`src/components/aula/aulaMock.ts` define TypeScript types que son el
espejo 1:1 de las filas de estas hojas (`CicloMock`, `MatriculaMock`,
`PagoMock`, `HorarioItemMock`, `DocenteMock`, `MaterialMock`,
`GrupoWhatsappMock`, `AnuncioMock`) más una función agregadora
`getAulaMock(universidad, dni)` que devuelve exactamente la forma
propuesta para `getAula` en §10. El día que exista el backend real, el
único cambio en `src/components/aula/*.tsx` es reemplazar el import de
`aulaMock.ts` por una llamada a `services/api.ts` — ningún componente de
presentación cambia.

> **v2:** `aulaMock.ts` agrega `ClaseEnVivoMock`, `GrabacionMock` y
> `RecursoMock` (espejo de las 3 hojas nuevas) más los helpers
> `getEstadoClaseEnVivo` y `getProximaClaseEnVivoMock` (estado derivado en
> cliente, ver política de embebido más abajo). La composición visual pasó
> de `AulaMuro.tsx` (retirado) a `AulaShell.tsx` + `ResourceViewer.tsx` —
> ver el detalle completo en la sección siguiente.

## 13. Arquitectura de navegación del aula (v2)

### 13.0 Por qué se cambió

Feedback directo del usuario, textual: *"No quiero el diseño Padlet [un
solo muro]. Quiero que sea una PLATAFORMA con barra de navegación entre sus
secciones, y usaremos la facilidad de bentos tipo Padlet DENTRO [de cada
sección]... También poner links externos DENTRO de nuestra plataforma."*

Auditoría del muro único (`AulaMuro`, retirado) contra ese feedback:

- **Todo en una sola pantalla no escala.** El muro v1 ya tenía 7 celdas
  (Hoy en tu aula, Horario, Anuncios, Materiales, Pagos, Grupo,
  Simulacros) en un único `grid`. Agregar "Clases en vivo" y "Grabaciones"
  como celdas 8 y 9 del mismo muro habría hecho scroll infinito la única
  respuesta a "¿dónde veo mis Zoom de esta semana?" — exactamente el
  síntoma "Padlet" que el usuario rechazó.
- **Cero jerarquía de navegación = cero sensación de plataforma.** Un
  muro no tiene "ir a", solo tiene scroll. Una plataforma real (el propio
  benchmark del usuario para Meets/Zoom/grabaciones/PDFs) necesita que el
  alumno pueda saltar directo a "Grabaciones" sin pasar visualmente por
  Pagos y Horario en el camino.
- **Los enlaces externos salían de la plataforma.** v1 abría
  Drive/YouTube siempre en pestaña nueva (`target="_blank"`) — cumplía
  "material publicado", pero no "dentro de nuestra plataforma". Esta v2
  agrega `ResourceViewer.tsx`: un visor modal embebido que sí mantiene al
  alumno dentro de `simulauna.school` mientras ve el PDF o el video.

Lo que **no cambia**: el modelo de datos de §1-§12 (ciclos, matrículas,
pagos, horario, docentes, materiales, grupos, anuncios), la filosofía de
"coordinador decide, alumno solo consume" (§0), y el hecho de que hoy esto
sigue siendo 100% mock (`aulaMock.ts`) sin backend v2.1 implementado.

### 13.1 Secciones y navegación

`AulaShell.tsx` (`src/components/aula/AulaShell.tsx`) reemplaza a
`AulaMuro.tsx`. Navegación **interna** (no rutas nuevas de React Router):
un `useState<SectionId>` decide qué sección se renderiza, con el id
reflejado en `location.hash` (`#clases`, `#materiales`, …) vía
`history.replaceState` solo para permitir compartir un deep-link — no se
usa para el historial de navegación (no genera entradas nuevas, así que
el botón "atrás" del navegador no queda saturado de cambios de pestaña).

Presentación responsive:
- **Móvil (\<lg):** tabs horizontales scrollables (`overflow-x-auto`),
  ubicadas en el flujo normal ARRIBA del contenido — deliberadamente NO
  en la parte inferior de la pantalla, para no competir con
  `UniversityBottomNav` (la barra inferior fija de `/:universidad/*`, ver
  `src/components/nav/UniversityBottomNav.tsx`). El padding-bottom que
  `App.tsx` ya reserva para esa barra (`pb-[calc(4.5rem+...)]`) sigue
  siendo el único mecanismo de coexistencia necesario; `AulaShell` no
  añade padding propio.
- **Escritorio (≥lg):** barra lateral compacta y `sticky` (`lg:sticky
  lg:top-4`), ancho fijo de 13rem, con el contenido de la sección a la
  derecha.

| Sección (`SectionId`) | Ícono | Contenido | Componente |
|---|---|---|---|
| `inicio` | Home | Resumen: countdown a la próxima clase en vivo, último material, último anuncio, acceso rápido al grupo | `InicioResumen.tsx` |
| `clases` | Video | Sesiones Meet/Zoom del ciclo, tarjeta por sesión con estado EN VIVO/próxima/pasada/cancelada | `ClasesEnVivo.tsx` |
| `grabaciones` | Clapperboard | Grid de videos grabados, reproducción embebida al hacer clic | `Grabaciones.tsx` |
| `materiales` | BookMarked | Acordeón de PDFs/documentos por curso, visor embebido + "abrir en pestaña nueva" | `MaterialesCurso.tsx` (evolucionado) |
| `horario` | CalendarDays | Horario semanal completo | `HorarioSemanal.tsx` (sin cambios) |
| `anuncios` | Megaphone | Feed de anuncios del coordinador | `AnunciosCoordinador.tsx` (sin cambios) |
| `simulacros` | Trophy | Historial de simulacros rendidos en el ciclo | `MisSimulacrosCiclo.tsx` (sin cambios) |
| `pagos` | Wallet | Mi estado de cuenta | `EstadoPagos.tsx` (sin cambios) |
| `grupo` | Users | Grupo de WhatsApp del ciclo/turno | `MiGrupoWhatsapp.tsx` (sin cambios) |
| `recursos` | Compass | Enlaces externos curados por el coordinador, agrupados por categoría, visor embebido con fallback | `RecursosExternos.tsx` |

Cada sección arma **su propio bento** con `AulaSectionCard` (la celda
base, sin cambios de contrato) — el bento no desapareció, dejó de ser un
único grid de 9 celdas para ser el lenguaje visual repetido dentro de
cada pestaña. `inicio` y `clases` siguen usando un grid de varias celdas
(igual que antes); `pagos`/`grupo`/`anuncios`/`simulacros` (una sola
tarjeta) se centran con un `max-width` propio para no estirarse
edge-to-edge en pantallas anchas.

### 13.2 Hoja `clases_en_vivo` (CORE)

| Columna | Tipo | Notas |
|---|---|---|
| `id_clase` | texto | slug único |
| `id_ciclo` | texto | FK |
| `fecha` | fecha | `YYYY-MM-DD` |
| `hora_inicio` / `hora_fin` | `HH:mm` | |
| `curso` | texto | |
| `docente` | texto | idealmente calza con `docentes.nombre` |
| `plataforma` | texto | `meet`\|`zoom` |
| `enlace` | texto | URL de la videollamada |
| `estado` | texto | `programada`\|`cancelada` — **NO** es "en vivo ahora/próxima/pasada"; ese estado se deriva en el cliente comparando `fecha`+`hora_inicio`/`hora_fin` con el reloj del dispositivo (`getEstadoClaseEnVivo` en `aulaMock.ts`), porque pedirle al coordinador que edite Sheets al segundo exacto en que arranca cada clase no es realista. El coordinador solo escribe `cancelada` cuando de verdad suspende una sesión |

Una fila por sesión (a diferencia de `horario`, que es el bloque
recurrente semanal, `clases_en_vivo` son las instancias reales del ciclo —
en la práctica muchas academias generan estas filas por lote desde
`horario` al iniciar cada semana, pero eso es un detalle de operación del
coordinador, no algo que el frontend necesite saber).

### 13.3 Hoja `grabaciones` (CORE)

| Columna | Tipo | Notas |
|---|---|---|
| `id_grabacion` | texto | slug único |
| `id_ciclo` | texto | FK |
| `fecha` | fecha | fecha de la clase grabada (para ordenar, más reciente primero) |
| `curso` | texto | |
| `docente` | texto | |
| `titulo` | texto | ej. "Clase 8 — Razones y proporciones" |
| `url_video` | texto | YouTube o Google Drive — el frontend detecta cuál es por el patrón de la URL (`detectResourceKind` en `ResourceViewer.tsx`), no hace falta una columna aparte para el tipo |
| `duracion_min` | número | minutos, solo informativo (se muestra en la tarjeta) |

### 13.4 Hoja `recursos` (CORE)

| Columna | Tipo | Notas |
|---|---|---|
| `id_recurso` | texto | slug único |
| `id_ciclo` | texto | FK (un recurso puede aplicar a un ciclo específico o repetirse a mano en varios — no hay "recurso global" en fase 1, simplicidad ante flexibilidad) |
| `titulo` | texto | ej. "Simulador de tabla periódica" |
| `descripcion` | texto | 1-2 líneas, para qué sirve |
| `url` | texto | enlace externo (cualquier dominio) |
| `categoria` | texto | libre (ej. "Química", "Matemática", "General") — agrupa las tarjetas en `RecursosExternos.tsx` |

### 13.5 Política de embebido — qué se embebe, qué no, y por qué

Pieza central: `ResourceViewer.tsx` (`src/components/aula/ResourceViewer.tsx`),
un visor modal (`role="dialog"`, `aria-modal`, focus trap Tab/Shift+Tab,
Escape cierra, devuelve el foco al cerrar — mismo patrón que
`QuickSwitch.tsx`/`CoachTour.tsx`). Reescribe la URL "de humano" que pega
el coordinador a su variante embebible:

| Origen | Transformación | ¿Se puede embeber? |
|---|---|---|
| YouTube (`youtube.com`, `youtu.be`) | → `https://www.youtube-nocookie.com/embed/{id}` | **Sí** — diseñado por YouTube para vivir en un iframe de terceros |
| Google Drive (`drive.google.com`) | → `https://drive.google.com/file/d/{id}/preview` | **Sí, si el archivo es público** ("cualquiera con el enlace", ver §5.1) — si no, el propio Drive rechaza el iframe y se activa el fallback |
| Web genérica (hoja `recursos`) | Se usa la URL tal cual | **Depende del sitio** — muchos mandan `X-Frame-Options`/`frame-ancestors` que el navegador respeta bloqueando el iframe, sin que el frontend pueda evitarlo |
| **Meet / Zoom (`clases_en_vivo`)** | — (nunca pasa por ResourceViewer) | **No, nunca** — ambos proveedores rechazan embeber la videollamada en sí, por diseño de producto, no por una cabecera evitable. `ClasesEnVivo.tsx` es honesto con esto: el botón "Unirme" siempre abre en pestaña nueva; lo que sí vive 100% dentro de SimulaUNA es la tarjeta con toda la información de la sesión (curso, docente, horario, plataforma, estado) |

Detección de bloqueo (heurística, no perfecta — **limitación conocida y
documentada en el código**): al abrir el visor se dispara un timeout de
3 segundos; si el iframe no emitió su evento `load` en ese lapso, se
asume bloqueado y se muestra un fallback ("Este recurso no permite verse
embebido dentro de SimulaUNA" + botón "Abrir en pestaña nueva"). Esto es
honesto pero imperfecto: en algunos navegadores el evento `load` de un
iframe se dispara igual aunque el sitio remoto haya rechazado renderizarse
(la navegación "completó" a nivel de red, aunque el contenido visible sea
un rechazo) — no existe una API de plataforma que le diga con certeza al
padre "tu iframe fue bloqueado por X-Frame-Options". El botón "Abrir en
pestaña nueva" está SIEMPRE visible en el encabezado del visor (no solo
como fallback), así que el alumno nunca queda sin salida aunque la
detección falle en un caso límite.

### 13.6 Componentes nuevos/evolucionados (v2)

| Archivo | Rol |
|---|---|
| `AulaShell.tsx` | Shell de navegación (reemplaza `AulaMuro.tsx`, retirado) |
| `ResourceViewer.tsx` | Visor modal embebido reutilizable + helpers `detectResourceKind`/`toEmbedUrl`/`extractYoutubeThumb` |
| `InicioResumen.tsx` | Sección "Inicio" (reemplaza a la celda "Hoy en tu aula" de `HoyEnTuAula.tsx`, retirado) |
| `ClasesEnVivo.tsx` | Sección "Clases en vivo" |
| `Grabaciones.tsx` | Sección "Grabaciones" |
| `RecursosExternos.tsx` | Sección "Recursos" |
| `MaterialesCurso.tsx` | Evolucionado: el botón "Abrir" pasó a "Ver aquí" (abre `ResourceViewer`) + un botón secundario de icono para abrir en pestaña nueva |
| `HorarioSemanal.tsx`, `AnunciosCoordinador.tsx`, `EstadoPagos.tsx`, `MiGrupoWhatsapp.tsx`, `MisSimulacrosCiclo.tsx`, `AulaSectionCard.tsx` | Sin cambios de contrato — ahora se montan cada uno como el contenido único de su propia sección de `AulaShell` en vez de como celdas de `AulaMuro` |

`AulaComingSoon.tsx` monta `<AulaShell preview showWelcome={false} .../>`
en vez de `<AulaMuro preview .../>` — la vista previa ahora es navegable
entre las 10 secciones con datos de ejemplo (ribbon "Vista previa · datos
de ejemplo" siempre visible arriba, independiente de qué sección se esté
viendo), para que el alumno **sienta la plataforma completa**, no solo
una captura de pantalla del muro viejo.
