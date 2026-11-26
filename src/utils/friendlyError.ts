/**
 * Traductor ÚNICO de errores técnicos a mensajes en español simple para el postulante.
 *
 * Por qué existe: antes la UI mostraba tal cual "Failed to fetch", "Error HTTP: 503" o
 * "Error: Hoja \"config_escala\" no encontrada" — mensajes que no le dicen nada a un
 * estudiante. Todas las funciones de `services/api.ts` lanzan ya un `FriendlyError` con el
 * mensaje traducido, y los componentes (ExamConfirmation, Quiz, Results…) pueden volver a
 * pasar cualquier `unknown` por `friendlyError()` sin riesgo: un `FriendlyError` sale intacto.
 *
 * Regla: los mensajes del backend que YA están escritos para humanos (validación, fraude,
 * cuota de simulacros, sesión expirada, Aula…) pasan tal cual (ver HUMAN_MESSAGE_PATTERNS,
 * sacados de google-apps-script/*.gs). Todo lo demás que venga del servidor se trata como
 * técnico y se reemplaza por un mensaje genérico amable.
 */

export const MSG_RED_LENTA = 'Tu conexión está lenta o el servidor está despertando. Intenta otra vez en unos segundos.';
export const MSG_SIN_CONEXION = 'No pudimos conectarnos. Revisa tu conexión a internet e intenta otra vez.';
export const MSG_SERVIDOR = 'El servidor tuvo un problema momentáneo. Intenta otra vez en unos segundos.';
export const MSG_SOLICITUD = 'No pudimos completar la solicitud. Recarga la página e intenta otra vez.';
export const MSG_DESCONOCIDO = 'Algo salió mal de nuestro lado. Intenta otra vez en unos segundos.';
export const MSG_CONFIGURACION = 'La plataforma no está disponible en este momento. Escríbenos por WhatsApp y lo resolvemos.';

/** Error cuyo `message` ya es apto para mostrarse al postulante. */
export class FriendlyError extends Error {
  /** true si vale la pena reintentar automáticamente (red, timeout, 5xx). */
  readonly retriable: boolean;

  constructor(message: string, retriable = false) {
    super(message);
    this.name = 'FriendlyError';
    this.retriable = retriable;
  }
}

/** Respuesta HTTP no-ok (`response.ok === false`). Se traduce según el status. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Error HTTP: ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Timeout del AbortController de fetchWithTimeout/submitExam. */
export class TimeoutError extends Error {
  constructor() {
    super('La solicitud tardó demasiado tiempo.');
    this.name = 'TimeoutError';
  }
}

// Mensajes del backend (y del mock) que ya son para humanos — se muestran tal cual.
// Fuente: throws / reasons / createErrorResponse de google-apps-script/*.gs.
const HUMAN_MESSAGE_PATTERNS: RegExp[] = [
  /configuraci[oó]n de puntajes .* en revisi[oó]n/i, // config_guard.gs: config inválida y sin respaldo
  /sesi[oó]n de examen/i,                       // scoring.gs: sesión no encontrada o expirada
  /no hay preguntas disponibles/i,              // scoring.gs / questions.gs
  /no hay configuraci[oó]n de examen/i,         // questions.gs
  /no hay configuraci[oó]n disponible/i,        // mock getConfig/getExam
  /universidad no v[aá]lida/i,                  // main.gs resolveTenantOrThrow_
  /ya realizaste tu simulacro/i,                // users.gs / adapter_una.gs (cuota)
  /ya registrados con datos distintos/i,        // users.gs (fraude)
  /dni y email no coinciden/i,                  // aula.gs
  /dni requerido/i,                             // users.gs / aula.gs
  /ciclo no v[aá]lido/i,                        // aula.gs
  /ya cerr[oó] inscripciones/i,                 // aula.gs
  /exclusivo para usuarios inscritos/i,         // users.gs banqueo
  /aula virtual todav[ií]a no est[aá] habilitada/i, // api.ts friendlyAulaErrorMessage
  /curso no v[aá]lido/i,                        // adapter_una.gs / questions.gs
  /no existe para/i,                            // mock getExam: división inexistente
  // Mensajes públicos del backend endurecido (core.gs publicError_ / MSG_*_)
  /ocurri[oó] un error en el servidor/i,        // MSG_ERROR_GENERICO_
  /hay mucha gente en este momento/i,           // MSG_OCUPADO_
  /no pudimos verificar tus datos/i,            // MSG_VERIFICACION_NO_DISPONIBLE_
  /email requerido/i,
  /correo vinculado/i,
  /estamos preparando la informaci[oó]n/i,
  /necesitamos tu dni y correo/i,
  /ingresa con tu dni y correo/i,
  /no tienes acceso/i,
  /demasiadas respuestas/i,
  /puntaje inv[aá]lido/i,
  /pertenece a otro estudiante/i,
  /no corresponde a esta universidad/i,
  /servicio no configurado/i,
  /[aá]rea ".*" no v[aá]lida/i,
];

// Señales inequívocas de mensaje técnico (aunque coincidan parcialmente con algo humano).
const TECHNICAL_MESSAGE_PATTERNS: RegExp[] = [
  /hoja\s+"/i,
  /spreadsheet|CORE_SPREADSHEET_ID|setupCore/i,
  /par[aá]metros?\s+"/i,
  /acci[oó]n no v[aá]lida/i,
  /body json/i,
  /token/i,
  /requiere m[eé]todo/i,
  /exception|undefined|null|stack|TypeError|ReferenceError|SyntaxError/i,
  /service invoked too many times|quota|l[ií]mite de servicio/i,
];

function stripErrorPrefix(message: string): string {
  // Apps Script devuelve `error.toString()` → "Error: …" / "Exception: …"
  return message.replace(/^(Error|Exception|TypeError):\s*/i, '').trim();
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch() rechaza con TypeError ante fallas de red/CORS
  if (error instanceof Error) {
    return /failed to fetch|networkerror|load failed|network request failed/i.test(error.message);
  }
  return false;
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.name === 'TimeoutError' || /tard[oó] demasiado|timeout|timed out/i.test(error.message);
  }
  return false;
}

/** Traduce un mensaje de texto (normalmente `result.error` del backend). */
export function friendlyMessage(raw: string | null | undefined): string {
  if (!raw) return MSG_DESCONOCIDO;
  const message = stripErrorPrefix(String(raw));
  if (!message) return MSG_DESCONOCIDO;
  if (TECHNICAL_MESSAGE_PATTERNS.some(re => re.test(message))) return MSG_DESCONOCIDO;
  if (HUMAN_MESSAGE_PATTERNS.some(re => re.test(message))) return message;
  return MSG_DESCONOCIDO;
}

/**
 * Convierte cualquier error en un mensaje en español simple listo para la UI.
 * Idempotente: pasar dos veces el mismo error da el mismo texto.
 */
export function friendlyError(err: unknown): string {
  if (err instanceof FriendlyError) return err.message;
  if (isTimeoutError(err)) return MSG_RED_LENTA;
  if (isNetworkError(err)) return MSG_SIN_CONEXION;
  if (err instanceof HttpError) {
    if (err.status >= 500) return MSG_SERVIDOR;
    if (err.status === 429) return MSG_RED_LENTA;
    return MSG_SOLICITUD;
  }
  // Apps Script a veces responde HTML (página de login/cuota) en vez de JSON → JSON.parse falla
  if (err instanceof SyntaxError) return MSG_SERVIDOR;
  if (err instanceof Error) return friendlyMessage(err.message);
  if (typeof err === 'string') return friendlyMessage(err);
  return MSG_DESCONOCIDO;
}

/** ¿Conviene reintentar automáticamente? Red, timeout, 5xx/429 y respuestas no-JSON: sí. */
export function isRetriableError(err: unknown): boolean {
  // El backend responde success:false con MSG_OCUPADO_ cuando no obtiene el lock: es transitorio.
  if (err instanceof Error && /hay mucha gente en este momento/i.test(err.message)) return true;
  if (err instanceof FriendlyError) return err.retriable;
  if (err instanceof HttpError) return err.status >= 500 || err.status === 429;
  if (err instanceof SyntaxError) return true;
  return isTimeoutError(err) || isNetworkError(err);
}

/** Envuelve cualquier error en un FriendlyError (conserva si es reintentable). */
export function toFriendlyError(err: unknown): FriendlyError {
  if (err instanceof FriendlyError) return err;
  return new FriendlyError(friendlyError(err), isRetriableError(err));
}
