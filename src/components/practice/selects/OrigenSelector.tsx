import { Building2, Shuffle, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import type { ModoBanqueo, NivelMix, ResumenGeneral } from '../../../services/api';

const NIVELES: { valor: NivelMix; titulo: string; detalle: string }[] = [
  { valor: 'progresivo', titulo: 'Progresivo', detalle: 'Empieza fácil y sube' },
  { valor: 'basico', titulo: 'Básico', detalle: 'UNA, UNSA, UNT, UNC, UNCP' },
  { valor: 'intermedio', titulo: 'Intermedio', detalle: 'San Marcos' },
  { valor: 'avanzado', titulo: 'Avanzado', detalle: 'UNI' },
];

/**
 * Modalidad del banqueo:
 *  - «Mi universidad»: solo preguntas de la universidad seleccionada.
 *  - «Mix»: preguntas al azar de las OTRAS universidades, del tema equivalente, por nivel de exigencia
 *    de la universidad (Básico / Intermedio / Avanzado) o progresivo (de fácil a difícil).
 */
export function ModalidadBanqueo({
  modo, onModo, nivel, onNivel, universidad, universidades,
}: {
  modo: ModoBanqueo;
  onModo: (m: ModoBanqueo) => void;
  nivel: NivelMix;
  onNivel: (n: NivelMix) => void;
  universidad: string;
  universidades: ResumenGeneral['universidades'];
}) {
  const mia = universidades.find((u) => u.codigo === universidad);
  const otras = universidades.filter((u) => u.codigo !== universidad);
  const totalOtras = otras.reduce((a, u) => a + u.totalPreguntas, 0);

  const tarjeta = (activo: boolean) => clsx(
    'flex-1 min-w-[200px] text-left rounded-2xl border-2 p-4 transition-all',
    activo ? 'border-brand-primary bg-brand-primary-50/60 ring-4 ring-brand-primary/15 shadow-elevation-2'
      : 'border-slate-200 bg-white hover:border-brand-primary/40'
  );

  return (
    <div className="mb-6 animate-fade-up">
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Modalidad del banqueo">
        {mia && (
          <button type="button" role="radio" aria-checked={modo === 'mio'} onClick={() => onModo('mio')} className={tarjeta(modo === 'mio')}>
            <span className="flex items-center gap-2 font-display font-bold text-slate-800">
              <Building2 className="w-5 h-5 text-brand-primary-600" aria-hidden="true" />
              Solo {mia.nombre}
            </span>
            <span className="block mt-1 text-sm text-slate-600 font-sans">
              {mia.totalPreguntas.toLocaleString('es-PE')} preguntas de exámenes de tu universidad.
            </span>
          </button>
        )}
        <button type="button" role="radio" aria-checked={modo === 'mix'} onClick={() => onModo('mix')} className={tarjeta(modo === 'mix')}>
          <span className="flex items-center gap-2 font-display font-bold text-slate-800">
            <Shuffle className="w-5 h-5 text-brand-accent-600" aria-hidden="true" />
            Banqueo mix
          </span>
          <span className="block mt-1 text-sm text-slate-600 font-sans">
            {totalOtras.toLocaleString('es-PE')} preguntas del mismo tema de otras universidades, por nivel de dificultad.
          </span>
        </button>
      </div>

      {modo === 'mix' && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 font-sans mb-2">
            <TrendingUp className="w-4 h-4 text-brand-accent-600" aria-hidden="true" />
            Nivel (según la exigencia del examen de cada universidad)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Nivel del banqueo mix">
            {NIVELES.map((n) => {
              const activo = nivel === n.valor;
              return (
                <button
                  key={n.valor}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => onNivel(n.valor)}
                  className={clsx(
                    'min-h-[56px] rounded-xl border px-3 py-2 text-left transition-colors',
                    activo ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white border-slate-200 hover:border-brand-primary/50'
                  )}
                >
                  <span className="block font-bold text-sm">{n.titulo}</span>
                  <span className={clsx('block text-xs', activo ? 'text-white/80' : 'text-slate-500')}>{n.detalle}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
