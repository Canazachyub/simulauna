import { Trophy, ArrowRight } from 'lucide-react';
import { AulaSectionCard } from './AulaSectionCard';
import { formatFechaCorta } from './aulaFormat';
import type { SimulacroCicloMock } from './aulaMock';

interface MisSimulacrosCicloProps {
  simulacros: SimulacroCicloMock[];
  cepreHref: string;
  interactive: boolean;
}

/**
 * Reusa el historial existente (CORE.historial, sin cambios de backend):
 * los intentos del alumno dentro del rango de fechas del ciclo activo
 * (docs/AULA_VIRTUAL_DISENO.md §7, sección 7).
 */
export function MisSimulacrosCiclo({ simulacros, cepreHref, interactive }: MisSimulacrosCicloProps) {
  return (
    <AulaSectionCard
      icon={Trophy}
      title="Mis simulacros del ciclo"
      action={
        interactive ? (
          <a href={cepreHref} className="text-xs font-bold flex items-center gap-1 shrink-0" style={{ color: 'var(--uni-primary-safe)' }}>
            Rendir otro
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        ) : undefined
      }
    >
      {simulacros.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no rindes ningún simulacro de este ciclo.</p>
      ) : (
        <ul className="space-y-2">
          {simulacros.map((s, i) => (
            <li key={i} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-slate-500 text-xs">{formatFechaCorta(s.fecha)}</span>
              <span className="font-bold text-slate-700">
                {s.puntaje}/{s.puntajeMax}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--uni-primary-safe)' }}>
                {s.porcentaje.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </AulaSectionCard>
  );
}

export default MisSimulacrosCiclo;
