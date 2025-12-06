/**
 * Utilidades para formatear texto con HTML de Google Sheets
 * Soporta: <b>, <i>, <u>, <mark>, <br>, <sub>, <sup>, <img>
 * Soporta: LaTeX con $...$ usando KaTeX
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Preprocesa el LaTeX para restaurar comandos que perdieron la barra invertida
 * Google Sheets y JSON pueden eliminar las barras invertidas
 */
function preprocessLatex(latex: string): string {
  // Lista de comandos LaTeX - ordenados de mayor a menor longitud
  // IMPORTANTE: Los comandos cortos como 'in' pueden estar dentro de otros como 'begin'
  const latexCommands = [
    'boldsymbol', 'displaystyle', 'leftrightarrow', 'Leftrightarrow',
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
    'underbrace', 'overbrace', 'underline', 'overline', 'stackrel',
    'scriptstyle', 'textstyle', 'emptyset', 'clubsuit', 'spadesuit',
    'triangle', 'diamond', 'partial', 'epsilon', 'textrm', 'textbf',
    'bmatrix', 'pmatrix', 'matrix', 'mathcal', 'mathbf', 'mathit',
    'mathrm', 'mathsf', 'mathtt', 'forall', 'exists', 'subset',
    'supset', 'approx', 'notin', 'equiv', 'wedge', 'nabla', 'infty',
    'theta', 'lambda', 'sigma', 'omega', 'alpha', 'gamma', 'delta',
    'times', 'cdot', 'sqrt', 'frac', 'text', 'hbar', 'quad', 'qquad',
    'begin', 'cases', 'angle', 'space', 'hspace', 'vspace', 'binom',
    'tilde', 'ddot', 'star', 'circ', 'prod', 'beta', 'zeta',
    'iota', 'kappa', 'right', 'left', 'leq', 'geq', 'neq', 'cup',
    'cap', 'vee', 'neg', 'sum', 'int', 'lim', 'log', 'sin', 'cos',
    'tan', 'end', 'div', 'phi', 'psi', 'rho', 'tau', 'chi', 'eta',
    'hat', 'bar', 'vec', 'dot', 'ell', 'aleph', 'wp', 'Re', 'Im',
    'pi', 'mu', 'nu', 'xi', 'pm', 'mp', 'ln'
    // NOTA: 'in' removido porque causa problemas con 'begin' → 'beg\in'
  ];

  let result = latex;

  // Restaurar barras invertidas para comandos que las perdieron
  for (const cmd of latexCommands) {
    // Buscar comando que NO esté precedido por \ ni sea parte de otra palabra
    // Debe estar seguido por { [ ( o espacio
    const pattern = new RegExp(`(^|[^\\\\a-zA-Z])(${cmd})([{\\[\\s(]|$)`, 'g');
    result = result.replace(pattern, `$1\\${cmd}$3`);
  }

  // Caso especial: \in - solo si está solo (precedido por espacio/inicio y seguido por espacio/fin)
  result = result.replace(/(^|[^\\a-zA-Z])(in)(\s|$)/g, '$1\\in$3');

  return result;
}

/**
 * Renderiza expresiones LaTeX en el texto
 * Detecta patrones $...$ y los convierte a HTML usando KaTeX
 *
 * @param text - El texto que puede contener expresiones LaTeX
 * @returns El texto con LaTeX renderizado como HTML
 */
function renderLatex(text: string): string {
  if (!text || !text.includes('$')) return text;

  // Patrón para detectar $...$ (LaTeX inline)
  // No debe capturar $$ (display mode) ni $ solo
  const latexPattern = /\$([^$]+)\$/g;

  return text.replace(latexPattern, (match, latex) => {
    try {
      // Preprocesar para restaurar barras invertidas perdidas
      const processedLatex = preprocessLatex(latex.trim());

      // Renderizar con KaTeX
      return katex.renderToString(processedLatex, {
        throwOnError: false,
        displayMode: false,
        strict: false,
        trust: true,
        macros: {
          "\\text": "\\textrm"
        }
      });
    } catch (error) {
      // Si hay error, mostrar el texto original
      console.warn('Error renderizando LaTeX:', latex, error);
      return match;
    }
  });
}

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
 * Incluye soporte para LaTeX con $...$
 *
 * @param text - El texto a formatear (puede contener HTML y LaTeX)
 * @returns El texto con HTML sanitizado y LaTeX renderizado
 */
export function renderFormattedText(text: string | null | undefined): string {
  if (!text) return '';

  // Lista de etiquetas permitidas (las que soporta Google Sheets + KaTeX)
  const allowedTags = ['b', 'i', 'u', 'mark', 'br', 'sub', 'sup', 'img', 'strong', 'em',
    // Etiquetas de KaTeX
    'span', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac',
    'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'mtext', 'annotation', 'svg', 'path',
    'line', 'g', 'rect', 'use'];

  // Convertir el texto a string si no lo es
  let result = String(text);

  // 1. Aplicar formateo automático de numeración ANTES de LaTeX
  // (para no romper los SVGs de KaTeX)
  result = formatQuestionTextAuto(result);

  // 2. Reemplazar saltos de línea con <br> ANTES de LaTeX
  result = result.replace(/\n/g, '<br>');

  // 3. Renderizar LaTeX ($...$) - esto genera HTML/SVG que no debe modificarse
  result = renderLatex(result);

  // 4. Sanitizar: eliminar etiquetas no permitidas pero mantener el contenido
  // Pero permitir clases de KaTeX
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

  // 5. Sanitizar atributos peligrosos (onclick, onerror, etc.)
  // Pero NO eliminar atributos de KaTeX (class, style, etc.)
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
