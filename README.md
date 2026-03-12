# SimulaUNA - Plataforma de Simulacros de Examen de Admisión

Plataforma web para realizar simulacros del examen de admisión de la **Universidad Nacional del Altiplano (UNA) Puno, Perú**. Permite a los estudiantes practicar con preguntas reales organizadas por área académica y recibir retroalimentación detallada de su desempeño.

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
- [Versiones](#versiones)

---

## Características

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
┌─────────────────┐         ┌──────────────────────┐
│                 │   GET   │                      │
│   React App     │◄───────►│  Google Apps Script  │
│   (Frontend)    │  JSON   │      (API REST)      │
│                 │         │                      │
└─────────────────┘         └──────────┬───────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │   Google Sheets      │
                            │   (Base de datos)    │
                            │                      │
                            │  - Configuración x3  │
                            │  - Banco preguntas   │
                            │  - usuarios          │
                            │  - historial_puntajes│
                            │  - confirmado        │
                            └──────────────────────┘
```

### Endpoints de la API

> **Nota:** La documentación detallada de endpoints se mantiene de forma privada. Consultar el código fuente en `google-apps-script/api.gs` y `src/services/api.ts` para referencia.

---

## Estructura del Proyecto

```
simulauna/
├── src/
│   ├── components/           # Componentes React
│   │   ├── Landing.tsx       # Página de inicio con features
│   │   ├── StudentForm.tsx   # Formulario 2 pasos (datos + área/carrera)
│   │   ├── AreaSelector.tsx  # Cards de selección de área
│   │   ├── ExamConfirmation.tsx  # Confirmación antes del examen
│   │   ├── Quiz.tsx          # Examen con navegador y cronómetro
│   │   ├── Question.tsx      # Pregunta individual con formato HTML
│   │   ├── Results.tsx       # Resultados con 4 tabs (Revisión, Gráfico, Detalle, Historial)
│   │   ├── Banqueo.tsx       # Práctica por curso con login y justificaciones
│   │   ├── BanqueoCepreuna.tsx # Banqueo específico CEPREUNA
│   │   ├── BanqueoPorTema.tsx  # Banqueo por tema con normalización
│   │   ├── SimulacroCepreuna.tsx # Simulacro CEPREUNA por semana
│   │   ├── PDFGenerator.tsx  # Generador de reporte PDF
│   │   └── index.ts          # Exports
│   │
│   ├── hooks/
│   │   ├── useExam.ts        # Store Zustand: estado del examen
│   │   └── useTimer.ts       # Hook useStopwatch para cronómetro
│   │
│   ├── services/
│   │   └── api.ts            # Cliente API: fetchConfig, fetchQuestions,
│   │                         # registerUser, saveScore, getUserHistory
│   │
│   ├── types/
│   │   └── index.ts          # Interfaces: Question, Answer, Student, etc.
│   │
│   ├── utils/
│   │   └── calculations.ts   # formatTime, formatNumber, indexToLetter, etc.
│   │
│   ├── App.tsx               # Router principal (5 rutas)
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globales + animaciones
│
├── google-apps-script/
│   └── api.gs                # Backend completo (copiar a Apps Script)
│
├── public/
│   └── favicon.svg
│
├── .env.example              # Variables de entorno ejemplo
├── package.json
├── tailwind.config.js        # Incluye safelist para colores dinámicos
├── vite.config.ts
└── tsconfig.json
```

---

## Configuración del Backend (Google Sheets + Apps Script)

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

1. Ir a Google Apps Script
2. Crear nuevo proyecto
3. Copiar el contenido de `google-apps-script/api.gs`
4. Actualizar `SPREADSHEET_ID` con el ID de tu Google Sheets:
   ```javascript
   const SPREADSHEET_ID = 'TU_ID_DEL_SPREADSHEET';
   ```
5. Desplegar como aplicación web:
   - Implementar > Nueva implementación
   - Tipo: Aplicación web
   - Ejecutar como: Yo
   - Quién tiene acceso: **Cualquier persona**
6. Copiar la URL generada

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

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Landing    │───►│  Registro    │───►│  Selección   │
│   (/)        │    │  Paso 1:     │    │  Paso 2:     │
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
│ - Gráfico    │    │ - 60 preguntas│   │              │
│ - Detalle    │    │              │    │              │
│ - Historial  │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Componentes por Ruta

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | Landing | Página de bienvenida con features, stats, áreas |
| `/registro` | StudentForm | Formulario 2 pasos: datos personales + área/carrera |
| `/confirmar` | ExamConfirmation | Confirmación con instrucciones del examen |
| `/examen` | Quiz | Interfaz del examen con cronómetro y navegador |
| `/resultados` | Results | Resultados con 4 tabs: Revisión, Gráfico, Detalle, Historial |
| `/banqueo` | Banqueo | Práctica por curso (solo usuarios confirmados) |
| `/banqueo-cepreuna` | BanqueoCepreuna | Banqueo específico del CEPREUNA |
| `/banqueo-tema` | BanqueoPorTema | Práctica por curso y tema específico |
| `/simulacro-cepreuna` | SimulacroCepreuna | Simulacro completo del CEPREUNA |

---

## Sistema de Puntuación

### Niveles de Desempeño

| Nivel | Puntaje Mínimo | Porcentaje | Color |
|-------|----------------|------------|-------|
| Excelente | ≥ 2400 pts | 80% | Verde |
| Bueno | ≥ 1800 pts | 60% | Azul |
| Regular | ≥ 1200 pts | 40% | Ámbar |
| Necesita práctica | < 1200 pts | <40% | Rojo |

### Cálculo de Puntaje

1. Cada asignatura tiene un **puntaje máximo** definido en la configuración
2. El puntaje por pregunta = `maxScore / questionCount`
3. Solo las **respuestas correctas** suman puntos
4. **Puntaje total máximo**: 3000 puntos

---

## Sistema de Usuarios y Historial

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
// Áreas disponibles
type AreaType = 'Ingenierías' | 'Sociales' | 'Biomédicas';

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

## Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.0.0 | - | Versión inicial con simulacro completo |
| v1.1.0 | - | Historial de puntajes, gráficos de evolución |
| v1.2.0 | - | Banqueo Histórico por curso |
| v1.3.0 | Dic 2024 | Control de acceso con confirmación, detección de fraude, justificaciones |
| v1.4.0 | Dic 2024 | CEPREUNA: Simulacro y Banqueo por semana, Auto-formateo de preguntas |
| v1.5.0 | Dic 2024 | Banqueo por Tema: normalización de cursos, CacheService, interfaz simplificada |

---

## Créditos

Desarrollado para la **Universidad Nacional del Altiplano - Puno, Perú**

Plataforma: SimulaUNA v1.5.0

Preguntas reales de exámenes de admisión desde 1993 hasta el último proceso.
