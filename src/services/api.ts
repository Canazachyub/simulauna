import type { ApiResponse, Config, Question, AreaType } from '../types';

// Re-exportar tipos que son usados por otros componentes
export type { AreaType } from '../types';

// ============================================
// CONFIGURACIÓN DE LA API
// ============================================

// URL del Google Apps Script desplegado como aplicación web
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/AKfycbxsEsavAu6Hb63p6rxIkfPcT5EDnoiG1JUXsW5LzDTfRNFEWWYi5XKVMbDLqDsRVR0e_A/exec';

// Timeout para las peticiones (30 segundos)
const REQUEST_TIMEOUT = 30000;

// ============================================
// FUNCIONES DE FETCH CON MANEJO DE ERRORES
// ============================================

async function fetchWithTimeout(url: string, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado tiempo. Por favor, intenta de nuevo.');
    }
    throw error;
  }
}

// ============================================
// FUNCIONES DE LA API
// ============================================

/**
 * Obtiene la configuración de todas las áreas
 */
export async function getConfig(): Promise<Config> {
  try {
    const url = `${API_BASE_URL}?action=config`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: ApiResponse<Config> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener la configuración');
    }

    return result.data!;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
    );
  }
}

/**
 * Obtiene las preguntas aleatorias para un área específica
 */
export async function getQuestions(area: AreaType): Promise<Question[]> {
  try {
    const url = `${API_BASE_URL}?action=questions&area=${encodeURIComponent(area)}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: ApiResponse<Question[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener las preguntas');
    }

    return result.data!;
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el examen. Por favor, intenta de nuevo.'
    );
  }
}

/**
 * Verifica que la API esté disponible
 */
export async function testConnection(): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}?action=test`;
    const response = await fetchWithTimeout(url, 10000);

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}

/**
 * Registra un usuario en la hoja "usuarios" de Google Sheets
 */
export interface UserRegistration {
  dni: string;
  fullName: string;
  email: string;
  phone: string;
  processType: 'CEPREUNA' | 'GENERAL' | 'EXTRAORDINARIO';
  area: AreaType;
  career: string;
}

export async function registerUser(user: UserRegistration): Promise<void> {
  try {
    const params = new URLSearchParams({
      action: 'register',
      dni: user.dni,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      processType: user.processType,
      area: user.area,
      career: user.career
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al registrar usuario');
    }
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    throw error;
  }
}

// ============================================
// HISTORIAL DE PUNTAJES
// ============================================

export interface ScoreData {
  dni: string;
  score: number;
  maxScore: number;
  area: AreaType;
  correct: number;
  total: number;
}

export interface HistoryEntry {
  fecha: string;
  area: string;
  puntaje: number;
  puntajeMax: number;
  correctas: number;
  total: number;
  porcentaje: number;
}

export interface UserHistory {
  dni: string;
  totalIntentos: number;
  history: HistoryEntry[];
  mejorPuntaje: number;
  ultimoPuntaje: number;
}

/**
 * Guarda el puntaje de un usuario en Google Sheets
 */
export async function saveScore(data: ScoreData): Promise<void> {
  try {
    const params = new URLSearchParams({
      action: 'saveScore',
      dni: data.dni,
      score: data.score.toString(),
      maxScore: data.maxScore.toString(),
      area: data.area,
      correct: data.correct.toString(),
      total: data.total.toString()
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al guardar puntaje');
    }
  } catch (error) {
    console.error('Error al guardar puntaje:', error);
    // No lanzamos el error para no bloquear la experiencia del usuario
  }
}

/**
 * Obtiene el historial de puntajes de un usuario por DNI
 */
export async function getUserHistory(dni: string): Promise<UserHistory | null> {
  try {
    const params = new URLSearchParams({
      action: 'getHistory',
      dni: dni
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return result.data as UserHistory;
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return null;
  }
}

// ============================================
// CONTROL DE ACCESO Y DETECCIÓN DE FRAUDE
// ============================================

export interface AccessCheckResult {
  canAccess: boolean;
  reason: string;
  attemptCount: number;
  isFirstAttempt?: boolean;
  isConfirmed?: boolean;
  isFraudAttempt?: boolean;
}

/**
 * Verifica si un usuario puede dar el simulacro
 * - Primer intento: GRATIS
 * - Segundo+: Solo si está en lista "confirmado"
 * - Detecta fraude si DNI/Email ya existen con datos diferentes
 */
export async function checkAccess(dni: string, email: string): Promise<AccessCheckResult> {
  try {
    const params = new URLSearchParams({
      action: 'checkAccess',
      dni: dni,
      email: email
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al verificar acceso');
    }

    return result.data as AccessCheckResult;
  } catch (error) {
    console.error('Error al verificar acceso:', error);
    // En caso de error, permitir acceso para no bloquear al usuario
    return {
      canAccess: true,
      reason: 'Error de verificación - acceso permitido',
      attemptCount: 0
    };
  }
}

// ============================================
// BANQUEO HISTÓRICO
// ============================================

export interface BanqueoAccessResult {
  canAccess: boolean;
  reason: string;
  isConfirmed?: boolean;
}

export interface BanqueoQuestion {
  id: string;
  number: number;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: number;
  imageLink: string | null;
  subject: string;
  sourceFile: string | null;
  justification: string | null;
  metadata?: {
    numero?: string | number;
    tema?: string;
    subtema?: string;
  };
}

export interface BanqueoQuestionsResult {
  course: string;
  totalQuestions: number;
  totalAvailable: number;
  questions: BanqueoQuestion[];
  error?: string;
  availableCourses?: string[];
}

/**
 * Verifica si un usuario puede acceder al Banqueo Histórico
 * Solo usuarios confirmados (inscritos) pueden acceder
 */
export async function checkBanqueoAccess(dni: string, email: string): Promise<BanqueoAccessResult> {
  try {
    const params = new URLSearchParams({
      action: 'checkBanqueoAccess',
      dni: dni,
      email: email
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al verificar acceso al banqueo');
    }

    return result.data as BanqueoAccessResult;
  } catch (error) {
    console.error('Error al verificar acceso al banqueo:', error);
    return {
      canAccess: false,
      reason: 'Error de conexión'
    };
  }
}

/**
 * Obtiene preguntas aleatorias de un curso específico para el Banqueo
 * @param course - Nombre del curso (ej: 'Aritmética', 'Física')
 * @param count - Cantidad de preguntas (10, 15, o 20)
 */
export async function getBanqueoQuestions(course: string, count: 10 | 15 | 20 = 10): Promise<BanqueoQuestionsResult> {
  try {
    const params = new URLSearchParams({
      action: 'getBanqueoQuestions',
      course: course,
      count: count.toString()
    });

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 30000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener preguntas de banqueo');
    }

    return result.data as BanqueoQuestionsResult;
  } catch (error) {
    console.error('Error al obtener preguntas de banqueo:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el banqueo. Por favor, intenta de nuevo.'
    );
  }
}

// Lista de cursos disponibles para el Banqueo Histórico
export const AVAILABLE_COURSES = [
  'Aritmética',
  'Álgebra',
  'Geometría',
  'Trigonometría',
  'Física',
  'Química',
  'Biología y Anatomía',
  'Psicología y Filosofía',
  'Geografía',
  'Historia',
  'Educación Cívica',
  'Economía',
  'Comunicación',
  'Literatura',
  'Razonamiento Matemático',
  'Razonamiento Verbal',
  'Inglés',
  'Quechua y aimara'
];

// ============================================
// CEPREUNA - BANQUEO Y SIMULACRO
// ============================================

export type CepreAreaCode = 'ING' | 'BIO' | 'SOC' | 'ALL';
export type CepreSemana = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' |
  'S9' | 'S10' | 'S11' | 'S12' | 'S13' | 'S14' | 'S15' | 'S16';

// Cursos disponibles por área CEPREUNA (incluye Idiomas)
export const CEPRE_COURSES_BY_AREA: Record<'ING' | 'BIO' | 'SOC', string[]> = {
  'ING': [
    'Aritmética', 'Álgebra', 'Geometría', 'Trigonometría',
    'Física', 'Química', 'Biología y Anatomía',
    'Psicología y Filosofía', 'Historia', 'Educación Cívica',
    'Economía', 'Comunicación y Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal',
    'Inglés', 'Quechua y aimara'
  ],
  'BIO': [
    'Aritmética', 'Matemática', 'Física', 'Química',
    'Biología', 'Anatomía', 'Psicología y Filosofía',
    'Historia', 'Educación Cívica', 'Economía',
    'Comunicación y Literatura', 'Razonamiento Matemático',
    'Razonamiento Verbal', 'Inglés', 'Quechua y aimara'
  ],
  'SOC': [
    'Matemática', 'Física', 'Química', 'Biología y Anatomía',
    'Psicología y Filosofía', 'Historia', 'Geografía',
    'Educación Cívica', 'Economía', 'Comunicación', 'Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal',
    'Inglés', 'Quechua y aimara'
  ]
};

// Semanas CEPREUNA
export const CEPRE_SEMANAS: CepreSemana[] = [
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
  'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16'
];

export interface CepreQuestion extends BanqueoQuestion {
  area: string | null;
  semana: string | null;
}

export interface CepreQuestionsResult {
  course: string;
  area: string;
  semana: string;
  totalQuestions: number;
  totalAvailable: number;
  questions: CepreQuestion[];
  error?: string;
}

export interface CepreSimulacroResult {
  area: string;
  semana: string;
  totalQuestions: number;
  questions: CepreQuestion[];
  error?: string;
}

export interface CepreCoursesResult {
  area?: string;
  courses?: string[];
  areas?: string[];
  coursesByArea?: Record<string, string[]>;
  allCourses?: string[];
}

export interface CepreSemanasResult {
  course?: string;
  area?: string;
  semanas: string[];
  error?: string;
}

/**
 * Obtiene preguntas CEPREUNA para el Banqueo
 * MODO 1 - Cuadernillo: area + semana + course (sin count → trae TODAS)
 * MODO 2 - Curso General: course + area=ALL + count (mezcla 3 áreas)
 */
export async function getCepreQuestions(
  course: string,
  area?: CepreAreaCode,
  semana?: CepreSemana | string,
  count?: number
): Promise<CepreQuestionsResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreQuestions',
      course: course
    });

    if (area) params.append('area', area);
    if (semana) params.append('semana', semana);
    if (count !== undefined) params.append('count', count.toString());

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 30000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener preguntas CEPREUNA');
    }

    return result.data as CepreQuestionsResult;
  } catch (error) {
    console.error('Error al obtener preguntas CEPREUNA:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el banqueo CEPREUNA. Por favor, intenta de nuevo.'
    );
  }
}

/**
 * Obtiene un simulacro completo CEPREUNA de 60 preguntas
 */
export async function getCepreSimulacro(
  area: AreaType,
  semana?: CepreSemana | string
): Promise<CepreSimulacroResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreSimulacro',
      area: area
    });

    if (semana) params.append('semana', semana);

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 45000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener simulacro CEPREUNA');
    }

    return result.data as CepreSimulacroResult;
  } catch (error) {
    console.error('Error al obtener simulacro CEPREUNA:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el simulacro CEPREUNA. Por favor, intenta de nuevo.'
    );
  }
}

/**
 * Obtiene la lista de cursos CEPREUNA por área
 */
export async function getCepreCourses(area?: CepreAreaCode): Promise<CepreCoursesResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreCourses'
    });

    if (area) params.append('area', area);

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener cursos CEPREUNA');
    }

    return result.data as CepreCoursesResult;
  } catch (error) {
    console.error('Error al obtener cursos CEPREUNA:', error);
    // Retornar datos locales como fallback
    if (area && CEPRE_COURSES_BY_AREA[area as keyof typeof CEPRE_COURSES_BY_AREA]) {
      return {
        area: area,
        courses: CEPRE_COURSES_BY_AREA[area as keyof typeof CEPRE_COURSES_BY_AREA]
      };
    }
    return {
      areas: ['ING', 'BIO', 'SOC'],
      coursesByArea: CEPRE_COURSES_BY_AREA,
      allCourses: [...new Set(Object.values(CEPRE_COURSES_BY_AREA).flat())]
    };
  }
}

/**
 * Obtiene las semanas disponibles para un curso CEPREUNA
 */
export async function getCepreSemanas(
  course?: string,
  area?: CepreAreaCode
): Promise<CepreSemanasResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreSemanas'
    });

    if (course) params.append('course', course);
    if (area) params.append('area', area);

    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener semanas CEPREUNA');
    }

    return result.data as CepreSemanasResult;
  } catch (error) {
    console.error('Error al obtener semanas CEPREUNA:', error);
    // Retornar todas las semanas como fallback
    return { semanas: CEPRE_SEMANAS };
  }
}

// ============================================
// DATOS DE PRUEBA (MOCK) PARA DESARROLLO
// ============================================

export const MOCK_CONFIG: Config = {
  // INGENIERÍAS - 60 preguntas, 3000 puntos
  'Ingenierías': {
    name: 'Ingenierías',
    totalQuestions: 60,
    totalMaxScore: 3000,
    subjects: [
      { code: 1, name: 'Aritmética', pointsPerQuestion: 10, questionCount: 4, weight: 5.201, maxScore: 208.04 },
      { code: 2, name: 'Álgebra', pointsPerQuestion: 10, questionCount: 4, weight: 5.202, maxScore: 208.08 },
      { code: 3, name: 'Geometría', pointsPerQuestion: 10, questionCount: 4, weight: 5.303, maxScore: 212.12 },
      { code: 4, name: 'Trigonometría', pointsPerQuestion: 10, questionCount: 4, weight: 5.404, maxScore: 216.16 },
      { code: 5, name: 'Física', pointsPerQuestion: 10, questionCount: 4, weight: 5.905, maxScore: 236.2 },
      { code: 6, name: 'Química', pointsPerQuestion: 10, questionCount: 4, weight: 5.406, maxScore: 216.24 },
      { code: 7, name: 'Biología y Anatomía', pointsPerQuestion: 10, questionCount: 2, weight: 3.177, maxScore: 63.54 },
      { code: 8, name: 'Psicología y Filosofía', pointsPerQuestion: 10, questionCount: 4, weight: 3.802, maxScore: 152.08 },
      { code: 9, name: 'Geografía', pointsPerQuestion: 10, questionCount: 2, weight: 2.576, maxScore: 51.52 },
      { code: 10, name: 'Historia', pointsPerQuestion: 10, questionCount: 2, weight: 3.701, maxScore: 74.02 },
      { code: 11, name: 'Educación Cívica', pointsPerQuestion: 10, questionCount: 2, weight: 3.101, maxScore: 62.02 },
      { code: 12, name: 'Economía', pointsPerQuestion: 10, questionCount: 2, weight: 3.502, maxScore: 70.04 },
      { code: 13, name: 'Comunicación', pointsPerQuestion: 10, questionCount: 4, weight: 3.352, maxScore: 134.08 },
      { code: 14, name: 'Literatura', pointsPerQuestion: 10, questionCount: 2, weight: 2.501, maxScore: 50.02 },
      { code: 15, name: 'Razonamiento Matemático', pointsPerQuestion: 10, questionCount: 6, weight: 7.603, maxScore: 456.18 },
      { code: 16, name: 'Razonamiento Verbal', pointsPerQuestion: 10, questionCount: 6, weight: 7.103, maxScore: 426.18 },
      { code: 17, name: 'Inglés', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
      { code: 18, name: 'Quechua y aimara', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
    ]
  },
  // SOCIALES - 60 preguntas, 3000 puntos
  'Sociales': {
    name: 'Sociales',
    totalQuestions: 60,
    totalMaxScore: 3000,
    subjects: [
      { code: 1, name: 'Aritmética', pointsPerQuestion: 10, questionCount: 3, weight: 3.331, maxScore: 99.93 },
      { code: 2, name: 'Álgebra', pointsPerQuestion: 10, questionCount: 3, weight: 3.185, maxScore: 95.55 },
      { code: 3, name: 'Geometría', pointsPerQuestion: 10, questionCount: 2, weight: 3.12, maxScore: 62.4 },
      { code: 4, name: 'Trigonometría', pointsPerQuestion: 10, questionCount: 2, weight: 3.12, maxScore: 62.4 },
      { code: 5, name: 'Física', pointsPerQuestion: 10, questionCount: 2, weight: 2.302, maxScore: 46.04 },
      { code: 6, name: 'Química', pointsPerQuestion: 10, questionCount: 2, weight: 2.404, maxScore: 48.08 },
      { code: 7, name: 'Biología y Anatomía', pointsPerQuestion: 10, questionCount: 2, weight: 2.504, maxScore: 50.08 },
      { code: 8, name: 'Psicología y Filosofía', pointsPerQuestion: 10, questionCount: 4, weight: 4.807, maxScore: 192.28 },
      { code: 9, name: 'Geografía', pointsPerQuestion: 10, questionCount: 4, weight: 4.907, maxScore: 196.28 },
      { code: 10, name: 'Historia', pointsPerQuestion: 10, questionCount: 4, weight: 5.805, maxScore: 232.2 },
      { code: 11, name: 'Educación Cívica', pointsPerQuestion: 10, questionCount: 4, weight: 6.576, maxScore: 263.04 },
      { code: 12, name: 'Economía', pointsPerQuestion: 10, questionCount: 4, weight: 4.607, maxScore: 184.28 },
      { code: 13, name: 'Comunicación', pointsPerQuestion: 10, questionCount: 4, weight: 6.09, maxScore: 243.6 },
      { code: 14, name: 'Literatura', pointsPerQuestion: 10, questionCount: 4, weight: 4.3, maxScore: 172 },
      { code: 15, name: 'Razonamiento Matemático', pointsPerQuestion: 10, questionCount: 6, weight: 7.203, maxScore: 432.18 },
      { code: 16, name: 'Razonamiento Verbal', pointsPerQuestion: 10, questionCount: 6, weight: 7.603, maxScore: 456.18 },
      { code: 17, name: 'Inglés', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
      { code: 18, name: 'Quechua y aimara', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
    ]
  },
  // BIOMÉDICAS - 60 preguntas, 3000 puntos
  'Biomédicas': {
    name: 'Biomédicas',
    totalQuestions: 60,
    totalMaxScore: 3000,
    subjects: [
      { code: 1, name: 'Aritmética', pointsPerQuestion: 10, questionCount: 3, weight: 3.331, maxScore: 99.93 },
      { code: 2, name: 'Álgebra', pointsPerQuestion: 10, questionCount: 3, weight: 3.202, maxScore: 96.06 },
      { code: 3, name: 'Geometría', pointsPerQuestion: 10, questionCount: 3, weight: 3.301, maxScore: 99.03 },
      { code: 4, name: 'Trigonometría', pointsPerQuestion: 10, questionCount: 3, weight: 3.404, maxScore: 102.12 },
      { code: 5, name: 'Física', pointsPerQuestion: 10, questionCount: 3, weight: 5.505, maxScore: 165.15 },
      { code: 6, name: 'Química', pointsPerQuestion: 10, questionCount: 5, weight: 6.623, maxScore: 331.15 },
      { code: 7, name: 'Biología y Anatomía', pointsPerQuestion: 10, questionCount: 6, weight: 7.816, maxScore: 468.96 },
      { code: 8, name: 'Psicología y Filosofía', pointsPerQuestion: 10, questionCount: 4, weight: 4.006, maxScore: 160.24 },
      { code: 9, name: 'Geografía', pointsPerQuestion: 10, questionCount: 2, weight: 2.8, maxScore: 56 },
      { code: 10, name: 'Historia', pointsPerQuestion: 10, questionCount: 2, weight: 3.302, maxScore: 66.04 },
      { code: 11, name: 'Educación Cívica', pointsPerQuestion: 10, questionCount: 2, weight: 3.571, maxScore: 71.42 },
      { code: 12, name: 'Economía', pointsPerQuestion: 10, questionCount: 2, weight: 3.406, maxScore: 68.12 },
      { code: 13, name: 'Comunicación', pointsPerQuestion: 10, questionCount: 4, weight: 3.302, maxScore: 132.08 },
      { code: 14, name: 'Literatura', pointsPerQuestion: 10, questionCount: 2, weight: 2.805, maxScore: 56.1 },
      { code: 15, name: 'Razonamiento Matemático', pointsPerQuestion: 10, questionCount: 6, weight: 7.201, maxScore: 432.06 },
      { code: 16, name: 'Razonamiento Verbal', pointsPerQuestion: 10, questionCount: 6, weight: 7.201, maxScore: 432.06 },
      { code: 17, name: 'Inglés', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
      { code: 18, name: 'Quechua y aimara', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
    ]
  }
};

/**
 * Genera preguntas de prueba para desarrollo
 */
export function generateMockQuestions(area: AreaType): Question[] {
  const config = MOCK_CONFIG[area];
  const questions: Question[] = [];
  let questionNumber = 1;

  // Mantener orden por asignatura (NO mezclar)
  config.subjects.forEach((subject) => {
    for (let i = 0; i < subject.questionCount; i++) {
      questions.push({
        id: `${subject.name}-${i + 1}`,
        number: questionNumber++,
        questionText: `Pregunta de prueba ${i + 1} de ${subject.name}. ¿Cuál es la respuesta correcta para este ejercicio de práctica?`,
        questionType: 'Multiple Choice',
        options: [
          'Opción A - Primera alternativa',
          'Opción B - Segunda alternativa',
          'Opción C - Tercera alternativa',
          'Opción D - Cuarta alternativa',
          'Opción E - Quinta alternativa'
        ],
        correctAnswer: Math.floor(Math.random() * 5),
        timeSeconds: 180, // 3 minutos por pregunta
        imageLink: null,
        subject: subject.name,
        points: subject.maxScore / subject.questionCount,
        sourceFile: `Examen_${subject.name}_2024.pdf`,
        metadata: {
          numero: i + 1,
          tema: 'Tema de prueba',
          subtema: 'Subtema de prueba'
        }
      });
    }
  });

  // NO mezclar - mantener orden por asignatura
  return questions;
}
