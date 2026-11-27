/**
 * SimulaUNA - API REST para Google Apps Script (multi-tenant)
 * ============================================
 *
 * INSTRUCCIONES DE CONFIGURACION: ver README.md en esta misma carpeta.
 *
 * REGLA DE ORO: toda action legada SIN parámetro `universidad` responde
 * EXACTAMENTE igual que la producción actual (default 'una', adaptador de
 * hojas legadas en adapter_una.gs). El frontend viejo no debe notar el
 * cambio.
 *
 * Este archivo contiene:
 * - doGet / doPost: punto de entrada, validación de token, parseo de body.
 * - ROUTES: router declarativo { action: { handler, required, method } }.
 * - Los handlers de cada action (dual-mode: legado vs v2 según presencia
 *   del parámetro `universidad`).
 * - createSuccessResponse / createErrorResponse centralizados.
 */

// ============================================
// SEGURIDAD
// ============================================
// FALLA CERRADO: si la Script Property SECRET_TOKEN falta, está vacía o
// sigue en el antiguo valor placeholder 'CAMBIAR_ESTE_TOKEN_SECRETO',
// SECRET_TOKEN queda '' y handleRequest_ rechaza TODO salvo la action
// `test` (health). Antes, en ese caso la validación se desactivaba.
const SECRET_TOKEN = (function () {
  const raw = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || '';
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === 'CAMBIAR_ESTE_TOKEN_SECRETO') return '';
  return String(raw);
})();
const ALLOWED_ORIGINS = [
  'https://simulacros.sinapsispreu.com',
  'https://canazachyub.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173'
];

// ============================================
// ENTRADA HTTP
// ============================================

function doGet(e) {
  // Panel de administración (admin.gs): solo en su implementación propia «como usuario que accede»;
  // adminServe_ verifica correo en ADMIN_EMAILS y responde «Sin acceso» a cualquier otro.
  if (e && e.parameter && e.parameter.vista === 'admin') return adminServe_();
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

/**
 * Maneja tanto doGet como doPost: valida token, resuelve la action contra
 * ROUTES, valida parámetros requeridos y ejecuta el handler. Todo el
 * cuerpo corre en un try/catch: ningún handler debe poder lanzar una
 * excepción sin capturar hacia el cliente.
 */
function handleRequest_(e, method) {
  try {
    e = e || {};
    e.parameter = e.parameter || {};

    const action = e.parameter.action;

    // ---- VALIDACIÓN DE TOKEN (falla cerrado, ver SECRET_TOKEN arriba) ----
    if (!SECRET_TOKEN) {
      if (action === 'test') {
        const health = handleTest_({});
        health.tokenConfigurado = false;
        return createSuccessResponse(health);
      }
      console.error('[SECURITY] SECRET_TOKEN no configurado en Script Properties: petición rechazada (action=' + action + ')');
      return createErrorResponse('Servicio no configurado. Contacta al administrador.');
    }
    const token = String(e.parameter.token || '');
    if (!safeEqualsToken_(token, SECRET_TOKEN)) {
      return createErrorResponse('Acceso no autorizado. Token inválido o faltante.');
    }

    if (!action) {
      return createErrorResponse('Parámetro "action" requerido');
    }

    const route = Object.prototype.hasOwnProperty.call(ROUTES, action) ? ROUTES[action] : null;
    if (!route) {
      // OJO: el frontend (api.ts, isAulaAccionNoValida) detecta este texto
      // exacto para degradar el Aula: NO cambiar "Acción no válida".
      return createErrorResponse('Acción no válida');
    }

    if (route.method && route.method !== 'ANY' && route.method !== method) {
      return createErrorResponse(`La acción "${action}" requiere método ${route.method}`);
    }

    // ---- LOG DE ACCESO (mismo criterio que la versión legada) ----
    if (action === 'questions' || action === 'getBanqueoQuestions' || action === 'getCepreQuestions' || action === 'getExam') {
      console.log('[SECURITY] Acceso a ' + action + ' - Timestamp: ' + new Date().toISOString());
    }

    // ---- BODY JSON (solo POST, p.ej. submitExam) ----
    let body = {};
    if (method === 'POST') {
      try {
        body = (e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
      } catch (parseErr) {
        console.error('Body JSON inválido en ' + action + ': ' + parseErr);
        return createErrorResponse('Body JSON inválido');
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
    }

    const params = (method === 'POST') ? Object.assign({}, e.parameter, body) : e.parameter;
    const hasUniversidad = !!(params.universidad && String(params.universidad).trim() !== '');

    const ctx = { e: e, body: body, params: params, hasUniversidad: hasUniversidad };

    // ---- VALIDACIÓN CENTRALIZADA DE PARÁMETROS REQUERIDOS ----
    if (route.required && route.required.length) {
      const missing = route.required.filter(function (p) {
        const v = params[p];
        return v === undefined || v === null || v === '';
      });
      if (missing.length) {
        return createErrorResponse(formatMissingParamsMessage_(missing));
      }
    }

    // ---- VALIDACIÓN CENTRAL DE ENTRADA (dni 8 dígitos, email, longitudes) ----
    const validationError = validateCommonParams_(params);
    if (validationError) {
      return createErrorResponse(validationError);
    }

    const data = route.handler(ctx);
    return createSuccessResponse(data);

  } catch (error) {
    return createErrorResponse(publicErrorMessage_(error));
  }
}

/**
 * Mensaje que SÍ se le muestra al cliente. Strings lanzados a propósito
 * (`throw 'Universidad no válida'`) y publicError_() pasan tal cual; todo
 * lo demás (errores de Sheets, permisos, bugs) se loguea completo con
 * console.error y el cliente solo recibe un mensaje genérico.
 */
function publicErrorMessage_(error) {
  if (typeof error === 'string') return error;
  if (error && error.publico === true && error.message) return error.message;
  console.error('[ERROR NO CONTROLADO] ' + (error && error.stack ? error.stack : String(error)));
  return MSG_ERROR_GENERICO_;
}

/** Comparación de token en tiempo constante (evita timing attacks triviales). */
function safeEqualsToken_(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (sa.length === 0 || sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

function formatMissingParamsMessage_(missing) {
  const quoted = missing.map(function (m) { return '"' + m + '"'; });
  if (quoted.length === 1) {
    return 'Parámetro ' + quoted[0] + ' requerido';
  }
  const last = quoted.pop();
  return 'Parámetros ' + quoted.join(', ') + ' y ' + last + ' requeridos';
}

/**
 * Resuelve el tenant o lanza (capturado por handleRequest_) con el mensaje
 * EXACTO del contrato: `{success:false, error:'Universidad no válida'}`.
 * Se lanza un string (no `new Error(...)`) para que `error.toString()` en
 * el catch de handleRequest_ no le anteponga el prefijo "Error: ".
 */
function resolveTenantOrThrow_(codigo) {
  const tenant = getTenant(codigo);
  if (!tenant) {
    throw 'Universidad no válida';
  }
  return tenant;
}

// ============================================
// FUNCIONES DE RESPUESTA (centralizadas)
// ============================================

function createSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// HANDLERS - NÚCLEO (v2)
// ============================================

function handleGetUniversidades_(ctx) {
  return getUniversidadesPublicList();
}

function handleGetConfigV2_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getConfigForTenant(tenant, ctx.params.proceso || 'ORDINARIO');
}

function handleTest_(ctx) {
  let universidades = 1;
  try {
    universidades = getUniversidadesPublicList().length;
  } catch (err) {
    universidades = 1;
  }
  return { status: 'ok', version: 'v2', universidades: universidades };
}

// ============================================
// HANDLERS - LEGADAS PURAS (siempre 'una', sin importar `universidad`)
// ============================================

function handleConfigLegacy_(ctx) {
  return unaGetConfig();
}

/**
 * Action legada `questions`: devolvía el examen COMPLETO con correctAnswer
 * (calificación en el cliente). El frontend actual ya usa getExam/submitExam
 * y no la llama; queda apagada salvo LEGACY_QUESTIONS_ENABLED='true'.
 * Apagada responde exactamente igual que una action inexistente.
 */
function handleQuestionsLegacy_(ctx) {
  if (!getFlag_('LEGACY_QUESTIONS_ENABLED', false)) {
    console.warn('[SECURITY] Llamada a action legada "questions" bloqueada (LEGACY_QUESTIONS_ENABLED != true)');
    throw 'Acción no válida';
  }
  return unaGetQuestions(ctx.params.area);
}

function handleGetCepreSimulacroLegacy_(ctx) {
  enforcePracticeAccess_(ctx, 'cepre');
  return unaGetCepreSimulacro(ctx.params.area, ctx.params.semana);
}

function handleGetCepreCoursesLegacy_(ctx) {
  return unaGetCepreCourses(ctx.params.area);
}

function handleGetCepreSemanasLegacy_(ctx) {
  return unaGetCepreSemanas(ctx.params.course, ctx.params.area);
}

// ============================================
// HANDLERS - EXAMEN v2 (getExam / submitExam)
// ============================================

/**
 * getExam. El frontend publicado NO manda dni/email: si vienen, el dni se
 * liga a la sesión (submitExam rechazará otro dni). Con
 * ENFORCE_ACCESS_SERVER='true' se EXIGEN dni+email y se valida en servidor
 * el intento gratis / permiso (checkAccessV2) antes de armar el examen.
 */
function handleGetExam_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  const dni = String(ctx.params.dni || '').trim();
  const email = String(ctx.params.email || '').toLowerCase().trim();

  if (getFlag_('ENFORCE_ACCESS_SERVER', false)) {
    if (!dni || !email) {
      throw publicError_('Para iniciar el simulacro necesitamos tu DNI y correo.');
    }
    const acceso = checkAccessV2(tenant, dni, email);
    if (!acceso.canAccess) {
      throw publicError_(acceso.reason || 'No tienes acceso al simulacro.');
    }
  }

  return getExamForTenant(tenant, ctx.params.division, ctx.params.proceso, ctx.params.semana, dni);
}

const SUBMIT_MAX_ANSWERS_ = 500;

function handleSubmitExam_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.body.universidad);
  const answers = Array.isArray(ctx.body.answers) ? ctx.body.answers : [];
  if (answers.length > SUBMIT_MAX_ANSWERS_) {
    throw publicError_('Demasiadas respuestas en el envío.');
  }
  return submitExamForTenant(tenant, String(ctx.body.examSessionId || ''), String(ctx.body.dni || '').trim(), answers);
}

/**
 * Validación de acceso EN SERVIDOR para banqueo / banqueo por tema / CEPRE.
 * El servicio (`modalidad`) lo fija la acción llamada, NO el cliente: así un
 * permiso de banqueo no abre CEPRE mandando modalidad=banqueo.
 * Solo activa con ENFORCE_ACCESS_SERVER='true' (el frontend manda dni/email
 * en estas llamadas desde la versión de lanzamiento).
 */
function enforcePracticeAccess_(ctx, modalidad) {
  if (!getFlag_('ENFORCE_ACCESS_SERVER', false)) return;

  const dni = String(ctx.params.dni || '').trim();
  const email = String(ctx.params.email || '').toLowerCase().trim();
  if (!dni || !email) {
    throw publicError_('Ingresa con tu DNI y correo para practicar.');
  }

  // Un acceso aprobado se recuerda 10 min (cada tanda de preguntas no relee permisos y
  // usuarios). Un permiso quitado desde el panel deja de valer como máximo a los 10 min.
  const universidadKey = ctx.hasUniversidad ? normalizeUniversidadCode_(ctx.params.universidad) : 'una';
  const cacheKey = ['acc', universidadKey, dni, email, modalidad].join('|');
  let cache = null;
  try { cache = CacheService.getScriptCache(); } catch (err) { cache = null; }
  if (cache && cacheKey.length <= 250 && cache.get(cacheKey) === '1') return;

  const acceso = ctx.hasUniversidad
    ? checkBanqueoAccessV2(resolveTenantOrThrow_(ctx.params.universidad), dni, email, modalidad)
    : unaCheckBanqueoAccess(dni, email);

  if (!acceso || !acceso.canAccess) {
    throw publicError_((acceso && acceso.reason) || 'No tienes acceso a esta práctica.');
  }
  if (cache && cacheKey.length <= 250) {
    try { cache.put(cacheKey, '1', 600); } catch (err) { /* sin caché: se valida en cada pedido */ }
  }
}

// ============================================
// HANDLERS - DUAL MODE (legado byte-idéntico sin `universidad`, v2 con `universidad`)
// ============================================

function handleRegister_(ctx) {
  const dni = ctx.params.dni || '';
  const fullName = ctx.params.fullName || '';
  const email = ctx.params.email || '';
  const phone = ctx.params.phone || '';
  const processType = ctx.params.processType || '';
  const divisionOrArea = ctx.params.area || ctx.params.division || '';
  const career = ctx.params.career || '';

  if (!ctx.hasUniversidad) {
    return unaRegisterUser(dni, fullName, email, phone, processType, divisionOrArea, career);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return registerUserV2(tenant, dni, fullName, email, phone, processType, divisionOrArea, career);
}

// Topes de saveScore (UNA usa escala 3000 y 60 preguntas; margen amplio).
const SAVE_SCORE_MAX_SCORE_ = 10000;
const SAVE_SCORE_MAX_TOTAL_ = 300;

/**
 * saveScore (legada, deprecada): el puntaje lo manda el CLIENTE. Se
 * mantiene activa (SAVE_SCORE_ENABLED default 'true') porque Results.tsx
 * todavía la llama; cuando el frontend deje de llamarla en los flujos que
 * ya pasan por submitExam, poner SAVE_SCORE_ENABLED='false'. Mientras esté
 * activa se validan los rangos para que no se puedan inyectar puntajes
 * absurdos.
 */
function handleSaveScore_(ctx) {
  if (!getFlag_('SAVE_SCORE_ENABLED', true)) {
    return { saved: false, disabled: true, message: 'El puntaje se guarda automáticamente al calificar el examen.' };
  }

  const dni = String(ctx.params.dni || '').trim();
  const score = Number(ctx.params.score);
  const maxScore = Number(ctx.params.maxScore);
  const area = safeCell_(ctx.params.area || '', 60);
  const correct = Number(ctx.params.correct);
  const total = Number(ctx.params.total);

  if (dni) {
    const valoresFinitos = [score, maxScore, correct, total].every(function (n) { return isFinite(n); });
    const rangosOk = valoresFinitos &&
      maxScore > 0 && maxScore <= SAVE_SCORE_MAX_SCORE_ &&
      score >= 0 && score <= maxScore &&
      Math.floor(correct) === correct && Math.floor(total) === total &&
      correct >= 0 && total >= 0 && correct <= total && total <= SAVE_SCORE_MAX_TOTAL_;
    if (!rangosOk) {
      console.warn('[SECURITY] saveScore rechazado por rangos: dni=' + dni + ' score=' + ctx.params.score +
        ' maxScore=' + ctx.params.maxScore + ' correct=' + ctx.params.correct + ' total=' + ctx.params.total);
      throw publicError_('Puntaje inválido.');
    }
  }

  if (!ctx.hasUniversidad) {
    return unaSaveUserScore(dni, score || 0, maxScore || 0, area, correct || 0, total || 0);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return saveScoreForTenant(tenant, dni, score || 0, maxScore || 0, area, correct || 0, total || 0);
}

/**
 * Con REQUIRE_EMAIL_FOR_READS='true', las lecturas de datos personales por
 * DNI (getHistory, getMisPagos) exigen también el email del titular y que
 * coincida con el registrado (evita IDOR: leer el historial de otro DNI).
 * Default 'false' porque el frontend publicado solo manda dni.
 */
function enforceEmailForReads_(ctx, tenantCodigo) {
  if (!getFlag_('REQUIRE_EMAIL_FOR_READS', false)) return;
  const dni = String(ctx.params.dni || '').trim();
  const email = String(ctx.params.email || '').toLowerCase().trim();
  if (!email) throw publicError_('Parámetro "email" requerido');
  const estado = dniEmailOwnership_(tenantCodigo || 'una', dni, email);
  if (estado === 'error') throw publicError_(MSG_VERIFICACION_NO_DISPONIBLE_);
  if (estado !== 'match') throw 'DNI y email no coinciden con el usuario registrado';
}

function handleGetHistory_(ctx) {
  const dni = ctx.params.dni || '';
  enforceEmailForReads_(ctx, ctx.hasUniversidad ? normalizeUniversidadCode_(ctx.params.universidad) : 'una');

  if (!ctx.hasUniversidad) {
    return unaGetUserHistory(dni);
  }

  return getHistoryV2(dni, ctx.params.universidad, ctx.params.proceso);
}

function handleCheckAccess_(ctx) {
  const dni = ctx.params.dni || '';
  const email = ctx.params.email || '';

  if (!ctx.hasUniversidad) {
    return unaCheckUserAccess(dni, email);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return checkAccessV2(tenant, dni, email);
}

function handleCheckBanqueoAccess_(ctx) {
  const dni = ctx.params.dni || '';
  const email = ctx.params.email || '';

  if (!ctx.hasUniversidad) {
    return unaCheckBanqueoAccess(dni, email);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  const acceso = checkBanqueoAccessV2(tenant, dni, email, ctx.params.modalidad);
  // Banqueo y por tema usan el banco general: cualquier banqueo activo (en cualquier universidad)
  // abre la práctica (decisión del dueño, 2026-11-27). CEPRE sigue siendo por universidad.
  const modalidad = String(ctx.params.modalidad || 'banqueo').toLowerCase();
  if (!acceso.canAccess && (modalidad === 'banqueo' || modalidad === 'banqueo_tema') &&
      !/no coinciden|verificar/i.test(acceso.reason || '')) {
    const general = accesoPracticaGeneral_(dni, email);
    if (general.canAccess) return Object.assign({ universidad: tenant.codigo }, general);
  }
  return acceso;
}

function handleGetBanqueoQuestions_(ctx) {
  enforcePracticeAccess_(ctx, 'banqueo');
  const course = ctx.params.course || '';
  // Solo 10/15/20 son válidos aguas abajo (cualquier otro valor -> 10).
  const count = clampCount_(ctx.params.count, 10, QUESTIONS_MAX_COUNT_);

  if (!ctx.hasUniversidad) {
    return unaGetBanqueoQuestions(course, count);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getBanqueoQuestionsForTenant(tenant, course, count);
}

function handleGetCepreQuestions_(ctx) {
  enforcePracticeAccess_(ctx, 'cepre');
  const course = ctx.params.course || '';
  const area = ctx.params.area || '';
  const semana = ctx.params.semana || '';
  // Sin `count` (modo cuadernillo del frontend) => null: se devuelve el
  // cuadernillo completo EN ORDEN pero con tope QUESTIONS_MAX_COUNT_.
  // Con `count` => se acota a [1, QUESTIONS_MAX_COUNT_].
  const count = ctx.params.count ? clampCount_(ctx.params.count, QUESTIONS_DEFAULT_COUNT_, QUESTIONS_MAX_COUNT_) : null;

  if (!ctx.hasUniversidad) {
    return unaGetCepreQuestions(course, area, semana, count);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getCepreQuestionsForTenant(tenant, course, area, semana, count);
}

function handleGetSemanasV2_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getSemanasForTenant(tenant, ctx.params.curso, ctx.params.division);
}

function handleGetCursosConTemas_(ctx) {
  if (!ctx.hasUniversidad) {
    return unaGetCursosConTemas();
  }
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getCursosConTemasForTenant(tenant);
}

function handleGetTemasPorCurso_(ctx) {
  const curso = ctx.params.curso || '';

  if (!ctx.hasUniversidad) {
    return unaGetTemasPorCurso(curso);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getTemasPorCursoForTenant(tenant, curso);
}

function handleGetSubtemasPorTema_(ctx) {
  const curso = ctx.params.curso || '';
  const tema = ctx.params.tema || '';

  if (!ctx.hasUniversidad) {
    return unaGetSubtemasPorTema(curso, tema);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getSubtemasPorTemaForTenant(tenant, curso, tema);
}

function handleGetBanqueoByTema_(ctx) {
  const curso = ctx.params.curso || '';
  const tema = ctx.params.tema || '';
  const subtema = ctx.params.subtema || '';
  enforcePracticeAccess_(ctx, 'banqueo_tema');
  // El frontend siempre manda 10/15/20; sin count => default 20 (antes: todo el banco).
  const count = clampCount_(ctx.params.count, QUESTIONS_DEFAULT_COUNT_, QUESTIONS_MAX_COUNT_);

  if (!ctx.hasUniversidad) {
    return unaGetBanqueoByTema(curso, tema, subtema, count);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getBanqueoByTemaForTenant(tenant, curso, tema, subtema, count);
}

// ============================================
// HANDLERS - AULA VIRTUAL (v2.1, ver docs/CONTRATO_AULA_V21.md)
// ============================================

function handleGetCiclos_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getCiclosForTenant(tenant, ctx.params.estado);
}

function handleInscribirCiclo_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.body.universidad);
  return inscribirCicloForTenant(tenant, ctx.body.dni, ctx.body.email, ctx.body.cicloId, ctx.body.turno);
}

function handleGetAula_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getAulaForTenant(tenant, ctx.params.dni, ctx.params.email, ctx.params.cicloId);
}

function handleGetMisPagos_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  enforceEmailForReads_(ctx, tenant.codigo);
  return getMisPagosForTenant(tenant, ctx.params.dni, ctx.params.cicloId);
}

// ============================================
// ROUTER DECLARATIVO
// ============================================
//
// Cada entrada: { handler, required: [params obligatorios], method }.
// `method` omitido = 'ANY' (GET o POST). Los parámetros requeridos se
// validan de forma centralizada en handleRequest_ ANTES de invocar el
// handler; si faltan, se responde createErrorResponse(...) con el mismo
// mensaje que usaba la versión legada para esa action (cuando aplica).
const ROUTES = {
  // ---- Núcleo (v2) ----
  getUniversidades: { handler: handleGetUniversidades_, required: [] },
  getConfig: { handler: handleGetConfigV2_, required: [] },
  test: { handler: handleTest_, required: [] },

  // ---- Legadas puras (siempre 'una', ignoran `universidad`) ----
  config: { handler: handleConfigLegacy_, required: [] },
  questions: { handler: handleQuestionsLegacy_, required: ['area'] },
  getCepreSimulacro: { handler: handleGetCepreSimulacroLegacy_, required: ['area'] },
  getCepreCourses: { handler: handleGetCepreCoursesLegacy_, required: [] },
  getCepreSemanas: { handler: handleGetCepreSemanasLegacy_, required: [] },

  // ---- Examen v2 (calificación en servidor) ----
  getExam: { handler: handleGetExam_, required: ['division'], method: 'GET' },
  submitExam: { handler: handleSubmitExam_, required: ['examSessionId', 'dni', 'answers'], method: 'POST' },
  getSemanas: { handler: handleGetSemanasV2_, required: [] },

  // ---- Dual mode: legado byte-idéntico sin `universidad`, v2 con `universidad` ----
  register: { handler: handleRegister_, required: [] },
  saveScore: { handler: handleSaveScore_, required: [] },
  getHistory: { handler: handleGetHistory_, required: ['dni'] },
  checkAccess: { handler: handleCheckAccess_, required: ['dni'] },
  checkBanqueoAccess: { handler: handleCheckBanqueoAccess_, required: ['dni'] },
  getBanqueoQuestions: { handler: handleGetBanqueoQuestions_, required: ['course'] },
  getCepreQuestions: { handler: handleGetCepreQuestions_, required: ['course'] },
  getCursosConTemas: { handler: handleGetCursosConTemas_, required: [] },
  getTemasPorCurso: { handler: handleGetTemasPorCurso_, required: ['curso'] },
  getSubtemasPorTema: { handler: handleGetSubtemasPorTema_, required: ['curso', 'tema'] },
  getBanqueoByTema: { handler: handleGetBanqueoByTema_, required: ['curso'] },

  // ---- Banqueo general: todas las universidades, con filtro (banqueo_general.gs) ----
  getResumenGeneral: { handler: handleGetResumenGeneral_, required: [], method: 'GET' },
  getBanqueoGeneral: { handler: handleGetBanqueoGeneral_, required: ['course'], method: 'GET' },

  // ---- Aula Virtual (v2.1, ver docs/CONTRATO_AULA_V21.md) ----
  getCiclos: { handler: handleGetCiclos_, required: ['universidad'], method: 'GET' },
  getAula: { handler: handleGetAula_, required: ['universidad', 'dni', 'email'], method: 'GET' },
  getMisPagos: { handler: handleGetMisPagos_, required: ['universidad', 'dni', 'cicloId'], method: 'GET' },
  inscribirCiclo: { handler: handleInscribirCiclo_, required: ['universidad', 'dni', 'email', 'cicloId'], method: 'POST' }
};
