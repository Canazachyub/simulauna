import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore, useCurrentQuestion, useProgress, useIsLastQuestion, useIsFirstQuestion } from '../hooks/useExam';
import { useStopwatch } from '../hooks/useTimer';
import { Question } from './Question';
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle,
  Clock, List, FileCheck, AlertTriangle, X, ChevronDown, Sparkles
} from 'lucide-react';
import clsx from 'clsx';

export function Quiz() {
  const navigate = useNavigate();
  const {
    status,
    student,
    questions,
    savedAnswers,
    currentQuestionIndex,
    startExam,
    saveAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    finishExam
  } = useExamStore();

  const currentQuestion = useCurrentQuestion();
  const progress = useProgress();
  const isLastQuestion = useIsLastQuestion();
  const isFirstQuestion = useIsFirstQuestion();

  const [showNavigator, setShowNavigator] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});

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

  // Cronómetro global del examen
  const { elapsedTime, formattedTime } = useStopwatch(status === 'in_progress');

  // Calcular preguntas contestadas y sin contestar
  const { answeredCount, unansweredCount, unansweredIndexes, unansweredNumbers } = useMemo(() => {
    const answered = savedAnswers.size;
    const unanswered = questions.length - answered;
    const indexes: number[] = [];
    questions.forEach((q, idx) => {
      if (!savedAnswers.has(q.id)) {
        indexes.push(idx);
      }
    });
    return {
      answeredCount: answered,
      unansweredCount: unanswered,
      unansweredIndexes: indexes,
      unansweredNumbers: indexes.map(i => i + 1),
    };
  }, [savedAnswers, questions]);

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

  // Redirect si no hay datos
  useEffect(() => {
    if (!student) {
      navigate('/registro');
    } else if (questions.length === 0 && status !== 'loading') {
      navigate('/confirmar');
    }
  }, [student, questions.length, status, navigate]);

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

  const handleFinishExam = useCallback(() => {
    finishExam();
    navigate('/resultados');
  }, [finishExam, navigate]);

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

  // Agrupar preguntas por asignatura para el navegador
  const questionsBySubject = useMemo(() => {
    const groups: { subject: string; questions: { index: number; answered: boolean }[] }[] = [];
    let currentSubject = '';

    questions.forEach((q, idx) => {
      if (q.subject !== currentSubject) {
        currentSubject = q.subject;
        groups.push({ subject: currentSubject, questions: [] });
      }
      groups[groups.length - 1].questions.push({
        index: idx,
        answered: savedAnswers.has(q.id)
      });
    });

    return groups;
  }, [questions, savedAnswers]);

  const toggleSubject = useCallback((subject: string) => {
    setCollapsedSubjects(prev => ({ ...prev, [subject]: !prev[subject] }));
  }, []);

  // Loading state
  if (status === 'loading' || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 paper-bg relative">
        <div className="absolute inset-x-0 top-0 h-96 spotlight-gold pointer-events-none" aria-hidden="true" />
        <div className="text-center relative">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-sans">Cargando pregunta...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (answeredCount / progress.total) * 100;
  const isComplete = answeredCount === progress.total;

  return (
    <div className="min-h-screen bg-andean-white relative pb-24">
      {/* Spotlight dorado sutil arriba */}
      <div
        className="absolute inset-x-0 top-0 h-96 spotlight-gold pointer-events-none"
        aria-hidden="true"
      />

      {/* Constelación fija a la derecha (desktop) */}
      <div
        className="hidden lg:block fixed top-1/4 right-8 w-48 h-32 opacity-[0.08] pointer-events-none z-0"
        style={{
          backgroundImage: "url('/simulauna/illustrations/constellation.svg')",
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          color: '#003D7A',
        }}
        aria-hidden="true"
      />

      {/* ========== HEADER sticky ultraminimal ========== */}
      <header className="glass sticky top-0 z-20 border-b border-slate-200/60 h-14 relative overflow-hidden">
        {/* Patrón sutil detrás del logo */}
        <div
          className="absolute left-0 top-0 bottom-0 w-48 andean-bold opacity-[0.04] text-brand-primary pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative h-full max-w-6xl mx-auto px-4 flex items-center gap-4">
          {/* Izquierda: marca + asignatura dinámica */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-base font-black text-slate-900 tracking-tight hidden sm:inline">
              SimulaUNA
            </span>
            <span className="chip bg-brand-primary-50 text-brand-primary-700 border border-brand-primary-200 whitespace-nowrap truncate max-w-[40vw] sm:max-w-none ml-0.5">
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

          {/* Centro: progreso ultra fino */}
          <div className="flex-1 flex flex-col items-stretch gap-1 min-w-0 px-2">
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-primary via-brand-primary-600 to-brand-accent transition-[width] duration-500 ease-out rounded-full"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={answeredCount}
                aria-valuemin={0}
                aria-valuemax={progress.total}
              />
            </div>
            <div className="text-[11px] text-slate-500 font-sans text-center tabular-nums hidden sm:block">
              {answeredCount}/{progress.total} respondidas
            </div>
          </div>

          {/* Derecha: cronómetro + acciones */}
          <div className="flex items-center gap-1.5">
            <div
              className="group relative flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={`Tiempo transcurrido ${formattedTime}`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-sm tabular-nums">{formattedTime}</span>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-2 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-[11px] font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-elevation-2 z-30">
                Promedio: {averageFormatted} / pregunta
              </div>
            </div>

            <button
              onClick={() => setShowNavigator(true)}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Abrir navegador de preguntas"
            >
              <List className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowFinishModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Calificar examen"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Calificar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========== MAIN ========== */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div
          key={currentQuestionIndex}
          className={clsx(
            navDirection === -1 ? 'animate-slide-in-left' : 'animate-slide-in-right'
          )}
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

      {/* ========== FOOTER sticky navegación ========== */}
      <footer className="glass fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/60 h-16">
        <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between gap-3">
          {/* Anterior */}
          <button
            onClick={handlePrevious}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors',
              isFirstQuestion && 'opacity-40 pointer-events-none'
            )}
            aria-label="Pregunta anterior"
            disabled={isFirstQuestion}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Minimapa compacto (desktop) con puntos decorativos a los lados */}
          <div
            className="hidden md:flex items-center gap-2"
            role="navigation"
            aria-label="Minimapa de preguntas"
          >
            {/* Puntos decorativos izquierda */}
            <span className="flex items-center gap-1 mr-1 opacity-50" aria-hidden="true">
              <span className="w-0.5 h-0.5 rounded-full bg-brand-accent/60" />
              <span className="w-1 h-1 rounded-full bg-brand-accent/40" />
              <span className="w-0.5 h-0.5 rounded-full bg-brand-accent/60" />
            </span>

            {questions.slice(0, 60).map((q, idx) => {
              const answered = savedAnswers.has(q.id);
              const isCurrent = idx === currentQuestionIndex;
              const needsSeparator = idx > 0 && idx % 5 === 0;
              return (
                <div key={q.id} className="flex items-center">
                  {needsSeparator && (
                    <span className="w-1 h-1 rounded-full bg-slate-200 mr-2" aria-hidden="true" />
                  )}
                  <button
                    onClick={() => goToQuestion(idx)}
                    aria-label={`Ir a pregunta ${idx + 1}`}
                    className={clsx(
                      'rounded-full transition-all duration-150',
                      isCurrent
                        ? 'w-2.5 h-2.5 bg-brand-primary ring-2 ring-brand-primary/30'
                        : answered
                          ? 'w-1.5 h-1.5 bg-emerald-400/70 hover:bg-emerald-500'
                          : 'w-1.5 h-1.5 bg-slate-200 hover:bg-slate-300'
                    )}
                  />
                </div>
              );
            })}

            {/* Puntos decorativos derecha */}
            <span className="flex items-center gap-1 ml-1 opacity-50" aria-hidden="true">
              <span className="w-0.5 h-0.5 rounded-full bg-brand-accent/60" />
              <span className="w-1 h-1 rounded-full bg-brand-accent/40" />
              <span className="w-0.5 h-0.5 rounded-full bg-brand-accent/60" />
            </span>
          </div>

          {/* Contador mobile */}
          <div className="md:hidden font-mono text-sm text-slate-600 tabular-nums">
            {currentQuestionIndex + 1} / {progress.total}
          </div>

          {/* Siguiente / Calificar */}
          {isLastQuestion ? (
            <button
              onClick={() => setShowFinishModal(true)}
              className="btn-accent-gold shine-hover inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
              aria-label="Calificar examen"
            >
              <FileCheck className="w-4 h-4" />
              <span>Calificar</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn-primary-brand shine-hover inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
              aria-label="Siguiente pregunta"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* ========== DRAWER navegador ========== */}
      {showNavigator && (
        <div
          className="fixed inset-0 z-40 bg-black/30 animate-fade-in"
          onClick={() => setShowNavigator(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Navegador de preguntas"
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-elevation-4 overflow-hidden flex flex-col animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del drawer con patrón andino sutil */}
            <div className="sticky top-0 bg-white andean-bold text-brand-primary/20 border-b border-slate-200 relative">
              <div className="relative px-5 py-4 flex items-center justify-between bg-white/70 backdrop-blur">
                <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  Navegador de preguntas
                </h3>
                <button
                  onClick={() => setShowNavigator(false)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
                  aria-label="Cerrar navegador"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Leyenda */}
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-brand-primary-100 ring-1 ring-brand-primary-200"></div>
                <span>Respondida</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-100"></div>
                <span>Pendiente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded ring-2 ring-brand-primary bg-white"></div>
                <span>Actual</span>
              </div>
            </div>

            {/* Grupos por asignatura como cards */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/50">
              {questionsBySubject.map((group, gIdx) => {
                const groupAnswered = group.questions.filter(q => q.answered).length;
                const isCollapsed = !!collapsedSubjects[group.subject];
                return (
                  <div key={gIdx} className="card-elevated p-3 bg-white rounded-xl">
                    <button
                      onClick={() => toggleSubject(group.subject)}
                      className="w-full flex items-center justify-between py-1 group"
                      aria-expanded={!isCollapsed}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={clsx(
                            'w-4 h-4 text-slate-400 transition-transform',
                            isCollapsed && '-rotate-90'
                          )}
                        />
                        <h4 className="font-display text-sm font-semibold text-slate-800">
                          {group.subject}
                        </h4>
                      </div>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {groupAnswered}/{group.questions.length}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="mt-2 grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                        {group.questions.map(({ index, answered }) => {
                          const isCurrent = index === currentQuestionIndex;
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                goToQuestion(index);
                                setShowNavigator(false);
                              }}
                              aria-label={`Ir a pregunta ${index + 1}`}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={clsx(
                                'w-11 h-11 rounded-lg text-xs font-semibold transition active:scale-95 tabular-nums',
                                isCurrent
                                  ? 'ring-2 ring-brand-primary shadow-elevation-2 bg-white text-brand-primary-700'
                                  : answered
                                    ? 'bg-brand-primary-100 text-brand-primary-800 ring-1 ring-brand-primary-200 hover:bg-brand-primary-50'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              )}
                            >
                              {index + 1}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
                    <div className="flex flex-wrap gap-1.5 mt-4 max-h-32 overflow-y-auto justify-center">
                      {unansweredNumbers.map(n => (
                        <button
                          key={n}
                          onClick={() => {
                            setShowFinishModal(false);
                            goToQuestion(n - 1);
                          }}
                          className="min-w-[2rem] h-8 px-2 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 text-sm font-semibold active:scale-95 transition-transform font-mono tabular-nums"
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
                <button
                  onClick={handleFinishExam}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-elevation-2 transition-all active:scale-[0.99]"
                >
                  Calificar ahora
                </button>

                {unansweredCount > 0 && (
                  <button
                    onClick={() => {
                      if (unansweredIndexes.length > 0) {
                        goToQuestion(unansweredIndexes[0]);
                      }
                      setShowFinishModal(false);
                    }}
                    className="w-full py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Ir a primera pendiente
                  </button>
                )}

                <button
                  onClick={() => setShowFinishModal(false)}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm font-sans transition-colors"
                >
                  Continuar examen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
