/* -------------------------------------------------------------------------- */
/*  DEMO "Prueba una pregunta ahora" — el gancho principal: sin registrarse,  */
/*  el postulante marca una burbuja (estilo ficha óptica), recibe feedback    */
/*  inmediato con la justificación y ve un ejemplo de cómo se ve su nota.     */
/*  La pregunta es ORIGINAL (escrita para esta demo, no copiada de ningún     */
/*  examen real).                                                             */
/* -------------------------------------------------------------------------- */
import { useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { Reveal } from '../motion/motion';
import { CourseBars, ScoreRing, SectionHeading } from './LandingParts';
import { LANDING_ASSETS, useLandingUniversities } from './landingData';

const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

const PREGUNTA = {
  curso: 'Razonamiento matemático',
  enunciado: '¿Qué número continúa la serie?',
  serie: '2, 6, 12, 20, 30, …',
  opciones: ['36', '40', '42', '44', '48'],
  correcta: 2,
  justificacion: 'Las diferencias crecen de 2 en 2: +4, +6, +8, +10… y la siguiente es +12. Entonces 30 + 12 = 42.',
};

export function DemoPregunta() {
  const { irASimulacro } = useLandingUniversities();
  const [marcada, setMarcada] = useState<number | null>(null);
  const respondida = marcada !== null;
  const acerto = marcada === PREGUNTA.correcta;

  return (
    <section id="demo" className="lp-cream relative py-14 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 lg:gap-14 items-center max-w-6xl">
        <Reveal className="lg:text-left">
          <SectionHeading
            className="lg:text-left lg:mx-0"
            eyebrow="Sin registrarte"
            title="Prueba una pregunta ahora"
            subtitle="Marca tu respuesta como en la ficha óptica del examen. Te decimos al instante si acertaste y por qué."
          />
          <img
            src={LANDING_ASSETS.lobitoPensando}
            alt=""
            width={600}
            height={600}
            loading="lazy"
            decoding="async"
            className="hidden lg:block mt-6 w-48 h-48 object-contain illus-3d float-3d"
          />
        </Reveal>

        <Reveal variant="zoom" delay={80}>
          <div className="rounded-3xl bg-white border border-slate-200 shadow-tinted p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex px-2.5 py-1 rounded-full bg-brand-primary-50 text-brand-primary-700 text-xs font-bold">
                {PREGUNTA.curso}
              </span>
              <span className="text-xs font-semibold text-slate-600">Pregunta de ejemplo</span>
            </div>

            <p id="demo-enunciado" className="mt-4 text-base sm:text-lg font-bold text-slate-900">
              {PREGUNTA.enunciado}
            </p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-black text-brand-primary-700 tracking-wide">
              {PREGUNTA.serie}
            </p>

            <div role="group" aria-labelledby="demo-enunciado" className="mt-4 grid gap-2 sm:grid-cols-2">
              {PREGUNTA.opciones.map((op, i) => {
                const esMarcada = marcada === i;
                const esClave = i === PREGUNTA.correcta;
                const estadoOpcion = !respondida
                  ? undefined
                  : esMarcada
                    ? (acerto ? 'ok' : 'mal')
                    : esClave ? 'clave' : undefined;
                return (
                  <button
                    key={op}
                    type="button"
                    aria-disabled={respondida}
                    aria-pressed={esMarcada}
                    aria-label={`Opción ${LETRAS[i]}: ${op}`}
                    onClick={() => { if (!respondida) setMarcada(i); }}
                    className={clsx(
                      'lp-opcion',
                      estadoOpcion === 'ok' && 'lp-opcion--ok',
                      estadoOpcion === 'mal' && 'lp-opcion--mal',
                      estadoOpcion === 'clave' && 'lp-opcion--ok'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'lp-burbuja',
                        esMarcada && 'is-marcada bubble-fill',
                        estadoOpcion === 'ok' && 'lp-burbuja--ok',
                        estadoOpcion === 'mal' && 'lp-burbuja--mal',
                        estadoOpcion === 'clave' && 'lp-burbuja--clave'
                      )}
                    >
                      {LETRAS[i]}
                    </span>
                    <span>{op}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback (se anuncia a lectores de pantalla) */}
            <div aria-live="polite">
              {respondida && (
                <div className="mt-5 animate-fade-up">
                  <div
                    className={clsx(
                      'rounded-2xl p-4 border',
                      acerto ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    )}
                  >
                    <p className={clsx('flex items-center gap-2 font-black', acerto ? 'text-emerald-800' : 'text-rose-800')}>
                      {acerto
                        ? <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                        : <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />}
                      {acerto ? '¡Correcta!' : `No esta vez. La respuesta es ${LETRAS[PREGUNTA.correcta]} (${PREGUNTA.opciones[PREGUNTA.correcta]}).`}
                    </p>
                    <p className="mt-1.5 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                      {PREGUNTA.justificacion}
                    </p>
                  </div>

                  {/* Así verás tu nota — EJEMPLO ilustrativo, no un resultado real */}
                  <div className="mt-4 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-4">
                    <ScoreRing value={2160} max={3000} size={112} label="de 3000" />
                    <div className="w-full min-w-0">
                      <p className="font-display text-lg font-black text-slate-900">Así verás tu nota</p>
                      <p className="text-xs text-slate-600 mb-2">
                        Ejemplo. En tu simulacro: tu puntaje con la tabla de tu universidad y curso por curso.
                      </p>
                      <CourseBars compact />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={irASimulacro}
                      className="inline-flex items-center justify-center gap-2 min-h-[52px] px-6 rounded-full bg-brand-primary-600 text-white font-black hover:bg-brand-primary-700 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary-300"
                    >
                      Hacer mi simulacro completo
                      <ArrowRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarcada(null)}
                      className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-full text-brand-primary-700 font-bold hover:bg-brand-primary-50 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary-200"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      Intentar otra vez
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default DemoPregunta;
