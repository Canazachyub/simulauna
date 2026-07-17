import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { whatsappUrl } from '../../constants/contact';
import { PageHeader } from './PageHeader';
import { Mascot } from './Mascot';

interface FaqEntry {
  q: string;
  a: ReactNode;
}

const WHATSAPP_ERROR_MSG = 'Hola, encontré un error en una pregunta de SimulaUNA';
const WHATSAPP_ACCESO_MSG = 'Hola, quiero acceso ilimitado a los simulacros de SimulaUNA';

function WhatsAppLink({ mensaje, children }: { mensaje: string; children: ReactNode }) {
  return (
    <a
      href={whatsappUrl(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-brand-primary-700 underline decoration-brand-primary-200 hover:decoration-brand-primary-500 underline-offset-2"
    >
      {children}
    </a>
  );
}

const FAQS: FaqEntry[] = [
  {
    q: '¿Cómo empiezo a practicar?',
    a: 'Elige tu universidad, regístrate gratis con tus datos básicos y entra directo a tu primer simulacro o al banqueo de preguntas.',
  },
  {
    q: '¿SimulaUNA es gratis?',
    a: (
      <>
        Tu primer simulacro es gratis en cada universidad. Si quieres acceso ilimitado a
        simulacros y banqueo, coordínalo con nosotros por{' '}
        <WhatsAppLink mensaje={WHATSAPP_ACCESO_MSG}>WhatsApp</WhatsAppLink>.
      </>
    ),
  },
  {
    q: '¿De dónde salen las preguntas?',
    a: 'De exámenes de admisión públicos de años pasados de cada universidad. No son preguntas inventadas ni filtradas de un examen futuro.',
  },
  {
    q: '¿El puntaje que me sale es real?',
    a: 'Se calcula con el mismo sistema oficial que usa tu universidad para su examen de admisión, así que es una referencia lo más cercana posible a tu resultado real.',
  },
  {
    q: '¿Qué universidades están disponibles?',
    a: 'La UNA Puno está activa, la UNSA está en beta, y seguimos sumando más universidades del Perú.',
  },
  {
    q: '¿Qué es el Aula Virtual?',
    a: (
      <>
        Es nuestra plataforma de clases, todavía en construcción. Puedes unirte a la lista de
        espera de tu universidad desde la sección "Aula" y te avisamos apenas esté lista.
      </>
    ),
  },
  {
    q: '¿Cómo reporto un error en una pregunta?',
    a: (
      <>
        Escríbenos por{' '}
        <WhatsAppLink mensaje={WHATSAPP_ERROR_MSG}>WhatsApp</WhatsAppLink> con la pregunta y el
        error que encontraste. Lo revisamos y corregimos.
      </>
    ),
  },
  {
    q: '¿Necesito instalar algo?',
    a: 'No. SimulaUNA funciona directo desde tu navegador, en el celular o la computadora, sin apps ni instalaciones.',
  },
  {
    q: '¿Qué pasa con mis datos?',
    a: 'Solo pedimos tu DNI, correo y celular para crear tu cuenta y guardar tu historial de simulacros. No compartimos tus datos con terceros.',
  },
];

function FaqItem({
  entry,
  index,
  isOpen,
  onToggle,
}: {
  entry: FaqEntry;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const btnId = `faq-btn-${index}`;
  const panelId = `faq-panel-${index}`;

  return (
    <div className="border-b border-slate-200">
      <h3 className="m-0">
        <button
          type="button"
          id={btnId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-4 py-5 text-left font-display font-bold text-slate-800 hover:text-brand-primary-700 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 rounded-lg"
        >
          <span>{entry.q}</span>
          <ChevronDown
            className={`w-5 h-5 shrink-0 text-slate-400 motion-safe:transition-transform motion-safe:duration-300 ${isOpen ? 'rotate-180 text-brand-primary-700' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out ${isOpen ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">{entry.a}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Preguntas frecuentes (/preguntas-frecuentes). Acordeón accesible sin
 * librerías: <button> + aria-expanded/aria-controls, panel con
 * role="region" enlazado por aria-labelledby. Solo una pregunta abierta a
 * la vez.
 */
export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    document.title = 'Preguntas frecuentes · SimulaUNA';
  }, []);

  return (
    <div className="min-h-screen bg-andean-white">
      <PageHeader />

      <section className="relative overflow-hidden bg-[#001f3f] bg-mesh-deep text-white py-14 md:py-20">
        <div className="absolute inset-0 andean-bold text-white/15 pointer-events-none" />
        <div className="relative container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <Mascot
            src="/simulauna/illustrations/lobito-pensando.webp"
            alt="Mascota SimulaUNA: un lobito pensando"
            className="w-32 sm:w-40 mx-auto mb-5 animate-float-y drop-shadow-2xl select-none"
          />
          <h1 className="font-display text-display-hero font-black [text-shadow:0_4px_20px_rgba(0,0,0,0.35)]">
            Preguntas frecuentes
          </h1>
          <p className="mt-4 text-white/90 text-base md:text-lg max-w-prose mx-auto leading-relaxed">
            Todo lo que necesitas saber sobre SimulaUNA, sin letra chica.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          {FAQS.map((entry, i) => (
            <FaqItem
              key={entry.q}
              entry={entry}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default FAQ;
