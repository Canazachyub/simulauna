/**
 * Identidad recordada del postulante (DNI + correo) para PRE-LLENAR formularios.
 *
 * Ojo: esto NO es una sesión ni otorga acceso. AuthContext (login) significa "acceso ya
 * verificado" para el Banqueo (PracticeSession salta checkBanqueoAccess si hay sesión), así
 * que el registro del simulacro gratuito no debe iniciar esa sesión. Aquí solo guardamos
 * los datos para que el alumno no los vuelva a escribir: cada pantalla sigue verificando
 * su propio acceso contra el backend.
 *
 * Caduca en 7 días (celulares compartidos en familia) y todo acceso a localStorage va en
 * try/catch (modo privado o almacenamiento bloqueado).
 */

const STORAGE_KEY = 'simulauna_identidad';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface RememberedIdentity {
  dni: string;
  email: string;
}

export function readRememberedIdentity(): RememberedIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedIdentity & { savedAt?: number };
    if (!parsed.dni || !parsed.email || !parsed.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { dni: parsed.dni, email: parsed.email };
  } catch {
    return null;
  }
}

export function rememberIdentity(dni: string, email: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dni, email, savedAt: Date.now() }));
  } catch {
    // Sin almacenamiento disponible: simplemente no recordamos.
  }
}
