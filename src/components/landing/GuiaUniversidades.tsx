/* -------------------------------------------------------------------------- */
/*  GUÍA POR UNIVERSIDAD — contenido para personas Y buscadores: qué se puede  */
/*  practicar en cada universidad, con enlaces <a href> rastreables (Link) a   */
/*  cada página, y una guía corta para preparar el examen de admisión.         */
/*  Regla de contenido: solo cifras reales del banco (UNA ≈ 8 000 preguntas    */
/*  activas, UNSA ≈ 1 000 en beta). Las que no están activas se dicen "pronto".*/
/* -------------------------------------------------------------------------- */
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, CalendarClock, Target, TimerReset } from 'lucide-react';
import { Reveal } from '../motion/motion';
import { SectionHeading } from './LandingParts';

const enlace =
  'inline-flex items-center gap-1 min-h-[40px] font-bold text-brand-primary-700 underline underline-offset-2 decoration-brand-primary-200 hover:decoration-brand-primary-600';

const PASOS = [
  {
    icono: Target,
    titulo: 'Conoce tu examen',
    texto: 'Cuántas preguntas tiene, cuánto vale cada curso en tu área y cuánto tiempo hay. El simulacro usa esa misma estructura.',
  },
  {
    icono: TimerReset,
    titulo: 'Haz un simulacro completo',
    texto: 'Rinde con el reloj corriendo para medir tu ritmo real. Tu puntaje te dice desde dónde partes.',
  },
  {
    icono: BookOpenCheck,
    titulo: 'Refuerza por curso y tema',
    texto: 'Con el banqueo por tema practicas justo lo que fallaste, con la solución de cada pregunta.',
  },
  {
    icono: CalendarClock,
    titulo: 'Repite cada semana',
    texto: 'Un simulacro semanal y compara tu evolución en el historial hasta llegar a tu puntaje meta.',
  },
];

const PRONTO = [
  'UNAJ (Universidad Nacional de Juliaca)',
  'UNSAAC (Cusco)',
  'UNMSM (San Marcos)',
  'UNI',
  'UNCP (Huancayo)',
  'UNT (Trujillo)',
  'UNSCH (Ayacucho)',
  'UNP (Piura)',
];

export function GuiaUniversidades() {
  return (
    <section id="guia" className="relative py-14 md:py-20 bg-white scroll-mt-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <Reveal>
          <SectionHeading
            eyebrow="Por universidad"
            title="Simulacros de admisión por universidad"
            subtitle="Preguntas de exámenes de admisión pasados, ordenadas como en el examen real de cada universidad."
          />
        </Reveal>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Reveal>
            <article className="h-full rounded-3xl border border-slate-200 bg-[#fdfbf5] p-6">
              <h3 className="font-display text-2xl font-black text-slate-900">
                Simulacro de admisión UNA Puno
              </h3>
              <p className="mt-2 text-[15px] text-slate-700 leading-relaxed">
                Más de 8 000 preguntas de exámenes de admisión de la Universidad Nacional del Altiplano. Eliges tu
                área —Ingenierías, Biomédicas o Sociales—, resuelves las 60 preguntas con tiempo y recibes tu
                puntaje con la ponderación de la UNA, más la revisión pregunta por pregunta.
              </p>
              <ul className="mt-3 text-[15px] text-slate-700 space-y-0.5">
                <li><Link to="/una" className={enlace}>Simulacro de admisión UNA Puno <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link></li>
                <li><Link to="/una/cepre" className={enlace}>Simulacro y banqueo CEPREUNA por semanas</Link></li>
                <li><Link to="/una/banqueo-tema" className={enlace}>Banqueo por curso y tema</Link></li>
                <li><Link to="/una/banqueo" className={enlace}>Banqueo histórico de preguntas</Link></li>
              </ul>
            </article>
          </Reveal>

          <Reveal delay={80}>
            <article className="h-full rounded-3xl border border-slate-200 bg-[#fdfbf5] p-6">
              <h3 className="font-display text-2xl font-black text-slate-900">
                Simulacro de admisión UNSA Arequipa <span className="align-middle text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-900 text-white">Beta</span>
              </h3>
              <p className="mt-2 text-[15px] text-slate-700 leading-relaxed">
                Más de 1 000 preguntas de exámenes de admisión de la Universidad Nacional de San Agustín, con su
                clave y la revisión de cada respuesta. Estamos completando la configuración, por eso está en beta.
              </p>
              <ul className="mt-3 text-[15px] text-slate-700">
                <li><Link to="/unsa" className={enlace}>Simulacro de admisión UNSA <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link></li>
              </ul>
              <h3 className="mt-6 font-display text-lg font-black text-slate-900">Muy pronto</h3>
              <p className="mt-1 text-[15px] text-slate-700 leading-relaxed">
                Estamos preparando los simulacros de {PRONTO.join(', ')}.
              </p>
            </article>
          </Reveal>
        </div>

        <Reveal className="mt-14 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="text-center md:text-left">
            <h3 className="font-display text-2xl md:text-3xl font-black text-slate-900">
              Cómo prepararte para tu examen de admisión
            </h3>
            <p className="mt-2 text-[15px] text-slate-600 leading-relaxed max-w-xl mx-auto md:mx-0">
              Los postulantes que ingresan no solo estudian: ensayan el examen. Este es el método que proponemos,
              en cuatro pasos que puedes repetir cada semana.
            </p>
          </div>
          <img
            src={`${import.meta.env.BASE_URL}illustrations/guia-preparacion.webp`}
            alt="Escritorio de estudio con un simulacro de opción múltiple, cronómetro, libros de ciencias y un trofeo como meta"
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            className="mx-auto w-44 md:w-full max-w-[260px] h-auto drop-shadow-xl"
          />
        </Reveal>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p, i) => (
            <Reveal as="li" key={p.titulo} delay={i * 60} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p.icono className="w-7 h-7 text-brand-primary-600" aria-hidden="true" />
              <p className="mt-3 font-bold text-slate-900">{i + 1}. {p.titulo}</p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{p.texto}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default GuiaUniversidades;
