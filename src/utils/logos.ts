/**
 * Resolución de logos de universidades.
 *
 * Regla: el asset LOCAL optimizado (public/logos/<codigo>.webp, ≤256px) SIEMPRE gana
 * cuando el código es conocido — el campo `logo` del registro maestro
 * (hoja `universidades` del CORE) puede traer rutas desactualizadas
 * (p. ej. "/logos/una.svg", sin el base / y con extensión
 * inexistente → 404 en consola, bug reportado por el usuario). Para
 * códigos desconocidos, se normaliza la ruta del registro anteponiendo el
 * base de Vite si viene absoluta.
 *
 * Los PNG originales siguen en public/logos/ (el CORE/backend los referencia
 * por nombre); el frontend usa los .webp redimensionados (~165 KB en total
 * frente a ~2,8 MB de PNG), pensados para celulares con datos móviles.
 */

const CODIGOS_CON_LOGO_LOCAL = new Set([
  'una', 'unaj', 'sanmarcos', 'uni', 'unsa', 'unsaac',
  'uncp', 'unfv', 'unalm', 'unt', 'unp', 'unsch',
]);

const BASE = import.meta.env.BASE_URL; // '/'

export function resolveLogoUrl(codigo?: string, registroLogo?: string): string {
  if (codigo && CODIGOS_CON_LOGO_LOCAL.has(codigo)) {
    return `${BASE}logos/${codigo}.webp`;
  }
  if (registroLogo) {
    if (registroLogo.startsWith('http')) return registroLogo;
    if (registroLogo.startsWith(BASE)) return registroLogo;
    if (registroLogo.startsWith('/')) return BASE + registroLogo.slice(1);
    return registroLogo;
  }
  // Sin logo propio (p. ej. UNC): insignia con la sigla en vez de una imagen rota (404).
  return siglaBadge(codigo ?? 'una');
}

function siglaBadge(codigo: string): string {
  const sigla = codigo.toUpperCase().slice(0, 6).replace(/[^A-Z0-9]/g, '');
  const size = sigla.length > 4 ? 18 : 24;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<circle cx="32" cy="32" r="30" fill="#E2E8F0"/>' +
    '<text x="32" y="32" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="' + size + '" fill="#334155">' +
    sigla + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
