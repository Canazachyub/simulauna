/* -------------------------------------------------------------------------- */
/*  CALIFICACIÓN OFICIAL — cómo califica cada universidad (datos de           */
/*  docs/configuraciones/, sacados de reglamentos y prospectos 2026).         */
/*  Es contenido citable por buscadores y asistentes de IA: mantenerlo exacto.*/
/* -------------------------------------------------------------------------- */
import { Link } from 'react-router-dom';
import { Reveal } from '../motion/motion';
import { SectionHeading } from './LandingParts';

const FILAS = [
  { codigo: 'una', nombre: 'UNA Puno', preguntas: '60', escala: '3 000', regla: 'Ponderación oficial de cada curso según tu área' },
  { codigo: 'unsa', nombre: 'UNSA', preguntas: '80', escala: '100', regla: 'Valor de cada pregunta según curso y área (matriz 2026)' },
  { codigo: 'sanmarcos', nombre: 'San Marcos', preguntas: '100', escala: '2 000', regla: '+20 por correcta, −1,125 por incorrecta' },
  { codigo: 'uni', nombre: 'UNI', preguntas: '180 (3 pruebas)', escala: '1 800', regla: 'Aptitud y Humanidades, Matemática, Física y Química' },
  { codigo: 'unt', nombre: 'UNT', preguntas: '100', escala: '407,9', regla: '+4,079 por correcta, −1,021 por incorrecta' },
  { codigo: 'unc', nombre: 'UNC', preguntas: '90', escala: '600', regla: '+8 aptitud / +6 conocimientos, −0,51 por incorrecta' },
  { codigo: 'uncp', nombre: 'UNCP', preguntas: '80', escala: '1 500', regla: 'Ponderación oficial de cada curso según tu área' },
];

export function CalificacionOficial() {
  return (
    <section id="calificacion" className="relative py-14 md:py-20 scroll-mt-16">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <Reveal>
          <SectionHeading
            eyebrow="Tu nota, como el día del examen"
            title="Cada universidad califica distinto. Nosotros también."
            subtitle="Aplicamos la tabla oficial de cada universidad: su escala, cuántas preguntas tiene y cuánto resta cada error."
          />
        </Reveal>
        <Reveal className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <caption className="sr-only">Cómo califica cada universidad en Sinapsis Preu</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Universidad</th>
                <th scope="col" className="px-4 py-3">Preguntas</th>
                <th scope="col" className="px-4 py-3">Puntaje máximo</th>
                <th scope="col" className="px-4 py-3">Cómo se calcula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FILAS.map((f) => (
                <tr key={f.codigo}>
                  <th scope="row" className="px-4 py-3 font-bold">
                    <Link to={`/${f.codigo}`} className="text-brand-primary-700 underline decoration-brand-primary-200 underline-offset-2 hover:decoration-brand-primary-600">
                      {f.nombre}
                    </Link>
                  </th>
                  <td className="px-4 py-3 text-slate-700">{f.preguntas}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{f.escala}</td>
                  <td className="px-4 py-3 text-slate-600">{f.regla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="mt-3 text-sm text-slate-500 text-center">
          Fuente: reglamentos y prospectos de admisión de cada universidad. El resultado oficial siempre lo da tu universidad.
        </p>
      </div>
    </section>
  );
}

export default CalificacionOficial;
