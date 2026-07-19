# SimulaUNA - Plataforma Nacional de Simulacros de Examen de Admisión

Plataforma web **multi-universidad** para realizar simulacros de examen de admisión de universidades públicas del Perú. Nació como el simulador exclusivo de la **Universidad Nacional del Altiplano (UNA) Puno** — que sigue siendo la universidad fundadora y la de mayor cobertura de contenido — y desde la v2.0.0 es una plataforma nacional: el mismo frontend y el mismo backend sirven simulacros y banqueos para varias universidades, cada una con su propio proceso de admisión, escala de puntuación y colores institucionales. Los estudiantes eligen su universidad, practican con preguntas reales organizadas por curso/área y reciben retroalimentación detallada calificada exactamente como lo hace su universidad.

> **Changelog:** el historial detallado de cambios por versión está en [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Arquitectura multi-universidad (v2)

SimulaUNA nació como una plataforma de una sola universidad (UNA Puno) y evolucionó a una **plataforma multi-tenant**: el mismo frontend y el mismo backend (Google Apps Script) sirven simulacros y banqueos para varias universidades del Perú, cada una con su propia configuración de escala, procesos disponibles y colores de marca — sin duplicar código.

- **Qué es**: un registro maestro de universidades (`getUniversidades`) es la fuente de verdad de qué universidades están disponibles, en qué estado (`activa` | `piloto` | `oculta`), qué procesos ofrecen (`ORDINARIO`, `CEPRE`, `EXTRAORDINARIO`) y sus colores de marca. El frontend consume ese registro para renderizar rutas, chips de universidad y acentos de color; el backend resuelve cada request por el código de universidad (tenant) contra sus propias hojas de Google Sheets.
- **Cómo se agrega una universidad nueva**: sin tocar código de React. Ver la guía paso a paso en [`google-apps-script/README.md` § "Cómo agregar la universidad número 8"](google-apps-script/README.md) y el contrato completo de endpoints/datos en [`docs/CONTRATO_API_V2.md`](docs/CONTRATO_API_V2.md) (§5 detalla la arquitectura de frontend: rutas, store `useUniversity`, acentos de color).
- **Rutas nuevas `/:universidad/*`**: cada universidad tiene su propio espacio de rutas — `/:universidad` (landing de universidad), `/:universidad/registro`, `/:universidad/confirmar`, `/:universidad/examen`, `/:universidad/resultados`, `/:universidad/banqueo`, `/:universidad/banqueo-tema`, `/:universidad/cepre`. Las rutas legadas sin prefijo (`/registro`, `/examen`, `/resultados`, etc.) siguen funcionando y redirigen a `/una/...` para no romper enlaces existentes (ver `src/App.tsx`).
- **Acentos de marca por universidad**: `UniversityPage.tsx` expone `--uni-primary`/`--uni-secondary` como CSS vars derivadas del registro y las aplica con moderación — solo en el hero de la página de universidad, los chips/tarjetas de proceso y el anillo de progreso de resultados (`Results.tsx`). Todo lo demás permanece en la paleta neutral "Editorial Andino". Los colores se verifican contra WCAG AA con `src/utils/color.ts` (`ensureAccessible`), que oscurece automáticamente un color de marca si no alcanza 4.5:1 de contraste. Ver la sección [Sistema de Temas Institucionales](#sistema-de-temas-institucionales-v2) para el mapa completo de colores investigados por universidad.
- **Backend en 8 módulos**: `google-apps-script/api.gs` (2010 líneas monolíticas) fue reemplazado por 8 archivos con responsabilidad única — `main.gs`, `core.gs`, `adapter_una.gs`, `questions.gs`, `scoring.gs`, `users.gs`, `history.gs`, `setup.gs` — ver detalle en [Configuración del Backend](#configuración-del-backend-google-sheets--apps-script) y en [`google-apps-script/README.md`](google-apps-script/README.md). El código original queda como `api_legacy.gs.bak` (no se despliega) a modo de referencia histórica.
- **Calificación en servidor**: `getExam` entrega las preguntas del simulacro **sin** las claves correctas; `submitExam` (POST) recibe las respuestas del alumno y califica del lado del servidor con un motor config-driven por universidad (`suma_ponderada`, `decimas` o `vector_canal`, definido en la hoja `config_escala` de cada tenant). Ya no existe un puntaje máximo fijo de 3000 puntos en el código — la escala, los umbrales de desempeño y el motor de cálculo llegan por configuración. Detalle en [Sistema de Puntuación](#sistema-de-puntuación).
- **Estado desplegado**: el backend v2 ya está desplegado en producción y verificado (`action=test` responde `version: "v2"`, `getUniversidades` lista `una` + `unsa` piloto, y las acciones legadas responden byte-idénticas a antes).

## Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuración del Backend (Google Sheets + Apps Script)](#configuración-del-backend-google-sheets--apps-script)
- [Configuración del Frontend](#configuración-del-frontend)
- [Áreas y Asignaturas](#áreas-y-asignaturas)
- [Flujo de la Aplicación](#flujo-de-la-aplicación)
- [Sistema de Puntuación](#sistema-de-puntuación)
- [Sistema de Usuarios y Historial](#sistema-de-usuarios-y-historial)
- [Sistema de Control de Acceso](#sistema-de-control-de-acceso-nuevo)
- [Banqueo Histórico](#banqueo-histórico-nuevo)
- [Justificación de Respuestas](#justificación-de-respuestas-nuevo)
- [Despliegue](#despliegue)
- [Desarrollo Local](#desarrollo-local)
- [Solución de Problemas Comunes](#solución-de-problemas-comunes)
- [Flujo Detallado de Control de Acceso](#flujo-detallado-de-control-de-acceso)
- [Configuración de Despliegue](#configuración-de-despliegue)
- [CEPREUNA - Simulacros por Semana](#cepreuna---simulacros-por-semana-nuevo)
- [Banqueo por Tema](#banqueo-por-tema-nuevo)
- [Auto-Formateo de Preguntas](#auto-formateo-de-preguntas-nuevo)
- [Aula Virtual (v2.1)](#aula-virtual-v21)
- [Identidad Visual y Mascota](#identidad-visual-y-mascota)
- [Sistema de Temas Institucionales (v2)](#sistema-de-temas-institucionales-v2)
- [Rendimiento y Code-Splitting](#rendimiento-y-code-splitting)
- [Versiones](#versiones)
- [Pendientes Reales](#pendientes-reales)

---

## Características

> Las cifras de esta sección (60 preguntas, 3 áreas, 18 asignaturas, escala de 3000 pts) describen la configuración de **UNA Puno**, la universidad fundadora y con más contenido. Desde la v2.0.0 estos valores **no están hardcodeados**: cada universidad define su propio número de preguntas, divisiones/áreas, cursos y escala de puntuación vía `config_examen`/`config_escala` (ver [Sistema de Puntuación](#sistema-de-puntuación) y [`docs/CONTRATO_API_V2.md`](docs/CONTRATO_API_V2.md)).

### Examen
- **60 preguntas** por simulacro organizadas por asignatura
- **3 áreas académicas**: Ingenierías, Sociales, Biomédicas
- **18 asignaturas** con preguntas ponderadas según el área
- **Cronómetro global** que cuenta el tiempo total del examen (estilo Google Forms)
- **Navegación libre** entre preguntas (avanzar/retroceder)
- **Sin feedback inmediato** - el estudiante no sabe si respondió bien hasta calificar
- **Soporte para imágenes** en las preguntas (mediante links)
- **Indicador de fuente** - muestra de qué examen se extrajo cada pregunta ("Tomado en: Examen_2024.pdf")
- **Botón de WhatsApp** para reportar errores en preguntas
- **Soporte de formato HTML** en preguntas: `<b>`, `<i>`, `<u>`, `<mark>`, `<br>`, `<sub>`, `<sup>`

### Registro de Usuario
- **Datos personales**: DNI (8 dígitos), Nombre completo, Email, Celular
- **Tipo de proceso**: CEPREUNA, GENERAL, EXTRAORDINARIO
- **Área académica**: Ingenierías, Biomédicas, Sociales
- **Carrera profesional**: Lista filtrada por área (40+ carreras)
- **Sin duplicados**: Si el DNI ya existe, solo actualiza datos si cambiaron

### Resultados
- **Puntaje total** con desglose por asignatura
- **Gráfico de barras** de rendimiento por materia (Recharts)
- **Navegador visual de preguntas** (verde=correcta, rojo=incorrecta)
- **Revisión detallada** de cada pregunta con la respuesta correcta
- **Nivel de desempeño**: Excelente, Bueno, Regular, Necesita práctica
- **Generación de PDF** con el reporte completo (jsPDF)
- **Estadísticas**: tiempo total, promedio por pregunta, correctas/incorrectas

### Historial de Puntajes (NUEVO)
- **Tracking por DNI**: Cada intento se guarda automáticamente
- **Stats cards**: Total simulacros, Mejor puntaje, vs Anterior
- **Gráfico de línea**: Evolución de puntajes a lo largo del tiempo
- **Tabla de historial**: Fecha, Área, Correctas, Puntaje de cada intento
- **Indicador de mejor puntaje**: Trofeo en el puntaje más alto

### Banqueo por Tema (NUEVO)
- **Estudio enfocado** por curso y tema específico
- **Selección flexible** de cantidad de preguntas: 10, 25, 50 o 100
- **Normalización automática** de nombres de cursos (evita duplicados)
- **Cache optimizado** para carga rápida (CacheService 30 min)
- **Filtrado inteligente** de valores inválidos en la base de datos

### Técnicas
- **Modo mock** para desarrollo sin backend
- **Preguntas aleatorias** seleccionadas del banco de cada asignatura
- **Orden por asignatura** según tabla de configuración (no aleatorio)
- **Responsive design** para móviles y desktop
- **Colores Google** en opciones de respuesta (A=azul, B=rosa, C=ámbar, D=verde, E=púrpura)

---

## Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.6.2 | Tipado estático |
| Vite | 5.4.10 | Build tool |
| Tailwind CSS | 3.4.14 | Estilos |
| Zustand | 5.0.1 | Estado global |
| React Router | 6.28.0 | Navegación |
| Recharts | 2.13.3 | Gráficos (BarChart, LineChart) |
| jsPDF | 2.5.2 | Generación PDF |
| Lucide React | 0.460.0 | Iconos |
| clsx | 2.1.1 | Clases condicionales |

### Backend
| Tecnología | Uso |
|------------|-----|
| Google Sheets | Base de datos (preguntas, usuarios, historial) |
| Google Apps Script | API REST (doGet) |

---

## Arquitectura

```
┌─────────────────┐   GET/POST   ┌──────────────────────────────┐
│                 │◄────────────►│   Google Apps Script (8 .gs)  │
│   React App     │     JSON     │   main.gs → router ROUTES     │
│   (Frontend)    │              │   core.gs → registro tenants  │
│                 │              └──────────────┬────────────────┘
└─────────────────┘                             │
                                                 ▼
                      ┌──────────────────────────────────────────┐
                      │           Google Sheets (por tenant)       │
                      │                                            │
                      │  CORE (registro de universidades,          │
                      │        usuarios/permisos/intentos          │
                      │        globales, cursos_canonicos)         │
                      │                                            │
                      │  Por universidad: spreadsheet propio con   │
                      │  config_examen / config_escala /           │
                      │  Banco_<Curso> (o layout legado UNA:        │
                      │  Configuración_* / Banco_* / CEPRE_*)      │
                      └──────────────────────────────────────────┘
```

Cada universidad es un *tenant*: su propio spreadsheet de preguntas y
configuración, resuelto por el backend a partir del código de
universidad (`codigo`) en el registro maestro `CORE.universidades`. UNA
Puno usa un adaptador de compatibilidad (`adapter_una.gs`) que traduce su
layout de hojas legado 1:1 al contrato v2, sin necesidad de migrar datos.

### Endpoints de la API

El backend está organizado en 8 módulos de responsabilidad única bajo
`google-apps-script/` — ver el detalle de cada uno en
[Configuración del Backend](#configuración-del-backend-google-sheets--apps-script)
y la guía completa de deploy/agregar universidades en
[`google-apps-script/README.md`](google-apps-script/README.md). El
contrato formal de endpoints y payloads está congelado en
[`docs/CONTRATO_API_V2.md`](docs/CONTRATO_API_V2.md); el cliente HTTP del
frontend vive en `src/services/api.ts`.

---

## Estructura del Proyecto

```
simulauna/
├── src/
│   ├── components/                # Componentes React
│   │   ├── Landing.tsx            # Landing nacional (multi-universidad)
│   │   ├── UniversityPage.tsx     # Landing por universidad (/:universidad)
│   │   ├── StudentForm.tsx        # Formulario 2 pasos (datos + área/carrera)
│   │   ├── AreaSelector.tsx       # Cards de selección de área
│   │   ├── ExamConfirmation.tsx   # Confirmación antes del examen
│   │   ├── Quiz.tsx               # Examen con navegador y cronómetro
│   │   ├── Question.tsx           # Pregunta individual con formato HTML
│   │   ├── Results.tsx            # Resultados con 4 tabs (Revisión, Gráfico, Detalle, Historial)
│   │   ├── Banqueo.tsx            # Wrapper delgado sobre practice/PracticeSession
│   │   ├── BanqueoCepreuna.tsx    # Wrapper delgado (modo cepre)
│   │   ├── BanqueoPorTema.tsx     # Wrapper delgado (modo banqueo-tema)
│   │   ├── practice/              # Motor único de banqueo/CEPRE (ver más abajo)
│   │   ├── results/
│   │   │   └── ResultsCharts.tsx  # Recharts en chunk lazy propio (ver Rendimiento)
│   │   ├── PDFGenerator.tsx       # Generador de reporte PDF (jsPDF con import() dinámico)
│   │   └── index.ts               # Exports
│   │
│   ├── hooks/
│   │   ├── useExam.ts             # Store Zustand: estado del examen
│   │   ├── useUniversity.ts       # Store Zustand+persist: registro de universidades activo
│   │   └── useTimer.ts            # Hook useStopwatch para cronómetro
│   │
│   ├── context/
│   │   └── AuthContext.tsx        # Sesión compartida (clave simulauna_auth_v2, con migración)
│   │
│   ├── theme/
│   │   └── universityThemes.ts    # Mapa de colores institucionales por universidad + CSS vars --uni-*
│   │
│   ├── services/
│   │   └── api.ts                 # Cliente API: fetchConfig, fetchQuestions, getExam/submitExam,
│   │                              # registerUser, saveScore, getUserHistory, getUniversidades
│   │
│   ├── types/
│   │   └── index.ts               # Interfaces: Question, Answer, Student, etc.
│   │
│   ├── utils/
│   │   ├── calculations.ts        # formatTime, formatNumber, indexToLetter, etc.
│   │   ├── color.ts               # ensureAccessible: garantiza contraste WCAG AA
│   │   └── universityTheme.ts     # Puente resolveTheme/resolveThemeVars (registro > mapa local)
│   │
│   ├── App.tsx                    # Router: rutas /:universidad/* (lazy) + redirects legados a /una/...
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Estilos globales + animaciones
│
├── google-apps-script/             # Backend multi-tenant (8 módulos, ver su propio README)
│   ├── main.gs                     # doGet/doPost + router declarativo ROUTES + token
│   ├── core.gs                     # Registro maestro de universidades, cache namespaced
│   ├── adapter_una.gs              # Layout legado UNA 1:1 (compatibilidad)
│   ├── questions.gs                # Banco de preguntas layout v2 (Banco_<Curso>)
│   ├── scoring.gs                  # getExam/submitExam + motores de calificación
│   ├── users.gs                    # Registro, permisos, intentos, anti-fraude
│   ├── history.gs                  # Historial por universidad + proceso
│   ├── setup.gs                    # setupCore, seedPilotoUNSA, healthChecks
│   ├── api_legacy.gs.bak           # Código monolítico original (NO se despliega, solo referencia)
│   └── README.md                   # Guía de deploy y de cómo agregar una universidad nueva
│
├── docs/
│   ├── CONTRATO_API_V2.md          # Contrato congelado de endpoints/payloads v2
│   ├── FASE0_MODELO_MULTIUNIVERSIDAD.md  # Diseño de la arquitectura multi-tenant
│   └── CHANGELOG.md                # Historial de cambios por versión
│
├── public/
│   ├── favicon.svg
│   └── logos/                      # Logos institucionales locales (ver Sistema de Temas)
│
├── .env.example                    # Variables de entorno ejemplo
├── package.json
├── tailwind.config.js               # Incluye safelist para colores dinámicos
├── vite.config.ts
└── tsconfig.json
```

### El motor único de banqueo/CEPRE (`src/components/practice/`)

Los tres modos de práctica (Banqueo histórico, Banqueo por tema, CEPRE)
comparten un solo motor en vez de tener implementaciones duplicadas:

- `PracticeSession.tsx` — máquina de estados `login → selección → quiz →
  resultados`, parametrizada por modo.
- `practiceModes.ts` — configuración declarativa de cada modo (`banqueo`,
  `banqueo-tema`, `cepre`): qué selects mostrar, qué endpoint llamar, etc.
- `PracticeLogin.tsx`, `PracticeQuiz.tsx`, `PracticeResults.tsx` — pasos
  de la máquina de estados.
- `selects/BanqueoCourseSelect.tsx`, `selects/BanqueoTemaSelect.tsx`,
  `selects/CepreSelect.tsx` — selectores específicos de cada modo.

Los componentes históricos (`Banqueo.tsx`, `BanqueoPorTema.tsx`,
`BanqueoCepreuna.tsx`) quedaron como wrappers de 10-24 líneas que solo
invocan `PracticeSession` con el modo correspondiente — antes eran
~3,850 líneas casi duplicadas entre los tres (reducción del 44%, −1,696
líneas). Este cambio también trajo el primer `eslint.config.js` del
repo: `npm run lint` no funcionaba antes de esta refactorización.

---

## Configuración del Backend (Google Sheets + Apps Script)

> **Esta sección describe el layout de hojas legado de UNA Puno**, que el
> backend v2 sigue sirviendo 1:1 a través de `adapter_una.gs` (ninguna
> acción legada cambió de forma). Para desplegar el backend completo
> (los 8 módulos), correr `setupCore()` y **agregar una universidad
> nueva sin tocar código**, sigue la guía paso a paso en
> [`google-apps-script/README.md`](google-apps-script/README.md). El
> layout de hojas para universidades nuevas (`config_examen`,
> `config_escala`, `Banco_<Curso>` con columnas `ID_HASH`/`PROCESO`/
> `ANIO_PERIODO`/`DIVISION`/`SEMANA`/`ESTADO`) está documentado ahí y en
> [`docs/CONTRATO_API_V2.md`](docs/CONTRATO_API_V2.md).

### 1. Crear Google Sheets

Crear un spreadsheet con las siguientes hojas:

#### Hojas de Configuración (3)
- `Configuración_Ingenierías`
- `Configuración_Sociales`
- `Configuración_Biomédicas`

**Columnas requeridas:**
| COD. | ASIGNATURA | PREGUNTA BIEN CONTESTADA | CANTIDAD DE PREGUNTAS | PONDERACIÓN | PUNTAJE |
|------|------------|--------------------------|----------------------|-------------|---------|
| 1 | Aritmética | 10 | 4 | 5.201 | 208.04 |
| ... | ... | ... | ... | ... | ... |

#### Hojas de Banco de Preguntas (18)
- `Banco_Aritmética`
- `Banco_Álgebra`
- `Banco_Geometría`
- `Banco_Trigonometría`
- `Banco_Física`
- `Banco_Química`
- `Banco_Biología y Anatomía`
- `Banco_Psicología y Filosofía`
- `Banco_Geografía`
- `Banco_Historia`
- `Banco_Educación Cívica`
- `Banco_Economía`
- `Banco_Comunicación`
- `Banco_Literatura`
- `Banco_Razonamiento Matemático`
- `Banco_Razonamiento Verbal`
- `Banco_Inglés`
- `Banco_Quechua y aimara`

**Columnas requeridas para cada banco:**
| Question Text | Question Type | Option 1 | Option 2 | Option 3 | Option 4 | Option 5 | Correct Answer | Time in seconds | Image Link | NUMERO | CURSO | TEMA | SUBTEMA | NOMBRE DEL ARCHIVO |
|--------------|---------------|----------|----------|----------|----------|----------|----------------|-----------------|------------|--------|-------|------|---------|-------------------|
| ¿Cuál es...? | Multiple Choice | Opción A | Opción B | Opción C | Opción D | Opción E | 3 | 180 | https://... | 1 | Aritmética | Números | Naturales | Examen_2024.pdf |

> **Nota:** `Correct Answer` es 1-based (1=Option 1, 2=Option 2, etc.)

#### Hoja de Usuarios (creada automáticamente)
- `usuarios`

**Columnas:**
| Fecha | DNI | Nombre | Email | Celular | Proceso | Área | Carrera |
|-------|-----|--------|-------|---------|---------|------|---------|

#### Hoja de Historial de Puntajes (creada automáticamente)
- `historial_puntajes`

**Columnas:**
| DNI | Fecha | Área | Puntaje | Puntaje Máx | Correctas | Total | Porcentaje |
|-----|-------|------|---------|-------------|-----------|-------|------------|

### 2. Configurar Google Apps Script

> Pasos resumidos — la guía completa y actualizada (Script Properties,
> `setupCore()`, `seedPilotoUNSA()`, `healthCheck()`) está en
> [`google-apps-script/README.md`](google-apps-script/README.md).

1. Ir a Google Apps Script y crear un proyecto nuevo.
2. Copiar **los 8 archivos `.gs`** de `google-apps-script/` al proyecto
   (`main.gs`, `core.gs`, `adapter_una.gs`, `questions.gs`, `scoring.gs`,
   `users.gs`, `history.gs`, `setup.gs`). **No copiar** `api_legacy.gs.bak`.
3. Configurar las Script Properties `SPREADSHEET_ID` (el spreadsheet
   legado de UNA) y `SECRET_TOKEN`.
4. Ejecutar `setupCore()` desde `setup.gs` para crear el spreadsheet CORE
   y registrar `una` en el registro maestro de universidades.
5. Desplegar como aplicación web:
   - Implementar > Nueva implementación
   - Tipo: Aplicación web
   - Ejecutar como: Yo
   - Quién tiene acceso: **Cualquier persona**
6. Copiar la URL generada y configurar `VITE_API_URL` + `VITE_API_TOKEN`
   (el mismo valor que `SECRET_TOKEN`) en el frontend.

---

## Configuración del Frontend

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env`:
```env
# URL de tu Google Apps Script desplegado
VITE_API_URL=[API_URL_AQUÍ]

# Usar datos mock (true para desarrollo, false para producción)
VITE_USE_MOCK=true
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

### 4. Compilar para producción
```bash
npm run build
```

---

## Áreas y Asignaturas

> Todo lo de esta sección (áreas, asignaturas, cantidad de preguntas,
> carreras) es la configuración de **UNA Puno**. Cada universidad nueva
> define las suyas en `config_examen` de su propio spreadsheet — no hay
> un límite de "3 áreas" ni "18 asignaturas" en el código.

### Distribución de Preguntas por Área

#### Ingenierías (60 preguntas, 3000 pts máx)
| Asignatura | Preguntas |
|------------|-----------|
| Aritmética | 4 |
| Álgebra | 4 |
| Geometría | 4 |
| Trigonometría | 4 |
| Física | 4 |
| Química | 4 |
| Biología y Anatomía | 2 |
| Psicología y Filosofía | 4 |
| Geografía | 2 |
| Historia | 2 |
| Educación Cívica | 2 |
| Economía | 2 |
| Comunicación | 4 |
| Literatura | 2 |
| Razonamiento Matemático | 6 |
| Razonamiento Verbal | 6 |
| Inglés | 2 |
| Quechua y aimara | 2 |

#### Biomédicas (60 preguntas, 3000 pts máx)
| Asignatura | Preguntas |
|------------|-----------|
| Aritmética | 3 |
| Álgebra | 3 |
| Geometría | 3 |
| Trigonometría | 3 |
| Física | 3 |
| Química | 5 |
| Biología y Anatomía | 6 |
| Psicología y Filosofía | 4 |
| Geografía | 2 |
| Historia | 2 |
| Educación Cívica | 2 |
| Economía | 2 |
| Comunicación | 4 |
| Literatura | 2 |
| Razonamiento Matemático | 6 |
| Razonamiento Verbal | 6 |
| Inglés | 2 |
| Quechua y aimara | 2 |

#### Sociales (60 preguntas, 3000 pts máx)
| Asignatura | Preguntas |
|------------|-----------|
| Aritmética | 3 |
| Álgebra | 3 |
| Geometría | 2 |
| Trigonometría | 2 |
| Física | 2 |
| Química | 2 |
| Biología y Anatomía | 2 |
| Psicología y Filosofía | 4 |
| Geografía | 4 |
| Historia | 4 |
| Educación Cívica | 4 |
| Economía | 4 |
| Comunicación | 4 |
| Literatura | 4 |
| Razonamiento Matemático | 6 |
| Razonamiento Verbal | 6 |
| Inglés | 2 |
| Quechua y aimara | 2 |

### Carreras por Área

#### Ingenierías (17 carreras)
- Ingeniería Agronómica, Económica, de Minas, Geológica, Metalúrgica, Química
- Ingeniería Estadística e Informática, Topográfica, Agroindustrial, Agrícola
- Ingeniería Civil, de Sistemas, Mecánica Eléctrica, Electrónica
- Arquitectura y Urbanismo
- Ciencias Físico Matemáticas: Física, Matemáticas

#### Biomédicas (8 carreras)
- Medicina Veterinaria y Zootecnia, Enfermería
- Biología: Pesquería, Microbiología, Ecología
- Medicina Humana, Nutrición Humana, Odontología

#### Sociales (17 carreras)
- Ciencias Contables, Trabajo Social
- Educación: Primaria, Inicial, Física, Secundaria (3 especialidades)
- Antropología, Derecho, Turismo
- Ciencias de la Comunicación Social, Administración
- Arte: Música, Artes Plásticas, Danza
- Psicología

---

## Flujo de la Aplicación

El diagrama de abajo ilustra el flujo dentro del espacio de una
universidad (ej. `/una/...`) — es el mismo para cualquier universidad
del registro, solo cambia el prefijo de ruta:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ UniversityPage│───►│  Registro    │───►│  Selección   │
│ (/:universidad)│   │  Paso 1:     │    │  Paso 2:     │
│              │    │  DNI+Nombre  │    │  Proceso+    │
│              │    │  Email+Tel   │    │  Área+Carrera│
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Resultados  │◄───│   Examen     │◄───│ Confirmación │
│ (/resultados)│    │  (/examen)   │    │ (/confirmar) │
│              │    │              │    │              │
│ 4 Tabs:      │    │ - Cronómetro │    │ - Info área  │
│ - Revisión   │    │ - Navegador  │    │ - Instrucciones│
│ - Gráfico    │    │ - N preguntas │   │              │
│ - Detalle    │    │  (getExam)   │    │              │
│ - Historial  │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

La landing nacional (`/`) es el punto de entrada previo: lista las
universidades disponibles y enlaza a `/:universidad`.

### Componentes por Ruta

Todas las rutas viven bajo el espacio `/:universidad/*` (ej. `/una/registro`,
`/unsa/examen`). Las rutas legadas sin prefijo se conservan como redirects
permanentes a `/una/...` para no romper enlaces existentes (ver `src/App.tsx`).

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | Landing | Landing nacional: universidades disponibles, stats, CTA "Elige tu universidad" |
| `/:universidad` | UniversityPage | Landing de la universidad (hero con tema institucional, procesos disponibles) |
| `/:universidad/registro` | StudentForm | Formulario 2 pasos: datos personales + área/carrera |
| `/:universidad/confirmar` | ExamConfirmation | Confirmación con instrucciones del examen |
| `/:universidad/examen` | Quiz | Interfaz del examen con cronómetro y navegador (`getExam`) |
| `/:universidad/resultados` | Results | Resultados con 4 tabs: Revisión, Gráfico, Detalle, Historial |
| `/:universidad/banqueo` | Banqueo (→ `PracticeSession`) | Práctica por curso (solo usuarios confirmados) |
| `/:universidad/banqueo-tema` | BanqueoPorTema (→ `PracticeSession`) | Práctica por curso y tema específico |
| `/:universidad/cepre` | CepreSession / BanqueoCepreuna (→ `PracticeSession`) | Banqueo y simulacro del CEPRE de la universidad |
| `/:universidad/aula` | AulaComingSoon (→ `AulaShell`) | Aula Virtual: si el alumno está matriculado en un ciclo real, `AulaShell` con las 10 secciones y datos reales; si no, vista previa navegable con datos de ejemplo + CTA de matrícula/lista de espera por WhatsApp. Ver [Aula Virtual (v2.1)](#aula-virtual-v21) |

Páginas informativas de nivel raíz (sin prefijo de universidad):

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/nosotros` | Nosotros | Página institucional: quiénes somos, con el lobito |
| `/preguntas-frecuentes` | FAQ | Preguntas frecuentes |
| `/terminos` | Terminos | Términos y condiciones |
| `*` (cualquier ruta no reconocida) | NotFound | 404 real con el lobito perdido, en vez del blanco en producción de antes |

**Redirects legados** (rutas sin prefijo, mantenidas por compatibilidad):

| Ruta legada | Redirige a |
|-------------|------------|
| `/registro` | `/una/registro` |
| `/confirmar` | `/una/confirmar` |
| `/examen` | `/una/examen` |
| `/resultados` | `/una/resultados` |
| `/banqueo` | `/una/banqueo` |
| `/banqueo-cepreuna` | `/una/cepre` |
| `/banqueo-tema` | `/una/banqueo-tema` |
| `/simulacro-cepreuna` | `/una/cepre` |

---

## Sistema de Puntuación

> **Desde la v2.0.0 ya no existe un puntaje máximo fijo de 3000 puntos
> en el código.** La escala, los umbrales de desempeño y el motor de
> cálculo son **config-driven por universidad** (hoja `config_escala`
> de cada tenant) y la calificación se hace **en el servidor**, no en el
> navegador.

### Flujo de calificación (v2)

1. El frontend pide el examen con `getExam` (acción v2): el backend
   arma el pool de preguntas y las entrega **sin las claves correctas**
   — la respuesta correcta nunca viaja al cliente durante el examen.
2. El estudiante responde y el frontend envía las respuestas con
   `submitExam` (**POST**, body JSON).
3. El servidor califica con el motor configurado en `config_escala` para
   ese proceso/universidad:
   - **`suma_ponderada`**: puntaje por pregunta = `puntos_correcta`
     (definido por curso/división en `config_examen`); solo las
     respuestas correctas suman. Es el motor que usa UNA Puno — su
     escala de 3000 pts es un *resultado* de su configuración, no una
     constante del código.
   - **`decimas`**: escala 0-100 (o la que defina `escala_total`), útil
     para universidades que califican en base 20 o en porcentaje directo.
   - **`vector_canal`**: agrupa por `division_tipo=canal` con pesos por
     canal (hoy implementado con la misma fórmula de suma ponderada por
     canal; ver TODOs de `google-apps-script/README.md` si una
     universidad necesita una agregación distinta, p.ej. máximo entre
     canales).
4. La sesión de examen se guarda en `CacheService` (con hoja espejo de
   respaldo) mientras el estudiante rinde, para poder recuperarla ante un
   refresh sin perder progreso.

### Niveles de Desempeño (ejemplo: UNA Puno, motor `suma_ponderada`, 3000 pts)

Los umbrales exactos (`umbral_excelente`, `umbral_bueno`, `umbral_regular`)
y la escala total vienen de `config_escala` — la tabla de abajo es la
configuración actual de UNA, no un valor fijo del sistema:

| Nivel | Puntaje Mínimo | Porcentaje | Color |
|-------|----------------|------------|-------|
| Excelente | ≥ 2400 pts | 80% | Verde |
| Bueno | ≥ 1800 pts | 60% | Azul |
| Regular | ≥ 1200 pts | 40% | Ámbar |
| Necesita práctica | < 1200 pts | <40% | Rojo |

### `saveScore` (legado, deprecado)

La acción antigua `saveScore`, que calificaba en el cliente y solo
escribía en la hoja legada `historial_puntajes` de UNA, se mantiene
operativa por compatibilidad pero está **deprecada**: el flujo nuevo
debe usar `getExam` + `submitExam`.

---

## Sistema de Usuarios y Historial

> Las interfaces de esta sección (`RegisterData`, `ScoreData`, `maxScore:
> 3000`) documentan el flujo **legado** de UNA (`register`/`saveScore`/
> `getUserHistory`, servido por `adapter_una.gs` + `history.gs`), que
> sigue funcionando byte-idéntico. Desde la v2, la cuenta de usuario es
> **única a nivel nacional**: vive en `CORE.usuarios`/`CORE.permisos`/
> `CORE.intentos` (spreadsheet CORE, no por universidad), el anti-fraude
> DNI-email es global, y el historial se guarda con `universidad` +
> `proceso` para poder distinguir intentos de distintas universidades
> bajo el mismo DNI. El **primer simulacro gratis** se evalúa **por
> universidad** (rendir gratis en UNA no consume el gratis de UNSA).

### Registro de Usuarios

El sistema registra usuarios en la hoja `usuarios` de Google Sheets:

```typescript
interface RegisterData {
  dni: string;           // 8 dígitos
  fullName: string;      // Nombre completo
  email: string;         // Email opcional
  phone: string;         // Celular opcional
  processType: 'CEPREUNA' | 'GENERAL' | 'EXTRAORDINARIO';
  area: 'Ingenierías' | 'Sociales' | 'Biomédicas';
  career: string;        // Carrera profesional
}
```

**Optimización**: Si el DNI ya existe, NO se duplica. Solo actualiza si email, teléfono o carrera cambiaron.

### Historial de Puntajes

Cada vez que un usuario termina un examen, se guarda automáticamente:

```typescript
interface ScoreData {
  dni: string;
  score: number;         // Puntaje obtenido
  maxScore: number;      // Puntaje máximo (3000)
  area: AreaType;
  correct: number;       // Preguntas correctas
  total: number;         // Total de preguntas (60)
}
```

El historial se recupera con `getUserHistory(dni)`:

```typescript
interface UserHistory {
  dni: string;
  totalIntentos: number;
  history: HistoryEntry[];
  mejorPuntaje: number;
  ultimoPuntaje: number;
}

interface HistoryEntry {
  fecha: string;
  area: string;
  puntaje: number;
  puntajeMax: number;
  correctas: number;
  total: number;
  porcentaje: number;
}
```

### Visualización del Historial (Tab en Results)

- **Stats cards**: Total simulacros, Mejor puntaje, vs Anterior (diferencia)
- **LineChart**: Evolución de puntajes (solo si hay 2+ intentos)
- **Tabla**: Lista de todos los intentos con fecha, área, correctas, puntaje
- **Indicadores**: Trofeo en mejor puntaje, "(actual)" en el último

---

## Sistema de Control de Acceso (NUEVO)

### Lógica de Acceso

| Intento | Condición | Resultado |
|---------|-----------|-----------|
| Primero | Ninguna | GRATIS para todos |
| Segundo+ | En hoja `confirmado` | Permitido |
| Segundo+ | NO en hoja `confirmado` | Bloqueado |
| Cualquier | Fraude detectado | Bloqueado |

### Detección de Fraude

El sistema detecta intentos de fraude cuando:
- Un **DNI** ya está registrado con un **email diferente**
- Un **email** ya está registrado con un **DNI diferente**

Mensaje genérico: "El usuario ya existe" (no revela qué dato está duplicado)

### Hoja `confirmado` (crear manualmente)

Agregar usuarios que tienen acceso ilimitado:

| DNI | Nombre | Email |
|-----|--------|-------|
| 12345678 | Juan Pérez | juan@email.com |

> **Importante:** AMBOS (DNI + Email) deben coincidir para que el usuario esté confirmado.

---

## Banqueo Histórico (NUEVO)

### Descripción

Modo de práctica que permite a los usuarios practicar con preguntas de un curso específico:
- **Selección de curso**: 18 cursos disponibles
- **Cantidad de preguntas**: 10, 15 o 20
- **Solo usuarios confirmados**: NO hay intento gratis en banqueo
- **Justificación**: Muestra explicación de cada respuesta

### Ruta

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/banqueo` | Banqueo | Práctica por curso con login |

### Flujo del Banqueo

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Login      │───►│  Selección   │───►│   Quiz       │───►│  Resultados  │
│  DNI + Email │    │  Curso +     │    │  10/15/20    │    │  + Justif.   │
│              │    │  Cantidad    │    │  preguntas   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Justificación de Respuestas (NUEVO)

### Columna JUSTIFICACION

Agregar a cada hoja de banco de preguntas:

| ... | NOMBRE DEL ARCHIVO | JUSTIFICACION |
|-----|-------------------|---------------|
| ... | Examen_2024.pdf | La respuesta es C porque según el teorema de Pitágoras... |

### Visualización

- En **Resultados del simulacro**: Botón "Ver justificación" debajo de cada pregunta
- En **Banqueo Histórico**: Se muestra automáticamente en la revisión

---

## Despliegue

### GitHub Pages (Recomendado)

El proyecto incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`) para desplegar automáticamente.

1. Habilitar GitHub Pages en Settings > Pages
2. Source: GitHub Actions
3. Cada push a `main` despliega automáticamente

### Variables de Entorno en Producción

En GitHub, configurar secrets:
- `VITE_API_URL`: URL del Google Apps Script desplegado
- `VITE_USE_MOCK`: `false`

---

## Desarrollo Local

### Comandos Disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Compilar para producción
npm run build

# Preview de build
npm run preview

# Linting
npm run lint
```

### Modo Mock

Para desarrollo sin backend, asegurarse de tener:
```env
VITE_USE_MOCK=true
```

Esto usa datos generados localmente en `src/services/api.ts`.

---

## Tipos TypeScript Principales

```typescript
// Área/división académica. Desde la v2 ya NO es un union literal de 3 áreas:
// pasa a ser `string` porque cada universidad define sus propias divisiones vía
// config_examen (UNA sigue usando 'Ingenierías' | 'Sociales' | 'Biomédicas' como
// valores en tiempo de ejecución, pero el tipo ya no los restringe en código).
type AreaType = string;

// Estados del examen
type ExamStatus = 'idle' | 'loading' | 'ready' | 'in_progress' | 'completed' | 'error';

// Tipos de proceso de admisión
type ProcessType = 'CEPREUNA' | 'GENERAL' | 'EXTRAORDINARIO';

// Estructura de una pregunta
interface Question {
  id: string;
  number: number;              // Número global (1-60)
  questionText: string;        // Soporta HTML: <b>, <i>, <u>, <mark>, <br>
  questionType: string;
  options: string[];           // 5 opciones (también soportan HTML)
  correctAnswer: number;       // Índice 0-based
  timeSeconds: number;         // 180 (3 min)
  imageLink: string | null;
  subject: string;
  points: number;
  sourceFile?: string | null;  // "Examen_2024.pdf"
}

// Estudiante registrado
interface Student {
  dni: string;
  fullName: string;
  area: AreaType;
}

// Respuesta del estudiante
interface Answer {
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean;
  timeSpent: number;
}

// Resultado por asignatura
interface SubjectResult {
  name: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  pointsObtained: number;
  maxPoints: number;
}

// Historial de usuario
interface UserHistory {
  dni: string;
  totalIntentos: number;
  history: HistoryEntry[];
  mejorPuntaje: number;
  ultimoPuntaje: number;
}
```

---

## Características del Quiz

### Durante el Examen
- **Cronómetro global** estilo Google Forms (borde azul, fondo blanco)
- **Navegador de preguntas** desplegable lateral con colores:
  - Verde: Contestada
  - Gris: Sin contestar
  - Borde azul: Actual
- **Colores Google en opciones**: A=azul, B=rosa, C=ámbar, D=verde, E=púrpura
- **Botones Anterior/Siguiente** para navegar
- **Indicador de progreso** (X / 60)
- **Sin feedback** hasta presionar "Calificar"
- **Botón WhatsApp** para reportar errores

### Al Calificar
- Modal de confirmación
- Advierte si hay preguntas sin contestar
- Muestra tiempo transcurrido
- Opción de ir a pregunta sin contestar

### En Resultados (4 Tabs)
1. **Revisión**: Navegador visual de las 60 preguntas (verde/rojo)
2. **Gráfico**: BarChart de rendimiento por asignatura
3. **Detalle**: Tabla con todas las preguntas y sus respuestas
4. **Historial**: Stats + LineChart + Tabla de intentos anteriores

---

## Formato de Texto en Preguntas

El sistema soporta HTML básico en el texto de preguntas y opciones:

| Tag | Uso | Ejemplo |
|-----|-----|---------|
| `<b>` | Negrita | `El valor de <b>x</b> es...` |
| `<i>` | Cursiva | `Según el <i>teorema</i>...` |
| `<u>` | Subrayado | `Encuentra <u>la respuesta</u>` |
| `<mark>` | Resaltado amarillo | `El resultado es <mark>42</mark>` |
| `<br>` | Salto de línea | `Primera línea<br>Segunda línea` |
| `<sub>` | Subíndice | `H<sub>2</sub>O` |
| `<sup>` | Superíndice | `x<sup>2</sup>` |

---

## Notas Importantes

1. **Orden de preguntas**: Las preguntas se presentan en orden por asignatura según la tabla de configuración (NO aleatorias). Las preguntas dentro de cada asignatura sí son seleccionadas aleatoriamente del banco.

2. **Imágenes**: Se soportan imágenes mediante links en la columna `Image Link` del banco de preguntas.

3. **Tiempo**: El examen no tiene límite de tiempo. El cronómetro solo registra el tiempo transcurrido.

4. **Respuestas**: Las preguntas sin contestar se evalúan como incorrectas.

5. **Base de datos**: Todo el contenido se gestiona desde Google Sheets, facilitando la actualización del banco de preguntas sin tocar código.

6. **Usuarios**: El registro NO duplica usuarios por DNI. Si el mismo DNI vuelve a registrarse, solo actualiza datos si cambiaron.

7. **Historial**: Se guarda automáticamente al finalizar cada examen. Se obtiene con un delay de 500ms después de guardar para asegurar que Google Sheets procesó el registro.

8. **WhatsApp**: Link de contacto para reportar errores y confirmación: [NÚMERO PRIVADO]

---

## API Functions (api.ts)

```typescript
// Configuración de áreas
fetchConfig(): Promise<Config>

// Preguntas del examen
fetchQuestions(area: AreaType): Promise<Question[]>

// Registro de usuario
registerUser(data: RegisterData): Promise<RegisterResponse>

// Guardar puntaje
saveScore(data: ScoreData): Promise<void>

// Obtener historial
getUserHistory(dni: string): Promise<UserHistory | null>

// Verificar acceso al simulacro
checkUserAccess(dni: string, email: string): Promise<AccessResponse>

// Verificar acceso al banqueo
checkBanqueoAccess(dni: string, email: string): Promise<AccessResponse>

// Obtener preguntas de banqueo
fetchBanqueoQuestions(course: string, count: number): Promise<Question[]>
```

---

## Solución de Problemas Comunes

### Error "Acción no válida" en la API

Si recibes este error, significa que el código de Google Apps Script no está actualizado.

**Solución:**
1. Ir a Google Apps Script
2. Abrir tu proyecto de Apps Script
3. Copiar el contenido actualizado de `google-apps-script/api.gs`
4. Guardar y desplegar nueva versión:
   - Implementar > Administrar implementaciones > Crear nueva versión
   - O: Implementar > Nueva implementación

### Fechas aparecen como fracciones en Google Sheets

Cuando ingresas valores como `7/4` en Google Sheets, se interpretan como fechas.

**Solución:**
1. Seleccionar las columnas afectadas
2. Formato > Número > Texto sin formato
3. O prefija el valor con apóstrofe: `'7/4`

### Error "Cannot find namespace 'NodeJS'" en build

Este error ocurre porque `NodeJS.Timeout` no existe en el entorno del navegador.

**Solución:**
```typescript
// Incorrecto (solo Node.js)
let interval: NodeJS.Timeout;

// Correcto (compatible con navegador)
let interval: ReturnType<typeof setInterval> | undefined;
```

### GitHub Actions deployment falla

Si el deployment falla en GitHub Actions:

1. Verificar que los **GitHub Secrets** estén configurados:
   - Settings > Secrets and variables > Actions
   - Agregar: `VITE_API_URL` con la URL de tu Apps Script

2. Verificar que GitHub Pages esté habilitado:
   - Settings > Pages
   - Source: **GitHub Actions**

### API no responde o da CORS error

1. Verificar que la URL en `.env` termine en `/exec` (no `/dev`)
2. Verificar que el Apps Script esté desplegado como:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**

---

## Flujo Detallado de Control de Acceso

### Tablas Involucradas

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│  usuarios   │      │ historial_puntajes │      │ confirmado  │
├─────────────┤      ├──────────────────┤      ├─────────────┤
│ DNI         │      │ DNI              │      │ DNI         │
│ Nombre      │      │ Fecha            │      │ Nombre      │
│ Email       │      │ Área             │      │ Email       │
│ Celular     │      │ Puntaje          │      └─────────────┘
│ Proceso     │      │ Correctas        │
│ Área        │      │ ...              │
│ Carrera     │      └──────────────────┘
└─────────────┘
```

### Algoritmo de Verificación

```javascript
function checkUserAccess(dni, email) {
  // 1. Primer simulacro es GRATIS
  // 2. Detecta fraude (DNI con diferente email)
  // 3. Verifica si está en tabla 'confirmado'
  // 4. Usuario no confirmado queda bloqueado
  // Ver google-apps-script/api.gs para implementación completa
}
```

### Mensaje al Usuario Bloqueado

```
Ya realizaste tu simulacro gratuito.

Para continuar practicando, comunícate con nosotros por WhatsApp: [NÚMERO PRIVADO]
```

---

## Configuración de Despliegue

### GitHub Secrets Requeridos

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `VITE_API_URL` | URL del Apps Script | `[API_URL_AQUÍ]` |

### Pasos para Configurar

1. Ir a tu repositorio en GitHub
2. Settings > Secrets and variables > Actions
3. Clic en "New repository secret"
4. Nombre: `VITE_API_URL`
5. Valor: Tu URL de Apps Script (termina en `/exec`)

### Archivo de Workflow

El archivo `.github/workflows/deploy.yml` usa el secret así:

```yaml
- name: Build
  env:
    VITE_API_URL: ${{ secrets.VITE_API_URL }}
  run: npm run build
```

---

## Contacto WhatsApp

El número de contacto para soporte y confirmación de usuarios es:

**[NÚMERO PRIVADO]**

---

## CEPREUNA - Simulacros por Semana (NUEVO)

### Descripción

Sistema integrado para practicar con los cuadernillos del CEPREUNA (Centro Pre-Universitario de la UNA):

- **Simulacro CEPREUNA**: 60 preguntas usando hojas `CEPRE_` por área y semana
- **Banqueo CEPREUNA**: Práctica por curso específico filtrando por semana

### Hojas de Datos CEPREUNA

Para cada asignatura, crear hojas con el prefijo `CEPRE_`:

```
CEPRE_Aritmética
CEPRE_Álgebra
CEPRE_Geometría
...
```

**Columnas adicionales requeridas:**

| Question Text | ... | AREA | SEMANA |
|--------------|-----|------|--------|
| ¿Cuál es...? | ... | ING | S1 |
| ¿Cuál es...? | ... | BIO | S2 |
| ¿Cuál es...? | ... | SOC | S1 |

**Códigos de área:**
- `ING` = Ingenierías
- `BIO` = Biomédicas
- `SOC` = Sociales

**Formato de semana:** `S1`, `S2`, `S3`, ... `S16`

### Flujo Simulacro CEPREUNA

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Selección   │───►│   Quiz       │───►│  Resultados  │───►│  Revisión    │
│  Área +      │    │  60 preguntas│    │  Puntaje +   │    │  Detallada   │
│  Semana      │    │  CEPRE_      │    │  Gráficos    │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Rutas CEPREUNA

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/simulacro-cepreuna` | SimulacroCepreuna | Simulacro completo de 60 preguntas por área y semana |
| `/banqueo-cepreuna` | BanqueoCepreuna | Práctica por curso y semana |

### Idiomas (Inglés y Quechua)

Para Inglés y Quechua y aimara, el sistema usa automáticamente las hojas `Banco_` históricas ya que no hay cuadernillos CEPRE específicos para estos cursos.

---

## Banqueo por Tema (NUEVO)

### Descripción

Sistema de estudio enfocado que permite practicar preguntas filtradas por curso y tema específico. Incluye normalización automática de nombres de cursos y cache para optimizar el rendimiento.

### Flujo de Banqueo por Tema

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Login      │───►│  Selección   │───►│   Quiz       │───►│  Resultados  │
│  DNI + Email │    │  Curso +     │    │  10/25/50/100│    │  + Justif.   │
│              │    │  Tema +      │    │  preguntas   │    │              │
│              │    │  Cantidad    │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Normalización de Cursos

El sistema normaliza automáticamente los nombres de cursos para evitar duplicados causados por variaciones en la base de datos:

```javascript
// Mapeo de cursos canónicos
const CURSOS_CANONICOS = {
  'algebra': 'Álgebra',
  'matematica': 'Matemática',
  'matematicas': 'Matemática',           // Unificación
  'geometria y trigonometria': 'Geometría', // Unificación
  'filosofia': 'Psicología y Filosofía', // Unificación
  'psicologia': 'Psicología y Filosofía',
  'historia universal': 'Historia',       // Unificación
  'biologia y anatomia': 'Biología y Anatomía',
  // ...más mappings
};

// Valores inválidos filtrados
const CURSOS_INVALIDOS = ['72', 'curso', ''];
```

**Ejemplos de normalización:**

| Valor Original | Valor Normalizado |
|----------------|-------------------|
| `ALGEBRA` | `Álgebra` |
| `Álgebra` | `Álgebra` |
| `ÁLGEBRA` | `Álgebra` |
| `matematicas` | `Matemática` |
| `historia universal` | `Historia` |
| `filosofia` | `Psicología y Filosofía` |

### Sistema de Cache

Se implementó CacheService de Google Apps Script para mejorar tiempos de respuesta:

```javascript
// Cache para getCursosConTemas()
const cache = CacheService.getScriptCache();
const cacheKey = 'cursos_con_temas_v2';
cache.put(cacheKey, JSON.stringify(result), 1800); // 30 minutos

// Cache para getTemasPorCurso()
const cacheKey = 'temas_' + cursoCanonical.replace(/\s/g, '_');
cache.put(cacheKey, JSON.stringify(result), 1800); // 30 minutos
```

**Rendimiento:**
- Primera carga: ~2-5 segundos (consulta a Google Sheets)
- Cargas siguientes: < 100ms (desde cache)
- Expiración: 30 minutos

### Tipos TypeScript

```typescript
interface CursoConTemas {
  curso: string;
  cantidadTemas: number;
  totalPreguntas: number;
}

interface TemaInfo {
  tema: string;
  cantidadSubtemas: number;
  totalPreguntas: number;
}

// Respuesta del API
interface BanqueoTemaResponse {
  questions: BanqueoQuestion[];
  total: number;
}
```

### Acceso

El acceso al Banqueo por Tema está controlado por la función `checkBanqueoAccess`:
- Solo usuarios en la hoja `acceso_banqueo` pueden acceder
- Se verifica por DNI

---

## Auto-Formateo de Preguntas (NUEVO)

### Descripción

El sistema detecta automáticamente patrones de numeración en el texto de las preguntas y agrega saltos de línea para mejorar la legibilidad.

### Patrones Detectados

| Patrón | Ejemplo Original | Resultado |
|--------|-----------------|-----------|
| Números romanos con punto | `pregunta. I. Primera II. Segunda` | Salto antes de `I.` y `II.` |
| Números romanos con paréntesis | `siguiente: I) Primera II) Segunda` | Salto antes de `I)` y `II)` |
| Letras pegadas al punto | `cosas.a. Opción.b. Otra` | Salto antes de `a.` y `b.` |
| Letras después de dos puntos | `corresponda: a. Primera` | Salto antes de `a.` |

### Reglas Anti-Falsos Positivos

El algoritmo evita formatear incorrectamente casos como:

| Caso | Texto | ¿Se formatea? | Razón |
|------|-------|---------------|-------|
| Fin de palabra | `empírica. Su definición...` | NO | Hay espacio entre "a" y el punto |
| Error tipográfico | `verda d. La respuesta...` | NO | Hay espacio antes de "d" |
| Lista real | `cosas.a. Racionalismo.b. Empirismo` | SI | Letra pegada al punto anterior |
| Después de dos puntos | `corresponda: a. Primera opción` | SI | Patrón estándar de lista |

### Implementación

La función `formatQuestionTextAuto()` se aplica en:
- `src/components/Question.tsx` - Quiz principal
- `src/utils/formatText.ts` - Banqueo y Results

```typescript
// Ejemplo de patrones regex utilizados
formatted.replace(/\.([a-e])\.(\s+)/g, '.<br><br><strong>$1.</strong>$2');
formatted.replace(/([.:])(\s*)([IVX]{1,4})\.\s+/g, '$1<br><br><strong>$3.</strong> ');
```

### Aplicación en el Sistema

El formateo se aplica automáticamente en:
- Quiz (examen principal)
- Results (revisión de respuestas)
- Banqueo Histórico
- Banqueo CEPREUNA
- Simulacro CEPREUNA

---

## Aula Virtual (v2.1)

> El Aula Virtual **ya no es "próximamente" a nivel backend**: el
> contrato v2.1 está implementado y desplegado en producción, con un
> ciclo demo verificado de punta a punta. Lo que falta para que
> estudiantes reales entren es que cada universidad **abra su primer
> ciclo real** en la hoja `ciclos` — hasta entonces, el acceso sigue
> mostrando la vista previa (ver tabla de rutas arriba).

Contrato congelado en [`docs/CONTRATO_AULA_V21.md`](docs/CONTRATO_AULA_V21.md)
(diseño completo en [`docs/AULA_VIRTUAL_DISENO.md`](docs/AULA_VIRTUAL_DISENO.md)),
implementado en `google-apps-script/aula.gs` con 4 actions nuevas y
aditivas (no tocan el contrato v2 congelado ni ninguna hoja existente):

| Action | Método | Qué hace |
|--------|--------|----------|
| `getCiclos` | GET | Lista los ciclos de una universidad, filtrable por estado (`inscripciones_abiertas`\|`en_curso`\|`cerrado`) |
| `inscribirCiclo` | POST | Preinscribe a un alumno a un ciclo (`estado=preinscrito`); idempotente por DNI+ciclo |
| `getAula` | GET | Payload agregado de todo el Aula del alumno en un solo round-trip (ciclo, horario, docentes, materiales, anuncios, grupo de WhatsApp, pagos, simulacros del ciclo, clases en vivo, grabaciones, recursos) |
| `getMisPagos` | GET | Estado de cuenta del alumno (matrícula + mensualidades), sin cache (dato financiero siempre fresco) |

### Modelo de datos: 11 hojas nuevas, todas en CORE

Ninguna hoja nueva por universidad — todo vive en el spreadsheet **CORE**
existente, junto a `usuarios`/`permisos`/`intentos`/`historial`, para que
el equipo de operaciones administre la matrícula y los pagos de todas las
universidades desde un solo lugar: `ciclos`, `matriculas`, `pagos`,
`horario`, `docentes`, `materiales`, `grupos_whatsapp`, `anuncios`,
`clases_en_vivo`, `grabaciones`, `recursos`. `setupCore()` las crea de
forma idempotente.

### Gestión 100% desde Google Sheets — cero deploy para operar el día a día

Igual que el resto de la plataforma, el coordinador de cada ciclo opera
todo editando filas a mano, sin tocar código:

- **Abrir un ciclo**: fila nueva en `ciclos` con `estado=inscripciones_abiertas`.
- **Matricular a un alumno**: el alumno se preinscribe solo
  (`inscribirCiclo` → `matriculas.estado=preinscrito`); el coordinador,
  al verificar el voucher de pago por WhatsApp, cambia esa fila a
  `estado=matriculado` — eso es lo que da acceso real al Aula.
- **Registrar un pago**: fila nueva en `pagos` (`pendiente` → `verificado`/`rechazado`).
- **Publicar material, anuncios, clases en vivo, grabaciones o recursos
  externos**: fila nueva en la hoja correspondiente (`materiales`/
  `anuncios` requieren `estado=publicado`; `clases_en_vivo` se marca
  `cancelada` solo si de verdad se suspende una sesión — el estado
  "en vivo ahora/próxima/pasada" que ve el alumno se calcula en el
  cliente comparando la hora con el reloj del dispositivo).

Detalle completo de cada flujo en [`google-apps-script/README.md` §5](google-apps-script/README.md).

### Verificación en producción

`seedAulaDemo()` sembró un ciclo demo completo para `una`
(`una-demo-2026-1`): 2 docentes, horario de una semana, 2 clases en vivo
próximas, 2 grabaciones, 3 materiales publicados, 1 anuncio fijado, 1
grupo de WhatsApp, 1 recurso externo, y un alumno demo matriculado con 2
pagos (matrícula verificada + una mensualidad pendiente).
`healthCheckAula()` corrió **5/5 casos PASS** contra ese ciclo real en
producción: forma de `getCiclos`, `getAula` sin matrícula, `inscribirCiclo`
detectando duplicados, `getAula` con acceso completo, y `getMisPagos`.

### Frontend: `AulaShell`, 10 secciones navegables

`src/components/aula/AulaShell.tsx` reemplaza el diseño original de
"muro único" (`AulaMuro`, retirado) tras feedback explícito del usuario:
ya no es un solo grid con todo, sino una plataforma con navegación entre
secciones (tabs horizontales en móvil, barra lateral sticky en
escritorio), cada una con su propio bento curado por el coordinador.

| Sección | Componente |
|---|---|
| Inicio | `InicioResumen.tsx` |
| Clases en vivo | `ClasesEnVivo.tsx` |
| Grabaciones | `Grabaciones.tsx` |
| Materiales | `MaterialesCurso.tsx` |
| Horario | `HorarioSemanal.tsx` |
| Anuncios | `AnunciosCoordinador.tsx` |
| Simulacros del ciclo | `MisSimulacrosCiclo.tsx` |
| Mi estado de pagos | `EstadoPagos.tsx` |
| Mi grupo de WhatsApp | `MiGrupoWhatsapp.tsx` |
| Recursos | `RecursosExternos.tsx` |

`ResourceViewer.tsx` es un visor modal embebido reutilizable (mismo
patrón de accesibilidad que `QuickSwitch`/`CoachTour`: focus trap,
`aria-modal`, Escape cierra) para ver PDFs/videos de Drive o YouTube sin
salir de SimulaUNA, con detección heurística de bloqueo por iframe
(`X-Frame-Options`) y un botón "Abrir en pestaña nueva" siempre visible.
Las videollamadas de Meet/Zoom nunca se embeben (los proveedores lo
rechazan por diseño) — la tarjeta con toda la info de la sesión sí vive
dentro de la plataforma, y el botón "Unirme" abre en pestaña nueva.

El frontend está cableado al API real (`services/api.ts`) con
degradación elegante: si el API no responde o el alumno no tiene acceso,
`AulaComingSoon` muestra la vista previa navegable de las 10 secciones
con datos de ejemplo (ribbon "Vista previa · datos de ejemplo") en vez de
un error o una pantalla en blanco.

---

## Identidad Visual y Mascota

SimulaUNA tiene mascota propia: **un lobito muy estudioso** (decisión
explícita del usuario — memorable y neutral, deliberadamente **sin**
identidad andina forzada en la marca). Vive en `src/components/pages/Mascot.tsx`
y en `public/illustrations/` como una familia de **9 poses** en WebP con
transparencia real (verificada por chroma key): astronauta, celebra,
ánimo, profesor, saludo, perdido, pensando, corazón y estudiando —
distintas poses se usan en el hero, el CTA final, el 404, el onboarding
(`CoachTour`) y el feedback de racha del banqueo.

El set completo de imágenes propias (mascota + 5 fondos de universo + 3
bodegones ilustrados por área + 3 avatares de estudiante + aula
ilustrada) se generó con el CLI de Codex (tool nativo `image_gen`, sin
API key), usando la skill de usuario `codex-imagenes`. Reemplaza el
100% de las fotografías de Unsplash y los avatares de `pravatar.cc` que
usaba el rediseño v1.6.0 en las secciones de alto impacto — cero
imágenes genéricas de stock hoy en Landing, StudentForm, Results y las
páginas nuevas. Todo el set se optimizó a WebP (~20MB → ~1.5MB
combinados). Dirección de arte completa (paleta, prompts, reglas de
consistencia del set) en [`docs/DIRECCION_DISENO_V3.md`](docs/DIRECCION_DISENO_V3.md).

---

## Sistema de Temas Institucionales (v2)

Cada universidad tiene sus propios colores de marca, aplicados con
moderación en el frontend (`src/theme/universityThemes.ts` +
`src/utils/universityTheme.ts`). Los colores fueron **investigados**
(manuales de marca, estatutos, heráldica oficial) para 13 universidades;
el registro maestro (`CORE.universidades`, vía `getUniversidades`)
**siempre tiene precedencia** sobre este mapa local cuando una
universidad define sus propios colores.

| Universidad | Primario | Secundario | Confianza de la fuente |
|-------------|----------|------------|-------------------------|
| UNA (Puno) | `#003D7A` | `#E67E22` | Alta |
| UNSA (Arequipa) | `#7B1B2C` (guinda) | `#F2C230` (dorado) | Alta |
| UNMSM (San Marcos) | `#8C1D40` (guinda) | `#EFE6D8` (perla) | Media |
| UNI | `#003594` (Pantone 661 C, manual 2019) | `#FFFFFF` | Alta |
| UNSAAC (Cusco) | `#A6192E` | `#C9A227` | Media |
| UNCP (Centro) | `#1B5E3A` | `#C9A227` | Media |
| UNT (Trujillo) | `#1B3E6F` | `#F2C230` | Media |
| UNC (Cajamarca) | `#4A90D9` | `#F2C230` | Alta |
| UNFV (Federico Villarreal) | `#E8792D` | `#1A1A1A` | Alta |
| UNALM (La Molina) | `#2E7D32` | `#D4A017` | Media |
| UNP (Piura) | `#4FA8D8` | `#C8102E` | Media |
| UNSCH (Huamanga) | `#9E1B1B` | `#6E6E6E` | Media |
| UNAJ (Juliaca) | `#003D7A` (neutral, sin fuente verificable) | `#D4AF37` | Baja — pendiente |

Las tres "guindas" (UNSA, San Marcos, UNSCH) están deliberadamente
diferenciadas en tono para distinguirse de un vistazo.

### Reglas de uso

- El color `secondary` suele ser dorado/amarillo: se usa **solo como
  acento** (bordes, íconos, detalles) — nunca como fondo con texto blanco.
- El color `primary` siempre pasa por `ensureAccessible()`
  (`src/utils/color.ts`) antes de usarse como color de texto o fondo con
  texto blanco, verificando 4.5:1 de contraste (WCAG AA). Si el color de
  marca no alcanza el umbral, se oscurece automáticamente.
- `themeCssVars()` deriva 4 variables CSS listas para inyectar en un
  contenedor: `--uni-primary` (color tal cual), `--uni-primary-safe`
  (garantizado AA), `--uni-primary-soft` (tinte ~8% para fondos suaves),
  `--uni-primary-deep` (oscurecida para gradientes/hovers), y
  `--uni-secondary` (acento).
- Aplicado en: hero y tarjetas del Landing, `UniversityPage` (gradiente
  institucional + logo + stats del banco), `Quiz` (header/barra de
  progreso/navegador), `Results` (anillo de progreso, tabs, gráficos),
  `StudentForm` (floating inputs, stepper), `ExamConfirmation`,
  `PracticeSession` (feedback + racha de aciertos consecutivos).
- Todo lo demás del sistema permanece en la paleta neutral "Editorial
  Andino" (ver [Rediseño Visual v1.6.0](#rediseño-visual-v160--editorial-andino-2026-04-20)).

### Logos institucionales

Los 12 logos del carrusel del Landing se sirven localmente desde
`public/logos/` (antes se referenciaban directo desde Wikimedia Commons).

---

## Rendimiento y Code-Splitting

El bundle de producción se redujo agresivamente separando dependencias
pesadas en chunks lazy que solo se descargan cuando el usuario realmente
las necesita:

- **Recharts (~385KB)**: movido a un chunk lazy propio
  (`src/components/results/ResultsCharts.tsx`), que solo se carga al
  abrir las tabs "Gráfico" o "Historial" de `Results` (con skeleton
  mientras carga). Antes formaba parte del chunk principal de `Results`.
- **jsPDF + jspdf-autotable (~397KB)**: movidos a `import()` dinámico
  dentro de `generatePDF`, descargados únicamente al pulsar "Descargar PDF".
- **Todas las rutas son lazy** (`React.lazy` en `src/App.tsx`), incluida
  la landing nacional, para no cargar el árbol completo de componentes
  de examen/banqueo en la primera visita.

**Resultado**: el chunk de `Results` bajó de 825KB a 43KB (−95%).

---

## Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.0.0 | - | Versión inicial con simulacro completo |
| v1.1.0 | - | Historial de puntajes, gráficos de evolución |
| v1.2.0 | - | Banqueo Histórico por curso |
| v1.3.0 | Dic 2024 | Control de acceso con confirmación, detección de fraude, justificaciones |
| v1.4.0 | Dic 2024 | CEPREUNA: Simulacro y Banqueo por semana, Auto-formateo de preguntas |
| v1.5.0 | Dic 2024 | Banqueo por Tema: normalización de cursos, CacheService, interfaz simplificada |
| v1.6.0 | Abr 2026 | **Rediseño "Editorial Andino"**: design system, identidad UNA Puno, carrusel de universidades, fotografías reales, AuthContext compartido, CourseSelector con vista lista + atajos teclado, posicionamiento inclusivo (todas las universidades del Perú) |
| v2.0.0 | Jul 2026 | **Plataforma multi-universidad**: backend reescrito en 8 módulos, rutas `/:universidad/*`, calificación en servidor con motores config-driven, motor único `PracticeSession` (−1,696 líneas), temas institucionales por universidad, code-splitting agresivo, landing nacional. Detalle completo en [`docs/CHANGELOG.md`](docs/CHANGELOG.md). |
| v2.1.0 | Jul 2026 | **Rediseño premium + Aula Virtual real**: Landing rediseñado (Dirección de Diseño v3, navbar sticky, cohete con scroll), mascota propia el lobito (9 poses, generadas con Codex `image_gen`) reemplazando el 100% de fotos de stock, navegación premium (`QuickSwitch`, tours de onboarding), páginas 404/Nosotros/FAQ/Términos, y el **Aula Virtual v2.1 desplegada en producción** (contrato `getCiclos`/`inscribirCiclo`/`getAula`/`getMisPagos`, 11 hojas nuevas en CORE, `AulaShell` con 10 secciones). Detalle completo en [`docs/CHANGELOG.md`](docs/CHANGELOG.md). |

---

## Rediseño Visual v1.6.0 — "Editorial Andino" (2026-04-20)

### Dirección estética adoptada

**"Editorial Andino"** — tipografía display audaz (Fraunces) con body limpio (Plus Jakarta Sans), paleta UNA Puno (azul profundo `#003D7A` + dorado `#D4AF37` + naranja andino `#E67E22`), patrón textil andino como acento sutil, microanimaciones craft.

Posicionamiento ampliado: plataforma gratuita para **todos los postulantes preuniversitarios del Perú** (no solo UNA Puno). Copy inclusivo: *"Hecho con amor para estudiantes preuniversitarios del Perú"*.

### Design System (`tailwind.config.js` + `src/index.css`)

#### Paleta brand
```js
brand: {
  primary: '#003D7A',   // Azul UNA oficial (escala 50-900)
  secondary: '#E67E22', // Naranja andino cálido
  accent:    '#D4AF37', // Dorado Puno
  earth:     '#8B6F47', // Tierra altiplánica
}
```

#### Tipografía
- `font-sans` → **Plus Jakarta Sans** (400-800)
- `font-display` → **Fraunces** (400/600/700/900 + italic) — solo en hero/H1
- `font-mono` → **JetBrains Mono**

Carga desde Google Fonts con `preconnect` en `index.html`.

#### Tokens de elevación
- `.shadow-elevation-1` hasta `.shadow-elevation-4` con sombras escaladas
- Border-radius: `xs` (4px) → `xl` (16px)

#### Utilidades personalizadas (`src/index.css`)
- `.gradient-text-brand` / `.gradient-text-gold` — degradados de texto
- `.glass` / `.glass-dark` — glassmorphism
- `.aurora-bg` / `.bg-mesh-deep` / `.bg-mesh-brand` / `.bg-mesh-warm` / `.bg-mesh-gold` / `.bg-gradient-hero`
- `.andean-bold` — patrón textil andino overlay
- **`.bg-andean-white`** / `.bg-andean-cream` / `.bg-andean-soft` — patrón sobre fondo claro (usado en Quiz, Banqueos, Simulacros)
- `.bg-hero-solid` / `.bg-deep-solid` / `.bg-brand-solid` — fondos sólidos con `!important` como failsafe
- `.hero-dim-overlay` / `.photo-overlay-brand` — overlays oscurecedores
- `.dots-bg` / `.dots-bg-brand` / `.paper-bg` / `.noise` — texturas
- `.corner-accent` — esquina dorada decorativa
- `.shine-hover` — barrido de luz en hover
- `.text-shadow-sm/md/lg` — sombras de texto para legibilidad sobre imágenes

#### Animaciones (`src/index.css`)
- `.animate-fade-up` / `.animate-fade-in` / `.animate-slide-in-right` / `.animate-slide-in-left`
- `.animate-float-y` / `.animate-float-slow` / `.animate-float-x` / `.animate-drift-slow`
- `.animate-blob-morph` — morph orgánico de bordes
- `.animate-gradient` — gradient shift 8s
- `.animate-shimmer` — loading shimmer
- `.animate-marquee` — scroll infinito (30s)
- `.animate-bounce-in` / `.animate-number-roll` / `.animate-ring-grow`
- `.animate-star-twinkle` / `.animate-spin-slow` / `.animate-pulse-ring`
- `.animate-score-pulse` / `.animate-confetti-burst`
- Delays: `delay-75`, `delay-150`, `delay-300`, `delay-500`, `delay-700`
- `prefers-reduced-motion` respetado globalmente

### Biblioteca de assets visuales

#### SVGs educativos (`public/illustrations/`)
- `study-hero.svg` — escritorio con libros, laptop, lápiz
- `books-stack.svg` — 4 libros apilados
- `graduation-cap.svg` — birrete académico
- `formulas.svg` — ecuaciones matemáticas flotantes
- `atom.svg` — átomo con órbitas
- `exam-paper.svg` — hoja de examen
- `calculator.svg` — calculadora científica
- `student-silhouette.svg` — estudiante leyendo
- `compass-geometry.svg` — compás + transportador
- `lightbulb-idea.svg` — bombilla con engranajes
- `mountains.svg` — silueta Andes 3 capas
- `andean-bold.svg` — patrón textil 80×80 repetible
- `dot-grid.svg` — patrón de puntos
- `constellation.svg` — 18 estrellas animadas
- `blob-brand.svg` — blob orgánico con gradient
- `paper-texture.svg` — textura de papel (feTurbulence)

#### Logos de universidades (`public/logos/`)
**Resuelto (v1.6.1)**: los 12 logos del carrusel del Landing se descargaron de Wikimedia Commons y se sirven localmente desde `public/logos/`, referenciados en `Landing.tsx` como `/simulauna/logos/{archivo}.png`:

| Sigla | Universidad | Archivo local |
|-------|-------------|-----------------|
| UNA | Nacional del Altiplano — Puno | `una.png` |
| UNAJ | Nacional de Juliaca | `unaj.png` |
| UNMSM | Mayor de San Marcos | `sanmarcos.png` |
| UNI | Nacional de Ingeniería | `uni.png` |
| UNSA | San Agustín — Arequipa | `unsa.png` |
| UNSAAC | San Antonio Abad — Cusco | `unsaac.png` |
| UNCP | Centro del Perú | `uncp.png` |
| UNFV | Federico Villarreal | `unfv.png` |
| UNALM | Agraria La Molina | `unalm.png` |
| UNT | Nacional de Trujillo | `unt.png` |
| UNP | Nacional de Piura | `unp.png` |
| UNSCH | San Cristóbal de Huamanga | `unsch.png` |

#### Fotografías (Unsplash — URLs CDN)
Verificadas con WebFetch. Usadas como `backgroundImage` con opacidades 0.08-0.22 + overlays:
- `photo-1532012197267-da84d127e765` — señorita en biblioteca (hero)
- `photo-1523240795612-9a054b0db644` — estudiantes colaborando
- `photo-1434030216411-0b793f4b4173` — cuaderno/estudio cenital
- `photo-1513258496099-48168024aec0` — ceremonia de graduación
- `photo-1509062522246-3755977927d7` — biblioteca interior
- `photo-1488521787991-ed7bbaae773c` — Perú altiplano
- `photo-1456513080510-7bf3a84b82f8` — escritorio de estudio
- `photo-1427504494785-3a9ca7044f45` — estudiante con laptop
- Avatares testimonios: `i.pravatar.cc/150?img=13/32/47`

### Cambios por componente

#### `src/components/Landing.tsx` — Rediseño completo
**Secciones (en orden):**
1. **Hero cinematográfico** `min-h-screen` con `bg-hero-solid` + foto biblioteca + mountains silhouette + 8 estrellas SVG + 2 blobs decorativos. H1 "Prepárate para la **universidad** de verdad". CTAs dorado + glass. Mockups flotantes: score card (2450/3000 con anillo SVG + 5 barras de materias) y preview pregunta. Badge "Nuevo récord".
2. **Carrusel de universidades** `animate-marquee` 30s infinito, 12 logos duplicados para loop sin cortes, grayscale → color en hover, pausa con mouse, fades laterales.
3. **4 pasos y listo** sobre `bg-mesh-deep` oscuro. 4 cards glass con badge circular dorado (medalla 3D con gradient `#F4CF5F → #D4AF37 → #A88422`), ícono Lucide, texto. Conectores con chevron dorado entre cards.
4. **Tres áreas, una meta** con 3 cards color-blocked (azul/rosa/ámbar) + SVGs decorativos por área (calculator+compass / atom+lightbulb / books+exam-paper).
5. **Stats "Hecho con amor"** sobre `bg-brand-primary-900` con IntersectionObserver para animar los 4 números al entrar en viewport.
6. **6 features** con iconos coloreados en cards `card-interactive`.
7. **Testimonios** con avatares pravatar (María Quispe, Juan Carlos Apaza, Rosa Condori Huanca).
8. **CTA final** "Tu universidad te espera a 60 preguntas" + lista de universidades.
9. **Footer** compacto con descripción inclusiva.

#### `src/context/AuthContext.tsx` — **NUEVO**
Context compartido con persistencia en `localStorage` (TTL 30min). Exporta `AuthProvider` y `useAuth()`. Usado en todos los módulos de Banqueo para evitar re-login.

```tsx
const { user, login, logout, isAuthenticated } = useAuth();
```

`App.tsx` envuelve el árbol con `<AuthProvider>`.

#### `src/components/CourseSelector.tsx` — **NUEVO**
Selector visual de cursos con:
- **Vista LIST** (default) / **GRID** con toggle persistido en localStorage
- Input de búsqueda con **autofocus**
- Navegación por teclado: `↑↓` Enter Esc
- Categorías agrupadas (Matemática/Ciencias/Lenguaje/Sociales/Idiomas) con colores
- Empty state con SVG
- Prop `compact` para forzar lista densa

#### `src/components/Quiz.tsx` — Chrome minimalista
- Header sticky glass con barra de progreso dorada (termina en accent cuando completo)
- Cronómetro `font-mono` discreto
- Footer sticky con minimapa de 60 dots agrupados cada 5
- Drawer lateral `max-w-sm` para navegador completo agrupado por asignatura
- **Atajos de teclado**: `←` / `→` navegar, `1-5` seleccionar opción
- Transiciones entre preguntas: `slide-in-right` al avanzar, `slide-in-left` al retroceder
- `navigator.vibrate(10)` al seleccionar (móvil)
- Fondo `bg-andean-white` (patrón sobre blanco)
- Modal de calificar con chips de preguntas pendientes clickables

#### `src/components/Question.tsx` — Flashcard premium
- Número de pregunta en `font-display text-5xl` con halo dorado + ring pulsante
- Opciones A-E como botones `rounded-2xl` con círculo de letra por color (A=azul, B=rosa, C=ámbar, D=verde, E=púrpura)
- Selected: `ring-4 + scale-1.02 + shadow-elevation-2` + check dorado con `animate-bounce-in`
- Imagen con `border-4 border-brand-accent/20` + caption "Clic para ampliar"
- Botón reportar error como ghost pequeño
- `corner-accent` dorado en esquina superior

#### `src/components/Results.tsx` — Hero cinematográfico
- Anillo circular SVG 280×280 animado con `strokeDasharray` desde 0 al porcentaje
- Número de score en `font-display 8xl` con `animate-number-roll`
- Si score ≥ 2400: halo + 8 confetti + animación ring-grow
- Barra de progreso al siguiente nivel ("Te faltan X pts para...")
- Si mejor puntaje: badge "Nuevo récord" con `animate-bounce-in`
- Tabs rediseñados como pills con bg-white shadow cuando activo
- Tab Gráfico: 3 insight cards (Mejor/Reforzar/Balance) + sección accionable "Asignaturas a reforzar" → link a `/banqueo-tema`
- Tab Historial: LineChart con dots dorados para mejor puntaje
- CTA final sobre `bg-mesh-brand animate-gradient` con foto biblioteca

#### `src/components/StudentForm.tsx` — Form pulido
- Stepper visual con círculos + barras gradient brand
- Componente `FloatingInput` interno con labels que suben al focus/valor
- Validación con `animate-shake` en error
- Fondo `bg-mesh-warm` + foto `studyWoman` lateral al 8% en desktop
- Modal de acceso denegado con **3 variantes** (fraude/cupo/bloqueo) color-coded
- Chip `accessDenied` preservado

#### `src/components/AreaSelector.tsx` — Color blocking
- 3 cards large (480px min) con gradientes: azul (Ing), rosa (Bio), ámbar (Soc)
- Patrón `andean-bold` overlay en cada card
- SVGs decorativos por área + estrellas twinkling
- CTA "Explorar área →" revealed on hover
- Fondo `bg-mesh-gold` + chakanas eliminadas (preferencia usuario)

#### `src/components/ExamConfirmation.tsx` — Pre-game hype
- Fondo `bg-gradient-hero` oscuro + mountains-bottom + 5 estrellas + 4 ilustraciones (books/graduation/formulas/atom)
- H1 "Es hora, {firstName}." con gradient-text-gold
- Card glass con grid 2×2 del perfil
- Instructions card con `border-l-4 border-brand-accent` y checks verdes
- CTA gigante `btn-accent-gold shine-hover` con ícono Play

#### `src/components/Banqueo.tsx` / `BanqueoCepreuna.tsx` / `SimulacroCepreuna.tsx`
- Fondo `bg-andean-white` en todos los steps claros
- `SimulacroCepreuna` preserva hero dramático oscuro `bg-mesh-deep`
- Headers con SVGs educativos contextuales
- useAuth integrado (no re-login)
- Botón "Cerrar sesión" en header del step select
- Chip "CEPREUNA" prominente dorado
- Grid de semanas S1-S16 rediseñado

#### `src/components/BanqueoPorTema.tsx` — Logo animado + selector práctico
- **Emblema animado en login**: badge circular con gradient brand + 5 iconos rotando cada 1.8s (Layers/BookOpen/Target/Lightbulb/Zap) + anillo punteado spinning + 5 puntos dorados orbitando
- CourseSelector con vista lista por defecto
- Atajo global `/` enfoca el input de búsqueda activo (curso o tema)
- Stepper visual: Curso → Tema → Cantidad
- Shimmer skeletons al cargar temas

### Skills de Claude instaladas (`~/.claude/skills/`)
Para continuar el trabajo de diseño en futuras sesiones:
- `frontend-design` (Anthropic oficial) — evita "AI slop"
- `landing-page` (jezweb) — patrones de hero/secciones
- `design-system` (jezweb) — coherencia de tokens
- `design-review` (jezweb) — crítica iterativa
- `tailwind-theme-builder` (jezweb) — migración v3→v4
- `color-palette` (jezweb) — generar escalas desde hex
- `responsiveness-check` (jezweb) — validación mobile

Invocación: `/frontend-design`, `/landing-page`, etc. Recargar con `/reload-plugins` tras actualizar.

### Accesibilidad (WCAG AA)
- Contraste texto verificado en todas las secciones (texto blanco sobre fondo oscuro sólido, texto oscuro sobre claro)
- `<img>` decorativas con `aria-hidden="true"` + `pointer-events-none`
- Focus rings preservados en inputs y botones
- `aria-label`, `aria-pressed`, `aria-current` en Quiz
- Atajos de teclado con respeto a `input`/`textarea`/`contentEditable`
- `prefers-reduced-motion` respetado
- Touch targets mínimo 44×44px (WCAG)

### Pendientes para continuar

1. ~~**Reemplazar URLs de Wikipedia por logos locales**~~ — **Resuelto (v1.6.1)**: los 12 PNGs se descargaron a `public/logos/` y `Landing.tsx` referencia rutas locales `/simulauna/logos/{archivo}.png`.
2. ~~**Reducir animaciones del hero**~~ — **Resuelto (v1.6.1)**: bajadas de 8 a 4 `StarTwinkle` en el hero del Landing.
3. ~~**Replicar logo animado** de `BanqueoPorTema` en `Banqueo.tsx`, `BanqueoCepreuna.tsx`, `SimulacroCepreuna.tsx` para consistencia~~ — **Superado (v2.0.0)**: los tres módulos ahora comparten un único motor `PracticeSession` (ver [El motor único de banqueo/CEPRE](#el-motor-único-de-banqueocepre-srccomponentspractice)), por lo que la UI (incluido el logo animado) ya es consistente por construcción en vez de replicada manualmente.
4. **Fotos de avatares reales**: los testimonios usan `pravatar.cc` (placeholders). Si hay estudiantes reales con consentimiento, sustituir.
5. **Carrusel de logos**: el marquee es infinito. Considerar añadir click handlers que lleven a una página/modal con info de cada universidad y tipos de exámenes.
6. **Dark mode**: no implementado aún. El design system está preparado con `brand.*` — requiere duplicar scales para `dark:*`.
7. **Fotografías Unsplash**: dependencia externa CDN. Para producción robusta, considerar descargar y servir localmente desde `public/photos/`.
8. **Tests visuales**: no hay snapshots ni e2e (Playwright) — considerar para prevenir regresiones en rediseños futuros.
9. ~~**Acentos por universidad**~~ — **Ampliado (v2.0.0)**: dejó de ser un acento puntual y pasó a ser un sistema completo de temas institucionales (`src/theme/universityThemes.ts`, 13 universidades investigadas) aplicado en Landing, `UniversityPage`, `Quiz`, `Results`, `StudentForm`, `ExamConfirmation` y `PracticeSession`. Ver [Sistema de Temas Institucionales](#sistema-de-temas-institucionales-v2) — el color de UNAJ sigue pendiente de fuente oficial verificable.

---

## Pendientes Reales

Lista viva de pendientes tras la v2.1.0 (no confundir con la lista histórica de la sección anterior, que documenta el rediseño v1.6.0):

1. **Pesos oficiales de UNMSM y UNI**: la plataforma soporta que cada universidad tenga su propia `config_examen`/`config_escala`, pero UNMSM y UNI todavía no tienen los pesos/ponderaciones oficiales de sus exámenes reales cargados — solo UNA (motor `suma_ponderada`, producción) y UNSA (motor `decimas`, piloto con datos dummy) están configuradas hoy.
2. **Carreras por universidad**: la lista de carreras filtradas por área/división (ver [Carreras por Área](#carreras-por-área)) sigue siendo específica de UNA. Falta modelar carreras por universidad en el registro para que `StudentForm` las resuelva dinámicamente igual que ya hace con procesos y colores.
3. **Color institucional de UNAJ**: sin fuente oficial verificable (manual de marca/estatuto); usa el neutral "Editorial Andino" (`#003D7A`/`#D4AF37`) como placeholder de baja confianza en `src/theme/universityThemes.ts`.
4. ~~**Consolidar los tres módulos de banqueo/CEPRE en un solo motor**~~ — **Hecho**: `PracticeSession` (ver arriba), −1,696 líneas (−44%).
5. **Administración de `CORE.permisos`**: no hay todavía un endpoint/UI para dar acceso a banqueo/simulacro extra por universidad — se edita la hoja a mano, igual que hoy se edita `confirmado` para UNA (ver TODOs en `google-apps-script/README.md`).
6. **Motor `vector_canal`**: implementado con la misma fórmula de suma ponderada por canal; si una universidad (p.ej. UNI) necesita una agregación de canales distinta (máximo entre canales en vez de suma), hay que extender `scoreBySubject_` en `scoring.gs`.
7. **Indexado/cache de `CORE.usuarios`**: las lecturas de anti-fraude global hacen `getDataRange().getValues()` completo en cada llamada, sin cache — aceptable hoy, revisar si `CORE.usuarios` crece mucho.
8. **Purga de `CORE.sesiones`**: la hoja espejo de sesiones de examen crece indefinidamente; falta un job periódico que archive o borre sesiones viejas.
9. ~~**Aula Virtual sin backend**~~ — **Hecho (v2.1.0)**: contrato `getCiclos`/`inscribirCiclo`/`getAula`/`getMisPagos` implementado en `aula.gs`, 11 hojas nuevas en CORE, desplegado en producción y verificado con `healthCheckAula()` (5/5 PASS) contra un ciclo demo real. Ver [Aula Virtual (v2.1)](#aula-virtual-v21).
10. **Abrir el primer ciclo real del Aula Virtual**: hoy solo existe el ciclo demo (`una-demo-2026-1`, sembrado por `seedAulaDemo()`). Ninguna universidad tiene todavía una fila real en `ciclos` con `estado=inscripciones_abiertas` — hasta que el coordinador de una universidad la cree a mano, todos los alumnos siguen viendo la vista previa de `AulaComingSoon` en vez de un Aula matriculable de verdad.
11. **Celdas de colores/logos del CORE pendientes de edición manual**: `CORE.universidades` tiene columnas `color_primario`/`color_secundario`/`logo` por fila (ver `google-apps-script/README.md` §2), pero solo `una` y `unsa` (piloto) están cargadas hoy — el resto de las 13 universidades mapeadas en `src/theme/universityThemes.ts` necesita que alguien complete esas celdas a mano en el spreadsheet CORE antes de poder pasarlas de `oculta` a `activa`/`piloto`.
12. **Health checks del Aula Virtual no corridos aún contra un proyecto de Apps Script propio nuevo**: `aula.gs` se validó con `node --check` y se verificó `healthCheckAula()` en el proyecto de producción existente, pero cualquier fork/nuevo deploy debe correr `seedAulaDemo()` + `healthCheckAula()` de nuevo antes de confiar en el flujo (ver `google-apps-script/README.md` "Riesgos y TODOs pendientes").

---

## Créditos

Desarrollado para los **estudiantes preuniversitarios del Perú** — con foco inicial y fundacional en la **Universidad Nacional del Altiplano - Puno**, y desde la v2.0.0 escalable como plataforma nacional a San Marcos, UNI, UNSA, UNSAAC, UNCP, UNFV, UNALM, UNT, UNP, UNSCH, UNAJ y más.

Plataforma: **SimulaUNA v2.1.0**

Preguntas reales de exámenes de admisión desde 1993 hasta el último proceso.

Hecho con amor en Puno, Perú — para todos los estudiantes del país. *SimulaUNA: elige una universidad, simula su examen real.*
