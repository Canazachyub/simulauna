/* -------------------------------------------------------------------------- */
/*  CÓMO FUNCIONA — 3 pasos con ilustraciones 3D y una línea de progreso que  */
/*  se dibuja con el scroll (useScrollProgress → --sp → scaleY en móvil /     */
/*  scaleX desde md). Ver .lp-steps / .lp-line-fill en landing.css.           */
/* -------------------------------------------------------------------------- */
import { ILLUSTRATIONS_3D, useScrollProgress } from '../motion/hooks';
import { Reveal } from '../motion/motion';
import { Illus3D, SectionHeading } from './LandingParts';

const PASOS = [
  {
    n: 1,
    titulo: 'Elige tu universidad',
    texto: 'Regístrate con tu DNI en un minuto. Sin tarjeta.',
    img: [ILLUSTRATIONS_3D.carnet],
  },
  {
    n: 2,
    titulo: 'Rinde tu simulacro',
    texto: 'Preguntas de exámenes pasados, con tiempo sugerido como el día del examen.',
    img: [ILLUSTRATIONS_3D.ficha, ILLUSTRATIONS_3D.simulacro],
  },
  {
    n: 3,
    titulo: 'Mira tu nota y qué reforzar',
    texto: 'Tu puntaje con la tabla de tu universidad y los cursos que debes repasar.',
    img: [ILLUSTRATIONS_3D.trofeo],
  },
];

export function ComoFunciona() {
  const stepsRef = useScrollProgress<HTMLDivElement>();

  return (
    <section id="como-funciona" className="lp-navy relative py-14 md:py-20 text-white overflow-hidden scroll-mt-16">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading dark eyebrow="Así de simple" title="Cómo funciona" subtitle="Tres pasos y ya estás practicando." />
        </Reveal>

        <div ref={stepsRef} className="lp-steps relative mt-10 md:mt-14 max-w-5xl mx-auto pl-14 md:pl-0">
          {/* Riel + trazo dorado que avanza con el scroll */}
          <div
            aria-hidden="true"
            className="absolute left-[21px] top-2 bottom-2 w-[3px] md:left-[16.66%] md:right-[16.66%] md:top-[21px] md:bottom-auto md:w-auto md:h-[3px] rounded-full bg-white/15 overflow-hidden"
          >
            <div className="lp-line-fill absolute inset-0 rounded-full bg-brand-accent-400" />
          </div>

          <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
          {PASOS.map((p, i) => (
            <Reveal as="li" key={p.n} delay={i * 120} className="relative md:flex md:flex-col md:items-center md:text-center">
              <span
                aria-hidden="true"
                className="absolute -left-14 top-0 md:static w-11 h-11 rounded-full bg-brand-accent-500 text-brand-primary-900 font-display text-xl font-black flex items-center justify-center ring-4 ring-[#001f3f]"
              >
                {p.n}
              </span>
              <div className="flex items-center gap-4 md:flex-col md:gap-2 md:mt-4">
                <Illus3D srcs={p.img} size={512} className="w-20 h-20 sm:w-24 sm:h-24 md:w-40 md:h-40 shrink-0 object-contain" />
                <div className="min-w-0">
                  <h3 className="font-display text-xl md:text-2xl font-black leading-tight">
                    <span className="sr-only">Paso {p.n}: </span>
                    {p.titulo}
                  </h3>
                  <p className="mt-1 text-[15px] text-white/85 leading-snug">{p.texto}</p>
                </div>
              </div>
            </Reveal>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default ComoFunciona;
