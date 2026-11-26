/**
 * Detección de dominios de correo mal escritos (gmial.com, hotmal.com, yahoo.con…).
 *
 * Postulantes de 16-20 años escriben el correo en el celular, con autocorrector y apurados.
 * Un dominio mal escrito significa que no podrán volver a entrar (DNI + correo es su
 * identidad), así que sugerimos la corrección antes de guardar. Funciones puras, sin
 * dependencias, para poder probarlas aisladas.
 */

/** Dominios populares en Perú hacia los que sugerimos corregir. */
const DOMINIOS_CONOCIDOS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'live.com',
  'outlook.es',
  'hotmail.es',
];

/** Errores frecuentes vistos en registros reales → dominio correcto. */
const TYPOS_EXACTOS: Record<string, string> = {
  // gmail
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.es': 'gmail.com',
  'gmail.com.pe': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmsil.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'g.mail.com': 'gmail.com',
  // hotmail
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hormail.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'jotmail.com': 'hotmail.com',
  // outlook
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'oulook.com': 'outlook.com',
  'otlook.com': 'outlook.com',
  // yahoo
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  // icloud
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
};

/** Distancia de Levenshtein (dominios cortos: el costo es despreciable). */
function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diag = temp;
    }
  }
  return prev[b.length];
}

/** Normaliza un correo tal como lo guardamos: sin espacios y en minúsculas. */
export function normalizeEmail(email: string): string {
  return email.replace(/\s+/g, '').toLowerCase();
}

/**
 * Devuelve el correo corregido si el dominio parece un error de tipeo de un dominio
 * conocido, o `null` si no hay nada que sugerir (dominio correcto, desconocido o
 * correo incompleto). Ej.: "juan@gmial.com" → "juan@gmail.com".
 */
export function suggestEmailCorrection(email: string): string | null {
  const limpio = normalizeEmail(email);
  const at = limpio.lastIndexOf('@');
  if (at <= 0 || at === limpio.length - 1) return null;

  const usuario = limpio.slice(0, at);
  const dominio = limpio.slice(at + 1);
  if (DOMINIOS_CONOCIDOS.includes(dominio)) return null;

  const exacto = TYPOS_EXACTOS[dominio];
  if (exacto) return `${usuario}@${exacto}`;

  // Sin punto todavía ("gmail", "hotmail"): probablemente lo está escribiendo o se olvidó
  // del ".com"; solo sugerimos si el nombre coincide exacto con un proveedor conocido.
  if (!dominio.includes('.')) {
    const proveedor = DOMINIOS_CONOCIDOS.find(d => d.split('.')[0] === dominio);
    return proveedor ? `${usuario}@${proveedor}` : null;
  }

  // Coincidencia aproximada: a 1-2 ediciones de un dominio conocido (evita sugerir sobre
  // dominios institucionales legítimos como unap.edu.pe, que quedan lejos de todos).
  let mejor: string | null = null;
  let mejorDist = Infinity;
  for (const d of DOMINIOS_CONOCIDOS) {
    const dist = distancia(dominio, d);
    if (dist < mejorDist) {
      mejorDist = dist;
      mejor = d;
    }
  }
  const umbral = dominio.length >= 9 ? 2 : 1;
  return mejor && mejorDist > 0 && mejorDist <= umbral ? `${usuario}@${mejor}` : null;
}
