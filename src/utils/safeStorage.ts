/**
 * Acceso a localStorage/sessionStorage que NUNCA lanza. En modo incógnito de algunos
 * navegadores, con el storage lleno (QuotaExceededError) o con cookies bloqueadas, el simple
 * acceso a `window.localStorage` puede lanzar — y un throw ahí rompería el examen entero.
 */

type StorageKind = 'local' | 'session';

function getStorage(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string, kind: StorageKind = 'local'): string | null {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string, kind: StorageKind = 'local'): boolean {
  try {
    const storage = getStorage(kind);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string, kind: StorageKind = 'local'): void {
  try {
    getStorage(kind)?.removeItem(key);
  } catch {
    // nada que hacer
  }
}
