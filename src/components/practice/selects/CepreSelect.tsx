import { useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Home, FileText,
  Sparkles, Target, Calendar, Layers, LogOut, Zap
} from 'lucide-react';
import { getCepreQuestions, CEPRE_COURSES_BY_AREA, CEPRE_SEMANAS } from '../../../services/api';
import { CourseSelector, type CourseOption } from '../../CourseSelector';
import { useUniversityStore } from '../../../hooks/useUniversity';
import type { PracticeSelectStepProps, QuestionCount } from '../types';
import clsx from 'clsx';

type CepreSubStep = 'mode' | 'filters';
type CepreMode = 'cuadernillo' | 'general';

const AREA_LABELS: Record<'ING' | 'BIO' | 'SOC', string> = {
  ING: 'Ingenierías',
  BIO: 'Biomédicas',
  SOC: 'Sociales',
};

/**
 * Selección de filtros del banqueo CEPRE: primero el sub-modo (cuadernillo completo por
 * área+semana+curso, o curso general mezclando las 3 áreas), luego los filtros propios de
 * cada sub-modo. Se remonta cada vez que se vuelve al paso "select" (reset/logout), así que
 * siempre arranca de nuevo en la elección de sub-modo.
 */
export function CepreSelect({
  universidad, isAuthenticated, isLoading, error, onBack, onLogout, onSubmit
}: PracticeSelectStepProps) {
  const registro = useUniversityStore(state => state.registro);
  const cepreNombre = registro.find(u => u.codigo === universidad)?.cepreNombre || 'CEPREUNA';

  const [subStep, setSubStep] = useState<CepreSubStep>('mode');
  const [cepreMode, setCepreMode] = useState<CepreMode>('cuadernillo');
  const [selectedArea, setSelectedArea] = useState<'ING' | 'BIO' | 'SOC'>('ING');
  const [selectedSemana, setSelectedSemana] = useState<string>('S1');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);

  useEffect(() => { setSelectedCourse(''); }, [selectedArea]);

  const handleStart = async () => {
    if (!selectedCourse) return;
    if (cepreMode === 'cuadernillo') {
      onSubmit(
        { course: selectedCourse, area: selectedArea, semana: selectedSemana },
        () => getCepreQuestions(selectedCourse, selectedArea, selectedSemana, undefined, universidad)
      );
    } else {
      onSubmit(
        { course: selectedCourse },
        () => getCepreQuestions(selectedCourse, 'ALL', undefined, questionCount, universidad)
      );
    }
  };

  if (subStep === 'mode') {
    return (
      <div className="min-h-screen bg-andean-white relative py-12 px-4">
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="card p-8 animate-fade-in shadow-xl">
            <div className="flex justify-end mb-2">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              )}
            </div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl mb-4 shadow-lg">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Elige el modo de práctica</h1>
              <p className="text-slate-600">¿Cómo deseas practicar con las preguntas {cepreNombre}?</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => { setCepreMode('cuadernillo'); setSubStep('filters'); }}
                className="p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg group border-teal-200 hover:border-teal-500 hover:bg-teal-50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Cuadernillo</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Practica con TODAS las preguntas de un cuadernillo específico (semana + área + curso).
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Área</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Semana</span>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">Curso</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">~20-25 preguntas por cuadernillo</p>
              </button>

              <button
                onClick={() => { setCepreMode('general'); setSubStep('filters'); }}
                className="p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg group border-purple-200 hover:border-purple-500 hover:bg-purple-50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Curso General</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Mezcla preguntas de las 3 áreas (ING + BIO + SOC) de un curso específico.
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Curso</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Cantidad</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Selecciona 10, 15 o 20 preguntas</p>
              </button>
            </div>

            <button onClick={onBack} className="btn-secondary w-full">
              <Home className="w-5 h-5" />
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // subStep === 'filters'
  const cuadernilloCourses: CourseOption[] = (CEPRE_COURSES_BY_AREA[selectedArea] || []).map(c => ({ name: c }));
  const generalCourses: CourseOption[] = [...new Set(Object.values(CEPRE_COURSES_BY_AREA).flat())].sort().map(c => ({ name: c }));

  return (
    <div className="min-h-screen bg-andean-white relative overflow-hidden py-8 px-4 pb-32">
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-mesh-gold opacity-30 rounded-full blur-3xl animate-blob-morph pointer-events-none hidden md:block" aria-hidden />
      <img src="/illustrations/calculator.svg" alt="" aria-hidden="true" className="hidden md:block absolute top-24 right-10 w-40 opacity-35 animate-float-y pointer-events-none" />
      <img src="/illustrations/atom.svg" alt="" aria-hidden="true" className="hidden lg:block absolute bottom-32 left-8 w-32 opacity-20 animate-spin-slow pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <nav className="flex items-center gap-1 text-sm text-slate-500 font-sans">
            <button onClick={onBack} className="hover:text-brand-primary-600 transition-colors">Inicio</button>
            <ChevronRight className="w-4 h-4" />
            <button onClick={() => setSubStep('mode')} className="hover:text-brand-primary-600 transition-colors">
              Banqueo {cepreNombre}
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700 font-semibold">{cepreMode === 'cuadernillo' ? 'Cuadernillo' : 'Curso General'}</span>
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

        <div className="mb-8 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="chip bg-brand-accent text-slate-900 text-[11px] font-bold uppercase tracking-[0.22em] font-mono border-2 border-brand-accent-400 shadow-elevation-1 px-3 py-1">
              <img src="/illustrations/graduation-cap.svg" alt="" aria-hidden="true" className="w-6 h-6 inline-block pointer-events-none" />
              <Sparkles className="w-3 h-3" />
              {cepreNombre}
            </span>
            <span className="chip bg-white/70 text-brand-primary-700 text-[10px] font-mono">
              {cepreMode === 'cuadernillo' ? <Calendar className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {cepreMode === 'cuadernillo' ? 'Modo Cuadernillo' : 'Modo Curso General'}
            </span>
          </div>
          <h1 className="inline-block font-display text-4xl md:text-5xl font-black text-brand-accent-600 gradient-text-gold leading-tight mb-3">
            Banqueo {cepreNombre}
          </h1>
          <p className="font-sans text-lg text-slate-600 max-w-2xl">
            {cepreMode === 'cuadernillo'
              ? 'Elige área, semana y curso. Carga el cuadernillo completo con todas sus preguntas.'
              : 'Elige tu curso. Mezcla preguntas de las 3 áreas (ING + BIO + SOC).'}
          </p>
        </div>

        {cepreMode === 'cuadernillo' ? (
          <>
            <div className="card-elevated p-6 mb-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-brand-primary-600" />
                <h3 className="font-display text-lg font-bold text-slate-800">Área</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['ING', 'BIO', 'SOC'] as const).map(area => {
                  const active = selectedArea === area;
                  return (
                    <button
                      key={area}
                      onClick={() => setSelectedArea(area)}
                      className={clsx(
                        'p-4 rounded-2xl border-2 text-center transition-all',
                        active
                          ? 'border-brand-primary-500 bg-brand-primary-50 ring-4 ring-brand-primary-100 scale-[1.02] shadow-elevation-2'
                          : 'border-slate-200 bg-white hover:border-brand-primary-300 hover:bg-slate-50'
                      )}
                    >
                      <span className={clsx('font-display text-lg font-black block', active ? 'text-brand-primary-700' : 'text-slate-800')}>{area}</span>
                      <span className="text-xs text-slate-500 font-sans">{AREA_LABELS[area]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card-elevated p-6 mb-6 animate-fade-up" style={{ animationDelay: '180ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-brand-accent-600" />
                <h3 className="font-display text-lg font-bold text-slate-800">Semana</h3>
                <span className="chip bg-brand-accent-100 text-brand-accent-900 text-[10px] font-mono ml-auto border border-brand-accent-300">{selectedSemana}</span>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {CEPRE_SEMANAS.map(semana => {
                  const active = selectedSemana === semana;
                  return (
                    <button
                      key={semana}
                      onClick={() => setSelectedSemana(semana)}
                      className={clsx(
                        'aspect-square rounded-xl font-mono font-bold text-sm active:scale-95 transition',
                        active
                          ? 'bg-brand-accent text-slate-900 shadow-elevation-2 ring-2 ring-brand-accent-400/60 scale-[1.05]'
                          : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-brand-accent hover:bg-brand-accent-50/40'
                      )}
                    >
                      {semana}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6 animate-fade-up" style={{ animationDelay: '240ms' }}>
              <CourseSelector courses={cuadernilloCourses} selected={selectedCourse || null} onSelect={setSelectedCourse} />
            </div>

            <div className="bg-brand-accent-50 rounded-2xl p-4 mb-6 border border-brand-accent-200 animate-fade-up">
              <p className="text-brand-accent-900 text-sm flex items-center gap-2 font-sans">
                <FileText className="w-4 h-4 flex-shrink-0" />
                Se cargarán TODAS las preguntas del cuadernillo <strong className="font-mono">{selectedSemana}</strong> <strong className="font-mono">{selectedArea}</strong>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <CourseSelector courses={generalCourses} selected={selectedCourse || null} onSelect={setSelectedCourse} />
            </div>

            <div className="card-elevated p-6 mb-6 animate-fade-up" style={{ animationDelay: '180ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-brand-accent-600" />
                <h3 className="font-display text-lg font-bold text-slate-800">Cantidad de preguntas</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([10, 15, 20] as QuestionCount[]).map(count => {
                  const active = questionCount === count;
                  return (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(count)}
                      className={clsx(
                        'p-5 rounded-2xl border-2 text-center transition-all',
                        active
                          ? 'border-brand-primary-500 bg-brand-primary-50 ring-4 ring-brand-primary-100 scale-[1.02] shadow-elevation-2'
                          : 'border-slate-200 bg-white hover:border-brand-primary-300 hover:bg-slate-50'
                      )}
                    >
                      <span className={clsx('font-display text-3xl font-black block leading-none mb-1', active ? 'text-brand-primary-700' : 'text-slate-800')}>{count}</span>
                      <span className="text-xs text-slate-500 font-sans">preguntas</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-brand-primary-50 rounded-2xl p-4 mb-6 border border-brand-primary-200 animate-fade-up">
              <p className="text-brand-primary-900 text-sm flex items-center gap-2 font-sans">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                Se mezclarán preguntas de ING + BIO + SOC aleatoriamente
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 rounded-2xl p-4 mb-6 flex items-start gap-3 border border-red-200 animate-fade-up">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm font-sans">{error}</p>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-4 py-3 z-40 shadow-elevation-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={() => setSubStep('mode')} className="btn-secondary hidden sm:inline-flex">
              <ChevronLeft className="w-4 h-4" />
              Cambiar modo
            </button>
            <div className="flex-1 min-w-0 hidden sm:block">
              {selectedCourse ? (
                <div className="text-sm truncate">
                  <span className="font-display font-bold text-slate-800">{selectedCourse}</span>
                  {cepreMode === 'cuadernillo' && (
                    <span className="ml-2 chip bg-brand-accent-100 text-brand-accent-900 text-[10px] font-mono border border-brand-accent-300">
                      {selectedArea} · {selectedSemana}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-400 font-sans italic">Selecciona un curso</span>
              )}
            </div>
            <button
              onClick={handleStart}
              className="btn-accent-gold flex-1 sm:flex-none shine-hover"
              disabled={!selectedCourse || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  Comenzar
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
