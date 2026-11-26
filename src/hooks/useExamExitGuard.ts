import { useCallback, useEffect, useState } from 'react';

/** Marca propia en history.state para reconocer la entrada "trampa" que empujamos. */
const GUARD_MARKER = '__simulaExamGuard';

function currentStateHasGuard(): boolean {
  const state = window.history.state as Record<string, unknown> | null;
  return !!state && state[GUARD_MARKER] === true;
}

function pushGuardEntry(): void {
  if (currentStateHasGuard()) return; // StrictMode / re-montajes: no apilar dos trampas
  const state = (window.history.state as Record<string, unknown> | null) ?? {};
  // Copiamos el state actual (incluye `idx`/`key` de React Router) para que, al volver atrás,
  // el router vea la MISMA ubicación y no desmonte el examen.
  window.history.pushState({ ...state, [GUARD_MARKER]: true }, '', window.location.href);
}

/**
 * Protege el examen en curso contra salidas accidentales:
 *  - `beforeunload` (cerrar pestaña / recargar): el navegador muestra su aviso nativo.
 *  - Botón "atrás" (incluido el gesto de Android): BrowserRouter de react-router 6 no soporta
 *    useBlocker (requiere data router), así que empujamos una entrada extra al historial con
 *    la misma URL; al ir atrás se consume esa entrada, la URL no cambia y abrimos el modal
 *    propio. "Seguir" vuelve a empujar la trampa; "Salir" la desactiva y navega.
 *
 * Conservador: no intercepta los enlaces internos de la app, solo atrás/cerrar.
 */
export function useExamExitGuard(active: boolean) {
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (!active) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Requerido por Chrome/Edge antiguos para mostrar el diálogo
      event.returnValue = '';
    };

    const handlePopState = () => {
      // La entrada trampa se acaba de consumir: estamos en la entrada original del examen.
      if (!currentStateHasGuard()) {
        setShowExitModal(true);
      }
    };

    pushGuardEntry();
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [active]);

  /** "Seguir en el examen": cierra el modal y vuelve a armar la trampa del botón atrás. */
  const stay = useCallback(() => {
    setShowExitModal(false);
    pushGuardEntry();
  }, []);

  /** "Salir": cierra el modal; el llamador navega (la trampa ya fue consumida por el atrás). */
  const dismiss = useCallback(() => {
    setShowExitModal(false);
  }, []);

  return { showExitModal, stay, dismiss };
}
