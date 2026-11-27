/* -------------------------------------------------------------------------- */
/*  "Hecho en Perú" (sección honesta, sin cifras ni testimonios inventados)   */
/*  + CTA FINAL con el lobito y el selector de universidad.                   */
/* -------------------------------------------------------------------------- */
import { useState } from 'react';
import { FileSearch, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { whatsappUrl } from '../../constants/contact';
import { Reveal } from '../motion/motion';
import { SectionCurve } from './SectionCurve';
import { SectionHeading, UniversityPicker } from './LandingParts';
import { LANDING_ASSETS } from './landingData';

const PUNTOS = [
  {
    icon: FileSearch,
    t: 'Preguntas de exámenes públicos',
    d: 'Usamos exámenes de admisión de años pasados, no preguntas inventadas.',
  },
  {
    icon: MapPin,
    t: 'Hecho en Perú',
    d: 'Un proyecto peruano e independiente para todos los que quieren ingresar a una universidad nacional.',
  },
  {
    icon: ShieldCheck,
    t: 'Sin letra pequeña',
    d: 'Tu primer simulacro en cada universidad es gratis y no te pedimos tarjeta.',
  },
];

/*
 * TESTIMONIOS: cuando el dueño tenga testimonios REALES (con permiso escrito del
 * postulante: nombre, carrera/universidad y, si quiere, foto propia), agregarlos
 * como una sección aquí, entre <HechoEnPuno /> y <CtaFinal />. No usar avatares
 * generados ni textos de ejemplo.
 */
export function HechoEnPuno() {
  return (
    <section id="nosotros" className="relative py-14 md:py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <Reveal>
          <SectionHeading eyebrow="Quiénes somos" title="Hecho en Perú, para todos los que quieren ingresar a una universidad nacional" />
        </Reveal>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {PUNTOS.map((p, i) => (
            <Reveal as="li" key={p.t} delay={i * 90} className="rounded-3xl bg-slate-50 border border-slate-200 p-5">
              <span className="w-11 h-11 rounded-xl bg-brand-accent-100 text-brand-accent-800 flex items-center justify-center">
                <p.icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-display text-lg font-black text-slate-900 leading-tight">{p.t}</h3>
              <p className="mt-1 text-[15px] text-slate-600 leading-snug">{p.d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Mascota del CTA final: si la imagen no carga, no deja hueco. */
function CtaMascot() {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <img
      src={LANDING_ASSETS.mascotaLobito}
      alt=""
      aria-hidden="true"
      width={600}
      height={1000}
      loading="lazy"
      decoding="async"
      className="w-24 sm:w-28 lg:w-56 h-auto shrink-0 float-3d illus-3d"
      onError={() => setBroken(true)}
    />
  );
}

export function CtaFinal() {
  return (
    <section id="empezar" className="lp-navy relative pt-16 pb-16 md:pt-24 md:pb-24 text-white overflow-hidden">
      <SectionCurve fill="#fdfbf5" position="top" heightClassName="h-8 md:h-14" />
      <div className="relative z-10 container mx-auto px-4 sm:px-6 max-w-5xl flex flex-col lg:flex-row items-center gap-6 lg:gap-14">
        <CtaMascot />
        <div className="w-full max-w-md lg:max-w-lg text-center lg:text-left">
          <h2 className="font-display text-display-section font-black">
            Tu vacante empieza con un simulacro. <span className="text-brand-accent-400">El primero es gratis.</span>
          </h2>
          <p className="mt-2 text-white/85 text-base md:text-lg">
            Rinde hoy un examen con preguntas reales, mira tu puntaje oficial y descubre qué curso reforzar. Sin tarjeta y sin
            instalar nada.
          </p>
          <div className="mt-6 text-left">
            <UniversityPicker idPrefix="cta-uni" />
          </div>
          <a
            href={whatsappUrl('Hola, tengo una consulta sobre Sinapsis Preu')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-2 text-sm font-bold text-white/90 underline underline-offset-4 decoration-white/40 hover:decoration-white"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            ¿Dudas? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export default CtaFinal;
