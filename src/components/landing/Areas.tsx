/* -------------------------------------------------------------------------- */
/*  ÁREAS — Ingenierías / Biomédicas / Sociales con sus ilustraciones 3D.     */
/*  Degradados oscurecidos para que el texto blanco cumpla AA en toda la      */
/*  tarjeta (antes Sociales partía de amber-500, sin contraste suficiente).   */
/* -------------------------------------------------------------------------- */
import { ArrowRight, Cog, HeartPulse, Landmark } from 'lucide-react';
import { Reveal, TiltCard } from '../motion/motion';
import { SectionHeading } from './LandingParts';
import { LANDING_ASSETS, useLandingUniversities } from './landingData';

const AREAS = [
  {
    nombre: 'Ingenierías',
    icon: Cog,
    gradient: 'from-blue-800 to-[#00193D]',
    tagline: 'Cálculo y ciencias exactas',
    cursos: ['Matemática', 'Física', 'Química'],
    img: LANDING_ASSETS.areaIngenierias,
  },
  {
    nombre: 'Biomédicas',
    icon: HeartPulse,
    gradient: 'from-rose-700 to-rose-950',
    tagline: 'Ciencias de la vida',
    cursos: ['Biología', 'Química', 'Anatomía'],
    img: LANDING_ASSETS.areaBiomedicas,
  },
  {
    nombre: 'Sociales',
    icon: Landmark,
    gradient: 'from-orange-800 to-amber-950',
    tagline: 'Humanidades y gestión',
    cursos: ['Historia', 'Economía', 'Comunicación'],
    img: LANDING_ASSETS.areaSociales,
  },
];

export function Areas() {
  const { irASimulacro } = useLandingUniversities();

  return (
    <section id="areas" className="lp-cream relative py-14 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Áreas académicas"
            title="Practica según tu área"
            subtitle="Cada área tiene sus cursos y su peso en el puntaje. Te preparas para la tuya."
          />
        </Reveal>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto">
          {AREAS.map((a, i) => (
            <Reveal key={a.nombre} delay={i * 100}>
              <TiltCard
                as="button"
                type="button"
                onClick={irASimulacro}
                className={`group relative w-full overflow-hidden rounded-3xl p-6 md:p-7 min-h-[300px] md:min-h-[380px] text-left text-white bg-gradient-to-br ${a.gradient} shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-accent-300`}
              >
                <img
                  src={a.img}
                  alt=""
                  width={600}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="illus-3d absolute -right-8 -bottom-8 w-52 md:w-60 opacity-90 group-hover:scale-105 transition-transform duration-500"
                />
                <a.icon className="absolute top-6 right-6 w-14 h-14 text-white/20" aria-hidden="true" />

                <div className="relative z-10 flex flex-col h-full min-h-[252px] md:min-h-[324px]">
                  <span className="self-start px-2.5 py-1 rounded-full bg-black/25 border border-white/30 text-xs font-bold uppercase tracking-wider">
                    {a.tagline}
                  </span>
                  <h3 className="mt-5 font-display text-3xl xl:text-4xl font-black leading-tight [overflow-wrap:anywhere]">{a.nombre}</h3>
                  <ul className="mt-4 flex flex-wrap gap-2 max-w-[75%]">
                    {a.cursos.map(c => (
                      <li key={c} className="px-3 py-1.5 rounded-full bg-black/25 border border-white/25 text-sm font-semibold">
                        {c}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-sm font-bold">
                    Practicar
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </span>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Areas;
