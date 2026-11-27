import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, GraduationCap, Search } from 'lucide-react';
import { useQuickSwitchStore } from '../nav/quickSwitchStore';
import { useUniversityStore } from '../../hooks/useUniversity';

/** Scroll suave a una sección por id, respetando prefers-reduced-motion. */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

const GOLD_GLOW = { '--uni-primary': '#D4AF37' } as CSSProperties;

/** IDs de sección observados por el scrollspy (deben existir en Landing.tsx). */
const SPY_SECTION_IDS = ['universidades', 'banqueo-mix', 'calificacion', 'como-funciona', 'faq'];

/**
 * Navbar sticky del Landing nacional (Dirección de Diseño v3 §Estructura,
 * punto 1). Blanca, 72-80px, sombra sutil, CTA pill con glow. <lg colapsa a
 * un menú hamburguesa accesible (aria-expanded, Escape, foco atrapado).
 *
 * Solo se usa en Landing.tsx — no altera App.tsx ni el resto de rutas.
 */
export function LandingNavbar() {
  const navigate = useNavigate();
  const setQuickSwitchOpen = useQuickSwitchStore((s) => s.setOpen);
  const activa = useUniversityStore((s) => s.activa);
  const registro = useUniversityStore((s) => s.registro);
  // Universidad de referencia para Banqueo/Aula: la elegida antes (si sigue en el registro) o UNA.
  const uniBase = activa && registro.some((u) => u.codigo === activa) ? activa : 'una';
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  // Barra de progreso de scroll + reducción sutil de altura de la navbar al bajar.
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollable = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      setProgress(scrollable > 0 ? Math.min(100, (scrollTop / scrollable) * 100) : 0);
      setScrolled(scrollTop > 24);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scrollspy: resalta el enlace de la sección visible (IntersectionObserver).
  useEffect(() => {
    const els = SPY_SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goUniversidades = () => {
    setOpen(false);
    scrollToId('universidades');
  };
  const goComoFunciona = () => {
    setOpen(false);
    scrollToId('como-funciona');
  };
  const goMix = () => {
    setOpen(false);
    scrollToId('banqueo-mix');
  };
  const goCalificacion = () => {
    setOpen(false);
    scrollToId('calificacion');
  };
  const goFaq = () => {
    setOpen(false);
    scrollToId('faq');
  };
  const goBanqueo = () => {
    setOpen(false);
    navigate(`/${uniBase}/banqueo`);
  };
  const goAula = () => {
    setOpen(false);
    navigate(`/${uniBase}/aula`);
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
      <div
        className={`container mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out ${
          scrolled ? 'h-16' : 'h-[72px] md:h-20'
        }`}
      >
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
            Sinapsis Preu
          </span>
        </button>

        {/* Enlaces desktop (Banqueo y Aula viven dentro de cada universidad y en el menú móvil) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-slate-700">
          <button
            onClick={goUniversidades}
            aria-current={activeSection === 'universidades' ? 'true' : undefined}
            className={`transition-colors ${
              activeSection === 'universidades' ? 'text-brand-primary-700' : 'hover:text-brand-primary-700'
            }`}
          >
            Universidades
          </button>
          <button
            onClick={goMix}
            aria-current={activeSection === 'banqueo-mix' ? 'true' : undefined}
            className={`transition-colors ${
              activeSection === 'banqueo-mix' ? 'text-brand-primary-700' : 'hover:text-brand-primary-700'
            }`}
          >
            Banqueo mix
          </button>
          <button
            onClick={goCalificacion}
            aria-current={activeSection === 'calificacion' ? 'true' : undefined}
            className={`transition-colors ${
              activeSection === 'calificacion' ? 'text-brand-primary-700' : 'hover:text-brand-primary-700'
            }`}
          >
            Calificación
          </button>
          <button
            onClick={goComoFunciona}
            aria-current={activeSection === 'como-funciona' ? 'true' : undefined}
            className={`transition-colors ${
              activeSection === 'como-funciona' ? 'text-brand-primary-700' : 'hover:text-brand-primary-700'
            }`}
          >
            Cómo funciona
          </button>
          <button
            onClick={goFaq}
            aria-current={activeSection === 'faq' ? 'true' : undefined}
            className={`transition-colors ${
              activeSection === 'faq' ? 'text-brand-primary-700' : 'hover:text-brand-primary-700'
            }`}
          >
            Preguntas
          </button>
        </nav>

        {/* CTA + hamburguesa */}
        <div className="flex items-center gap-2">
          <button
            onClick={goUniversidades}
            style={GOLD_GLOW}
            className="hidden sm:inline-flex btn-glow !px-5 !py-2.5 md:!px-6 md:!py-3 bg-brand-accent-500 text-brand-primary-900 text-sm"
          >
            Elegir universidad
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

      {/* Barra de progreso de scroll: gradiente brand→dorado, 2-3px al borde inferior */}
      <div
        className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-brand-primary-700 to-brand-accent-500 motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />

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
            <button role="menuitem" onClick={goMix} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Banqueo mix
            </button>
            <button role="menuitem" onClick={goCalificacion} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Calificación oficial
            </button>
            <button role="menuitem" onClick={goComoFunciona} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Cómo funciona
            </button>
            <button role="menuitem" onClick={goBanqueo} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Banqueo
            </button>
            <button role="menuitem" onClick={goAula} className="flex items-center gap-2 text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Aula virtual
              <span className="text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-accent-500 text-brand-primary-900">
                Nuevo
              </span>
            </button>
            <button role="menuitem" onClick={goFaq} className="text-left px-2 py-3 rounded-lg hover:bg-slate-50">
              Preguntas frecuentes
            </button>
            <button
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/nosotros'); }}
              className="text-left px-2 py-3 rounded-lg hover:bg-slate-50"
            >
              Nosotros
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setQuickSwitchOpen(true);
              }}
              className="flex items-center gap-2 text-left px-2 py-3 rounded-lg hover:bg-slate-50"
            >
              <Search className="w-4 h-4 text-slate-400" aria-hidden="true" />
              Cambiar universidad
            </button>
            <button
              role="menuitem"
              onClick={goUniversidades}
              style={GOLD_GLOW}
              className="mt-2 btn-glow bg-brand-accent-500 text-brand-primary-900 justify-center"
            >
              Elegir universidad
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default LandingNavbar;
