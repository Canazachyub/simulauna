/* -------------------------------------------------------------------------- */
/*  CIFRAS + VENTAJAS — lo que la plataforma ya hace hoy, con cifras REALES   */
/*  del banco (2026-11-27). Regla de contenido: nada inventado; si una cifra  */
/*  cambia, actualizarla aquí (sale de BANCO_APP\exportar_banco_general.py).  */
/* -------------------------------------------------------------------------- */
import {
  BadgeCheck, BookOpenCheck, FileDown, Layers, LineChart, ListChecks, Shuffle, Smartphone,
} from 'lucide-react';
import { Reveal } from '../motion/motion';
import { SectionHeading } from './LandingParts';

const CIFRAS = [
  { valor: '18 000+', etiqueta: 'preguntas reales con clave y solución' },
  { valor: '7', etiqueta: 'universidades del Perú' },
  { valor: '1996–2025', etiqueta: 'exámenes de admisión' },
  { valor: 'Gratis', etiqueta: 'tu primer simulacro en cada universidad' },
];

const VENTAJAS = [
  {
    icono: BadgeCheck,
    titulo: 'Calificación oficial',
    texto: 'Tu puntaje se calcula con la tabla de tu universidad: la escala, el peso de cada curso y lo que resta cada error.',
  },
  {
    icono: ListChecks,
    titulo: 'Preguntas de exámenes reales',
    texto: 'Nada de preguntas inventadas: son de exámenes de admisión pasados, con su clave y la solución explicada.',
  },
  {
    icono: BookOpenCheck,
    titulo: 'Banqueo por curso y por tema',
    texto: 'Practica solo el curso o el tema que te cuesta, con la respuesta y la justificación al instante.',
  },
  {
    icono: Shuffle,
    titulo: 'Banqueo mix por niveles',
    texto: 'El mismo tema con preguntas de otras universidades: básico, intermedio (San Marcos), avanzado (UNI) o progresivo.',
  },
  {
    icono: LineChart,
    titulo: 'Tu avance en el historial',
    texto: 'Cada simulacro queda guardado para que compares tu puntaje semana a semana.',
  },
  {
    icono: FileDown,
    titulo: 'Resultado en PDF',
    texto: 'Descarga tu ficha de resultados con el puntaje por curso para revisarla con tu profesor.',
  },
  {
    icono: Layers,
    titulo: 'CEPREUNA por semanas',
    texto: 'Para la UNA Puno: simulacros y banqueo ordenados por semana y curso, como en el ciclo.',
  },
  {
    icono: Smartphone,
    titulo: 'Hecho para tu celular',
    texto: 'Liviano con datos móviles. Si se va el internet, tus respuestas no se pierden.',
  },
];

export function Cifras() {
  return (
    <section aria-label="Sinapsis Preu en cifras" className="relative -mt-2 pb-4">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {CIFRAS.map((c, i) => (
            <Reveal key={c.etiqueta} delay={i * 60} className="rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-4 text-center">
              <dt className="sr-only">{c.etiqueta}</dt>
              <dd>
                <span className="block font-display text-2xl md:text-3xl font-black text-brand-primary-700 leading-none">{c.valor}</span>
                <span className="block mt-1.5 text-[13px] text-slate-600 leading-snug">{c.etiqueta}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function Ventajas() {
  return (
    <section id="ventajas" className="relative py-14 md:py-20 scroll-mt-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <Reveal>
          <SectionHeading
            eyebrow="Todo en un solo lugar"
            title="Todo lo que necesitas para ingresar"
            subtitle="Simulacros con la nota de tu universidad, práctica enfocada y tu avance a la vista."
          />
        </Reveal>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VENTAJAS.map((v, i) => (
            <Reveal as="li" key={v.titulo} delay={(i % 4) * 70} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <span className="inline-flex w-11 h-11 rounded-xl bg-brand-primary-50 text-brand-primary-700 items-center justify-center">
                <v.icono className="w-6 h-6" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-display text-lg font-bold text-slate-900">{v.titulo}</h3>
              <p className="mt-1 text-[15px] text-slate-600 leading-relaxed">{v.texto}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
