import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, GraduationCap, FileText, BookOpen, Trophy, CornerDownLeft, type LucideIcon } from 'lucide-react';
import { useUniversityStore } from '../../hooks/useUniversity';
import { getUniversityTheme } from '../../theme/universityThemes';
import { useQuickSwitchStore } from './quickSwitchStore';

interface FlatItem {
  key: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  accent: string;
  action: () => void;
}

/** /examen (o /:universidad/examen) — nunca registramos el atajo global ahí. */
const EXAM_ROUTE_RE = /\/examen(\/|$)/;

/**
 * Paleta de comandos (Ctrl+K / Cmd+K) para saltar de universidad o ir directo a
 * un proceso (Simulacro/Banqueo/CEPRE) de la universidad activa. Mount único y
 * global en App.tsx; el trigger visible vive en LandingNavbar (botón + kbd hint),
 * pero el atajo de teclado funciona en cualquier ruta salvo /examen.
 */
export function QuickSwitch() {
  const open = useQuickSwitchStore((s) => s.open);
  const setOpen = useQuickSwitchStore((s) => s.setOpen);
  const navigate = useNavigate();
  const location = useLocation();

  const registro = useUniversityStore((s) => s.registro);
  const activaCodigo = useUniversityStore((s) => s.activa);
  const loadRegistro = useUniversityStore((s) => s.loadRegistro);
  const getUniversidad = useUniversityStore((s) => s.getUniversidad);

  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    loadRegistro();
  }, [loadRegistro]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setHighlighted(0);
  };

  // Atajo global: Ctrl+K / Cmd+K. Se ignora con foco en input/textarea/contentEditable
  // (mismo patrón que Quiz.tsx) y por completo en rutas de examen para no interferir.
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (EXAM_ROUTE_RE.test(location.pathname)) return;
      if (e.key.toLowerCase() !== 'k' || !(e.ctrlKey || e.metaKey)) return;

      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditable) return;

      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [location.pathname, setOpen]);

  // Al abrirse: recordar el foco previo, enfocar el buscador, escuchar Escape.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Devolver el foco al elemento que abrió el diálogo cuando se cierra.
  useEffect(() => {
    if (open) return;
    restoreFocusRef.current?.focus();
  }, [open]);

  const activa = activaCodigo ? getUniversidad(activaCodigo) : undefined;

  const items = useMemo<FlatItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: FlatItem[] = [];

    if (activa) {
      const theme = getUniversityTheme(activa.codigo, activa.colores);
      const procesos = activa.procesos || [];
      const quickActions: { key: string; label: string; icon: FlatItem['icon']; to: string }[] = [];
      if (procesos.includes('ORDINARIO') || procesos.includes('EXTRAORDINARIO')) {
        quickActions.push({ key: 'qa-simulacro', label: 'Simulacro completo', icon: FileText, to: `/${activa.codigo}/registro` });
      }
      quickActions.push({ key: 'qa-banqueo', label: 'Banqueo histórico', icon: BookOpen, to: `/${activa.codigo}/banqueo` });
      if (procesos.includes('CEPRE')) {
        quickActions.push({ key: 'qa-cepre', label: activa.cepreNombre || 'CEPRE', icon: Trophy, to: `/${activa.codigo}/cepre` });
      }

      quickActions.forEach((qa) => {
        if (q && !qa.label.toLowerCase().includes(q) && !activa.nombreCorto.toLowerCase().includes(q)) return;
        list.push({
          key: qa.key,
          label: qa.label,
          sublabel: `Acceso rápido · ${activa.nombreCorto}`,
          icon: qa.icon,
          accent: theme.primary,
          action: () => {
            navigate(qa.to);
            close();
          },
        });
      });
    }

    registro.forEach((u) => {
      const haystack = `${u.nombre} ${u.nombreCorto} ${u.codigo}`.toLowerCase();
      if (q && !haystack.includes(q)) return;
      const theme = getUniversityTheme(u.codigo, u.colores);
      list.push({
        key: `uni-${u.codigo}`,
        label: u.nombreCorto,
        sublabel: u.nombre,
        icon: GraduationCap,
        accent: theme.primary,
        action: () => {
          navigate(`/${u.codigo}`);
          close();
        },
      });
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, registro, activa, navigate]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  const handleDialogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (items.length ? (h + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (items.length ? (h - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[highlighted]?.action();
    } else if (e.key === 'Tab' && dialogRef.current) {
      // Focus trap simple, mismo patrón que el menú móvil de LandingNavbar.
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-slate-900/50 backdrop-blur-sm motion-safe:animate-fade-in"
      onClick={close}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickswitch-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-lg card-elevated bg-white rounded-2xl overflow-hidden motion-safe:animate-fade-up"
      >
        <h2 id="quickswitch-title" className="sr-only">
          Cambiar de universidad
        </h2>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar universidad o acción…"
            aria-label="Buscar universidad o acción"
            role="combobox"
            aria-expanded="true"
            aria-controls="quickswitch-list"
            aria-activedescendant={items[highlighted] ? `quickswitch-item-${items[highlighted].key}` : undefined}
            autoComplete="off"
            className="flex-1 min-w-0 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <div id="quickswitch-list" role="listbox" aria-label="Resultados" className="max-h-[60vh] overflow-y-auto py-2">
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Sin resultados para “{query}”</p>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            const active = i === highlighted;
            return (
              <button
                key={item.key}
                id={`quickswitch-item-${item.key}`}
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => item.action()}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  active ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: item.accent }}
                  aria-hidden="true"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-800 truncate">{item.label}</span>
                  {item.sublabel && <span className="block text-xs text-slate-400 truncate">{item.sublabel}</span>}
                </span>
                {active && <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default QuickSwitch;
