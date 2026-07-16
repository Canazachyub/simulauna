import { useState } from 'react';
import {
  ChevronRight, Loader2, AlertCircle, CheckCircle, Home, Sparkles,
  Target, LogOut, Zap, Timer, Clock, Brain
} from 'lucide-react';
import { AVAILABLE_COURSES, getBanqueoQuestions } from '../../../services/api';
import { CourseSelector, type CourseOption } from '../../CourseSelector';
import { CoachTour, type CoachTourStep } from '../../onboarding/CoachTour';
import type { PracticeSelectStepProps, QuestionCount } from '../types';
import clsx from 'clsx';

const COURSE_OPTIONS: CourseOption[] = AVAILABLE_COURSES.map(c => ({ name: c }));
const estTime = (n: number) => Math.ceil((n * 45) / 60);

/** Tour de primera vez del Banqueo histórico (ver src/components/onboarding/CoachTour.tsx).
 * Este SelectStep sólo se monta para el modo "banqueo" (practiceModes.ts), así que el tour
 * es propio de esta pantalla y no de banqueoTema/CEPRE (que tienen su propio SelectStep). */
const BANQUEO_TOUR_STEPS: CoachTourStep[] = [
  {
    title: '¡Hola! Soy tu guía',
    text: 'Te muestro rapidito cómo funciona el Banqueo antes de que empieces a practicar.',
  },
  {
    selector: '[data-tour="banqueo-curso"]',
    title: 'Elige tu curso',
    text: 'Busca por nombre o cambia entre vista lista y cuadrícula para encontrar tu curso más rápido.',
  },
  {
    selector: '[data-tour="banqueo-cantidad"]',
    title: 'Cantidad de preguntas',
    text: 'Elige cuántas preguntas quieres practicar: rápido, balanceado o profundo.',
  },
  {
    selector: '[data-tour="banqueo-feedback"]',
    title: 'Feedback al toque',
    text: 'Apenas respondas cada pregunta, te decimos si acertaste y por qué, con la justificación completa.',
  },
];

/** Selección de filtros del banqueo histórico: sólo curso + cantidad de preguntas. */
export function BanqueoCourseSelect({
  universidad, isAuthenticated, userDni, isLoading, error, onBack, onLogout, onSubmit
}: PracticeSelectStepProps) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);

  const handleStart = () => {
    if (!selectedCourse) return;
    onSubmit(
      { course: selectedCourse },
      () => getBanqueoQuestions(selectedCourse, questionCount, universidad)
    );
  };

  return (
    <div className="min-h-screen bg-andean-white relative overflow-hidden py-8 px-4 pb-32">
      <CoachTour name="banqueo" steps={BANQUEO_TOUR_STEPS} active />
      <img
        src="/simulauna/illustrations/study-hero.svg"
        alt=""
        aria-hidden="true"
        className="hidden lg:block absolute top-24 right-8 w-48 opacity-40 pointer-events-none"
      />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <nav className="flex items-center gap-1 text-sm text-slate-500 font-sans">
            <button onClick={onBack} className="hover:text-brand-primary-600 transition-colors">Inicio</button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700 font-semibold">Banqueo</span>
          </nav>
          {isAuthenticated && (
            <button
              type="button"
              onClick={onLogout}
              className="chip bg-white/70 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors font-sans"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          )}
        </div>

        <div className="mb-10 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-white/70 text-brand-primary-700 text-[10px] font-bold uppercase tracking-[0.18em] font-mono">
              <Target className="w-3 h-3" />
              Práctica enfocada
            </span>
            {isAuthenticated && userDni && (
              <span className="chip bg-emerald-50 text-emerald-700 text-[10px] font-mono">
                <CheckCircle className="w-3 h-3" />
                {userDni}
              </span>
            )}
          </div>
          <h1 className="inline-flex items-center gap-3 font-display text-4xl md:text-5xl font-black text-brand-primary-800 gradient-text-brand leading-tight mb-3">
            <img
              src="/simulauna/illustrations/exam-paper.svg"
              alt=""
              aria-hidden="true"
              className="w-12 h-12 opacity-80 pointer-events-none hidden sm:inline-block"
            />
            Elige tu curso
          </h1>
          <p className="font-sans text-lg text-slate-600 max-w-2xl">
            Practica enfocado en un solo tema. Preguntas reales de exámenes anteriores UNAP.
          </p>
        </div>

        <div className="mb-8 animate-fade-up" style={{ animationDelay: '120ms' }} data-tour="banqueo-curso">
          <CourseSelector courses={COURSE_OPTIONS} selected={selectedCourse || null} onSelect={setSelectedCourse} />
        </div>

        <div className="card-elevated p-6 md:p-8 mb-8 animate-fade-up" style={{ animationDelay: '180ms' }} data-tour="banqueo-cantidad">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-brand-accent-600" />
            <h3 className="font-display text-lg font-bold text-slate-800">Cantidad de preguntas</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([
              { count: 10 as QuestionCount, icon: Timer, label: 'Rápido' },
              { count: 15 as QuestionCount, icon: Target, label: 'Balanceado' },
              { count: 20 as QuestionCount, icon: Brain, label: 'Profundo' },
            ]).map(({ count, icon: Icon, label }) => {
              const active = questionCount === count;
              return (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={clsx(
                    'p-5 rounded-2xl border-2 text-center transition-all group relative overflow-hidden',
                    active
                      ? 'border-brand-primary bg-brand-primary-50/60 ring-4 ring-brand-primary/20 scale-[1.02] shadow-elevation-2'
                      : 'border-slate-200 bg-white hover:border-brand-primary/40 hover:bg-slate-50'
                  )}
                >
                  <Icon className={clsx(
                    'w-6 h-6 mx-auto mb-1.5 transition-transform group-hover:scale-110',
                    active ? 'text-brand-primary' : 'text-slate-400'
                  )} />
                  <span className={clsx(
                    'font-display text-3xl font-black block leading-none mb-1',
                    active ? 'text-brand-primary-700' : 'text-slate-800'
                  )}>
                    {count}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans block uppercase tracking-wider font-semibold">{label}</span>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    ~{estTime(count)} min
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 rounded-2xl p-4 mb-6 flex items-start gap-3 border border-red-200 animate-fade-up">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm font-sans">{error}</p>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-4 py-3 z-40 shadow-elevation-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={onBack} className="btn-secondary hidden sm:inline-flex">
              <Home className="w-4 h-4" />
              Inicio
            </button>
            <div className="flex-1 min-w-0 hidden sm:block">
              {selectedCourse ? (
                <div className="text-sm truncate">
                  <span className="text-slate-500 font-sans">Curso: </span>
                  <span className="font-display font-bold text-slate-800">{selectedCourse}</span>
                  <span className="ml-2 chip bg-brand-primary-50 text-brand-primary-700 text-[10px] font-mono">
                    {questionCount} preguntas
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 font-sans italic">Selecciona un curso para continuar</span>
              )}
            </div>
            <button
              onClick={handleStart}
              className="btn-accent-gold flex-1 sm:flex-none shine-hover"
              disabled={!selectedCourse || isLoading}
              data-tour="banqueo-feedback"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Comenzar práctica
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
