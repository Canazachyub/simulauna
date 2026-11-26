import { useEffect, useState } from 'react';
import { getConfig } from '../../services/api';
import type { ConfigV2 } from '../../types';

export type HubConfigStatus = 'loading' | 'ready' | 'error';

/**
 * Config del banco de preguntas de una universidad (getConfig), cargada en
 * perezoso para el hub: alimenta la franja de estadísticas y los datos de la
 * tarjeta de Simulacro. Si falla, el hub sigue funcionando sin esos datos.
 */
export function useHubConfig(codigo: string | undefined, proceso: string) {
  const [config, setConfig] = useState<ConfigV2 | null>(null);
  const [status, setStatus] = useState<HubConfigStatus>('loading');

  useEffect(() => {
    if (!codigo) return;
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

  return { config, status };
}

/** Minutos → "3 h", "2 h 30 min" o "45 min". Sin dato: 3 h (duración típica). */
export function formatDuracion(min: number | null | undefined): string {
  if (!min || min <= 0) return '3 h';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
