import { useEffect, useState } from 'react';
import { Layers, BookOpen, ListChecks, Clock3 } from 'lucide-react';
import { getConfig } from '../../services/api';
import type { ConfigV2 } from '../../types';

interface UniversityStatsProps {
  codigo: string;
  proceso?: string;
}

/**
 * Franja de estadísticas del banco de preguntas de una universidad — carga
 * perezosa vía getConfig (no bloquea el hero ni las tarjetas de proceso).
 * Si el banco aún no tiene configuración publicada (backend v2 pendiente
 * para esa universidad) la sección desaparece sin romper el layout: son
 * datos de valor agregado, no críticos para poder practicar.
 */
export function UniversityStats({ codigo, proceso = 'ORDINARIO' }: UniversityStatsProps) {
  const [config, setConfig] = useState<ConfigV2 | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setConfig(null);
    getConfig(codigo, proceso)
      .then((cfg) => {
        if (!cancelled) {
          setConfig(cfg);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [codigo, proceso]);

  if (status === 'error') return null;

  const divisiones = config?.divisiones.length ?? 0;
  const cursos = config
    ? new Set(config.divisiones.flatMap((d) => d.subjects.map((s) => s.name))).size
    : 0;
  const preguntas = config?.escala.nPreguntasTotal ?? 0;
  const minutos = config?.escala.duracionMin ?? 0;

  const stats = [
    { icon: Layers, label: 'Áreas / divisiones', value: divisiones },
    { icon: BookOpen, label: 'Cursos evaluados', value: cursos },
    { icon: ListChecks, label: 'Preguntas por simulacro', value: preguntas },
    { icon: Clock3, label: 'Minutos cronometrados', value: minutos },
  ];

  return (
    <section
      aria-label="Estadísticas del banco de preguntas"
      className="relative max-w-5xl mx-auto px-4 -mt-8 md:-mt-12 z-10"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 rounded-2xl bg-white shadow-elevation-3 border border-slate-100 p-5 md:p-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1 min-h-[2rem]">
              <s.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--uni-secondary)' }} aria-hidden="true" />
              {status === 'loading' ? (
                <span className="inline-block h-7 w-10 rounded-md animate-shimmer" />
              ) : (
                <span
                  className="font-display text-2xl md:text-3xl font-black"
                  style={{ color: 'var(--uni-primary-safe)' }}
                >
                  {s.value.toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
