# Estrategia: Banqueo CEPREUNA

## Sistema Actual de Bancos

### Estructura Actual
```
SUBJECT_SHEETS = {
  'Aritmética':     'Banco_Aritmética',
  'Álgebra':        'Banco_Álgebra',
  'Geometría':      'Banco_Geometría',
  ...
}
```

### Cómo Funciona Actualmente

1. **Mapeo directo**: Nombre del curso → Nombre de la hoja
2. **Una hoja por curso**: 18 hojas `Banco_XXX`
3. **Sin filtro por área**: Todas las áreas usan el mismo banco
4. **Columna `NOMBRE DEL ARCHIVO`**: Identifica el examen de origen (ej: "Examen_2024.pdf")

### Columnas de cada Banco
```
| Question Text | Question Type | Option 1-5 | Correct Answer | Image Link | NUMERO | CURSO | TEMA | SUBTEMA | NOMBRE DEL ARCHIVO | JUSTIFICACION |
```

---

## Requerimiento CEPREUNA

### Características
- **18 cursos por área** (no 18 cursos totales)
- **3 áreas**: ING, BIO, SOC
- **16 semanas** de contenido
- **Cursos diferentes por área**:
  - ING: "BIOLOGÍA Y ANATOMÍA" (junto)
  - BIO: "BIOLOGÍA" y "ANATOMÍA" (separados)
  - SOC: "BIOLOGÍA Y ANATOMÍA" (junto)

### Lista de Cursos por Área

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INGENIERÍAS (ING)                          │
├─────────────────────────────────────────────────────────────────────┤
│ ARITMETICA S1 ING          │ ÁLGEBRA S1 ING                        │
│ GEOMETRÍA S1 ING           │ TRIGONOMETRÍA S1 ING                  │
│ FÍSICA S1 ING              │ QUÍMICA S1 ING                        │
│ BIOLOGÍA Y ANATOMÍA S1 ING │ PSICOLOGÍA Y FILOSOFÍA S1 ING         │
│ HISTORIA S1 ING            │ EDUCACIÓN CÍVICA S1 ING               │
│ ECONOMÍA S1 ING            │ COMUNICACIÓN Y LITERATURA S1 ING      │
│ RM S1 ING                  │ RAZONAMIENTO VERBAL S1 ING            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          BIOMÉDICAS (BIO)                           │
├─────────────────────────────────────────────────────────────────────┤
│ ARITMETICA S1 BIO          │ ANATOMÍA S1 BIO (¡SEPARADO!)          │
│ BIOLOGÍA S1 BIO            │ QUÍMICA S1 BIO                        │
│ FÍSICA S1 BIO              │ PSICOLOGÍA Y FILOSOFÍA S1 BIO         │
│ HISTORIA S1 BIO            │ EDUCACIÓN CÍVICA S1 BIO               │
│ ECONOMÍA S1 BIO            │ COMUNICACIÓN Y LITERATURA S1 BIO      │
│ RM S1 BIO                  │ RAZONAMIENTO VERBAL S1 BIO            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                           SOCIALES (SOC)                            │
├─────────────────────────────────────────────────────────────────────┤
│ MATEMÁTICA S1 SOC          │ BIOLOGÍA Y ANATOMÍA S1 SOC            │
│ FÍSICA S1 SOC              │ QUÍMICA S1 SOC                        │
│ PSICOLOGÍA Y FILOSOFÍA SOC │ HISTORIA S1 SOC                       │
│ GEOGRAFÍA S1 SOC           │ EDUCACIÓN CÍVICA S1 SOC               │
│ ECONOMÍA S1 SOC            │ COMUNICACIÓN S1 SOC (solo comunicación)│
│ LITERATURA S1 SOC          │ RAZONAMIENTO MATEMÁTICO S1 SOC        │
│ RAZONAMIENTO VERBAL S1 SOC │                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Modos de Práctica CEPREUNA

#### MODO 1: Cuadernillo Específico (Banqueo)
- Filtrar por `NOMBRE DEL ARCHIVO` = "S14 SOC"
- **SIN selector de cantidad** → Trae TODAS las preguntas del cuadernillo
- Máximo esperado: 20-25 preguntas por cuadernillo
- Ejemplo: "Dame TODAS las preguntas de BIOLOGÍA del cuadernillo S14 SOC"

#### MODO 2: Por Curso General (Banqueo)
- Mezclar preguntas de las 3 áreas (ING + BIO + SOC)
- **CON selector de cantidad**: 10, 15, 20
- Ejemplo: "Dame 15 preguntas de BIOLOGÍA mezclando todas las áreas"

#### MODO 3: Simulacro CEPREUNA (NUEVO - Examen Completo)
- **60 preguntas** igual que el simulacro de admisión
- Usa la **misma configuración** de áreas (Configuración_Ingenierías, etc.)
- Pero toma preguntas de las **hojas CEPRE_** en lugar de Banco_
- Filtro opcional por semana o todas las semanas
- Ejemplo: "Simulacro completo de Ingenierías con preguntas CEPREUNA"

---

## Opciones de Implementación

### OPCIÓN A: Una Sola Hoja Grande
```
Hoja: "CEPRE_Banco_General"

Columnas adicionales:
| ... | AREA_CEPRE | SEMANA | CUADERNILLO |
| ... | ING        | S1     | S1 ING      |
| ... | BIO        | S14    | S14 BIO     |
```

**Ventajas:**
- ✅ Solo 1 hoja nueva
- ✅ Filtros simples por columna
- ✅ Fácil de mantener

**Desventajas:**
- ❌ Hoja muy grande (16 semanas × 3 áreas × ~20 preguntas/curso = ~15,000+ filas)
- ❌ Puede ser más lenta la búsqueda

---

### OPCIÓN B: Hojas por Curso (RECOMENDADA)
```
Hojas:
- CEPRE_Aritmética
- CEPRE_Álgebra
- CEPRE_Biología
- CEPRE_Anatomía
- CEPRE_BiologíaAnatomía
- CEPRE_Matemática
- CEPRE_Comunicación
- CEPRE_ComunicaciónLiteratura
- CEPRE_Literatura
- CEPRE_Geografía
- ... (total ~20-25 hojas)

Columnas de cada hoja:
| Question Text | ... | AREA | SEMANA | CUADERNILLO |
| ¿Cuál es...?  | ... | ING  | S1     | S1 ING      |
| ¿Cuál es...?  | ... | BIO  | S14    | S14 BIO     |
```

**Ventajas:**
- ✅ Organización clara por tema
- ✅ Hojas de tamaño manejable (~500-1000 filas c/u)
- ✅ Permite ambos modos de filtrado
- ✅ Compatible con sistema actual

**Desventajas:**
- ❌ ~25 hojas nuevas (total ~45 hojas)
- ❌ Algunos cursos son "variantes" (Biología vs BiologíaAnatomía)

---

### OPCIÓN C: Hojas por Curso-Área
```
Hojas:
- CEPRE_Biología_BIO
- CEPRE_Biología_SOC
- CEPRE_BiologíaAnatomía_ING
- CEPRE_BiologíaAnatomía_SOC
- CEPRE_Anatomía_BIO
- ... (total ~40-50 hojas)
```

**Ventajas:**
- ✅ Máxima especificidad
- ✅ Sin filtros necesarios

**Desventajas:**
- ❌ Demasiadas hojas (~50+ total)
- ❌ Difícil mantenimiento
- ❌ Combinar áreas requiere leer múltiples hojas

---

## RECOMENDACIÓN: OPCIÓN B

### Estructura Propuesta

```
Google Sheets (~45 hojas total)
├── Configuración (3 hojas existentes)
│   ├── Configuración_Ingenierías
│   ├── Configuración_Sociales
│   └── Configuración_Biomédicas
│
├── Bancos Históricos (18 hojas existentes)
│   ├── Banco_Aritmética
│   ├── Banco_Álgebra
│   └── ...
│
├── Bancos CEPREUNA (nuevas ~20-25 hojas)
│   ├── CEPRE_Aritmética
│   ├── CEPRE_Álgebra
│   ├── CEPRE_Geometría
│   ├── CEPRE_Trigonometría
│   ├── CEPRE_Matemática         ← BIO y SOC usan este nombre
│   ├── CEPRE_Física
│   ├── CEPRE_Química
│   ├── CEPRE_Biología           ← BIO usa este (separado)
│   ├── CEPRE_Anatomía           ← BIO usa este (separado)
│   ├── CEPRE_BiologíaAnatomía   ← ING y SOC usan este (junto)
│   ├── CEPRE_PsicologíaFilosofía
│   ├── CEPRE_Geografía          ← Solo SOC
│   ├── CEPRE_Historia
│   ├── CEPRE_EducaciónCívica
│   ├── CEPRE_Economía
│   ├── CEPRE_Comunicación       ← Solo SOC usa este nombre
│   ├── CEPRE_ComunicaciónLiteratura ← ING y BIO usan este
│   ├── CEPRE_Literatura         ← Solo SOC
│   ├── CEPRE_RazonamientoMatemático (RM)
│   └── CEPRE_RazonamientoVerbal
│
└── Sistema (hojas existentes)
    ├── usuarios
    ├── historial_puntajes
    └── confirmado
```

### Estructura de Columnas (Hojas CEPRE_)

```
| A              | B             | C        | D        | E        | F        | G        | H              | I                | J          | K      | L    | M       | N          | O                   | P             | Q    | R       |
|----------------|---------------|----------|----------|----------|----------|----------|----------------|------------------|------------|--------|------|---------|------------|---------------------|---------------|------|---------|
| Question Text  | Question Type | Option 1 | Option 2 | Option 3 | Option 4 | Option 5 | Correct Answer | Time in seconds  | Image Link | NUMERO | CURSO| TEMA    | SUBTEMA    | NOMBRE DEL ARCHIVO  | JUSTIFICACION | AREA | SEMANA  |
| ¿Cuál es el...?| Multiple Choice| 10      | 20       | 30       | 40       | 50       | 3              | 180              |            | 1      | Arit | Enteros | Operaciones| S1 ING              | Porque...     | ING  | S1      |
```

**Columnas nuevas:**
- **AREA**: ING, BIO, SOC
- **SEMANA**: S1, S2, S3, ... S16

**Columna existente (reutilizada):**
- **NOMBRE DEL ARCHIVO**: "S1 ING", "S14 BIO", etc. (formato: `S{semana} {área}`)

---

## Mapeo de Cursos Propuesto

```javascript
// Nuevo mapeo para CEPREUNA
const CEPRE_SUBJECT_SHEETS = {
  // Cursos comunes (mismo nombre en las 3 áreas)
  'Aritmética': 'CEPRE_Aritmética',
  'Álgebra': 'CEPRE_Álgebra',
  'Geometría': 'CEPRE_Geometría',
  'Trigonometría': 'CEPRE_Trigonometría',
  'Física': 'CEPRE_Física',
  'Química': 'CEPRE_Química',
  'Psicología y Filosofía': 'CEPRE_PsicologíaFilosofía',
  'Historia': 'CEPRE_Historia',
  'Educación Cívica': 'CEPRE_EducaciónCívica',
  'Economía': 'CEPRE_Economía',
  'Razonamiento Matemático': 'CEPRE_RazonamientoMatemático',
  'RM': 'CEPRE_RazonamientoMatemático',
  'Razonamiento Verbal': 'CEPRE_RazonamientoVerbal',

  // Cursos específicos por área
  'Biología': 'CEPRE_Biología',                    // BIO solo
  'Anatomía': 'CEPRE_Anatomía',                    // BIO solo
  'Biología y Anatomía': 'CEPRE_BiologíaAnatomía', // ING y SOC
  'Matemática': 'CEPRE_Matemática',                // BIO y SOC
  'Comunicación': 'CEPRE_Comunicación',            // SOC solo
  'Comunicación y Literatura': 'CEPRE_ComunicaciónLiteratura', // ING y BIO
  'Literatura': 'CEPRE_Literatura',                // SOC solo
  'Geografía': 'CEPRE_Geografía'                   // SOC solo
};
```

---

## Flujo de Usuario Propuesto

### Landing Page (Actualizada)
```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              SimulaUNA                                        │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐ │
│  │   Simulacro     │  │   Simulacro     │  │    Banqueo      │  │  Banqueo │ │
│  │    Admisión     │  │   CEPREUNA      │  │   Histórico     │  │ CEPREUNA │ │
│  │                 │  │    (NUEVO)      │  │                 │  │  (NUEVO) │ │
│  │ Examen 60 preg  │  │ Examen 60 preg  │  │ Por curso       │  │ Por      │ │
│  │ Bancos 1993+    │  │ Bancos CEPRE    │  │ (exámenes 1993+)│  │ semana/  │ │
│  │                 │  │                 │  │                 │  │ curso    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Flujo Simulacro CEPREUNA (60 preguntas - Examen Completo)
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Registro   │───►│  Selección   │───►│ Confirmación │───►│   Examen     │
│  DNI + Datos │    │              │    │              │    │  60 preguntas│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                                        │
                    ┌──────┴──────┐                                 ▼
                    ▼             ▼                          ┌──────────────┐
             ┌───────────┐  ┌───────────┐                    │  Resultados  │
             │   ÁREA    │  │  SEMANA   │                    │  + Historial │
             │ ING/BIO/  │  │ (opcional)│                    └──────────────┘
             │    SOC    │  │  S1-S16   │
             └───────────┘  │ o TODAS   │
                           └───────────┘

CLAVE: Usa Configuración_Ingenierías/Sociales/Biomédicas (misma distribución)
       Pero toma preguntas de hojas CEPRE_ en lugar de Banco_
```

### Flujo Banqueo CEPREUNA (Práctica Libre)
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Login      │───►│  Selección   │───►│  Filtros     │───►│   Quiz       │
│  DNI + Email │    │  de Modo     │    │              │    │  + Resultados│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌─────────────────┐       ┌─────────────────┐
      │     MODO 1      │       │     MODO 2      │
      │   CUADERNILLO   │       │  CURSO GENERAL  │
      │   ESPECÍFICO    │       │                 │
      │                 │       │                 │
      │ - Área (ING/    │       │ - Curso         │
      │   BIO/SOC)      │       │ - Cantidad:     │
      │ - Semana (S1-16)│       │   10, 15, 20    │
      │ - Curso         │       │                 │
      │                 │       │ (mezcla ING +   │
      │ SIN selector    │       │  BIO + SOC)     │
      │ de cantidad     │       │                 │
      │                 │       │                 │
      │ Trae TODAS las  │       │                 │
      │ preguntas del   │       │                 │
      │ cuadernillo     │       │                 │
      │ (máx 20-25)     │       │                 │
      └─────────────────┘       └─────────────────┘
```

---

## Endpoints Nuevos Propuestos

| Endpoint | Parámetros | Descripción |
|----------|------------|-------------|
| `?action=getCepreQuestions` | course, area, semana, count (opcional) | Preguntas del Banqueo CEPREUNA |
| `?action=getCepreSimulacro` | area, semana (opcional) | Simulacro completo 60 preg de CEPRE |
| `?action=getCepreCourses` | area (opcional) | Lista de cursos disponibles por área |
| `?action=getCepreSemanas` | course, area (opcional) | Semanas disponibles para un curso |

### Ejemplo de Llamadas

```javascript
// ═══════════════════════════════════════════════════════════════
// SIMULACRO CEPREUNA (60 preguntas - Examen Completo)
// ═══════════════════════════════════════════════════════════════

// Simulacro CEPREUNA de Ingenierías (todas las semanas mezcladas)
?action=getCepreSimulacro&area=Ingenierías
// Retorna: 60 preguntas según Configuración_Ingenierías pero de hojas CEPRE_

// Simulacro CEPREUNA de Biomédicas, solo semana 14
?action=getCepreSimulacro&area=Biomédicas&semana=S14
// Retorna: 60 preguntas de S14 BIO según configuración

// ═══════════════════════════════════════════════════════════════
// BANQUEO CEPREUNA - MODO 1: Cuadernillo Específico
// ═══════════════════════════════════════════════════════════════

// "Dame TODAS las preguntas de BIOLOGÍA del cuadernillo S14 BIO"
?action=getCepreQuestions&course=Biología&area=BIO&semana=S14
// Retorna: TODAS las preguntas (sin límite) - máximo ~20-25

// ═══════════════════════════════════════════════════════════════
// BANQUEO CEPREUNA - MODO 2: Curso General
// ═══════════════════════════════════════════════════════════════

// "Dame 15 preguntas de QUÍMICA mezclando ING, BIO y SOC"
?action=getCepreQuestions&course=Química&area=ALL&count=15
// Retorna: 15 preguntas aleatorias de las 3 áreas combinadas

// ═══════════════════════════════════════════════════════════════
// AUXILIARES
// ═══════════════════════════════════════════════════════════════

// Lista de cursos para área BIO
?action=getCepreCourses&area=BIO
// Retorna: ["Aritmética", "Biología", "Anatomía", "Química", ...]

// Semanas disponibles para Biología en área BIO
?action=getCepreSemanas&course=Biología&area=BIO
// Retorna: ["S1", "S2", "S3", ..., "S16"]
```

---

## Comparativa: Simulacro Admisión vs Simulacro CEPREUNA

| Aspecto | Simulacro Admisión | Simulacro CEPREUNA |
|---------|-------------------|-------------------|
| **Preguntas** | 60 | 60 |
| **Configuración** | Configuración_X | Configuración_X (MISMA) |
| **Fuente de preguntas** | Banco_X (1993+) | CEPRE_X (semanas actuales) |
| **Distribución por curso** | Igual | Igual |
| **Filtro por semana** | NO | SÍ (opcional) |
| **Puntaje máximo** | 3000 | 3000 |
| **Tiempo** | Libre | Libre |
| **Historial** | Sí | Sí (separado) |

---

## Rendimiento: ¿50 Hojas es Lento?

### Respuesta Corta: NO, si se hace bien

### Factores de Rendimiento

1. **Google Apps Script** solo abre las hojas que necesita:
   ```javascript
   // Esto NO abre todas las hojas
   const sheet = ss.getSheetByName('CEPRE_Biología');
   // Solo abre "CEPRE_Biología"
   ```

2. **Lectura por hoja** es O(1) respecto al número total de hojas

3. **Cuellos de botella reales:**
   - Tamaño de cada hoja (filas)
   - Llamadas múltiples a getSheetByName()
   - Procesamiento de datos en memoria

### Benchmark Estimado

| Hojas en Spreadsheet | Tiempo getSheetByName() |
|---------------------|-------------------------|
| 20 hojas            | ~50ms                   |
| 50 hojas            | ~50ms (mismo)           |
| 100 hojas           | ~50ms (mismo)           |

**Conclusión:** El número de hojas NO afecta significativamente el rendimiento.

---

## Plan de Implementación

### Fase 1: Crear Hojas en Google Sheets

#### Lista de Hojas CEPRE a Crear (20 hojas)

| # | Nombre de la Hoja | Áreas que la usan | Notas |
|---|-------------------|-------------------|-------|
| 1 | `CEPRE_Aritmética` | ING, BIO | Ambas áreas |
| 2 | `CEPRE_Álgebra` | ING | Solo Ingenierías |
| 3 | `CEPRE_Geometría` | ING | Solo Ingenierías |
| 4 | `CEPRE_Trigonometría` | ING | Solo Ingenierías |
| 5 | `CEPRE_Matemática` | BIO, SOC | Biomédicas y Sociales (agrupa Arit+Álg+Geom+Trig) |
| 6 | `CEPRE_Física` | ING, BIO, SOC | Las 3 áreas |
| 7 | `CEPRE_Química` | ING, BIO, SOC | Las 3 áreas |
| 8 | `CEPRE_Biología` | BIO | Solo Biomédicas (separado de Anatomía) |
| 9 | `CEPRE_Anatomía` | BIO | Solo Biomédicas (separado de Biología) |
| 10 | `CEPRE_BiologíaAnatomía` | ING, SOC | Ingenierías y Sociales (juntos) |
| 11 | `CEPRE_PsicologíaFilosofía` | ING, BIO, SOC | Las 3 áreas |
| 12 | `CEPRE_Historia` | ING, BIO, SOC | Las 3 áreas |
| 13 | `CEPRE_Geografía` | SOC | Solo Sociales |
| 14 | `CEPRE_EducaciónCívica` | ING, BIO, SOC | Las 3 áreas |
| 15 | `CEPRE_Economía` | ING, BIO, SOC | Las 3 áreas |
| 16 | `CEPRE_Comunicación` | SOC | Solo Sociales |
| 17 | `CEPRE_ComunicaciónLiteratura` | ING, BIO | Ingenierías y Biomédicas |
| 18 | `CEPRE_Literatura` | SOC | Solo Sociales |
| 19 | `CEPRE_RazonamientoMatemático` | ING, BIO, SOC | Las 3 áreas (RM) |
| 20 | `CEPRE_RazonamientoVerbal` | ING, BIO, SOC | Las 3 áreas |

#### Estructura de Columnas para CADA Hoja CEPRE

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  A             │  B            │  C       │  D       │  E       │  F       │  G       │  H              │  I   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Question Text  │ Question Type │ Option 1 │ Option 2 │ Option 3 │ Option 4 │ Option 5 │ Correct Answer  │ Time │
│                │               │          │          │          │          │          │ (1-5)           │      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  J           │  K      │  L     │  M      │  N        │  O                  │  P             │  Q    │  R      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Image Link   │ NUMERO  │ CURSO  │ TEMA    │ SUBTEMA   │ NOMBRE DEL ARCHIVO  │ JUSTIFICACION  │ AREA  │ SEMANA  │
│ (opcional)   │         │        │         │           │ (ej: S14 BIO)       │ (opcional)     │       │         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Columnas Detalladas

| Columna | Tipo | Obligatorio | Descripción | Ejemplo |
|---------|------|-------------|-------------|---------|
| A - Question Text | Texto | ✅ SÍ | Texto de la pregunta | ¿Cuál es el valor de x...? |
| B - Question Type | Texto | ✅ SÍ | Siempre "Multiple Choice" | Multiple Choice |
| C - Option 1 | Texto | ✅ SÍ | Primera opción | 10 |
| D - Option 2 | Texto | ✅ SÍ | Segunda opción | 20 |
| E - Option 3 | Texto | ✅ SÍ | Tercera opción | 30 |
| F - Option 4 | Texto | ✅ SÍ | Cuarta opción | 40 |
| G - Option 5 | Texto | ❌ NO | Quinta opción (si existe) | 50 |
| H - Correct Answer | Número | ✅ SÍ | Número de opción correcta (1-5) | 3 |
| I - Time in seconds | Número | ❌ NO | Tiempo (se ignora, usamos 180) | 180 |
| J - Image Link | URL | ❌ NO | Link a imagen (si tiene) | https://... |
| K - NUMERO | Número | ❌ NO | Número de pregunta original | 1 |
| L - CURSO | Texto | ❌ NO | Nombre del curso | Aritmética |
| M - TEMA | Texto | ❌ NO | Tema de la pregunta | Números enteros |
| N - SUBTEMA | Texto | ❌ NO | Subtema específico | Operaciones |
| **O - NOMBRE DEL ARCHIVO** | Texto | ✅ SÍ | **Cuadernillo de origen** | **S14 BIO** |
| P - JUSTIFICACION | Texto | ❌ NO | Explicación de la respuesta | Porque según el teorema... |
| **Q - AREA** | Texto | ✅ SÍ | **Área: ING, BIO o SOC** | **BIO** |
| **R - SEMANA** | Texto | ✅ SÍ | **Semana: S1 a S16** | **S14** |

#### Ejemplo de Fila de Datos

```
| Question Text                        | Question Type   | Option 1 | Option 2 | Option 3 | Option 4 | Option 5 | Correct Answer | Time | Image Link | NUMERO | CURSO    | TEMA     | SUBTEMA | NOMBRE DEL ARCHIVO | JUSTIFICACION           | AREA | SEMANA |
|--------------------------------------|-----------------|----------|----------|----------|----------|----------|----------------|------|------------|--------|----------|----------|---------|--------------------|-----------------------|------|--------|
| ¿Cuál es la función de las mitocondrias? | Multiple Choice | Síntesis | Almacenar | Producir ATP | División | Transporte | 3 | 180 | | 5 | Biología | Célula | Organelos | S14 BIO | Las mitocondrias producen ATP... | BIO | S14 |
```

#### Valores Permitidos para AREA y SEMANA

**AREA (columna Q):**
```
ING   ← Ingenierías
BIO   ← Biomédicas
SOC   ← Sociales
```

**SEMANA (columna R):**
```
S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16
```

**NOMBRE DEL ARCHIVO (columna O):**
Debe seguir el formato: `S{número} {área}`
```
S1 ING, S1 BIO, S1 SOC
S2 ING, S2 BIO, S2 SOC
...
S16 ING, S16 BIO, S16 SOC
```

#### Pasos para Crear las Hojas

1. Abrir el Google Sheets del proyecto
2. Crear nueva hoja: botón `+` abajo a la izquierda
3. Nombrar la hoja exactamente como aparece en la tabla (ej: `CEPRE_Aritmética`)
4. Copiar los encabezados (fila 1):
   ```
   Question Text | Question Type | Option 1 | Option 2 | Option 3 | Option 4 | Option 5 | Correct Answer | Time in seconds | Image Link | NUMERO | CURSO | TEMA | SUBTEMA | NOMBRE DEL ARCHIVO | JUSTIFICACION | AREA | SEMANA
   ```
5. Dar formato a la fila de encabezados: **Negrita**
6. **IMPORTANTE**: Formato > Número > **Texto sin formato** para todas las columnas
   (Evita que Google interprete fracciones como fechas)
7. Repetir para las 20 hojas

#### Resumen de Hojas por Área

```
INGENIERÍAS (ING) usa estas hojas:
├── CEPRE_Aritmética
├── CEPRE_Álgebra
├── CEPRE_Geometría
├── CEPRE_Trigonometría
├── CEPRE_Física
├── CEPRE_Química
├── CEPRE_BiologíaAnatomía      ← (junto, no separado)
├── CEPRE_PsicologíaFilosofía
├── CEPRE_Historia
├── CEPRE_EducaciónCívica
├── CEPRE_Economía
├── CEPRE_ComunicaciónLiteratura ← (junto)
├── CEPRE_RazonamientoMatemático
└── CEPRE_RazonamientoVerbal

BIOMÉDICAS (BIO) usa estas hojas:
├── CEPRE_Aritmética
├── CEPRE_Matemática            ← (BIO y SOC usan este)
├── CEPRE_Física
├── CEPRE_Química
├── CEPRE_Biología              ← (separado)
├── CEPRE_Anatomía              ← (separado)
├── CEPRE_PsicologíaFilosofía
├── CEPRE_Historia
├── CEPRE_EducaciónCívica
├── CEPRE_Economía
├── CEPRE_ComunicaciónLiteratura
├── CEPRE_RazonamientoMatemático
└── CEPRE_RazonamientoVerbal

SOCIALES (SOC) usa estas hojas:
├── CEPRE_Matemática            ← (BIO y SOC usan este)
├── CEPRE_Física
├── CEPRE_Química
├── CEPRE_BiologíaAnatomía      ← (junto)
├── CEPRE_PsicologíaFilosofía
├── CEPRE_Historia
├── CEPRE_Geografía             ← (exclusivo SOC)
├── CEPRE_EducaciónCívica
├── CEPRE_Economía
├── CEPRE_Comunicación          ← (solo comunicación)
├── CEPRE_Literatura            ← (separado)
├── CEPRE_RazonamientoMatemático
└── CEPRE_RazonamientoVerbal
```

---

### Fase 2: Backend (api.gs)
1. Agregar `CEPRE_SUBJECT_SHEETS` mapeo
2. Implementar `getCepreSimulacro(area, semana)` - Examen 60 preg
3. Implementar `getCepreQuestions(course, area, semana, count)` - Banqueo
4. Implementar `getCepreCourses(area)` - Lista cursos por área
5. Agregar nuevos cases en `doGet()`

### Fase 3: Frontend
1. Crear componente `SimulacroCepreuna.tsx` (examen 60 preg)
   - Reutiliza flujo de StudentForm pero con opción CEPREUNA
   - Selector de semana (opcional)
2. Crear componente `BanqueoCepreuna.tsx` (práctica libre)
   - Modo 1: Cuadernillo (sin selector cantidad)
   - Modo 2: Curso General (con selector 10/15/20)
3. Agregar rutas `/simulacro-cepreuna` y `/banqueo-cepreuna`
4. Actualizar Landing page con nuevos botones

### Fase 4: Testing
1. Probar filtros por área + semana
2. Probar modo combinado (3 áreas)
3. Verificar rendimiento con datos reales

---

## Resumen de Decisiones

| Aspecto | Decisión |
|---------|----------|
| Estructura | **OPCIÓN B**: Hojas por curso (~25 hojas) |
| Filtro por área | Columna `AREA` en cada hoja |
| Filtro por semana | Columna `SEMANA` + `NOMBRE DEL ARCHIVO` |
| Cursos variantes | Hojas separadas (Biología, Anatomía, BiologíaAnatomía) |
| Total hojas | ~45 (20 existentes + 25 nuevas) |
| Impacto rendimiento | Mínimo (Google Sheets maneja bien 50+ hojas) |
| **Modo Cuadernillo** | SIN selector de cantidad (trae TODAS) |
| **Modo Curso General** | CON selector de cantidad (10/15/20) |
| **Simulacro CEPREUNA** | Usa misma config, pero hojas CEPRE_ |

---

## Simulación de Usuario

### ESCENARIO 1: Banqueo Cuadernillo - BIOLOGÍA S14 BIO

```
╔══════════════════════════════════════════════════════════════════╗
║         MODO CUADERNILLO - Selecciona tus opciones               ║
║                                                                   ║
║   ÁREA:       ○ ING    ● BIO    ○ SOC                            ║
║                                                                   ║
║   SEMANA:     [ S14 ▼ ]                                          ║
║                                                                   ║
║   CURSO:      [ Biología ▼ ]                                     ║
║                                                                   ║
║   ℹ️  Se cargarán TODAS las preguntas del cuadernillo S14 BIO    ║
║       (aproximadamente 20-25 preguntas)                          ║
║                                                                   ║
║              [ Comenzar Práctica ]                                ║
╚══════════════════════════════════════════════════════════════════╝

    Consulta: ?action=getCepreQuestions&course=Biología&area=BIO&semana=S14
    (SIN parámetro count → trae TODAS)

    Resultado: 22 preguntas del cuadernillo S14 BIO
```

### ESCENARIO 2: Banqueo Curso General - QUÍMICA (mezclando áreas)

```
╔══════════════════════════════════════════════════════════════════╗
║           MODO CURSO GENERAL - Selecciona tus opciones           ║
║                                                                   ║
║   CURSO:      [ Química ▼ ]                                      ║
║                                                                   ║
║   ⚡ Se mezclarán preguntas de ING + BIO + SOC                    ║
║                                                                   ║
║   CANTIDAD:   ○ 10    ● 15    ○ 20                               ║
║                                                                   ║
║              [ Comenzar Práctica ]                                ║
╚══════════════════════════════════════════════════════════════════╝

    Consulta: ?action=getCepreQuestions&course=Química&area=ALL&count=15

    Resultado: 15 preguntas aleatorias de:
    - 5 de S3 ING
    - 4 de S7 BIO
    - 6 de S12 SOC
    (mezcladas aleatoriamente)
```

### ESCENARIO 3: Simulacro CEPREUNA - Ingenierías Semana 10

```
╔══════════════════════════════════════════════════════════════════╗
║              SIMULACRO CEPREUNA - Configuración                  ║
║                                                                   ║
║   ÁREA:       ● Ingenierías   ○ Biomédicas   ○ Sociales          ║
║                                                                   ║
║   SEMANA:     [ S10 ▼ ]   ☐ Todas las semanas                    ║
║               ┌────────┐                                          ║
║               │ Todas  │  ← Mezcla S1-S16                        ║
║               │ S1     │                                          ║
║               │ S2     │                                          ║
║               │ ...    │                                          ║
║               │ S10 ✓  │  ← Solo preguntas de S10                ║
║               │ ...    │                                          ║
║               └────────┘                                          ║
║                                                                   ║
║   📊 Distribución según prospecto:                                ║
║      4 Aritmética, 4 Álgebra, 4 Geometría, 4 Trigonometría       ║
║      4 Física, 4 Química, 2 Biología, 4 Psicología...            ║
║      Total: 60 preguntas                                          ║
║                                                                   ║
║              [ Comenzar Simulacro ]                               ║
╚══════════════════════════════════════════════════════════════════╝

    Consulta: ?action=getCepreSimulacro&area=Ingenierías&semana=S10

    Backend:
    1. Lee Configuración_Ingenierías (distribución de preguntas)
    2. Para cada asignatura:
       - Va a CEPRE_Aritmética → filtra AREA='ING' AND SEMANA='S10'
       - Selecciona 4 preguntas aleatorias
       - Repite para cada asignatura según configuración
    3. Retorna 60 preguntas ordenadas por asignatura
```

### ESCENARIO 4: Simulacro CEPREUNA - Biomédicas TODAS las semanas

```
╔══════════════════════════════════════════════════════════════════╗
║              SIMULACRO CEPREUNA - Configuración                  ║
║                                                                   ║
║   ÁREA:       ○ Ingenierías   ● Biomédicas   ○ Sociales          ║
║                                                                   ║
║   SEMANA:     [ Todas ▼ ]   ☑ Todas las semanas                  ║
║                                                                   ║
║   📊 Distribución según prospecto Biomédicas:                     ║
║      3 Aritmética, 3 Álgebra, 3 Geometría, 3 Trigonometría       ║
║      3 Física, 5 Química, 6 Biología y Anatomía...               ║
║      Total: 60 preguntas                                          ║
║                                                                   ║
║              [ Comenzar Simulacro ]                               ║
╚══════════════════════════════════════════════════════════════════╝

    Consulta: ?action=getCepreSimulacro&area=Biomédicas
    (sin parámetro semana → mezcla todas)

    Backend:
    1. Lee Configuración_Biomédicas
    2. Para cada asignatura:
       - Va a CEPRE_Biología → filtra solo AREA='BIO' (sin filtro semana)
       - Selecciona N preguntas aleatorias de cualquier semana
    3. Las preguntas vienen de diferentes semanas mezcladas
```

### Diferencia Clave: Cuadernillo vs Simulacro

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODO CUADERNILLO                             │
│                                                                 │
│  Usuario selecciona: BIO + S14 + Biología                       │
│                                                                 │
│  → Trae TODAS las preguntas de Biología del cuadernillo S14 BIO │
│  → SIN límite (máximo ~20-25)                                   │
│  → Solo UN curso                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   SIMULACRO CEPREUNA                            │
│                                                                 │
│  Usuario selecciona: Biomédicas + S14                           │
│                                                                 │
│  → Trae 60 preguntas según configuración                        │
│  → Distribución: 3 Arit, 3 Álg, 6 Bio, 5 Quím, etc.            │
│  → TODOS los cursos según el prospecto                          │
│  → Filtradas por AREA='BIO' AND SEMANA='S14'                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Siguiente Paso

**¿Aprobado?** Si estás de acuerdo con esta estrategia:

1. Te ayudo a crear las hojas en Google Sheets
2. Implementamos el backend (api.gs)
3. Creamos los componentes frontend:
   - `SimulacroCepreuna.tsx` (examen 60 preg)
   - `BanqueoCepreuna.tsx` (práctica libre)
4. Actualizamos la documentación

---

*Documento creado: Diciembre 2024*
*SimulaUNA v1.3.0 → v1.4.0*
