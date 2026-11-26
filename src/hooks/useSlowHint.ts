import { useEffect, useState } from 'react';

/** Umbrales por defecto (ms): Apps Script "en frío" suele tardar 5–15 s en responder. */
export const SLOW_HINT_DEFAULTS = { slowMs: 5000, verySlowMs: 15000 } as const;

export const SLOW_HINT_MESSAGES = {
  slow: 'Despertando el servidor, puede tardar unos segundos…',
  verySlow: 'Sigue tardando. Revisa tu conexión.',
} as const;

/**
 * Mensaje progresivo para cargas largas. Mientras `active` sea true cuenta el tiempo y
 * devuelve:
 *  - `null` los primeros 5 s (no molestar si todo va rápido),
 *  - "Despertando el servidor…" a partir de 5 s,
 *  - "Sigue tardando. Revisa tu conexión." a partir de 15 s.
 * Al pasar `active` a false se reinicia. Reutilizable en cualquier pantalla con spinner.
 */
export function useSlowHint(
  active: boolean,
  { slowMs = SLOW_HINT_DEFAULTS.slowMs, verySlowMs = SLOW_HINT_DEFAULTS.verySlowMs }: { slowMs?: number; verySlowMs?: number } = {}
): string | null {
  const [level, setLevel] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }
    const slowTimer = setTimeout(() => setLevel(1), slowMs);
    const verySlowTimer = setTimeout(() => setLevel(2), verySlowMs);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
    };
  }, [active, slowMs, verySlowMs]);

  if (!active || level === 0) return null;
  return level === 1 ? SLOW_HINT_MESSAGES.slow : SLOW_HINT_MESSAGES.verySlow;
}
