import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, CreditCard, BookOpen, Clock, GraduationCap,
  Play, Loader2, AlertCircle, CheckCircle2,
  Pencil, Shield, Star, Sparkles
} from 'lucide-react';
import { useExamStore } from '../hooks/useExam';

export function ExamConfirmation() {
  const navigate = useNavigate();
  const { student, config, loadQuestions, status, error } = useExamStore();

  // Redirect if no student data
  useEffect(() => {
    if (!student) {
      navigate('/registro');
    }
  }, [student, navigate]);

  if (!student) return null;

  const areaConfig = config?.[student.area];

  const handleStartExam = async () => {
    await loadQuestions(student.area);
    navigate('/examen');
  };

  const instructions = [
    'Puedes pausar mentalmente — no hay límite de tiempo real',
    'Responde las preguntas en el orden que prefieras',
    'Navega libremente: avanza, retrocede o salta con el mapa',
    'Verás tu puntaje detallado y un PDF al finalizar',
    'Si cierras la pestaña perderás el progreso del examen'
  ];

  /* -------------------------- Loading state -------------------------- */
  if (status === 'loading') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-hero text-white flex items-center justify-center">
        <div className="absolute inset-0 bg-mountains-bottom opacity-40 pointer-events-none" />
        <div className="absolute inset-0 andean-bold text-white/10 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-40 pointer-events-none" />
        <div className="relative text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-brand-accent/40 blur-2xl animate-pulse" />
            <Loader2 className="relative w-20 h-20 text-brand-accent animate-spin" />
          </div>
          <h2 className="font-display text-3xl font-black mb-2 text-white text-shadow-sm">Preparando tu examen</h2>
          <p className="text-white/90 font-medium">Cargando preguntas reales…</p>
        </div>
      </div>
    );
  }

  /* --------------------------- Error state --------------------------- */
  if (status === 'error') {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-hero text-white flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-mountains-bottom opacity-40 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-40 pointer-events-none" />
        <div className="relative max-w-md w-full text-center rounded-3xl glass p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-200 flex items-center justify-center mx-auto mb-4 border border-red-300/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2 text-white">Error al cargar</h2>
          <p className="text-white/90 font-medium mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/registro')}
              className="px-5 py-2.5 rounded-xl border-2 border-white/30 font-semibold text-white hover:bg-white/10 transition"
            >
              Volver
            </button>
            <button
              onClick={handleStartExam}
              className="px-5 py-2.5 rounded-xl bg-brand-accent text-brand-primary-900 font-bold hover:brightness-110 transition"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const firstName =
    student.fullName
      ?.split(' ')?.[0]
      ?.toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase()) || 'postulante';

  const totalSimulacros = '12,400+';

  return (
    <div
      className="min-h-screen relative overflow-hidden bg-gradient-hero bg-hero-solid text-white py-14 px-4"
      style={{ backgroundColor: '#001529' }}
    >
      {/* --- DECORATIVE BACKGROUND LAYERS --- */}
      {/* Mountains silhouette */}
      <div className="absolute inset-0 bg-mountains-bottom opacity-50 pointer-events-none" />
      {/* Andean pattern */}
      <div className="absolute inset-0 andean-bold text-white/10 pointer-events-none" />
      {/* Noise grain */}
      <div className="absolute inset-0 noise opacity-40 pointer-events-none" />
      {/* Spotlight top */}
      <div className="absolute inset-0 spotlight-top pointer-events-none" />

      {/* Floating blobs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-brand-accent/20 blur-3xl animate-blob-morph animate-drift-slow pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-brand-primary-500/30 blur-3xl animate-blob-morph animate-float-slow pointer-events-none" />
      <div className="absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-orange-500/15 blur-3xl animate-blob-morph animate-drift-slow pointer-events-none" />

      {/* Ilustraciones educativas flotantes */}
      <img
        src="/simulauna/illustrations/books-stack.svg"
        alt=""
        aria-hidden="true"
        className="absolute top-20 right-12 w-40 md:w-56 opacity-25 animate-float-y drop-shadow-2xl hidden md:block pointer-events-none"
      />
      <img
        src="/simulauna/illustrations/graduation-cap.svg"
        alt=""
        aria-hidden="true"
        className="absolute bottom-32 left-10 w-32 md:w-40 opacity-30 animate-float-slow delay-300 hidden md:block pointer-events-none"
      />
      <img
        src="/simulauna/illustrations/formulas.svg"
        alt=""
        aria-hidden="true"
        className="absolute top-1/2 left-1/4 w-48 opacity-10 text-white -translate-y-1/2 hidden lg:block pointer-events-none"
      />
      <img
        src="/simulauna/illustrations/atom.svg"
        alt=""
        aria-hidden="true"
        className="absolute bottom-12 right-1/3 w-20 md:w-28 opacity-20 animate-spin-slow hidden md:block pointer-events-none"
      />

      {/* Floating stars */}
      {[
        { top: '12%', left: '8%', size: 'w-6 h-6', delay: '0ms' },
        { top: '20%', left: '85%', size: 'w-4 h-4', delay: '300ms' },
        { top: '60%', left: '5%', size: 'w-5 h-5', delay: '600ms' },
        { top: '75%', left: '90%', size: 'w-6 h-6', delay: '900ms' },
        { top: '40%', left: '92%', size: 'w-3 h-3', delay: '1200ms' }
      ].map((s, i) => (
        <svg
          key={i}
          className={`absolute ${s.size} text-brand-accent/50 animate-star-twinkle pointer-events-none`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
        </svg>
      ))}

      {/* --- CONTENT --- */}
      <div className="relative z-20 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent/25 border border-brand-accent/50 text-brand-accent text-xs font-black tracking-[0.25em] uppercase backdrop-blur-sm text-shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Todo listo
          </span>
          <h1 className="mt-5 font-display text-5xl md:text-7xl font-black leading-[1.02] tracking-tightest text-white text-shadow">
            Es hora,{' '}
            <span className="italic text-brand-accent inline-block animate-fade-up text-shadow" style={{ animationDelay: '150ms' }}>
              {firstName}.
            </span>
          </h1>
          <p className="mt-5 text-white/95 font-medium text-lg md:text-xl max-w-xl mx-auto leading-relaxed text-shadow-sm">
            60 preguntas. 3 horas. Puntaje real.
          </p>
        </div>

        {/* Glass profile card */}
        <div className="relative rounded-3xl glass p-6 md:p-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="corner-accent absolute top-0 right-0 w-16 h-16 pointer-events-none" />
          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-brand-accent mb-5 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Perfil del postulante
          </h2>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { Icon: CreditCard, label: 'DNI', value: student.dni },
              { Icon: User, label: 'Nombre', value: student.fullName },
              { Icon: BookOpen, label: 'Área', value: student.area },
              ...(student.processType
                ? [{
                    Icon: GraduationCap,
                    label: 'Proceso',
                    value: student.processType + (student.processType === 'CEPREUNA' ? ' · Cuadernillos' : '')
                  }]
                : [])
            ].map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-accent/15 text-brand-accent flex items-center justify-center flex-shrink-0 border border-brand-accent/30">
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/80">{label}</p>
                  <p className="font-bold text-white truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Info pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-white text-xs font-bold backdrop-blur">
              <Clock className="w-3.5 h-3.5 text-brand-accent" /> Sin límite
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-white text-xs font-bold backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Libre navegación
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/30 text-white text-xs font-bold backdrop-blur">
              <BookOpen className="w-3.5 h-3.5 text-brand-accent" /> {areaConfig?.totalQuestions ?? 60} preguntas
            </span>
            {areaConfig && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent/25 border border-brand-accent/50 text-brand-accent text-xs font-bold backdrop-blur">
                <Star className="w-3.5 h-3.5" /> {areaConfig.totalMaxScore.toLocaleString()} pts máx
              </span>
            )}
          </div>
        </div>

        {/* Instructions card */}
        <div
          className="relative mt-6 rounded-2xl p-6 md:p-7 bg-white/5 backdrop-blur border border-white/10 border-l-4 border-l-brand-accent animate-fade-up overflow-hidden"
          style={{ animationDelay: '350ms' }}
        >
          <h2 className="font-display text-xl font-black text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Antes de comenzar
          </h2>
          <ul className="space-y-3">
            {instructions.map((ins, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white font-medium leading-relaxed">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-400/50">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
          <img
            src="/simulauna/illustrations/exam-paper.svg"
            alt=""
            aria-hidden="true"
            className="absolute -bottom-4 -right-4 w-24 opacity-20 rotate-12 pointer-events-none"
          />
        </div>

        {/* CTA */}
        <div
          className="mt-9 flex flex-col items-center gap-3 animate-fade-up"
          style={{ animationDelay: '500ms' }}
        >
          <button
            onClick={handleStartExam}
            className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 text-lg rounded-2xl btn-accent-gold shine-hover font-black tracking-wide shadow-[0_25px_50px_-12px_rgba(212,175,55,0.5)] hover:-translate-y-1 transition-all"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>Comenzar simulacro</span>
          </button>
          <button
            onClick={() => navigate('/registro')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 font-semibold text-sm transition"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar datos
          </button>
        </div>

        {/* Footer badge */}
        <div
          className="mt-10 flex items-center justify-center gap-2 text-center text-xs animate-fade-up"
          style={{ animationDelay: '650ms' }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/25 backdrop-blur text-white/90 font-medium text-shadow-sm">
            <Shield className="w-3.5 h-3.5 text-brand-accent" />
            Simulacros desde 1993 · {totalSimulacros} intentos realizados por estudiantes
            <img
              src="/simulauna/illustrations/lightbulb-idea.svg"
              alt=""
              aria-hidden="true"
              className="w-8 opacity-60 pointer-events-none"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
