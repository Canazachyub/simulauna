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
const SECRET_TOKEN = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || 'CAMBIAR_ESTE_TOKEN_SECRETO';
const ALLOWED_ORIGINS = [
  'https://canazachyub.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173'
];

// ============================================
// ENTRADA HTTP
// ============================================

function doGet(e) {
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

    // ---- VALIDACIÓN DE TOKEN (bypass si sigue en el valor default) ----
    const token = e.parameter.token || '';
    if (SECRET_TOKEN !== 'CAMBIAR_ESTE_TOKEN_SECRETO' && token !== SECRET_TOKEN) {
      return createErrorResponse('Acceso no autorizado. Token inválido o faltante.');
    }

    const action = e.parameter.action;
    if (!action) {
      return createErrorResponse('Parámetro "action" requerido');
    }

    const route = ROUTES[action];
    if (!route) {
      return createErrorResponse('Acción no válida. Use: ' + Object.keys(ROUTES).sort().join(', '));
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
        return createErrorResponse('Body JSON inválido: ' + parseErr);
      }
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

    const data = route.handler(ctx);
    return createSuccessResponse(data);

  } catch (error) {
    return createErrorResponse(error.toString());
  }
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

function handleQuestionsLegacy_(ctx) {
  return unaGetQuestions(ctx.params.area);
}

function handleGetCepreSimulacroLegacy_(ctx) {
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

function handleGetExam_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getExamForTenant(tenant, ctx.params.division, ctx.params.proceso, ctx.params.semana);
}

function handleSubmitExam_(ctx) {
  const tenant = resolveTenantOrThrow_(ctx.body.universidad);
  const answers = Array.isArray(ctx.body.answers) ? ctx.body.answers : [];
  return submitExamForTenant(tenant, ctx.body.examSessionId, ctx.body.dni, answers);
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

function handleSaveScore_(ctx) {
  const dni = ctx.params.dni || '';
  const score = parseFloat(ctx.params.score) || 0;
  const maxScore = parseFloat(ctx.params.maxScore) || 0;
  const area = ctx.params.area || '';
  const correct = parseInt(ctx.params.correct, 10) || 0;
  const total = parseInt(ctx.params.total, 10) || 0;

  if (!ctx.hasUniversidad) {
    return unaSaveUserScore(dni, score, maxScore, area, correct, total);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return saveScoreForTenant(tenant, dni, score, maxScore, area, correct, total);
}

function handleGetHistory_(ctx) {
  const dni = ctx.params.dni || '';

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
  return checkBanqueoAccessV2(tenant, dni, email, ctx.params.modalidad);
}

function handleGetBanqueoQuestions_(ctx) {
  const course = ctx.params.course || '';
  const count = parseInt(ctx.params.count, 10) || 10;

  if (!ctx.hasUniversidad) {
    return unaGetBanqueoQuestions(course, count);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getBanqueoQuestionsForTenant(tenant, course, count);
}

function handleGetCepreQuestions_(ctx) {
  const course = ctx.params.course || '';
  const area = ctx.params.area || '';
  const semana = ctx.params.semana || '';
  const count = ctx.params.count ? parseInt(ctx.params.count, 10) : null;

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
  const count = ctx.params.count ? parseInt(ctx.params.count, 10) : null;

  if (!ctx.hasUniversidad) {
    return unaGetBanqueoByTema(curso, tema, subtema, count);
  }

  const tenant = resolveTenantOrThrow_(ctx.params.universidad);
  return getBanqueoByTemaForTenant(tenant, curso, tema, subtema, count);
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
  getBanqueoByTema: { handler: handleGetBanqueoByTema_, required: ['curso'] }
};
