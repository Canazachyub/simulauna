import type {
  Question,
  Answer,
  SubjectResult,
  ExamResult,
  Student,
  PerformanceLevel,
  AreaConfig
} from '../types';
import { PERFORMANCE_THRESHOLDS } from '../types';

/**
 * Calcula los resultados por asignatura
 */
export function calculateSubjectResults(
  questions: Question[],
  answers: Answer[],
  areaConfig: AreaConfig | null
): SubjectResult[] {
  // Agrupar preguntas por asignatura
  const subjectGroups = new Map<string, { questions: Question[]; answers: Answer[] }>();

  questions.forEach((question) => {
    if (!subjectGroups.has(question.subject)) {
      subjectGroups.set(question.subject, { questions: [], answers: [] });
    }
    subjectGroups.get(question.subject)!.questions.push(question);
  });

  // Asociar respuestas con sus preguntas
  answers.forEach((answer) => {
    const question = questions.find(q => q.id === answer.questionId);
    if (question && subjectGroups.has(question.subject)) {
      subjectGroups.get(question.subject)!.answers.push(answer);
    }
  });

  // Calcular resultados por asignatura
  const results: SubjectResult[] = [];

  subjectGroups.forEach((data, subjectName) => {
    const correctAnswers = data.answers.filter(a => a.isCorrect).length;
    const totalQuestions = data.questions.length;
    const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Obtener puntos máximos de la configuración si existe
    let maxPoints = 0;
    if (areaConfig) {
      const subjectConfig = areaConfig.subjects.find(s => s.name === subjectName);
      maxPoints = subjectConfig?.maxScore || 0;
    } else {
      // Calcular desde las preguntas
      maxPoints = data.questions.reduce((sum, q) => sum + q.points, 0);
    }

    const pointsPerQuestion = totalQuestions > 0 ? maxPoints / totalQuestions : 0;
    const pointsObtained = correctAnswers * pointsPerQuestion;

    results.push({
      name: subjectName,
      correctAnswers,
      totalQuestions,
      percentage: Math.round(percentage * 100) / 100,
      pointsObtained: Math.round(pointsObtained * 100) / 100,
      maxPoints: Math.round(maxPoints * 100) / 100
    });
  });

  // Ordenar por nombre de asignatura
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Determina el nivel de rendimiento según el puntaje
 */
export function getPerformanceLevel(totalScore: number): PerformanceLevel {
  if (totalScore >= PERFORMANCE_THRESHOLDS.excellent) return 'excellent';
  if (totalScore >= PERFORMANCE_THRESHOLDS.good) return 'good';
  if (totalScore >= PERFORMANCE_THRESHOLDS.regular) return 'regular';
  return 'needs_practice';
}

/**
 * Calcula el resultado completo del examen
 */
export function calculateExamResult(
  student: Student,
  questions: Question[],
  answers: Answer[],
  areaConfig: AreaConfig | null,
  startTime: Date
): ExamResult {
  const subjectResults = calculateSubjectResults(questions, answers, areaConfig);

  const totalScore = subjectResults.reduce((sum, r) => sum + r.pointsObtained, 0);
  const maxScore = areaConfig?.totalMaxScore || subjectResults.reduce((sum, r) => sum + r.maxPoints, 0);
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  const totalTime = Math.round((new Date().getTime() - startTime.getTime()) / 1000);

  return {
    student,
    date: new Date(),
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
    subjectResults,
    answers,
    totalTime,
    performanceLevel: getPerformanceLevel(totalScore)
  };
}

/**
 * Formatea el tiempo en formato MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formatea el tiempo en formato legible (ej: "1h 30min 45s")
 */
export function formatTimeReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}min`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Formatea un número con separador de miles
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formatea una fecha en español
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Obtiene el color para un porcentaje (para gráficos)
 */
export function getColorForPercentage(percentage: number): string {
  if (percentage >= 80) return '#10B981'; // emerald
  if (percentage >= 60) return '#3B82F6'; // blue
  if (percentage >= 40) return '#F59E0B'; // amber
  return '#EF4444'; // red
}

/**
 * Convierte índice numérico a letra (0 -> A, 1 -> B, etc.)
 */
export function indexToLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Valida un DNI peruano (8 dígitos)
 */
export function validateDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

/**
 * Valida un nombre (al menos 3 caracteres, solo letras y espacios)
 */
export function validateName(name: string): boolean {
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,100}$/.test(name.trim());
}
