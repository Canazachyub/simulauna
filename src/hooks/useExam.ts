import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type {
  ExamStore,
  ExamStatus,
  Student,
  ConfigV2,
  Escala,
  Question,
  Answer,
  ExamResult,
  AreaType,
  ReviewItem
} from '../types';
import { PERFORMANCE_THRESHOLDS } from '../types';
import { getConfig, getExam, submitExam, type SubmitExamPayload, type SubmitExamResult } from '../services/api';
import { calculateExamResult } from '../utils/calculations';
import { friendlyError, isRetriableError } from '../utils/friendlyError';
import { safeGetItem, safeRemoveItem, safeSetItem } from '../utils/safeStorage';

function procesoFromStudent(processType?: Student['processType']): string {
  return processType === 'CEPREUNA' ? 'CEPRE' : 'ORDINARIO';
}

// ============================================
// TIPOS EXTENDIDOS DEL STORE
// ============================================
// Se extienden aquí (y no en src/types) para no tocar el contrato compartido: el store del
// examen ahora tiene un estado extra `submit_failed` y algunas acciones nuevas.

/**
 * `submit_failed`: submitExam falló tras todos los reintentos. Las respuestas se CONSERVAN
 * (store persistido + copia en `simulauna_envio_pendiente`) y la UI ofrece Reintentar. Nunca
 * se muestra una nota calculada localmente con preguntas sin clave (eso daba ~0 "real").
 */
export type ExamStatusExt = ExamStatus | 'submit_failed';

/** De dónde salió `result`: 'server' = submitExam (ya persistió el historial en el backend);
 * 'local' = calificado en el cliente (solo posible si TODAS las preguntas traen clave). */
export type ResultSource = 'server' | 'local';

export interface ExamStoreState extends Omit<ExamStore, 'status' | 'loadQuestions'> {
  status: ExamStatusExt;
  /** Escala que devolvió getExam para ESTE examen (umbrales/duración); fuente de verdad sobre `config`. */
  examEscala: Escala | null;
  /** División (área) con la que se pidió el examen en curso: para ofrecer "Continuar" solo si coincide. */
  examDivision: string | null;
  resultSource: ResultSource | null;

  /** Devuelve true si las preguntas se cargaron (el llamador decide si navegar a /examen). */
  loadQuestions: (division: AreaType, universidad: string) => Promise<boolean>;
  /** Retoma un examen en curso rehidratado (vuelve a status 'in_progress'). */
  resumeExam: () => void;
  /** Reintenta el envío tras un `submit_failed` (mismo examSessionId, mismas respuestas). */
  retrySubmit: () => Promise<void>;
  /** Sale de `submit_failed` para revisar respuestas antes de reintentar. */
  backToExam: () => void;
  /** Si el config cargado es de otra universidad, lo descarta para que se vuelva a pedir. */
  invalidateConfigFor: (universidad: string) => void;
}

// ============================================
// PERSISTENCIA (localStorage)
// ============================================

const STORAGE_KEY = 'simulauna_examen';
const PENDING_SUBMISSION_KEY = 'simulauna_envio_pendiente';
/** Un examen en curso caduca a las 24 h (la sesión del servidor vive en CORE.sesiones). */
const IN_PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;
/** El último resultado se conserva una semana para poder recargar /resultados. */
const RESULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Reintentos de submitExam (después del intento inicial): 1 s, 3 s, 6 s. */
const SUBMIT_RETRY_BACKOFF_MS = [1000, 3000, 6000];

interface PersistedExam {
  status: ExamStatusExt;
  student: Student | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Answer[];
  /** Map serializado manualmente como pares [questionId, opción]. */
  savedAnswers: [string, number | null][];
  result: ExamResult | null;
  resultSource: ResultSource | null;
  startTime: string | null;
  examSessionId: string | null;
  universidad: string | null;
  examEscala: Escala | null;
  examDivision: string | null;
  savedAt: number;
}

/** localStorage envuelto: nunca lanza (incógnito, cuota llena, storage bloqueado). */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    const raw = safeGetItem(name);
    if (raw === null) return null;
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      // JSON corrupto: lo descartamos para no romper la hidratación
      safeRemoveItem(name);
      return null;
    }
  },
  setItem: (name, value) => {
    safeSetItem(name, value);
  },
  removeItem: (name) => {
    safeRemoveItem(name);
  },
};

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const EMPTY_EXAM = {
  questions: [] as Question[],
  currentQuestionIndex: 0,
  answers: [] as Answer[],
  savedAnswers: new Map<string, number | null>(),
  result: null as ExamResult | null,
  resultSource: null as ResultSource | null,
  startTime: null as Date | null,
  examSessionId: null as string | null,
  examEscala: null as Escala | null,
  examDivision: null as string | null,
};

/** Convierte lo leído de localStorage al estado del store (revive Map y Date, aplica TTL). */
function reviveExamState(persisted: Partial<PersistedExam> | null | undefined): Partial<ExamStoreState> {
  if (!persisted || typeof persisted !== 'object') return {};

  const now = Date.now();
  const startTime = toDate(persisted.startTime);
  const rawResult = persisted.result ?? null;
  const resultDate = rawResult ? toDate(rawResult.date) : null;
  const result: ExamResult | null = rawResult && resultDate ? { ...rawResult, date: resultDate } : null;

  const savedAnswers = new Map<string, number | null>(
    Array.isArray(persisted.savedAnswers) ? persisted.savedAnswers : []
  );
  const questions = Array.isArray(persisted.questions) ? persisted.questions : [];

  const revived: Partial<ExamStoreState> = {
    student: persisted.student ?? null,
    questions,
    currentQuestionIndex: Math.min(
      Math.max(0, persisted.currentQuestionIndex ?? 0),
      Math.max(0, questions.length - 1)
    ),
    answers: Array.isArray(persisted.answers) ? persisted.answers : [],
    savedAnswers,
    result,
    resultSource: persisted.resultSource ?? null,
    startTime,
    examSessionId: persisted.examSessionId ?? null,
    universidad: persisted.universidad ?? null,
    examEscala: persisted.examEscala ?? null,
    examDivision: persisted.examDivision ?? null,
    error: null,
  };

  // Examen en curso caducado (> 24 h desde que empezó): se descarta, conservando al estudiante.
  const examInProgress = !result && !!startTime && questions.length > 0;
  if (examInProgress && now - startTime.getTime() > IN_PROGRESS_TTL_MS) {
    return { student: revived.student, ...EMPTY_EXAM, savedAnswers: new Map(), status: 'idle', error: null };
  }

  // Resultado viejo (> 7 días): se descarta.
  if (result && now - result.date.getTime() > RESULT_TTL_MS) {
    return { student: revived.student, ...EMPTY_EXAM, savedAnswers: new Map(), status: 'idle', error: null };
  }

  // Normalizar estados transitorios: 'loading' a mitad de envío/carga no puede quedar colgado.
  let status: ExamStatusExt = persisted.status ?? 'idle';
  if (status === 'loading' || status === 'error') {
    status = result ? 'completed' : examInProgress ? 'in_progress' : 'idle';
  }
  if (status === 'completed' && !result) status = examInProgress ? 'in_progress' : 'idle';
  if ((status === 'in_progress' || status === 'submit_failed') && !examInProgress) status = 'idle';

  return { ...revived, status };
}

// ============================================
// ENVÍO PENDIENTE (respaldo si submitExam falla)
// ============================================

interface PendingSubmission extends SubmitExamPayload {
  savedAt: string;
}

function savePendingSubmission(payload: SubmitExamPayload): void {
  const pending: PendingSubmission = { ...payload, savedAt: new Date().toISOString() };
  safeSetItem(PENDING_SUBMISSION_KEY, JSON.stringify(pending));
}

function clearPendingSubmission(): void {
  safeRemoveItem(PENDING_SUBMISSION_KEY);
}

/** Envío pendiente guardado (útil para soporte/recuperación). null si no hay. */
export function getPendingSubmission(): PendingSubmission | null {
  const raw = safeGetItem(PENDING_SUBMISSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSubmission;
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * submitExam con reintentos y backoff (1 s, 3 s, 6 s) usando SIEMPRE el mismo payload — y por
 * lo tanto el mismo examSessionId —, de modo que si un intento sí llegó al servidor pero la
 * respuesta se perdió, el backend (idempotente por examSessionId) no duplica el historial.
 * Solo se reintenta ante fallas transitorias (red, timeout, 5xx); un `success:false` del
 * servidor (p.ej. sesión expirada) se propaga de inmediato.
 */
async function submitWithRetry(payload: SubmitExamPayload): Promise<SubmitExamResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await submitExam(payload);
    } catch (error) {
      const backoff = SUBMIT_RETRY_BACKOFF_MS[attempt];
      if (backoff === undefined || !isRetriableError(error)) throw error;
      await wait(backoff);
    }
  }
}

/** Calificar en el cliente solo es honesto si TODAS las preguntas traen su clave real (>= 0).
 * Con el contrato v2 getExam nunca la envía (sentinel -1 / ausente), así que en la práctica
 * esto queda como red de seguridad para modos que sí la manden. */
function canGradeLocally(questions: Question[]): boolean {
  return questions.length > 0 && questions.every(q => typeof q.correctAnswer === 'number' && q.correctAnswer >= 0);
}

/** ¿Hay un examen empezado y sin calificar en el store? (incluye 'submit_failed') */
export function hasExamInProgress(state: Pick<ExamStoreState, 'questions' | 'startTime' | 'result'>): boolean {
  return state.questions.length > 0 && !!state.startTime && !state.result;
}

// ============================================
// STORE
// ============================================

export const useExamStore = create<ExamStoreState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      status: 'idle',
      student: null,
      config: null,
      error: null,
      universidad: null,
      ...EMPTY_EXAM,

      // Establecer datos del estudiante. Si cambia el DNI se descarta el examen del anterior
      // (no queremos que un segundo postulante en la misma PC "retome" el examen ajeno).
      setStudent: (student: Student) => {
        const previous = get().student;
        if (previous && previous.dni !== student.dni) {
          set({ student, ...EMPTY_EXAM, savedAnswers: new Map(), status: 'idle', error: null });
          return;
        }
        set({ student });
      },

      // Cargar configuración (divisiones + escala) de la universidad indicada
      loadConfig: async (universidad: string) => {
        // Con un examen en curso NO pisamos `universidad`: finishExam la usa para el submit.
        const keepUniversidad = hasExamInProgress(get());
        set(keepUniversidad
          ? { status: 'loading', error: null }
          : { status: 'loading', error: null, universidad });

        try {
          const config: ConfigV2 = await getConfig(universidad, 'ORDINARIO');
          set({ config, status: 'idle' });
        } catch (error) {
          set({ status: 'error', error: friendlyError(error) });
        }
      },

      invalidateConfigFor: (universidad: string) => {
        const { config } = get();
        if (config && config.universidad && config.universidad.toLowerCase() !== universidad.toLowerCase()) {
          set({ config: null });
        }
      },

      // Cargar preguntas del examen para una división específica (getExam v2)
      loadQuestions: async (division: AreaType, universidad: string) => {
        const { student } = get();
        const proceso = procesoFromStudent(student?.processType);
        set({ status: 'loading', error: null });

        try {
          const result = await getExam(universidad, division, proceso, undefined, { dni: student?.dni });
          // Examen NUEVO: se limpia cualquier resultado/progreso anterior.
          set({
            ...EMPTY_EXAM,
            savedAnswers: new Map(),
            questions: result.questions,
            examSessionId: result.examSessionId,
            examEscala: result.escala ?? null,
            examDivision: division,
            universidad,
            status: 'ready'
          });
          return true;
        } catch (error) {
          // Si había un examen en curso, sus datos siguen intactos (se puede retomar).
          set({ status: 'error', error: friendlyError(error) });
          return false;
        }
      },

      // Iniciar el examen
      startExam: () => {
        set({
          status: 'in_progress',
          currentQuestionIndex: 0,
          answers: [],
          savedAnswers: new Map(),
          result: null,
          resultSource: null,
          startTime: new Date()
        });
      },

      resumeExam: () => {
        if (hasExamInProgress(get())) {
          set({ status: 'in_progress', error: null });
        }
      },

      // Guardar respuesta sin evaluar (durante el examen)
      saveAnswer: (questionId: string, selectedOption: number | null) => {
        const { savedAnswers } = get();
        const newSavedAnswers = new Map(savedAnswers);
        newSavedAnswers.set(questionId, selectedOption);
        set({ savedAnswers: newSavedAnswers });
      },

      // Registrar una respuesta (con evaluación - usado al finalizar, legado)
      answerQuestion: (questionId: string, selectedOption: number | null, timeSpent: number) => {
        const { questions, answers } = get();
        const question = questions.find(q => q.id === questionId);

        if (!question) return;

        const isCorrect = selectedOption !== null && selectedOption === question.correctAnswer;

        const newAnswer: Answer = {
          questionId,
          selectedOption,
          isCorrect,
          timeSpent
        };

        set({ answers: [...answers, newAnswer] });
      },

      // Avanzar a la siguiente pregunta
      nextQuestion: () => {
        const { currentQuestionIndex, questions } = get();

        if (currentQuestionIndex < questions.length - 1) {
          set({ currentQuestionIndex: currentQuestionIndex + 1 });
        }
      },

      // Retroceder a la pregunta anterior
      previousQuestion: () => {
        const { currentQuestionIndex } = get();

        if (currentQuestionIndex > 0) {
          set({ currentQuestionIndex: currentQuestionIndex - 1 });
        }
      },

      // Ir a una pregunta específica
      goToQuestion: (index: number) => {
        const { questions } = get();

        if (index >= 0 && index < questions.length) {
          set({ currentQuestionIndex: index });
        }
      },

      // Finalizar el examen: envía respuestas a submitExam (servidor/mock califica, con
      // reintentos) y arma el resultado. Si el servidor no responde, NO inventa una nota:
      // pasa a 'submit_failed' conservando las respuestas.
      finishExam: async () => {
        const {
          status: currentStatus, student, questions, savedAnswers, config, startTime,
          examSessionId, examEscala, universidad: storedUniversidad
        } = get();

        if (!student || !startTime) return;
        if (currentStatus === 'loading') return; // evita doble envío por doble clic

        const universidad = storedUniversidad || 'una';
        const proceso = procesoFromStudent(student.processType);
        const totalTime = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        const umbrales = examEscala?.umbrales ?? config?.escala.umbrales ?? PERFORMANCE_THRESHOLDS;

        set({ status: 'loading', error: null });

        const answersPayload = questions.map(question => ({
          questionId: question.id,
          selectedOption: savedAnswers.get(question.id) ?? null
        }));

        try {
          if (!examSessionId) {
            throw new Error('No hay una sesión de examen activa (examSessionId ausente).');
          }

          const submitResult = await submitWithRetry({
            universidad,
            examSessionId,
            dni: student.dni,
            answers: answersPayload
          });

          clearPendingSubmission();

          const reviewByQuestion = new Map<string, ReviewItem>(submitResult.review.map(r => [r.questionId, r]));

          // Las preguntas del cliente llegaron sin correctAnswer/justification reales (contrato v2);
          // se completan aquí con la revisión que devuelve submitExam, para que Results.tsx pueda
          // seguir mostrando la revisión detallada sin cambios estructurales grandes.
          const patchedQuestions: Question[] = questions.map(q => {
            const review = reviewByQuestion.get(q.id);
            if (!review) return q;
            return { ...q, correctAnswer: review.correctAnswer, justification: review.justification ?? q.justification };
          });

          const evaluatedAnswers: Answer[] = questions.map(question => {
            const review = reviewByQuestion.get(question.id);
            const selectedOption = savedAnswers.get(question.id) ?? null;
            return {
              questionId: question.id,
              selectedOption,
              isCorrect: review?.isCorrect ?? false,
              timeSpent: totalTime / (questions.length || 1)
            };
          });

          const result: ExamResult = {
            student,
            date: new Date(),
            totalScore: submitResult.totalScore,
            maxScore: submitResult.maxScore,
            percentage: submitResult.percentage,
            subjectResults: submitResult.subjectResults,
            answers: evaluatedAnswers,
            totalTime,
            performanceLevel: submitResult.performanceLevel,
            umbrales,
            universidad,
            proceso,
            review: submitResult.review
          };

          set({
            status: 'completed',
            result,
            resultSource: 'server',
            answers: evaluatedAnswers,
            questions: patchedQuestions,
            error: null
          });
        } catch (error) {
          // Calificación local SOLO si todas las preguntas traen su clave real; si no, el
          // puntaje saldría ~0 y se mostraría como si fuera real (bug de "nota falsa").
          if (canGradeLocally(questions)) {
            const divisionConfig = config?.divisiones.find(d => d.codigo === student.area || d.nombre === student.area) ?? null;
            const evaluatedAnswers: Answer[] = questions.map(question => {
              const selectedOption = savedAnswers.get(question.id) ?? null;
              const isCorrect = selectedOption !== null && selectedOption === question.correctAnswer;
              return {
                questionId: question.id,
                selectedOption,
                isCorrect,
                timeSpent: totalTime / (questions.length || 1)
              };
            });
            const result = calculateExamResult(student, questions, evaluatedAnswers, divisionConfig, startTime, umbrales, universidad, proceso);
            clearPendingSubmission();
            set({ status: 'completed', result, resultSource: 'local', answers: evaluatedAnswers, error: null });
            return;
          }

          if (examSessionId) {
            savePendingSubmission({ universidad, examSessionId, dni: student.dni, answers: answersPayload });
          }
          set({ status: 'submit_failed', error: friendlyError(error) });
        }
      },

      retrySubmit: async () => {
        await get().finishExam();
      },

      backToExam: () => {
        if (hasExamInProgress(get())) {
          set({ status: 'in_progress', error: null });
        }
      },

      // Reiniciar el examen
      resetExam: () => {
        set({
          status: 'idle',
          student: null,
          ...EMPTY_EXAM,
          savedAnswers: new Map(),
          error: null,
          universidad: null
        });
      },

      // Establecer error
      setError: (error: string) => {
        set({ status: 'error', error });
      }
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage<PersistedExam>(() => safeLocalStorage),
      // `config` NO se persiste: se vuelve a pedir (y así nunca queda el de otra universidad).
      partialize: (state): PersistedExam => ({
        status: state.status,
        student: state.student,
        questions: state.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        savedAnswers: Array.from(state.savedAnswers.entries()),
        result: state.result,
        resultSource: state.resultSource,
        startTime: state.startTime ? state.startTime.toISOString() : null,
        examSessionId: state.examSessionId,
        universidad: state.universidad,
        examEscala: state.examEscala,
        examDivision: state.examDivision,
        savedAt: Date.now()
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...reviveExamState(persistedState as Partial<PersistedExam> | undefined)
      })
    }
  )
);

/**
 * true cuando el store ya se rehidrató desde localStorage. Con localStorage (síncrono) suele
 * ser true desde el primer render, pero las pantallas que redirigen "si no hay datos" deben
 * esperar a esto para no expulsar al usuario que recargó la página.
 */
export function useExamHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useExamStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useExamStore.persist.onFinishHydration(() => setHydrated(true));
    if (useExamStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);

  return hydrated;
}

// Hooks derivados para facilitar el uso
export function useCurrentQuestion() {
  const questions = useExamStore(state => state.questions);
  const currentIndex = useExamStore(state => state.currentQuestionIndex);
  return questions[currentIndex] || null;
}

export function useProgress() {
  const currentIndex = useExamStore(state => state.currentQuestionIndex);
  const totalQuestions = useExamStore(state => state.questions.length);
  const savedAnswers = useExamStore(state => state.savedAnswers);

  return {
    current: currentIndex + 1,
    total: totalQuestions,
    answered: savedAnswers.size,
    percentage: totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  };
}

export function useIsLastQuestion() {
  const currentIndex = useExamStore(state => state.currentQuestionIndex);
  const totalQuestions = useExamStore(state => state.questions.length);
  return currentIndex === totalQuestions - 1;
}

export function useIsFirstQuestion() {
  const currentIndex = useExamStore(state => state.currentQuestionIndex);
  return currentIndex === 0;
}

export function useSavedAnswer(questionId: string) {
  const savedAnswers = useExamStore(state => state.savedAnswers);
  return savedAnswers.get(questionId) ?? null;
}
