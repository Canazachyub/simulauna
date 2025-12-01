// ============================================
// TIPOS PRINCIPALES DEL SISTEMA
// ============================================

// Áreas de estudio disponibles
export type AreaType = 'Ingenierías' | 'Sociales' | 'Biomédicas';

// Estados del examen
export type ExamStatus = 'idle' | 'loading' | 'ready' | 'in_progress' | 'completed' | 'error';

// ============================================
// DATOS DEL ESTUDIANTE
// ============================================
export interface Student {
  dni: string;
  fullName: string;
  area: AreaType;
}

// ============================================
// CONFIGURACIÓN DE ASIGNATURAS
// ============================================
export interface Subject {
  code: string | number;
  name: string;
  pointsPerQuestion: number;
  questionCount: number;
  weight: number;
  maxScore: number;
}

export interface AreaConfig {
  name: AreaType;
  subjects: Subject[];
  totalQuestions: number;
  totalMaxScore: number;
}

export interface Config {
  [key: string]: AreaConfig;
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
  config: Config | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Answer[];
  savedAnswers: Map<string, number | null>; // Respuestas guardadas durante el examen
  result: ExamResult | null;
  error: string | null;
  startTime: Date | null;

  // Acciones
  setStudent: (student: Student) => void;
  loadConfig: () => Promise<void>;
  loadQuestions: (area: AreaType) => Promise<void>;
  startExam: () => void;
  saveAnswer: (questionId: string, selectedOption: number | null) => void; // Guardar sin evaluar
  answerQuestion: (questionId: string, selectedOption: number | null, timeSpent: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  finishExam: () => void;
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
// CONSTANTES
// ============================================
export const AREAS: AreaType[] = ['Ingenierías', 'Sociales', 'Biomédicas'];

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

export const PERFORMANCE_THRESHOLDS = {
  excellent: 2400, // > 80%
  good: 1800,      // > 60%
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
