import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, GraduationCap, Sparkles } from 'lucide-react';

/** Scroll suave a una sección por id, respetando prefers-reduced-motion. */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

const GOLD_GLOW = { '--uni-primary': '#D4AF37' } as CSSProperties;

/**
 * Navbar sticky del Landing nacional (Dirección de Diseño v3 §Estructura,
 * punto 1). Blanca, 72-80px, sombra sutil, CTA pill con glow. <lg colapsa a
 * un menú hamburguesa accesible (aria-expanded, Escape, foco atrapado).
 *
 * Solo se usa en Landing.tsx — no altera App.tsx ni el resto de rutas.
 */
export function LandingNavbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const goUniversidades = () => {
    setOpen(false);
    scrollToId('universidades');
  };
  const goComoFunciona = () => {
    setOpen(false);
    scrollToId('como-funciona');
  };
  const goBanqueo = () => {
    setOpen(false);
    navigate('/una/banqueo');
  };

  // Escape cierra el menú móvil; foco vuelve al botón hamburguesa.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    // Foco inicial al primer enlace del menú.
    const first = menuRef.current?.querySelector<HTMLElement>('a, button');
    first?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Focus trap simple: Tab/Shift+Tab circulan dentro del panel mientras está abierto.
  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !menuRef.current) return;
    const focusables = menuRef.current.querySelectorAll<HTMLElement>('a, button');
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
  };

  return (
    <header className="sticky top-0 z-50 bg-white navbar-shadow-soft">
      <div className="container mx-auto px-4 sm:px-6 h-[72px] md:h-20 flex items-center justify-between gap-4">
        {/* Logo (texto — sin logo gráfico propio) */}
        <button
          onClick={() => {
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
          }}
          className="flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 rounded-lg"
        >
          <span className="w-9 h-9 rounded-xl bg-brand-primary-700 flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </span>
          <span className="font-display text-xl md:text-2xl font-black text-display-tight text-brand-primary-700">
            SimulaUNA
          </span>
        </button>

        {/* Enlaces desktop */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-slate-700">
          <button onClick={goUniversidades} className="hover:text-brand-primary-700 transition-colors">
            Universidades
          </button>
          <button onClick={goComoFunciona} className="hover:text-brand-primary-700 transition-colors">
            Cómo funciona
          </button>
          <button onClick={goBanqueo} className="hover:text-brand-primary-700 transition-colors">
            Banqueo
          </button>
          <span className="inline-flex items-center gap-1.5 text-slate-400 cursor-default select-none">
            Aula virtual
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-accent-500 text-brand-primary-900">
              <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
              Próximamente
            </span>
          </span>
        </nav>

        {/* CTA + hamburguesa */}
        <div className="flex items-center gap-2">
          <button
            onClick={goUniversidades}
            style={GOLD_GLOW}
            className="hidden sm:inline-flex btn-glow !px-5 !py-2.5 md:!px-6 md:!py-3 bg-brand-accent-500 text-brand-primary-900 text-sm"
          >
            Empezar gratis
          </button>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Panel móvil */}
      {open && (
        <div
          id="landing-mobile-menu"
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className="lg:hidden border-t border-slate-100 bg-white animate-fade-up"
        >
          <div className="container mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1 text-base font-bold text-slate-700">
            <button role="menuitem" onClick={goUniversidades} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Universidades
            </button>
            <button role="menuitem" onClick={goComoFunciona} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Cómo funciona
            </button>
            <button role="menuitem" onClick={goBanqueo} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Banqueo
            </button>
            <span className="px-2 py-3 inline-flex items-center gap-2 text-slate-400 select-none">
              Aula virtual
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-accent-500 text-brand-primary-900">
                <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                Próximamente
              </span>
            </span>
            <button
              role="menuitem"
              onClick={goUniversidades}
              style={GOLD_GLOW}
              className="mt-2 btn-glow bg-brand-accent-500 text-brand-primary-900 justify-center"
            >
              Empezar gratis
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default LandingNavbar;
