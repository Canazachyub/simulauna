# FASE 0 — Modelo Multi-Universidad (SimulaUNA → Plataforma Nacional)

> Estado: **APROBADO CON RE-ALCANCE (2026-07-12)**: la Fase 1 (ETL) queda **diferida** — el usuario generará los excels por su cuenta; los 186 archivos auditados son un ejemplo del formato. El esquema canónico (§3) y el header de 16 columnas se mantienen como **contrato de datos** que esos excels deberán cumplir. El foco del proyecto es el **esqueleto robusto multi-tenant de backend y frontend** (Fases 2 y 3), con proyección a agregar universidades sin deploy de código.
> Fecha: 2026-07-12. Orquestador: Fable. Insumos: 4 auditorías (README/docs, api.gs, frontend, 186 excels).
> Contrato de API congelado en: `docs/CONTRATO_API_V2.md`.

---

## 0. Hechos verificados (base del diseño)

**Datos fuente (auditoría real, se abrieron los 186 archivos):**

| Universidad | Excels | Preguntas | Sin clave / sin texto | Imagen pendiente |
|---|---|---|---|---|
| UNSA | 18 | 1,020 | ~21 (documentado en REVISAR_CLAVES.txt) | 94 (9.2%) |
| UNI | 24 | 1,380 | 0 | 221 (16.0%) |
| UNMSM | 34 | 3,400 | ~340 (incl. `UNMSM.xlsx` 100% sin clave + 10 filas placeholder) | 632 (18.6%) |
| UNT | 27 | 2,700 | ~90 dispersos | 172 (6.4%) |
| UNC | 32 | 2,580 | ~90 (`UNC MODULO D.2024 1pdf.xlsx` completo) | 238 (9.2%) |
| UNCP | 51 | 2,600 | ~150 (3 archivos completos) + 50 sin texto | 1,171 (45.0%) |
| **Total** | **186** | **13,680** | — | **2,528 (18.5%)** |

- Header **100% idéntico** en los 186 archivos (16 columnas, hoja única "Preguntas"): `Question Text | Question Type | Option 1..5 | Correct Answer | Time in seconds | Image Link | JUSTIFICACION | NUMERO | CURSO | TEMA | SUBTEMA | NOMBRE DEL ARCHIVO`. Esto permite mapear por nombre de columna sin heurísticas.
- `Image Link` solo contiene vacío o el literal `"AÑADIR IMAGEN"` (0 URLs reales) → es una bandera binaria de backlog, no un dato.
- Archivos en cuarentena obligatoria (no cargar sin re-extracción): `UNMSM.xlsx`, `UNC MODULO D.2024 1pdf.xlsx`, `EX UNCP 2024 II area I T2.xlsx`, `EX UNCP 2025 II area II TI.xlsx`, `EX UNCP Area III 13B2 Z.xlsx` (100% sin clave), `EX UNCP 2024 II area IV T2.xlsx` (100% sin texto), 10 filas fabricadas de `EX UNMSM 2025 I area B.xlsx`.
- Duplicados probables por re-descarga de Drive en UNC/UNCP (sufijos aleatorios) → dedup por hash de contenido, no por nombre.
- LaTeX inline (`$...$`) en enunciados/opciones → preservar tal cual.

**Sistema actual (single-tenant UNA):**
- Backend: `api.gs` monolítico (2010 líneas), 17 actions en un `switch`, **un solo** `SPREADSHEET_ID` global, cache sin namespace, todo el currículo (áreas, 36 hojas, CURSOS_CANONICOS, semanas S1-S16) como constantes de código. El backend **no califica**: persiste el puntaje que envía el frontend.
- Frontend: 10 rutas sin lazy loading, `AreaType` = union type literal de 3 áreas, escala 3000 y umbrales 2400/1800/1200 hardcodeados (y duplicados en `Results.tsx`), 4 componentes de banqueo con ~1300 líneas duplicadas cada uno, carrusel de 12 logos decorativo.
- Diseño: Editorial Andino v1.6.0 (Fraunces + Plus Jakarta, brand UNA #003D7A), AA verificado, 8 pendientes documentados.

---

## 1. DECISIÓN — Particionado de datos

**Elegido: un spreadsheet por universidad + un spreadsheet CORE con registro maestro.**

```
┌─────────────────────────── SIMULAUNA_CORE (spreadsheet nuevo) ───────────────────────────┐
│ hoja `universidades` (registro maestro):                                                  │
│   codigo | nombre | spreadsheetId | estado(activa/piloto/oculta) | procesos | cepre_nombre│
│ hoja `usuarios`      (cuenta única nacional: DNI, nombre, email, celular, fecha)          │
│ hoja `permisos`      (DNI, universidad, modalidad, estado, fecha)                         │
│ hoja `intentos`      (DNI, universidad, proceso, fecha)  ← "1er simulacro gratis" por uni │
│ hoja `historial`     (DNI, universidad, proceso, fecha, área, puntaje, max, correctas...) │
└───────────────────────────────────────────────────────────────────────────────────────────┘
        │ resuelve en runtime (cache 30 min)
        ▼
┌─ SS_UNA (el actual, intacto) ─┐ ┌─ SS_UNSA ─┐ ┌─ SS_UNI ─┐ ┌─ SS_UNMSM ─┐ ... (uno por uni)
│ Banco_* (18) + CEPRE_* (~20)  │ │ config_examen        │
│ Configuración_* (3)           │ │ config_escala        │
│ usuarios/confirmado/historial │ │ Banco_<CursoCanónico> (con cols PROCESO/ANIO/AREA/SEMANA)
│ (legado, sigue en producción) │ │ backlog_imagenes     │
└───────────────────────────────┘ └──────────────────────┘
```

**Por qué así y no de otra forma:**
- *Alternativa A — todo en un spreadsheet con prefijos (`UNSA_Banco_...`)*: rechazada. No por límite de celdas (13,680×16 ≈ 219k celdas, lejos del límite de 10M), sino por latencia: `getCursosConTemas` ya recorre 36 hojas y con 7 universidades serían 150+ hojas por request. Además, una hoja corrupta o un import fallido afectaría a todas las universidades a la vez.
- *Alternativa B — un spreadsheet por universidad y proceso*: rechazada. Sobre-fragmenta (14+ archivos), multiplica `openById` (la operación más cara de Apps Script) y complica el registro maestro sin beneficio: el proceso se distingue bien con una columna.
- *Alternativa C — migrar a una BD real (Supabase/Firestore)*: es lo técnicamente superior a largo plazo, pero rompe la restricción de costo cero y obligaría a re-platformar backend y auth de golpe. Se difiere; el registro maestro deja la puerta abierta (si mañana `spreadsheetId` se cambia por una URL de API, el contrato no cambia).
- El spreadsheet de UNA actual **no se toca ni se migra en caliente**: se registra en el maestro con `codigo=una` y un adaptador de nombres de hoja (ver §5).
- **Agregar la universidad nº 8 = crear su spreadsheet + llenar `config_examen` + una fila en `universidades`. Cero deploy de código.** Este es el criterio de éxito que gobierna todo el diseño.

## 2. DECISIÓN — Configuración por universidad (`config_examen` + `config_escala`)

Cada spreadsheet de universidad lleva dos hojas de configuración que el motor lee (con cache):

**`config_examen`** — una fila por (proceso, división académica, curso):
```
proceso | division | division_tipo | curso_canonico | n_preguntas | puntos_correcta | puntos_incorrecta | peso | orden
GENERAL | Ingenierías | area | Aritmética | 4 | 10 | 0 | 5.201 | 1     ← caso UNA (el actual)
GENERAL | A           | area | Matemática | 8 | 20 | -1.125 | 1 | 1    ← caso UNMSM (décimas/penalidad)
GENERAL | MAT         | canal| Matemática | 40 | ... | ... | ... | 1   ← caso UNI (vector/canal)
```
- `division` generaliza "área": UNA usa Ingenierías/Sociales/Biomédicas, UNMSM usa A-E, UNI usa canales (MAT/FQ/AAH como vectores de examen), UNT A-D, UNC módulos A-E, UNCP áreas I-V. `division_tipo` ∈ {area, modulo, canal} solo etiqueta la semántica para UI.
- **`config_escala`** — parámetros del motor de puntuación: `motor` (`suma_ponderada` | `vector_canal` | `decimas`), `escala_total` (3000 UNA, 20 décimas UNMSM…), `umbrales` (JSON: excelente/bueno/regular), `duracion_min`, `n_preguntas_total`.
- **El cálculo actual de UNA (`maxScore/questionCount`, total 3000, umbrales 2400/1800/1200) pasa a ser la fila `motor=suma_ponderada` de su config — un caso, no la regla.** `PERFORMANCE_THRESHOLDS` del frontend muere; los umbrales llegan por API.
- El motor de puntuación se implementa **en backend** (Fase 2) y el frontend solo muestra: hoy el backend confía en el puntaje que el cliente le manda (hallazgo de auditoría — riesgo de integridad). La calificación config-driven en servidor corrige eso de paso. El frontend mantiene el cálculo local solo como preview inmediato.

## 3. DECISIÓN — Esquema canónico de pregunta

Contrato único (columna → significado). En hojas: `Banco_<CursoCanónico>` por universidad, con estas columnas = las 16 actuales + 5 nuevas:

```
id_hash        sha1(norm(questionText)+norm(options))  ← clave de dedup e idempotencia del ETL
universidad    implícita por spreadsheet (no se repite por fila)
proceso        ORDINARIO | CEPRE | EXTRAORDINARIO
anio_periodo   "2024-II" | null (bancos genéricos sin año)
division       área/módulo/canal de origen (según la universidad)
semana         S1..S16 | null (solo CEPRE)
curso          canónico (normalizado con CURSOS_CANONICOS extendido)
tema, subtema  normalizados; subtema opcional (vacío frecuente en UNI/UNMSM/UNT/UNCP)
questionText, option1..5, correctAnswer (1-5 | null), justificacion, sourceFile
imageLink      null si el excel dice "AÑADIR IMAGEN" (nunca el literal)
estado         activa | pendiente_clave | pendiente_texto | excluida
```
- **Regla dura: el examen solo sirve preguntas `estado=activa` con `correctAnswer` no nulo.** Las pendientes viven en el banco pero no rompen nada; `backlog_imagenes` y el reporte de calidad las exponen para trabajo manual.
- Para universidades nuevas, CEPRE es `proceso=CEPRE` + columna `semana` — **no** se replica el patrón de hojas `CEPRE_*` separadas de UNA (ese patrón queda como legado UNA vía adaptador).
- `CURSOS_CANONICOS` (hoy constante en api.gs) se extiende con los cursos de las 6 universidades nuevas y **migra a una hoja `cursos_canonicos` en CORE** para poder mapear valores nuevos sin deploy. El ETL reporta todo valor de CURSO/TEMA no mapeado (nunca inventa mapeos).

## 4. DECISIÓN — Usuarios y acceso (cuenta única nacional)

- **Cuenta única por DNI+email en `CORE.usuarios`**; el usuario se registra una vez y practica en cualquier universidad.
- La detección de fraude actual se mantiene y se vuelve global: DNI↔email es un binding nacional (mismo DNI con otro email = fraude, en cualquier universidad).
- `CORE.intentos` registra (DNI, universidad, proceso): **el primer simulacro gratis es por universidad**, igual que hoy lo es para UNA.
- `CORE.permisos` reemplaza a `confirmado`/`acceso_banqueo` con granularidad (DNI, universidad, modalidad ∈ {simulacro, banqueo, banqueo_tema, cepre}). La hoja `confirmado` de UNA se migra con un script one-shot y se mantiene doble-lectura (adaptador) durante la transición.
- `historial` gana columnas `universidad` + `proceso`; el gráfico de evolución filtra por ambos. El historial legado de UNA se lee vía adaptador (misma respuesta API).
- Registro gana `universidad_interes` multivalor. Sesión: el AuthContext actual (TTL 30 min, localStorage) se conserva; la clave `simulauna_auth` pasa a guardar también las universidades con permiso para no re-loguear entre modalidades.

## 5. DECISIÓN — Compatibilidad UNA (cero downtime)

- **Toda action existente sin parámetro `universidad` se comporta exactamente igual que hoy** (default `universidad=una`, spreadsheet actual, hojas actuales). El frontend en producción no nota el refactor de Fase 2.
- Un **adaptador UNA** traduce el layout legado (hojas `CEPRE_*` separadas, `Configuración_*`, `confirmado`) al contrato nuevo. UNA migra su frontend a `/una/...` recién en Fase 3, con redirects 1:1 de las rutas viejas.
- Validación por lista blanca: `universidad` debe existir en el registro maestro con `estado ∈ {activa, piloto}`; si no, error explícito.
- Cache namespaced: claves `{universidad}:{recurso}` (ej. `unsa:cursos_con_temas`) — el patrón de 30 min existente, sin colisiones entre tenants.

---

## 6. Tabla de brechas (actual → objetivo)

| # | Capa | Hoy | Objetivo | Fase |
|---|---|---|---|---|
| 1 | Datos | 1 spreadsheet UNA, hojas Banco_/CEPRE_ | CORE + 1 SS por universidad, registro maestro | 1 |
| 2 | Datos | 186 excels sin ingestar, 13,680 preguntas | Ingestados con reporte de calidad, 0 duplicados, cuarentena visible | 1 |
| 3 | Datos | CURSOS_CANONICOS constante en código | Hoja `cursos_canonicos` en CORE + reporte de no-mapeados | 1-2 |
| 4 | Backend | `SPREADSHEET_ID` global único | Resolución runtime por registro maestro + lista blanca | 2 |
| 5 | Backend | switch monolítico 2010 líneas | Módulos + router declarativo ROUTES (Núcleo/Preguntas/Usuarios/Historial/Banqueo) | 2 |
| 6 | Backend | Sin motor de puntuación (confía en el cliente) | Motor config-driven en servidor (`suma_ponderada`/`vector_canal`/`decimas`) | 2 |
| 7 | Backend | Cache sin namespace | Claves `{universidad}:{recurso}`, TTL 30 min | 2 |
| 8 | Backend | usuarios/confirmado/acceso_banqueo solo UNA | CORE: usuarios + permisos + intentos + historial con universidad/proceso | 2 |
| 9 | Frontend | 10 rutas planas sin lazy loading | `/:universidad/{simulacro,banqueo,banqueo-tema,cepre}` con lazy loading + redirects UNA | 3 |
| 10 | Frontend | `AreaType` union fijo, 3000/2400/1800/1200 hardcodeados (duplicados en Results) | Todo desde config por API; tipos genéricos `division: string` | 3 |
| 11 | Frontend | 4 componentes banqueo ~1300 líneas duplicadas | Un motor Quiz/Results/Banqueo parametrizado, cero duplicación por universidad | 3 |
| 12 | Frontend | Carrusel de 12 logos decorativo | Selector de universidad real (logo → navega), estado en Zustand + persistencia | 3 |
| 13 | Diseño | Brand UNA único | Tokens de acento por universidad (hero, chips, anillo de resultados); resto Editorial Andino neutral | 4 |
| 14 | Diseño | Logos desde Wikipedia CDN, 8 StarTwinkle | Logos locales en `public/logos/`, 4 StarTwinkle, AA sin regresión | 4 |

## 7. Plan de fases (aprobable)

| Fase | Entregable | Verificación de cierre |
|---|---|---|
| **1 — ETL** | Script Python idempotente (dedup por `id_hash`), reporte de calidad por archivo (válidas/rechazadas+motivo/sin clave/sin imagen), cuarentena de los 7 archivos problema, spreadsheets UNSA…UNCP poblados + CORE con registro maestro. Doc "cómo agregar la universidad nº 8". | Reporte con totales = 13,680 − cuarentena; segunda corrida = 0 inserciones; valores no mapeados listados, no inventados. |
| **2 — Backend multi-tenant** | api.gs modular con router ROUTES, resolución por registro, motor de puntuación config-driven, cache namespaced, CORE de usuarios/permisos/intentos/historial, adaptador UNA. | Test de salud 0-FAIL contra UNA (respuestas byte-idénticas a producción) + UNSA piloto; frontend actual sin cambios sigue funcionando. |
| **3 — Frontend** | Rutas `/:universidad/*` lazy, selector de universidad, motor Quiz/Results/Banqueo único parametrizado, redirects de rutas UNA. | UNA y UNSA operativas end-to-end; UNMSM puntúa como UNMSM desde config; build y lint limpios. |
| **4 — Diseño** | Tokens de acento por universidad, página de universidad (hero + procesos + stats del banco), landing nacional con contenido real, pendientes v1.6.0 (logos locales, 4 estrellas). | Lighthouse ≥90 móvil en ruta de universidad; AA verificado; `prefers-reduced-motion` sin regresión. |

Cada fase: compila, se prueba con UNA + UNSA (piloto), se documenta en README antes de continuar. Los excels se consolidan a `F:\PERU SINAPSIS` al cerrar Fase 1.

## 8. Riesgos señalados

1. **Calificación en cliente** (hoy): cualquier usuario puede enviar `saveScore` con puntaje arbitrario. Se corrige en Fase 2 con el motor en servidor.
2. **Cuotas de Apps Script**: 7 universidades comparten un solo deployment (6 min/ejecución, cuotas diarias de UrlFetch/lecturas). El registro maestro permite, si hiciera falta, un deployment GAS por universidad sin cambiar el frontend (la URL viviría en el registro).
3. **Pesos reales de UNMSM/UNI**: las reglas exactas (décimas, canales) deben validarse contra los prospectos oficiales antes de llenar `config_examen`. El diseño las soporta; los números requieren fuente oficial.
4. **DNI con ceros a la izquierda**: la comparación actual mezcla string/parseInt; en Fase 2 se normaliza a string siempre.
