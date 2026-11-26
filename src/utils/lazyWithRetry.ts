import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { safeGetItem, safeSetItem } from './safeStorage';

/**
 * Carga diferida de rutas resistente a deploys.
 *
 * Problema: cada `npm run build` cambia los hashes de los chunks (Quiz-abc123.js →
 * Quiz-def456.js) y GitHub Pages borra los viejos. Un alumno que tenía la pestaña abierta
 * desde antes del deploy pide el chunk viejo → 404 → "Failed to fetch dynamically imported
 * module" → pantalla en blanco.
 *
 * Solución: reintentar el import una vez (por si fue un corte de red momentáneo) y, si el
 * error es de carga de chunk, recargar la página UNA sola vez para traer el index.html nuevo.
 * El flag en sessionStorage guarda la hora de la última recarga para no entrar en bucle si el
 * chunk está roto de verdad: en ese caso el error sube al ErrorBoundary.
 */

const RELOAD_FLAG_KEY = 'simulauna_chunk_reload_at';
/** Ventana en la que NO se vuelve a recargar automáticamente. */
const RELOAD_COOLDOWN_MS = 60_000;

const CHUNK_ERROR_RE =
  /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|loading (css )?chunk [\w-]+ failed|chunkloaderror|unable to preload css|dynamically imported module/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'ChunkLoadError' || CHUNK_ERROR_RE.test(error.message);
}

/**
 * Recarga la página una sola vez por ventana de cooldown. Devuelve true si disparó la recarga
 * (el llamador no debe seguir), false si ya se recargó hace poco (dejar que el error suba).
 */
export function reloadOnceForChunkError(): boolean {
  const last = Number(safeGetItem(RELOAD_FLAG_KEY, 'session') || 0);
  if (last && Date.now() - last < RELOAD_COOLDOWN_MS) return false;
  const saved = safeSetItem(RELOAD_FLAG_KEY, String(Date.now()), 'session');
  // Sin sessionStorage no podemos garantizar "una sola vez": mejor no recargar.
  if (!saved) return false;
  window.location.reload();
  return true;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (firstError) {
      // Segundo intento: cubre cortes de red momentáneos.
      try {
        await wait(1000);
        return await factory();
      } catch (secondError) {
        if (isChunkLoadError(secondError) || isChunkLoadError(firstError)) {
          if (reloadOnceForChunkError()) {
            // La página se está recargando: no resolvemos nunca para no parpadear un error.
            return new Promise<{ default: T }>(() => {});
          }
        }
        throw secondError;
      }
    }
  });
}
