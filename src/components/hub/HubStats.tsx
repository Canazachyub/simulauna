import { Layers, BookOpen, ListChecks, Clock3 } from 'lucide-react';
import type { ConfigV2 } from '../../types';
import { CountUp } from '../motion/motion';
import type { HubConfigStatus } from './useHubConfig';

interface HubStatsProps {
  config: ConfigV2 | null;
  status: HubConfigStatus;
}

/**
 * Franja de estadísticas del banco de preguntas (hub de universidad). Los
 * números cuentan hacia arriba al entrar en pantalla (CountUp). Si la
 * universidad aún no tiene config publicada la franja desaparece: son datos
 * de valor agregado, no críticos para practicar.
 */
export function HubStats({ config, status }: HubStatsProps) {
  if (status === 'error') return null;

  const divisiones = config?.divisiones.length ?? 0;
  const cursos = config
    ? new Set(config.divisiones.flatMap((d) => d.subjects.map((s) => s.name))).size
    : 0;
  const preguntas = config?.escala.nPreguntasTotal ?? 0;
  const minutos = config?.escala.duracionMin ?? 0;

  const stats = [
    { icon: Layers, label: 'Áreas', value: divisiones },
    { icon: BookOpen, label: 'Cursos evaluados', value: cursos },
    { icon: ListChecks, label: 'Preguntas por simulacro', value: preguntas },
    { icon: Clock3, label: 'Minutos sugeridos', value: minutos },
  ].filter((s) => status === 'loading' || s.value > 0);

  if (stats.length === 0) return null;

  return (
    <section
      aria-label="Estadísticas del banco de preguntas"
      className="relative max-w-6xl mx-auto px-4 -mt-8 md:-mt-12 z-10"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-5 md:gap-4 rounded-3xl bg-white shadow-elevation-3 border border-slate-100 p-5 md:p-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 mb-1 min-h-[2.25rem]">
              <s.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--uni-secondary-safe)' }} aria-hidden="true" />
              {status === 'loading' ? (
                <span className="inline-block h-7 w-10 rounded-md animate-shimmer" aria-hidden="true" />
              ) : (
                <span style={{ color: 'var(--uni-primary-safe)' }}>
                  <CountUp value={s.value} className="font-display text-2xl md:text-3xl font-black" />
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm font-semibold text-slate-600 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
