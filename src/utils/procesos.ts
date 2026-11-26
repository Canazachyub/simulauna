import type { ProcessType, Universidad } from '../types';

export interface ProcessOption {
  type: ProcessType;
  label: string;
}

/**
 * Procesos que el registro ofrece en cada universidad.
 * - UNA conserva sus tres botones de siempre (CEPREUNA / GENERAL / EXTRAORDINARIO).
 * - Las demás muestran SOLO lo que su fila del registro maestro declara en `procesos`
 *   (piloto: solo ORDINARIO). Así nadie elige un proceso que esa universidad no tiene.
 *   ORDINARIO viaja como 'GENERAL' y CEPRE como 'CEPREUNA' (useExam los traduce al backend).
 */
export function processOptionsFor(universidad: string, entry?: Universidad): ProcessOption[] {
  if (universidad === 'una') {
    return [
      { type: 'CEPREUNA', label: 'CEPREUNA' },
      { type: 'GENERAL', label: 'GENERAL' },
      { type: 'EXTRAORDINARIO', label: 'EXTRAORDINARIO' },
    ];
  }
  const procesos = (entry?.procesos ?? []).map((p) => String(p).trim().toUpperCase());
  const options: ProcessOption[] = [{ type: 'GENERAL', label: 'Ordinario' }];
  if (procesos.includes('CEPRE')) options.push({ type: 'CEPREUNA', label: entry?.cepreNombre || 'CEPRE' });
  return options;
}

/** Nombre del proceso para mostrar (en UNA, tal cual; en las demás, con su nombre real). */
export function processLabel(type: ProcessType, universidad: string, entry?: Universidad): string {
  return processOptionsFor(universidad, entry).find((o) => o.type === type)?.label ?? type;
}
