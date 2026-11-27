/* -------------------------------------------------------------------------- */
/*  BANQUEO MIX — la ventaja diferencial: el mismo tema con preguntas de      */
/*  otras universidades, por nivel de exigencia (decisión 2026-11-27).        */
/* -------------------------------------------------------------------------- */
import { Link } from 'react-router-dom';
import { ArrowRight, Shuffle } from 'lucide-react';
import { Reveal } from '../motion/motion';
import { SectionHeading } from './LandingParts';
import { useLandingUniversities } from './landingData';
import { LoopVideo } from './LoopVideo';

const NIVELES = [
  { nombre: 'Básico', unis: 'UNA, UNSA, UNT, UNC, UNCP', color: 'bg-emerald-500' },
  { nombre: 'Intermedio', unis: 'San Marcos', color: 'bg-brand-accent-500' },
  { nombre: 'Avanzado', unis: 'UNI', color: 'bg-brand-primary-700' },
];

export function BanqueoMix() {
  const { activaVigente } = useLandingUniversities();
  const destino = `/${activaVigente || 'una'}/banqueo-tema`;

  return (
    <section id="banqueo-mix" className="relative py-14 md:py-20 bg-white scroll-mt-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-center">
        <div>
          <Reveal>
            <SectionHeading
              className="!text-left !mx-0"
              eyebrow="Novedad"
              title="Banqueo mix: el mismo tema, de otras universidades"
              subtitle="¿Dominas Razones y proporciones con las preguntas de tu universidad? Pruébate con las de San Marcos o la UNI. Elegimos al azar preguntas del tema equivalente y las ordenamos por nivel."
            />
          </Reveal>
          <ol className="mt-7 space-y-3">
            {NIVELES.map((n, i) => (
              <Reveal as="li" key={n.nombre} delay={i * 90} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#fdfbf5] p-3.5">
                <span className={`shrink-0 w-10 h-10 rounded-xl ${n.color} text-white font-display font-black flex items-center justify-center`}>{i + 1}</span>
                <span>
                  <span className="block font-bold text-slate-900">{n.nombre}</span>
                  <span className="block text-sm text-slate-600">Preguntas de {n.unis}</span>
                </span>
              </Reveal>
            ))}
            <Reveal as="li" delay={300} className="flex items-center gap-3 rounded-2xl border border-dashed border-brand-primary-300 p-3.5">
              <Shuffle className="shrink-0 w-10 h-10 p-2 rounded-xl bg-brand-primary-50 text-brand-primary-700" aria-hidden="true" />
              <span>
                <span className="block font-bold text-slate-900">Progresivo</span>
                <span className="block text-sm text-slate-600">Empieza en básico y termina en avanzado, en una misma práctica.</span>
              </span>
            </Reveal>
          </ol>
          <Link to={destino} className="mt-7 inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-brand-primary-700 text-white font-bold hover:bg-brand-primary-800 transition-colors">
            Practicar por tema <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
          <p className="mt-2 text-sm text-slate-500">Incluido con el acceso al banqueo de cualquier universidad.</p>
        </div>
        <Reveal className="order-first lg:order-none">
          <LoopVideo
            src={`${import.meta.env.BASE_URL}videos/banqueo-mix.mp4`}
            poster={`${import.meta.env.BASE_URL}videos/banqueo-mix.webp`}
            alt="Escalera de tres niveles con hojas de examen, de básico a avanzado, y un trofeo en la cima"
            className="mx-auto w-60 sm:w-80 lg:w-full max-w-[460px] aspect-square object-cover"
          />
        </Reveal>
      </div>
    </section>
  );
}

export default BanqueoMix;
