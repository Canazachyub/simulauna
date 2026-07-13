/**
 * Puente entre el registro de universidades (useUniversityStore.registro) y el sistema de
 * theming institucional (src/theme/universityThemes.ts). Compartido por Quiz/Results/
 * StudentForm/ExamConfirmation/AreaSelector y el motor de práctica (src/components/practice)
 * para no duplicar la resolución de tema en cada componente (ver docs/CONTRATO_API_V2.md §5:
 * "cero componentes nuevos por universidad").
 *
 * Uso típico: aplicar `resolveThemeVars(universidad, registro)` como `style` del contenedor
 * raíz de una pantalla; los descendientes pueden leer `var(--uni-primary-safe)` etc. sin
 * necesitar acceso directo al store (las CSS custom properties heredan por el DOM).
 *
 * Regla de contraste (importante): `--uni-primary-safe` ya pasó por ensureAccessible() contra
 * blanco — el contraste WCAG es simétrico, así que es seguro tanto para texto/ícono sobre
 * fondo claro COMO para texto blanco sobre un fondo relleno con ese color. Úsalo siempre que
 * el elemento deba garantizar AA. Reserva el `--uni-primary` crudo para decoración sin texto
 * encima (glows, bordes, gradientes de fondo).
 */
import type { CSSProperties } from 'react';
import type { Universidad } from '../types';
import { getUniversityTheme, themeCssVars, type UniversityTheme } from '../theme/universityThemes';

export function resolveTheme(
  universidad: string | null | undefined,
  registro: Universidad[]
): UniversityTheme {
  const entry = registro.find((u) => u.codigo === universidad);
  return getUniversityTheme(universidad ?? undefined, entry?.colores);
}

/** CSS custom properties (--uni-primary, --uni-primary-safe, etc.) listas para `style={...}`. */
export function resolveThemeVars(
  universidad: string | null | undefined,
  registro: Universidad[]
): CSSProperties {
  return themeCssVars(resolveTheme(universidad, registro)) as CSSProperties;
}
