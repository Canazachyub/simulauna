import type { CSSProperties } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getUniversityTheme, themeCssVars } from '../../theme/universityThemes';
import type { Universidad } from '../../types';

/**
 * Tarjetas de la sección "Universidades disponibles" del Landing y del
 * carrusel de logos. Cada tarjeta respira el color institucional REAL de
 * su universidad (fuente única: src/theme/universityThemes.ts) — franja
 * superior degradada (--uni-primary-safe → --uni-primary-deep) + badge de
 * logo + CTA. Las "Próximamente" usan el mismo tema, solo atenuado, para
 * anticipar la identidad sin prometer acceso todavía.
 */

interface RegisteredProps {
  universidad: Universidad;
  logoUrl: string;
  onClick: () => void;
}

export function UniversityCardRegistered({ universidad, logoUrl, onClick }: RegisteredProps) {
  const theme = getUniversityTheme(universidad.codigo, universidad.colores);
  const vars = {
    ...themeCssVars(theme),
    '--tw-ring-color': 'var(--uni-primary-soft)',
  } as CSSProperties;

  return (
    <button
      onClick={onClick}
      style={vars}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-tinted shadow-tinted-hover hover:-translate-y-1.5 transition-all duration-300 text-left focus:outline-none focus-visible:ring-4"
    >
      <div
        className="h-20 md:h-24 relative shrink-0"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
      >
        <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none" />
        {universidad.estado === 'piloto' && (
          <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-white/25 text-white border border-white/40 backdrop-blur">
            Beta
          </span>
        )}
      </div>

      {/* relative z-10: la franja de arriba es position:relative y sin esto pinta
          ENCIMA del badge del logo, recortándolo (bug reportado por el usuario). */}
      <div className="relative z-10 flex flex-col items-center flex-1 px-5 pb-5 -mt-10">
        <div className="w-20 h-20 md:w-[5.5rem] md:h-[5.5rem] rounded-2xl bg-white shadow-elevation-3 border border-slate-100 flex items-center justify-center p-2.5">
          <img src={logoUrl} alt="" aria-hidden="true" loading="lazy" className="max-h-full max-w-full object-contain" />
        </div>
        <h3 className="mt-3 font-display text-base md:text-lg font-black text-slate-900 text-center leading-tight">
          {universidad.nombreCorto}
        </h3>
        <p className="mt-1 text-[11px] md:text-xs text-slate-500 text-center leading-snug line-clamp-2">
          {universidad.nombre}
        </p>
        <span
          className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 rounded-full text-white min-h-[44px] group-hover:gap-2.5 transition-all"
          style={{ backgroundColor: 'var(--uni-primary-safe)' }}
        >
          Empezar ahora
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}

interface ComingSoonProps {
  sigla: string;
  name: string;
  logoUrl: string;
  codigo?: string;
}

export function UniversityCardComingSoon({ sigla, name, logoUrl, codigo }: ComingSoonProps) {
  const theme = getUniversityTheme(codigo);
  const vars = themeCssVars(theme) as CSSProperties;

  return (
    <div
      title={`${name} · Próximamente`}
      style={vars}
      className="relative flex flex-col overflow-hidden rounded-3xl bg-slate-50 border border-slate-100"
    >
      <div
        className="h-20 md:h-24 relative shrink-0 opacity-70"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
      />
      {/* relative z-10: sin esto la franja (position:relative) recorta el logo. */}
      <div className="relative z-10 flex flex-col items-center flex-1 px-5 pb-5 -mt-10">
        {/* El logo SIEMPRE nítido, completo y a color (el estado "próximamente" ya lo
            comunican el badge y el título gris). */}
        <div className="w-20 h-20 md:w-[5.5rem] md:h-[5.5rem] rounded-2xl bg-white shadow-elevation-3 border border-slate-200 flex items-center justify-center p-2">
          <img src={logoUrl} alt="" aria-hidden="true" loading="lazy" className="max-h-full max-w-full object-contain" />
        </div>
        <h3 className="mt-3 font-display text-base md:text-lg font-black text-slate-500 text-center leading-tight">
          {sigla}
        </h3>
        <p className="mt-1 text-[11px] text-slate-400 text-center leading-snug line-clamp-1">{name}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-full bg-slate-200 text-slate-500">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Próximamente
        </span>
      </div>
    </div>
  );
}

/** Skeleton con shimmer — misma silueta que UniversityCardRegistered, para el estado de carga del registro. */
export function UniversityCardSkeleton() {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-3xl bg-white border border-slate-100" aria-hidden="true">
      <div className="h-20 md:h-24 animate-shimmer" />
      <div className="relative z-10 flex flex-col items-center flex-1 px-5 pb-5 -mt-10">
        <div className="w-20 h-20 md:w-[5.5rem] md:h-[5.5rem] rounded-2xl bg-white shadow-elevation-1 border border-slate-100 p-2.5">
          <div className="w-full h-full rounded-lg animate-shimmer" />
        </div>
        <div className="mt-3 h-4 w-24 rounded-full animate-shimmer" />
        <div className="mt-2 h-3 w-32 rounded-full animate-shimmer" />
        <div className="mt-4 h-11 w-28 rounded-full animate-shimmer" />
      </div>
    </div>
  );
}
