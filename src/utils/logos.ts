/**
 * Resolución de logos de universidades.
 *
 * Regla: el asset LOCAL optimizado (public/logos/<codigo>.png) SIEMPRE gana
 * cuando el código es conocido — el campo `logo` del registro maestro
 * (hoja `universidades` del CORE) puede traer rutas desactualizadas
 * (p. ej. "/logos/una.svg", sin el base /simulauna/ y con extensión
 * inexistente → 404 en consola, bug reportado por el usuario). Para
 * códigos desconocidos, se normaliza la ruta del registro anteponiendo el
 * base de Vite si viene absoluta.
 */

const CODIGOS_CON_LOGO_LOCAL = new Set([
  'una', 'unaj', 'sanmarcos', 'uni', 'unsa', 'unsaac',
  'uncp', 'unfv', 'unalm', 'unt', 'unp', 'unsch',
]);

const BASE = import.meta.env.BASE_URL; // '/simulauna/'

export function resolveLogoUrl(codigo?: string, registroLogo?: string): string {
  if (codigo && CODIGOS_CON_LOGO_LOCAL.has(codigo)) {
    return `${BASE}logos/${codigo}.png`;
  }
  if (registroLogo) {
    if (registroLogo.startsWith('http')) return registroLogo;
    if (registroLogo.startsWith(BASE)) return registroLogo;
    if (registroLogo.startsWith('/')) return BASE + registroLogo.slice(1);
    return registroLogo;
  }
  return `${BASE}logos/${codigo ?? 'una'}.png`;
}
