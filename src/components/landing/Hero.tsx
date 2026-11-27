/* -------------------------------------------------------------------------- */
/*  HERO — titular corto + selector de universidad + CTA, todo visible sin    */
/*  scroll en un celular de 360×640. El lobito se ve también en móvil         */
/*  (pequeño, al lado del titular). En desktop, escena 3D con parallax por    */
/*  scroll (solo la escena se mueve; el texto queda quieto).                  */
/*  Peso del primer pantallazo en móvil: 1 pose del lobito (~40 KB) + los     */
/*  logos de las universidades activas. Nada de fondos bg-universo.           */
/* -------------------------------------------------------------------------- */
import { CheckCircle2 } from 'lucide-react';
import { useScrollProgress, ILLUSTRATIONS_3D } from '../motion/hooks';
import { SectionCurve } from './SectionCurve';
import { Illus3D, UniversityPicker } from './LandingParts';
import { LANDING_ASSETS } from './landingData';

export function Hero() {
  const ref = useScrollProgress<HTMLElement>();

  return (
    <section ref={ref} id="inicio" className="lp-hero relative overflow-hidden text-white">
      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-5 pb-14 md:pt-12 md:pb-24 lg:pt-16 lg:pb-28 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 items-center">
        {/* ---------------- Texto + selector (no se mueve con el scroll) ---------------- */}
        <div className="min-w-0 max-w-xl">
          <div className="flex items-center gap-3">
            <h1 className="flex-1 min-w-0 font-display font-black text-[2.15rem] leading-[1.08] sm:text-5xl lg:text-6xl tracking-tight">
              Simulacros de examen de{' '}
              <span className="text-brand-accent-400">admisión</span>
            </h1>
            {/* Lobito pequeño en móvil/tablet (en desktop vive dentro de la escena) */}
            <img
              src={LANDING_ASSETS.lobitoSaludo}
              alt="Lobito, la mascota de Sinapsis Preu, saludando"
              width={600}
              height={600}
              decoding="async"
              {...({ fetchpriority: 'high' } as Record<string, string>)}
              className="lg:hidden w-[88px] h-[88px] sm:w-28 sm:h-28 shrink-0 object-contain drop-shadow-xl select-none pointer-events-none"
            />
          </div>

          <p className="mt-3 text-[15px] sm:text-lg text-white/90 leading-snug max-w-md">
            Preguntas reales de exámenes pasados de la UNA Puno, la UNSA, San Marcos, la UNT, la UNC y la UNCP, con tu
            puntaje calculado como lo hace tu universidad.
          </p>

          <div className="mt-5 max-w-md">
            <UniversityPicker idPrefix="hero-uni" showVerTodas={false} />
          </div>

          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/80">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-accent-300" aria-hidden="true" />
            Primer simulacro gratis · Sin instalar nada
          </p>
        </div>

        {/* ---------------- Escena 3D (solo desktop; lazy = no se descarga en móvil) ---------------- */}
        <div className="hidden lg:block min-w-0" aria-hidden="true">
          <div className="lp-scene max-w-[560px] mx-auto">
            <div className="lp-scene-glow" />
            {/* Una sola escena: el escritorio isométrico (antes se apilaban ficha + lobito y saturaba) */}
            <div className="absolute inset-[4%] parallax-slow">
              <Illus3D
                srcs={[ILLUSTRATIONS_3D.escritorio, ILLUSTRATIONS_3D.simulacro]}
                size={768}
                className="w-full h-full object-contain float-3d"
              />
            </div>
          </div>
        </div>
      </div>

      <SectionCurve fill="#fdfbf5" heightClassName="h-8 md:h-16" />
    </section>
  );
}

export default Hero;
