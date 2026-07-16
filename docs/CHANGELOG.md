# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
(versión simplificada), en español. Este proyecto sigue versionado
semántico (`MAYOR.MENOR.PARCHE`).

> El historial detallado de versiones **previas a la v2.0.0** (v1.0.0 a
> v1.6.0: simulacro inicial, historial de puntajes, Banqueo Histórico,
> control de acceso, CEPREUNA, Banqueo por Tema, auto-formateo de
> preguntas, rediseño "Editorial Andino") vive en la tabla
> [Versiones](../README.md#versiones) y en la sección
> [Rediseño Visual v1.6.0](../README.md#rediseño-visual-v160--editorial-andino-2026-04-20)
> del `README.md` principal — no se repite aquí para no duplicar
> documentación.

## [2.0.0] — 2026-07-16

Transformación de SimulaUNA de simulador exclusivo de UNA Puno a
**plataforma nacional multi-universidad**. El mismo frontend y el mismo
backend sirven ahora simulacros y banqueos para varias universidades del
Perú, cada una con su propia configuración de proceso, escala de
puntuación y colores institucionales — sin duplicar código.

### Añadido

- **Arquitectura multi-tenant end-to-end**: registro maestro de
  universidades (`getUniversidades`, spreadsheet `CORE`) como fuente de
  verdad de qué universidades están disponibles (`activa` | `piloto` |
  `oculta`), qué procesos ofrecen y sus colores de marca. Diseño
  documentado en [`FASE0_MODELO_MULTIUNIVERSIDAD.md`](FASE0_MODELO_MULTIUNIVERSIDAD.md)
  y contrato de endpoints/datos congelado en [`CONTRATO_API_V2.md`](CONTRATO_API_V2.md).
- **Backend reescrito en 8 módulos** de responsabilidad única
  (`main.gs`, `core.gs`, `adapter_una.gs`, `questions.gs`, `scoring.gs`,
  `users.gs`, `history.gs`, `setup.gs`), reemplazando el monolito
  `api.gs` de 2010 líneas (conservado como `api_legacy.gs.bak` de
  referencia). Guía de deploy y de cómo agregar una universidad nueva
  **sin tocar código** (spreadsheet + `config_examen`/`config_escala` +
  fila en el registro) en [`google-apps-script/README.md`](../google-apps-script/README.md).
- **Layout de preguntas v2** (`questions.gs`): hojas `Banco_<Curso>` con
  columnas `ID_HASH`/`PROCESO`/`ANIO_PERIODO`/`DIVISION`/`SEMANA`/`ESTADO`;
  solo se sirven preguntas activas y con clave válida.
- **Calificación en servidor** (`scoring.gs`): `getExam` entrega las
  preguntas del simulacro sin las claves correctas; `submitExam` (POST)
  califica en el servidor con motores config-driven por universidad
  (`suma_ponderada`, `decimas`, `vector_canal`); sesiones de examen en
  `CacheService` con hoja espejo de respaldo.
- **Cuenta única nacional** (`users.gs`): usuarios, permisos e intentos
  viven en `CORE` (no por universidad); anti-fraude DNI-email global;
  primer simulacro gratis evaluado **por universidad**.
- **Historial multi-universidad** (`history.gs`): cada intento se
  guarda con `universidad` + `proceso`.
- **`setup.gs`**: `setupCore()`, `seedPilotoUNSA()` (spreadsheet piloto
  de ejemplo con motor `decimas` y escala 0-100 distinta a la de UNA) y
  `healthCheck()`.
- **Rutas `/:universidad/*` en el frontend**, todas lazy:
  `/:universidad`, `/registro`, `/confirmar`, `/examen`, `/resultados`,
  `/banqueo`, `/banqueo-tema`, `/cepre`. Redirects permanentes de las
  rutas legadas sin prefijo hacia `/una/...`.
- **`UniversityPage.tsx`**: landing por universidad con gradiente y
  colores institucionales, logo y stats del banco de preguntas.
- **Store `useUniversity`** (Zustand + persist): registro de
  universidades activo y universidad seleccionada.
- **Carrusel de logos navegable** y sección "Universidades disponibles"
  en el Landing nacional.
- **Motor único `PracticeSession`** (`src/components/practice/`): máquina
  de estados `login → selección → quiz → resultados` parametrizada por
  modo (`banqueo`, `banqueo-tema`, `cepre`) vía `practiceModes.ts`.
- **Primer `eslint.config.js`** del repo (`npm run lint` nunca había
  funcionado antes).
- **`src/theme/universityThemes.ts`**: mapa investigado (manuales de
  marca, estatutos, heráldica oficial) de colores institucionales para
  13 universidades — UNSA guinda `#7B1B2C` + dorado `#F2C230`, UNI azul
  Pantone 661C `#003594`, UNMSM guinda `#8C1D40`, UNFV naranja `#E8792D`,
  UNC azul cielo, UNALM verde, UNSCH granate, etc. (UNAJ sin fuente
  verificable, queda neutral). CSS vars derivadas: `--uni-primary`,
  `--uni-primary-safe` (AA garantizado), `--uni-primary-soft`,
  `--uni-primary-deep`, `--uni-secondary`. El registro maestro tiene
  precedencia sobre este mapa local.
- **Puente `src/utils/universityTheme.ts`** (`resolveTheme`/`resolveThemeVars`).
- **12 logos universitarios locales** en `public/logos/` (antes CDN de
  Wikimedia Commons).
- **`src/utils/color.ts` (`ensureAccessible`)**: verificación automática
  de contraste WCAG AA, oscurece un color de marca si no alcanza 4.5:1.
- **Chunk lazy `src/components/results/ResultsCharts.tsx`** para
  Recharts, con skeleton mientras carga.

### Cambiado

- **Landing rediseñada para audiencia nacional**: badge "Plataforma
  nacional de simulacros de admisión", CTA primario "Elige tu
  universidad", flujos CEPREUNA reetiquetados como fila de atajos,
  feature "puntaje calculado como lo hace TU universidad", testimonios
  diversificados, footer de 4 columnas con disclaimer generalizado, y
  cierre con el juego de palabras de marca: *"Elige una universidad.
  Simula su examen real."* (SimulaUNA = simula UNA universidad —
  decisión de marca: el nombre se queda, resignificado). Dato-gancho
  real: 12 universidades mapeadas, 2 disponibles hoy.
- **Tipos genéricos**: `AreaType` deja de ser un union literal de 3
  áreas; la escala y los umbrales de desempeño llegan por
  configuración — se eliminaron los literales `3000`/`2400`/`1800`/`1200`
  hardcodeados en el código (siguen siendo, hoy, los valores reales de
  la configuración de UNA).
- **`AuthContext`**: clave de almacenamiento `simulauna_auth_v2`, con
  migración automática desde la clave anterior.
- **`StarTwinkle`** del hero del Landing reducidas de 8 a 4.
- **Colores institucionales aplicados** (con moderación) en: hero y
  tarjetas del Landing, `UniversityPage` (gradiente + logo + stats),
  `Quiz` (header, barra de progreso, navegador), `Results` (anillo de
  progreso, tabs, gráficos), `StudentForm` (floating inputs, stepper),
  `ExamConfirmation`, `PracticeSession` (feedback + racha de aciertos
  consecutivos con mejor racha mostrada en resultados).
- **Componentes de banqueo consolidados**: `Banqueo.tsx`,
  `BanqueoPorTema.tsx` y `BanqueoCepreuna.tsx` pasaron de ~3,850 líneas
  casi duplicadas a wrappers de 10-24 líneas sobre `PracticeSession`
  (−1,696 líneas, −44%).
- **Colores brand y extensión `.png`** normalizados en los registros
  seed de `setupCore()`/`seedPilotoUNSA()`.

### Corregido

- **`useMemo` condicional en `Results.tsx`** (violación de las reglas de
  hooks), detectado al introducir el primer linter del proyecto.
- **`healthCheck()` sin token**: enviaba peticiones sin `SECRET_TOKEN`,
  fallando 9/10 pruebas cuando el token estaba configurado — se agregó
  el helper `hcGet_` que lo inyecta.
- **`healthCheck()` excedía el límite de 6 minutos** de Apps Script: se
  partió en `healthCheck()` ligero (~1 min) + `healthCheckQuestions()` +
  `healthCheckCursosConTemas()` en ejecuciones separadas, cada una con
  medición de duración.
- **Regresión real en `getCursoCanonical`**: consultaba `CacheService` +
  `JSON.parse` **por fila** al recorrer 36 hojas (el código legado usaba
  una constante en memoria), haciendo que `getCursosConTemas` excediera
  el límite de 6 minutos. Se memoizó por ejecución (178.8s en frío,
  verificado PASS).

### Rendimiento

- **Code-splitting agresivo**: chunk de `Results` reducido de 825KB a
  43KB (−95%). Recharts (385KB) movido a chunk lazy propio, cargado solo
  al abrir las tabs Gráfico/Historial. `jspdf` + `jspdf-autotable`
  (397KB) movidos a `import()` dinámico dentro de `generatePDF`,
  descargados solo al pulsar "Descargar PDF".

### Estado de despliegue

El backend v2 fue verificado en producción: `action=test` responde
`version: "v2"`, `getUniversidades` lista `una` + `unsa` (piloto), y
todas las acciones legadas responden byte-idénticas a las de
producción anterior.

---

## [1.1.0] y anteriores

Historial pre-v2.0.0 (simulacro inicial, historial de puntajes, Banqueo
Histórico, control de acceso con detección de fraude, CEPREUNA,
Banqueo por Tema, auto-formateo de preguntas, rediseño "Editorial
Andino" v1.6.0): ver la tabla [Versiones](../README.md#versiones) y la
sección [Rediseño Visual v1.6.0](../README.md#rediseño-visual-v160--editorial-andino-2026-04-20)
en el `README.md` principal.
