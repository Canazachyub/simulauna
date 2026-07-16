import { useEffect, useRef, useState, type CSSProperties, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Trophy, GraduationCap, ChevronDown,
  Cog, HeartPulse, Landmark, UserPlus, Clock, TrendingUp,
  Star, Quote, FileText, Award, BookMarked, Rocket, MonitorPlay,
} from 'lucide-react';
import { useUniversityStore } from '../hooks/useUniversity';
import { getUniversityTheme, themeCssVars } from '../theme/universityThemes';
import {
  UniversityCardRegistered,
  UniversityCardComingSoon,
  UniversityCardSkeleton,
} from './landing/UniversityCards';
import { LandingNavbar } from './landing/LandingNavbar';
import { SectionCurve } from './landing/SectionCurve';

// Universidades del carrusel: `codigo` identifica su tema institucional (ver
// src/theme/universityThemes.ts) para TODAS — registradas y "Próximamente" por igual.
// La navegación real solo se habilita para las que aparecen en el registro maestro
// (getUniversidades); el resto queda con tooltip "Próximamente" y sin link, pero ya
// respira su color real.
// Logos servidos localmente desde public/logos/ (descargados de Wikimedia Commons con
// atribución CC/dominio público de cada universidad; ver README.md § Arquitectura multi-universidad).
const UNIVERSITY_LOGOS: { sigla: string; name: string; url: string; codigo: string }[] = [
  { sigla: 'UNA', name: 'Universidad Nacional del Altiplano - Puno', url: '/simulauna/logos/una.png', codigo: 'una' },
  { sigla: 'UNAJ', name: 'Universidad Nacional de Juliaca', url: '/simulauna/logos/unaj.png', codigo: 'unaj' },
  { sigla: 'UNMSM', name: 'Universidad Nacional Mayor de San Marcos', url: '/simulauna/logos/sanmarcos.png', codigo: 'sanmarcos' },
  { sigla: 'UNI', name: 'Universidad Nacional de Ingeniería', url: '/simulauna/logos/uni.png', codigo: 'uni' },
  { sigla: 'UNSA', name: 'Universidad Nacional de San Agustín - Arequipa', url: '/simulauna/logos/unsa.png', codigo: 'unsa' },
  { sigla: 'UNSAAC', name: 'Universidad Nacional de San Antonio Abad - Cusco', url: '/simulauna/logos/unsaac.png', codigo: 'unsaac' },
  { sigla: 'UNCP', name: 'Universidad Nacional del Centro del Perú', url: '/simulauna/logos/uncp.png', codigo: 'uncp' },
  { sigla: 'UNFV', name: 'Universidad Nacional Federico Villarreal', url: '/simulauna/logos/unfv.png', codigo: 'unfv' },
  { sigla: 'UNALM', name: 'Universidad Nacional Agraria La Molina', url: '/simulauna/logos/unalm.png', codigo: 'unalm' },
  { sigla: 'UNT', name: 'Universidad Nacional de Trujillo', url: '/simulauna/logos/unt.png', codigo: 'unt' },
  { sigla: 'UNP', name: 'Universidad Nacional de Piura', url: '/simulauna/logos/unp.png', codigo: 'unp' },
  { sigla: 'UNSCH', name: 'Universidad Nacional San Cristóbal de Huamanga', url: '/simulauna/logos/unsch.png', codigo: 'unsch' },
];

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
/*  Ilustraciones 3D nuevas (Dirección de Diseño v3) — AÚN NO GENERADAS.       */
/*  Todo <img> que las use trae onError con fallback gracioso (oculta el      */
/*  contenedor o cae a un ícono Lucide existente) para que el Landing se vea  */
/*  perfecto con y sin estos assets.                                          */
/* -------------------------------------------------------------------------- */
const ASSETS_3D = {
  // Mascota: un lobito muy estudioso (sin identidad andina en el personaje).
  mascotaLobito: '/simulauna/illustrations/mascota-lobito.png',
  cohete: '/simulauna/illustrations/cohete-despegue.png',
  // Los íconos de pasos vuelven a ser Lucide (decisión del usuario: los PNG
  // pequeños se veían mal; solo se reemplazan ilustraciones grandes).
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
/*  Asteroide lineal (línea + cráteres) — decoración alrededor de la mascota  */
/* -------------------------------------------------------------------------- */
function AsteroidLine({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.3" fill="currentColor" />
      <circle cx="15" cy="13.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="16" r="0.8" fill="currentColor" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mascota del hero — un lobito muy estudioso flotando entre asteroides.     */
/*  La imagen 3D aún no existe: si falla la carga, el componente entero se    */
/*  oculta (no placeholder feo) y la columna izquierda del hero ocupa todo   */
/*  el ancho gracias al layout flex del contenedor padre.                     */
/* -------------------------------------------------------------------------- */
function HeroMascot() {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    <div className="hidden lg:flex relative w-[380px] xl:w-[440px] h-[420px] xl:h-[460px] shrink-0 items-center justify-center">
      {/* glow detrás */}
      <div className="absolute inset-0 m-auto w-[340px] h-[340px] rounded-[45%_55%_40%_60%/55%_45%_60%_40%] bg-brand-accent/25 blur-3xl animate-blob-morph pointer-events-none" />

      {/* asteroides / estrellas lineales alrededor */}
      <StarTwinkle className="absolute top-4 left-2 text-brand-accent-300 animate-star-twinkle" size={18} />
      <StarTwinkle className="absolute bottom-16 right-2 text-white animate-star-twinkle delay-300" size={14} />
      <AsteroidLine className="absolute top-20 right-0 text-white/70 animate-float-slow delay-150" size={26} />
      <AsteroidLine className="absolute bottom-6 left-6 text-brand-accent-200/80 animate-float-y delay-500" size={20} />

      <img
        src={ASSETS_3D.mascotaLobito}
        alt="Mascota SimulaUNA: un lobito muy estudioso"
        loading="lazy"
        className="relative z-10 w-[280px] xl:w-[320px] max-h-full object-contain animate-float-y select-none drop-shadow-2xl pointer-events-none"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cohete 3D — ahora es una celda bento propia (alta, a la derecha desde     */
/*  md) dentro de .bento-stats, no un overlay absoluto. Si la imagen aún no   */
/*  existe, onError la retira y la celda .bento-cell-cohete queda vacía sin   */
/*  romper el grid (las demás celdas no dependen de su presencia).           */
/* -------------------------------------------------------------------------- */
function CoheteFloat() {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <img
      src={ASSETS_3D.cohete}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className="w-24 lg:w-32 max-h-full object-contain opacity-90 animate-float-y pointer-events-none select-none drop-shadow-2xl"
      onError={() => setBroken(true)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Ícono de paso de "Cómo funciona": Lucide siempre (los PNG pequeños se     */
/*  veían mal — decisión del usuario; los assets 3D quedan para ilustraciones */
/*  grandes).                                                                 */
/* -------------------------------------------------------------------------- */
function StepIcon({ fallback: Fallback }: { fallback: ComponentType<{ className?: string }> }) {
  return <Fallback className="w-6 h-6" />;
}

/* -------------------------------------------------------------------------- */
/*  Scroll suave a una sección por id, respetando prefers-reduced-motion      */
/* -------------------------------------------------------------------------- */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

/* -------------------------------------------------------------------------- */
/*  Landing                                                                    */
/* -------------------------------------------------------------------------- */
export function Landing() {
  const navigate = useNavigate();
  const registro = useUniversityStore(state => state.registro);
  const loadRegistro = useUniversityStore(state => state.loadRegistro);
  const registroLoading = useUniversityStore(state => state.loading);
  const registroError = useUniversityStore(state => state.error);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  // 'una' siempre navegable (compatibilidad total aunque el registro v2 no cargue aún);
  // el resto solo si aparecen en el registro maestro con estado activa|piloto.
  const registeredCodes = new Set(['una', ...registro.map(u => u.codigo)]);

  const handleWhatsAppClick = () => {
    window.open(
      'https://wa.me/51900266810?text=Hola,%20quiero%20acceso%20a%20la%20plataforma%20SimulaUNA',
      '_blank'
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF5] text-slate-800 font-sans overflow-x-hidden">
      <LandingNavbar />

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

        {/* Layer 4 — estrellas flotantes (4, distribuidas en las esquinas del hero para menor carga GPU en móvil) */}
        <StarTwinkle className="absolute top-24 left-[12%] w-3 h-3 text-brand-accent-200 animate-star-twinkle" size={12} />
        <StarTwinkle className="absolute top-16 left-[48%] w-4 h-4 text-white animate-star-twinkle delay-150" size={16} />
        <StarTwinkle className="absolute top-[55%] left-[8%] w-3 h-3 text-white/80 animate-star-twinkle delay-500" size={14} />
        <StarTwinkle className="absolute top-[28%] right-[12%] w-5 h-5 text-brand-accent-300 animate-star-twinkle delay-75" size={20} />

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

        {/* Contenido — flex (no grid): si la mascota falla al cargar, la
            columna izquierda ocupa naturalmente todo el ancho, sin huecos. */}
        <div className="relative container mx-auto px-4 sm:px-6 py-20 md:py-28 flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-14 w-full z-20">
          {/* LEFT */}
          <div className="flex-1 min-w-0 animate-fade-up">
            {/* Pill — los 3 pilares, en una línea, antes del titular */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs md:text-sm font-bold uppercase tracking-wide text-white shadow-sm">
              <GraduationCap className="w-4 h-4 text-brand-accent-300" />
              <span>Clases · Simulacros · Bancos históricos</span>
            </div>

            {/* H1 gigante — escala fluida clamp() (Misión B §1: .text-display-hero) */}
            <h1 className="mt-6 font-display text-display-hero font-black text-white drop-shadow-2xl [text-shadow:0_4px_20px_rgba(0,0,0,0.7)]">
              Prepárate
              <br />
              para la <span className="gradient-text-gold" style={{ color: '#D4AF37' }}>universidad</span>
              <br />
              <span className="italic font-display">de verdad.</span>
            </h1>

            {/* Micro-copy — universidades: TODAS, no solo una */}
            <p className="mt-3 text-white/90 font-semibold text-sm md:text-base [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
              San Marcos · UNI · UNSA · UNSAAC · UNCP · UNFV · UNA Puno · y todas las universidades del Perú.
            </p>

            {/* Selector de universidad — solo las del registro maestro (getUniversidades) */}
            {registro.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {registro.map((u) => (
                  <button
                    key={u.codigo}
                    onClick={() => navigate(`/${u.codigo}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/25 text-white text-xs font-bold hover:bg-white/20 hover:border-white/50 transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-brand-accent-300" />
                    {u.nombreCorto}
                    {u.estado === 'piloto' && (
                      <span className="text-[9px] uppercase tracking-wider text-white/70">Piloto</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Subtitle — los 3 pilares + el diferenciador (exámenes históricos reales
                de TU universidad, no solo de una). Medida de lectura: max-w-prose (~65ch). */}
            <p className="mt-6 text-white/95 font-medium text-lg md:text-xl max-w-prose leading-relaxed drop-shadow-lg [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
              Simulacros con las condiciones reales de tu examen y bancos de preguntas de años pasados,
              construidos con <strong className="text-white">los exámenes de admisión reales de tu universidad</strong>.
              El puntaje se calcula exactamente como lo hace ella. Muy pronto, también clases de calidad
              en tu Aula Virtual.{' '}
              <strong className="text-white">Gratis. Serio. Tuyo.</strong>
            </p>

            {/* Fila de stats reales */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {[
                { v: `${UNIVERSITY_LOGOS.length}`, l: 'universidades mapeadas' },
                { v: '+2,000', l: 'preguntas reales' },
                { v: '100%', l: 'gratis' },
              ].map((s) => (
                <div key={s.l} className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl md:text-3xl font-black text-brand-accent-400 [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
                    {s.v}
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-white/80 uppercase tracking-wide">
                    {s.l}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-9 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => scrollToSection('universidades')}
                  style={{ '--uni-primary': '#D4AF37' } as CSSProperties}
                  className="btn-glow shine-hover text-lg bg-brand-accent-500 text-brand-primary-900 hover:bg-brand-accent-400 min-h-[44px]"
                >
                  <GraduationCap className="w-5 h-5" />
                  Elige tu universidad
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollToSection('como-funciona')}
                  className="inline-flex items-center justify-center gap-2 bg-white/15 border-2 border-white/60 text-white font-bold hover:bg-white/30 hover:border-white backdrop-blur-sm shadow-xl rounded-full px-6 py-4 text-base transition-all min-h-[44px]"
                >
                  Ver cómo funciona
                </button>
              </div>

              {/* Atajos UNA Puno — la universidad histórica de la plataforma, disponible hoy mismo */}
              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 mb-2">
                  Atajos UNA Puno
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/simulacro-cepreuna')}
                    className="inline-flex items-center justify-center gap-1.5 bg-white/10 border border-white/25 text-white/85 font-semibold hover:bg-white/20 hover:border-white/50 hover:text-white backdrop-blur-sm rounded-lg px-3.5 py-2.5 text-xs sm:text-sm transition-all min-h-[44px]"
                  >
                    <Trophy className="w-4 h-4" />
                    Simulacro CEPREUNA
                  </button>
                  <button
                    onClick={() => navigate('/banqueo-cepreuna')}
                    className="inline-flex items-center justify-center gap-1.5 bg-white/10 border border-white/25 text-white/85 font-semibold hover:bg-white/20 hover:border-white/50 hover:text-white backdrop-blur-sm rounded-lg px-3.5 py-2.5 text-xs sm:text-sm transition-all min-h-[44px]"
                  >
                    <BookMarked className="w-4 h-4" />
                    Banqueo CEPREUNA
                  </button>
                  <button
                    onClick={() => navigate('/banqueo-tema')}
                    className="inline-flex items-center justify-center gap-1.5 bg-white/10 border border-white/25 text-white/85 font-semibold hover:bg-white/20 hover:border-white/50 hover:text-white backdrop-blur-sm rounded-lg px-3.5 py-2.5 text-xs sm:text-sm transition-all min-h-[44px]"
                  >
                    <FileText className="w-4 h-4" />
                    Banqueo por tema
                  </button>
                  <button
                    onClick={() => navigate('/banqueo')}
                    className="inline-flex items-center justify-center gap-1.5 bg-white/10 border border-white/25 text-white/85 font-semibold hover:bg-white/20 hover:border-white/50 hover:text-white backdrop-blur-sm rounded-lg px-3.5 py-2.5 text-xs sm:text-sm transition-all min-h-[44px]"
                  >
                    <Clock className="w-4 h-4" />
                    Banqueo histórico
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — mascota lobito flotando (Dirección v3 §Hero); se auto-oculta
              si la imagen 3D aún no existe (ver HeroMascot / onError). */}
          <HeroMascot />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20">
          <span className="font-mono text-[10px] text-white font-bold tracking-[0.3em] drop-shadow-lg [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">SCROLL</span>
          <ChevronDown className="w-4 h-4 text-white animate-bounce drop-shadow-lg" />
        </div>

        {/* Divisor curvo hacia la sección "Universidades disponibles" (crema) */}
        <SectionCurve fill="#fefaf3" heightClassName="h-10 md:h-20" />
      </section>

      {/* ==================================================================== */}
      {/*  1a. UNIVERSIDADES DISPONIBLES — LA propuesta de valor, justo tras el hero */}
      {/* ==================================================================== */}
      <section id="universidades" className="relative py-16 md:py-20 bg-andean-cream overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-10 animate-fade-up">
            <span
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-3"
              style={{ backgroundColor: '#F0F7FF', color: '#003D7A', border: '1px solid #B3D4F2' }}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Para todos los postulantes del Perú
            </span>
            <h2 className="font-display text-display-section font-black text-slate-900">
              Universidades disponibles
            </h2>
            <p className="mt-2 text-slate-600 text-sm md:text-base">
              Elige tu universidad objetivo y empieza a practicar hoy mismo.
            </p>
          </div>

          {registroLoading && registro.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <UniversityCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!registroLoading && registro.length === 0 && registroError && (
            <div className="max-w-md mx-auto text-center rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8">
              <p className="text-sm font-semibold text-amber-800">
                No pudimos cargar el listado de universidades por ahora.
              </p>
              <p className="mt-1 text-xs text-amber-700">
                UNA Puno sigue disponible: puedes empezar tu simulacro igual.
              </p>
              <button
                onClick={() => navigate('/una')}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors min-h-[44px]"
              >
                Ir a UNA Puno <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {registro.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto">
              {registro.map((u) => {
                const logoEntry = UNIVERSITY_LOGOS.find(l => l.codigo === u.codigo);
                return (
                  <UniversityCardRegistered
                    key={u.codigo}
                    universidad={u}
                    logoUrl={logoEntry?.url || u.logo}
                    onClick={() => navigate(`/${u.codigo}`)}
                  />
                );
              })}

              {UNIVERSITY_LOGOS.filter((l) => !registeredCodes.has(l.codigo)).map((u) => (
                <UniversityCardComingSoon
                  key={u.sigla}
                  sigla={u.sigla}
                  name={u.name}
                  logoUrl={u.url}
                  codigo={u.codigo}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  2. CÓMO FUNCIONA — bg-mesh-deep                                     */}
      {/* ==================================================================== */}
      <section id="como-funciona" className="relative py-24 md:py-28 bg-[#001f3f] bg-mesh-deep text-white overflow-hidden">
        <div className="absolute inset-0 andean-bold text-white/20 pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-accent-500/15 border border-brand-accent-400/40 text-brand-accent-300 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Proceso simple
            </span>
            <h2 className="font-display text-display-section font-black gradient-text-gold">
              4 pasos y listo
            </h2>
            <p className="mt-5 text-white/70 text-lg max-w-prose mx-auto leading-relaxed">
              Elige tu universidad, regístrate gratis, practica con los exámenes pasados de tu
              universidad y mira tu puntaje real.
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
                { n: '01', icon: GraduationCap, t: 'Elige tu universidad', d: 'Selecciona tu universidad objetivo entre las disponibles hoy — más se suman pronto.' },
                { n: '02', icon: UserPlus, t: 'Regístrate gratis', d: 'DNI, nombre y correo. Sin tarjetas ni compromisos.' },
                { n: '03', icon: Clock, t: 'Practica con exámenes pasados', d: 'Simulacro cronometrado y banqueo con preguntas de exámenes de admisión pasados de tu universidad.' },
                { n: '04', icon: TrendingUp, t: 'Mira tu puntaje real', d: 'Calculado exactamente como lo hace tu universidad, con justificaciones y PDF descargable.' },
              ].map((s, i) => {
                const delayClass = (['delay-75', 'delay-150', 'delay-300', 'delay-500'] as const)[i];
                // Ruptura del grid (patrón 5): offset vertical alterno en desktop,
                // se pierde por completo en <768px (móvil siempre plano).
                const staggerClass = i % 2 === 1 ? 'md:translate-y-6' : 'md:-translate-y-3';
                return (
                  <div key={s.n} className={`relative group animate-fade-up ${delayClass} ${staggerClass}`}>
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
                          <StepIcon fallback={s.icon} />
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

        {/* Divisor curvo hacia "Tres áreas, una meta" (blanco) */}
        <SectionCurve fill="#ffffff" flip />
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
            <h2 className="font-display text-display-section font-black text-slate-900">
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
              <Rocket className="w-3.5 h-3.5" aria-hidden="true" /> La plataforma en números
            </span>
            <h2 className="font-display text-display-section font-black">
              Hecho con <span className="italic text-brand-accent-400 gradient-text-gold">amor</span> para estudiantes preuniversitarios del Perú
            </h2>
            <p className="mt-5 text-white/80 text-base md:text-lg font-medium leading-relaxed">
              Una plataforma accesible, gratuita y rigurosa. Tu preparación merece las mejores herramientas.
            </p>
          </div>

          {/* Bento: 4 contadores + celda del cohete (alta, a la derecha desde
              md; ausente en base — patrón grid-template-areas por breakpoint,
              ver .bento-stats en index.css). */}
          <div className="bento-stats max-w-5xl mx-auto">
            {[
              { prefix: '+', v: 2000, l: 'Postulantes reales' },
              { prefix: '', v: 40, suffix: '+', l: 'Carreras' },
              { prefix: '', v: 18, l: 'Asignaturas' },
              { prefix: '', v: 1993, l: 'Examen más antiguo' },
            ].map((s, i) => (
              <div
                key={s.l}
                style={{ gridArea: `s${i + 1}` }}
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
            <div className="bento-cell-cohete">
              <CoheteFloat />
            </div>
          </div>
        </div>

        {/* Divisor curvo hacia Features (slate-50) */}
        <SectionCurve fill="#f8fafc" />
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
            <h2 className="font-display text-display-section font-black text-slate-900">
              Todo lo que necesitas <span className="gradient-text-brand italic">para destacar</span>
            </h2>
            <p className="mt-4 text-slate-600 text-base md:text-lg leading-relaxed max-w-prose mx-auto">
              Clases, simulacros y bancos históricos — los tres, construidos con los exámenes de
              admisión reales de tu universidad.
            </p>
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

          {/* Bento asimétrico: "Puntaje como el de tu universidad" es la celda
              hero protagonista (más espacio + ilustración grande), el resto
              son celdas menores. Recomposición por breakpoint vía
              grid-template-areas — ver .bento-features en index.css. */}
          <div className="bento-features max-w-6xl mx-auto">
            {[
              // Pilar Simulacros — cronómetro real, mismas condiciones de tu universidad.
              { slot: 'cronometro', icon: Clock, title: 'Cronómetro real', desc: 'Las mismas horas de tu examen de admisión. Entrénate bajo presión real.', color: 'text-brand-primary-700 bg-brand-primary-50', deco: ASSETS.examPaper },
              // Celda hero: el diferenciador — exámenes históricos reales + puntaje calculado igual que tu universidad.
              { slot: 'hero', icon: FileText, title: 'Puntaje como el de tu universidad', desc: 'Simulacros construidos con los exámenes de admisión reales de años pasados: mismas preguntas, mismos tiempos y el sistema de puntaje exacto de tu proceso.', color: 'text-rose-700 bg-rose-50', deco: ASSETS.formulas },
              // Pilar Bancos históricos — banqueo por curso y tema.
              { slot: 'justificaciones', icon: BookMarked, title: 'Banqueo por curso y tema', desc: 'Preguntas reales de exámenes pasados, organizadas por curso, tema y subtema, con la justificación completa de cada respuesta.', color: 'text-brand-accent-700 bg-brand-accent-50', deco: ASSETS.bulb },
              { slot: 'historial', icon: TrendingUp, title: 'Historial de progreso', desc: 'Mira tu evolución por asignatura, en tus simulacros y en tu práctica de banqueo.', color: 'text-emerald-700 bg-emerald-50', deco: ASSETS.calculator },
              { slot: 'pdf', icon: Award, title: 'PDF descargable', desc: 'Cada simulacro con reporte profesional y puntaje detallado, listo para imprimir.', color: 'text-brand-secondary-700 bg-brand-secondary-50', deco: ASSETS.graduation },
              // Pilar Clases — Aula Virtual, próximamente (sin prometer clases en vivo ya).
              { slot: 'gratis', icon: MonitorPlay, title: 'Aula virtual — Próximamente', desc: 'Clases de calidad por universidad, en camino. Únete a la lista de espera y entra entre los primeros.', color: 'text-slate-600 bg-slate-100', deco: ASSETS.studentSil },
            ].map((f, i) => {
              const isHero = f.slot === 'hero';
              return (
                <div
                  key={f.title}
                  style={{ gridArea: f.slot }}
                  className={`group relative h-full rounded-3xl bg-white border border-slate-100 shadow-tinted shadow-tinted-hover transition-all duration-300 overflow-hidden animate-fade-up delay-${((i % 4 + 1) * 150) as 150 | 300 | 500 | 700} ${isHero ? 'p-8 md:p-10 flex flex-col justify-center' : 'p-7'}`}
                >
                  <div className={`${isHero ? 'w-16 h-16 md:w-20 md:h-20' : 'w-14 h-14'} rounded-2xl ${f.color} flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform relative z-10`}>
                    <f.icon className={isHero ? 'w-8 h-8 md:w-10 md:h-10' : 'w-7 h-7'} />
                  </div>
                  <h3 className={`font-display font-black text-slate-900 mb-2 leading-tight relative z-10 ${isHero ? 'text-2xl md:text-3xl max-w-md' : 'text-xl'}`}>{f.title}</h3>
                  <p className={`text-slate-600 leading-relaxed relative z-10 ${isHero ? 'text-sm md:text-base max-w-md' : 'text-sm'}`}>{f.desc}</p>
                  <img
                    src={f.deco}
                    alt=""
                    aria-hidden="true"
                    className={isHero
                      ? 'absolute bottom-2 right-2 w-28 md:w-40 opacity-25 group-hover:opacity-40 transition pointer-events-none select-none'
                      : 'absolute bottom-3 right-3 w-16 opacity-20 group-hover:opacity-30 transition pointer-events-none select-none'}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*  5b. CARRUSEL DE UNIVERSIDADES — cinta social-proof                  */}
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
            <h2 className="font-display text-display-section font-black text-slate-900">
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
                {UNIVERSITY_LOGOS.concat(UNIVERSITY_LOGOS).map((u, idx) => {
                  const isRegistered = registeredCodes.has(u.codigo);
                  const Tag = isRegistered ? 'button' : 'div';
                  // Cada logo respira su color institucional real como fondo de hover/foco
                  // (mapa investigado en src/theme/universityThemes.ts), aunque todavía no
                  // esté registrado — así el catálogo completo ya anticipa su identidad.
                  const theme = getUniversityTheme(u.codigo);
                  const vars = themeCssVars(theme);
                  return (
                    <Tag
                      key={`${u.sigla}-${idx}`}
                      title={isRegistered ? u.name : `${u.name} · Próximamente`}
                      onClick={isRegistered ? () => navigate(`/${u.codigo}`) : undefined}
                      style={vars}
                      className={`uni-hover-chip flex flex-col items-center gap-2 shrink-0 rounded-2xl px-4 py-3 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 focus-visible:grayscale-0 focus-visible:opacity-100 transition-all duration-300 focus:outline-none ${
                        isRegistered ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <img
                        src={u.url}
                        alt={u.name}
                        loading="lazy"
                        className="h-16 md:h-20 w-auto object-contain select-none"
                        style={{ maxWidth: '140px' }}
                      />
                      <span className="text-[10px] md:text-xs font-bold tracking-wider text-slate-500">{u.sigla}</span>
                      {!isRegistered && (
                        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Próximamente
                        </span>
                      )}
                    </Tag>
                  );
                })}
              </div>
            </div>
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
            <h2 className="font-display text-display-section font-black gradient-text-brand">
              Historias que inspiran
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: 'María Q.',
                career: 'Ingeniería de Sistemas · UNA Puno',
                text: 'Practiqué varios meses con SimulaUNA y entré en primer puesto. Los exámenes pasados de mi universidad hicieron toda la diferencia en mi preparación.',
                photo: 'https://i.pravatar.cc/150?img=47',
              },
              {
                name: 'Diego A.',
                career: 'Ingeniería Civil · UNSA Arequipa',
                text: 'Me registré apenas vi que UNSA ya estaba disponible. El puntaje se calcula tal cual mi proceso de admisión, eso me dio confianza real.',
                photo: 'https://i.pravatar.cc/150?img=13',
              },
              {
                name: 'Rosa C.',
                career: 'Derecho · postulante a San Marcos',
                text: 'Mi universidad todavía figura como "Próximamente", pero el banqueo por tema ya me sirvió para identificar exactamente qué estudiar mientras se habilita.',
                photo: 'https://i.pravatar.cc/150?img=32',
              },
            ].map((t, i) => (
              <div
                key={t.name}
                className={`relative bg-white rounded-3xl p-7 overflow-hidden shadow-tinted shadow-tinted-hover transition-all duration-500 animate-fade-up delay-${((i + 1) * 150) as 150 | 300 | 500}`}
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

        {/* Divisor curvo hacia el CTA final (azul brand) */}
        <SectionCurve fill="#003D7A" flip />
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

          <h2 className="font-display text-display-hero font-black text-white [text-shadow:0_4px_16px_rgba(0,0,0,0.45)]">
            Tu universidad te espera a
            <br />
            <span className="italic text-brand-accent-400 gradient-text-gold">60 preguntas</span>
          </h2>

          <p className="mt-6 text-white/90 font-medium text-lg md:text-xl max-w-prose mx-auto leading-relaxed [text-shadow:0_1px_4px_rgba(0,0,0,0.4)]">
            Elige <span className="italic text-brand-accent-300">tu</span> universidad. Practica con sus exámenes
            históricos reales.{' '}
            La plataforma es tuya.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/registro')}
              style={{ '--uni-primary': '#D4AF37' } as CSSProperties}
              className="btn-glow shine-hover text-xl bg-brand-accent-500 text-brand-primary-900 font-black hover:bg-brand-accent-400"
            >
              Registrarme ahora
              <ArrowRight className="w-6 h-6" />
            </button>
            <button
              onClick={handleWhatsAppClick}
              className="inline-flex items-center justify-center gap-2 px-8 py-5 rounded-full bg-white/10 text-white font-bold border-2 border-white/30 backdrop-blur hover:bg-white/20 transition-all"
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-8 border-b border-white/10">
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
                Clases, simulacros y bancos históricos para postulantes de todas las universidades del Perú, construidos con los exámenes de admisión reales de cada una. Por y para postulantes.
              </p>
            </div>

            {/* Universidades */}
            <div>
              <p className="font-display font-bold text-white uppercase tracking-wider text-xs mb-4">Universidades</p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => navigate('/una')} className="hover:text-white transition-colors">
                    UNA Puno
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/unsa')} className="hover:text-white transition-colors">
                    UNSA Arequipa <span className="text-[10px] text-white/40 uppercase">· Beta</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('universidades')} className="hover:text-white transition-colors">
                    +10 universidades · Próximamente
                  </button>
                </li>
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <p className="font-display font-bold text-white uppercase tracking-wider text-xs mb-4">Recursos</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2.5">UNA Puno</p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => navigate('/simulacro-cepreuna')} className="hover:text-white transition-colors">
                    Simulacro CEPREUNA
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/banqueo-cepreuna')} className="hover:text-white transition-colors">
                    Banqueo CEPREUNA
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/banqueo-tema')} className="hover:text-white transition-colors">
                    Banqueo por tema
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/banqueo')} className="hover:text-white transition-colors">
                    Banqueo histórico
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/registro')} className="hover:text-white transition-colors">
                    Crear cuenta
                  </button>
                </li>
                <li>
                  <a href="https://ceprem.unap.edu.pe" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    Web oficial CEPREUNA
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
                Proyecto independiente de apoyo a los postulantes de las universidades nacionales del Perú.
              </p>
              <p className="text-xs mt-3 text-white/40">
                No afiliado oficialmente a ninguna universidad. Preguntas de exámenes públicos.
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
