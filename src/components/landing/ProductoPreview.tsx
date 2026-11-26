/* -------------------------------------------------------------------------- */
/*  PRODUCTO EN ACCIÓN — celular hecho en CSS con una mini vista de           */
/*  resultados (anillo + barras por curso + ficha corregida). Con el scroll   */
/*  gira de inclinado a frontal (--sp → rotateX/rotateY, ver .lp-phone). En   */
/*  móvil la rotación es mínima. Todo el contenido es un EJEMPLO ilustrativo. */
/* -------------------------------------------------------------------------- */
import { Calculator, Check, ClipboardCheck, FileDown, Target, WifiOff, X } from 'lucide-react';
import clsx from 'clsx';
import { useInView, useScrollProgress } from '../motion/hooks';
import { Reveal } from '../motion/motion';
import { CourseBars, ScoreRing, SectionHeading } from './LandingParts';

const BENEFICIOS = [
  { icon: Calculator, t: 'Puntaje calculado como en tu universidad', d: 'Con su tabla de puntajes y ponderaciones por área.' },
  { icon: ClipboardCheck, t: 'Ficha óptica corregida', d: 'Ves qué marcaste, cuál era la correcta y su justificación.' },
  { icon: Target, t: 'Qué curso reforzar', d: 'Tus resultados curso por curso, para saber qué estudiar.' },
  { icon: FileDown, t: 'PDF descargable', d: 'Guarda o imprime tu reporte de cada simulacro.' },
  { icon: WifiOff, t: 'Se guarda si se corta el internet', d: 'Tus respuestas quedan en tu celular y puedes reintentar el envío.' },
];

// Filas de ficha de ejemplo: [marcada, correcta] (null = en blanco)
const FILAS: [number | null, number][] = [[2, 2], [0, 0], [3, 1], [null, 4], [1, 1]];
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

function MiniFicha() {
  return (
    <div className="rounded-xl border border-slate-300 bg-[#FBF8EF] px-2.5 py-2">
      <p className="text-[11px] font-black tracking-wide text-slate-700">HOJA DE RESPUESTAS</p>
      <ul className="mt-1.5 space-y-1">
        {FILAS.map(([m, c], i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="w-4 text-[11px] font-bold text-slate-600 tabular-nums">{i + 1}</span>
            {LETRAS.map((l, o) => {
              const marcada = m === o;
              const ok = marcada && m === c;
              const mal = marcada && m !== c;
              const clave = !marcada && o === c && m !== c;
              return (
                <span
                  key={l}
                  className={clsx(
                    'lp-burbuja lp-burbuja--mini',
                    ok && 'lp-burbuja--ok',
                    mal && 'lp-burbuja--mal',
                    clave && 'lp-burbuja--clave',
                    !marcada && !clave && '!border-slate-400 !text-slate-500'
                  )}
                >
                  {ok ? <Check className="w-3 h-3" strokeWidth={3.5} /> : mal ? <X className="w-3 h-3" strokeWidth={3.5} /> : l}
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Celular() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative w-[268px] sm:w-[288px] rounded-[2.6rem] bg-slate-900 p-[10px] shadow-[0_40px_80px_-20px_rgba(0,25,61,0.55)]"
    >
      <div className="relative rounded-[2rem] bg-white overflow-hidden">
        {/* Muesca */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-slate-900 z-10" />
        {/* Cabecera de la app */}
        <div className="bg-brand-primary-600 text-white px-4 pt-9 pb-3">
          <p className="text-xs font-semibold opacity-90">Simulacro · Resultados</p>
          <p className="font-display text-lg font-black leading-tight">¡Buen avance!</p>
        </div>
        <div className="px-3.5 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <ScoreRing value={2160} max={3000} size={96} label="de 3000" play={inView} />
            <div className="min-w-0">
              <span className="inline-block text-[11px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                Ejemplo
              </span>
              <p className="mt-1 text-xs text-slate-600 leading-snug">Puntaje con la tabla de tu universidad</p>
            </div>
          </div>
          <CourseBars compact />
          <MiniFicha />
        </div>
      </div>
    </div>
  );
}

export function ProductoPreview() {
  const stageRef = useScrollProgress<HTMLDivElement>();

  return (
    <section id="producto" className="relative py-14 md:py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl grid lg:grid-cols-2 gap-x-16 gap-y-10 items-center">
        <Reveal className="min-w-0 lg:col-start-1 lg:row-start-1 lg:self-end">
          <SectionHeading
            className="lg:text-left lg:mx-0"
            eyebrow="Tu resultado"
            title="Termina y mira tu nota al instante"
            subtitle="No solo un número: sabrás en qué fallaste y qué estudiar después."
          />
        </Reveal>

        <div ref={stageRef} className="lp-phone-stage flex justify-center lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:py-6">
          <div className="lp-phone">
            <Celular />
          </div>
        </div>

        <ul className="space-y-4 w-full max-w-xl mx-auto lg:mx-0 lg:col-start-1 lg:row-start-2 lg:self-start">
          {BENEFICIOS.map((b, i) => (
            <Reveal as="li" key={b.t} delay={i * 70} variant="left" className="flex gap-3">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-brand-primary-50 text-brand-primary-700 flex items-center justify-center">
                <b.icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-slate-900">{b.t}</p>
                <p className="text-sm text-slate-600 leading-snug">{b.d}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default ProductoPreview;
