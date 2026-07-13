# CONTRATO API v2 — SimulaUNA Multi-Universidad

> **Documento congelado.** Backend (google-apps-script/) y frontend (src/) implementan EXACTAMENTE este contrato.
> Regla de oro: toda action legada SIN parámetro `universidad` responde idéntico a producción actual (default `una`, adaptador de hojas legadas). UNA Puno no se cae nunca.

## 1. Almacenamiento

**Script Properties:** `SECRET_TOKEN`, `SPREADSHEET_ID` (legado = spreadsheet UNA actual), `CORE_SPREADSHEET_ID` (nuevo).

**Spreadsheet CORE** (hojas):
- `universidades` (registro maestro): `codigo | nombre | nombre_corto | spreadsheet_id | estado | procesos | cepre_nombre | color_primario | color_secundario | logo | orden`
  - `codigo`: slug minúsculas (una, unsa, uni, unmsm, unt, unc, uncp). `estado` ∈ {activa, piloto, oculta}. `procesos`: CSV de {ORDINARIO, CEPRE, EXTRAORDINARIO}. `logo`: ruta relativa (`/logos/unsa.svg`).
  - Fila `una` apunta al `SPREADSHEET_ID` legado, con `layout=legacy` implícito (el adaptador se activa solo para `una`).
- `usuarios`: `fecha | dni | nombre | email | celular | universidades_interes` (CSV)
- `permisos`: `dni | universidad | modalidad | estado | fecha` — modalidad ∈ {simulacro, banqueo, banqueo_tema, cepre}
- `intentos`: `dni | universidad | proceso | fecha` — soporta "1er simulacro gratis POR universidad"
- `historial`: `dni | universidad | proceso | fecha | division | puntaje | puntaje_max | correctas | total | porcentaje`
- `cursos_canonicos`: `variante | canonico` (reemplaza la constante CURSOS_CANONICOS; el código la cachea 30 min)

**Spreadsheet por universidad** (layout nuevo, universidades ≠ una):
- `config_examen`: `proceso | division | division_tipo | curso | n_preguntas | puntos_correcta | puntos_incorrecta | peso | orden`
- `config_escala`: `proceso | motor | escala_total | umbral_excelente | umbral_bueno | umbral_regular | duracion_min | n_preguntas_total`
  - `motor` ∈ {suma_ponderada, vector_canal, decimas}. UNA = suma_ponderada/3000/2400/1800/1200/180/60 (vía adaptador desde sus hojas `Configuración_*`).
- `Banco_<CursoCanonico>`: las 16 columnas del formato excel + `ID_HASH | PROCESO | ANIO_PERIODO | DIVISION | SEMANA | ESTADO`
  - `ESTADO` ∈ {activa, pendiente_clave, pendiente_texto, excluida}. Solo `activa` con `Correct Answer` 1-5 se sirve en exámenes.
  - `Image Link` vacío = sin imagen (el literal "AÑADIR IMAGEN" nunca se persiste; se convierte a vacío + ESTADO no cambia, pero se registra en `backlog_imagenes`).
- `backlog_imagenes`: `id_hash | curso | source_file | detalle`

**UNA (layout legado, vía adaptador):** hojas actuales `Configuración_*`, `Banco_*` (18), `CEPRE_*`, `usuarios`, `confirmado`, `acceso_banqueo`, `historial_puntajes` — sin cambios físicos.

## 2. Autenticación y resolución de tenant

- Todo request lleva `token` (SECRET_TOKEN por querystring, igual que hoy).
- Parámetro `universidad`: se valida contra el registro maestro (lista blanca, estado ∈ {activa, piloto}). Inexistente → `{success:false, error:'Universidad no válida'}`.
- Ausente → default `'una'` (compatibilidad total).
- Resolución: `getTenant(codigo)` lee el registro (cacheado 30 min, clave `core:universidades`) y devuelve `{codigo, spreadsheetId, layout: 'legacy'|'v2', ...}`.
- **Cache namespaced SIEMPRE**: claves `<universidad>:<recurso>` (ej. `unsa:cursos_con_temas`, `una:temas_Algebra`). TTL 1800s.

## 3. Actions v2 (GET salvo indicado)

### Núcleo
| action | params | respuesta `data` |
|---|---|---|
| `getUniversidades` | — | `[{codigo, nombre, nombreCorto, estado, procesos[], cepreNombre, colores:{primario,secundario}, logo, orden}]` (excluye `oculta`) |
| `getConfig` | `universidad`, `proceso?` (default ORDINARIO) | `{universidad, proceso, divisiones:[{codigo, nombre, tipo, subjects:[{name, questionCount, pointsPerQuestion, weight, maxScore, orden}], totalQuestions, totalMaxScore}], escala:{motor, escalaTotal, umbrales:{excelente,bueno,regular}, duracionMin, nPreguntasTotal}}` |
| `test` | — | `{status:'ok', version:'v2', universidades:N}` |

### Examen (simulacro — calificación EN SERVIDOR)
| action | params | respuesta |
|---|---|---|
| `getExam` | `universidad, division, proceso?` (ORDINARIO\|CEPRE), `semana?` | `{examSessionId, universidad, division, proceso, escala, questions[]}` — **questions SIN `correctAnswer` ni `justification`**. Servidor guarda `{questionId→correctAnswer, points, subject}` en CacheService (clave `exam:<sessionId>`, TTL 6h) + fila espejo en hoja `sesiones` del CORE (respaldo si expira cache). |
| `submitExam` (**POST**, body JSON, content-type text/plain para evitar preflight CORS) | `{universidad, examSessionId, dni, answers:[{questionId, selectedOption}]}` | Resultado COMPLETO calificado por el motor config-driven: `{totalScore, maxScore, percentage, performanceLevel, subjectResults[], review:[{questionId, correctAnswer, selectedOption, isCorrect, justification}]}`. Persiste en `CORE.historial` (o `historial_puntajes` para una, doble escritura durante transición). |

Motores de puntuación (backend, módulo `Scoring`):
- `suma_ponderada`: puntos = Σ correctas × (maxScore/questionCount) por asignatura (caso UNA actual).
- `decimas`: puntos = Σ (correctas × puntos_correcta + incorrectas × puntos_incorrecta), escala del config (caso UNMSM).
- `vector_canal`: como decimas pero agrupado por `division_tipo=canal` con pesos por canal (caso UNI).
- performanceLevel se calcula contra `umbrales` del config — NUNCA contra constantes.

### Banqueo (práctica — claves SÍ viajan al cliente, feedback inmediato)
| action | params |
|---|---|
| `getBanqueoQuestions` | `universidad, curso, count` |
| `getCursosConTemas` | `universidad` |
| `getTemasPorCurso` | `universidad, curso` |
| `getSubtemasPorTema` | `universidad, curso, tema` |
| `getBanqueoByTema` | `universidad, curso, tema?, subtema?, count?` |
| `getCepreQuestions` | `universidad, curso, division?, semana?, count?` |
| `getSemanas` | `universidad, curso?, division?` |

Respuestas: mismas formas que hoy (questions[] con correctAnswer/justification) + campo `universidad`.

### Usuarios y acceso
| action | params | notas |
|---|---|---|
| `register` | `dni, fullName, email, phone, processType, area/division, career, universidad` | Escribe en `CORE.usuarios` (+ `usuarios` legado si universidad=una, doble escritura). `universidades_interes` acumula. Anti-fraude DNI↔email GLOBAL: mismo DNI con otro email (o viceversa) en CORE → rechazo con mensaje genérico "El usuario ya existe". |
| `checkAccess` | `dni, email, universidad` | 1er intento gratis POR universidad (consulta `CORE.intentos`); si ya tiene intento → requiere permiso (modalidad simulacro) en `CORE.permisos`. Para `una`: también acepta la hoja legada `confirmado` (doble lectura). Respuesta: forma actual `{canAccess, reason, attemptCount, isFirstAttempt, isConfirmed, isFraudAttempt}`. |
| `checkBanqueoAccess` | `dni, email, universidad, modalidad?` | Igual: `CORE.permisos` + fallback legado (`confirmado`/`acceso_banqueo`) para una. |
| `getHistory` | `dni, universidad?, proceso?` | Filtra por ambos si vienen. Une CORE.historial + legado de una. `history[]` gana `universidad` y `proceso`. |

### Legadas (compatibilidad — NO se rompen)
`config`, `questions`, `getCepreSimulacro`, `getCepreCourses`, `getCepreSemanas`, `saveScore`, más todas las de banqueo sin `universidad`: responden **byte-idéntico a hoy** ruteando a `una`. `saveScore` queda deprecado (el flujo nuevo usa `submitExam`) pero operativo mientras el frontend viejo viva.

## 4. Backend — estructura de módulos (google-apps-script/)

```
main.gs        doGet/doPost + router declarativo ROUTES + auth + errores centralizados
core.gs        getTenant, registro maestro, cache namespaced, cursos_canonicos
adapter_una.gs traducción layout legado ↔ contrato v2 (hojas Configuración_*/CEPRE_*/confirmado)
questions.gs   getExam, banqueo, temas/subtemas, cepre (layout v2 + delega en adapter para una)
scoring.gs     motores suma_ponderada | decimas | vector_canal + sesiones de examen
users.gs       register, checkAccess, checkBanqueoAccess, permisos, intentos, anti-fraude
history.gs     historial CORE + legado
setup.gs       setupCore() (crea CORE con hojas+headers y registra 'una'), seedPilotoUNSA() (crea SS demo de UNSA con config_examen/config_escala/2 bancos de ejemplo), healthCheck() (suite 0-FAIL ejecutable desde el editor que compara respuestas legadas)
```

Patrón router: `const ROUTES = { getConfig: {handler, params:['universidad'], required:[]}, ... }` — un lugar para validación de params, sin switch gigante.

## 5. Frontend — arquitectura (src/)

**Rutas** (React Router, TODAS lazy con `React.lazy` + `Suspense`):
```
/                                → Landing nacional (selector de universidad; carrusel clickable)
/:universidad                    → UniversityPage (hero + procesos disponibles + stats)
/:universidad/registro           → StudentForm (carreras/divisiones desde config)
/:universidad/confirmar|examen|resultados
/:universidad/banqueo            → motor de práctica, fuente banco
/:universidad/banqueo-tema       → motor de práctica, filtros tema/subtema
/:universidad/cepre              → simulacro CEPRE (semana opcional) — nombre visible = cepreNombre del registro
Redirects legados: /registro→/una/registro, /banqueo→/una/banqueo, /banqueo-cepreuna→/una/cepre,
/banqueo-tema→/una/banqueo-tema, /simulacro-cepreuna→/una/cepre, /examen→/una/examen, etc.
```

**Estado**: `useUniversityStore` (Zustand + persist): `{activa: string|null, registro: Universidad[] (de getUniversidades), setActiva}`. Guard de ruta: `:universidad` inválida → redirect `/`.

**Tipos** (src/types): `AreaType` desaparece como union literal → `division: string`; `Universidad`, `Escala`, `Division` nuevos; `PERFORMANCE_THRESHOLDS` y `AREA_INFO` dejan de ser constantes → vienen de `getConfig`. `ExamResult` gana `universidad`, `proceso`.

**Motor único**: `Quiz`/`Results` parametrizados por `{config, escala}` del contexto; los 4 componentes de banqueo (~5200 líneas duplicadas) convergen en `PracticeSession` parametrizado por `{universidad, fuente: 'banco'|'cepre', filtros}` — puede hacerse en dos pasos (primero parametrizar, luego consolidar) pero cero componentes nuevos por universidad.

**Results**: escala y niveles SIEMPRE desde `escala.umbrales` (eliminar los literales 2400/1800/1200 de Results.tsx y types).

**Simulacro**: flujo nuevo `getExam` → responder → `submitExam` → resultado del servidor (review incluida). Banqueo mantiene feedback local inmediato.

**Mock** (`VITE_USE_MOCK=true`): registro mock con `una` (config real 3000 pts) + `unsa` piloto (escala distinta, ej. 100 pts con motor decimas) para desarrollar y DEMOSTRAR el multi-tenant sin backend.

**AuthContext**: se conserva (TTL 30 min); la sesión guarda `dni, email, expiresAt` — clave localStorage pasa a `simulauna_auth_v2` con migración silenciosa de la clave vieja.

**basename**: sigue `/simulauna` (GitHub Pages).

## 6. Criterios de cierre del esqueleto

1. `npm run build` y `npm run lint` limpios.
2. Con mock: `/una/...` reproduce el flujo actual completo; `/unsa/...` (piloto) muestra config, divisiones y escala DISTINTAS sin ningún componente duplicado.
3. Rutas legadas redirigen a `/una/...`.
4. Backend: `healthCheck()` 0-FAIL (actions legadas responden igual que producción); `setupCore()` + `seedPilotoUNSA()` documentados en google-apps-script/README.
5. Agregar universidad nº 8 = spreadsheet + config + fila en registro. Documentado. Sin deploy.
