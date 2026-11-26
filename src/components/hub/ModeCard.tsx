import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { TiltCard } from '../motion/motion';

export interface HubMode {
  key: string;
  title: string;
  /** Una sola línea en lenguaje simple: qué hace este modo. */
  description: string;
  illustration: string;
  /** Texto alternativo de la ilustración ('' = decorativa). */
  illustrationAlt?: string;
  cta: string;
  to: string;
  /** Chip opcional sobre el título (p. ej. "Nuevo"). */
  badge?: string;
}

interface ModeCardProps {
  mode: HubMode;
  /** Tarjeta principal (Simulacro): más grande, con el color de la universidad. */
  main?: boolean;
  /** Datos clave bajo la descripción (solo en la principal). */
  facts?: string[];
}

/**
 * Tarjeta de un modo de práctica del hub. Toda la tarjeta es un enlace (un
 * solo toque basta en el celular); el "botón" de abajo es solo visual para
 * no anidar elementos interactivos. La ilustración 3D sale del borde
 * superior y, con mouse, se separa en Z al inclinar la tarjeta (TiltCard
 * ignora el táctil, así que en el celular la tarjeta queda quieta).
 */
export function ModeCard({ mode, main = false, facts }: ModeCardProps) {
  if (main) {
    return (
      <TiltCard
        as={Link}
        to={mode.to}
        max={5}
        className="hub-mode-card hub-mode-card--main group flex flex-col h-full rounded-3xl text-white text-left p-6 sm:p-8 lg:p-9 pt-8"
        style={{ backgroundImage: 'linear-gradient(150deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
      >
        {/* Decoración recortada al borde de la tarjeta */}
        <span className="hub-card-clip" aria-hidden="true">
          <span className="absolute inset-0 andean-bold text-white/10" />
          <span
            className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-30"
            style={{ backgroundColor: 'var(--uni-secondary-safe)' }}
          />
        </span>

        <img
          src={mode.illustration}
          alt={mode.illustrationAlt ?? ''}
          width={512}
          height={512}
          loading="eager"
          decoding="async"
          className="illus-3d tilt-pop absolute -top-12 right-2 w-32 h-32 sm:-top-14 sm:right-6 sm:w-44 sm:h-44 lg:top-auto lg:-bottom-6 lg:-right-4 lg:w-64 lg:h-64"
        />

        <div className="relative pr-28 sm:pr-44 lg:pr-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/30 text-xs font-bold">
            {mode.badge ?? 'Recomendado'}
          </span>
          <h3 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.05] tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
            {mode.title}
          </h3>
        </div>
        <p className="relative mt-3 text-base sm:text-lg text-white/95 leading-relaxed max-w-md">
          {mode.description}
        </p>

        {facts && facts.length > 0 && (
          <ul className="relative mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 text-sm font-semibold">
            {facts.map((f) => (
              <li key={f} className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--uni-secondary-safe)' }} aria-hidden="true" />
                <span className="text-white">{f}</span>
              </li>
            ))}
          </ul>
        )}

        <span className="relative flex mt-auto pt-6">
          <span
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-[52px] px-7 rounded-full bg-white font-black text-base shadow-lg"
            style={{ color: 'var(--uni-primary-safe)' }}
          >
            {mode.cta}
            <ArrowRight className="hub-cta-arrow w-5 h-5" aria-hidden="true" />
          </span>
        </span>
      </TiltCard>
    );
  }

  return (
    <TiltCard
      as={Link}
      to={mode.to}
      max={7}
      className="hub-mode-card group flex flex-col h-full rounded-3xl bg-white text-left p-5 sm:p-6 pt-6"
    >
      <img
        src={mode.illustration}
        alt={mode.illustrationAlt ?? ''}
        width={512}
        height={512}
        loading="lazy"
        decoding="async"
        className="illus-3d tilt-pop absolute -top-10 right-3 w-28 h-28"
      />

      <div className="relative pr-28 min-h-[4.5rem] sm:pr-0 sm:min-h-0 sm:pt-16">
        {mode.badge && (
          <span
            className="inline-flex items-center px-2.5 py-0.5 mb-2 rounded-full text-xs font-black uppercase tracking-wide"
            style={{ backgroundColor: 'var(--uni-primary-soft)', color: 'var(--uni-primary-safe)' }}
          >
            {mode.badge}
          </span>
        )}
        <h3 className="font-display text-xl sm:text-2xl font-black leading-tight text-slate-900">
          {mode.title}
        </h3>
      </div>
      <p className="relative mt-2 text-[15px] text-slate-600 leading-relaxed">{mode.description}</p>

      <span className="relative flex mt-auto pt-5">
        <span
          className="inline-flex w-full items-center justify-center gap-2 min-h-[48px] px-5 rounded-full text-white font-bold text-base"
          style={{ backgroundColor: 'var(--uni-primary-safe)' }}
        >
          {mode.cta}
          <ArrowRight className="hub-cta-arrow w-5 h-5" aria-hidden="true" />
        </span>
      </span>
    </TiltCard>
  );
}
