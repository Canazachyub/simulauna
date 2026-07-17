# SimulaUNA — Backend Google Apps Script (multi-tenant)

Implementa exactamente [`docs/CONTRATO_API_V2.md`](../docs/CONTRATO_API_V2.md).
Regla de oro: toda acción legada llamada **sin** el parámetro `universidad`
responde byte-idéntico a la producción actual (UNA Puno). El frontend viejo
no debe notar el cambio.

## Estructura de archivos

```
main.gs         doGet/doPost + router declarativo ROUTES + auth + errores centralizados
core.gs         getTenant, registro maestro (CORE.universidades), cache namespaced, cursos_canonicos
adapter_una.gs  traducción layout legado UNA ↔ contrato v2 (Configuración_*/Banco_*/CEPRE_*/confirmado)
questions.gs    getExam (pool), banqueo, temas/subtemas, cepre — layout v2 + delega en adapter para 'una'
scoring.gs      motores suma_ponderada | decimas | vector_canal + sesiones de examen (getExam/submitExam)
users.gs        register, checkAccess, checkBanqueoAccess, permisos, intentos, anti-fraude
history.gs      getHistory (CORE + legado), saveScore (legado, deprecado)
aula.gs         Aula Virtual v2.1: getCiclos, inscribirCiclo, getAula, getMisPagos (ver docs/CONTRATO_AULA_V21.md)
setup.gs        setupCore(), seedPilotoUNSA(), seedAulaDemo(), healthCheck(), healthCheckAula()
api_legacy.gs.bak  código original de producción, dejado como referencia histórica (NO se carga:
                   la extensión .bak evita que Apps Script lo interprete como código del proyecto)
```

Todos los `.gs` de un proyecto Apps Script comparten un único scope global
(no hay `import`/`require`). Los `const` de nivel superior de cada archivo
**nunca** dependen de constantes definidas en otro archivo — solo se
referencian entre sí dentro de cuerpos de función, que se ejecutan en
tiempo de petición, cuando todos los archivos ya cargaron. Esto evita
errores de "usado antes de su definición" sin importar el orden en que el
editor de Apps Script liste los archivos.

## 1. Deploy paso a paso

1. Crea un proyecto nuevo en [script.google.com](https://script.google.com).
2. Copia **todos** los archivos `.gs` de esta carpeta al proyecto (un
   archivo de código por cada `.gs`; el nombre del archivo en el editor no
   importa, pero usa el mismo nombre para no perderte). **No copies**
   `api_legacy.gs.bak` (o si lo copias, no le cambies la extensión a
   `.gs` — quedaría duplicando funciones ya definidas en `adapter_una.gs`
   y rompería el proyecto por colisión de identificadores). Si ya tenías
   un proyecto desplegado y solo agregas el Aula Virtual, el único archivo
   **nuevo** es `aula.gs` — copia también las versiones actualizadas de
   `main.gs` y `setup.gs` (ganan las rutas y las funciones de `seedAulaDemo`/
   `healthCheckAula`), el resto de archivos no cambia.
3. Configura las **Script Properties** (⚙️ Configuración del proyecto →
   Propiedades del script):

   | Propiedad | Valor |
   |---|---|
   | `SPREADSHEET_ID` | ID del spreadsheet legado de UNA Puno (el de siempre) |
   | `SECRET_TOKEN` | Un token secreto propio. Mientras quede en el valor default `CAMBIAR_ESTE_TOKEN_SECRETO`, la validación de token se **desactiva** (bypass), útil solo para desarrollo. |
   | `CORE_SPREADSHEET_ID` | Se completa solo al correr `setupCore()` (ver abajo) — no la crees a mano. |

4. Abre el archivo `setup.gs` en el editor, selecciona la función
   `setupCore` en el desplegable de funciones y presiona **Ejecutar**.
   - Crea el spreadsheet `SimulaUNA - CORE` con todas las hojas del
     contrato (`universidades`, `usuarios`, `permisos`, `intentos`,
     `historial`, `cursos_canonicos`, `sesiones`), registra la fila `una`
     apuntando al `SPREADSHEET_ID` legado, y guarda su ID en
     `CORE_SPREADSHEET_ID` (Script Properties) automáticamente.
   - Revisa **Ver → Registros de ejecución** para confirmar el ID y la
     URL del nuevo spreadsheet.
   - Es seguro volver a ejecutarla: si `CORE_SPREADSHEET_ID` ya apunta a
     un spreadsheet válido, lo reutiliza en vez de crear uno nuevo.
5. (Opcional, para probar el multi-tenant) Ejecuta `seedPilotoUNSA()`
   desde el mismo editor. Crea un spreadsheet de ejemplo para UNSA con
   divisiones reales (BIO/ING/SOC), motor `decimas` con una escala 0-100
   (distinta a la de UNA), y 2 bancos de preguntas dummy (Aritmética y
   Razonamiento Verbal, 5 preguntas cada uno, `ESTADO=activa`). Registra
   `unsa` en `CORE.universidades` con `estado=piloto`.
6. (Opcional, para probar el Aula Virtual) Ejecuta `seedAulaDemo()` desde
   el mismo editor — ver la sección **"Aula Virtual (v2.1)"** más abajo
   para el detalle completo de qué crea.
7. Ejecuta `healthCheck()` (ver sección 4) para confirmar que las
   acciones legadas siguen respondiendo con la forma esperada. Si corriste
   `seedAulaDemo()`, ejecuta también `healthCheckAula()`.
8. Implementar como aplicación web:
   - Extensiones → Apps Script → Implementar → Nueva implementación.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
9. Copia la URL generada y configúrala en el frontend (`VITE_API_URL` /
   equivalente) junto con `VITE_API_TOKEN` = el mismo `SECRET_TOKEN`.

Cada vez que cambies el código de los `.gs`, tienes que crear una **nueva
implementación** (o gestionar una implementación de "Cabeza" `@HEAD`) para
que los cambios tomen efecto en la URL pública.

## 2. Cómo agregar la universidad número 8 (sin tocar código)

El contrato está diseñado para que sumar una universidad nueva sea 100%
datos, cero deploys de código:

1. Crea un Google Spreadsheet nuevo para la universidad (o duplica el de
   UNSA creado por `seedPilotoUNSA()` como plantilla y bórrale los datos
   dummy).
2. En ese spreadsheet crea las hojas:
   - `config_examen` con columnas `proceso | division | division_tipo |
     curso | n_preguntas | puntos_correcta | puntos_incorrecta | peso |
     orden` — una fila por (proceso, división, curso).
   - `config_escala` con columnas `proceso | motor | escala_total |
     umbral_excelente | umbral_bueno | umbral_regular | duracion_min |
     n_preguntas_total` — una fila por proceso. `motor` ∈
     {`suma_ponderada`, `decimas`, `vector_canal`}.
   - Una hoja `Banco_<CursoCanonico>` por cada curso referenciado en
     `config_examen` (el nombre debe calzar con `curso` tal como lo
     resuelve `getCursoCanonical`, ver `CORE.cursos_canonicos`), con las
     16 columnas del formato excel + `ID_HASH | PROCESO | ANIO_PERIODO |
     DIVISION | SEMANA | ESTADO`. Solo se sirven preguntas con
     `ESTADO=activa` y `Correct Answer` entre 1 y 5.
   - (Opcional) `backlog_imagenes` con `id_hash | curso | source_file |
     detalle` para llevar registro de preguntas sin imagen pendiente.
3. En el spreadsheet **CORE** (el que generó `setupCore()`), agrega una
   fila nueva en la hoja `universidades`:
   `codigo | nombre | nombre_corto | spreadsheet_id | estado | procesos |
   cepre_nombre | color_primario | color_secundario | logo | orden`.
   - `codigo`: slug en minúsculas (p.ej. `uni`, `unmsm`).
   - `estado`: `activa` o `piloto` para que aparezca en `getUniversidades`
     (`oculta` la mantiene invisible mientras se termina de cargar datos).
   - `spreadsheet_id`: el ID del spreadsheet creado en el paso 1.
4. Espera hasta 30 minutos (TTL del cache `core:universidades`) o corre
   manualmente `CacheService.getScriptCache().remove('core:universidades')`
   desde el editor para que el cambio se vea de inmediato.
5. Listo. El frontend la descubre sola vía `getUniversidades` y todas las
   acciones v2 (`getConfig`, `getExam`, `submitExam`, banqueo, etc.)
   funcionan automáticamente contra las hojas nuevas. **Cero cambios de
   código, cero nuevo deploy.**

## 3. Script Properties — resumen

| Propiedad | Requerida | Descripción |
|---|---|---|
| `SPREADSHEET_ID` | Sí | Spreadsheet legado de UNA Puno (layout `legacy`) |
| `SECRET_TOKEN` | Recomendada | Token de autenticación. Bypass si queda en el valor default |
| `CORE_SPREADSHEET_ID` | Se autogenera con `setupCore()` | Spreadsheet CORE multi-tenant |

## 4. Cómo correr `healthCheck()`

1. Abre `setup.gs` en el editor de Apps Script.
2. Selecciona `healthCheck` en el desplegable de funciones → **Ejecutar**.
3. Revisa **Ver → Registros de ejecución**: imprime `PASS`/`FAIL` por cada
   caso (llama a los handlers legados vía `doGet` — `config`, `questions`
   con `area=Ingenierías`, `getCepreCourses`, `getCursosConTemas`,
   `checkAccess` con un DNI de prueba, etc. — y valida la *forma* de la
   respuesta) y termina con un resumen `N/N PASS, 0-FAIL`.
4. Un `FAIL` casi siempre significa que falta una hoja o columna esperada
   en el spreadsheet de UNA (revisa el mensaje de error impreso) — no
   debería fallar por un problema del router en sí.

`healthCheck()` **no** escribe datos de prueba en las hojas reales de
producción (usa únicamente acciones de lectura), así que es seguro
correrla contra el spreadsheet real de UNA en cualquier momento.

## 5. Aula Virtual (v2.1)

Implementa `docs/CONTRATO_AULA_V21.md` (4 actions nuevas: `getCiclos`,
`inscribirCiclo`, `getAula`, `getMisPagos`) sobre 11 hojas nuevas, todas en
el spreadsheet **CORE** (ninguna hoja nueva por universidad): `ciclos`,
`matriculas`, `pagos`, `horario`, `docentes`, `materiales`,
`grupos_whatsapp`, `anuncios`, `clases_en_vivo`, `grabaciones`, `recursos`.
`setupCore()` ya las crea (idempotente, igual que el resto). El código vive
en `aula.gs`; `main.gs` solo registra las 4 rutas nuevas en `ROUTES`.

### 5.1 Qué gestiona el coordinador desde Sheets, y cómo

Todo el día a día del Aula se opera editando filas del spreadsheet **CORE**
a mano — ningún flujo requiere tocar código ni volver a desplegar:

- **Agregar un ciclo nuevo**: fila nueva en `ciclos` con
  `estado=inscripciones_abiertas`. Cuando arranca, cambiar a `en_curso`; al
  terminar, `cerrado`. Es el único campo que se toca manualmente conforme
  avanza el calendario (no hay automatización de fechas en esta fase).
- **Matricular a un alumno tras verificar su pago**: el alumno se
  preinscribe solo (action `inscribirCiclo`, crea la fila en `matriculas`
  con `estado=preinscrito`). El coordinador, al confirmar el voucher por
  WhatsApp, cambia esa fila a `estado=matriculado` a mano — ese cambio es
  lo que le da acceso real al Aula (ver precedencia con `permisos.modalidad
  ='aula'` en `docs/CONTRATO_AULA_V21.md` §3, para dar acceso manual sin
  pasar por matrícula/pago si hace falta). Para retirar a alguien,
  `estado=retirado`.
- **Registrar un pago**: fila nueva en `pagos` (`concepto` es texto libre,
  ej. `matricula`, `mensualidad_1`, `mensualidad_2`...). `estado=pendiente`
  mientras se revisa, `verificado` cuando se confirma el voucher,
  `rechazado` si el comprobante no es válido. El alumno ve su resumen vía
  `getMisPagos`/`getAula` — solo lo suyo, nunca el detalle de otros.
- **Publicar un material**: fila nueva en `materiales` con
  `estado=publicado` (mismo patrón que `Banco_<Curso>.ESTADO=activa` del
  contrato v2: subir el archivo a Drive no lo hace visible, solo la fila
  con `estado=publicado` lo publica — da control de calidad antes de que
  el alumno lo vea). `destacado=si` lo resalta como "material nuevo".
- **Publicar un anuncio**: fila nueva en `anuncios`; queda visible salvo
  que se ponga `estado=oculto`. `fijado=si` lo ancla arriba del feed.
- **Programar una clase en vivo**: fila nueva en `clases_en_vivo` con
  `estado=programada`. El coordinador solo cambia a `cancelada` cuando de
  verdad suspende la sesión — el estado "en vivo ahora/próxima/pasada" que
  ve el alumno se calcula en el frontend comparando `fecha`+`hora_inicio`
  con el reloj del dispositivo, no hace falta editarlo en tiempo real.
- **Publicar una grabación o un recurso externo**: fila nueva en
  `grabaciones`/`recursos` — la sola presencia de la fila las publica (no
  tienen columna `estado`, no hay flujo de "borrador" para ellas).
- **Horario semanal**, **docentes** y **grupo de WhatsApp del
  ciclo/turno**: una fila por bloque/docente/grupo en `horario`/
  `docentes`/`grupos_whatsapp` — sin gating de publicación, la presencia
  de la fila ya las muestra.

### 5.2 Cómo correr `seedAulaDemo()` y `healthCheckAula()`

1. Corre `setupCore()` primero si no lo hiciste (crea las 11 hojas).
2. Abre `setup.gs`, selecciona `seedAulaDemo` en el desplegable de
   funciones → **Ejecutar**. Crea, todo para `universidad=una`:
   - 1 ciclo demo (`una-demo-2026-1`, `estado=inscripciones_abiertas`).
   - 2 docentes, horario de una semana (5 bloques), 2 clases en vivo
     futuras (`+1` y `+2` días desde hoy), 2 grabaciones (URLs de YouTube
     de ejemplo), 3 materiales (`estado=publicado`), 1 anuncio fijado,
     1 grupo de WhatsApp, 1 recurso externo.
   - Un alumno demo matriculado (DNI `87654321`, ver `AULA_DEMO_DNI_` en
     `setup.gs`) con 2 pagos (matrícula verificada + mensualidad 1
     pendiente), para poder probar `getAula`/`getMisPagos` con acceso real
     de punta a punta.
   - Es idempotente por lote: si el ciclo demo ya tiene filas en una hoja,
     no las vuelve a insertar en corridas repetidas.
3. Revisa **Ver → Registros de ejecución** para confirmar el DNI/ciclo
   demo (se imprimen al final).
4. Ejecuta `healthCheckAula` (mismo desplegable) → **Ejecutar**. Corre 5
   casos: forma de `getCiclos`, `getAula` sin matrícula
   (`matriculado:false`), `inscribirCiclo` llamado dos veces seguidas para
   confirmar que la segunda detecta el duplicado (`yaExistia:true`, sin
   crear una fila nueva), `getAula` con el DNI demo matriculado (verifica
   `ciclo`/`horario`/`clasesEnVivo`/`grabaciones`/`materiales`/`pagos`), y
   `getMisPagos` del DNI demo. Si no corriste `seedAulaDemo()` antes, los
   últimos 2 casos fallan con un mensaje explícito pidiéndolo.
5. `healthCheckAula()` **sí** escribe una fila de prueba en `matriculas`
   (la inscripción dummy del caso de idempotencia, DNI `11111111`) — a
   diferencia de `healthCheck()`, no es de solo lectura. Es seguro
   volver a correrla: la segunda vez detecta la fila existente y no
   duplica nada.

### 5.3 Orden de deploy para agregar el Aula Virtual a un proyecto ya desplegado

1. Copia `aula.gs` (archivo nuevo) al proyecto de Apps Script.
2. Reemplaza el contenido de `main.gs` y `setup.gs` por las versiones
   actualizadas de esta carpeta (ganan las 4 rutas nuevas en `ROUTES` y las
   funciones `seedAulaDemo`/`healthCheckAula`). El resto de archivos
   (`core.gs`, `adapter_una.gs`, `questions.gs`, `scoring.gs`, `users.gs`,
   `history.gs`) no cambia.
3. Corre `setupCore()` de nuevo — es idempotente, solo agrega las 11
   hojas nuevas si faltan, no toca las hojas existentes del contrato v2.
4. (Opcional) Corre `seedAulaDemo()` + `healthCheckAula()` (ver §5.2).
5. Extensiones → Apps Script → Implementar → **Nueva implementación**
   (o gestionar `@HEAD` si usas esa implementación) — **misma URL**, no
   hace falta reconfigurar `VITE_API_URL` en el frontend.

## 6. Notas de compatibilidad

- Todas las acciones **legadas** (`config`, `questions`, `register`,
  `saveScore`, `getHistory`, `checkAccess`, `checkBanqueoAccess`,
  `getBanqueoQuestions`, `getCepreQuestions`, `getCepreSimulacro`,
  `getCepreCourses`, `getCepreSemanas`, `getCursosConTemas`,
  `getTemasPorCurso`, `getSubtemasPorTema`, `getBanqueoByTema`) siguen
  registradas en `ROUTES` (`main.gs`) y, cuando se llaman **sin**
  `universidad` en la querystring, delegan directo en las funciones
  `una*` de `adapter_una.gs` — la forma de la respuesta es la misma que
  en `api_legacy.gs.bak`.
- Cuando esas mismas acciones (salvo `config`/`questions`/
  `getCepreSimulacro`/`getCepreCourses`/`getCepreSemanas`, que son
  siempre legadas y siempre resuelven a `una`) se llaman **con**
  `universidad=<codigo>`, usan el camino v2 (`CORE` + hojas de layout
  nuevo) y la respuesta gana los campos nuevos del contrato (p.ej.
  `universidad`).
- `getExam`/`submitExam`/`getConfig`/`getUniversidades`/`getSemanas`/
  `test` son acciones **nuevas** (v2), sin equivalente legado directo.
  `submitExam` es **POST** con body JSON (`content-type: text/plain` en
  el cliente para evitar el preflight CORS que Apps Script no soporta).
- `saveScore` sigue operativa pero **deprecada**: solo escribe en la hoja
  legada `historial_puntajes` de UNA (el flujo nuevo debe usar
  `getExam` + `submitExam`, que califican en el servidor).

## Decisiones tomadas fuera del contrato (documentadas)

- **`test`**: el contrato define dos formas distintas para la misma
  acción (`{status,message,timestamp}` en `api_legacy.gs.bak`, y
  `{status,version,universidades}` en la tabla "Núcleo" de la §3). Como
  la tabla v2 la define sin condicionarla a la presencia de `universidad`
  y es un endpoint de diagnóstico sin consumidores que dependan de su
  forma exacta, `test` devuelve **siempre** la forma v2 nueva.
- **`getCepreSemanas` vs `getSemanas`**: el contrato lista `getCepreSemanas`
  solo en la sección "Legadas" (siempre resuelve a `una`, ignora
  `universidad`) y define `getSemanas` como su reemplazo v2 (nombre
  distinto). Se implementaron como dos acciones separadas en `ROUTES`,
  no como una sola acción dual-mode.
- **`checkAccess`/`checkBanqueoAccess`/`getHistory`/banqueo-family**: se
  interpretó "sin `universidad`" de forma literal — la presencia de la
  querystring `universidad` (no vacía) es lo que activa el modo v2. Si
  algún día el frontend legado empieza a mandar `universidad=una`
  explícitamente, empezará a recibir la forma v2 (con campos extra) en
  vez de la legada — no debería romper nada porque son campos
  adicionales, pero es un cambio de comportamiento a tener en cuenta.
- **`intentos` (1er simulacro gratis)**: el contrato no especifica en qué
  momento se "consume" un intento. Se decidió registrarlo en
  `submitExam` (al completar el examen), no en `checkAccess` ni en
  `getExam`, para que refrescar la página o abandonar el examen a medias
  no queme el intento gratuito.
- **`config_examen.puntos_correcta`**: se usa como `pointsPerQuestion`
  también para el motor `suma_ponderada` en tenants v2 (no solo
  `maxScore/questionCount` como hacía el adaptador legado de UNA). Quien
  configure una universidad nueva con motor `suma_ponderada` debe poner
  `puntos_correcta = escala_total_de_la_división / n_preguntas_de_la_división`
  para que el máximo cuadre.

## Riesgos y TODOs pendientes

- `checkGlobalFraud_` y el resto de lecturas de `CORE.usuarios`/
  `permisos`/`intentos` hacen `getDataRange().getValues()` completo en
  cada llamada (sin cache) — aceptable para el volumen actual, pero si
  `CORE.usuarios` crece mucho conviene indexarlo o cachearlo con TTL
  corto.
- `recoverExamSession_` recorre `CORE.sesiones` de atrás hacia adelante
  cuando el cache expiró (>6h) — la hoja crecerá indefinidamente; conviene
  un job periódico que archive o borre sesiones viejas.
- El motor `vector_canal` está implementado con la misma fórmula que
  `decimas` (suma ponderada por canal usando `puntos_correcta`/
  `puntos_incorrecta` de `config_examen`), ya que el contrato no detalla
  una fórmula distinta más allá de "agrupado por `division_tipo=canal`
  con pesos por canal". Si UNI necesita una agregación de canales más
  específica (p.ej. máximo entre canales en vez de suma), hay que
  extender `scoreBySubject_` en `scoring.gs`.
- No hay todavía un endpoint/función para administrar `CORE.permisos`
  (dar acceso a banqueo/simulacro extra) — hoy se espera edición manual
  de la hoja, igual que hoy se edita `confirmado` a mano para UNA.
- Validación exhaustiva realizada con un harness Node.js que mockea
  `SpreadsheetApp`/`PropertiesService`/`CacheService` (16 escenarios
  end-to-end: setup, healthCheck, flujo legado completo con detección de
  fraude, `getExam`/`submitExam` para `una` y para un piloto con motor
  `decimas`). **No se ejecutó contra un proyecto real de Apps Script ni
  contra Google Sheets real** — se recomienda correr `healthCheck()`
  manualmente después de copiar los archivos, contra el spreadsheet real
  de UNA, antes de reemplazar la implementación en producción.
- `aula.gs` (Aula Virtual v2.1) se validó solo con `node --check` (sintaxis
  individual y concatenada, sin colisión de identificadores globales) —
  igual que el resto, **no se ejecutó contra Apps Script/Sheets real**.
  Corre `seedAulaDemo()` + `healthCheckAula()` (ver §5.2) contra un
  spreadsheet CORE real antes de dar por probado el flujo completo.
- `getMisPagos`/`getAula.pagos` calculan `estadoGeneral` sin fecha de
  vencimiento (la hoja `pagos` no tiene esa columna, ver
  `docs/CONTRATO_AULA_V21.md` §4 "getMisPagos") — un `rechazado` se trata
  como la señal más fuerte de "vencido"; si se necesita un vencido real
  por fecha, hay que agregar una columna `fecha_vencimiento` a `pagos` (o
  derivarla de `ciclos.n_mensualidades` + `fecha_inicio`) y extender
  `getPagosDni_` en `aula.gs`.
- `getAulaCicloAgregado_` cachea 30 min por `aula:<universidad>:<cicloId>`;
  si el coordinador publica un material/anuncio/clase y quiere que se vea
  de inmediato en vez de esperar el TTL, puede borrar esa clave a mano
  desde el editor: `CacheService.getScriptCache().remove('aula:una:<id_ciclo>')`
  (mismo mecanismo que ya documenta la sección 2 para `core:universidades`).
