/* -------------------------------------------------------------------------- */
/*  FAQ corta del Landing (<details>/<summary> nativos: accesibles y sin JS). */
/*  Las respuestas siguen la regla real de la plataforma: el PRIMER simulacro */
/*  por universidad es gratis; no se publica precio (se consulta por WhatsApp)*/
/* -------------------------------------------------------------------------- */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { whatsappUrl } from '../../constants/contact';
import { Reveal } from '../motion/motion';
import { SectionHeading } from './LandingParts';

const linkClass =
  'font-bold text-brand-primary-700 underline underline-offset-2 decoration-brand-primary-200 hover:decoration-brand-primary-600';

const PREGUNTAS: { q: string; a: ReactNode }[] = [
  {
    q: '¿Es gratis?',
    a: (
      <>
        Tu primer simulacro en cada universidad es gratis, sin tarjeta. Si luego quieres acceso
        completo a simulacros y banqueo, consulta las opciones por{' '}
        <a
          href={whatsappUrl('Hola, quiero información sobre el acceso completo a Sinapsis Preu')}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          WhatsApp
        </a>
        .
      </>
    ),
  },
  {
    q: '¿Las preguntas son de exámenes reales?',
    a: 'Sí. Las preguntas provienen de exámenes de admisión de años pasados de cada universidad, con su clave y, en muchas, la solución explicada.',
  },
  {
    q: '¿Cómo se calcula mi puntaje?',
    a: 'Con la tabla oficial de tu universidad: su escala (por ejemplo 2 000 en San Marcos o 407,9 en la UNT), el peso de cada curso según tu área y lo que resta cada respuesta incorrecta. Es una referencia muy cercana; el resultado oficial lo da tu universidad.',
  },
  {
    q: '¿Qué es el banqueo mix?',
    a: 'Es practicar un tema con preguntas de otras universidades. Eliges el nivel: básico (UNA, UNSA, UNT, UNC, UNCP), intermedio (San Marcos), avanzado (UNI) o progresivo, que empieza fácil y termina difícil. Viene incluido con el acceso al banqueo.',
  },
  {
    q: '¿Qué universidades están disponibles?',
    a: 'Hoy puedes rendir simulacros de la UNA Puno (Universidad Nacional del Altiplano) y, en versión beta, de la UNSA (Arequipa), San Marcos (Lima), la UNT (Trujillo), la UNC (Cajamarca), la UNCP (Huancayo) y la UNI (Lima). Cada simulacro se califica con la tabla oficial de su universidad. Estamos preparando más, como la UNAJ de Juliaca y la UNSAAC del Cusco.',
  },
  {
    q: '¿Necesito instalar algo?',
    a: 'No. Funciona directo desde el navegador de tu celular, tablet o computadora.',
  },
  {
    q: '¿Funciona en mi celular?',
    a: 'Sí. Está pensado primero para celulares, incluso con datos móviles: las páginas son livianas y los botones grandes.',
  },
  {
    q: '¿Qué pasa si se me va el internet?',
    a: 'Tus respuestas se guardan en tu celular mientras rindes. Si la conexión falla al enviar, no se pierden: puedes reintentar el envío cuando vuelva.',
  },
  {
    q: '¿Hay límite de tiempo?',
    a: 'Tienes un tiempo sugerido, como el del examen real, para que practiques tu ritmo. Si te pasas, igual se califica.',
  },
  {
    q: '¿El puntaje es igual al real?',
    a: 'Se calcula con la tabla de puntajes de tu universidad, así que es una referencia muy cercana. El resultado oficial siempre lo da tu universidad el día del examen.',
  },
];

export function Faq() {
  const navigate = useNavigate();
  return (
    <section id="faq" className="lp-cream relative py-14 md:py-20 scroll-mt-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
        <Reveal>
          <SectionHeading eyebrow="Dudas frecuentes" title="Preguntas frecuentes" />
        </Reveal>
        <div className="mt-8 space-y-3">
          {PREGUNTAS.map(p => (
            <details key={p.q} className="lp-faq group rounded-2xl border border-slate-200 bg-white open:shadow-tinted open:border-brand-primary-200">
              <summary className="flex items-center justify-between gap-4 min-h-[56px] px-5 py-3 font-bold text-slate-900 text-base">
                {p.q}
                <ChevronDown className="lp-faq-icon w-5 h-5 shrink-0 text-brand-primary-600" aria-hidden="true" />
              </summary>
              <div className="px-5 pb-5 -mt-1 text-[15px] text-slate-700 leading-relaxed">{p.a}</div>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/preguntas-frecuentes')}
            className={`${linkClass} inline-flex items-center min-h-[44px] px-2`}
          >
            Ver todas las preguntas
          </button>
        </p>
      </div>
    </section>
  );
}

export default Faq;
