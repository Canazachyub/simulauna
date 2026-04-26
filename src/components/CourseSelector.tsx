import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Sigma, Atom, BookOpen, Globe2, Languages, Sparkles,
  LayoutGrid, List as ListIcon
} from 'lucide-react';
import clsx from 'clsx';

export interface CourseOption {
  name: string;
  count?: number;        // total preguntas disponibles
  category?: string;     // 'Matemática' | 'Ciencias' | 'Lenguaje' | 'Sociales' | 'Idiomas'
}

type ViewMode = 'grid' | 'list';

interface Props {
  courses: CourseOption[];
  selected: string | null;
  onSelect: (name: string) => void;
  className?: string;
  autoFocus?: boolean;
  compact?: boolean;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  'Aritmética': 'Matemática', 'Álgebra': 'Matemática', 'Geometría': 'Matemática',
  'Trigonometría': 'Matemática', 'Razonamiento Matemático': 'Matemática',
  'Física': 'Ciencias', 'Química': 'Ciencias', 'Biología y Anatomía': 'Ciencias',
  'Comunicación': 'Lenguaje', 'Literatura': 'Lenguaje', 'Razonamiento Verbal': 'Lenguaje',
  'Historia': 'Sociales', 'Geografía': 'Sociales', 'Educación Cívica': 'Sociales',
  'Economía': 'Sociales', 'Psicología y Filosofía': 'Sociales',
  'Inglés': 'Idiomas', 'Quechua y aimara': 'Idiomas',
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  'Matemática': Sigma,
  'Ciencias': Atom,
  'Lenguaje': BookOpen,
  'Sociales': Globe2,
  'Idiomas': Languages,
  'Otros': Sparkles,
};

const CATEGORY_ACCENT: Record<string, { ring: string; bg: string; text: string; softBg: string }> = {
  'Matemática': { ring: 'ring-blue-200', bg: 'bg-blue-500', text: 'text-blue-700', softBg: 'bg-blue-50' },
  'Ciencias':   { ring: 'ring-emerald-200', bg: 'bg-emerald-500', text: 'text-emerald-700', softBg: 'bg-emerald-50' },
  'Lenguaje':   { ring: 'ring-rose-200', bg: 'bg-rose-500', text: 'text-rose-700', softBg: 'bg-rose-50' },
  'Sociales':   { ring: 'ring-amber-200', bg: 'bg-amber-500', text: 'text-amber-700', softBg: 'bg-amber-50' },
  'Idiomas':    { ring: 'ring-purple-200', bg: 'bg-purple-500', text: 'text-purple-700', softBg: 'bg-purple-50' },
  'Otros':      { ring: 'ring-slate-200', bg: 'bg-slate-500', text: 'text-slate-700', softBg: 'bg-slate-50' },
};

const VIEW_STORAGE_KEY = 'simulauna_courseselector_view';

const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 640px)').matches;
};

const getInitialView = (compact: boolean): ViewMode => {
  if (compact) return 'list';
  if (typeof window === 'undefined') return 'list';
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch { /* ignore */ }
  return isMobile() ? 'list' : 'list';
};

export function CourseSelector({
  courses,
  selected,
  onSelect,
  className,
  autoFocus = true,
  compact = false,
  searchPlaceholder = 'Buscar curso (ej: álgebra, biología)...',
  searchAriaLabel = 'Buscar curso',
}: Props) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('Todos');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [view, setView] = useState<ViewMode>(() => getInitialView(compact));
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedItemRef = useRef<HTMLButtonElement | HTMLLIElement | null>(null);

  // Autofocus al montar
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Reset focus cuando cambia el query
  useEffect(() => { setFocusedIndex(-1); }, [query, activeCat]);

  // Persistir preferencia de vista
  useEffect(() => {
    if (compact) return;
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, view); } catch { /* ignore */ }
  }, [view, compact]);

  // Categorías disponibles a partir de los datos
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      const cat = c.category ?? CATEGORY_MAP[c.name] ?? 'Otros';
      set.add(cat);
    });
    return Array.from(set);
  }, [courses]);

  // Lista plana filtrada (para keyboard nav y vista list)
  const flatFiltered = useMemo(() => {
    const q = query.toLowerCase();
    return courses.filter(c => {
      const matchesQuery = c.name.toLowerCase().includes(q);
      const cat = c.category ?? CATEGORY_MAP[c.name] ?? 'Otros';
      const matchesCat = activeCat === 'Todos' || cat === activeCat;
      return matchesQuery && matchesCat;
    });
  }, [courses, query, activeCat]);

  const grouped = useMemo(() => {
    const groups: Record<string, CourseOption[]> = {};
    flatFiltered.forEach(c => {
      const cat = c.category ?? CATEGORY_MAP[c.name] ?? 'Otros';
      (groups[cat] ??= []).push(c);
    });
    return groups;
  }, [flatFiltered]);

  const totalMatches = flatFiltered.length;
  const effectiveView: ViewMode = compact ? 'list' : view;
  const singleCategory = availableCategories.length <= 1;
  const showCategoryFilters = !singleCategory && (flatFiltered.length > 5 || activeCat !== 'Todos' || query.length > 0);

  // Scroll el item con foco al viewport
  useEffect(() => {
    if (focusedIndex >= 0 && focusedItemRef.current) {
      focusedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(flatFiltered.length - 1, i < 0 ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && flatFiltered[focusedIndex]) {
        e.preventDefault();
        onSelect(flatFiltered[focusedIndex].name);
      } else if (flatFiltered.length === 1) {
        e.preventDefault();
        onSelect(flatFiltered[0].name);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setFocusedIndex(-1);
    }
  };

  const chipBase = 'whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all';

  return (
    <div className={clsx('relative p-6 rounded-2xl bg-white border border-slate-200 shadow-elevation-1 space-y-5 corner-accent', className)}>
      {/* Search + toggle de vista */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={18}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="w-full rounded-xl py-3 pl-12 pr-4 bg-white border-2 border-slate-200 font-sans text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all"
          />
        </div>
        {!compact && (
          <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-1" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              onClick={() => setView('list')}
              title="Vista lista (más rápida)"
              aria-pressed={view === 'list'}
              className={clsx(
                'p-2 rounded-lg transition-all',
                view === 'list'
                  ? 'bg-brand-primary text-white shadow-elevation-1'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('grid')}
              title="Vista cuadrícula"
              aria-pressed={view === 'grid'}
              className={clsx(
                'p-2 rounded-lg transition-all',
                view === 'grid'
                  ? 'bg-brand-primary text-white shadow-elevation-1'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hint de atajos */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono -mt-2">
        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">↑↓</kbd>
        <span>navegar</span>
        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Enter</kbd>
        <span>seleccionar</span>
        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Esc</kbd>
        <span>limpiar</span>
      </div>

      {/* Filtros rápidos */}
      {showCategoryFilters && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCat('Todos')}
            className={clsx(
              chipBase,
              activeCat === 'Todos'
                ? 'bg-brand-primary-600 text-white shadow-elevation-1'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Todos
          </button>
          {availableCategories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={clsx(
                chipBase,
                activeCat === cat
                  ? 'bg-brand-primary-600 text-white shadow-elevation-1'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {totalMatches === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-up rounded-2xl bg-slate-50 border border-dashed border-slate-200">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="mb-4 opacity-90">
            <circle cx="48" cy="48" r="36" stroke="#cbd5e1" strokeWidth="3" fill="#ffffff" />
            <line x1="36" y1="36" x2="60" y2="60" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="60" y1="36" x2="36" y2="60" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <p className="font-display text-lg font-bold text-slate-700 mb-1">
            Sin resultados
          </p>
          <p className="text-sm text-slate-500 font-sans">
            No encontramos «{query || activeCat}»
          </p>
        </div>
      )}

      {/* LIST view: compacta, denso, rápido */}
      {totalMatches > 0 && effectiveView === 'list' && (
        <ul
          className="max-h-[480px] overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100 bg-white"
          role="listbox"
          aria-label="Lista de cursos"
        >
          {flatFiltered.map((c, idx) => {
            const cat = c.category ?? CATEGORY_MAP[c.name] ?? 'Otros';
            const accent = CATEGORY_ACCENT[cat] ?? CATEGORY_ACCENT['Otros'];
            const Icon = CATEGORY_ICON[cat] ?? Sparkles;
            const isSelected = selected === c.name;
            const isFocused = focusedIndex === idx;
            return (
              <li
                key={c.name}
                ref={isFocused ? (el => { focusedItemRef.current = el; }) : undefined}
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(c.name)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={clsx(
                  'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-brand-primary-50 border-l-4 border-brand-primary'
                    : 'hover:bg-slate-50 border-l-4 border-transparent',
                  isFocused && !isSelected && 'ring-2 ring-brand-primary ring-inset',
                  isFocused && isSelected && 'ring-2 ring-brand-primary'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', accent.softBg)}>
                    <Icon className={clsx('w-4 h-4', accent.text)} />
                  </div>
                  <span className={clsx(
                    'font-sans text-sm font-semibold truncate',
                    isSelected ? 'text-brand-primary-700' : 'text-slate-800'
                  )}>
                    {c.name}
                  </span>
                  {!singleCategory && (
                    <span className={clsx(
                      'chip text-[10px] font-mono flex-shrink-0',
                      accent.softBg, accent.text
                    )}>
                      {cat}
                    </span>
                  )}
                </div>
                {c.count !== undefined && (
                  <span className="chip bg-slate-100 text-slate-600 text-[11px] font-mono flex-shrink-0 ml-2">
                    {c.count}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* GRID view: existente */}
      {totalMatches > 0 && effectiveView === 'grid' && Object.entries(grouped).map(([cat, items], catIdx) => {
        const Icon = CATEGORY_ICON[cat] ?? Sparkles;
        const accent = CATEGORY_ACCENT[cat] ?? CATEGORY_ACCENT['Otros'];
        return (
          <div key={cat} className="animate-fade-up" style={{ animationDelay: `${catIdx * 60}ms` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', accent.softBg)}>
                <Icon className={clsx('w-4 h-4', accent.text)} />
              </div>
              <h4 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {cat}
              </h4>
              <span className="text-xs text-slate-400 font-mono">· {items.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((c, idx) => {
                const isSelected = selected === c.name;
                const flatIdx = flatFiltered.indexOf(c);
                const isFocused = focusedIndex === flatIdx;
                return (
                  <button
                    key={c.name}
                    type="button"
                    ref={isFocused ? (el => { focusedItemRef.current = el; }) : undefined}
                    onClick={() => onSelect(c.name)}
                    onMouseEnter={() => setFocusedIndex(flatIdx)}
                    className={clsx(
                      'card-interactive p-5 min-h-[110px] flex flex-col justify-between group cursor-pointer text-left animate-fade-up',
                      isSelected
                        ? 'border-2 border-brand-primary-500 ring-4 ring-brand-primary-100 scale-[1.02]'
                        : 'border border-slate-200',
                      isFocused && !isSelected && 'ring-2 ring-brand-primary'
                    )}
                    style={{ animationDelay: `${(catIdx * 60) + (idx * 30)}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                        accent.softBg
                      )}>
                        <Icon className={clsx('w-5 h-5', accent.text)} />
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-primary-600 text-white font-mono">
                          Activo
                        </span>
                      )}
                    </div>
                    <div>
                      <h5 className="font-display text-lg font-bold text-slate-800 leading-tight mb-2">
                        {c.name}
                      </h5>
                      <div className="flex items-center gap-2">
                        {c.count !== undefined && (
                          <span className="chip bg-slate-100 text-slate-600 text-[11px] font-mono">
                            {c.count} preguntas
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
