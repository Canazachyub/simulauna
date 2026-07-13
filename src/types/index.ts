// ============================================
// TIPOS PRINCIPALES DEL SISTEMA
// ============================================

// NOTA DE ARQUITECTURA (multi-universidad, ver docs/CONTRATO_API_V2.md):
// AreaType deja de ser un union literal ('Ingenierías' | 'Sociales' | 'Biomédicas') y pasa a
// ser un `string` libre: el código/nombre de la "división" académica que entrega `getConfig`
// para la universidad activa. Se conserva el alias `AreaType` (y el nombre de campo `area` en
// `Student`) para no forzar un rename masivo en componentes ya existentes; ambos son ahora
// sinónimos de `string`. Ver `division` más abajo para el tipo nuevo explícito.
export type AreaType = string;

// Tipos de proceso de admisión (histórico, UNA). El contrato v2 usa 'ORDINARIO' | 'CEPRE' |
// 'EXTRAORDINARIO' para getExam/getConfig; se mantiene ProcessType para el flujo de registro.
export type ProcessType = 'CEPREUNA' | 'GENERAL' | 'EXTRAORDINARIO';
export type ProcesoV2 = 'ORDINARIO' | 'CEPRE' | 'EXTRAORDINARIO';

// Estados del examen
export type ExamStatus = 'idle' | 'loading' | 'ready' | 'in_progress' | 'completed' | 'error';

// ============================================
// DATOS DEL ESTUDIANTE
// ============================================
export interface Student {
  dni: string;
  fullName: string;
  /** Código/nombre de división académica (antes "área"). Ver nota AreaType arriba. */
  area: AreaType;
  processType?: ProcessType; // Tipo de proceso (CEPREUNA usa hojas CEPRE_)
}

// ============================================
// CONFIGURACIÓN DE ASIGNATURAS (legado, universidad 'una' vía adaptador)
// ============================================
/** @deprecated usar SubjectV2 dentro de Division (config v2) */
export interface Subject {
  code: string | number;
  name: string;
  pointsPerQuestion: number;
  questionCount: number;
  weight: number;
  maxScore: number;
}

/** @deprecated usar Division (config v2) */
export interface AreaConfig {
  name: AreaType;
  subjects: Subject[];
  totalQuestions: number;
  totalMaxScore: number;
}

/** @deprecated usar ConfigV2 (config v2) */
export interface Config {
  [key: string]: AreaConfig;
}

// ============================================
// CONFIGURACIÓN v2 — MULTI-UNIVERSIDAD (contrato docs/CONTRATO_API_V2.md §5)
// ============================================
export interface SubjectV2 {
  name: string;
  questionCount: number;
  pointsPerQuestion: number;
  weight: number;
  maxScore: number;
  orden?: number;
}

export interface Division {
  codigo: string;
  nombre: string;
  tipo?: string;
  subjects: SubjectV2[];
  totalQuestions: number;
  totalMaxScore: number;
}

export type ScoringEngine = 'suma_ponderada' | 'decimas' | 'vector_canal';

export interface Escala {
  motor: ScoringEngine;
  escalaTotal: number;
  umbrales: {
    excelente: number;
    bueno: number;
    regular: number;
  };
  duracionMin: number;
  nPreguntasTotal: number;
}

export interface ConfigV2 {
  universidad: string;
  proceso: string;
  divisiones: Division[];
  escala: Escala;
}

// ============================================
// REGISTRO MAESTRO DE UNIVERSIDADES
// ============================================
export type UniversidadEstado = 'activa' | 'piloto' | 'oculta';
export type ProcesoDisponible = 'ORDINARIO' | 'CEPRE' | 'EXTRAORDINARIO';

export interface Universidad {
  codigo: string;
  nombre: string;
  nombreCorto: string;
  estado: UniversidadEstado;
  procesos: ProcesoDisponible[];
  cepreNombre: string;
  colores: {
    primario: string;
    secundario: string;
  };
  logo: string;
  orden: number;
}

// ============================================
// PREGUNTAS Y OPCIONES
// ============================================
export interface QuestionMetadata {
  numero?: string | number;
  tema?: string;
  subtema?: string;
}

export interface Question {
  id: string;
  number: number; // Número de pregunta global (1-60)
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: number; // Índice 0-based de la respuesta correcta
  timeSeconds: number;
  imageLink: string | null;
  subject: string;
  points: number;
  sourceFile?: string | null; // Nombre del archivo de donde se extrajo la pregunta
  justification?: string | null; // Justificación/explicación de la respuesta correcta
  metadata?: QuestionMetadata;
}

// ============================================
// RESPUESTAS DEL ESTUDIANTE
// ============================================
export interface Answer {
  questionId: string;
  selectedOption: number | null; // null si no respondió
  isCorrect: boolean;
  timeSpent: number; // Segundos que tardó en responder
}

// Item de revisión devuelto por submitExam (servidor califica, cliente solo muestra)
export interface ReviewItem {
  questionId: string;
  correctAnswer: number;
  selectedOption: number | null;
  isCorrect: boolean;
  justification?: string | null;
}

// ============================================
// RESULTADOS DEL EXAMEN
// ============================================
export interface SubjectResult {
  name: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  pointsObtained: number;
  maxPoints: number;
}

export interface ExamResult {
  student: Student;
  date: Date;
  totalScore: number;
  maxScore: number;
  percentage: number;
  subjectResults: SubjectResult[];
  answers: Answer[];
  totalTime: number; // Tiempo total en segundos
  performanceLevel: PerformanceLevel;
  /** Umbrales usados para calcular performanceLevel (de escala.umbrales, NUNCA constantes fijas) */
  umbrales: { excelente: number; bueno: number; regular: number };
  /** Universidad y proceso del intento (multi-tenant, default 'una'/'ORDINARIO') */
  universidad?: string;
  proceso?: string;
  /** Revisión detallada devuelta por submitExam (servidor); si no viene, se arma localmente */
  review?: ReviewItem[];
}

export type PerformanceLevel = 'excellent' | 'good' | 'regular' | 'needs_practice';

// ============================================
// ESTADO DEL STORE (ZUSTAND)
// ============================================
// Respuesta guardada durante el examen (sin evaluación)
export interface SavedAnswer {
  questionId: string;
  selectedOption: number | null;
}

export interface ExamStore {
  // Estado
  status: ExamStatus;
  student: Student | null;
  config: ConfigV2 | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Answer[];
  savedAnswers: Map<string, number | null>; // Respuestas guardadas durante el examen
  result: ExamResult | null;
  error: string | null;
  startTime: Date | null;
  examSessionId: string | null;
  /** Universidad resuelta explícitamente por loadConfig (evita depender de una carrera con el store global) */
  universidad: string | null;

  // Acciones
  setStudent: (student: Student) => void;
  // `universidad` se recibe explícito del componente llamante (resuelto vía useParams), en
  // vez de leerse del store global, para evitar una carrera entre el efecto de
  // UniversityGate (que fija la universidad activa) y el efecto que dispara la carga.
  loadConfig: (universidad: string) => Promise<void>;
  loadQuestions: (division: AreaType, universidad: string) => Promise<void>;
  startExam: () => void;
  saveAnswer: (questionId: string, selectedOption: number | null) => void; // Guardar sin evaluar
  answerQuestion: (questionId: string, selectedOption: number | null, timeSpent: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  finishExam: () => Promise<void>;
  resetExam: () => void;
  setError: (error: string) => void;
}

// ============================================
// RESPUESTAS DE LA API
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// PROPS DE COMPONENTES
// ============================================
export interface QuestionProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedOption: number | null) => void;
  timeRemaining: number;
}

export interface ProgressBarProps {
  current: number;
  total: number;
  percentage?: number;
}

export interface TimerProps {
  seconds: number;
  isWarning?: boolean;
  onTimeout?: () => void;
}

export interface ResultCardProps {
  result: SubjectResult;
}

// ============================================
// CONSTANTES (legado 'una' — @deprecated como fuente de verdad, ver getConfig/escala)
// ============================================
/** @deprecated la lista de áreas ahora viene de getConfig(universidad).divisiones */
export const AREAS: AreaType[] = ['Ingenierías', 'Sociales', 'Biomédicas'];

/** @deprecated usar Division.nombre / metadatos del registro; se conserva como fallback visual para 'una' */
export const AREA_INFO: Record<AreaType, { description: string; icon: string; color: string }> = {
  'Ingenierías': {
    description: 'Arquitectura, Civil, Sistemas, Mecánica, Electrónica, Química, etc.',
    icon: 'Calculator',
    color: 'indigo'
  },
  'Sociales': {
    description: 'Derecho, Educación, Administración, Contabilidad, Comunicación, etc.',
    icon: 'Users',
    color: 'emerald'
  },
  'Biomédicas': {
    description: 'Medicina, Enfermería, Odontología, Veterinaria, Biología, etc.',
    icon: 'Heart',
    color: 'rose'
  }
};

/** @deprecated NUNCA usar como fuente de verdad: usar escala.umbrales de getConfig/ExamResult.umbrales */
export const PERFORMANCE_THRESHOLDS = {
  excelente: 2400, // > 80%
  bueno: 1800,      // > 60%
  regular: 1200,   // > 40%
  // needs_practice: < 1200
};

export const PERFORMANCE_MESSAGES: Record<PerformanceLevel, { title: string; message: string; color: string }> = {
  excellent: {
    title: '¡Excelente!',
    message: 'Tu preparación es sobresaliente. Estás muy bien preparado para el examen de admisión.',
    color: 'emerald'
  },
  good: {
    title: '¡Buen trabajo!',
    message: 'Tienes una buena base. Con un poco más de práctica alcanzarás la excelencia.',
    color: 'blue'
  },
  regular: {
    title: 'Regular',
    message: 'Hay áreas que necesitan refuerzo. Enfócate en las asignaturas con menor puntaje.',
    color: 'amber'
  },
  needs_practice: {
    title: 'Necesitas practicar',
    message: 'Es importante dedicar más tiempo al estudio. No te desanimes, cada práctica suma.',
    color: 'red'
  }
};
