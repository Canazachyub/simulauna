/**
 * Utilidades para formatear texto con HTML de Google Sheets
 * Soporta: <b>, <i>, <u>, <mark>, <br>, <sub>, <sup>, <img>
 */

/**
 * Renderiza texto con formato HTML de Google Sheets de forma segura
 * Permite solo las etiquetas HTML soportadas por Google Sheets
 *
 * @param text - El texto a formatear (puede contener HTML)
 * @returns El texto con HTML sanitizado listo para renderizar
 */
export function renderFormattedText(text: string | null | undefined): string {
  if (!text) return '';

  // Lista de etiquetas permitidas (las que soporta Google Sheets)
  const allowedTags = ['b', 'i', 'u', 'mark', 'br', 'sub', 'sup', 'img', 'strong', 'em'];

  // Convertir el texto a string si no lo es
  let result = String(text);

  // Reemplazar saltos de línea con <br> si no hay HTML
  if (!result.includes('<')) {
    result = result.replace(/\n/g, '<br>');
  }

  // Sanitizar: eliminar etiquetas no permitidas pero mantener el contenido
  // Expresión regular para encontrar todas las etiquetas HTML
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const tag = tagName.toLowerCase();

    // Si es una etiqueta permitida, mantenerla
    if (allowedTags.includes(tag)) {
      // Para img, asegurarse de que solo tenga atributos seguros
      if (tag === 'img') {
        const srcMatch = match.match(/src=["']([^"']+)["']/i);
        const altMatch = match.match(/alt=["']([^"']+)["']/i);

        if (srcMatch) {
          const src = srcMatch[1];
          const alt = altMatch ? altMatch[1] : 'Imagen';
          // Validar que la URL sea segura (https o data:image)
          if (src.startsWith('https://') || src.startsWith('data:image')) {
            return `<img src="${src}" alt="${alt}" class="max-w-full h-auto inline-block" />`;
          }
        }
        return ''; // Eliminar img no válidos
      }
      return match;
    }

    // Si no es permitida, eliminar la etiqueta pero mantener el contenido
    return '';
  });

  // Sanitizar atributos peligrosos (onclick, onerror, etc.)
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  result = result.replace(/\s*javascript:/gi, '');

  return result;
}

/**
 * Convierte texto plano a texto escapado para HTML
 * Útil cuando el texto NO debe tener formato HTML
 *
 * @param text - El texto a escapar
 * @returns El texto con caracteres especiales escapados
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Elimina todas las etiquetas HTML de un texto
 * Útil para obtener texto plano de contenido formateado
 *
 * @param html - El HTML del que extraer texto
 * @returns El texto sin etiquetas HTML
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';

  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
