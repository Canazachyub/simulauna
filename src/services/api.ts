import type {
  ApiResponse,
  Question,
  AreaType,
  ConfigV2,
  Division,
  Escala,
  Universidad,
  Answer,
  ReviewItem,
  SubjectResult,
  PerformanceLevel
} from '../types';
import { calculateSubjectResults, getPerformanceLevel } from '../utils/calculations';

// Re-exportar tipos que son usados por otros componentes
export type { AreaType } from '../types';

// ============================================
// CONFIGURACIÓN DE LA API
// ============================================

// URL del Google Apps Script desplegado como aplicación web
// IMPORTANT: The API URL must be set via the VITE_API_URL environment variable.
// Never hardcode the URL here — it would be visible in the deployed JavaScript bundle.
const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '';
const API_TOKEN = import.meta.env.VITE_API_TOKEN as string;

/**
 * Modo mock: activo si VITE_USE_MOCK=true o si no hay VITE_API_URL configurada.
 * Permite desarrollar y demostrar el multi-tenant (una + unsa) sin backend real.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !API_BASE_URL;

if (!API_BASE_URL && !USE_MOCK) {
  throw new Error('VITE_API_URL environment variable is not set. The application cannot connect to the API.');
}

const DEFAULT_UNIVERSIDAD = 'una';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Construye la URL de la API con el token de autenticación incluido
 */
function buildApiUrl(action: string, extraParams?: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ action });
  if (API_TOKEN) {
    params.set('token', API_TOKEN);
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== '') {
        params.set(key, value);
      }
    }
  }
  return `${API_BASE_URL}?${params.toString()}`;
}

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
// NÚCLEO v2 — MULTI-UNIVERSIDAD (docs/CONTRATO_API_V2.md §3)
// ============================================

/**
 * Registro maestro de universidades disponibles (excluye estado 'oculta').
 */
export async function getUniversidades(): Promise<Universidad[]> {
  if (USE_MOCK) {
    await delay(200);
    return MOCK_UNIVERSIDADES.filter(u => u.estado !== 'oculta').sort((a, b) => a.orden - b.orden);
  }

  try {
    const url = buildApiUrl('getUniversidades');
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: ApiResponse<Universidad[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener el registro de universidades');
    }

    return result.data!;
  } catch (error) {
    console.error('Error al obtener universidades:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el listado de universidades.'
    );
  }
}

/**
 * Configuración (divisiones + escala) de una universidad para un proceso dado.
 */
export async function getConfig(universidad: string = DEFAULT_UNIVERSIDAD, proceso: string = 'ORDINARIO'): Promise<ConfigV2> {
  if (USE_MOCK) {
    await delay(400);
    const byUniversidad = MOCK_CONFIG_V2[universidad];
    const cfg = byUniversidad?.[proceso] ?? byUniversidad?.['ORDINARIO'];
    if (!cfg) {
      throw new Error(`No hay configuración disponible (mock) para "${universidad}".`);
    }
    return cfg;
  }

  try {
    const url = buildApiUrl('getConfig', { universidad, proceso });
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: ApiResponse<ConfigV2> = await response.json();

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

// ============================================
// EXAMEN v2 — getExam / submitExam (calificación en servidor)
// ============================================

/** Pregunta de examen tal como la entrega getExam: SIN correctAnswer ni justification. */
export type ExamQuestion = Omit<Question, 'correctAnswer' | 'justification'> & {
  correctAnswer?: never;
  justification?: never;
};

export interface GetExamResult {
  examSessionId: string;
  universidad: string;
  division: string;
  proceso: string;
  escala: Escala;
  questions: Question[]; // el cliente las trata como "sin respuesta" hasta el submitExam
}

export async function getExam(
  universidad: string,
  division: string,
  proceso: string = 'ORDINARIO',
  semana?: string
): Promise<GetExamResult> {
  if (USE_MOCK) {
    await delay(700);
    const byUniversidad = MOCK_CONFIG_V2[universidad];
    const config = byUniversidad?.[proceso] ?? byUniversidad?.['ORDINARIO'];
    if (!config) {
      throw new Error(`No hay configuración disponible (mock) para "${universidad}".`);
    }
    const divisionConfig = config.divisiones.find(d => d.codigo === division || d.nombre === division);
    if (!divisionConfig) {
      throw new Error(`División "${division}" no existe para "${universidad}".`);
    }

    const fullQuestions = generateMockQuestionsV2(config, divisionConfig);
    const examSessionId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mockExamSessions.set(examSessionId, {
      universidad,
      division: divisionConfig.codigo,
      proceso,
      escala: config.escala,
      questions: fullQuestions,
      divisionConfig
    });

    // Las preguntas que "viajan" al cliente no incluyen correctAnswer/justification real;
    // usamos un sentinel (-1 / null) que se reemplaza tras submitExam con la revisión del servidor.
    const clientQuestions: Question[] = fullQuestions.map(q => ({ ...q, correctAnswer: -1, justification: null }));

    return {
      examSessionId,
      universidad,
      division: divisionConfig.codigo,
      proceso,
      escala: config.escala,
      questions: clientQuestions
    };
  }

  try {
    const url = buildApiUrl('getExam', { universidad, division, proceso, semana });
    const response = await fetchWithTimeout(url, 30000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: ApiResponse<GetExamResult> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener el examen');
    }

    return result.data!;
  } catch (error) {
    console.error('Error al obtener examen:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el examen. Por favor, intenta de nuevo.'
    );
  }
}

export interface SubmitExamPayload {
  universidad: string;
  examSessionId: string;
  dni: string;
  answers: { questionId: string; selectedOption: number | null }[];
}

export interface SubmitExamResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  performanceLevel: PerformanceLevel;
  subjectResults: SubjectResult[];
  review: ReviewItem[];
}

/**
 * Envía las respuestas del simulacro para calificación EN SERVIDOR (POST, body JSON,
 * content-type text/plain para evitar preflight CORS contra Apps Script).
 */
export async function submitExam(payload: SubmitExamPayload): Promise<SubmitExamResult> {
  if (USE_MOCK) {
    await delay(600);
    const session = mockExamSessions.get(payload.examSessionId);
    if (!session) {
      throw new Error('La sesión de examen expiró o no existe. Vuelve a iniciar el simulacro.');
    }

    const answers: Answer[] = session.questions.map(q => {
      const selected = payload.answers.find(a => a.questionId === q.id)?.selectedOption ?? null;
      return {
        questionId: q.id,
        selectedOption: selected,
        isCorrect: selected !== null && selected === q.correctAnswer,
        timeSpent: 0
      };
    });

    const subjectResults = calculateSubjectResults(session.questions, answers, session.divisionConfig);
    const totalScore = Math.round(subjectResults.reduce((sum, r) => sum + r.pointsObtained, 0) * 100) / 100;
    const maxScore = session.divisionConfig.totalMaxScore;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
    const performanceLevel = getPerformanceLevel(totalScore, session.escala.umbrales);

    const review: ReviewItem[] = session.questions.map(q => {
      const selected = payload.answers.find(a => a.questionId === q.id)?.selectedOption ?? null;
      return {
        questionId: q.id,
        correctAnswer: q.correctAnswer,
        selectedOption: selected,
        isCorrect: selected !== null && selected === q.correctAnswer,
        justification: q.justification ?? null
      };
    });

    return { totalScore, maxScore, percentage, performanceLevel, subjectResults, review };
  }

  try {
    const params = new URLSearchParams({ action: 'submitExam' });
    if (API_TOKEN) params.set('token', API_TOKEN);
    const url = `${API_BASE_URL}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      // text/plain evita el preflight OPTIONS que Apps Script no maneja bien
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: ApiResponse<SubmitExamResult> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al calificar el examen');
    }

    return result.data!;
  } catch (error) {
    console.error('Error al calificar examen:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo calificar el examen. Por favor, intenta de nuevo.'
    );
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
  universidad?: string;
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
      career: user.career,
      universidad: user.universidad || DEFAULT_UNIVERSIDAD
    });

    if (API_TOKEN) params.set('token', API_TOKEN);
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
  universidad?: string;
}

export interface HistoryEntry {
  fecha: string;
  area: string;
  puntaje: number;
  puntajeMax: number;
  correctas: number;
  total: number;
  porcentaje: number;
  universidad?: string;
  proceso?: string;
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
 * @deprecated el flujo nuevo usa submitExam (calificación + persistencia en servidor). Se
 * mantiene operativo mientras el frontend legado ('una') siga usándolo.
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
      total: data.total.toString(),
      universidad: data.universidad || DEFAULT_UNIVERSIDAD
    });

    if (API_TOKEN) params.set('token', API_TOKEN);
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
export async function getUserHistory(dni: string, universidad: string = DEFAULT_UNIVERSIDAD, proceso?: string): Promise<UserHistory | null> {
  try {
    const params = new URLSearchParams({
      action: 'getHistory',
      dni: dni,
      universidad
    });
    if (proceso) params.set('proceso', proceso);

    if (API_TOKEN) params.set('token', API_TOKEN);
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
 * - Primer intento POR UNIVERSIDAD: GRATIS
 * - Segundo+: Solo si está en lista "confirmado" / CORE.permisos
 * - Detecta fraude si DNI/Email ya existen con datos diferentes (global, entre universidades)
 */
export async function checkAccess(dni: string, email: string, universidad: string = DEFAULT_UNIVERSIDAD): Promise<AccessCheckResult> {
  try {
    const params = new URLSearchParams({
      action: 'checkAccess',
      dni: dni,
      email: email,
      universidad
    });

    if (API_TOKEN) params.set('token', API_TOKEN);
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
export async function checkBanqueoAccess(
  dni: string,
  email: string,
  universidad: string = DEFAULT_UNIVERSIDAD,
  modalidad?: string
): Promise<BanqueoAccessResult> {
  try {
    const params = new URLSearchParams({
      action: 'checkBanqueoAccess',
      dni: dni,
      email: email,
      universidad
    });
    if (modalidad) params.set('modalidad', modalidad);

    if (API_TOKEN) params.set('token', API_TOKEN);
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
 * @param universidad - Código de universidad (default 'una', compatibilidad total)
 */
export async function getBanqueoQuestions(
  course: string,
  count: 10 | 15 | 20 = 10,
  universidad: string = DEFAULT_UNIVERSIDAD
): Promise<BanqueoQuestionsResult> {
  try {
    const params = new URLSearchParams({
      action: 'getBanqueoQuestions',
      course: course,
      count: count.toString(),
      universidad
    });

    if (API_TOKEN) params.set('token', API_TOKEN);
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
// TODO(multi-universidad): mover a getCursosConTemas(universidad) cuando cada universidad
// tenga su propio catálogo; por ahora es el catálogo legado de 'una'.
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

// Cursos disponibles por área CEPREUNA (legado 'una')
// Total por área: ING=15, BIO=13, SOC=13 (sin Inglés ni Quechua)
export const CEPRE_COURSES_BY_AREA: Record<'ING' | 'BIO' | 'SOC', string[]> = {
  'ING': [
    'Aritmética', 'Álgebra', 'Geometría', 'Trigonometría',
    'Física', 'Química', 'Biología y Anatomía',
    'Psicología y Filosofía',
    'Historia', 'Geografía', // SEPARADOS (Historia: S1-S11, Geografía: S12-S16)
    'Educación Cívica', 'Economía',
    'Comunicación y Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal'
  ], // 15 cursos
  'BIO': [
    'Matemática', // BIO usa 1 curso de Matemática (no las 4 separadas)
    'Física', 'Química',
    'Biología', 'Anatomía', // SEPARADOS en BIO
    'Psicología y Filosofía',
    'Historia', 'Geografía', // SEPARADOS (Historia: S1-S11, Geografía: S12-S16)
    'Educación Cívica', 'Economía',
    'Comunicación y Literatura',
    'Razonamiento Matemático', 'Razonamiento Verbal'
  ], // 13 cursos
  'SOC': [
    'Matemática', // SOC usa 1 curso de Matemática
    'Física', 'Química',
    'Biología y Anatomía', // COMBINADO en SOC
    'Psicología y Filosofía',
    'Historia', 'Geografía', // SEPARADOS (ambos: S1-S16)
    'Educación Cívica', 'Economía',
    'Comunicación', 'Literatura', // SEPARADOS en SOC
    'Razonamiento Matemático', 'Razonamiento Verbal'
  ] // 13 cursos
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
  count?: number,
  universidad: string = DEFAULT_UNIVERSIDAD
): Promise<CepreQuestionsResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreQuestions',
      course: course,
      universidad
    });

    if (area) params.append('area', area);
    if (semana) params.append('semana', semana);
    if (count !== undefined) params.append('count', count.toString());

    if (API_TOKEN) params.set('token', API_TOKEN);
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
  semana?: CepreSemana | string,
  universidad: string = DEFAULT_UNIVERSIDAD
): Promise<CepreSimulacroResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreSimulacro',
      area: area,
      universidad
    });

    if (semana) params.append('semana', semana);

    if (API_TOKEN) params.set('token', API_TOKEN);
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
export async function getCepreCourses(area?: CepreAreaCode, universidad: string = DEFAULT_UNIVERSIDAD): Promise<CepreCoursesResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreCourses',
      universidad
    });

    if (area) params.append('area', area);

    if (API_TOKEN) params.set('token', API_TOKEN);
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
  area?: CepreAreaCode,
  universidad: string = DEFAULT_UNIVERSIDAD
): Promise<CepreSemanasResult> {
  try {
    const params = new URLSearchParams({
      action: 'getCepreSemanas',
      universidad
    });

    if (course) params.append('course', course);
    if (area) params.append('area', area);

    if (API_TOKEN) params.set('token', API_TOKEN);
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
// BANQUEO POR TEMA
// ============================================

export interface CursoConTemas {
  curso: string;
  totalPreguntas: number;
}

export interface TemaInfo {
  tema: string;
  totalPreguntas: number;
}

export interface SubtemaInfo {
  subtema: string;
  totalPreguntas: number;
}

/**
 * Obtiene la lista de todos los cursos disponibles con la cantidad de preguntas
 * Combina preguntas de hojas Banco_ y CEPRE_
 */
export async function getCursosConTemas(universidad: string = DEFAULT_UNIVERSIDAD): Promise<CursoConTemas[]> {
  try {
    const params = new URLSearchParams({
      action: 'getCursosConTemas',
      universidad
    });

    if (API_TOKEN) params.set('token', API_TOKEN);
    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 30000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener cursos con temas');
    }

    // El backend retorna { totalCursos, cursos: [{nombre, count}] }
    // Mapeamos a { curso, totalPreguntas }
    const data = result.data as { totalCursos: number; cursos: Array<{ nombre: string; count: number }> };
    return data.cursos.map(c => ({
      curso: c.nombre,
      totalPreguntas: c.count
    }));
  } catch (error) {
    console.error('Error al obtener cursos con temas:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar la lista de cursos. Por favor, intenta de nuevo.'
    );
  }
}

/**
 * Obtiene los temas disponibles para un curso específico
 */
export async function getTemasPorCurso(curso: string, universidad: string = DEFAULT_UNIVERSIDAD): Promise<TemaInfo[]> {
  try {
    const params = new URLSearchParams({
      action: 'getTemasPorCurso',
      curso: curso,
      universidad
    });

    if (API_TOKEN) params.set('token', API_TOKEN);
    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 30000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener temas del curso');
    }

    // El backend retorna { curso, totalPreguntas, totalTemas, temas: [{nombre, count}] }
    const data = result.data as { temas: Array<{ nombre: string; count: number }> };
    return data.temas.map(t => ({
      tema: t.nombre,
      totalPreguntas: t.count
    }));
  } catch (error) {
    console.error('Error al obtener temas del curso:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar los temas. Por favor, intenta de nuevo.'
    );
  }
}

/**
 * Obtiene los subtemas disponibles para un tema específico de un curso
 */
export async function getSubtemasPorTema(curso: string, tema: string, universidad: string = DEFAULT_UNIVERSIDAD): Promise<SubtemaInfo[]> {
  try {
    const params = new URLSearchParams({
      action: 'getSubtemasPorTema',
      curso: curso,
      tema: tema,
      universidad
    });

    if (API_TOKEN) params.set('token', API_TOKEN);
    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 30000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener subtemas');
    }

    // El backend retorna { curso, tema, totalPreguntas, totalSubtemas, subtemas: [{nombre, count}] }
    const data = result.data as { subtemas: Array<{ nombre: string; count: number }> };
    return data.subtemas.map(s => ({
      subtema: s.nombre,
      totalPreguntas: s.count
    }));
  } catch (error) {
    console.error('Error al obtener subtemas:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar los subtemas. Por favor, intenta de nuevo.'
    );
  }
}

export interface BanqueoByTemaResult {
  curso: string;
  tema?: string;
  subtema?: string;
  totalQuestions: number;
  totalAvailable: number;
  questions: BanqueoQuestion[];
  error?: string;
}

/**
 * Obtiene preguntas filtradas por curso, tema y opcionalmente subtema
 * @param curso - Nombre del curso
 * @param tema - Nombre del tema (opcional, si no se especifica trae todos los temas)
 * @param subtema - Nombre del subtema (opcional)
 * @param count - Cantidad de preguntas (10, 15, o 20)
 */
export async function getBanqueoByTema(
  curso: string,
  tema?: string,
  subtema?: string,
  count: 10 | 15 | 20 = 10,
  universidad: string = DEFAULT_UNIVERSIDAD
): Promise<BanqueoByTemaResult> {
  try {
    const params = new URLSearchParams({
      action: 'getBanqueoByTema',
      curso: curso,
      count: count.toString(),
      universidad
    });

    if (tema) params.append('tema', tema);
    if (subtema) params.append('subtema', subtema);

    if (API_TOKEN) params.set('token', API_TOKEN);
    const url = `${API_BASE_URL}?${params.toString()}`;
    const response = await fetchWithTimeout(url, 30000);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Error al obtener preguntas por tema');
    }

    return result.data as BanqueoByTemaResult;
  } catch (error) {
    console.error('Error al obtener preguntas por tema:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar las preguntas. Por favor, intenta de nuevo.'
    );
  }
}

/**
 * Verifica que la API esté disponible
 */
export async function testConnection(): Promise<boolean> {
  if (USE_MOCK) return true;
  try {
    const url = buildApiUrl('test');
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

// ============================================
// DATOS DE PRUEBA (MOCK) — MULTI-UNIVERSIDAD
// ============================================

/**
 * Registro mock de universidades: 'una' (activa, escala real 3000 pts) + 'unsa' (piloto,
 * escala DISTINTA — motor decimas, 100 pts) para demostrar el multi-tenant sin backend.
 */
export const MOCK_UNIVERSIDADES: Universidad[] = [
  {
    codigo: 'una',
    nombre: 'Universidad Nacional del Altiplano',
    nombreCorto: 'UNA Puno',
    estado: 'activa',
    procesos: ['ORDINARIO', 'CEPRE', 'EXTRAORDINARIO'],
    cepreNombre: 'CEPREUNA',
    colores: { primario: '#003D7A', secundario: '#D4AF37' },
    logo: '/logos/una.svg',
    orden: 1
  },
  {
    codigo: 'unsa',
    nombre: 'Universidad Nacional de San Agustín',
    nombreCorto: 'UNSA Arequipa',
    estado: 'piloto',
    procesos: ['ORDINARIO'],
    cepreNombre: 'CEPRUNSA',
    colores: { primario: '#7A1F2B', secundario: '#F2B705' },
    logo: '/logos/unsa.svg',
    orden: 2
  }
];

// ----- UNA (escala real: suma_ponderada, 3000 pts, 2400/1800/1200) -----
const UNA_ESCALA: Escala = {
  motor: 'suma_ponderada',
  escalaTotal: 3000,
  umbrales: { excelente: 2400, bueno: 1800, regular: 1200 },
  duracionMin: 180,
  nPreguntasTotal: 60
};

function buildUnaDivision(nombre: string, subjects: Division['subjects']): Division {
  const totalQuestions = subjects.reduce((sum, s) => sum + s.questionCount, 0);
  const totalMaxScore = Math.round(subjects.reduce((sum, s) => sum + s.maxScore, 0) * 100) / 100;
  return { codigo: nombre, nombre, tipo: 'area', subjects, totalQuestions, totalMaxScore };
}

const UNA_CONFIG_ORDINARIO: ConfigV2 = {
  universidad: 'una',
  proceso: 'ORDINARIO',
  escala: UNA_ESCALA,
  divisiones: [
    buildUnaDivision('Ingenierías', [
      { name: 'Aritmética', pointsPerQuestion: 10, questionCount: 4, weight: 5.201, maxScore: 208.04 },
      { name: 'Álgebra', pointsPerQuestion: 10, questionCount: 4, weight: 5.202, maxScore: 208.08 },
      { name: 'Geometría', pointsPerQuestion: 10, questionCount: 4, weight: 5.303, maxScore: 212.12 },
      { name: 'Trigonometría', pointsPerQuestion: 10, questionCount: 4, weight: 5.404, maxScore: 216.16 },
      { name: 'Física', pointsPerQuestion: 10, questionCount: 4, weight: 5.905, maxScore: 236.2 },
      { name: 'Química', pointsPerQuestion: 10, questionCount: 4, weight: 5.406, maxScore: 216.24 },
      { name: 'Biología y Anatomía', pointsPerQuestion: 10, questionCount: 2, weight: 3.177, maxScore: 63.54 },
      { name: 'Psicología y Filosofía', pointsPerQuestion: 10, questionCount: 4, weight: 3.802, maxScore: 152.08 },
      { name: 'Geografía', pointsPerQuestion: 10, questionCount: 2, weight: 2.576, maxScore: 51.52 },
      { name: 'Historia', pointsPerQuestion: 10, questionCount: 2, weight: 3.701, maxScore: 74.02 },
      { name: 'Educación Cívica', pointsPerQuestion: 10, questionCount: 2, weight: 3.101, maxScore: 62.02 },
      { name: 'Economía', pointsPerQuestion: 10, questionCount: 2, weight: 3.502, maxScore: 70.04 },
      { name: 'Comunicación', pointsPerQuestion: 10, questionCount: 4, weight: 3.352, maxScore: 134.08 },
      { name: 'Literatura', pointsPerQuestion: 10, questionCount: 2, weight: 2.501, maxScore: 50.02 },
      { name: 'Razonamiento Matemático', pointsPerQuestion: 10, questionCount: 6, weight: 7.603, maxScore: 456.18 },
      { name: 'Razonamiento Verbal', pointsPerQuestion: 10, questionCount: 6, weight: 7.103, maxScore: 426.18 },
      { name: 'Inglés', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
      { name: 'Quechua y aimara', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
    ]),
    buildUnaDivision('Sociales', [
      { name: 'Aritmética', pointsPerQuestion: 10, questionCount: 3, weight: 3.331, maxScore: 99.93 },
      { name: 'Álgebra', pointsPerQuestion: 10, questionCount: 3, weight: 3.185, maxScore: 95.55 },
      { name: 'Geometría', pointsPerQuestion: 10, questionCount: 2, weight: 3.12, maxScore: 62.4 },
      { name: 'Trigonometría', pointsPerQuestion: 10, questionCount: 2, weight: 3.12, maxScore: 62.4 },
      { name: 'Física', pointsPerQuestion: 10, questionCount: 2, weight: 2.302, maxScore: 46.04 },
      { name: 'Química', pointsPerQuestion: 10, questionCount: 2, weight: 2.404, maxScore: 48.08 },
      { name: 'Biología y Anatomía', pointsPerQuestion: 10, questionCount: 2, weight: 2.504, maxScore: 50.08 },
      { name: 'Psicología y Filosofía', pointsPerQuestion: 10, questionCount: 4, weight: 4.807, maxScore: 192.28 },
      { name: 'Geografía', pointsPerQuestion: 10, questionCount: 4, weight: 4.907, maxScore: 196.28 },
      { name: 'Historia', pointsPerQuestion: 10, questionCount: 4, weight: 5.805, maxScore: 232.2 },
      { name: 'Educación Cívica', pointsPerQuestion: 10, questionCount: 4, weight: 6.576, maxScore: 263.04 },
      { name: 'Economía', pointsPerQuestion: 10, questionCount: 4, weight: 4.607, maxScore: 184.28 },
      { name: 'Comunicación', pointsPerQuestion: 10, questionCount: 4, weight: 6.09, maxScore: 243.6 },
      { name: 'Literatura', pointsPerQuestion: 10, questionCount: 4, weight: 4.3, maxScore: 172 },
      { name: 'Razonamiento Matemático', pointsPerQuestion: 10, questionCount: 6, weight: 7.203, maxScore: 432.18 },
      { name: 'Razonamiento Verbal', pointsPerQuestion: 10, questionCount: 6, weight: 7.603, maxScore: 456.18 },
      { name: 'Inglés', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
      { name: 'Quechua y aimara', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
    ]),
    buildUnaDivision('Biomédicas', [
      { name: 'Aritmética', pointsPerQuestion: 10, questionCount: 3, weight: 3.331, maxScore: 99.93 },
      { name: 'Álgebra', pointsPerQuestion: 10, questionCount: 3, weight: 3.202, maxScore: 96.06 },
      { name: 'Geometría', pointsPerQuestion: 10, questionCount: 3, weight: 3.301, maxScore: 99.03 },
      { name: 'Trigonometría', pointsPerQuestion: 10, questionCount: 3, weight: 3.404, maxScore: 102.12 },
      { name: 'Física', pointsPerQuestion: 10, questionCount: 3, weight: 5.505, maxScore: 165.15 },
      { name: 'Química', pointsPerQuestion: 10, questionCount: 5, weight: 6.623, maxScore: 331.15 },
      { name: 'Biología y Anatomía', pointsPerQuestion: 10, questionCount: 6, weight: 7.816, maxScore: 468.96 },
      { name: 'Psicología y Filosofía', pointsPerQuestion: 10, questionCount: 4, weight: 4.006, maxScore: 160.24 },
      { name: 'Geografía', pointsPerQuestion: 10, questionCount: 2, weight: 2.8, maxScore: 56 },
      { name: 'Historia', pointsPerQuestion: 10, questionCount: 2, weight: 3.302, maxScore: 66.04 },
      { name: 'Educación Cívica', pointsPerQuestion: 10, questionCount: 2, weight: 3.571, maxScore: 71.42 },
      { name: 'Economía', pointsPerQuestion: 10, questionCount: 2, weight: 3.406, maxScore: 68.12 },
      { name: 'Comunicación', pointsPerQuestion: 10, questionCount: 4, weight: 3.302, maxScore: 132.08 },
      { name: 'Literatura', pointsPerQuestion: 10, questionCount: 2, weight: 2.805, maxScore: 56.1 },
      { name: 'Razonamiento Matemático', pointsPerQuestion: 10, questionCount: 6, weight: 7.201, maxScore: 432.06 },
      { name: 'Razonamiento Verbal', pointsPerQuestion: 10, questionCount: 6, weight: 7.201, maxScore: 432.06 },
      { name: 'Inglés', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
      { name: 'Quechua y aimara', pointsPerQuestion: 10, questionCount: 2, weight: 4.087, maxScore: 81.74 },
    ]),
  ]
};

// ----- UNSA piloto (escala DISTINTA: motor decimas, 100 pts, umbrales 80/60/40) -----
const UNSA_ESCALA: Escala = {
  motor: 'decimas',
  escalaTotal: 100,
  umbrales: { excelente: 80, bueno: 60, regular: 40 },
  duracionMin: 90,
  nPreguntasTotal: 20
};

function buildUnsaDivision(codigo: string, nombre: string, cienciaExtra: string): Division {
  const subjects: Division['subjects'] = [
    { name: 'Matemática', questionCount: 5, pointsPerQuestion: 5, weight: 25, maxScore: 25, orden: 1 },
    { name: 'Comunicación', questionCount: 5, pointsPerQuestion: 5, weight: 25, maxScore: 25, orden: 2 },
    { name: cienciaExtra, questionCount: 4, pointsPerQuestion: 5, weight: 20, maxScore: 20, orden: 3 },
    { name: 'Historia y Geografía', questionCount: 3, pointsPerQuestion: 5, weight: 15, maxScore: 15, orden: 4 },
    { name: 'Razonamiento Verbal', questionCount: 3, pointsPerQuestion: 5, weight: 15, maxScore: 15, orden: 5 },
  ];
  const totalQuestions = subjects.reduce((sum, s) => sum + s.questionCount, 0);
  const totalMaxScore = subjects.reduce((sum, s) => sum + s.maxScore, 0);
  return { codigo, nombre, tipo: 'canal', subjects, totalQuestions, totalMaxScore };
}

const UNSA_CONFIG_ORDINARIO: ConfigV2 = {
  universidad: 'unsa',
  proceso: 'ORDINARIO',
  escala: UNSA_ESCALA,
  divisiones: [
    buildUnsaDivision('BIO', 'Biomédicas', 'Biología'),
    buildUnsaDivision('ING', 'Ingenierías', 'Física'),
    buildUnsaDivision('SOC', 'Sociales', 'Filosofía'),
  ]
};

export const MOCK_CONFIG_V2: Record<string, Record<string, ConfigV2>> = {
  una: {
    ORDINARIO: UNA_CONFIG_ORDINARIO,
    CEPRE: UNA_CONFIG_ORDINARIO,
    EXTRAORDINARIO: UNA_CONFIG_ORDINARIO
  },
  unsa: {
    ORDINARIO: UNSA_CONFIG_ORDINARIO
  }
};

/**
 * Genera preguntas de prueba para desarrollo a partir de una Division del config v2.
 * Mantiene orden por asignatura (no mezcla), igual que el flujo real.
 */
function generateMockQuestionsV2(config: ConfigV2, division: Division): Question[] {
  const questions: Question[] = [];
  let questionNumber = 1;
  const secondsPerQuestion = config.escala.nPreguntasTotal > 0
    ? Math.round((config.escala.duracionMin * 60) / config.escala.nPreguntasTotal)
    : 180;

  division.subjects.forEach((subject) => {
    for (let i = 0; i < subject.questionCount; i++) {
      questions.push({
        id: `${division.codigo}-${subject.name}-${i + 1}`,
        number: questionNumber++,
        questionText: `Pregunta de prueba ${i + 1} de ${subject.name} (${division.nombre}). ¿Cuál es la respuesta correcta para este ejercicio de práctica?`,
        questionType: 'Multiple Choice',
        options: [
          'Opción A - Primera alternativa',
          'Opción B - Segunda alternativa',
          'Opción C - Tercera alternativa',
          'Opción D - Cuarta alternativa',
          'Opción E - Quinta alternativa'
        ],
        correctAnswer: Math.floor(Math.random() * 5),
        timeSeconds: secondsPerQuestion,
        imageLink: null,
        subject: subject.name,
        points: subject.maxScore / subject.questionCount,
        sourceFile: `Examen_${subject.name}_${division.nombre}.pdf`,
        justification: `Justificación de práctica para la pregunta ${i + 1} de ${subject.name}.`,
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

interface MockExamSession {
  universidad: string;
  division: string;
  proceso: string;
  escala: Escala;
  questions: Question[];
  divisionConfig: Division;
}

const mockExamSessions = new Map<string, MockExamSession>();
