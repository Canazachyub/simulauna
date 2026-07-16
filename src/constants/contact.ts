/**
 * Datos de contacto únicos de SimulaUNA. Antes vivían como literales duplicados en
 * Landing.tsx, StudentForm.tsx y AulaComingSoon.tsx (mismo número, tres formatos de
 * mensaje distintos) — centralizados aquí para que cambiar el número o el formato del
 * link de wa.me sea una sola edición.
 */

/** Número de WhatsApp de soporte/contacto (formato E.164 sin '+', el que espera wa.me). */
export const WHATSAPP_NUMBER = '51900266810';

/** Arma la URL de wa.me con el mensaje pre-rellenado (encodeURIComponent se aplica aquí,
 * así que los llamadores pasan el texto plano, sin %20 ni encodeURIComponent manual). */
export function whatsappUrl(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}
