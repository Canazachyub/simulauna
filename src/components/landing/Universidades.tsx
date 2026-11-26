/* -------------------------------------------------------------------------- */
/*  UNIVERSIDADES — las activas del registro maestro (getUniversidades) como  */
/*  tarjetas grandes; las que aún no están, en una franja compacta de logos   */
/*  "Llegan pronto" (sin la pared gris de tarjetas "Próximamente").           */
/* -------------------------------------------------------------------------- */
import type { CSSProperties } from 'react';
import { ArrowRight, BellRing } from 'lucide-react';
import clsx from 'clsx';
import { Reveal, TiltCard } from '../motion/motion';
import { getUniversityTheme, themeCssVars } from '../../theme/universityThemes';
import { whatsappUrl } from '../../constants/contact';
import { UniversityCardSkeleton } from './UniversityCards';
import { SectionHeading } from './LandingParts';
import { useLandingUniversities, type UniActiva } from './landingData';

function TarjetaActiva({ u, onClick }: { u: UniActiva; onClick: () => void }) {
  const vars = themeCssVars(getUniversityTheme(u.codigo, u.colores)) as CSSProperties;
  return (
    <TiltCard
      as="button"
      type="button"
      onClick={onClick}
      style={vars}
      max={6}
      className="group w-full flex flex-col overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-tinted text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary-300"
    >
      <div
        className="h-20 md:h-24 relative"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--uni-primary-safe) 0%, var(--uni-primary-deep) 100%)' }}
      >
        <span className="absolute top-3 right-3 text-xs font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-white text-slate-900">
          {u.estado === 'piloto' ? 'Beta' : 'Disponible'}
        </span>
      </div>
      <div className="relative z-10 flex items-end gap-4 px-5 -mt-10">
        <div className="w-20 h-20 rounded-2xl bg-white shadow-elevation-3 border border-slate-100 flex items-center justify-center p-2 shrink-0">
          <img src={u.logoUrl} alt="" width={64} height={64} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
        </div>
      </div>
      <div className="px-5 pt-3 pb-5 flex flex-col flex-1">
        <h3 className="font-display text-2xl font-black text-slate-900 leading-tight">{u.nombreCorto}</h3>
        <p className="mt-1 text-sm text-slate-600 leading-snug">{u.nombre}</p>
        <span
          className="mt-4 self-start inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full text-sm font-bold text-white group-hover:gap-2.5 transition-all"
          style={{ backgroundColor: 'var(--uni-primary-safe)' }}
        >
          Empezar ahora
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </span>
      </div>
    </TiltCard>
  );
}

export function Universidades() {
  const { activas, proximas, loading, error, irAUniversidad } = useLandingUniversities();
  const columnas = activas.length >= 3 ? 'lg:grid-cols-3 max-w-5xl' : 'max-w-3xl';

  return (
    <section id="universidades" className="relative py-14 md:py-20 bg-white scroll-mt-16">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Universidades"
            title="Elige tu universidad"
            subtitle="Cada una con sus propios exámenes pasados y su forma de calcular el puntaje."
          />
        </Reveal>

        {error && (
          <p className="mt-6 max-w-md mx-auto text-center text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            No pudimos cargar todas las universidades ahora. UNA Puno sigue disponible.
          </p>
        )}

        <div className={clsx('mt-8 grid gap-4 md:gap-6 sm:grid-cols-2 mx-auto', columnas)}>
          {loading
            ? [0, 1].map(k => <UniversityCardSkeleton key={k} />)
            : activas.map((u, i) => (
                <Reveal key={u.codigo} delay={i * 80}>
                  <TarjetaActiva u={u} onClick={() => irAUniversidad(u.codigo)} />
                </Reveal>
              ))}
        </div>

        {proximas.length > 0 && (
          <Reveal className="mt-10 max-w-5xl mx-auto">
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5 md:p-7">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-black text-slate-900">Llegan pronto</h3>
                  <p className="text-sm text-slate-600">Estamos preparando más universidades del Perú.</p>
                </div>
                <a
                  href={whatsappUrl('Hola, quiero que me avisen cuando SimulaUNA tenga mi universidad: ')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start md:self-auto inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-white border-2 border-emerald-600 text-emerald-800 text-sm font-bold hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                >
                  <BellRing className="w-4 h-4" aria-hidden="true" />
                  Avísame cuando esté la mía
                </a>
              </div>
              <ul className="mt-5 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-x-2 gap-y-4">
                {proximas.map(u => (
                  <li key={u.codigo} className="flex flex-col items-center gap-1.5 text-center" title={u.name}>
                    <img
                      src={u.logoUrl}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                      decoding="async"
                      className="w-11 h-11 object-contain grayscale opacity-70"
                    />
                    <span className="text-xs font-bold text-slate-600">{u.sigla}</span>
                    <span className="sr-only">{u.name}, próximamente</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

export default Universidades;
