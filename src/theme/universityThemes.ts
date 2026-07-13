/**
 * Temas por universidad — colores institucionales REALES.
 * ============================================
 * Investigados de manuales de marca / estatutos / heráldica oficial
 * (2026-07). El registro maestro (CORE.universidades, vía getUniversidades)
 * SIEMPRE tiene precedencia: este mapa es el fallback local y la fuente
 * para universidades aún no registradas (carrusel / "Próximamente").
 *
 * Reglas de uso (ver notas de investigación):
 * - `secondary` suele ser amarillo/dorado: usarlo SOLO como acento
 *   (bordes, íconos, detalles) — NUNCA como fondo con texto blanco.
 * - `primary` debe pasar por ensureAccessible() antes de usarse como
 *   color de texto o fondo con texto blanco (AA).
 * - Las tres "guindas" (unsa, sanmarcos, unsch) están deliberadamente
 *   diferenciadas en tono para distinguirse de un vistazo.
 */
import { ensureAccessible } from '../utils/color';

export interface UniversityTheme {
  /** Color institucional principal (familia oscura, sirve de fondo/acento fuerte). */
  primary: string;
  /** Acento secundario (dorados/amarillos: solo detalles, nunca fondo+texto blanco). */
  secondary: string;
  /** Confianza de la fuente: alto = manual/web oficial, medio = escudo/heráldica, bajo = inferido. */
  confidence: 'alto' | 'medio' | 'bajo';
}

export const UNIVERSITY_THEMES: Record<string, UniversityTheme> = {
  // Azul UNA: coincide con el brand Editorial Andino de la plataforma.
  una: { primary: '#003D7A', secondary: '#E67E22', confidence: 'alto' },
  // Guinda/vinotinto de la bandera de Arequipa + amarillo dorado del lambrequín.
  unsa: { primary: '#7B1B2C', secondary: '#F2C230', confidence: 'alto' },
  // Guinda sanmarquino (más rojo-púrpura que UNSA) + perla.
  sanmarcos: { primary: '#8C1D40', secondary: '#EFE6D8', confidence: 'medio' },
  // Azul UNI Pantone 661 C (manual de marca 2019).
  uni: { primary: '#003594', secondary: '#FFFFFF', confidence: 'alto' },
  // Rojo gules del escudo + oro.
  unsaac: { primary: '#A6192E', secondary: '#C9A227', confidence: 'medio' },
  // Verde institucional + dorado.
  uncp: { primary: '#1B5E3A', secondary: '#C9A227', confidence: 'medio' },
  // Azul + amarillo (colores académicos oficiales).
  unt: { primary: '#1B3E6F', secondary: '#F2C230', confidence: 'medio' },
  // Azul cielo (estatuto 2014) — oscurecido para AA vía ensureAccessible.
  unc: { primary: '#4A90D9', secondary: '#F2C230', confidence: 'alto' },
  // Naranja y negro (cerámica Chavín, web oficial).
  unfv: { primary: '#E8792D', secondary: '#1A1A1A', confidence: 'alto' },
  // Verde UNALM (manual monocromo) + dorado del choclo del escudo.
  unalm: { primary: '#2E7D32', secondary: '#D4A017', confidence: 'medio' },
  // Celeste piurano — oscurecido para AA — + rojo del escudo.
  unp: { primary: '#4FA8D8', secondary: '#C8102E', confidence: 'medio' },
  // Granate huamanguino (deportivo, el más reconocible) diferenciado a rojo puro.
  unsch: { primary: '#9E1B1B', secondary: '#6E6E6E', confidence: 'medio' },
  // UNAJ: SIN fuente oficial verificable — neutral Editorial Andino hasta confirmar.
  unaj: { primary: '#003D7A', secondary: '#D4AF37', confidence: 'bajo' },
};

/** Tema neutral (brand Editorial Andino) para códigos desconocidos. */
const NEUTRAL_THEME: UniversityTheme = { primary: '#003D7A', secondary: '#D4AF37', confidence: 'alto' };

/**
 * Resuelve el tema de una universidad: los colores del registro maestro
 * (si vienen) tienen precedencia; el mapa local es fallback.
 */
export function getUniversityTheme(
  codigo: string | undefined,
  coloresRegistro?: { primario?: string; secundario?: string }
): UniversityTheme {
  const base = (codigo && UNIVERSITY_THEMES[codigo]) || NEUTRAL_THEME;
  return {
    primary: coloresRegistro?.primario || base.primary,
    secondary: coloresRegistro?.secundario || base.secondary,
    confidence: base.confidence,
  };
}

/**
 * CSS custom properties listas para inyectar en un contenedor
 * (style={themeCssVars(theme)}). Derivados:
 * - --uni-primary:       color institucional tal cual (fondos oscuros, gradientes)
 * - --uni-primary-safe:  garantizado AA como texto sobre fondo claro
 * - --uni-primary-soft:  tinte ~8% para fondos suaves de sección/chips
 * - --uni-primary-deep:  variante oscurecida para gradientes y hovers
 * - --uni-secondary:     acento (solo detalles)
 */
export function themeCssVars(theme: UniversityTheme): Record<string, string> {
  const safe = ensureAccessible(theme.primary, '#FFFFFF', 4.5);
  return {
    '--uni-primary': theme.primary,
    '--uni-primary-safe': safe,
    '--uni-primary-soft': hexWithAlpha(theme.primary, 0.08),
    '--uni-primary-deep': darken(theme.primary, 0.25),
    '--uni-secondary': theme.secondary,
  };
}

/** #RRGGBB + alpha 0-1 → rgba() (los tintes suaves conservan el matiz). */
function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(0, 61, 122, ${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Oscurece un #RRGGBB multiplicando sus canales (factor 0-1). */
function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = 1 - amount;
  const r = Math.max(0, Math.round(((n >> 16) & 255) * f));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * f));
  const b = Math.max(0, Math.round((n & 255) * f));
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}
