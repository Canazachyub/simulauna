import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, ChevronRight, Loader2, AlertCircle, CheckCircle, Home, Sparkles,
  Tag, LogOut, Zap, Layers, ChevronDown
} from 'lucide-react';
import { getCursosConTemas, getTemasPorCurso, getBanqueoByTema, type CursoConTemas, type TemaInfo } from '../../../services/api';
import { CourseSelector, type CourseOption } from '../../CourseSelector';
import type { PracticeSelectStepProps, QuestionCount } from '../types';
import clsx from 'clsx';

/** Selección de filtros del banqueo por tema: curso → tema (stepper) + cantidad de preguntas. */
export function BanqueoTemaSelect({
  universidad, isAuthenticated, isLoading, error, onBack, onLogout, onSubmit
}: PracticeSelectStepProps) {
  const [cursos, setCursos] = useState<CursoConTemas[]>([]);
  const [temas, setTemas] = useState<TemaInfo[]>([]);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedTema, setSelectedTema] = useState('');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [loadingTemas, setLoadingTemas] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Carga inicial de cursos al montar (reemplaza a la carga post-login del componente original;
  // se recarga siempre al volver a este paso).
  useEffect(() => {
    getCursosConTemas(universidad).then(setCursos).catch(err => console.error('Error loading cursos:', err));
  }, [universidad]);

  // Carga de temas cuando cambia el curso
  useEffect(() => {
    if (!selectedCurso) return;
    setLoadingTemas(true);
    setTemas([]);
    setSelectedTema('');
    getTemasPorCurso(selectedCurso, universidad)
      .then(setTemas)
      .catch(err => console.error('Error loading temas:', err))
      .finally(() => setLoadingTemas(false));
  }, [selectedCurso, universidad]);

  // Atajo de teclado "/" para enfocar el buscador visible (curso o tema)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      const container = containerRef.current;
      if (!container) return;
      const inputs = container.querySelectorAll<HTMLInputElement>('input[aria-label="Buscar curso"], input[aria-label="Buscar tema"]');
      let target2: HTMLInputElement | null = null;
      inputs.forEach(inp => { if (inp.offsetParent !== null) target2 = inp; });
      if (target2) {
        e.preventDefault();
        (target2 as HTMLInputElement).focus();
        (target2 as HTMLInputElement).select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleStart = () => {
    if (!selectedCurso || !selectedTema) return;
    onSubmit(
      { course: selectedCurso, tema: selectedTema },
      () => getBanqueoByTema(selectedCurso, selectedTema, undefined, questionCount, universidad)
    );
  };

  const availableCount = selectedTema ? (temas.find(t => t.tema === selectedTema)?.totalPreguntas || 0) : 0;
  const cursoOptions: CourseOption[] = cursos.map(c => ({ name: c.curso, count: c.totalPreguntas }));
  const stepperStep = !selectedCurso ? 1 : !selectedTema ? 2 : 3;

  return (
    <div className="min-h-screen bg-andean-white relative overflow-hidden py-8 px-4 pb-32">
      <div className="max-w-4xl mx-auto relative z-10" ref={containerRef}>
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <nav className="flex items-center gap-1 text-sm text-slate-500 font-sans flex-wrap">
            <button onClick={onBack} className="hover:text-brand-primary-600 transition-colors">Inicio</button>
            <ChevronRight className="w-4 h-4" />
            <span className={clsx(selectedCurso ? 'hover:text-brand-primary-600 transition-colors cursor-pointer' : 'text-slate-700 font-semibold')}>
              Banqueo por Tema
            </span>
            {selectedCurso && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className={clsx(selectedTema ? '' : 'text-slate-700 font-semibold')}>{selectedCurso}</span>
              </>
            )}
            {selectedTema && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-700 font-semibold truncate max-w-[150px]">{selectedTema}</span>
              </>
            )}
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
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-white/70 text-brand-primary-700 text-[10px] font-bold uppercase tracking-[0.18em] font-mono">
              <Layers className="w-3 h-3" />
              Por Tema
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black gradient-text-brand leading-tight mb-3">
            {selectedCurso ? 'Elige un tema' : 'Elige tu curso'}
          </h1>
          <p className="font-sans text-lg text-slate-600 max-w-2xl">
            Practica preguntas filtradas por curso y tema específico.
          </p>
        </div>

        {/* Stepper visual: Curso → Tema → Cantidad */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '90ms' }}>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            {[
              { n: 1, label: 'Curso', icon: BookOpen, done: Boolean(selectedCurso) },
              { n: 2, label: 'Tema', icon: Tag, done: Boolean(selectedTema) },
              { n: 3, label: 'Cantidad', icon: Zap, done: false },
            ].map((s, i, arr) => {
              const active = stepperStep === s.n;
              const done = s.done && stepperStep > s.n;
              return (
                <div key={s.n} className="flex items-center gap-2 md:gap-4">
                  <div className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full font-sans text-xs md:text-sm font-semibold transition-all',
                    active && 'bg-brand-primary text-white shadow-elevation-2',
                    done && 'bg-emerald-100 text-emerald-700 border border-emerald-300',
                    !active && !done && 'bg-white/70 text-slate-500 border border-slate-200'
                  )}>
                    <span className={clsx(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold',
                      active && 'bg-white/25 text-white',
                      done && 'bg-emerald-600 text-white',
                      !active && !done && 'bg-slate-200 text-slate-600'
                    )}>
                      {done ? <CheckCircle className="w-3 h-3" /> : s.n}
                    </span>
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </div>
                  {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-brand-primary-600" />
            <h3 className="font-display text-lg font-bold text-slate-800">1. Curso</h3>
          </div>
          <CourseSelector courses={cursoOptions} selected={selectedCurso || null} onSelect={setSelectedCurso} autoFocus={!selectedCurso} />
        </div>

        <div className="card-elevated p-6 md:p-8 mb-6 animate-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-brand-primary-600" />
            <h3 className="font-display text-lg font-bold text-slate-800">2. Tema</h3>
            {selectedTema && (
              <span className="chip bg-brand-primary-50 text-brand-primary-700 text-[10px] font-mono ml-auto truncate max-w-[180px]">
                {selectedTema}
              </span>
            )}
          </div>

          {!selectedCurso ? (
            <div className="text-center py-8 text-slate-500 font-sans text-sm italic">
              Selecciona primero un curso para ver sus temas.
            </div>
          ) : loadingTemas ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-shimmer rounded-lg h-11 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" style={{ backgroundSize: '200% 100%' }} />
              ))}
            </div>
          ) : temas.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-sans text-sm italic">
              No hay temas disponibles para este curso.
            </div>
          ) : (
            <CourseSelector
              courses={temas.map(t => ({ name: t.tema, count: t.totalPreguntas, category: selectedCurso }))}
              selected={selectedTema || null}
              onSelect={setSelectedTema}
              compact
              autoFocus={Boolean(selectedCurso) && !selectedTema}
              searchPlaceholder="Buscar tema..."
              searchAriaLabel="Buscar tema"
              className="!p-4 !shadow-none !border-slate-100"
            />
          )}

          <div className="sr-only">
            <select
              value={selectedTema}
              onChange={(e) => setSelectedTema(e.target.value)}
              disabled={!selectedCurso || loadingTemas}
              aria-label="Selector alternativo de tema"
            >
              <option value="">-- Selecciona un tema --</option>
              {temas.map(tema => (
                <option key={tema.tema} value={tema.tema}>{tema.tema} ({tema.totalPreguntas} preguntas)</option>
              ))}
            </select>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        <div className="card-elevated p-6 mb-6 animate-fade-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-brand-accent-600" />
            <h3 className="font-display text-lg font-bold text-slate-800">3. Cantidad de preguntas</h3>
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
                  <span className={clsx('font-display text-3xl font-black block leading-none mb-1', active ? 'text-brand-primary-700' : 'text-slate-800')}>
                    {count}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">preguntas</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedTema && (
          <div className={clsx(
            'rounded-2xl p-4 mb-6 border animate-fade-up',
            availableCount >= questionCount ? 'bg-emerald-50 border-emerald-200' : 'bg-brand-accent-50 border-brand-accent-200'
          )}>
            <p className={clsx('text-sm flex items-center gap-2 font-sans', availableCount >= questionCount ? 'text-emerald-800' : 'text-brand-accent-900')}>
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              {availableCount >= questionCount
                ? <>Hay <strong className="font-mono">{availableCount}</strong> preguntas disponibles para tu selección</>
                : <>Solo hay <strong className="font-mono">{availableCount}</strong> preguntas disponibles (se mostrarán todas)</>}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-2xl p-4 mb-6 flex items-start gap-3 border border-red-200 animate-fade-up">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm font-sans">{error}</p>
          </div>
        )}

        {/* bottom-[...] en <md: el UniversityBottomNav (56px + safe-area) vive fijo debajo de
            esta barra; z-50 (por encima de su z-40) para que nunca tape "Comenzar práctica". */}
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-4 py-3 z-50 shadow-elevation-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={onBack} className="btn-secondary hidden sm:inline-flex">
              <Home className="w-4 h-4" />
              Inicio
            </button>
            <div className="flex-1 min-w-0 hidden sm:block">
              {selectedCurso && selectedTema ? (
                <div className="text-sm truncate">
                  <span className="font-display font-bold text-slate-800">{selectedCurso}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="text-slate-600 font-sans">{selectedTema}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 font-sans italic">Selecciona curso y tema</span>
              )}
            </div>
            <button
              onClick={handleStart}
              className="btn-accent-gold flex-1 sm:flex-none shine-hover"
              disabled={!selectedCurso || !selectedTema || isLoading}
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
