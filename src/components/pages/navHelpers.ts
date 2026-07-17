import type { NavigateFunction } from 'react-router-dom';

/**
 * Navega a la landing nacional ('/') y hace scroll hasta la sección
 * "Universidades disponibles" (id="universidades" en Landing.tsx). Landing
 * se monta de forma lazy (ver App.tsx), así que en vez de asumir que el nodo
 * ya existe en el primer frame, sondeamos brevemente hasta que aparezca.
 * Usado por páginas nacionales (404, Nosotros) que necesitan el mismo CTA
 * "Elegir universidad" que ya vive en el Landing, sin duplicar su sección.
 */
export function goToUniversidades(navigate: NavigateFunction) {
  navigate('/');
  let attempts = 0;
  const tryScroll = () => {
    const el = document.getElementById('universidades');
    if (el) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    attempts += 1;
    if (attempts < 40) window.setTimeout(tryScroll, 50);
  };
  window.setTimeout(tryScroll, 50);
}
