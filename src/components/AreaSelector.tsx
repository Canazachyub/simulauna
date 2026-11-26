import { CheckCircle2, Cpu, Stethoscope, Scale, GraduationCap } from 'lucide-react';
import type { Division } from '../types';

interface AreaSelectorProps {
  selectedArea: string | null;
  onSelectArea: (division: string) => void;
  /** Divisiones dinámicas de getConfig(universidad).divisiones — ya no un union fijo de 3 áreas */
  divisions: Division[];
}

// Ícono y tinte asignados por índice (ciclo de 3), no por nombre fijo de área — así funciona
// para cualquier universidad/división sin importar cuántas o cómo se llamen. El tinte es solo
// para el ícono; el texto va siempre oscuro sobre blanco (contraste AA).
const AREA_ICONS: React.ElementType[] = [Cpu, Stethoscope, Scale];

/** Ícono por palabra clave del nombre del área; si no hay coincidencia, cae al ciclo por índice. */
function iconIndexFor(nombre: string, idx: number): number {
  const n = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/ingenier|ciencias (basicas|exactas)|tecnolog/.test(n)) return 0;
  if (/biomed|salud|medic|ciencias de la vida/.test(n)) return 1;
  if (/social|human|letras|econom|empresa|derecho/.test(n)) return 2;
  return idx % AREA_ICONS.length;
}
const AREA_TINT: string[] = [
  'bg-blue-100 text-blue-800',
  'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-900',
];

/**
 * Selector de área (paso 2 del registro). Tarjetas compactas y claras: en celular cada
 * área es una fila (ícono + nombre + cursos) para no obligar a hacer scroll entre
 * tarjetas gigantes; desde ≥768 se ven como tarjetas en columnas. La selección se marca
 * con el color de la universidad, un check y aria-pressed.
 */
export function AreaSelector({ selectedArea, onSelectArea, divisions }: AreaSelectorProps) {
  const cols = divisions.length >= 3 ? 'md:grid-cols-3' : divisions.length === 2 ? 'md:grid-cols-2' : '';
  return (
    <div className={`grid gap-3 md:gap-4 ${cols}`}>
      {divisions.map((division, idx) => {
        const themeIndex = iconIndexFor(division.nombre, idx);
        const Icon = AREA_ICONS[themeIndex] || GraduationCap;
        const isSelected = selectedArea === division.codigo;
        const keySubjects = division.subjects.slice(0, 4).map((s) => s.name);
        const moreSubjects = division.subjects.length - keySubjects.length;

        return (
          <button
            type="button"
            key={division.codigo}
            onClick={() => onSelectArea(division.codigo)}
            aria-pressed={isSelected}
            className={`group relative w-full min-h-[48px] text-left rounded-2xl border-2 p-4 md:p-5 transition-[border-color,background-color,box-shadow,transform] duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--uni-primary-soft)] motion-safe:hover:-translate-y-0.5 ${
              isSelected
                ? 'shadow-lg'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
            }`}
            style={isSelected
              ? { borderColor: 'var(--uni-primary-safe)', backgroundColor: 'var(--uni-primary-soft)' }
              : undefined}
          >
            <div className="flex items-start gap-3 md:flex-col md:gap-4">
              <span className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 ${AREA_TINT[themeIndex]}`}>
                <Icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2} aria-hidden="true" />
              </span>

              <span className="flex-1 min-w-0 pr-8 md:pr-0">
                <span className="block font-display text-lg md:text-2xl font-black leading-tight text-slate-900 break-words">
                  {division.nombre}
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-600">
                  {`${division.totalQuestions} preguntas · ${Math.round(division.totalMaxScore).toLocaleString()} pts`}
                </span>

                {keySubjects.length > 0 && (
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {keySubjects.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                    {moreSubjects > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600">
                        +{moreSubjects} más
                      </span>
                    )}
                  </span>
                )}
              </span>
            </div>

            {/* Indicador de selección: círculo vacío → check con el color de la universidad */}
            <span
              className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isSelected ? 'text-white' : 'border-2 border-slate-300 bg-white'
              }`}
              style={isSelected ? { backgroundColor: 'var(--uni-primary-safe)' } : undefined}
              aria-hidden="true"
            >
              {isSelected && <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
