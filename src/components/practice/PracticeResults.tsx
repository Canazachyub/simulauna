import {
  CheckCircle, XCircle, RotateCcw, Home, Lightbulb, Clock, FileText, Target, LogOut, BookOpen
} from 'lucide-react';
import { renderFormattedText, parseJustification } from '../../utils/formatText';
import clsx from 'clsx';
import type { PracticeAnswer, PracticeMode, PracticeQuestion, PracticeQuestionMeta } from './types';

interface Props {
  mode: PracticeMode;
  meta: PracticeQuestionMeta;
  questions: PracticeQuestion[];
  results: PracticeAnswer[];
  elapsedTimeLabel: string;
  elapsedTimeSeconds: number;
  isAuthenticated: boolean;
  onLogout: () => void;
  onReset: () => void;
  onHome: () => void;
}

/** Chips de metadata mostrados en la revisión de cada pregunta (más ligeros que en el quiz). */
function ReviewBadges({ mode, question, index }: { mode: PracticeMode; question: PracticeQuestion; index: number }) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
        Pregunta {index + 1}
      </span>
      {mode.badgeStyle === 'topic' && question.sourceFile && (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {question.sourceFile}
        </span>
      )}
      {mode.badgeStyle === 'topic' && question.metadata?.tema && (
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{question.metadata.tema}</span>
      )}
      {mode.badgeStyle === 'topic' && question.metadata?.subtema && (
        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">{question.metadata.subtema}</span>
      )}
      {mode.badgeStyle === 'cepre' && question.area && (
        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">{question.area}</span>
      )}
      {mode.badgeStyle === 'cepre' && question.semana && (
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{question.semana}</span>
      )}
    </div>
  );
}

/** Paso de resultados compartido: anillo de porcentaje, estadísticas, acciones y revisión
 * completa de las preguntas con su justificación. */
export function PracticeResults({
  mode, meta, questions, results, elapsedTimeLabel, elapsedTimeSeconds, isAuthenticated, onLogout, onReset, onHome
}: Props) {
  const correctCount = results.filter(r => r.isCorrect).length;
  const percentage = Math.round((correctCount / questions.length) * 100);
  const avgTimePerQuestion = elapsedTimeSeconds / questions.length;

  return (
    <div className="min-h-screen bg-andean-white relative overflow-hidden py-6 px-4">
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Score Hero — Editorial */}
        <div className={clsx(
          'card-elevated p-8 mb-6 text-center animate-fade-up relative overflow-hidden',
          mode.heroBgClass ?? 'bg-white'
        )}>
          {mode.renderResultsDecoration?.()}

          <div className="absolute top-4 right-4 flex gap-2">
            <span className="chip bg-brand-accent-100 text-brand-accent-900 text-[10px] font-mono font-bold border border-brand-accent-300">
              {mode.resultsBadge(meta)}
            </span>
            {isAuthenticated && (
              <button
                type="button"
                onClick={onLogout}
                className="chip bg-white/70 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Anillo con porcentaje */}
          <div className="relative inline-flex items-center justify-center w-32 h-32 mb-5 animate-bounce-in">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" stroke="#e2e8f0" strokeWidth="10" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke="url(#practice-grad)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(percentage / 100) * 326.72} 326.72`}
              />
              <defs>
                <linearGradient id="practice-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#c2410c" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center">
              <p className="inline-block font-display text-4xl font-black text-brand-primary-800 gradient-text-brand leading-none">{percentage}%</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">Acierto</p>
            </div>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-black text-slate-900 mb-2">
            {mode.resultsTitle(meta)}
          </h1>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="chip bg-white/70 text-brand-primary-700 text-xs font-mono">
              <mode.courseIcon className="w-3 h-3" />
              {meta.course}
            </span>
            {meta.tema && (
              <span className="chip bg-white/70 text-slate-700 text-xs font-mono">{meta.tema}</span>
            )}
            {meta.area && (
              <span className="chip bg-white/70 text-slate-700 text-xs font-mono">{meta.area}</span>
            )}
            {meta.semana && (
              <span className="chip bg-brand-accent-100 text-brand-accent-900 text-xs font-mono border border-brand-accent-300">
                {meta.semana}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 mt-4">
            <div className="bg-white/70 backdrop-blur rounded-2xl p-4 border border-emerald-200 shadow-elevation-1">
              <p className="font-display text-3xl font-black text-emerald-600 leading-none">{correctCount}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 mt-1">Correctas</p>
            </div>
            <div className="bg-white/70 backdrop-blur rounded-2xl p-4 border border-red-200 shadow-elevation-1">
              <p className="font-display text-3xl font-black text-red-500 leading-none">{questions.length - correctCount}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-red-700 mt-1">Incorrectas</p>
            </div>
            <div className="bg-white/70 backdrop-blur rounded-2xl p-4 border border-brand-primary-200 shadow-elevation-1">
              <p className="font-display text-3xl font-black text-brand-primary-600 leading-none">{questions.length}</p>
              <p className="text-[11px] font-mono uppercase tracking-wider text-brand-primary-700 mt-1">Total</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm font-sans">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Tiempo: <strong className="font-mono">{elapsedTimeLabel}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Target className="w-4 h-4" />
              <span>Promedio: <strong className="font-mono">{Math.round(avgTimePerQuestion)}s</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={onReset} className="btn-primary-brand shine-hover">
              <RotateCcw className="w-5 h-5" />
              {mode.resetLabel}
            </button>
            <button onClick={onHome} className="btn-secondary">
              <Home className="w-5 h-5" />
              {mode.homeLabel}
            </button>
          </div>
        </div>

        {/* Review Questions */}
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BookOpen className={clsx('w-5 h-5', mode.reviewIconClass)} />
          Revisión de respuestas
        </h2>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const result = results.find(r => r.questionId === q.id);
            const isCorrect = result?.isCorrect;
            const selectedIdx = result?.selectedOption;

            return (
              <div key={q.id} className="card p-6 shadow-md">
                <div className="flex items-start gap-3 mb-4">
                  <div className={clsx(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                    isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  )}>
                    {isCorrect ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <ReviewBadges mode={mode} question={q} index={idx} />
                    <div
                      className="text-slate-800"
                      dangerouslySetInnerHTML={{ __html: renderFormattedText(q.questionText) }}
                    />
                  </div>
                </div>

                <div className="space-y-2 ml-13">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedIdx === optIdx;
                    const isCorrectOption = q.correctAnswer === optIdx;

                    return (
                      <div
                        key={optIdx}
                        className={clsx(
                          'p-3 rounded-lg border-2 flex items-center gap-2',
                          isCorrectOption
                            ? 'bg-emerald-50 border-emerald-300'
                            : isSelected
                            ? 'bg-red-50 border-red-300'
                            : 'bg-slate-50 border-slate-200'
                        )}
                      >
                        <span className={clsx(
                          'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                          isCorrectOption
                            ? 'bg-emerald-500 text-white'
                            : isSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        )}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderFormattedText(opt) }} />
                        {isCorrectOption && (
                          <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Correcta
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            Tu respuesta
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.justification && (() => {
                  const { text, images } = parseJustification(q.justification);
                  return (
                    <div className="mt-4 ml-13 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-amber-800 text-sm font-semibold mb-1">Justificación:</p>
                          {text && (
                            <div
                              className="text-amber-700 text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: renderFormattedText(text) }}
                            />
                          )}
                          {images.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {images.map((imgUrl, imgIdx) => (
                                <img
                                  key={imgIdx}
                                  src={imgUrl}
                                  alt={`Imagen justificación ${imgIdx + 1}`}
                                  className="max-w-full h-auto rounded-lg shadow-md border border-amber-200"
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
