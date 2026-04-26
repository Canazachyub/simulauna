import { CheckCircle2, ArrowRight, Cpu, Stethoscope, Scale } from 'lucide-react';
import type { AreaType, Config } from '../types';
import { AREA_INFO } from '../types';

interface AreaSelectorProps {
  selectedArea: AreaType | null;
  onSelectArea: (area: AreaType) => void;
  config: Config | null;
}

const AREA_ICONS: Record<AreaType, React.ElementType> = {
  'Ingenierías': Cpu,
  'Sociales': Scale,
  'Biomédicas': Stethoscope
};

/**
 * Full-bleed dramatic area selector.
 * Each card owns its color block, texture, giant decorative SVG and reveal CTA.
 * Click handler (onSelectArea) and config API preserved verbatim.
 */
const AREA_THEME: Record<AreaType, {
  cardBg: string;
  ringHover: string;
  chipLabel: string;
}> = {
  'Ingenierías': {
    cardBg: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900',
    ringHover: 'group-hover:ring-brand-accent/40',
    chipLabel: 'Exactas'
  },
  'Biomédicas': {
    cardBg: 'bg-gradient-to-br from-rose-500 via-rose-600 to-rose-900',
    ringHover: 'group-hover:ring-brand-accent/40',
    chipLabel: 'Salud'
  },
  'Sociales': {
    cardBg: 'bg-gradient-to-br from-amber-500 via-orange-600 to-orange-800',
    ringHover: 'group-hover:ring-brand-accent/40',
    chipLabel: 'Humanidades'
  }
};

// Decorative giant SVGs (per-area theme). All absolute, pointer-events-none.
// Preserves original inline SVG as a subtle underlay, plus educational PNG/SVG assets on top.
function AreaDecorSVG({ area }: { area: AreaType }) {
  const common = 'absolute -right-10 -bottom-10 w-64 h-64 opacity-15 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none';

  if (area === 'Ingenierías') {
    return (
      <>
        <svg className={common} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="40" y="40" width="120" height="120" rx="8" />
          <circle cx="60" cy="60" r="4" fill="currentColor" />
          <circle cx="140" cy="60" r="4" fill="currentColor" />
          <circle cx="60" cy="140" r="4" fill="currentColor" />
          <circle cx="140" cy="140" r="4" fill="currentColor" />
          <path d="M60 60 L100 100 L140 60" />
          <path d="M60 140 L100 100 L140 140" />
          <path d="M100 40 L100 160" strokeDasharray="4 4" />
          <path d="M40 100 L160 100" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="14" />
        </svg>
        <img
          src="/simulauna/illustrations/calculator.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-6 -bottom-6 w-56 opacity-30 group-hover:opacity-50 transition-opacity drop-shadow-xl pointer-events-none"
        />
        <img
          src="/simulauna/illustrations/compass-geometry.svg"
          alt=""
          aria-hidden="true"
          className="absolute -left-4 top-4 w-32 opacity-25 group-hover:opacity-40 transition-opacity pointer-events-none hidden md:block"
        />
        <img
          src="/simulauna/illustrations/formulas.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-1/3 right-1/4 w-40 opacity-20 text-white pointer-events-none hidden md:block"
        />
      </>
    );
  }
  if (area === 'Biomédicas') {
    return (
      <>
        <svg className={common} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M70 20 C130 60 70 100 130 140 S70 200 70 200" />
          <path d="M130 20 C70 60 130 100 70 140 S130 200 130 200" />
          <line x1="80" y1="45" x2="120" y2="45" />
          <line x1="85" y1="70" x2="115" y2="70" />
          <line x1="80" y1="100" x2="120" y2="100" />
          <line x1="85" y1="130" x2="115" y2="130" />
          <line x1="80" y1="160" x2="120" y2="160" />
          <circle cx="100" cy="100" r="40" opacity="0.4" />
        </svg>
        <img
          src="/simulauna/illustrations/atom.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-6 -bottom-6 w-56 opacity-30 group-hover:opacity-50 transition-opacity animate-spin-slow pointer-events-none"
        />
        <img
          src="/simulauna/illustrations/lightbulb-idea.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-4 right-4 w-24 opacity-30 pointer-events-none"
        />
        <img
          src="/simulauna/illustrations/student-silhouette.svg"
          alt=""
          aria-hidden="true"
          className="absolute -left-4 bottom-1/4 w-40 opacity-20 pointer-events-none hidden md:block"
        />
      </>
    );
  }
  return (
    <>
      <svg className={common} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M60 40 L140 40 L150 60 L50 60 Z" fill="currentColor" fillOpacity="0.15" />
        <rect x="70" y="60" width="12" height="100" />
        <rect x="94" y="60" width="12" height="100" />
        <rect x="118" y="60" width="12" height="100" />
        <path d="M50 160 L150 160 L160 180 L40 180 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M70 60 L70 50 M94 60 L94 50 M118 60 L118 50" />
        <circle cx="100" cy="30" r="6" />
      </svg>
      <img
        src="/simulauna/illustrations/books-stack.svg"
        alt=""
        aria-hidden="true"
        className="absolute -right-6 -bottom-6 w-56 opacity-35 group-hover:opacity-55 transition-opacity drop-shadow-xl pointer-events-none"
      />
      <img
        src="/simulauna/illustrations/exam-paper.svg"
        alt=""
        aria-hidden="true"
        className="absolute top-6 right-6 w-32 opacity-25 pointer-events-none hidden md:block"
      />
      <img
        src="/simulauna/illustrations/graduation-cap.svg"
        alt=""
        aria-hidden="true"
        className="absolute -left-4 bottom-1/4 w-36 opacity-25 pointer-events-none hidden md:block"
      />
    </>
  );
}

export function AreaSelector({ selectedArea, onSelectArea, config }: AreaSelectorProps) {
  const areas: AreaType[] = ['Ingenierías', 'Sociales', 'Biomédicas'];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {areas.map((area, idx) => {
        const Icon = AREA_ICONS[area];
        const theme = AREA_THEME[area];
        const isSelected = selectedArea === area;
        const areaConfig = config?.[area];
        const info = AREA_INFO[area];

        const keySubjects = areaConfig?.subjects?.slice(0, 4).map((s) => s.name || String(s)) ?? [];

        return (
          <button
            key={area}
            onClick={() => onSelectArea(area)}
            style={{ animationDelay: `${idx * 120}ms` }}
            className={`
              group relative overflow-hidden rounded-3xl min-h-[480px]
              ${theme.cardBg} text-white text-left
              transition-all duration-300 cursor-pointer
              animate-[fadeUp_0.7s_ease-out_both]
              ring-2 ring-white/0 ${theme.ringHover}
              ${isSelected
                ? 'ring-4 ring-brand-accent/70 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] -translate-y-1'
                : 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.25)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] hover:-translate-y-1.5'
              }
            `}
          >
            {/* Andean texture layer */}
            <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none mix-blend-overlay" />

            {/* Noise grain */}
            <div className="absolute inset-0 noise opacity-30 pointer-events-none" />

            {/* Top-right floating star */}
            <svg
              className="absolute top-6 right-6 w-8 h-8 text-white/40 animate-star-twinkle pointer-events-none"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ animationDelay: `${idx * 200}ms` }}
            >
              <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
            </svg>

            {/* Floating small star bottom-left */}
            <svg
              className="absolute bottom-28 left-8 w-5 h-5 text-white/30 animate-star-twinkle pointer-events-none"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ animationDelay: `${idx * 200 + 400}ms` }}
            >
              <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
            </svg>

            {/* Giant decorative per-area SVG */}
            <AreaDecorSVG area={area} />

            {/* Soft radial glow */}
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-white/10 blur-3xl pointer-events-none" />

            {/* Selection check */}
            {isSelected && (
              <div className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full bg-brand-accent text-brand-primary-900 flex items-center justify-center shadow-lg animate-bounce-in">
                <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
              </div>
            )}

            {/* Content */}
            <div className="relative z-10 p-7 md:p-8 pb-24 flex flex-col h-full min-h-[480px]">
              {/* Top chip */}
              <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 text-[11px] font-bold tracking-wider uppercase text-white text-shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                {areaConfig
                  ? `${areaConfig.totalQuestions} preg · ${areaConfig.totalMaxScore.toLocaleString()} pts`
                  : '60 preg · 3000 pts máx'}
              </div>

              {/* Icon badge */}
              <div className="mt-5 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl">
                <Icon className="w-8 h-8 text-white" strokeWidth={2} />
              </div>

              {/* Title */}
              <h3 className="mt-5 font-display text-4xl md:text-[2.6rem] font-black leading-[1.02] tracking-tightest text-white text-shadow-sm">
                {area}
              </h3>
              <p className="mt-2 text-sm text-white font-medium leading-relaxed max-w-[22ch] text-shadow-sm">
                {info.description}
              </p>

              {/* Category chip */}
              <span className="mt-3 inline-flex self-start px-2.5 py-1 rounded-full bg-black/30 border border-white/25 text-[10px] font-bold tracking-widest uppercase text-white">
                {theme.chipLabel}
              </span>

              {/* Key subjects chips */}
              {keySubjects.length > 0 && (
                <div className="mt-auto pt-6 flex flex-wrap gap-1.5">
                  {keySubjects.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 text-[11px] font-semibold text-white"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reveal CTA bar */}
            <div
              className={`
                absolute left-0 right-0 bottom-0 z-20 px-6 py-4
                bg-brand-accent text-brand-primary-900 font-black text-sm
                flex items-center justify-between
                translate-y-full group-hover:translate-y-0
                ${isSelected ? 'translate-y-0' : ''}
                transition-transform duration-300 ease-out
                shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.3)]
              `}
            >
              <span className="inline-flex items-center gap-2">
                {isSelected ? 'Área seleccionada' : 'Explorar área'}
              </span>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-primary-900 text-brand-accent">
                <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </span>
            </div>
          </button>
        );
      })}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
