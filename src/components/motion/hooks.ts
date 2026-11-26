/* Hooks y constantes del kit de movimiento (ver motion.tsx). Separados para que
   motion.tsx solo exporte componentes (fast refresh). */
import { useEffect, useRef, useState } from 'react';

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Visible una sola vez al cruzar el umbral (luego se desconecta). */
export function useInView<T extends Element>(threshold = 0.18, rootMargin = '0px 0px -8% 0px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);
  return { ref, inView };
}

/**
 * Progreso 0→1 del elemento cruzando el viewport (0 = asoma por abajo,
 * 1 = sale por arriba). Escribe --sp en el elemento: el parallax se hace en
 * CSS, p.ej. `transform: translateY(calc((var(--sp) - .5) * -40px))`.
 * Sin re-renders de React; con reduced-motion queda fijo en 0.5.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--sp', '0.5');
    if (prefersReducedMotion()) return;
    let raf = 0;
    let visible = true;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = (vh - r.top) / (vh + r.height);
      el.style.setProperty('--sp', Math.min(1, Math.max(0, p)).toFixed(3));
    };
    const onScroll = () => {
      if (visible && !raf) raf = requestAnimationFrame(update);
    };
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) onScroll(); })
      : null;
    io?.observe(el);
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

/** Rutas de las ilustraciones 3D generadas para el flujo del postulante. */
const BASE = import.meta.env.BASE_URL;
export const ILLUSTRATIONS_3D = {
  simulacro: `${BASE}illustrations/3d/modo-simulacro.webp`,
  banqueoHistorico: `${BASE}illustrations/3d/modo-banqueo-historico.webp`,
  banqueoTema: `${BASE}illustrations/3d/modo-banqueo-tema.webp`,
  cepre: `${BASE}illustrations/3d/modo-cepre.webp`,
  aula: `${BASE}illustrations/3d/modo-aula.webp`,
  carnet: `${BASE}illustrations/3d/registro-carnet.webp`,
  trofeo: `${BASE}illustrations/3d/resultado-trofeo.webp`,
  medalla: `${BASE}illustrations/3d/resultado-medalla.webp`,
  impulso: `${BASE}illustrations/3d/resultado-impulso.webp`,
  escritorio: `${BASE}illustrations/3d/landing-escritorio.webp`,
  ficha: `${BASE}illustrations/3d/landing-ficha.webp`,
  birrete: `${BASE}illustrations/3d/landing-birrete.webp`,
} as const;
