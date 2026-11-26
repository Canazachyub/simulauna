import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useExamStore, useCurrentQuestion, useProgress, useIsLastQuestion, useIsFirstQuestion,
  useExamHydrated, hasExamInProgress
} from '../hooks/useExam';
import { useUniversityStore } from '../hooks/useUniversity';
import { useSlowHint } from '../hooks/useSlowHint';
import { useExamExitGuard } from '../hooks/useExamExitGuard';
import { Question } from './Question';
import { FichaOptica } from './ficha/FichaOptica';
import { resolveLogoUrl } from '../utils/logos';
import { Mascot } from './pages/Mascot';
import { resolveThemeVars } from '../utils/universityTheme';
import { whatsappUrl } from '../constants/contact';
import { CoachTour, type CoachTourStep } from './onboarding/CoachTour';
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle,
  Clock, List, FileCheck, AlertTriangle, X, Sparkles, AlarmClockCheck,
  RotateCcw, MessageCircle, LogOut
} from 'lucide-react';
import clsx from 'clsx';

/** Formatea segundos a H:MM:SS o M:SS (mismo formato que useStopwatch). */
function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Cronómetro anclado al `startTime` persistido del examen (no al montaje del componente): si
 * el alumno recarga la página o retoma el examen más tarde, el tiempo no vuelve a 0:00.
 */
function useExamElapsed(startTime: Date | null, running: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [running]);

  const elapsedTime = startTime ? Math.max(0, Math.round((now - startTime.getTime()) / 1000)) : 0;
  return { elapsedTime, formattedTime: formatElapsed(elapsedTime) };
}

/** true mientras el viewport cumpla la media query (p.ej. panel lateral de la ficha en ≥1280px). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(query);
    } catch {
      return;
    }
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
}

/** Tour de primera vez del simulacro (ver src/components/onboarding/CoachTour.tsx). Los
 * selectores apuntan a los `data-tour="quiz-*"` del header más abajo. El botón "Terminar"
 * del header ahora es visible también en móvil (antes estaba oculto y en móvil no había
 * forma de terminar sin llegar a la última pregunta). */
const SIMULACRO_TOUR_STEPS: CoachTourStep[] = [
  {
    title: '¡Hola! Soy tu guía',
    text: 'Te muestro rapidito cómo funciona tu simulacro antes de que empieces a resolver.',
  },
  {
    selector: '[data-tour="quiz-cronometro"]',
    title: 'Tu tiempo corre aquí',
    text: 'El cronómetro cuenta desde que inicias. Míralo de reojo para no pasarte del tiempo recomendado.',
  },
  {
    selector: '[data-tour="quiz-navegador"]',
    title: 'Tu ficha de respuestas',
    text: 'Como la hoja del examen real: marca tus respuestas o toca un número para saltar a esa pregunta, sin perder nada.',
  },
  {
    selector: '[data-tour="quiz-progreso"]',
    title: 'Tu avance en un vistazo',
    text: 'Esta barra crece con cada pregunta que respondes, así sabes cuánto te falta.',
  },
  {
    selector: '[data-tour="quiz-calificar"]',
    title: 'Cuando termines, toca aquí',
    text: 'Puedes terminar y ver tu nota en cualquier momento; te avisamos si dejas preguntas sin responder.',
  },
];

export function Quiz() {
  const navigate = useNavigate();
  const { universidad: universidadParam } = useParams<{ universidad: string }>();
  const activaUniversidad = useUniversityStore(state => state.activa);
  const registroUniversidades = useUniversityStore(state => state.registro);
  const universidad = activaUniversidad || universidadParam || 'una';
  const themeVars = resolveThemeVars(universidad, registroUniversidades);
  const {
    status,
    student,
    config,
    examEscala,
    questions,
    savedAnswers,
    currentQuestionIndex,
    startTime,
    result,
    error,
    examSessionId,
    startExam,
    resumeExam,
    saveAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    finishExam,
    retrySubmit,
    backToExam
  } = useExamStore();
  const hydrated = useExamHydrated();

  // Duración recomendada según la escala del examen (la que devolvió getExam; fallback al
  // config de la universidad activa, docs/CONTRATO_API_V2.md §5)
  const recommendedDurationMin = examEscala?.duracionMin ?? config?.escala.duracionMin;

  const currentQuestion = useCurrentQuestion();
  const progress = useProgress();
  const isLastQuestion = useIsLastQuestion();
  const isFirstQuestion = useIsFirstQuestion();

  // Ficha de respuestas: drawer (<1280px) o panel lateral fijo a la derecha (≥1280px)
  const [showNavigator, setShowNavigator] = useState(false);
  const isWide = useMediaQuery('(min-width: 1280px)');
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Dirección de navegación para animación (1 = avanzar, -1 = retroceder, 0 = idle/initial)
  const prevIndexRef = useRef<number>(currentQuestionIndex);
  const [navDirection, setNavDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const prev = prevIndexRef.current;
    if (currentQuestionIndex > prev) {
      setNavDirection(1);
    } else if (currentQuestionIndex < prev) {
      setNavDirection(-1);
    }
    prevIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Cronómetro global del examen (anclado al startTime persistido)
  const { elapsedTime, formattedTime } = useExamElapsed(startTime, status === 'in_progress');

  // "Calificando…" (finishExam en curso, con sus reintentos) vs. carga inicial de preguntas
  const isSubmitting = status === 'loading' && !!startTime && questions.length > 0;
  const slowHint = useSlowHint(status === 'loading');

  // Salida accidental (atrás / cerrar pestaña) solo mientras el examen está en curso
  const { showExitModal, stay: stayInExam, dismiss: dismissExitModal } = useExamExitGuard(status === 'in_progress');

  // Estados de alerta del cronómetro respecto a la duración recomendada de la escala activa
  // (>=75% amarillo, >=100% rojo). Sin duración recomendada, el cronómetro queda neutral.
  const recommendedSeconds = typeof recommendedDurationMin === 'number' ? recommendedDurationMin * 60 : null;
  const timeRatio = recommendedSeconds ? elapsedTime / recommendedSeconds : 0;
  const isTimeWarning = recommendedSeconds !== null && timeRatio >= 0.75 && timeRatio < 1;
  const isTimeCritical = recommendedSeconds !== null && timeRatio >= 1;

  // Opción marcada por índice de pregunta (null = en blanco). La ficha permite BORRAR una
  // marca (saveAnswer(id, null), que finishExam ya trata como "sin responder"), así que una
  // respuesta cuenta solo si su valor no es null — no basta con que la clave exista en el Map.
  const marcadas = useMemo(
    () => questions.map(q => savedAnswers.get(q.id) ?? null),
    [savedAnswers, questions]
  );

  // Calcular preguntas contestadas y sin contestar
  const { answeredCount, unansweredCount, unansweredIndexes, unansweredNumbers } = useMemo(() => {
    const indexes: number[] = [];
    marcadas.forEach((m, idx) => {
      if (m === null) {
        indexes.push(idx);
      }
    });
    return {
      answeredCount: marcadas.length - indexes.length,
      unansweredCount: indexes.length,
      unansweredIndexes: indexes,
      unansweredNumbers: indexes.map(i => i + 1),
    };
  }, [marcadas]);

  // Tiempo promedio por pregunta (segundos)
  const averageSecondsPerQuestion = useMemo(() => {
    if (answeredCount === 0) return 0;
    return Math.round(elapsedTime / answeredCount);
  }, [elapsedTime, answeredCount]);

  const averageFormatted = useMemo(() => {
    const s = averageSecondsPerQuestion;
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [averageSecondsPerQuestion]);

  // Obtener respuesta guardada para la pregunta actual
  const currentSavedAnswer = currentQuestion ? savedAnswers.get(currentQuestion.id) ?? null : null;

  // Iniciar examen cuando el componente se monta
  useEffect(() => {
    if (status === 'ready' && questions.length > 0) {
      startExam();
    }
  }, [status, questions.length, startExam]);

  // Examen rehidratado (recarga de página o vuelta desde otra pantalla): retomarlo. Cubre el
  // caso en que otra pantalla (p.ej. loadConfig de StudentForm) dejó status en 'idle'.
  useEffect(() => {
    if (!hydrated) return;
    if ((status === 'idle' || status === 'error') && hasExamInProgress({ questions, startTime, result })) {
      resumeExam();
    }
  }, [hydrated, status, questions, startTime, result, resumeExam]);

  // Redirect si no hay datos — SOLO después de rehidratar el store desde localStorage, para
  // no expulsar a quien recargó la página en medio del examen.
  useEffect(() => {
    if (!hydrated) return;
    if (!student) {
      navigate(`/${universidad}/registro`, { replace: true });
    } else if (status === 'completed' && result) {
      navigate(`/${universidad}/resultados`, { replace: true });
    } else if (questions.length === 0 && status !== 'loading') {
      navigate(`/${universidad}/confirmar`, { replace: true });
    }
  }, [hydrated, student, questions.length, status, result, navigate, universidad]);

  const handleSelectAnswer = useCallback((index: number) => {
    if (!currentQuestion) return;
    saveAnswer(currentQuestion.id, index);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [currentQuestion, saveAnswer]);

  const handleNext = useCallback(() => {
    if (!isLastQuestion) {
      nextQuestion();
    }
  }, [isLastQuestion, nextQuestion]);

  const handlePrevious = useCallback(() => {
    if (!isFirstQuestion) {
      previousQuestion();
    }
  }, [isFirstQuestion, previousQuestion]);

  // Navega a resultados SOLO si el servidor calificó; si no, el store queda en
  // 'submit_failed' y esta misma pantalla muestra el aviso con Reintentar.
  const goToResultsIfCompleted = useCallback(() => {
    if (useExamStore.getState().status === 'completed') {
      navigate(`/${universidad}/resultados`, { replace: true });
    }
  }, [navigate, universidad]);

  const handleFinishExam = useCallback(async () => {
    setIsFinishing(true);
    setShowFinishModal(false);
    try {
      await finishExam();
      goToResultsIfCompleted();
    } finally {
      setIsFinishing(false);
    }
  }, [finishExam, goToResultsIfCompleted]);

  const handleRetrySubmit = useCallback(async () => {
    await retrySubmit();
    goToResultsIfCompleted();
  }, [retrySubmit, goToResultsIfCompleted]);

  const handleExitExam = useCallback(() => {
    dismissExitModal();
    navigate(`/${universidad}`);
  }, [dismissExitModal, navigate, universidad]);

  const openFinishModal = useCallback(() => {
    setShowNavigator(false);
    setShowFinishModal(true);
  }, []);

  // Marcar en la ficha = exactamente la misma acción que tocar la opción en la pregunta
  // (saveAnswer del store). null borra la marca.
  const handleMarcarFicha = useCallback((index: number, opcion: number | null) => {
    const q = questions[index];
    if (!q) return;
    saveAnswer(q.id, opcion);
    if (opcion !== null && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [questions, saveAnswer]);

  // Tocar el número en la ficha lleva a esa pregunta (en el drawer, además lo cierra)
  const handleIrFicha = useCallback((index: number) => {
    goToQuestion(index);
    if (!isWide) setShowNavigator(false);
  }, [goToQuestion, isWide]);

  // Botón de lista del header: en ≥1280px muestra/oculta el panel lateral; si no, abre el drawer
  const handleToggleFicha = useCallback(() => {
    if (isWide) setShowSidePanel(v => !v);
    else setShowNavigator(true);
  }, [isWide]);

  // Drawer: foco al botón de cerrar al abrir y Escape para cerrar
  useEffect(() => {
    if (!showNavigator || isWide) return;
    drawerCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNavigator(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNavigator, isWide]);

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      // Evitar con modificadores
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'ArrowLeft') {
        if (!isFirstQuestion) {
          e.preventDefault();
          previousQuestion();
        }
      } else if (e.key === 'ArrowRight') {
        if (!isLastQuestion) {
          e.preventDefault();
          nextQuestion();
        }
      } else if (/^[1-5]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (currentQuestion && idx < currentQuestion.options.length) {
          e.preventDefault();
          saveAnswer(currentQuestion.id, idx);
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(10);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, isFirstQuestion, isLastQuestion, previousQuestion, nextQuestion, saveAnswer]);

  // Cabecera de la ficha: nombre y logo de la universidad activa
  const fichaUniversidad = useMemo(() => {
    const entry = registroUniversidades.find(u => u.codigo === universidad);
    return {
      nombre: entry?.nombre ?? universidad.toUpperCase(),
      logoUrl: resolveLogoUrl(universidad, entry?.logo),
    };
  }, [registroUniversidades, universidad]);

  const fichaPostulante = useMemo(
    () => (student ? { nombre: student.fullName, dni: student.dni } : undefined),
    [student]
  );

  // No se pudo calificar (submitExam falló tras los reintentos): NO hay nota inventada.
  // Las respuestas siguen guardadas (store persistido + envío pendiente en localStorage).
  if (status === 'submit_failed') {
    const whatsappHref = whatsappUrl(
      `Hola, no pude calificar mi simulacro en SimulaUNA.${student ? ` DNI: ${student.dni}.` : ''}${examSessionId ? ` Sesión: ${examSessionId}.` : ''}`
    );
    return (
      <div className="min-h-screen flex items-center justify-center bg-andean-white px-4 py-12" style={themeVars}>
        <div className="max-w-md w-full text-center">
          <Mascot
            src="/illustrations/lobito-pensando.webp"
            alt="Mascota SimulaUNA: un lobito pensativo"
            className="w-36 sm:w-44 mx-auto mb-5 select-none"
          />
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mb-3">
            No pudimos calificar tu examen
          </h1>
          <p className="text-slate-700 font-semibold mb-2">
            Tus respuestas están guardadas en este dispositivo.
          </p>
          {error && <p className="text-slate-500 text-sm mb-6">{error}</p>}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleRetrySubmit}
              className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl text-white font-bold active:scale-[0.98] transition"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)' }}
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={backToExam}
              className="inline-flex items-center justify-center min-h-11 px-6 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
            >
              Volver a revisar mis respuestas
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-2.5 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-50 transition"
            >
              <MessageCircle className="w-4 h-4" />
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Calificando (submitExam con reintentos automáticos) o cargando preguntas
  if (status === 'loading' || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 paper-bg relative px-4">
        <div className="absolute inset-x-0 top-0 h-96 spotlight-gold pointer-events-none" aria-hidden="true" />
        <div className="text-center relative" aria-live="polite">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-sans">
            {isSubmitting ? 'Calificando tu examen…' : 'Cargando pregunta...'}
          </p>
          {slowHint && <p className="mt-2 text-sm text-slate-500 font-sans max-w-xs mx-auto">{slowHint}</p>}
        </div>
      </div>
    );
  }

  const progressPercentage = (answeredCount / progress.total) * 100;
  const isComplete = answeredCount === progress.total;

  return (
    <div className="min-h-screen bg-andean-white relative pb-24" style={themeVars}>
      {/* Tour de primera vez: se activa apenas el simulacro está listo/en progreso (no
          durante la carga) y sólo si nunca se vio (localStorage `simulauna_tour_simulacro`). */}
      <CoachTour
        name="simulacro"
        steps={SIMULACRO_TOUR_STEPS}
        active={status === 'ready' || status === 'in_progress'}
      />

      {/* Spotlight dorado sutil arriba */}
      <div
        className="absolute inset-x-0 top-0 h-96 spotlight-gold pointer-events-none"
        aria-hidden="true"
      />

      {/* Constelación fija a la derecha (desktop) */}
      <div
        className="hidden lg:block fixed top-1/4 right-8 w-48 h-32 opacity-[0.08] pointer-events-none z-0"
        style={{
          backgroundImage: "url('/illustrations/constellation.svg')",
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          color: '#003D7A',
        }}
        aria-hidden="true"
      />

      {/* ========== HEADER sticky ultraminimal ========== */}
      <header className="glass sticky top-0 z-20 border-b border-slate-200/60 h-14 relative overflow-hidden">
        {/* Barra superior tematizada con el color institucional de la universidad activa */}
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, var(--uni-primary) 0%, var(--uni-primary-deep) 60%, var(--uni-primary) 100%)' }}
          aria-hidden="true"
        />
        {/* Patrón sutil detrás del logo */}
        <div
          className="absolute left-0 top-0 bottom-0 w-48 andean-bold opacity-[0.04] pointer-events-none"
          style={{ color: 'var(--uni-primary)' }}
          aria-hidden="true"
        />
        <div className="relative h-full max-w-6xl mx-auto px-3 sm:px-4 flex items-center gap-2 sm:gap-4">
          {/* Izquierda: marca + asignatura dinámica */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-base font-black text-slate-900 tracking-tight hidden sm:inline">
              SimulaUNA
            </span>
            <span
              className="chip whitespace-nowrap truncate max-w-[28vw] sm:max-w-none ml-0.5 border"
              style={{
                backgroundColor: 'var(--uni-primary-soft)',
                color: 'var(--uni-primary-safe)',
                borderColor: 'var(--uni-primary-soft)',
              }}
            >
              {currentQuestion.subject}
            </span>
            {isComplete && (
              <span
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-accent/15 text-brand-accent-700 border border-brand-accent/40 text-[11px] font-semibold animate-bounce-in"
                aria-live="polite"
              >
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                ¡Completo!
              </span>
            )}
          </div>

          {/* Centro: progreso ultra fino + porcentaje */}
          <div className="flex-1 flex flex-col items-stretch gap-1 min-w-0 px-1 sm:px-2" data-tour="quiz-progreso">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full transition-[width] duration-500 ease-out rounded-full"
                  style={{
                    width: `${progressPercentage}%`,
                    background: 'linear-gradient(90deg, var(--uni-primary) 0%, var(--uni-primary-deep) 70%, #D4AF37 100%)',
                  }}
                  role="progressbar"
                  aria-valuenow={answeredCount}
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                />
              </div>
              <span className="text-[11px] font-mono font-bold tabular-nums text-slate-500 hidden sm:inline">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans text-center tabular-nums hidden sm:block">
              {answeredCount}/{progress.total} respondidas
            </div>
          </div>

          {/* Derecha: cronómetro + acciones */}
          <div className="flex items-center gap-1.5">
            <div
              className={clsx(
                'group relative flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-md transition-colors',
                isTimeCritical
                  ? 'text-red-700 bg-red-50 hover:bg-red-100'
                  : isTimeWarning
                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                    : 'text-slate-600 hover:bg-slate-100'
              )}
              aria-label={`Tiempo transcurrido ${formattedTime}${isTimeCritical ? ', superaste la duración recomendada' : isTimeWarning ? ', te acercas a la duración recomendada' : ''}`}
              data-tour="quiz-cronometro"
            >
              {isTimeWarning || isTimeCritical ? (
                <AlarmClockCheck className={clsx('w-3.5 h-3.5', isTimeCritical ? 'text-red-500' : 'text-amber-500', 'animate-pulse')} aria-hidden="true" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-400 hidden sm:block" aria-hidden="true" />
              )}
              <span className="font-mono text-sm tabular-nums">{formattedTime}</span>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-2 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-elevation-2 z-30">
                Promedio: {averageFormatted} / pregunta
                {typeof recommendedDurationMin === 'number' && (
                  <> · Duración recomendada: {recommendedDurationMin} min</>
                )}
              </div>
            </div>

            <button
              onClick={handleToggleFicha}
              className={clsx(
                'inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-600 hover:bg-slate-100 transition-colors',
                isWide && showSidePanel && 'bg-slate-100'
              )}
              aria-label={isWide
                ? (showSidePanel ? 'Ocultar tu ficha de respuestas' : 'Mostrar tu ficha de respuestas')
                : 'Abrir tu ficha de respuestas'}
              aria-expanded={isWide ? showSidePanel : showNavigator}
              data-tour="quiz-navegador"
            >
              <List className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>

            {/* Terminar: visible SIEMPRE (también en móvil), con el color de la universidad */}
            <button
              onClick={openFinishModal}
              className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-xs sm:text-sm font-semibold text-white active:scale-95 transition-transform whitespace-nowrap"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)' }}
              aria-label="Terminar y ver mi nota"
              data-tour="quiz-calificar"
            >
              <FileCheck className="w-4 h-4 hidden sm:block" />
              <span className="sm:hidden">Terminar</span>
              <span className="hidden sm:inline">Terminar y ver mi nota</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========== MAIN (+ ficha lateral fija en >=1280px) ========== */}
      <div className="relative z-10 xl:flex xl:items-start xl:gap-6 xl:max-w-[1360px] xl:mx-auto xl:px-6">
        <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 xl:flex-1 xl:min-w-0 xl:px-0">
          {/* Transición corta entre preguntas (fade + 12px); sin animaciones llamativas */}
          <div
            key={currentQuestionIndex}
            className={navDirection === -1 ? 'examen-cambio--ant' : 'examen-cambio--sig'}
          >
            <Question
              question={currentQuestion}
              questionNumber={progress.current}
              totalQuestions={progress.total}
              selectedAnswer={currentSavedAnswer}
              showFeedback={false}
              isCorrect={null}
              onSelectAnswer={handleSelectAnswer}
            />
          </div>
        </main>

        {isWide && showSidePanel && (
          <aside
            className="sticky top-[72px] mt-8 md:mt-12 w-[488px] shrink-0 flex flex-col max-h-[calc(100vh-160px)] rounded-2xl border border-slate-200 bg-white shadow-elevation-2 overflow-hidden"
            aria-labelledby="ficha-panel-titulo"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
              <h2 id="ficha-panel-titulo" className="font-display text-lg font-bold text-slate-900">
                Tu ficha de respuestas
              </h2>
              <span className="text-sm font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                {answeredCount} de {progress.total} marcadas
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 bg-slate-100/70">
              <FichaOptica
                preguntas={questions}
                marcadas={marcadas}
                modo="marcar"
                actual={currentQuestionIndex}
                onMarcar={handleMarcarFicha}
                onIr={handleIrFicha}
                permitirDesmarcar
                universidad={fichaUniversidad}
                postulante={fichaPostulante}
                seguirActual
              />
            </div>
            <div className="border-t border-slate-200 px-4 py-3">
              <button
                onClick={openFinishModal}
                className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white active:scale-[0.99] transition"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)' }}
              >
                <FileCheck className="w-4 h-4" />
                Terminar y ver mi nota
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* ========== FOOTER sticky navegación (nav inferior cómoda con el pulgar en móvil) ========== */}
      <footer className="glass fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/60 h-16 shadow-[0_-4px_16px_-4px_rgba(15,23,42,0.08)]">
        <div className="h-full max-w-6xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3">
          {/* Anterior */}
          <button
            onClick={handlePrevious}
            className={clsx(
              'shrink-0 inline-flex items-center justify-center gap-1.5 min-w-11 min-h-11 px-3 sm:px-4 py-2 rounded-lg border-2 border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all',
              isFirstQuestion && 'opacity-40 pointer-events-none'
            )}
            aria-label="Pregunta anterior"
            disabled={isFirstQuestion}
          >
            <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Contador central: 60 puntos no caben y aplastaban "Siguiente"; el mapa completo
              está en la ficha de respuestas (ícono de lista del header) */}
          <div className="flex-1 min-w-0 flex flex-col items-center gap-1" aria-live="polite">
            <p className="text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
              Pregunta {currentQuestionIndex + 1} <span className="font-normal text-slate-600">de {progress.total}</span>
            </p>
            <p className="hidden sm:block text-xs text-slate-600 tabular-nums">
              {answeredCount} respondidas · {progress.total - answeredCount} pendientes
            </p>
          </div>

          {/* Siguiente / Calificar */}
          {isLastQuestion ? (
            <button
              onClick={openFinishModal}
              className="shrink-0 btn-accent-gold shine-hover inline-flex items-center justify-center gap-1.5 min-h-11 px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold active:scale-95 transition-transform whitespace-nowrap"
              aria-label="Terminar y ver mi nota"
            >
              <FileCheck className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">Terminar y ver mi nota</span>
              <span className="min-[380px]:hidden">Terminar</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="shrink-0 whitespace-nowrap shine-hover inline-flex items-center justify-center gap-1.5 min-h-11 px-5 sm:px-6 py-2 rounded-lg text-sm font-semibold text-white active:scale-95 transition-transform"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)',
                boxShadow: '0 10px 25px -10px var(--uni-primary)',
              }}
              aria-label="Siguiente pregunta"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* ========== DRAWER ficha de respuestas (<1280px) ==========
          Móvil: hoja desde abajo (85vh, scroll interno). Tablet/laptop: panel a la derecha. */}
      {showNavigator && !isWide && (
        <div
          className="fixed inset-0 z-40 bg-black/40 animate-fade-in"
          onClick={() => setShowNavigator(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ficha-drawer-titulo"
            className="absolute inset-x-0 bottom-0 h-[85vh] supports-[height:100dvh]:h-[85dvh] rounded-t-3xl md:left-auto md:right-0 md:top-0 md:h-full md:supports-[height:100dvh]:h-full md:w-full md:max-w-[600px] md:rounded-none bg-white shadow-elevation-4 overflow-hidden flex flex-col animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Asa visual del bottom sheet (solo móvil) */}
            <div className="md:hidden flex justify-center pt-2" aria-hidden="true">
              <span className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2 md:py-3 border-b border-slate-200">
              <div className="min-w-0">
                <h3 id="ficha-drawer-titulo" className="font-display text-xl font-bold text-slate-900">
                  Tu ficha de respuestas
                </h3>
                <p className="text-sm text-slate-600 tabular-nums">
                  {answeredCount} de {progress.total} marcadas
                </p>
              </div>
              <button
                ref={drawerCloseRef}
                onClick={() => setShowNavigator(false)}
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar ficha de respuestas"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 sm:px-4 py-3 bg-slate-100/70">
              <FichaOptica
                preguntas={questions}
                marcadas={marcadas}
                modo="marcar"
                actual={currentQuestionIndex}
                onMarcar={handleMarcarFicha}
                onIr={handleIrFicha}
                permitirDesmarcar
                universidad={fichaUniversidad}
                postulante={fichaPostulante}
                seguirActual
              />
            </div>

            {/* Pie del drawer: terminar desde aquí (en móvil es el lugar natural tras revisar) */}
            <div className="border-t border-slate-200 bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                onClick={openFinishModal}
                className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white active:scale-[0.99] transition"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)' }}
              >
                <FileCheck className="w-4 h-4" />
                Terminar y ver mi nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL calificar ========== */}
      {showFinishModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative overflow-hidden bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-elevation-4 max-w-md w-full p-6 md:p-7 animate-bounce-in">
            <div className="relative">
              <div className="text-center mb-6">
                {unansweredCount > 0 ? (
                  <>
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7 text-amber-600" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">
                      Tienes preguntas pendientes
                    </h2>
                    <p className="text-slate-600 font-sans">
                      Hay <strong className="text-amber-700">{unansweredCount} preguntas</strong> sin responder.
                      Las no contestadas se calificarán como incorrectas.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-4 max-h-40 overflow-y-auto justify-center">
                      {unansweredNumbers.map(n => (
                        <button
                          key={n}
                          onClick={() => {
                            setShowFinishModal(false);
                            goToQuestion(n - 1);
                          }}
                          aria-label={`Ir a la pregunta ${n}`}
                          className="min-w-11 h-11 px-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 text-sm font-semibold active:scale-95 transition-transform font-mono tabular-nums"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">
                      ¿Finalizar examen?
                    </h2>
                    <p className="text-slate-600 font-sans">
                      Has contestado todas las preguntas. Una vez que finalices,
                      no podrás modificar tus respuestas.
                    </p>
                  </>
                )}
              </div>

              <p className="text-sm text-slate-500 text-center mb-4 font-sans">
                Tiempo transcurrido: <strong className="font-mono tabular-nums">{formattedTime}</strong>
              </p>

              <div className="space-y-2.5">
                {/* Color de marca (no rojo): terminar no es una acción "peligrosa" */}
                <button
                  onClick={handleFinishExam}
                  disabled={isFinishing}
                  className="w-full min-h-12 py-3 rounded-xl font-semibold text-white shadow-elevation-2 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)',
                    boxShadow: '0 10px 25px -10px var(--uni-primary)',
                  }}
                >
                  {isFinishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calificando…
                    </>
                  ) : (
                    'Terminar y ver mi nota'
                  )}
                </button>

                {unansweredCount > 0 && (
                  <button
                    onClick={() => {
                      if (unansweredIndexes.length > 0) {
                        goToQuestion(unansweredIndexes[0]);
                      }
                      setShowFinishModal(false);
                    }}
                    className="w-full min-h-11 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Ir a primera pendiente
                  </button>
                )}

                <button
                  onClick={() => setShowFinishModal(false)}
                  className="w-full min-h-11 py-2 text-slate-500 hover:text-slate-700 text-sm font-sans transition-colors"
                >
                  Continuar examen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL salida (botón atrás durante el examen) ========== */}
      {showExitModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-exit-title"
        >
          <div className="bg-white rounded-2xl shadow-elevation-4 max-w-sm w-full p-6 animate-bounce-in text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <LogOut className="w-7 h-7 text-slate-600" />
            </div>
            <h2 id="quiz-exit-title" className="font-display text-2xl font-bold text-slate-900 mb-2">
              ¿Salir del examen?
            </h2>
            <p className="text-slate-600 font-sans mb-6">
              Tus respuestas se guardan y puedes continuar después.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={stayInExam}
                className="w-full min-h-12 py-3 rounded-xl font-semibold text-white active:scale-[0.99] transition"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary) 0%, var(--uni-primary-deep) 100%)' }}
              >
                Seguir en el examen
              </button>
              <button
                onClick={handleExitExam}
                className="w-full min-h-11 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Salir por ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
