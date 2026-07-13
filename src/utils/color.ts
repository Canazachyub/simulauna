/**
 * Utilidades de color para acentos por universidad (Editorial Andino v1.6.0).
 *
 * El registro maestro de universidades (getUniversidades) trae un color `primario`
 * libre por universidad. Antes de usarlo como texto/ícono sobre fondos claros u
 * oscuros del design system, hay que garantizar que siga cumpliendo WCAG AA — sin
 * tener que mantener a mano un token "accesible" por cada universidad nueva que se
 * agregue al registro (ver docs/CONTRATO_API_V2.md §5).
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Ratio de contraste WCAG entre dos colores hex (1–21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Devuelve `hex` si ya cumple `minRatio` de contraste contra `background`. Si no,
 * lo oscurece progresivamente (10% por paso) hasta cumplirlo, preservando el matiz
 * de marca en vez de caer directo a un neutro. Con límite de seguridad: si tras 20
 * pasos no alcanza el mínimo, retorna un slate-900 (siempre AA sobre fondos claros).
 */
export function ensureAccessible(hex: string, background: string = '#FFFFFF', minRatio: number = 4.5): string {
  if (contrastRatio(hex, background) >= minRatio) return hex;

  let [r, g, b] = hexToRgb(hex);
  for (let step = 0; step < 20; step++) {
    r *= 0.9;
    g *= 0.9;
    b *= 0.9;
    const candidate = rgbToHex(r, g, b);
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return '#111827';
}
