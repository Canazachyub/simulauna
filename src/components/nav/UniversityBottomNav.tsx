import type { CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Home, FileText, BookOpen, MonitorPlay, type LucideIcon } from 'lucide-react';
import { useUniversityStore } from '../../hooks/useUniversity';
import { getUniversityTheme, themeCssVars } from '../../theme/universityThemes';

interface BottomItem {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
  exact?: boolean;
  badge?: string;
}

/** Rutas donde la bottom bar estorbaría (examen a pantalla completa, resultados). */
const HIDDEN_SUFFIXES = ['/examen', '/resultados'];

/**
 * Barra de navegación inferior, solo móvil (<md), para el espacio de una
 * universidad (/:universidad/*). Se monta una única vez desde App.tsx dentro
 * del UniversityGate, así que puede leer :universidad con useParams sin
 * necesitar props. Se oculta a sí misma en /examen y /resultados.
 */
export function UniversityBottomNav() {
  const { universidad: codigo } = useParams<{ universidad: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const getUniversidad = useUniversityStore((s) => s.getUniversidad);

  if (!codigo || HIDDEN_SUFFIXES.some((suffix) => location.pathname.endsWith(suffix))) {
    return null;
  }

  const universidad = getUniversidad(codigo);
  const theme = getUniversityTheme(codigo, universidad?.colores);
  const vars = themeCssVars(theme) as CSSProperties;

  const base = `/${codigo}`;
  const items: BottomItem[] = [
    { key: 'inicio', label: 'Inicio', icon: Home, to: base, exact: true },
    { key: 'simulacro', label: 'Simulacro', icon: FileText, to: `${base}/registro` },
    { key: 'banqueo', label: 'Banqueo', icon: BookOpen, to: `${base}/banqueo` },
    { key: 'aula', label: 'Aula', icon: MonitorPlay, to: `${base}/aula`, badge: 'Próximamente' },
  ];

  const isActive = (item: BottomItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <nav
      aria-label="Navegación de la universidad"
      style={vars}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => navigate(item.to)}
                aria-current={active ? 'page' : undefined}
                style={
                  {
                    color: active ? 'var(--uni-primary-safe)' : '#94a3b8',
                    '--tw-ring-color': 'var(--uni-primary-safe)',
                  } as CSSProperties
                }
                className="w-full min-h-[56px] flex flex-col items-center justify-center gap-0.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset transition-colors"
              >
                <span className="relative">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {item.badge && (
                    // Punto indicador en vez de texto: a 6px el "PRÓX" era ilegible
                    // (el texto accesible vive en el sr-only del label).
                    <span
                      className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-brand-accent-500 ring-2 ring-white"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="text-[10px] font-bold leading-none">
                  {item.label}
                  {item.badge && <span className="sr-only"> ({item.badge})</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default UniversityBottomNav;
