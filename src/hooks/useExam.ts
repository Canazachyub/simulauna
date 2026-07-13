import { create } from 'zustand';
import type {
  ExamStore,
  Student,
  ConfigV2,
  Question,
  Answer,
  ExamResult,
  AreaType,
  ReviewItem
} from '../types';
import { PERFORMANCE_THRESHOLDS } from '../types';
import { getConfig, getExam, submitExam } from '../services/api';
import { calculateExamResult } from '../utils/calculations';

function procesoFromStudent(processType?: Student['processType']): string {
  return processType === 'CEPREUNA' ? 'CEPRE' : 'ORDINARIO';
}

export const useExamStore = create<ExamStore>((set, get) => ({
  // Estado inicial
  status: 'idle',
  student: null,
  config: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  savedAnswers: new Map(),
  result: null,
  error: null,
  startTime: null,
  examSessionId: null,
  universidad: null,

  // Establecer datos del estudiante
  setStudent: (student: Student) => {
    set({ student });
  },

  // Cargar configuración (divisiones + escala) de la universidad indicada
  loadConfig: async (universidad: string) => {
    set({ status: 'loading', error: null, universidad });

    try {
      const config: ConfigV2 = await getConfig(universidad, 'ORDINARIO');
      set({ config, status: 'idle' });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error al cargar configuración'
      });
    }
  },

  // Cargar preguntas del examen para una división específica (getExam v2)
  loadQuestions: async (division: AreaType, universidad: string) => {
    const { student } = get();
    const proceso = procesoFromStudent(student?.processType);
    set({ status: 'loading', error: null, universidad });

    try {
      const result = await getExam(universidad, division, proceso);
      set({
        questions: result.questions,
        examSessionId: result.examSessionId,
        status: 'ready'
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error al cargar preguntas'
      });
    }
  },

  // Iniciar el examen
  startExam: () => {
    set({
      status: 'in_progress',
      currentQuestionIndex: 0,
      answers: [],
      savedAnswers: new Map(),
      startTime: new Date()
    });
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

  // Finalizar el examen: envía respuestas a submitExam (servidor/mock califica) y arma el resultado
  finishExam: async () => {
    const { student, questions, savedAnswers, config, startTime, examSessionId, universidad: storedUniversidad } = get();

    if (!student || !startTime) return;

    const universidad = storedUniversidad || 'una';
    const proceso = procesoFromStudent(student.processType);
    const totalTime = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    set({ status: 'loading', error: null });

    const answersPayload = questions.map(question => ({
      questionId: question.id,
      selectedOption: savedAnswers.get(question.id) ?? null
    }));

    try {
      let submitResult;
      if (examSessionId) {
        submitResult = await submitExam({
          universidad,
          examSessionId,
          dni: student.dni,
          answers: answersPayload
        });
      } else {
        throw new Error('No hay una sesión de examen activa (examSessionId ausente).');
      }

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

      const umbrales = config?.escala.umbrales ?? PERFORMANCE_THRESHOLDS;

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
        answers: evaluatedAnswers,
        questions: patchedQuestions
      });
    } catch (error) {
      // Fallback: si submitExam falla (backend v2 no disponible aún), calificamos localmente
      // usando calculateExamResult para no bloquear al usuario.
      console.warn('submitExam falló, calificando localmente como fallback:', error);
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
      const umbrales = config?.escala.umbrales ?? PERFORMANCE_THRESHOLDS;
      const result = calculateExamResult(student, questions, evaluatedAnswers, divisionConfig, startTime, umbrales, universidad, proceso);
      set({ status: 'completed', result, answers: evaluatedAnswers });
    }
  },

  // Reiniciar el examen
  resetExam: () => {
    set({
      status: 'idle',
      student: null,
      questions: [],
      currentQuestionIndex: 0,
      answers: [],
      savedAnswers: new Map(),
      result: null,
      error: null,
      startTime: null,
      examSessionId: null,
      universidad: null
    });
  },

  // Establecer error
  setError: (error: string) => {
    set({ status: 'error', error });
  }
}));

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
