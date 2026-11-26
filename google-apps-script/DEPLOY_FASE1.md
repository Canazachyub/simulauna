# Despliegue — Fase 1 de endurecimiento del backend

Guía paso a paso para copiar a mano los `.gs` al editor de Apps Script **sin cambiar la URL**
del despliegue (el frontend publicado sigue funcionando igual).

Tiempo estimado: 20–30 minutos. Hazlo en un horario de poco tráfico.

---

## 0. Antes de empezar (5 min)

1. Abre el proyecto en https://script.google.com.
2. **Respaldo**: en el editor, menú *Archivo* (o el ícono ⋮ de cada archivo) → copia el contenido
   actual de cada `.gs` a un documento aparte, o haz *Implementar → Administrar implementaciones*
   y anota el **número de versión** activo (sirve para volver atrás, ver §6).
3. **Verifica el token** (crítico): ⚙️ *Configuración del proyecto → Propiedades del script*.
   - Debe existir `SECRET_TOKEN` con el **mismo valor** que el secreto `VITE_API_TOKEN` del
     repositorio en GitHub (Settings → Secrets → Actions).
   - Desde esta fase, si `SECRET_TOKEN` **falta, está vacía o vale `CAMBIAR_ESTE_TOKEN_SECRETO`**,
     el backend **rechaza todo** salvo `action=test`. Antes, en ese caso, dejaba pasar todo.
   - Si no estás seguro de que coincida con GitHub, NO despliegues todavía: primero pon el mismo
     valor en ambos lados.

---

## 1. Reemplazar los archivos

En el editor de Apps Script, para cada archivo de la tabla: ábrelo, selecciona todo
(Ctrl+A), borra, y pega el contenido completo del archivo del repo
(`google-apps-script/<archivo>`). Guarda (Ctrl+S) al terminar cada uno.

| Archivo en el editor | Qué cambió (resumen) |
|---|---|
| `core.gs` | Helpers nuevos: flags, `safeCell_`, validación DNI/email, `withScriptLock_`, anti-estampida de cache, topes de cantidad, remapeo de opciones. |
| `main.gs` | Token falla cerrado, "Acción no válida" sin lista, errores genéricos, validación central, flags. |
| `scoring.gs` | Sesiones compactas, `submitExam` idempotente, sesión ligada a dni, máx. 12 h, purga. |
| `users.gs` | Anti-fraude falla cerrado, register bajo lock sin pisar email, titularidad dni↔email. |
| `history.gs` | Deduplicación del historial al leer. |
| `questions.gs` | Remapeo de la respuesta correcta, topes, anti-estampida. |
| `aula.gs` | Titularidad dni↔email en getAula/inscribirCiclo, lock en inscripción, anti-estampida. |
| `adapter_una.gs` | Register legado sin pisar email, celdas saneadas, topes, remapeo, mensaje de fraude genérico. |
| `setup.gs` | `healthCheckQuestions` usa `getExam`; nueva `healthCheckFase1`. |

- **No** copies `api_legacy.gs.bak` (no debe existir en el editor).
- No hay archivos nuevos ni borrados: son los mismos 9 `.gs` de siempre.
- Al pegar, revisa que no quede nada del contenido anterior al final del archivo.

---

## 2. Script Properties (flags)

⚙️ *Configuración del proyecto → Propiedades del script → Agregar propiedad*.

**Para este despliegue no hace falta crear ningún flag**: si un flag no existe se usa su default,
que preserva lo que el frontend publicado espera hoy. Recomendado crearlos igual, con su
default explícito, para que se vean y se puedan cambiar rápido:

| Propiedad | Valor ahora | Qué controla | Cuándo cambiarlo |
|---|---|---|---|
| `SECRET_TOKEN` | (ya existe, no tocar) | Token de todas las peticiones. Sin él se rechaza todo salvo `test`. | Nunca vacía. Si la rotas, rótala también en GitHub y redepliega el frontend. |
| `LEGACY_QUESTIONS_ENABLED` | `false` | Action legada `questions` (devolvía el examen con las respuestas correctas). Apagada responde "Acción no válida". | Solo `true` si aparece un cliente viejo que la necesite (el frontend actual no la usa). |
| `SAVE_SCORE_ENABLED` | `true` | Action legada `saveScore` (el puntaje lo manda el cliente; ahora con validación de rangos). | Ponla en `false` cuando el frontend publicado **deje de llamar `saveScore`** en `Results.tsx` (el puntaje ya lo guarda `submitExam`). |
| `ENFORCE_ACCESS_SERVER` | `false` | Si `true`: `getExam`, `getBanqueoQuestions`, `getBanqueoByTema`, `getCepreQuestions` y `getCepreSimulacro` exigen `dni`+`email` y validan en servidor el intento gratis / acceso al banqueo. | Solo cuando el frontend publicado **ya mande `dni` y `email`** en esas 5 llamadas. Si lo activas antes, el simulacro y la práctica dejan de cargar. |
| `REQUIRE_EMAIL_FOR_READS` | `false` | Si `true`: `getHistory` y `getMisPagos` exigen `email` y que coincida con el registrado para ese DNI (evita leer datos de otro DNI). | Solo cuando el frontend publicado **ya mande `email`** en `getHistory` y `getMisPagos`. |

Valores aceptados: `true` / `false` (también `1`/`0`, `si`/`no`). Un valor vacío o desconocido
usa el default.

---

## 3. Funciones a ejecutar en el editor (una sola vez)

En el editor, elige la función en el desplegable de arriba y presiona **Ejecutar**.
La primera vez Google pedirá autorizar permisos nuevos (*activadores* / triggers): acepta.

1. **`instalarTriggerPurga`** (archivo `scoring.gs`) — instala un activador diario (~3 a.m.)
   que borra de `CORE.sesiones` las sesiones de examen de más de 7 días. Se puede ejecutar
   varias veces: no duplica el activador.
2. **`purgarSesionesAntiguas`** (opcional, `scoring.gs`) — hace la primera limpieza ya mismo.
   Revisa el registro: dice cuántas filas borró.
3. **`healthCheckFase1`** (`setup.gs`) — rápida, no escribe datos. Debe terminar en `0-FAIL`.
   Al final imprime el estado de los flags y si el activador de purga quedó instalado.
4. **`healthCheck`** (`setup.gs`) — la suite ligera de siempre. Debe terminar en `0-FAIL`.
5. **`healthCheckQuestions`** (`setup.gs`) — ahora prueba `getExam` (pool completo) y que la
   action `questions` esté bloqueada. Debe terminar en `0-FAIL`. *Nota:* crea una sesión de
   examen de prueba en `CORE.sesiones` (se purga sola a los 7 días).
6. **`healthCheckCursosConTemas`** (`setup.gs`) — debe terminar en `0-FAIL`.
7. **`healthCheckAula`** (`setup.gs`, después de `seedAulaDemo()` si ya lo corriste antes) —
   debe terminar en `0-FAIL`.

Las pruebas 3–7 llaman a `doGet`/`doPost` directamente, así que validan el **código guardado**
aunque todavía no hayas creado la nueva versión del despliegue.

---

## 4. Nueva versión del despliegue (mantiene la URL)

**No** uses *Implementar → Nueva implementación* (eso crea otra URL y el frontend dejaría de
apuntar al backend correcto).

1. *Implementar → Administrar implementaciones*.
2. Selecciona la implementación **activa** (la de la URL que usa el frontend) → ícono de
   **lápiz** (Editar).
3. En *Versión*, elige **Nueva versión**. Descripción sugerida:
   `Fase 1 endurecimiento (token, idempotencia, locks, topes)`.
4. Deja igual *Ejecutar como* (**Yo**) y *Quién tiene acceso* (**Cualquier usuario**).
5. **Implementar**. La URL debe ser **exactamente la misma** que antes.

---

## 5. Verificación en producción (5 min)

Con la web publicada:

1. Abre la página de inicio: debe cargar el selector de universidades.
2. Haz un simulacro corto con un DNI de prueba y termínalo: debe mostrar el resultado y el
   historial (sin filas duplicadas del mismo examen).
3. Entra a Práctica (banqueo por curso, por tema y CEPRE): deben cargar las preguntas y el
   feedback inmediato (respuesta correcta) debe seguir funcionando.
4. Aula Virtual con un alumno matriculado: debe cargar.
5. En el editor, *Ejecuciones* (menú izquierdo): revisa que no haya errores nuevos. Los errores
   internos ahora se registran con `console.error` (el usuario solo ve un mensaje genérico).

---

## 6. Cómo volver atrás

*Implementar → Administrar implementaciones → Editar (lápiz) → Versión*: elige el número de
versión que anotaste en §0 → **Implementar**. La URL no cambia. (El código del editor queda con
la versión nueva; para editarlo de vuelta pega los archivos del respaldo.)

---

## 7. Qué cambia para alumnos y coordinadores

- **Aula Virtual — titularidad DNI↔correo**: `getAula` ya no deja entrar con cualquier correo a
  un DNI que no tiene correo registrado. Si un alumno **matriculado a mano** nunca se registró
  (su DNI no tiene correo en `CORE.usuarios` ni en la hoja legada `usuarios` de UNA), verá:
  *"Tu DNI todavía no tiene un correo vinculado. Escríbenos por WhatsApp…"*. Solución del
  coordinador: agregar una fila en `CORE.usuarios` con `dni` y `email` del alumno.
  `inscribirCiclo` vincula automáticamente el correo al DNI cuando el DNI no tenía uno.
- **Register**: ya no cambia el correo de un DNI existente. Si un alumno de verdad cambió de
  correo, el coordinador lo corrige a mano en `CORE.usuarios` (y en `usuarios` legado de UNA).
- **Mensaje de fraude genérico**: `checkAccess` (legado) ya no distingue "DNI con otro correo"
  de "correo con otro DNI" (evita enumerar cuentas). El frontend ya mostraba su propio texto.
- **Historial**: un mismo examen guardado por `submitExam` + `saveScore` se muestra una sola
  vez (se consideran el mismo si coinciden puntaje, correctas y total con menos de 10 min de
  diferencia).
- **Topes**: `getCepreQuestions` sin `count` (cuadernillo) devuelve como máximo 100 preguntas en
  orden; `getBanqueoByTema` sin `count` devuelve 20; ningún `count` pasa de 100.
- **Preguntas con la opción correcta vacía** se omiten (se registra en *Ejecuciones* con
  `[BANCO] Pregunta omitida…` para corregir la hoja). Si había opciones vacías antes de la
  correcta, el índice de la correcta ahora se remapea bien.
- **Mucha concurrencia**: si el servidor está ocupado más de 10–20 s, el alumno ve
  *"Hay mucha gente en este momento, intenta en unos segundos"*. Reintentar `submitExam` es
  seguro: devuelve el mismo resultado sin duplicar historial ni gastar otro intento.

---

## 8. Configuraciones a prueba de errores

Las hojas de puntaje (`Configuración_Ingenierías / _Sociales / _Biomédicas` de UNA y
`config_examen` / `config_escala` de las demás universidades) ahora se **validan celda por
celda** cada vez que se usan.

> **Regla de oro para quien edita:** si te equivocas al editar, el simulacro **sigue con la
> última configuración buena** hasta que lo corrijas. Nunca se califica con una configuración
> con errores. El problema queda escrito en la hoja `_validacion_config` del CORE.

### 8.1 Archivos a copiar al editor

| Archivo | Qué cambió |
|---|---|
| `config_guard.gs` (**NUEVO**: créalo con *Archivo → + → Secuencia de comandos*, nombre `config_guard`) | Validadores, "última configuración buena", reporte y herramientas del editor. |
| `adapter_una.gs` | `unaGetConfig`, `unaGetQuestions` y `unaGetCepreSimulacro` leen la config validada. |
| `questions.gs` | `getConfig` / `getExam` (v2) leen la config validada; nuevas columnas opcionales. |
| `scoring.gs` | Fórmula con blancos y `factor_escala`, motor `otro`, total con piso 0. |
| `config_carreras.gs` (**NUEVO**: créalo igual, nombre `config_carreras`) | Lee la hoja opcional `config_carreras` y llena el desplegable de carreras del registro (ver 8.6). |
| `piloto_ordinario.gs` (**NUEVO**) | Carga el ordinario de las 12 universidades en un paso y revisa qué falta para publicarlas (ver 8.7). |
| `piloto_datos.gs` (**NUEVO**, generado: no editar a mano) | Los datos de `docs/configuraciones/` que usa `piloto_ordinario.gs`. |

### 8.2 Funciones a ejecutar una vez (desplegable de funciones → **Ejecutar**)

1. **`validarConfiguraciones`** — revisa todas las universidades y guarda la primera
   "última configuración buena" de cada una. Hazlo **antes** de crear la nueva versión del
   despliegue. Mira el registro: debe decir `OK` para cada universidad. Si alguna dice
   `ERRORES`, corrígela antes de seguir (UNA nunca se cae: sin respaldo usa su configuración
   de fábrica, que está copiada en el código).
2. **`instalarValidacionDeDatos`** — pone en las hojas de configuración:
   - números permitidos (cantidades ≥ 0, puntos por correcta > 0, `puntos_incorrecta` ≤ 0,
     `puntos_blanco` entre -100 y 100, `factor_escala` > 0, umbrales ≥ 0, duración > 0);
   - listas desplegables para `motor` (suma_ponderada, decimas, vector_canal, otro),
     `division_tipo` (area, canal) y `proceso`;
   - un texto de ayuda en cada columna (aparece al seleccionar la celda) y una nota en el título;
   - protección **con advertencia** (no bloquea, solo avisa) sobre los títulos, la columna
     `PUNTAJE` y las filas `TOTAL` / `NOTA MÁXIMA` de UNA.
   No borra ni cambia datos. Se puede repetir sin duplicar nada.
3. **`instalarTriggerValidacion`** — instala:
   - un activador **cada hora** que ejecuta `validarConfiguraciones`;
   - un activador **"al editar"** en cada spreadsheet de configuración: al guardar un cambio en
     una hoja de configuración, la valida, actualiza el reporte y muestra un aviso abajo a la
     derecha de la hoja ("Configuración correcta" o "Hay N problema(s)…").
   El proyecto es **independiente** (no está ligado a una hoja), por eso se usan activadores
   instalables por spreadsheet. Google permite 20 activadores por proyecto: si hay más
   universidades, las que no entren se validan igual cada hora (el registro lo indica).
   La primera vez Google pedirá autorizar permisos nuevos: acéptalos.

### 8.3 Cómo leer la hoja `_validacion_config` (en el CORE)

Columnas: `universidad | hoja | fila | columna | problema | gravedad | fecha`.

- **OK (verde)**: esa universidad está bien y su configuración quedó guardada como "última buena".
- **ERROR (rojo)**: hay que corregirlo. La primera fila roja de cada universidad dice qué se
  está usando mientras tanto (la última configuración buena y desde qué fecha). Cada error
  señala la celda exacta, por ejemplo:
  *Hoja Configuración_Sociales, fila 7 (Química), columna PONDERACIÓN (celda E7): '5.4.06' no es un número.*
- **AVISO (amarillo)**: el sistema lo resolvió solo pero conviene revisarlo (por ejemplo,
  `PUNTAJE` con `#REF!`: se usa el valor calculado PREGUNTA BIEN CONTESTADA × PONDERACIÓN × CANTIDAD).

Qué se revisa: números escritos con coma o punto decimal (`5,201` y `5.201` valen lo mismo;
`20%`, `#REF!`, texto o fechas son error), títulos de columna (se aceptan sin tildes, con
mayúsculas o espacios de más), cursos repetidos, penalidades positivas, motor válido, umbrales
de menor a mayor, proceso exacto (nunca se usa la escala de otro proceso), y que la suma de
puntajes dé la nota máxima (3000 en UNA; `escala_total` en las demás).

### 8.4 Columnas opcionales nuevas (prospectos 2026)

Si la columna no existe, todo funciona como antes.

| Hoja | Columna | Valor | Ejemplo |
|---|---|---|---|
| `config_examen` | `puntos_blanco` | positivo o negativo, pero en valor absoluto menor que `puntos_correcta` (vacío = 0) | UNSAAC 1, UNAJ 0,5, UNP -0,10 |
| `config_examen` | `factor_escala` | > 0 (vacío = el de `config_escala`) | UNSCH 900/230 por división |
| `config_escala` | `factor_escala` | > 0 (vacío = 1) | UNSAAC 2,5 (400 × 2,5 = 1000) |
| `config_escala` | `minimo_aprobatorio` | texto o número, solo informativo | "Según vacantes" |

Fórmula por curso: `(correctas × puntos_correcta + incorrectas × puntos_incorrecta + blancos ×
puntos_blanco) × factor`. `suma_ponderada` no resta incorrectas. El motor `otro` se califica
como `decimas`. El puntaje total nunca baja de 0. Debe cumplirse `escala_total ≈ Σ n_preguntas
× puntos_correcta × factor` en cada división.

### 8.5 Verificación

- En la consola local: `node google-apps-script/tests/config_guard.test.js` → `OK: 60 pasados, 0 fallados`.
- En el editor: `validarConfiguraciones` → todo `OK`; luego `healthCheck` debe seguir en `0-FAIL`.
- Prueba de humo: cambia una ponderación de UNA a `abc`, espera el aviso de la hoja, abre
  `_validacion_config` (fila roja con la celda exacta) y comprueba que el simulacro sigue
  cargando. Vuelve a poner el valor correcto: el aviso dice "Configuración correcta".

### 8.6 Carreras del registro (hoja opcional `config_carreras`)

El paso 2 del registro ("Tu meta") muestra un **desplegable de carreras** cuando la
universidad tiene la hoja `config_carreras`; si no la tiene, pide la carrera como texto libre.
El desplegable siempre trae al final **"Mi carrera no está en la lista"**, que abre el campo de
texto: nadie queda trabado si falta una carrera.

1. En el spreadsheet de la universidad (también el de UNA) crea la hoja `config_carreras` e
   importa `docs/configuraciones/<uni>/config_carreras.csv` (*Archivo → Importar → Subir →
   Reemplazar la hoja actual*).
2. Columnas: `division | carrera | sede | activo | orden` (+ `fuente`, informativa).
   - `division`: el **mismo** nombre de área que en `config_examen` (en UNA: Ingenierías,
     Sociales, Biomédicas). Se compara sin tildes ni mayúsculas.
   - `sede`: vacío = sede central; si se llena, sale "Enfermería (Chilca)".
   - `activo`: `NO` la esconde sin borrarla. `orden`: vacío = alfabético.
3. Ejecuta `instalarValidacionDeDatos` otra vez: la columna `division` queda como lista
   desplegable con las áreas reales del examen.
4. Ejecuta `validarConfiguraciones`: en `_validacion_config` aparece como AVISO cuántas
   carreras se cargaron y cualquier fila saltada (división que no existe, carrera vacía,
   duplicada).

**Nunca afecta el puntaje:** una hoja de carreras mal escrita solo hace que esa fila (o la
lista entera) no aparezca; el simulacro, el examen y la calificación siguen igual. Los cambios
se ven en el registro al instante si se editó con el activador "al editar" instalado, o en
máximo 10 minutos (caché).

### 8.7 Piloto: examen ordinario de las 12 universidades (en un solo paso)

En vez de crear 12 spreadsheets e importar 36 CSV a mano, una función lo hace sola con los datos
investigados (`docs/configuraciones/`). **Requisito:** los archivos de 8.1 ya copiados (incluidos
`piloto_ordinario.gs` y `piloto_datos.gs`).

1. Ejecuta **`cargarPilotoOrdinario`**. Por cada universidad:
   - usa su spreadsheet si ya está en `CORE.universidades` (por ejemplo UNSA); si no, crea
     uno nuevo llamado `SimulaUNA - <SIGLA>` en tu Drive;
   - escribe `config_examen`, `config_escala` y `config_carreras`. Si la hoja ya tenía **otro**
     contenido, primero la copia como `<hoja>_respaldo_<fecha>`: no se pierde nada;
   - crea vacías (solo con títulos) las hojas `Banco_<curso>` que falten. **Las que ya existen
     no se tocan**;
   - registra la universidad en `CORE.universidades`. Las **nuevas quedan en `oculta`**: nadie
     las ve hasta que tú las publiques. En las que ya existían respeta estado, nombre, colores,
     logo y CEPRE;
   - en UNA solo agrega `config_carreras`; su puntaje sigue en las hojas `Configuración_*`.

   El registro dice `✓` por universidad con el enlace a su spreadsheet. Si dice
   **"⏸ Se pausó…"** (límite de 6 minutos de Google), vuelve a ejecutarla: sigue donde quedó.
   Se puede ejecutar todas las veces que quieras sin duplicar nada.
2. Ejecuta **`instalarValidacionDeDatos`** y luego **`validarConfiguraciones`** (8.2).
3. Llena los bancos (`Banco_<curso>`) de cada universidad con tus preguntas, igual que en UNSA.
   La columna `DIVISION` vacía sirve para todas las áreas; si la llenas, escribe el nombre de
   área **exacto** de `config_examen`.
4. Ejecuta **`revisarPilotoOrdinario`**: crea la hoja `_piloto_ordinario` en el CORE con una fila
   por universidad:
   - **LISTA: cambia estado a piloto** (verde): las preguntas alcanzan para un simulacro completo.
   - **FALTAN PREGUNTAS** (amarillo): la columna `detalle` dice qué banco y área, y cuántas
     tiene / cuántas necesita.
   - **⚠ PUBLICADA SIN PREGUNTAS SUFICIENTES** (rojo): ya es visible pero sus simulacros saldrían
     incompletos. Le pasará a UNSA mientras tenga solo los bancos de ejemplo de `seedPilotoUNSA`.
5. **Publicar:** en `CORE.universidades` cambia `estado` de `oculta` a `piloto` (sale con la
   etiqueta *Beta*) o `activa`. Para esconderla otra vez, vuelve a `oculta`. Se ve en la web en
   máximo 30 minutos (caché del registro).

En el registro, las universidades del piloto muestran **solo "Ordinario"** como proceso (ya
elegido). UNA sigue con CEPREUNA / GENERAL / EXTRAORDINARIO. Para agregar CEPRE a otra más
adelante: `CEPRE` en su columna `procesos` y el nombre en `cepre_nombre`.

**Si cambia un dato investigado:** edita el CSV en `docs/configuraciones/<uni>/` → 
`node docs/configuraciones/_herramientas/validar.mjs` → 
`node docs/configuraciones/_herramientas/gen_piloto_gs.mjs` → copia el nuevo `piloto_datos.gs` al
editor → vuelve a ejecutar `cargarPilotoOrdinario` (respalda y reemplaza solo lo que cambió). O
edita directamente la hoja en Sheets: el validador la revisa igual.
