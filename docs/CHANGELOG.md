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

## [2.1.0] — 2026-07-17

Rediseño premium del Landing y la navegación (Dirección de Diseño v3),
identidad visual propia con mascota (el lobito estudioso, generada con
Codex `image_gen`), y el **Aula Virtual real** (contrato v2.1): backend
desplegado en producción con ciclo demo verificado, frontend cableado al
API real con degradación elegante. Dos pasadas de auditoría crítica
(13+6 hallazgos) corrigieron accesibilidad, contraste y bugs de consola.

### Añadido

- **Rediseño premium del Landing** (Dirección de Diseño v3,
  [`docs/DIRECCION_DISENO_V3.md`](DIRECCION_DISENO_V3.md)): navbar sticky
  con scrollspy y barra de progreso de scroll, hero con carrusel de la
  mascota, cohete ligado al scroll, patrones `.btn-glow` (CTAs pill con
  glow del propio color), `.shadow-tinted` (sombras tintadas de marca,
  nunca negro puro), `.display-tight` (titulares Fraunces ajustados) y
  `SectionCurve` (divisores SVG curvos entre secciones). Bento grids
  asimétricos mobile-first (patrón del usuario) y tipografía fluida con
  `clamp()`.
- **Identidad visual propia — el lobito estudioso**
  (`src/components/pages/Mascot.tsx`, `public/illustrations/`): mascota
  generada con el CLI de Codex (`image_gen`, skill `codex-imagenes` a
  nivel usuario) en **9 poses** — astronauta, celebra, ánimo, profesor,
  saludo, perdido, pensando, corazón, estudiando — con transparencia real
  verificada por chroma key. Set completo en WebP optimizado (~20MB →
  ~1.5MB): 5 fondos de universo, 3 bodegones ilustrados por área
  (ingenierías/biomédicas/sociales), 3 avatares de estudiante y una
  ilustración de aula. Reemplaza el 100% de las fotos de Unsplash y los
  avatares de `pravatar.cc` en las secciones de alto impacto — cero
  imágenes genéricas de stock.
- **Copy alineado a los 3 pilares** (clases · simulacros · bancos de
  exámenes históricos de cada universidad), reescrito para audiencia
  nacional (ya no UNA-céntrico).
- **Navegación premium para estudiantes**: `QuickSwitch` (`Ctrl+K`,
  `src/components/nav/QuickSwitch.tsx`) para saltar entre universidades y
  secciones, `RouteTransition` (`src/components/nav/RouteTransition.tsx`)
  para transiciones entre rutas, `UniversityBottomNav` (barra inferior
  fija en móvil dentro de `/:universidad/*`).
- **Onboarding**: `CoachTour` (`src/components/onboarding/CoachTour.tsx`)
  con tours guiados de primera vez para simulacro y banqueo, más
  reacciones del lobito en el feedback del banqueo con racha de aciertos
  consecutivos.
- **Páginas clásicas nuevas**: 404 real (`NotFound.tsx`), `/nosotros`
  (`Nosotros.tsx`), `/preguntas-frecuentes` (`FAQ.tsx`) y `/terminos`
  (`Terminos.tsx`), todas con `PageHeader` y la mascota.
- **Aula Virtual real (v2.1) — backend desplegado en producción**:
  contrato congelado en [`docs/CONTRATO_AULA_V21.md`](CONTRATO_AULA_V21.md)
  con 4 actions nuevas (`getCiclos`, `inscribirCiclo`, `getAula`,
  `getMisPagos`) sobre **11 hojas nuevas** en el spreadsheet CORE
  (`ciclos`, `matriculas`, `pagos`, `horario`, `docentes`, `materiales`,
  `grupos_whatsapp`, `anuncios`, `clases_en_vivo`, `grabaciones`,
  `recursos`), implementadas en `google-apps-script/aula.gs`.
  `setupCore()` las crea de forma idempotente. `seedAulaDemo()` sembró un
  ciclo demo completo para `una` (docentes, horario, clases en vivo,
  grabaciones, materiales, anuncio, grupo de WhatsApp, alumno demo
  matriculado con pagos) y `healthCheckAula()` corrió **5/5 casos PASS**
  contra ese ciclo demo en producción — ver
  [`google-apps-script/README.md`](../google-apps-script/README.md) §5.
- **`AulaShell` — frontend del Aula cableado al API real**
  (`src/components/aula/AulaShell.tsx`): plataforma con navegación entre
  **10 secciones** (Inicio, Clases en vivo, Grabaciones, Materiales,
  Horario, Anuncios, Simulacros, Pagos, Grupo, Recursos), reemplazando el
  diseño de "muro único" (`AulaMuro`, retirado) tras feedback explícito
  del usuario. `ResourceViewer.tsx`: visor modal embebido para
  YouTube/Drive/enlaces externos con detección de bloqueo por iframe y
  fallback a "Abrir en pestaña nueva" siempre visible. Flujo real de
  matrícula: estudiante preinscrito → reporta pago por WhatsApp →
  coordinador verifica el voucher y lo pasa a `matriculado` → acceso
  completo al Aula. `AulaComingSoon` ahora muestra una vista previa
  navegable de las 10 secciones con datos de ejemplo en vez de una
  captura estática, con degradación elegante si el API no responde.
- **Diseño integral documentado**: `docs/AULA_VIRTUAL_DISENO.md` — modelo
  de datos completo, filosofía "coordinador decide, alumno solo consume",
  política de embebido de recursos externos y arquitectura de navegación
  v2.

### Cambiado

- **`Landing.tsx`**: ilustraciones 3D propias en las tarjetas de áreas
  (reemplazando SVGs genéricos), logos de universidades siempre nítidos y
  a color, con `resolveLogoUrl` y `fetchPriority` para el LCP del hero.
- **`package.json`**: versión `2.0.0` → `2.1.0`.

### Corregido

- **Primera pasada de auditoría crítica** (6 hallazgos críticos/altos,
  commit `09667ab`): stacking/z-index de los logos de universidades sobre
  la franja del carrusel, mojibake en textos con tildes, contraste
  insuficiente en varios componentes, barras fijas mal posicionadas en
  móvil.
- **Segunda pasada de auditoría crítica** (5 hallazgos, "fix pack final",
  commit `659d5eb`): a11y de modales (focus trap, `aria-modal`, Escape),
  container queries en tarjetas de estadísticas.
- **Consola limpia** (commit `cf357c8`): logos que devolvían 404 al
  resolver mal la ruta, warning de `fetchPriority` como prop de React en
  vez de atributo DOM, y adopción explícita de los *future flags* de
  React Router v7 (`v7_startTransition`, `v7_relativeSplatPath`) para
  eliminar los warnings de deprecación en consola.
- El lobito del CTA del Landing ya no tapa el contenido en pantallas
  angostas (commit `058e8c2`).

### Estado de despliegue

**Backend v2 + Aula Virtual v2.1 ya están en producción**: `action=test`
sigue respondiendo `version: "v2"`, y las 4 actions nuevas del Aula
(`getCiclos`, `inscribirCiclo`, `getAula`, `getMisPagos`) están
desplegadas y verificadas contra un ciclo demo real (`healthCheckAula()`
5/5 PASS). El acceso de estudiantes al Aula se habilita universidad por
universidad al abrir un ciclo real en la hoja `ciclos` — hoy solo existe
el ciclo demo de `una`. El frontend de esta versión (rediseño de Landing,
mascota, páginas nuevas y `AulaShell`) se publica a GitHub Pages con este
release.

---

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
