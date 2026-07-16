/** Helpers de formato compartidos por los componentes del Aula (fecha/moneda en es-PE). */

export function formatFechaCorta(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export function formatFechaLarga(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatMoneda(soles: number): string {
  return `S/ ${soles.toFixed(2).replace(/\.00$/, '')}`;
}

export const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export const DIA_LABEL_CORTO: Record<string, string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
};

/** Formatea una diferencia de tiempo (ms, puede ser negativa) en un texto corto de countdown
 * para la celda "Inicio" del Aula, ej. "en 2 h 15 min", "en 3 d", "hace 10 min". */
export function formatCountdown(diffMs: number): string {
  const abs = Math.abs(diffMs);
  const minutos = Math.round(abs / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  const prefijo = diffMs >= 0 ? 'en' : 'hace';

  if (dias >= 1) return `${prefijo} ${dias} d${dias === 1 ? '' : 'ías'}`;
  if (horas >= 1) return `${prefijo} ${horas} h ${minutos % 60} min`;
  if (minutos >= 1) return `${prefijo} ${minutos} min`;
  return diffMs >= 0 ? 'en instantes' : 'recién';
}
