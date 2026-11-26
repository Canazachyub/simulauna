/**
 * SimulaUNA - CORE
 * ============================================
 * Resolucion de tenant (universidad), registro maestro, cache namespaced
 * y utilidades genericas compartidas por todo el backend.
 *
 * IMPORTANTE (orden de carga en Apps Script):
 * Todos los .gs de un proyecto comparten un unico scope global y NO hay
 * imports. Los `const` de nivel superior de este archivo NUNCA dependen
 * de constantes definidas en otros archivos (para evitar "usada antes de
 * su definicion" segun el orden de carga). Las referencias cruzadas
 * (p.ej. a CURSOS_CANONICOS / CURSOS_INVALIDOS, definidas en
 * adapter_una.gs) solo ocurren DENTRO de cuerpos de funcion, que se
 * ejecutan en tiempo de peticion, cuando todos los archivos ya cargaron.
 */

// ============================================
// SCRIPT PROPERTIES
// ============================================
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 'CONFIGURAR_EN_SCRIPT_PROPERTIES';
const CORE_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('CORE_SPREADSHEET_ID') || '';

// ============================================
// RESOLUCION DE TENANT
// ============================================

/**
 * Normaliza el codigo de universidad recibido por querystring.
 * Ausente/vacio -> 'una' (compatibilidad total con el frontend legado).
 */
function normalizeUniversidadCode_(codigo) {
  const code = (codigo || '').toString().trim().toLowerCase();
  return code || 'una';
}

/**
 * Devuelve la informacion del tenant (universidad) para el codigo dado.
 * - 'una' SIEMPRE resuelve al spreadsheet legado (SPREADSHEET_ID) con
 *   layout 'legacy', incluso si el CORE no esta configurado o no tiene
 *   la fila 'una' registrada todavia. Esto garantiza que UNA Puno nunca
 *   se caiga por un problema en el CORE.
 * - Otras universidades resuelven contra la hoja `universidades` del CORE.
 *   Devuelve null si el codigo no existe o su estado no es activa|piloto.
 *
 * @param {string} codigo
 * @returns {{codigo:string, nombre:string, nombreCorto:string, spreadsheetId:string,
 *            layout:'legacy'|'v2', estado:string, procesos:string[], cepreNombre:string,
 *            colorPrimario:string, colorSecundario:string, logo:string, orden:number}|null}
 */
function getTenant(codigo) {
  const code = normalizeUniversidadCode_(codigo);

  let registryEntry = null;
  try {
    const registro = getUniversidadesRegistro_();
    registryEntry = registro.filter(function (u) { return u.codigo === code; })[0] || null;
  } catch (err) {
    // El CORE puede no estar configurado todavia (transicion); no debe
    // afectar a 'una', y para otras universidades se traduce en "no existe".
    registryEntry = null;
  }

  if (code === 'una') {
    return {
      codigo: 'una',
      nombre: (registryEntry && registryEntry.nombre) || 'Universidad Nacional del Altiplano',
      nombreCorto: (registryEntry && registryEntry.nombreCorto) || 'UNA Puno',
      spreadsheetId: SPREADSHEET_ID, // SIEMPRE el legado, nunca depende del CORE
      layout: 'legacy',
      estado: 'activa',
      procesos: (registryEntry && registryEntry.procesos && registryEntry.procesos.length) ? registryEntry.procesos : ['ORDINARIO', 'CEPRE'],
      cepreNombre: (registryEntry && registryEntry.cepreNombre) || 'CEPREUNA',
      colorPrimario: registryEntry ? registryEntry.colorPrimario : '',
      colorSecundario: registryEntry ? registryEntry.colorSecundario : '',
      logo: registryEntry ? registryEntry.logo : '',
      orden: registryEntry ? registryEntry.orden : 0
    };
  }

  if (!registryEntry) return null;
  if (registryEntry.estado !== 'activa' && registryEntry.estado !== 'piloto') return null;
  if (!registryEntry.spreadsheetId) return null;

  return {
    codigo: registryEntry.codigo,
    nombre: registryEntry.nombre,
    nombreCorto: registryEntry.nombreCorto,
    spreadsheetId: registryEntry.spreadsheetId,
    layout: 'v2',
    estado: registryEntry.estado,
    procesos: registryEntry.procesos,
    cepreNombre: registryEntry.cepreNombre,
    colorPrimario: registryEntry.colorPrimario,
    colorSecundario: registryEntry.colorSecundario,
    logo: registryEntry.logo,
    orden: registryEntry.orden
  };
}

/**
 * Lee (con cache 30 min) la hoja `universidades` del CORE_SPREADSHEET_ID.
 * Lanza excepcion si el CORE no esta configurado o la hoja no existe;
 * los llamadores deben capturarla y degradar con gracia.
 */
function getUniversidadesRegistro_() {
  const CACHE_KEY = 'core:universidades';
  const cached = getCachedJson(CACHE_KEY);
  if (cached) return cached;

  if (!CORE_SPREADSHEET_ID) {
    throw new Error('CORE_SPREADSHEET_ID no configurado en Script Properties. Ejecuta setupCore() primero.');
  }

  const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('universidades');
  if (!sheet) {
    throw new Error('Hoja "universidades" no encontrada en el spreadsheet CORE');
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(function (h) { return String(h).trim(); });
  const idx = {
    codigo: headers.indexOf('codigo'),
    nombre: headers.indexOf('nombre'),
    nombreCorto: headers.indexOf('nombre_corto'),
    spreadsheetId: headers.indexOf('spreadsheet_id'),
    estado: headers.indexOf('estado'),
    procesos: headers.indexOf('procesos'),
    cepreNombre: headers.indexOf('cepre_nombre'),
    colorPrimario: headers.indexOf('color_primario'),
    colorSecundario: headers.indexOf('color_secundario'),
    logo: headers.indexOf('logo'),
    orden: headers.indexOf('orden')
  };

  const registro = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const codigo = String(row[idx.codigo] || '').trim().toLowerCase();
    if (!codigo) continue;

    registro.push({
      codigo: codigo,
      nombre: row[idx.nombre] || '',
      nombreCorto: row[idx.nombreCorto] || '',
      spreadsheetId: row[idx.spreadsheetId] || '',
      estado: String(row[idx.estado] || '').trim().toLowerCase() || 'oculta',
      procesos: String(row[idx.procesos] || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean),
      cepreNombre: row[idx.cepreNombre] || '',
      colorPrimario: row[idx.colorPrimario] || '',
      colorSecundario: row[idx.colorSecundario] || '',
      logo: row[idx.logo] || '',
      orden: Number(row[idx.orden]) || 0
    });
  }

  setCachedJson(CACHE_KEY, registro, 1800);
  return registro;
}

/**
 * Action `getUniversidades`: lista publica para el selector de universidad.
 * Excluye estado='oculta'. Si el CORE no esta disponible, degrada a una
 * lista con solo 'una' para que el selector nunca quede vacio.
 */
function getUniversidadesPublicList() {
  let registro;
  try {
    registro = getUniversidadesRegistro_();
  } catch (err) {
    registro = [];
  }

  if (!registro.some(function (u) { return u.codigo === 'una'; })) {
    registro = registro.concat([{
      codigo: 'una',
      nombre: 'Universidad Nacional del Altiplano',
      nombreCorto: 'UNA Puno',
      estado: 'activa',
      procesos: ['ORDINARIO', 'CEPRE'],
      cepreNombre: 'CEPREUNA',
      colorPrimario: '',
      colorSecundario: '',
      logo: '',
      orden: 0
    }]);
  }

  return registro
    .filter(function (u) { return u.estado !== 'oculta'; })
    .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); })
    .map(function (u) {
      return {
        codigo: u.codigo,
        nombre: u.nombre,
        nombreCorto: u.nombreCorto,
        estado: u.estado,
        procesos: u.procesos,
        cepreNombre: u.cepreNombre,
        colores: { primario: u.colorPrimario || '', secundario: u.colorSecundario || '' },
        logo: u.logo || '',
        orden: u.orden || 0
      };
    });
}

// ============================================
// CACHE NAMESPACED (<universidad>:<recurso>, TTL 1800s)
// ============================================

/** Construye una clave de cache con namespace por universidad. */
function cacheKey(universidad, recurso) {
  return normalizeUniversidadCode_(universidad) + ':' + recurso;
}

function getCachedJson(key) {
  try {
    const cached = CacheService.getScriptCache().get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    // Valor corrupto o CacheService caído: se trata como "no hay cache".
    console.error('getCachedJson(' + key + ') falló: ' + err);
    return null;
  }
}

/**
 * Guarda un JSON en cache. NUNCA lanza: CacheService limita cada valor a
 * 100KB y un agregado grande (p.ej. aula:<u>:<ciclo>) no debe tumbar la
 * petición solo porque no entró en cache (se recalcula la próxima vez).
 */
function setCachedJson(key, value, ttlSeconds) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), ttlSeconds || 1800);
  } catch (err) {
    console.error('setCachedJson(' + key + ') no se pudo cachear (¿>100KB?): ' + err);
  }
}

// ============================================
// CACHE GRANDE (bancos de preguntas): JSON gzip + base64 repartido en trozos
// ============================================
// CacheService limita cada valor a 100 KB; una hoja Banco_* pesa varios cientos de KB.
// Se guarda comprimida y partida en trozos de 90 000 caracteres bajo <key>#0..n y el número de
// trozos en <key>#n. Rendimiento (2026-11-26): getExam pasaba de 8–11 s leyendo 18 hojas a ~1–2 s
// con la cache caliente. Tras editar/importar bancos: ejecutar limpiarCacheBancos() (este archivo).

const BIG_CACHE_CHUNK_ = 90000;
const BANCO_CACHE_TTL_ = 21600; // 6 h (máximo de CacheService)

/** Versión de la cache de bancos (Script Property BANCO_CACHE_VER): cambiarla invalida todo de golpe. */
function bancoCacheVer_() {
  try {
    return PropertiesService.getScriptProperties().getProperty('BANCO_CACHE_VER') || 'v1';
  } catch (err) {
    return 'v1';
  }
}

/**
 * Ejecutar en el editor DESPUÉS de importar o editar preguntas en Banco_* / CEPRE_*: invalida la
 * cache de bancos (si no, los cambios tardan hasta 6 h en verse) y la vuelve a llenar.
 */
function limpiarCacheBancos() {
  PropertiesService.getScriptProperties().setProperty('BANCO_CACHE_VER', 'v' + Date.now());
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let n = 0;
  ss.getSheets().forEach(function (sh) {
    const nombre = sh.getName();
    if (nombre.indexOf('Banco_') === 0 || nombre.indexOf('CEPRE_') === 0) {
      leerHojaBancoCacheada_(ss, nombre);
      n++;
    }
  });
  console.log('Cache de bancos renovada: ' + n + ' hojas precargadas.');
}

function setCachedBig_(key, value, ttlSeconds) {
  try {
    const gz = Utilities.gzip(Utilities.newBlob(JSON.stringify(value), 'application/json'));
    const b64 = Utilities.base64Encode(gz.getBytes());
    const partes = {};
    let n = 0;
    for (let i = 0; i < b64.length; i += BIG_CACHE_CHUNK_) {
      partes[key + '#' + n] = b64.slice(i, i + BIG_CACHE_CHUNK_);
      n++;
    }
    partes[key + '#n'] = String(n);
    CacheService.getScriptCache().putAll(partes, ttlSeconds || BANCO_CACHE_TTL_);
  } catch (err) {
    console.error('setCachedBig_(' + key + ') no se pudo cachear: ' + err);
  }
}

function getCachedBig_(key) {
  try {
    const cache = CacheService.getScriptCache();
    const n = parseInt(cache.get(key + '#n'), 10);
    if (!n) return null;
    const claves = [];
    for (let i = 0; i < n; i++) claves.push(key + '#' + i);
    const got = cache.getAll(claves);
    let b64 = '';
    for (let i = 0; i < n; i++) {
      const parte = got[key + '#' + i];
      if (parte == null) return null; // un trozo expiró: tratar como miss
      b64 += parte;
    }
    const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip');
    return JSON.parse(Utilities.ungzip(blob).getDataAsString('UTF-8'));
  } catch (err) {
    console.error('getCachedBig_(' + key + ') falló: ' + err);
    return null;
  }
}

/**
 * Valores de una hoja del banco (incluida la fila de títulos), desde cache si está caliente.
 * Solo para hojas de SOLO LECTURA en tiempo de petición (Banco_*, CEPRE_*).
 */
// Memoria de la ejecución actual (se llena con precargarBancosCache_).
const BANCOS_MEMO_ = {};

function bancoCacheKey_(ss, sheetName) {
  return 'banco:' + bancoCacheVer_() + ':' + ss.getId().slice(-8) + ':' + sheetName;
}

/** Trae de CacheService varias hojas de banco en DOS llamadas getAll y las deja en BANCOS_MEMO_. */
function precargarBancosCache_(ss, sheetNames) {
  try {
    const cache = CacheService.getScriptCache();
    const keys = sheetNames.map(function (n) { return bancoCacheKey_(ss, n); });
    const nums = cache.getAll(keys.map(function (k) { return k + '#n'; }));
    const partes = [];
    keys.forEach(function (k) {
      const n = parseInt(nums[k + '#n'], 10);
      for (let i = 0; i < (n || 0); i++) partes.push(k + '#' + i);
    });
    if (!partes.length) return;
    const got = cache.getAll(partes);
    keys.forEach(function (k) {
      const n = parseInt(nums[k + '#n'], 10);
      if (!n) return;
      let b64 = '';
      for (let i = 0; i < n; i++) {
        const p = got[k + '#' + i];
        if (p == null) return; // trozo expirado: esa hoja se leerá normal
        b64 += p;
      }
      try {
        const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip');
        BANCOS_MEMO_[k] = JSON.parse(Utilities.ungzip(blob).getDataAsString('UTF-8'));
      } catch (err) { /* se leerá normal */ }
    });
  } catch (err) {
    console.error('precargarBancosCache_ falló: ' + err);
  }
}

function leerHojaBancoCacheada_(ss, sheetName) {
  const key = bancoCacheKey_(ss, sheetName);
  if (BANCOS_MEMO_[key]) return BANCOS_MEMO_[key];
  const cached = getCachedBig_(key);
  if (cached) return cached;
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  // Las fechas no sobreviven a JSON: se guardan ya como las formatea formatCellValue ("d-m").
  const data = sheet.getDataRange().getValues().map(function (fila) {
    return fila.map(function (c) { return c instanceof Date ? formatCellValue(c) : c; });
  });
  setCachedBig_(key, data, BANCO_CACHE_TTL_);
  return data;
}

/**
 * Anti-estampida de cache: si `key` no está en cache, SOLO UNA ejecución
 * reconstruye el valor (marca 'rebuild:<key>' puesta bajo un ScriptLock
 * cortísimo, solo para el test-and-set de la marca; la reconstrucción
 * pesada corre FUERA del lock para no bloquear registros/submits). Las
 * demás esperan hasta ~20 s releyendo la cache; si el constructor falló
 * (la marca desapareció sin valor) reconstruyen ellas mismas; si se agota
 * la espera, responden un mensaje amable para reintentar.
 */
function getOrBuildCachedJson_(key, ttlSeconds, builder) {
  const cached = getCachedJson(key);
  if (cached) return cached;

  // Dentro de otra sección bajo lock: construir directo (no anidar locks).
  if (scriptLockHeld_) {
    const direct = builder();
    setCachedJson(key, direct, ttlSeconds);
    return direct;
  }

  const cache = CacheService.getScriptCache();
  const flagKey = 'rebuild:' + key;
  let soyConstructor = false;

  const lock = LockService.getScriptLock();
  if (lock.tryLock(3000)) {
    try {
      const again = getCachedJson(key);
      if (again) return again;
      if (!cache.get(flagKey)) {
        cache.put(flagKey, '1', 360);
        soyConstructor = true;
      }
    } finally {
      lock.releaseLock();
    }
  } else {
    // Lock muy disputado: test-and-set best effort (no atómico).
    soyConstructor = !cache.get(flagKey);
    if (soyConstructor) cache.put(flagKey, '1', 360);
  }

  if (!soyConstructor) {
    const limite = Date.now() + 20000;
    while (Date.now() < limite) {
      Utilities.sleep(500);
      const ready = getCachedJson(key);
      if (ready) return ready;
      if (!cache.get(flagKey)) break; // el constructor terminó sin valor (falló): construir aquí
    }
    if (cache.get(flagKey)) {
      throw publicError_('Estamos preparando la información, intenta en unos segundos.');
    }
    const fallback = builder();
    setCachedJson(key, fallback, ttlSeconds);
    return fallback;
  }

  try {
    const built = builder();
    setCachedJson(key, built, ttlSeconds);
    return built;
  } finally {
    try { cache.remove(flagKey); } catch (err) { /* la marca expira sola */ }
  }
}

// ============================================
// FLAGS (Script Properties) — ver DEPLOY_FASE1.md
// ============================================
//
// Cada flag es una Script Property con valor 'true' / 'false'. Si falta o
// está vacía se usa el default de código, elegido para PRESERVAR el
// comportamiento que el frontend publicado espera hoy.
//   LEGACY_QUESTIONS_ENABLED (default false): action legada `questions`.
//   SAVE_SCORE_ENABLED       (default true):  action legada `saveScore`.
//   ENFORCE_ACCESS_SERVER    (default false): getExam / banqueo / CEPRE
//                                             exigen dni+email y validan acceso.
//   REQUIRE_EMAIL_FOR_READS  (default false): getHistory / getMisPagos
//                                             exigen email del titular.

let flagsMemo_ = null;

function getFlag_(name, defaultValue) {
  try {
    if (!flagsMemo_) flagsMemo_ = PropertiesService.getScriptProperties().getProperties() || {};
    const raw = flagsMemo_[name];
    if (raw === undefined || raw === null || String(raw).trim() === '') return defaultValue;
    const v = String(raw).trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'si' || v === 'sí') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
    return defaultValue;
  } catch (err) {
    console.error('getFlag_(' + name + ') falló, uso default: ' + err);
    return defaultValue;
  }
}

// ============================================
// ERRORES PÚBLICOS vs INTERNOS
// ============================================
//
// handleRequest_ (main.gs) solo muestra al cliente:
//  - strings lanzados con `throw '...'` (mensajes de negocio ya existentes), o
//  - errores creados con publicError_('...').
// Cualquier otra excepción (Sheets, permisos, bugs) se loguea con
// console.error y el cliente recibe MSG_ERROR_GENERICO_.

const MSG_ERROR_GENERICO_ = 'Ocurrió un error en el servidor. Intenta nuevamente en unos minutos.';
const MSG_OCUPADO_ = 'Hay mucha gente en este momento, intenta en unos segundos';
const MSG_VERIFICACION_NO_DISPONIBLE_ = 'No pudimos verificar tus datos en este momento. Intenta en unos minutos.';

function publicError_(message) {
  const err = new Error(message);
  err.publico = true;
  return err;
}

// ============================================
// CONCURRENCIA (LockService)
// ============================================

// true mientras ESTA ejecución tiene el ScriptLock: las secciones anidadas
// (p.ej. registerUserV2 -> unaRegisterUser) corren directo sin volver a
// pedir el lock.
let scriptLockHeld_ = false;

/**
 * Ejecuta `fn` bajo LockService.getScriptLock(). Si no obtiene el lock en
 * `timeoutMs`, lanza un error público amable. Hace SpreadsheetApp.flush()
 * antes de soltar el lock para que la siguiente ejecución lea lo escrito.
 * Mantener `fn` lo más corta posible (solo leer-decidir-escribir).
 */
function withScriptLock_(timeoutMs, fn) {
  if (scriptLockHeld_) return fn();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(timeoutMs || 10000)) {
    console.error('[LOCK] No se obtuvo el ScriptLock en ' + (timeoutMs || 10000) + ' ms');
    throw publicError_(MSG_OCUPADO_);
  }
  scriptLockHeld_ = true;
  try {
    return fn();
  } finally {
    scriptLockHeld_ = false;
    try { SpreadsheetApp.flush(); } catch (err) { /* nada que hacer */ }
    lock.releaseLock();
  }
}

// ============================================
// VALIDACIÓN DE ENTRADA Y ESCRITURA SEGURA EN SHEETS
// ============================================

const DNI_REGEX_ = /^\d{8}$/;
const EMAIL_REGEX_ = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LEN_ = 120;
const PARAM_MAX_LEN_ = 500;

function isValidDni_(dni) {
  return DNI_REGEX_.test(String(dni === null || dni === undefined ? '' : dni).trim());
}

function isValidEmail_(email) {
  const e = String(email === null || email === undefined ? '' : email).trim();
  return e.length > 0 && e.length <= EMAIL_MAX_LEN_ && EMAIL_REGEX_.test(e);
}

/**
 * Valida los parámetros comunes de cualquier action. Devuelve un mensaje
 * de error para humanos, o null si todo está bien. Solo valida lo que
 * VIENE (dni/email son opcionales en varias actions).
 */
function validateCommonParams_(params) {
  const keys = Object.keys(params || {});
  for (let i = 0; i < keys.length; i++) {
    const v = params[keys[i]];
    if (typeof v === 'string' && v.length > PARAM_MAX_LEN_) {
      return 'Datos demasiado largos. Revisa lo que ingresaste.';
    }
  }
  if (params.dni !== undefined && params.dni !== null && String(params.dni).trim() !== '') {
    if (!isValidDni_(params.dni)) return 'DNI inválido: debe tener 8 dígitos.';
  }
  if (params.email !== undefined && params.email !== null && String(params.email).trim() !== '') {
    if (!isValidEmail_(params.email)) return 'Correo electrónico inválido.';
  }
  return null;
}

/**
 * Sanea un valor que viene del USUARIO antes de escribirlo en Sheets:
 * recorta a `maxLen` y antepone "'" si empieza con = + - @ (o tab/CR),
 * para que Sheets lo guarde como texto y no lo evalúe como fórmula
 * (inyección de fórmulas / CSV injection). Números, booleanos y fechas
 * se devuelven tal cual.
 */
function safeCell_(value, maxLen) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  let s = String(value);
  if (/^[\t\r]/.test(s)) s = s.replace(/^[\t\r]+/, '');
  s = s.trim();
  if (maxLen && s.length > maxLen) s = s.substring(0, maxLen);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

// ============================================
// TOPES DE CANTIDAD DE PREGUNTAS
// ============================================

const QUESTIONS_DEFAULT_COUNT_ = 20;
const QUESTIONS_MAX_COUNT_ = 100;

/** parseInt seguro con default y tope: nunca devuelve <=0 ni > maxCount. */
function clampCount_(raw, defaultCount, maxCount) {
  const n = parseInt(raw, 10);
  if (!isFinite(n) || n <= 0) return defaultCount;
  return Math.min(n, maxCount);
}

// ============================================
// OPCIONES + RESPUESTA CORRECTA (remapeo al filtrar opciones vacías)
// ============================================

/**
 * Filtra las opciones vacías y REMAPEA el índice de la respuesta correcta
 * al nuevo arreglo (antes se filtraba sin reajustar: si la opción 2 estaba
 * vacía, la correcta "4" apuntaba a la opción equivocada).
 *
 * - correctRaw 1..N y esa opción existe -> {valid:true, correctAnswer:<índice remapeado>}
 * - correctRaw 1..N pero esa opción está VACÍA -> {valid:false} (el llamador omite la pregunta)
 * - correctRaw vacío/no numérico/0 -> comportamiento legado: correctAnswer 0
 * - correctRaw > N -> {valid:false}
 */
function buildOptionsWithAnswer_(rawOptions, correctRaw) {
  const correctNum = parseInt(correctRaw, 10);
  const numeric = isFinite(correctNum) && correctNum > 0;
  const options = [];
  let correctIndex = -1;

  for (let i = 0; i < rawOptions.length; i++) {
    const opt = rawOptions[i];
    if (opt && opt !== '') {
      if (numeric && i === correctNum - 1) correctIndex = options.length;
      options.push(opt);
    }
  }

  if (!numeric) return { options: options, correctAnswer: 0, valid: true };
  if (correctIndex === -1) return { options: options, correctAnswer: -1, valid: false };
  return { options: options, correctAnswer: correctIndex, valid: true };
}

/** Renumera `number` de un arreglo de preguntas tras omitir inválidas. */
function renumberQuestions_(questions, startingNumber) {
  questions.forEach(function (q, i) { q.number = startingNumber + i; });
  return questions;
}

// ============================================
// CURSOS CANONICOS (CORE.cursos_canonicos con fallback a la constante legada)
// ============================================

/**
 * Carga el mapeo variante->canonico desde la hoja `cursos_canonicos` del
 * CORE (cache 30 min, clave 'core:cursos_canonicos'). Si el CORE no esta
 * configurado o la hoja no existe, cae de vuelta a la constante legada
 * CURSOS_CANONICOS (definida en adapter_una.gs) para no romper nada
 * durante la transicion.
 */
// Memo de ejecución: getCursoCanonical se llama UNA VEZ POR FILA en los
// recorridos de banqueo (miles de filas × 36 hojas); sin esto, cada llamada
// haría una ida y vuelta a CacheService + JSON.parse y getCursosConTemas
// excede el límite de 6 min (regresión detectada en healthCheckCursosConTemas).
let cursosCanonicosMemo_ = null;

function getCursosCanonicosMap_() {
  if (cursosCanonicosMemo_) return cursosCanonicosMemo_;

  const CACHE_KEY = 'core:cursos_canonicos';
  const cached = getCachedJson(CACHE_KEY);
  if (cached) {
    cursosCanonicosMemo_ = cached;
    return cached;
  }

  let map = null;
  try {
    if (CORE_SPREADSHEET_ID) {
      const ss = SpreadsheetApp.openById(CORE_SPREADSHEET_ID);
      const sheet = ss.getSheetByName('cursos_canonicos');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          const headers = data[0].map(function (h) { return String(h).trim().toLowerCase(); });
          const vIdx = headers.indexOf('variante');
          const cIdx = headers.indexOf('canonico');
          if (vIdx !== -1 && cIdx !== -1) {
            map = {};
            for (let i = 1; i < data.length; i++) {
              const variante = String(data[i][vIdx] || '').trim().toLowerCase();
              const canonico = String(data[i][cIdx] || '').trim();
              if (variante && canonico) map[variante] = canonico;
            }
          }
        }
      }
    }
  } catch (err) {
    map = null;
  }

  // Fallback: constante legada definida en adapter_una.gs (referencia en
  // tiempo de ejecucion de funcion, no en tiempo de carga: es segura).
  if (!map || Object.keys(map).length === 0) {
    map = CURSOS_CANONICOS;
  }

  setCachedJson(CACHE_KEY, map, 1800);
  cursosCanonicosMemo_ = map;
  return map;
}

/**
 * Obtiene el nombre canonico de un curso a partir de cualquiera de sus
 * variantes conocidas. Reemplaza la funcion homonima que antes vivia en
 * api.gs, ahora respaldada por la hoja `cursos_canonicos` del CORE.
 * @param {string} cursoRaw
 * @returns {string|null}
 */
function getCursoCanonical(cursoRaw) {
  if (!cursoRaw) return null;

  const normalized = normalizeString(cursoRaw);

  // CURSOS_INVALIDOS esta definida en adapter_una.gs (uso en runtime, seguro).
  if (CURSOS_INVALIDOS.indexOf(normalized) !== -1) {
    return null;
  }

  const map = getCursosCanonicosMap_();
  if (map[normalized]) {
    return map[normalized];
  }

  // Si no esta en el mapeo, se conserva el valor original (tal como hacia api.gs).
  return cursoRaw.toString().trim();
}

// ============================================
// UTILIDADES GENERICAS (sin dependencia de hojas)
// ============================================

// Rango Unicode de marcas diacriticas combinantes (U+0300-U+036F), construido
// via String.fromCharCode para evitar incrustar el caracter literal en el
// codigo fuente (evita problemas de codificacion al copiar/pegar el archivo).
const DIACRITICS_REGEX_ = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

/** Normaliza un string para comparaciones (sin tildes, minusculas, sin espacios extra). */
function normalizeString(str) {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX_, '')
    .replace(/_/g, ' ')
    .trim();
}

/** Mezcla un array usando el algoritmo Fisher-Yates. */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Selecciona N elementos aleatorios de un array (Fisher-Yates + slice). */
function selectRandomItems(array, count) {
  if (count >= array.length) {
    return shuffleArray(array);
  }
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, count);
}

/**
 * Formatea un valor de celda, corrigiendo fechas mal interpretadas por
 * Excel/Sheets (p.ej. "1-10" interpretado como fecha 1 de Octubre) y
 * algunas fracciones comunes.
 */
function formatCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (value instanceof Date) {
    const day = value.getDate();
    const month = value.getMonth() + 1;
    return `${day}-${month}`;
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value);
    }
    const fractions = {
      0.5: '1/2', 0.25: '1/4', 0.75: '3/4',
      0.333: '1/3', 0.667: '2/3', 0.2: '1/5',
      0.4: '2/5', 0.6: '3/5', 0.8: '4/5'
    };
    for (const [decimal, fraction] of Object.entries(fractions)) {
      if (Math.abs(value - parseFloat(decimal)) < 0.01) {
        return fraction;
      }
    }
    return String(value);
  }

  return value;
}
