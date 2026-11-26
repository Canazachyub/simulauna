/* -------------------------------------------------------------------------- */
/*  Piezas reutilizadas por varias secciones del Landing.                     */
/* -------------------------------------------------------------------------- */
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import clsx from 'clsx';
import { useInView, prefersReducedMotion } from '../motion/hooks';
import { CountUp } from '../motion/motion';
import { scrollToSection, useLandingUniversities } from './landingData';

/* -------------------------------------------------------------------------- */
/*  Ilustración 3D con cadena de respaldo: si el asset nuevo (p.ej. el        */
/*  escritorio) aún no existe, cae al siguiente; si ninguno carga, no deja    */
/*  hueco.                                                                    */
/* -------------------------------------------------------------------------- */
interface Illus3DProps {
  srcs: string[];
  alt?: string;
  size: number;
  className?: string;
  eager?: boolean;
}

export function Illus3D({ srcs, alt = '', size, className, eager = false }: Illus3DProps) {
  const [i, setI] = useState(0);
  if (i >= srcs.length) return null;
  return (
    <img
      src={srcs[i]}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={size}
      height={size}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={clsx('illus-3d', className)}
      onError={() => setI(n => n + 1)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Encabezado de sección (etiqueta + h2 + bajada)                            */
/* -------------------------------------------------------------------------- */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  dark = false,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('text-center max-w-2xl mx-auto', className)}>
      <span
        className={clsx(
          'inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.16em]',
          dark
            ? 'bg-brand-accent-500/15 border border-brand-accent-400/40 text-brand-accent-200'
            : 'bg-brand-primary-50 border border-brand-primary-200 text-brand-primary-700'
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={clsx(
          'mt-3 font-display text-display-section font-black',
          dark ? 'text-white' : 'text-slate-900'
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={clsx('mt-3 text-base md:text-lg leading-relaxed', dark ? 'text-white/85' : 'text-slate-600')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Selector de universidad (chips tipo radio + CTA). Se usa en el hero y en  */
/*  el CTA final, siempre sobre fondo azul oscuro.                            */
/* -------------------------------------------------------------------------- */
export function UniversityPicker({ idPrefix, showVerTodas = true }: { idPrefix: string; showVerTodas?: boolean }) {
  const { activas, loading, activaVigente, irAUniversidad } = useLandingUniversities();
  const [elegida, setElegida] = useState<string | null>(null);
  const seleccion = elegida ?? activaVigente ?? activas[0]?.codigo ?? null;
  const uni = activas.find(u => u.codigo === seleccion);
  const labelId = `${idPrefix}-label`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p id={labelId} className="text-sm font-semibold text-white/80">
          ¿A qué universidad postulas?
        </p>
        {showVerTodas && (
          <button
            type="button"
            onClick={() => scrollToSection('universidades')}
            className="shrink-0 inline-flex items-center min-h-[44px] px-1 text-sm font-bold text-brand-accent-300 underline underline-offset-4 decoration-brand-accent-300/50 hover:decoration-brand-accent-300"
          >
            Ver todas
          </button>
        )}
      </div>

      <div role="radiogroup" aria-labelledby={labelId} className="mt-1 grid grid-cols-2 gap-2">
        {loading && activas.length === 0
          ? [0, 1].map(k => (
              <div key={k} className="h-14 rounded-2xl bg-white/10 animate-pulse" aria-hidden="true" />
            ))
          : activas.map(u => (
              <button
                key={u.codigo}
                type="button"
                role="radio"
                aria-checked={u.codigo === seleccion}
                onClick={() => setElegida(u.codigo)}
                className="lp-chip"
              >
                <img src={u.logoUrl} alt="" width={40} height={40} decoding="async" className="lp-chip-logo" />
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-tight [overflow-wrap:anywhere]">{u.nombreCorto}</span>
                  {u.estado === 'piloto' && (
                    <span className="block text-xs font-semibold opacity-80">Beta</span>
                  )}
                </span>
              </button>
            ))}
      </div>

      <button
        type="button"
        disabled={!uni}
        onClick={() => uni && irAUniversidad(uni.codigo)}
        className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-full bg-brand-accent-500 text-brand-primary-900 text-base md:text-lg font-black shadow-[0_10px_28px_rgba(212,175,55,0.35)] hover:bg-brand-accent-400 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent-300"
      >
        {uni ? `Empezar en ${uni.nombreCorto}` : 'Cargando universidades…'}
        <ArrowRight className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Anillo de puntaje animado. El trazo usa stroke-dashoffset (SVG pequeño,   */
/*  costo despreciable); el número cuenta con <CountUp>.                      */
/* -------------------------------------------------------------------------- */
export function ScoreRing({
  value,
  max,
  size = 120,
  label,
  play = true,
}: {
  value: number;
  max: number;
  size?: number;
  label: string;
  play?: boolean;
}) {
  const [on, setOn] = useState(prefersReducedMotion());
  useEffect(() => {
    if (!play) return;
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, [play]);
  const r = 44;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#003d7a"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={on && play ? c * (1 - frac) : c}
          className="lp-ring-arc"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-black text-slate-900 leading-none" style={{ fontSize: size * 0.2 }}>
          {play ? <CountUp value={value} duration={1200} /> : 0}
        </span>
        <span className="mt-0.5 text-xs font-semibold text-slate-600">{label}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Barras por curso (EJEMPLO ilustrativo, no datos de usuarios).             */
/* -------------------------------------------------------------------------- */
const EJEMPLO_CURSOS = [
  { curso: 'Razonamiento matemático', pct: 0.8 },
  { curso: 'Comunicación', pct: 0.7 },
  { curso: 'Química', pct: 0.4, reforzar: true },
];

export function CourseBars({ compact = false }: { compact?: boolean }) {
  const { ref, inView } = useInView<HTMLUListElement>(0.3);
  return (
    <ul ref={ref} className={clsx('space-y-2', inView && 'lp-bars-on')}>
      {EJEMPLO_CURSOS.map(c => (
        <li key={c.curso}>
          <div className={clsx('flex items-center justify-between gap-2 font-semibold text-slate-700', compact ? 'text-xs' : 'text-sm')}>
            <span className="truncate">{c.curso}</span>
            {c.reforzar ? (
              <span className="shrink-0 text-xs font-bold text-rose-700">Refuerza</span>
            ) : (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            )}
          </div>
          <div className={clsx('mt-1 rounded-full bg-slate-100 overflow-hidden', compact ? 'h-1.5' : 'h-2')}>
            <div
              className={clsx('lp-bar-fill h-full w-full rounded-full', c.reforzar ? 'bg-rose-500' : 'bg-brand-primary-600')}
              style={{ ['--w' as string]: c.pct }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
