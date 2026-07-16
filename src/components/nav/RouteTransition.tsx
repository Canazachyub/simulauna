import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reproduce el fade+slide-up de ~200ms de una página nueva. Es un componente
 * "de un solo uso": se remonta (vía `key`) cada vez que cambia la ruta, así
 * que su primer render siempre arranca en el estado "oculto" y el efecto lo
 * anima al estado final en el siguiente frame — sin depender de comparar
 * props entre renders.
 */
function RouteTransitionFrame({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setEntered(true);
      return;
    }
    // Doble rAF: garantiza que el navegador pinte el estado inicial (opacity 0)
    // antes de aplicar el estado final, para que la transición CSS sí se vea.
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <div
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Envuelve las <Routes> de App.tsx: al cambiar de pathname, hace scroll
 * instantáneo al tope (ningún estudiante debería aterrizar a mitad de la
 * página anterior) y reproduce la transición de entrada. No toca el
 * Suspense/lazy existente: solo se remonta el <div> interno, el boundary de
 * Suspense (padre) permanece intacto.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return <RouteTransitionFrame key={location.pathname}>{children}</RouteTransitionFrame>;
}

export default RouteTransition;
