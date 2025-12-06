/**
 * Utilidades para formatear texto con HTML de Google Sheets
 * Soporta: <b>, <i>, <u>, <mark>, <br>, <sub>, <sup>, <img>
 */

/**
 * Formatea automáticamente el texto detectando patrones de numeración
 * para agregar saltos de línea y mejorar la legibilidad
 *
 * Patrones detectados:
 * - Números romanos con punto: I., II., III., IV., V., VI., VII., VIII., IX., X.
 * - Números romanos con paréntesis: I), II), III), IV)
 * - Letras minúsculas en formato de lista: a., b., c., d., e.
 *
 * REGLAS PARA EVITAR FALSOS POSITIVOS:
 * - "empírica. Su" → NO es opción (hay espacio entre "a" y el punto, es fin de palabra)
 * - "verda d. La" → NO es opción (hay espacio ANTES de "d", es error de tipeo)
 * - "cosas.a. Racionalismo" → SÍ es opción (letra PEGADA al punto anterior)
 * - "corresponda: a. Opción" → SÍ es opción (después de dos puntos)
 */
function formatQuestionTextAuto(text: string): string {
  if (!text) return '';

  let formatted = text;

  // 1. Numeración romana con PUNTO: ".I. " o ":I. "
  formatted = formatted.replace(/([.:])(\s*)([IVX]{1,4})\.\s+/g, '$1<br><br><strong>$3.</strong> ');

  // 2. Numeración romana con PARÉNTESIS: ".I) " o ":II) "
  formatted = formatted.replace(/([.:])(\s*)([IVX]{1,4})\)\s+/g, '$1<br><br><strong>$3)</strong> ');

  // 3. Letras después de DOS PUNTOS con espacio: ": a. Opción"
  formatted = formatted.replace(/:(\s+)([a-e])\.\s+/g, ':<br><br><strong>$2.</strong> ');

  // 4. Letras PEGADAS directamente al punto (sin espacio): ".a. Racionalismo"
  // Este es el patrón clave que detecta listas como "cosas.a. Racionalismo.b. Empirismo"
  // NO detecta "empírica. Su" porque tiene espacio después del punto
  // NO detecta "verda d. La" porque la "d" no está pegada al punto
  formatted = formatted.replace(/\.([a-e])\.(\s+)/g, '.<br><br><strong>$1.</strong>$2');

  return formatted;
}

/**
 * Renderiza texto con formato HTML de Google Sheets de forma segura
 * Permite solo las etiquetas HTML soportadas por Google Sheets
 * Incluye formateo automático de numeración (I., II., a., b., etc.)
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

  // Aplicar formateo automático de numeración ANTES del procesamiento
  result = formatQuestionTextAuto(result);

  // Reemplazar saltos de línea con <br> si no hay HTML existente
  result = result.replace(/\n/g, '<br>');

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

/**
 * Extrae URLs de imágenes de un texto
 * Detecta URLs que terminan en extensiones de imagen o URLs de Google Drive
 *
 * @param text - El texto a analizar
 * @returns Array de URLs de imágenes encontradas
 */
export function extractImageUrls(text: string | null | undefined): string[] {
  if (!text) return [];

  const imageUrls: string[] = [];
  const textStr = String(text);

  // Patrones para detectar URLs de imágenes
  const patterns = [
    // URLs que terminan en extensiones de imagen
    /https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp|bmp|svg)(?:\?[^\s<>"']*)?/gi,
    // URLs de Google Drive (formato de vista/descarga)
    /https?:\/\/drive\.google\.com\/[^\s<>"']+/gi,
    // URLs de Google Photos
    /https?:\/\/lh[0-9]*\.googleusercontent\.com\/[^\s<>"']+/gi,
    // URLs de Imgur
    /https?:\/\/(?:i\.)?imgur\.com\/[^\s<>"']+/gi,
    // URLs genéricas con parámetros de imagen
    /https?:\/\/[^\s<>"']+(?:image|img|photo|picture)[^\s<>"']*/gi
  ];

  for (const pattern of patterns) {
    const matches = textStr.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Evitar duplicados
        if (!imageUrls.includes(match)) {
          imageUrls.push(match);
        }
      }
    }
  }

  return imageUrls;
}

/**
 * Remueve URLs de imágenes del texto
 * Útil para mostrar el texto sin las URLs crudas cuando se muestran las imágenes por separado
 *
 * @param text - El texto original
 * @returns El texto sin las URLs de imágenes
 */
export function removeImageUrls(text: string | null | undefined): string {
  if (!text) return '';

  let result = String(text);
  const imageUrls = extractImageUrls(text);

  for (const url of imageUrls) {
    // Escapar caracteres especiales de regex
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedUrl, 'g'), '');
  }

  // Limpiar espacios múltiples y líneas vacías
  result = result.replace(/\n\s*\n/g, '\n').trim();

  return result;
}

/**
 * Procesa una justificación para extraer texto e imágenes
 *
 * @param justification - El texto de la justificación
 * @returns Objeto con texto limpio y array de URLs de imágenes
 */
export function parseJustification(justification: string | null | undefined): {
  text: string;
  images: string[];
} {
  if (!justification) {
    return { text: '', images: [] };
  }

  const images = extractImageUrls(justification);
  const text = removeImageUrls(justification);

  return { text, images };
}
