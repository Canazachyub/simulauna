import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore, useCurrentQuestion, useProgress, useIsLastQuestion, useIsFirstQuestion } from '../hooks/useExam';
import { useStopwatch } from '../hooks/useTimer';
import { Question } from './Question';
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle,
  Clock, Grid3X3, FileCheck, AlertTriangle
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

  // Cronómetro global del examen
  const { elapsedTime, formattedTime } = useStopwatch(status === 'in_progress');

  // Calcular preguntas contestadas y sin contestar
  const { answeredCount, unansweredCount, unansweredIndexes } = useMemo(() => {
    const answered = savedAnswers.size;
    const unanswered = questions.length - answered;
    const indexes: number[] = [];
    questions.forEach((q, idx) => {
      if (!savedAnswers.has(q.id)) {
        indexes.push(idx);
      }
    });
    return { answeredCount: answered, unansweredCount: unanswered, unansweredIndexes: indexes };
  }, [savedAnswers, questions]);

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

  // Loading state
  if (status === 'loading' || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando pregunta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header con progreso */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Progreso */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                <span className="font-bold text-primary-600">{progress.current}</span>
                <span> / {progress.total}</span>
              </div>
              <div className="hidden sm:block w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Timer global - Estilo Google */}
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white border-2 border-blue-500 shadow-lg">
              <div className="bg-blue-500 p-2 rounded-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="font-mono text-2xl font-bold tracking-wider text-blue-600">{formattedTime}</span>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2">
              {/* Navegador de preguntas */}
              <button
                onClick={() => setShowNavigator(!showNavigator)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  showNavigator
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Navegador</span>
              </button>

              {/* Calificar examen */}
              <button
                onClick={() => setShowFinishModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <FileCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Calificar</span>
              </button>
            </div>
          </div>

          {/* Indicador de asignatura */}
          <div className="mt-2 flex items-center justify-between">
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
              {currentQuestion.subject}
            </span>
            <span className="text-xs text-slate-500">
              {answeredCount} contestadas / {unansweredCount} sin contestar
            </span>
          </div>
        </div>
      </header>

      {/* Panel navegador de preguntas */}
      {showNavigator && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setShowNavigator(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Navegador de Preguntas</h3>
                <button
                  onClick={() => setShowNavigator(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span className="text-slate-600">Contestada</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-300"></div>
                  <span className="text-slate-600">Sin contestar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded ring-2 ring-primary-500 bg-primary-100"></div>
                  <span className="text-slate-600">Actual</span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {questionsBySubject.map((group, gIdx) => (
                <div key={gIdx}>
                  <h4 className="text-sm font-semibold text-slate-600 mb-2">{group.subject}</h4>
                  <div className="grid grid-cols-8 gap-1.5">
                    {group.questions.map(({ index, answered }) => (
                      <button
                        key={index}
                        onClick={() => {
                          goToQuestion(index);
                          setShowNavigator(false);
                        }}
                        className={clsx(
                          'w-8 h-8 rounded text-xs font-medium transition-all',
                          index === currentQuestionIndex
                            ? 'ring-2 ring-primary-500 bg-primary-100 text-primary-700'
                            : answered
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        )}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para finalizar */}
      {showFinishModal && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="text-center mb-6">
              {unansweredCount > 0 ? (
                <>
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    Tienes preguntas sin contestar
                  </h3>
                  <p className="text-slate-600">
                    Hay <strong>{unansweredCount} preguntas</strong> sin responder.
                    Las preguntas sin contestar se calificarán como incorrectas.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    ¿Finalizar examen?
                  </h3>
                  <p className="text-slate-600">
                    Has contestado todas las preguntas. Una vez que finalices,
                    no podrás modificar tus respuestas.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-500 text-center">
                Tiempo transcurrido: <strong>{formattedTime}</strong>
              </p>

              {unansweredCount > 0 && (
                <button
                  onClick={() => {
                    if (unansweredIndexes.length > 0) {
                      goToQuestion(unansweredIndexes[0]);
                    }
                    setShowFinishModal(false);
                  }}
                  className="btn-secondary w-full"
                >
                  Ir a pregunta sin contestar
                </button>
              )}

              <button
                onClick={handleFinishExam}
                className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Calificar Examen
              </button>

              <button
                onClick={() => setShowFinishModal(false)}
                className="w-full py-2 text-slate-600 hover:text-slate-800 text-sm"
              >
                Continuar examen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Content */}
      <main className="container mx-auto px-4 py-6">
        <Question
          question={currentQuestion}
          questionNumber={progress.current}
          totalQuestions={progress.total}
          selectedAnswer={currentSavedAnswer}
          showFeedback={false}
          isCorrect={null}
          onSelectAnswer={handleSelectAnswer}
        />

        {/* Navigation Buttons */}
        <div className="max-w-3xl mx-auto mt-6 flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all',
              isFirstQuestion
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm border border-slate-200'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </button>

          <button
            onClick={handleNext}
            disabled={isLastQuestion}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all',
              isLastQuestion
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
            )}
          >
            Siguiente
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick info */}
        <div className="max-w-3xl mx-auto mt-4 text-center text-sm text-slate-500">
          Usa el navegador para saltar entre preguntas. Presiona "Calificar" cuando termines.
        </div>

        {/* Reportar errores */}
        <div className="max-w-3xl mx-auto mt-6 text-center">
          <a
            href="https://wa.link/40zqta"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full border border-emerald-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>¿Encontraste un error? Ayúdanos a mejorar</span>
          </a>
        </div>
      </main>
    </div>
  );
}
