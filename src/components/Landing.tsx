import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Target, Trophy, GraduationCap, ChevronDown,
  Cog, HeartPulse, Landmark, UserPlus, Clock, TrendingUp,
  Star, Quote, Zap, FileText, Award, UserCircle2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Asset paths — ilustraciones educativas                                    */
/* -------------------------------------------------------------------------- */
const ASSETS = {
  studyHero: '/simulauna/illustrations/study-hero.svg',
  books: '/simulauna/illustrations/books-stack.svg',
  graduation: '/simulauna/illustrations/graduation-cap.svg',
  formulas: '/simulauna/illustrations/formulas.svg',
  atom: '/simulauna/illustrations/atom.svg',
  examPaper: '/simulauna/illustrations/exam-paper.svg',
  calculator: '/simulauna/illustrations/calculator.svg',
  studentSil: '/simulauna/illustrations/student-silhouette.svg',
  compass: '/simulauna/illustrations/compass-geometry.svg',
  bulb: '/simulauna/illustrations/lightbulb-idea.svg',
};

/* -------------------------------------------------------------------------- */
/*  Fotografías reales — Unsplash (CDN)                                       */
/* -------------------------------------------------------------------------- */
const PHOTOS = {
  studyWoman: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80&auto=format&fit=crop',
  openBooks: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop',
  graduation: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&q=80&auto=format&fit=crop',
  studentLaptop: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=80&auto=format&fit=crop',
  library: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80&auto=format&fit=crop',
  books: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop',
  peruMountain: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80&auto=format&fit=crop',
  libraryWoman: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=1600&q=80&auto=format&fit=crop',
  examPerson: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&q=80&auto=format&fit=crop',
  studyDesk: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80&auto=format&fit=crop',
};

/* -------------------------------------------------------------------------- */
/*  Small in-view hook (no external libs)                                     */
/* -------------------------------------------------------------------------- */
function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3, ...(options || {}) }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return { ref, inView };
}

/* -------------------------------------------------------------------------- */
/*  Animated counter (fires on intersection)                                  */
/* -------------------------------------------------------------------------- */
function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  duration = 1600,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline 4-point star (cross-star)                                          */
/* -------------------------------------------------------------------------- */
function StarTwinkle({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 0 L13.5 10.5 L24 12 L13.5 13.5 L12 24 L10.5 13.5 L0 12 L10.5 10.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Landing                                                                    */
/* -------------------------------------------------------------------------- */
export function Landing() {
  const navigate = useNavigate();

  const handleWhatsAppClick = () => {
    window.open(
      'https://wa.me/51900266810?text=Hola,%20quiero%20acceso%20a%20la%20plataforma%20SimulaUNA',
      '_blank'
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF5] text-slate-800 font-sans overflow-x-hidden">
      {/* ==================================================================== */}
      {/*  1. HERO — cinematic                                                 */}
      {/* ==================================================================== */}
      <section
        className="relative min-h-[100vh] flex items-center overflow-hidden bg-hero-solid text-white"
        style={{ backgroundColor: '#001529' }}
      >
        {/* Fondo fotográfico educativo */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `url('${ASSETS.studyHero}')`,
            backgroundSize: '600px',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Textura fotográfica sutil — mujer estudiando en biblioteca */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.22]"
          style={{
            backgroundImage: `url('${PHOTOS.libraryWoman}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px)',
          }}
        />
        {/* Overlay oscurecedor definitivo */}
        <div className="absolute inset-0 hero-dim-overlay pointer-events-none" />
        {/* Layer 1 — textil andino */}
        <div className="absolute inset-0 andean-bold text-white/40 pointer-events-none" />
        {/* Layer 2 — spotlight superior */}
        <div className="absolute inset-0 spotlight-top pointer-events-none" />
        {/* Noise */}
        <div className="absolute inset-0 noise pointer-events-none opacity-40" />

        {/* Layer 5 — blobs decorativos */}
        <div className="absolute -top-24 -right-32 w-[520px] h-[520px] rounded-full bg-brand-accent/30 blur-3xl animate-blob-morph animate-drift-slow pointer-events-none" />
        <div className="absolute bottom-10 -left-32 w-[420px] h-[420px] rounded-full bg-brand-secondary/25 blur-3xl animate-blob-morph animate-drift-slow pointer-events-none" />

        {/* Layer 4 — estrellas flotantes */}
        <StarTwinkle className="absolute top-24 left-[12%] w-3 h-3 text-brand-accent-200 animate-star-twinkle" size={12} />
        <StarTwinkle className="absolute top-16 left-[48%] w-4 h-4 text-white animate-star-twinkle delay-150" size={16} />
        <StarTwinkle className="absolute top-40 right-[30%] w-2 h-2 text-brand-accent-300 animate-star-twinkle delay-300" size={8} />
        <StarTwinkle className="absolute top-[55%] left-[8%] w-3 h-3 text-white/80 animate-star-twinkle delay-500" size={14} />
        <StarTwinkle className="absolute top-[28%] right-[12%] w-5 h-5 text-brand-accent-300 animate-star-twinkle delay-75" size={20} />
        <StarTwinkle className="absolute top-[70%] left-[42%] w-2 h-2 text-white animate-star-twinkle delay-700" size={10} />
        <StarTwinkle className="absolute top-[18%] right-[48%] w-3 h-3 text-brand-accent-200 animate-star-twinkle delay-300" size={12} />
        <StarTwinkle className="absolute top-[48%] right-[6%] w-4 h-4 text-white/70 animate-star-twinkle delay-500" size={14} />

        {/* Layer 3 — silueta de montañas en la base */}
        <div
          className="absolute bottom-0 left-0 right-0 h-72 md:h-96 pointer-events-none bg-mountains-bottom z-[5]"
          style={{
            backgroundImage: "url('/simulauna/illustrations/mountains.svg')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'bottom',
          }}
        />

        {/* Overlay oscuro inferior para legibilidad sobre montañas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-[1]" />

        {/* Contenido */}
        <div className="relative container mx-auto px-4 sm:px-6 py-20 md:py-28 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full z-20">
          {/* LEFT */}
          <div className="lg:col-span-6 animate-fade-up">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs md:text-sm font-medium text-white shadow-sm">
              <GraduationCap className="w-4 h-4 text-brand-accent-300" />
              <span>Universidad Nacional del Altiplano — Puno</span>
            </div>

            {/* H1 gigante */}
            <h1 className="mt-6 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tightest text-white drop-shadow-2xl [text-shadow:0_4px_20px_rgba(0,0,0,0.7)]">
              Prepárate
              <br />
              para la <span className="gradient-text-gold" style={{ color: '#D4AF37' }}>universidad</span>
              <br />
              <span className="italic font-display">de verdad.</span>
            </h1>

            {/* Micro-copy — universidades */}
            <p className="mt-3 text-white/90 font-semibold text-sm md:text-base [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
              UNA Puno · San Marcos · UNI · UNSA · UNSAAC · UNCP · UNFV · y todas las universidades del Perú.
            </p>

            {/* Subtitle */}
            <p className="mt-6 text-white/95 font-medium text-lg md:text-xl max-w-xl leading-relaxed drop-shadow-lg [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
              Simulacros con preguntas <strong className="text-white">reales</strong> desde 1993.
              Para la UNA Puno y todos los postulantes del Perú.{' '}
              <strong className="text-white">Gratis. Serio. Tuyo.</strong>
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/registro')}
                className="btn-accent-gold shine-hover inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-xl font-bold bg-brand-accent-500 text-brand-primary-900 shadow-xl shadow-brand-accent-500/30 hover:bg-brand-accent-400 hover:-translate-y-0.5 transition-all"
              >
                Comenzar simulacro gratis
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/banqueo-tema')}
                className="inline-flex items-center justify-center gap-2 bg-white/15 border-2 border-white/60 text-white font-bold hover:bg-white/30 hover:border-white backdrop-blur-sm shadow-xl rounded-xl px-6 py-4 transition-all"
              >
                Ver banqueo por tema
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap gap-2">
              {['+2,000 preguntas reales', '1993 — 2024', '60 preguntas · 3 horas'].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/40 text-white font-bold text-xs shadow-lg [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-accent-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT — mockup cinematográfico */}
          <div className="lg:col-span-6 relative h-[500px] md:h-[560px] animate-slide-in-right">
            {/* glow detrás */}
            <div className="absolute top-10 right-6 w-[420px] h-[420px] rounded-[45%_55%_40%_60%/55%_45%_60%_40%] bg-brand-accent/30 blur-3xl animate-blob-morph" />

            {/* Ilustraciones educativas decorativas */}
            <img
              src={ASSETS.formulas}
              alt=""
              aria-hidden="true"
              className="absolute -top-4 right-2 w-48 opacity-30 animate-float-y pointer-events-none select-none"
            />
            <img
              src={ASSETS.atom}
              alt=""
              aria-hidden="true"
              className="absolute bottom-8 -left-6 w-32 opacity-40 animate-spin-slow pointer-events-none select-none"
            />
            <img
              src={ASSETS.books}
              alt=""
              aria-hidden="true"
              className="absolute top-1/2 -right-4 w-24 opacity-40 animate-float-slow delay-300 pointer-events-none select-none"
            />

            {/* Score card principal */}
            <div className="absolute top-0 right-0 md:right-4 w-[320px] md:w-[380px] rounded-3xl bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] border border-white p-6 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                    style={{ backgroundColor: '#D4AF37', color: '#002458' }}
                  >
                    <UserCircle2 className="w-6 h-6" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Simulacro 03</p>
                    <p className="text-sm font-bold text-slate-900">Ingenierías</p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#D1FAE5', color: '#047857' }}
                >
                  Excelente
                </span>
              </div>

              {/* Anillo + lista */}
              <div className="flex items-center gap-5">
                <div className="relative w-[140px] h-[140px] flex-shrink-0">
                  <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                    <circle cx="90" cy="90" r="76" fill="none" stroke="#F7EDCA" strokeWidth="12" />
                    <circle
                      cx="90"
                      cy="90"
                      r="76"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 76 * 0.82} ${2 * Math.PI * 76}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-4xl font-black leading-none" style={{ color: '#001f3f' }}>2450</span>
                    <span className="text-[11px] font-medium mt-1" style={{ color: '#64748b' }}>/ 3000</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  {[
                    { n: 'Matemática', v: 85, gradient: 'linear-gradient(90deg, #0066CC 0%, #003D7A 100%)' },
                    { n: 'Física', v: 72, gradient: 'linear-gradient(90deg, #F4A261 0%, #E67E22 100%)' },
                    { n: 'Química', v: 78, gradient: 'linear-gradient(90deg, #34D399 0%, #059669 100%)' },
                    { n: 'R. Verbal', v: 90, gradient: 'linear-gradient(90deg, #F4CF5F 0%, #D4AF37 100%)' },
                    { n: 'R. Mat.', v: 88, gradient: 'linear-gradient(90deg, #FB7185 0%, #E11D48 100%)' },
                  ].map((s) => (
                    <div key={s.n}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold" style={{ color: '#334155' }}>{s.n}</span>
                        <span className="font-bold" style={{ color: '#0f172a' }}>{s.v}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${s.v}%`, backgroundImage: s.gradient }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{ backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' }}
                >
                  <Target className="w-3 h-3" /> 58/60 correctas
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{ backgroundColor: '#F0F7FF', color: '#003D7A', borderColor: '#B3D4F2' }}
                >
                  <Clock className="w-3 h-3" /> 2h 12m
                </span>
              </div>
            </div>

            {/* Preview pregunta */}
            <div className="absolute bottom-0 left-0 md:left-2 w-[280px] rounded-2xl bg-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)] border border-slate-100 p-4 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ backgroundColor: '#003D7A', color: '#ffffff' }}
                >
                  Pregunta 12
                </span>
                <span className="text-[10px] font-semibold" style={{ color: '#64748b' }}>
                  Álgebra · 50 pts
                </span>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed mb-3 font-medium">
                Si x² − 5x + 6 = 0, ¿cuál es la suma de las raíces?
              </p>
              <div className="space-y-1.5">
                {[
                  { l: 'A) 5', active: true },
                  { l: 'B) 6', active: false },
                  { l: 'C) −5', active: false },
                ].map((o) => (
                  <div
                    key={o.l}
                    className="text-[11px] px-2.5 py-2 rounded-md border font-medium shadow-sm"
                    style={
                      o.active
                        ? { borderColor: '#003D7A', backgroundColor: '#F0F7FF', color: '#002458', fontWeight: 700 }
                        : { borderColor: '#E2E8F0', color: '#475569', backgroundColor: '#ffffff' }
                    }
                  >
                    {o.l}
                  </div>
                ))}
              </div>
            </div>

            {/* Badge dorado flotante */}
            <div className="absolute top-6 -left-2 md:left-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 text-slate-900 font-bold border-2 border-amber-300 shadow-lg">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">Nuevo récord</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20">
          <span className="font-mono text-[10px] text-white font-bold tracking-[0.3em] drop-shadow-lg [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">SCROLL</span>
          <ChevronDown className="w-4 h-4 text-white animate-bounce drop-shadow-lg" />
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  1b. CARRUSEL DE UNIVERSIDADES                                        */}
      {/* ==================================================================== */}
      <section className="relative py-14 md:py-16 bg-white border-y border-slate-200 overflow-hidden">
        <div className="absolute inset-0 dots-bg-brand opacity-40 pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-3"
              style={{ backgroundColor: '#F0F7FF', color: '#003D7A', border: '1px solid #B3D4F2' }}
            >
              <Award className="w-3.5 h-3.5" /> Universidades del Perú
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Te preparamos para <span className="gradient-text-brand" style={{ color: '#003D7A' }}>todas</span>
            </h2>
            <p className="mt-2 text-slate-600 text-sm md:text-base">
              Una plataforma. Muchos destinos. Elige tu universidad objetivo.
            </p>
          </div>

          {/* Marquee */}
          <div className="relative">
            {/* Gradientes a los lados para fade */}
            <div className="absolute top-0 left-0 bottom-0 w-16 md:w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }} />
            <div className="absolute top-0 right-0 bottom-0 w-16 md:w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #ffffff, transparent)' }} />

            <div className="flex overflow-hidden group">
              <div className="flex animate-marquee group-hover:[animation-play-state:paused] shrink-0 gap-14 md:gap-20 pr-14 md:pr-20 items-center">
                {[
                  { sigla: 'UNA', name: 'Universidad Nacional del Altiplano - Puno', url: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Logo_UNAP.png' },
                  { sigla: 'UNAJ', name: 'Universidad Nacional de Juliaca', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/UNIVERSIDAD_NACIONAL_DE_JULIACA_%28UNAJ%29.png' },
                  { sigla: 'UNMSM', name: 'Universidad Nacional Mayor de San Marcos', url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/UNMSM_Escudo_y_Nombre.png' },
                  { sigla: 'UNI', name: 'Universidad Nacional de Ingeniería', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Uni-logo_transparente_granate.png' },
                  { sigla: 'UNSA', name: 'Universidad Nacional de San Agustín - Arequipa', url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/LOGO_UNSA.png' },
                  { sigla: 'UNSAAC', name: 'Universidad Nacional de San Antonio Abad - Cusco', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Escudo_UNSAAC.png' },
                  { sigla: 'UNCP', name: 'Universidad Nacional del Centro del Perú', url: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Logo_UNCP.png' },
                  { sigla: 'UNFV', name: 'Universidad Nacional Federico Villarreal', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Logo_UNFV.png' },
                  { sigla: 'UNALM', name: 'Universidad Nacional Agraria La Molina', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Unalm_logo.png' },
                  { sigla: 'UNT', name: 'Universidad Nacional de Trujillo', url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Universidad_Nacional_de_Trujillo.png' },
                  { sigla: 'UNP', name: 'Universidad Nacional de Piura', url: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Escudo_Universidad_Nacional_de_Piura.png' },
                  { sigla: 'UNSCH', name: 'Universidad Nacional San Cristóbal de Huamanga', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Logo_UNSCH.png' },
                ].concat([
                  { sigla: 'UNA', name: 'Universidad Nacional del Altiplano - Puno', url: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Logo_UNAP.png' },
                  { sigla: 'UNAJ', name: 'Universidad Nacional de Juliaca', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/UNIVERSIDAD_NACIONAL_DE_JULIACA_%28UNAJ%29.png' },
                  { sigla: 'UNMSM', name: 'Universidad Nacional Mayor de San Marcos', url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/UNMSM_Escudo_y_Nombre.png' },
                  { sigla: 'UNI', name: 'Universidad Nacional de Ingeniería', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Uni-logo_transparente_granate.png' },
                  { sigla: 'UNSA', name: 'Universidad Nacional de San Agustín - Arequipa', url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/LOGO_UNSA.png' },
                  { sigla: 'UNSAAC', name: 'Universidad Nacional de San Antonio Abad - Cusco', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Escudo_UNSAAC.png' },
                  { sigla: 'UNCP', name: 'Universidad Nacional del Centro del Perú', url: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Logo_UNCP.png' },
                  { sigla: 'UNFV', name: 'Universidad Nacional Federico Villarreal', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Logo_UNFV.png' },
                  { sigla: 'UNALM', name: 'Universidad Nacional Agraria La Molina', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Unalm_logo.png' },
                  { sigla: 'UNT', name: 'Universidad Nacional de Trujillo', url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Universidad_Nacional_de_Trujillo.png' },
                  { sigla: 'UNP', name: 'Universidad Nacional de Piura', url: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Escudo_Universidad_Nacional_de_Piura.png' },
                  { sigla: 'UNSCH', name: 'Universidad Nacional San Cristóbal de Huamanga', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Logo_UNSCH.png' },
                ]).map((u, idx) => (
                  <div
                    key={`${u.sigla}-${idx}`}
                    title={u.name}
                    className="flex flex-col items-center gap-2 shrink-0 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-default"
                  >
                    <img
                      src={u.url}
                      alt={u.name}
                      loading="lazy"
                      className="h-16 md:h-20 w-auto object-contain select-none"
                      style={{ maxWidth: '140px' }}
                    />
                    <span className="text-[10px] md:text-xs font-bold tracking-wider text-slate-500">{u.sigla}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  2. CÓMO FUNCIONA — bg-mesh-deep                                     */}
      {/* ==================================================================== */}
      <section className="relative py-24 md:py-28 bg-[#001f3f] bg-mesh-deep text-white overflow-hidden">
        <div className="absolute inset-0 andean-bold text-white/20 pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-accent-500/15 border border-brand-accent-400/40 text-brand-accent-300 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Proceso simple
            </span>
            <h2 className="font-display text-5xl md:text-6xl font-black gradient-text-gold leading-[1.02] tracking-tightest">
              4 pasos y listo
            </h2>
            <p className="mt-5 text-white/70 text-lg">
              Regístrate, elige tu área, rinde el simulacro y revisa tu análisis detallado.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto pt-12">
            {/* Línea conectora punteada dorada (desktop) */}
            <div
              className="hidden md:block absolute top-[4.5rem] left-[12.5%] right-[12.5%] border-t-2 border-dashed z-0"
              style={{ borderColor: 'rgba(212,175,55,0.35)' }}
            />

            <div className="grid md:grid-cols-4 gap-8 md:gap-6 relative">
              {[
                { n: '01', icon: UserPlus, t: 'Regístrate', d: 'DNI, nombre y correo. Sin tarjetas ni compromisos.' },
                { n: '02', icon: Target, t: 'Elige tu área', d: 'Ingenierías, Biomédicas o Sociales según tu carrera.' },
                { n: '03', icon: Clock, t: 'Rinde cronometrado', d: '60 preguntas reales. Mismas condiciones que el examen.' },
                { n: '04', icon: TrendingUp, t: 'Analiza y mejora', d: 'Puntaje detallado, justificaciones y PDF descargable.' },
              ].map((s, i) => {
                const delayClass = (['delay-75', 'delay-150', 'delay-300', 'delay-500'] as const)[i];
                return (
                  <div key={s.n} className={`relative group animate-fade-up ${delayClass}`}>
                    {/* Card */}
                    <div
                      className="relative rounded-2xl border border-white/15 p-6 pt-20 h-full shadow-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-accent-400/60"
                      style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}
                    >
                      {/* Badge circular dorado con el número */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                        <div className="relative">
                          {/* Halo blur */}
                          <div
                            className="absolute -inset-2 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity"
                            style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
                          />
                          {/* Anillo exterior */}
                          <div
                            className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-4"
                            style={{
                              background: 'linear-gradient(145deg, #F4CF5F 0%, #D4AF37 55%, #A88422 100%)',
                              borderColor: 'rgba(255,255,255,0.25)',
                              boxShadow: '0 15px 40px -10px rgba(212,175,55,0.6), inset 0 2px 4px rgba(255,255,255,0.4)',
                            }}
                          >
                            <span
                              className="font-display text-4xl font-black select-none"
                              style={{ color: '#001f3f', textShadow: '0 1px 1px rgba(255,255,255,0.4)' }}
                            >
                              {s.n}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Icon badge */}
                      <div className="flex justify-center mb-4">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg border group-hover:scale-110 transition-transform"
                          style={{
                            backgroundColor: 'rgba(212,175,55,0.15)',
                            borderColor: 'rgba(212,175,55,0.35)',
                            color: '#F4CF5F',
                          }}
                        >
                          <s.icon className="w-6 h-6" />
                        </div>
                      </div>

                      {/* Title + description */}
                      <div className="text-center">
                        <h3 className="font-display text-xl font-bold text-white mb-2 leading-tight">{s.t}</h3>
                        <p className="text-sm text-white/80 leading-relaxed">{s.d}</p>
                      </div>
                    </div>

                    {/* Chevron conector entre cards (solo desktop) */}
                    {i < 3 && (
                      <div className="hidden md:flex absolute top-[4rem] -right-4 w-8 h-8 items-center justify-center z-20 pointer-events-none">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: '#D4AF37', color: '#001f3f' }}
                        >
                          <ArrowRight className="w-4 h-4" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  3. ÁREAS — color blocking                                           */}
      {/* ==================================================================== */}
      <section className="relative py-20 md:py-28 bg-white dots-bg overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-80 spotlight-gold pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary-50 border border-brand-primary-200 text-brand-primary-700 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              Áreas académicas
            </span>
            <h2 className="font-display text-5xl md:text-6xl font-black text-slate-900 leading-[1.02] tracking-tightest">
              Tres áreas, <span className="gradient-text-brand italic">una meta</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: 'Ingenierías',
                icon: Cog,
                gradient: 'from-blue-600 to-blue-900',
                subjects: ['Matemática', 'Física', 'Química'],
                decor: (
                  <>
                    <img
                      src={ASSETS.calculator}
                      alt=""
                      aria-hidden="true"
                      className="absolute right-4 bottom-4 w-56 opacity-25 group-hover:opacity-40 transition pointer-events-none select-none z-[1]"
                    />
                    <img
                      src={ASSETS.compass}
                      alt=""
                      aria-hidden="true"
                      className="absolute left-4 bottom-4 w-32 opacity-20 group-hover:opacity-35 transition pointer-events-none select-none z-[1]"
                    />
                  </>
                ),
              },
              {
                name: 'Biomédicas',
                icon: HeartPulse,
                gradient: 'from-rose-500 to-rose-900',
                subjects: ['Biología', 'Química', 'Anatomía'],
                decor: (
                  <img
                    src={ASSETS.atom}
                    alt=""
                    aria-hidden="true"
                    className="absolute right-4 bottom-4 w-56 opacity-25 group-hover:opacity-40 transition pointer-events-none select-none z-[1]"
                  />
                ),
              },
              {
                name: 'Sociales',
                icon: Landmark,
                gradient: 'from-amber-500 to-orange-700',
                subjects: ['Historia', 'Economía', 'Comunicación'],
                decor: (
                  <>
                    <img
                      src={ASSETS.books}
                      alt=""
                      aria-hidden="true"
                      className="absolute right-4 bottom-4 w-56 opacity-25 group-hover:opacity-40 transition pointer-events-none select-none z-[1]"
                    />
                    <img
                      src={ASSETS.examPaper}
                      alt=""
                      aria-hidden="true"
                      className="absolute left-4 bottom-6 w-28 opacity-20 group-hover:opacity-35 transition pointer-events-none select-none z-[1]"
                    />
                  </>
                ),
              },
            ].map((a, i) => (
              <button
                key={a.name}
                onClick={() => navigate('/registro')}
                className={`group relative overflow-hidden rounded-3xl p-8 min-h-[420px] text-left text-white bg-gradient-to-br ${a.gradient} shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 animate-fade-up delay-${((i + 1) * 150) as 150 | 300 | 500}`}
              >
                {/* andean overlay */}
                <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none z-[1]" />
                {a.decor}

                {/* icono gigante esquina */}
                <a.icon className="absolute top-6 right-6 w-20 h-20 text-white/20" />

                <div className="relative z-10 flex flex-col h-full">
                  <span className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur border border-white/30 text-[11px] font-bold uppercase tracking-wider">
                    17 carreras · 60 preguntas
                  </span>

                  <h3 className="mt-6 font-display text-4xl font-black leading-tight">{a.name}</h3>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {a.subjects.map((s) => (
                      <li
                        key={s}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 text-xs font-semibold"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-8 inline-flex items-center gap-1.5 text-sm font-bold opacity-70 group-hover:opacity-100 group-hover:gap-3 transition-all">
                    Explorar área
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  4. STATS BAND — números gigantes                                    */}
      {/* ==================================================================== */}
      <section className="relative py-24 md:py-28 bg-[#002458] bg-brand-primary-900 text-white overflow-hidden">
        <div className="absolute inset-0 andean-bold text-white/20 pointer-events-none" />
        <div className="absolute inset-0 bg-constellation opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(at_20%_30%,rgba(212,175,55,0.25),transparent_55%),radial-gradient(at_80%_70%,rgba(0,102,204,0.25),transparent_55%)] pointer-events-none" />

        {/* Ilustración educativa grande detrás de números */}
        <img
          src={ASSETS.graduation}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 m-auto w-[480px] max-w-[80%] opacity-5 pointer-events-none select-none"
        />
        <img src="/simulauna/illustrations/lightbulb-idea.svg" alt="" aria-hidden="true"
          className="hidden md:block absolute left-10 top-1/2 -translate-y-1/2 w-24 opacity-20 animate-float-y text-brand-accent pointer-events-none" />
        <img src="/simulauna/illustrations/compass-geometry.svg" alt="" aria-hidden="true"
          className="hidden md:block absolute right-10 bottom-10 w-32 opacity-15 animate-spin-slow pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-accent-500/15 border border-brand-accent-400/40 text-brand-accent-300 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              La plataforma en números
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-black tracking-tightest leading-[1.05]">
              Hecho con <span className="italic text-brand-accent-400 gradient-text-gold">amor</span> para estudiantes preuniversitarios del Perú
            </h2>
            <p className="mt-5 text-white/80 text-base md:text-lg font-medium leading-relaxed">
              Una plataforma accesible, gratuita y rigurosa. Tu preparación merece las mejores herramientas.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 max-w-5xl mx-auto">
            {[
              { prefix: '+', v: 2000, l: 'Postulantes reales' },
              { prefix: '', v: 40, suffix: '+', l: 'Carreras' },
              { prefix: '', v: 18, l: 'Asignaturas' },
              { prefix: '', v: 1993, l: 'Examen más antiguo' },
            ].map((s, i) => (
              <div
                key={s.l}
                className={`text-center animate-fade-up delay-${((i + 1) * 150) as 150 | 300 | 500 | 700}`}
              >
                <div className="font-display font-black text-6xl md:text-7xl tracking-tight leading-none animate-number-roll text-brand-accent-400 [text-shadow:0_2px_12px_rgba(0,0,0,0.35)] px-1">
                  <AnimatedNumber value={s.v} prefix={s.prefix} suffix={s.suffix || ''} />
                </div>
                <p className="mt-4 text-xs md:text-sm uppercase tracking-widest text-white font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  5. FEATURES — 6 tarjetas                                            */}
      {/* ==================================================================== */}
      <section className="relative py-20 md:py-24 bg-slate-50 dots-bg-brand overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary-50 border border-brand-primary-200 text-brand-primary-700 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              Por qué SimulaUNA
            </span>
            <h2 className="font-display text-5xl md:text-6xl font-black text-slate-900 leading-[1.02] tracking-tightest">
              Todo lo que necesitas <span className="gradient-text-brand italic">para destacar</span>
            </h2>
          </div>

          {/* Hero fotográfico de sección */}
          <div className="relative max-w-5xl mx-auto mb-16 rounded-3xl overflow-hidden aspect-[21/9] shadow-elevation-4">
            <img
              src={PHOTOS.studyDesk}
              alt="Estudiantes preparándose"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="font-display text-2xl md:text-3xl font-black drop-shadow-lg">
                Una herramienta hecha por postulantes, para postulantes
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto">
            {[
              { icon: Clock, title: 'Cronómetro real', desc: 'Mismas 3 horas del examen. Entrénate bajo presión.', color: 'text-brand-primary-700 bg-brand-primary-50', deco: ASSETS.examPaper },
              { icon: FileText, title: '60 preguntas por simulacro', desc: 'Estructura idéntica al examen oficial de la UNA Puno.', color: 'text-rose-700 bg-rose-50', deco: ASSETS.formulas },
              { icon: Sparkles, title: 'Justificaciones detalladas', desc: 'No solo la respuesta: el porqué completo de cada alternativa.', color: 'text-brand-accent-700 bg-brand-accent-50', deco: ASSETS.bulb },
              { icon: TrendingUp, title: 'Historial de progreso', desc: 'Mira tu evolución por asignatura y por área con gráficas.', color: 'text-emerald-700 bg-emerald-50', deco: ASSETS.calculator },
              { icon: Award, title: 'PDF descargable', desc: 'Cada simulacro con reporte profesional listo para imprimir.', color: 'text-brand-secondary-700 bg-brand-secondary-50', deco: ASSETS.graduation },
              { icon: Zap, title: 'Gratis primer intento', desc: 'Sin tarjetas, sin trampas. Regístrate y rinde ahora mismo.', color: 'text-amber-700 bg-amber-50', deco: ASSETS.studentSil },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`group relative h-full rounded-3xl bg-white p-7 border border-slate-100 shadow-[0_1px_2px_0_rgba(15,23,42,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.18)] hover:-translate-y-1 transition-all duration-300 overflow-hidden animate-fade-up delay-${((i % 4 + 1) * 150) as 150 | 300 | 500 | 700}`}
              >
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform relative z-10`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-black text-xl text-slate-900 mb-2 leading-tight relative z-10">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed relative z-10">{f.desc}</p>
                <img
                  src={f.deco}
                  alt=""
                  aria-hidden="true"
                  className="absolute bottom-3 right-3 w-16 opacity-20 group-hover:opacity-30 transition pointer-events-none select-none"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  6. TESTIMONIOS                                                      */}
      {/* ==================================================================== */}
      <section className="relative py-24 md:py-28 bg-mesh-warm overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur border border-brand-primary-200 text-brand-primary-700 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              <Star className="w-3.5 h-3.5 fill-current" /> Voces de ingresantes
            </span>
            <h2 className="font-display text-5xl md:text-6xl font-black gradient-text-brand leading-[1.02] tracking-tightest">
              Historias que inspiran
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: 'María Quispe Mamani',
                career: 'Ingeniería de Sistemas · UNA',
                text: 'Practiqué 6 meses con SimulaUNA y entré en primer puesto. Las preguntas reales hicieron toda la diferencia en mi preparación.',
                photo: 'https://i.pravatar.cc/150?img=47',
              },
              {
                name: 'Juan Carlos Apaza',
                career: 'Medicina Humana · UNA',
                text: 'Los simulacros reales me prepararon para la presión del examen. El cronómetro real fue clave para controlar mi ritmo el día D.',
                photo: 'https://i.pravatar.cc/150?img=13',
              },
              {
                name: 'Rosa Condori Huanca',
                career: 'Derecho · UNA',
                text: 'El banqueo por tema es lo mejor. Identifiqué exactamente qué estudiar y optimicé mis horas. Recomendado 100%.',
                photo: 'https://i.pravatar.cc/150?img=32',
              },
            ].map((t, i) => (
              <div
                key={t.name}
                className={`relative bg-white rounded-3xl p-7 overflow-hidden shadow-[0_20px_40px_-15px_rgba(15,23,42,0.15)] hover:shadow-[0_30px_60px_-15px_rgba(15,23,42,0.22)] hover:-translate-y-1 transition-all duration-500 animate-fade-up delay-${((i + 1) * 150) as 150 | 300 | 500}`}
              >
                <Quote className="absolute top-5 right-5 w-10 h-10 text-brand-accent-300/60" />
                <img
                  src={ASSETS.books}
                  alt=""
                  aria-hidden="true"
                  className="absolute -bottom-2 -right-2 w-24 opacity-10 pointer-events-none select-none"
                />

                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-slate-700 leading-relaxed mb-6 text-[15px]">"{t.text}"</p>

                <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                  <img
                    src={t.photo}
                    alt={t.name}
                    loading="lazy"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-accent/40 shadow-md"
                  />
                  <div>
                    <p className="font-bold text-slate-900 text-sm leading-tight">{t.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.career}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  7. CTA FINAL                                                        */}
      {/* ==================================================================== */}
      <section className="relative py-24 md:py-28 bg-[#003D7A] bg-mesh-brand animate-gradient overflow-hidden text-white">
        <img
          src={PHOTOS.graduation}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
        />
        <div className="absolute inset-0 andean-bold text-white/20 pointer-events-none" />
        <div className="absolute inset-0 noise opacity-30 pointer-events-none" />
        <img
          src={ASSETS.studyHero}
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] max-w-[60%] opacity-[0.15] pointer-events-none select-none"
        />
        <img src="/simulauna/illustrations/student-silhouette.svg" alt="" aria-hidden="true"
          className="hidden md:block absolute left-[8%] bottom-10 w-48 opacity-15 text-white pointer-events-none" />

        {/* estrellas */}
        <StarTwinkle className="absolute top-16 left-[20%] text-brand-accent-300 animate-star-twinkle" size={16} />
        <StarTwinkle className="absolute top-32 right-[25%] text-white animate-star-twinkle delay-300" size={12} />
        <StarTwinkle className="absolute bottom-20 left-[30%] text-brand-accent-200 animate-star-twinkle delay-500" size={14} />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur border border-white/40 text-white text-xs font-bold uppercase tracking-[0.2em] mb-7 shadow-xl [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            <Sparkles className="w-3.5 h-3.5" /> Tu primer simulacro es gratis
          </span>

          <h2 className="font-display text-5xl md:text-7xl font-black tracking-tightest leading-[0.95] text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.45)]">
            Tu universidad te espera a
            <br />
            <span className="italic text-brand-accent-400 gradient-text-gold">60 preguntas</span>
          </h2>

          <p className="mt-6 text-white/90 font-medium text-lg md:text-xl max-w-xl mx-auto leading-relaxed [text-shadow:0_1px_4px_rgba(0,0,0,0.4)]">
            UNA Puno, San Marcos, UNI, UNSA, UNSAAC — la plataforma es tuya.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/registro')}
              className="btn-accent-gold shine-hover inline-flex items-center justify-center gap-2 text-xl px-10 py-5 rounded-xl font-black bg-brand-accent-500 text-brand-primary-900 shadow-2xl shadow-brand-accent-500/30 hover:bg-brand-accent-400 hover:-translate-y-0.5 transition-all"
            >
              Registrarme ahora
              <ArrowRight className="w-6 h-6" />
            </button>
            <button
              onClick={handleWhatsAppClick}
              className="inline-flex items-center justify-center gap-2 px-8 py-5 rounded-xl bg-white/10 text-white font-bold border-2 border-white/30 backdrop-blur hover:bg-white/20 transition-all"
            >
              Hablar por WhatsApp
            </button>
          </div>

          <p className="mt-7 text-white/80 text-sm font-medium [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
            Sin tarjeta · Sin compromiso · Solo practica
          </p>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  FOOTER                                                              */}
      {/* ==================================================================== */}
      <footer className="bg-slate-900 text-white/60 py-12 relative overflow-hidden">
        <div className="absolute inset-0 andean-bold text-white/10 pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="grid md:grid-cols-3 gap-10 pb-8 border-b border-white/10">
            {/* Logo + descripción */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-accent-500 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-5 h-5 text-brand-primary-900" />
                </div>
                <div>
                  <p className="font-display font-black text-white text-lg leading-none">SimulaUNA</p>
                  <p className="text-[11px] text-white/50 mt-0.5">por SINAPSIS</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Plataforma gratuita de simulacros preuniversitarios del Perú. Preguntas reales, cronómetro real, preparación real. Por y para postulantes.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="font-display font-bold text-white uppercase tracking-wider text-xs mb-4">Explorar</p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => navigate('/banqueo-tema')} className="hover:text-white transition-colors">
                    Banqueo por tema
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/registro')} className="hover:text-white transition-colors">
                    Crear cuenta
                  </button>
                </li>
                <li>
                  <a href="https://ceprem.unap.edu.pe" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    CEPREUNA
                  </a>
                </li>
                <li>
                  <button onClick={handleWhatsAppClick} className="hover:text-white transition-colors">
                    WhatsApp
                  </button>
                </li>
              </ul>
            </div>

            {/* Créditos */}
            <div>
              <p className="font-display font-bold text-white uppercase tracking-wider text-xs mb-4">Créditos</p>
              <p className="text-sm leading-relaxed">
                Proyecto independiente de apoyo a los postulantes de la Universidad Nacional del Altiplano — Puno.
              </p>
              <p className="text-xs mt-3 text-white/40">
                No afiliado oficialmente con la UNA Puno. Preguntas de exámenes públicos.
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <p>© {new Date().getFullYear()} SimulaUNA · Todos los derechos reservados</p>
            <p>Hecho con amor en Puno, Perú — para todos los estudiantes del país</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
