import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Trophy, Lightbulb, Clock,
  FileText, Tag, Send, Flame
} from 'lucide-react';
import { renderFormattedText, parseJustification } from '../../utils/formatText';
import clsx from 'clsx';
import type { PracticeAnswer, PracticeMode, PracticeQuestion, PracticeQuestionMeta } from './types';

interface Props {
  mode: PracticeMode;
  meta: PracticeQuestionMeta;
  questions: PracticeQuestion[];
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
  answers: Map<string, PracticeAnswer>;
  onAnswer: (optionIndex: number) => void;
  onFinish: () => void;
  elapsedTimeLabel: string;
  showAllAnsweredModal: boolean;
  setShowAllAnsweredModal: (show: boolean) => void;
  /** Racha de aciertos consecutivos en la sesión actual (solo estado en memoria). */
  streak: number;
}

function getOptionClass(
  mode: PracticeMode,
  isAnswered: boolean,
  selectedOption: number | null,
  optionIndex: number,
  correctAnswer: number
) {
  if (!isAnswered) return `border-slate-200 ${mode.optionHoverClass} cursor-pointer`;
  const isSelected = selectedOption === optionIndex;
  const isCorrectOption = correctAnswer === optionIndex;
  if (isCorrectOption) return 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20';
  if (isSelected && !isCorrectOption) return 'border-red-500 bg-red-50 ring-2 ring-red-500/20';
  return 'border-slate-200 bg-slate-50 opacity-60';
}

/** Chips de metadata sobre la pregunta activa (fuente, tema/subtema o área/semana según el modo). */
function QuestionBadges({ mode, question }: { mode: PracticeMode; question: PracticeQuestion }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {question.sourceFile && (
        <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          <FileText className="w-3 h-3" />
          {question.sourceFile}
        </span>
      )}
      {mode.badgeStyle === 'cepre' && question.area && (
        <span className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
          {question.area}
        </span>
      )}
      {mode.badgeStyle === 'cepre' && question.semana && (
        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          {question.semana}
        </span>
      )}
      {question.metadata?.tema && (
        <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
          <Tag className="w-3 h-3" />
          {question.metadata.tema}
        </span>
      )}
      {mode.badgeStyle === 'topic' && question.metadata?.subtema && (
        <span className="inline-flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
          {question.metadata.subtema}
        </span>
      )}
    </div>
  );
}

/** Paso de quiz compartido por los 3 modos: cabecera con timer, tarjeta de pregunta con
 * feedback inmediato, navegación y navegador de preguntas + modal de "todas respondidas". */
export function PracticeQuiz({
  mode, meta, questions, currentIndex, setCurrentIndex, answers, onAnswer, onFinish,
  elapsedTimeLabel, showAllAnsweredModal, setShowAllAnsweredModal, streak
}: Props) {
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;
  const isAnswered = currentAnswer !== null && currentAnswer !== undefined;
  const answeredCount = answers.size;
  const CourseIcon = mode.courseIcon;

  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-andean-white relative overflow-hidden py-4 px-4">
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header con timer — Editorial Andino */}
        <div className="card-elevated p-4 mb-4 relative overflow-hidden">
          <div className="absolute top-2 right-2 chip bg-brand-accent-200 text-brand-accent-900 text-[10px] font-mono font-bold border border-brand-accent-300">
            {mode.quizBadge(meta)}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1.5">
                <span
                  className="chip text-[10px] font-mono"
                  style={{ backgroundColor: 'var(--uni-primary-soft)', color: 'var(--uni-primary-safe)' }}
                >
                  <CourseIcon className="w-3 h-3" />
                  {meta.course}
                </span>
                {meta.tema && (
                  <span className="chip bg-slate-100 text-slate-700 text-[10px] font-mono truncate max-w-[160px]">
                    <Tag className="w-3 h-3" />
                    {meta.tema}
                  </span>
                )}
                {meta.area && (
                  <span className="chip bg-slate-100 text-slate-700 text-[10px] font-mono">
                    {meta.area}
                  </span>
                )}
                {meta.semana && (
                  <span className="chip bg-brand-accent-50 text-brand-accent-800 text-[10px] font-mono">
                    <Clock className="w-3 h-3" />
                    {meta.semana}
                  </span>
                )}
                {streak >= 2 && (
                  <span
                    className="chip bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-mono font-bold animate-bounce-in"
                    aria-label={`Racha de ${streak} aciertos consecutivos`}
                  >
                    <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
                    Racha ×{streak}
                  </span>
                )}
              </div>
              <h2 className="font-display font-bold text-slate-800 text-sm">
                Pregunta {currentIndex + 1} de {questions.length}
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Clock className="w-4 h-4" style={{ color: 'var(--uni-primary-safe)' }} />
              <span className="font-mono text-base font-bold text-slate-800">{elapsedTimeLabel}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Respondidas</span>
              <p className="font-display font-bold text-base">
                <span style={{ color: 'var(--uni-primary-safe)' }}>{answeredCount}</span>
                <span className="text-slate-400">/{questions.length}</span>
              </p>
            </div>
          </div>

          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(answeredCount / questions.length) * 100}%`,
                backgroundImage: 'linear-gradient(90deg, var(--uni-primary) 0%, var(--uni-primary-deep) 70%, #D4AF37 100%)',
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="card p-6 mb-4 shadow-lg">
          <QuestionBadges mode={mode} question={currentQuestion} />

          <div
            className="text-lg text-slate-800 mb-6 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderFormattedText(currentQuestion.questionText) }}
          />

          {currentQuestion.imageLink && (
            <div className="mb-6 bg-slate-50 rounded-xl p-4">
              <img
                src={currentQuestion.imageLink}
                alt="Imagen de la pregunta"
                className="max-w-full h-auto rounded-lg mx-auto shadow-md"
              />
            </div>
          )}

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = currentAnswer?.selectedOption === idx;
              const isCorrectOption = currentQuestion.correctAnswer === idx;

              return (
                <button
                  key={idx}
                  onClick={() => !isAnswered && onAnswer(idx)}
                  disabled={isAnswered}
                  className={clsx(
                    'w-full p-4 rounded-xl border-2 text-left transition-all duration-300',
                    getOptionClass(mode, isAnswered, currentAnswer?.selectedOption ?? null, idx, currentQuestion.correctAnswer)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={clsx(
                      'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                      isAnswered && isCorrectOption
                        ? 'bg-emerald-500 text-white'
                        : isAnswered && isSelected && !isCorrectOption
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderFormattedText(option) }} />
                    {isAnswered && isCorrectOption && <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />}
                    {isAnswered && isSelected && !isCorrectOption && <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div
              role="status"
              aria-live="polite"
              className={clsx(
                'mt-6 p-4 rounded-xl animate-fade-in',
                currentAnswer.isCorrect
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200'
                  : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={clsx(
                    'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center animate-bounce-in',
                    currentAnswer.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  )}
                  aria-hidden="true"
                >
                  {currentAnswer.isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </span>
                {currentAnswer.isCorrect ? (
                  <span className="font-bold text-emerald-700">
                    ¡Correcto!{streak >= 2 && <span className="ml-1.5 font-normal text-emerald-600">racha ×{streak}</span>}
                  </span>
                ) : (
                  <span className="font-bold text-red-700">
                    Incorrecto — la respuesta correcta es: {String.fromCharCode(65 + currentQuestion.correctAnswer)}
                  </span>
                )}
              </div>

              {currentQuestion.justification && (() => {
                const { text, images } = parseJustification(currentQuestion.justification);
                return (
                  <div className="mt-3 p-3 bg-white/60 rounded-lg border border-white/80">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-700 text-sm mb-1">Justificación</p>
                        {text && (
                          <div
                            className="text-slate-600 text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderFormattedText(text) }}
                          />
                        )}
                        {images.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {images.map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                alt={`Imagen justificación ${idx + 1}`}
                                className="max-w-full h-auto rounded-lg shadow-md border border-slate-200"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            className="btn-secondary flex-1"
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className={clsx('btn-primary flex-1', mode.nextButtonClass)}
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onFinish}
              className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              Ver Resultados
              <Trophy className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Question Navigator */}
        <div className="mt-6 bg-white rounded-2xl p-4 shadow-lg">
          <p className="text-sm text-slate-500 mb-3 font-medium">Navegador de preguntas</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const answer = answers.get(q.id);
              const isCorrect = answer?.isCorrect;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={clsx(
                    'w-10 h-10 rounded-lg font-medium text-sm transition-all',
                    idx === currentIndex
                      ? mode.navigatorActiveClass
                      : answer
                      ? isCorrect
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                        : 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showAllAnsweredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slide-up">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">¡Completaste todas las preguntas!</h2>
              <p className="text-slate-600 mb-6">
                Has respondido las {questions.length} preguntas. ¿Deseas ver tus resultados finales?
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {Array.from(answers.values()).filter(a => a.isCorrect).length}
                    </p>
                    <p className="text-xs text-slate-500">Correctas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">
                      {Array.from(answers.values()).filter(a => !a.isCorrect).length}
                    </p>
                    <p className="text-xs text-slate-500">Incorrectas</p>
                  </div>
                  <div className="text-center">
                    <p className={clsx('text-2xl font-bold', mode.modalTimeClass)}>{elapsedTimeLabel}</p>
                    <p className="text-xs text-slate-500">Tiempo</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAllAnsweredModal(false)} className="btn-secondary flex-1">
                  Revisar
                </button>
                <button onClick={onFinish} className="btn-primary flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600">
                  <Send className="w-5 h-5" />
                  Ver Resultados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
