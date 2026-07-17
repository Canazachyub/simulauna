import { useEffect } from 'react';
import { FileText, ShieldCheck, BookMarked, Users, MessageCircle } from 'lucide-react';
import { whatsappUrl } from '../../constants/contact';
import { PageHeader } from './PageHeader';

const WHATSAPP_CONTACTO_MSG = 'Hola, tengo una consulta sobre los términos y privacidad de SimulaUNA';

const SECCIONES = [
  {
    icon: FileText,
    title: 'Qué es SimulaUNA',
    text: 'SimulaUNA es una plataforma de simulacros y bancos de preguntas para postulantes a universidades públicas del Perú. También estamos construyendo un Aula Virtual con clases, todavía en desarrollo.',
  },
  {
    icon: ShieldCheck,
    title: 'Uso de tus datos',
    text: 'Pedimos tu DNI, correo y número de celular únicamente para crear tu cuenta, guardar tu historial de simulacros y contactarte si es necesario. No vendemos ni compartimos tus datos con terceros.',
  },
  {
    icon: BookMarked,
    title: 'Origen de las preguntas',
    text: 'Las preguntas de nuestros bancos provienen de exámenes de admisión públicos de años anteriores de cada universidad. No representan exámenes futuros ni tienen relación oficial con el proceso de admisión vigente.',
  },
  {
    icon: Users,
    title: 'No afiliación',
    text: 'SimulaUNA es un proyecto independiente hecho por el equipo SINAPSIS. No está afiliado oficialmente a ninguna universidad del Perú. El puntaje que calculamos es una referencia basada en el sistema oficial de cada universidad, no un resultado oficial de admisión.',
  },
];

/**
 * Términos y privacidad (/terminos). Prosa simple y honesta, sin jerga
 * legal falsa — mismo tono que el resto del sitio. No pretende ser un
 * documento redactado por un estudio de abogados.
 */
export function Terminos() {
  useEffect(() => {
    document.title = 'Términos y privacidad · SimulaUNA';
  }, []);

  return (
    <div className="min-h-screen bg-andean-white">
      <PageHeader />

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <h1 className="font-display text-display-section font-black text-slate-900 mb-3">
            Términos y privacidad
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Este documento explica en términos simples cómo funciona SimulaUNA, qué datos pedimos y
            por qué. No es un documento legal complicado — solo queremos ser claros contigo.
          </p>

          <div className="mt-10 space-y-8">
            {SECCIONES.map((s) => (
              <div key={s.title} className="flex gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-primary-50 flex items-center justify-center text-brand-primary-700">
                  <s.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-slate-800 mb-1.5">{s.title}</h2>
                  <p className="text-sm md:text-base text-slate-600 leading-relaxed">{s.text}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-primary-50 flex items-center justify-center text-brand-primary-700">
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-800 mb-1.5">Contacto</h2>
                <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                  ¿Dudas, reclamos o quieres que eliminemos tus datos? Escríbenos por{' '}
                  <a
                    href={whatsappUrl(WHATSAPP_CONTACTO_MSG)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-brand-primary-700 underline decoration-brand-primary-200 hover:decoration-brand-primary-500 underline-offset-2"
                  >
                    WhatsApp
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Terminos;
