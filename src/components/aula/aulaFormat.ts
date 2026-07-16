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
